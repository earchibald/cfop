package com.twistwright.quest

import android.net.Uri
import android.util.Log
import android.webkit.JavascriptInterface
import com.meta.spatial.core.Color4
import com.meta.spatial.core.Entity
import com.meta.spatial.core.Pose
import com.meta.spatial.core.Quaternion
import com.meta.spatial.core.SystemBase
import com.meta.spatial.core.Vector3
import com.meta.spatial.runtime.AlphaMode
import com.meta.spatial.toolkit.Box
import com.meta.spatial.toolkit.Grabbable
import com.meta.spatial.toolkit.GrabbableType
import com.meta.spatial.toolkit.Material
import com.meta.spatial.toolkit.Mesh
import com.meta.spatial.toolkit.MeshCollision
import com.meta.spatial.toolkit.Transform
import com.meta.spatial.toolkit.TransformParent
import com.meta.spatial.toolkit.Visible
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.atomic.AtomicReference
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.sqrt

// The cube the app draws, as quest/render.js draws it on the page: 26 dark cubies and 54 stickers, the
// layer of a move part way through its turn, and with Hidden faces the faces turned away from the
// head on mirrors out past them (questMirror in quest/core.js). The page sends what to draw
// (quest/native.js) through window.TwistwrightQuest: geometry(json) once, frame(json) at each change.
// Each arrives on the WebView's thread and waits here; the system puts it on the entities on the
// next frame of the scene.
//
// The cube is its own thing in the room: root, a box the size of the cube that a pinch or a grip
// carries (Grabbable; the Interaction SDK makes it a hand grab), turned to face the user as it is
// carried. The rows of buttons (CubeBar) sit under it and go with it; the page panel is carried by
// itself. With In my hands (the frame's follow) and a cube live, the cube rides between the two
// hands while they hold the real one (both tracked, close together), square to the user, so the
// tilt turns it there: a look around it is a turn of the real cube. A hand that leaves (to poke a
// button) leaves the cube where it is; no pinch carries it then (the fingers of a hand that holds a
// cube read as a pinch), and the rows stay in the room where they were, so a poke finds them.
//
// The page's frame is right-handed: x right, y up, z toward you. The scene's is x right, y up, z away
// from you. All the math here is in the page's frame; scene() turns each final pose over z.
class CubeView(private val viewer: () -> Pose?, private val hands: () -> List<Pose>) {
  // The scene's side, for QuestActivity: the frame's panel, bar and voice line, as they change.
  var onPanel: (Boolean) -> Unit = {}
  var onBar: (JSONArray) -> Unit = {}
  var onVoice: (String) -> Unit = {}
  // The rows of buttons under the cube: an entity the app made, and its height in meters.
  var bar: Entity? = null
  var barHeight = 0.15f

  private class Geo(o: JSONObject) {
    val cubies: List<FloatArray> = o.getJSONArray("cubies").let { a -> (0 until a.length()).map { v(a.getJSONArray(it)) } }
    val stickers: List<Array<FloatArray>> = o.getJSONArray("stickers").let { a -> (0 until a.length()).map { i ->
      val s = a.getJSONObject(i); arrayOf(v(s.getJSONArray("cubie")), v(s.getJSONArray("n")), v(s.getJSONArray("r")), v(s.getJSONArray("up"))) } }
    val moves: Map<String, Pair<FloatArray, Pair<Float, IntArray>>> = o.getJSONObject("moves").let { m ->
      m.keys().asSequence().associateWith { k -> val g = m.getJSONObject(k); val l = g.getJSONArray("layers")
        Pair(v(g.getJSONArray("n")), Pair(g.getDouble("deg").toFloat(), IntArray(l.length()) { l.getInt(it) })) } }
    val gap = o.getDouble("gap").toFloat()
    val sticker = o.getDouble("sticker").toFloat()
    val lift = o.getDouble("lift").toFloat()
    val body = color(o.getJSONArray("body"))
    val colors: List<Color4> = o.getJSONArray("colors").let { a -> (0 until a.length()).map { color(a.getJSONArray(it)) } }
    val gray = color(o.getJSONArray("gray"))
    private val mirror = o.optJSONObject("mirror") ?: JSONObject()
    val dist = mirror.optDouble("dist", 2.4).toFloat()
    val flat = mirror.optDouble("flat", 0.35).toFloat()
    val alpha = mirror.optDouble("alpha", 0.6).toFloat()
    val reach = mirror.optDouble("reach", 4.18).toFloat()
    companion object {
      fun v(a: JSONArray) = FloatArray(a.length()) { a.getDouble(it).toFloat() }
      fun color(a: JSONArray) = Color4(a.getDouble(0).toFloat(), a.getDouble(1).toFloat(), a.getDouble(2).toFloat(), 1f)
    }
  }
  private class Frame(o: JSONObject) {
    val f: String = o.optString("f", "")
    val m: String = o.optString("m", "")
    val t: Float = o.optDouble("t", 0.0).toFloat()
    val q: FloatArray = o.optJSONArray("q")?.let { a -> FloatArray(4) { a.getDouble(it).toFloat() } } ?: floatArrayOf(0f, 0f, 0f, 1f)
    val hidden: Boolean = o.optBoolean("hidden", false)
    val edge: Float = min(0.6f, max(0.05f, o.optDouble("edge", 0.12).toFloat()))
    val panel: Boolean = o.optBoolean("panel", true)
    val follow: Boolean = o.optBoolean("follow", false)
    val live: Boolean = o.optBoolean("live", false)
    val voice: String = o.optString("voice", "")
    val bar: JSONArray? = o.optJSONArray("bar")
  }

  private val geoIn = AtomicReference<Geo?>(null)
  private val frameIn = AtomicReference<Frame?>(null)
  private var geo: Geo? = null
  private var frame: Frame? = null
  var root: Entity? = null
    private set
  private val cubies = ArrayList<Entity>()
  private val stickers = ArrayList<Entity>()
  // The stickers on the mirrors: a pool, each shown or not, its color and alpha as last set.
  private val seen = ArrayList<Entity>()
  private val seenLook = ArrayList<Long>()
  private val seenOn = ArrayList<Boolean>()
  private var facelets: String? = null
  private var built = 0f // the edge the boxes are built for
  private var faces = -1 // the hidden faces drawn, a bit each (-1: none drawn yet)
  private var panelShown: Boolean? = null
  private var barKey = ""
  private var voiceShown: String? = null
  private var barAt: Pose? = null // the rows' place in the room
  private var following = false
  private var held = false // the hands hold the cube now

  // The page's side: window.TwistwrightQuest.
  inner class Page(private val here: () -> Unit, private val quit: () -> Unit) {
    @JavascriptInterface fun geometry(json: String) {
      try { geoIn.set(Geo(JSONObject(json))) } catch (e: Exception) { Log.e(BleBridge.TAG, "The page's geometry did not read: $e") }
    }
    @JavascriptInterface fun frame(json: String) {
      try { frameIn.set(Frame(JSONObject(json))) } catch (e: Exception) { Log.e(BleBridge.TAG, "A frame did not read: $e") }
    }
    @JavascriptInterface fun here() = here.invoke()
    @JavascriptInterface fun quit() = quit.invoke()
  }

  // The cube's place in the room, where it starts; the rows go under it.
  fun place(at: Pose) {
    val r = root ?: Entity.create(listOf(
      Transform(at), Grabbable(true, GrabbableType.FACE),
      Box(Vector3(-0.07f), Vector3(0.07f)), Mesh(Uri.parse("mesh://box"), MeshCollision.LineTest),
      // the box is only there to be pinched: nothing of it shows
      Material().apply { baseColor = Color4(0f, 0f, 0f, 0f); alphaMode = AlphaMode.TRANSLUCENT.mode; unlit = true })).also { root = it }
    r.setComponent(Transform(at))
    barAt = null
  }

  val system = object : SystemBase() {
    override fun execute() {
      val r = root ?: return
      geoIn.getAndSet(null)?.let { g -> geo = g; built = 0f }
      val g = geo ?: return
      frameIn.getAndSet(null)?.let { frame = it; dirty = true }
      val fr = frame ?: return
      if (fr.edge != built) { build(r, g, fr.edge); dirty = true }
      val hf = if (fr.hidden) hiddenFaces(r, fr.q) else 0
      if (hf != faces) dirty = true
      if (dirty) { dirty = false; faces = hf; draw(g, fr, hf) }
      if (fr.panel != panelShown) { panelShown = fr.panel; onPanel(fr.panel) }
      fr.bar?.let { b -> val k = b.toString(); if (k != barKey) { barKey = k; onBar(b) } }
      if (fr.voice != voiceShown) { voiceShown = fr.voice; onVoice(fr.voice) }
      follow(r, fr)
      placeBar(r, g, fr)
    }
  }

  // In my hands: the cube between the two hands while they are close together (they hold the real
  // cube), eased so the tracking's jitter does not shake it.
  private fun follow(r: Entity, fr: Frame) {
    val on = fr.follow && fr.live
    if (on != following) {
      following = on; held = false
      r.setComponent(Grabbable(!on, GrabbableType.FACE))
      Log.i(BleBridge.TAG, "In my hands: " + if (on) "on" else "off")
    }
    if (!on) return
    val hs = hands()
    val head = viewer()
    val holds = hs.size == 2 && head != null && hs[0].t.distanceTo(hs[1].t) < HOLD_APART
    if (holds != held) { held = holds; Log.i(BleBridge.TAG, "In my hands: " + if (holds) "held" else "let go, ${hs.size} hands") }
    if (!holds) return
    val mid = (hs[0].t + hs[1].t) * 0.5f
    val want = Pose(mid, head!!.removePitchAndRoll().q)
    val now = r.getComponent<Transform>().transform
    r.setComponent(Transform(if (now.t.distanceTo(mid) > 0.6f) want else now.lerp(want, 0.35f)))
  }
  private var dirty = false

  private fun build(r: Entity, g: Geo, edge: Float) {
    for (e in cubies + stickers + seen) e.destroy()
    cubies.clear(); stickers.clear(); seen.clear(); seenLook.clear(); seenOn.clear()
    built = edge; facelets = null; faces = -1
    val u = edge / 3f
    val c = edge * 0.55f
    r.setComponent(Box(Vector3(-c), Vector3(c)))
    val box = Uri.parse("mesh://box")
    val h = g.gap * u / 2f
    for (p in g.cubies) cubies.add(Entity.create(listOf(
      TransformParent(r), Box(Vector3(-h), Vector3(h)), Mesh(box, MeshCollision.NoCollision),
      Material().apply { baseColor = g.body; unlit = true }, Transform(Pose()))))
    val s = g.sticker * u / 2f
    val thin = 0.012f * u
    for (st in g.stickers) stickers.add(Entity.create(listOf(
      TransformParent(r), Box(Vector3(-s, -s, -thin), Vector3(s, s, thin)), Mesh(box, MeshCollision.NoCollision),
      Material().apply { baseColor = g.gray; unlit = true }, Transform(Pose()))))
    // Three faces at rest show 27 stickers; a layer part way through puts some on two mirrors.
    repeat(60) {
      seen.add(Entity.create(listOf(
        TransformParent(r), Box(Vector3(-s, -s, -thin), Vector3(s, s, thin)), Mesh(box, MeshCollision.NoCollision),
        Material().apply { baseColor = g.gray; unlit = true }, Transform(Pose()), Visible(false))))
      seenLook.add(-1L); seenOn.add(false)
    }
    Log.i(BleBridge.TAG, "The cube: ${cubies.size} cubies, ${stickers.size} stickers, edge ${edge}")
  }

  // The faces turned away from the head, as questHiddenFaces finds them: a bit per face, U R F D L B.
  private fun hiddenFaces(r: Entity, q: FloatArray): Int {
    val head = viewer() ?: return faces.coerceAtLeast(0)
    val local = r.getComponent<Transform>().transform.inverse().times(head.t)
    val eye = floatArrayOf(local.x, local.y, -local.z)
    val le = sqrt(eye[0] * eye[0] + eye[1] * eye[1] + eye[2] * eye[2]).takeIf { it > 1e-4f } ?: return 0
    var out = 0
    for (f in 0 until 6) {
      val w = rot(q, FACE_N[f])
      if ((w[0] * eye[0] + w[1] * eye[1] + w[2] * eye[2]) / le <= -0.02f) out = out or (1 shl f)
    }
    return out
  }

  private fun draw(g: Geo, fr: Frame, hf: Int) {
    if (fr.f != facelets) {
      facelets = fr.f
      for (i in stickers.indices) stickers[i].setComponent(material(g, colorOf(fr.f, i), 1f))
    }
    val u = built / 3f
    val cube = fr.q
    val mv = g.moves[fr.m]
    val turn = if (mv != null && fr.t > 0f && fr.t < 1f) axis(mv.first, mv.second.first * fr.t) else null
    fun moves(p: FloatArray) = mv != null && turn != null && mv.second.second.contains(Math.round(mv.first[0] * p[0] + mv.first[1] * p[1] + mv.first[2] * p[2]))
    for (i in cubies.indices) {
      val p = g.cubies[i]
      val q = if (moves(p)) mul(cube, turn!!) else cube
      cubies[i].setComponent(Transform(scene(rot(q, p), q, u)))
    }
    val mirrors = (0 until 6).filter { hf and (1 shl it) != 0 }.map { FACE_N[it] }
    val D = 1.5f + g.dist
    var k = 0
    for (i in stickers.indices) {
      val (c, n, r, up) = g.stickers[i]
      val local = basis(r, up, n)
      val at = floatArrayOf(c[0] + n[0] * g.lift, c[1] + n[1] * g.lift, c[2] + n[2] * g.lift)
      val moved = moves(c)
      val q0 = if (moved) mul(cube, turn!!) else cube
      stickers[i].setComponent(Transform(scene(rot(q0, at), mul(q0, local), u)))
      if (mirrors.isEmpty()) continue
      // on a mirror while it looks out of that face, fading as it tips away (as render.js does)
      val p = if (moved) rot(turn!!, at) else at
      val nn = if (moved) rot(turn!!, n) else n
      val ql = if (moved) mul(turn!!, local) else local
      for (m in mirrors) {
        val d = nn[0] * m[0] + nn[1] * m[1] + nn[2] * m[2]
        if (d < 0.02f || k >= seen.size) continue
        val w = p[0] * m[0] + p[1] * m[1] + p[2] * m[2]
        val o = D - w + g.flat * (w - 1.5f)
        val pm = floatArrayOf(p[0] + m[0] * o, p[1] + m[1] * o, p[2] + m[2] * o)
        val a = g.alpha * (if (d >= 0.999f) 1f else 0.35f + 0.65f * min(1f, d))
        val ci = colorOf(fr.f, i)
        val look = (ci + 1L) * 1000L + Math.round(a * 20f)
        if (seenLook[k] != look) { seenLook[k] = look; seen[k].setComponent(material(g, ci, Math.round(a * 20f) / 20f)) }
        seen[k].setComponent(Transform(scene(rot(cube, pm), mul(cube, ql), u)))
        if (!seenOn[k]) { seenOn[k] = true; seen[k].setComponent(Visible(true)) }
        k++
      }
    }
    for (j in k until seen.size) if (seenOn[j]) { seenOn[j] = false; seen[j].setComponent(Visible(false)) }
  }

  // The rows sit under the cube, clear of it as it tilts, and clear of the mirrors when they show
  // (questBarCenter in quest/core.js), square to the user as the cube is. With In my hands they stay
  // where they were.
  private fun placeBar(r: Entity, g: Geo, fr: Frame) {
    val b = bar ?: return
    if (following && barAt != null) return
    val clear = max(fr.edge * 0.8f, if (fr.hidden) fr.edge / 3f * g.reach else 0f)
    val y = -(clear + barHeight / 2f + 0.02f)
    val c = r.getComponent<Transform>().transform
    val at = Pose(c.t + c.q.removePitchAndRoll() * Vector3(0f, y, 0f), c.q.removePitchAndRoll())
    val was = barAt
    if (was != null && was.isApproximatelyEqual(at, 1e-4f, 1e-4f)) return
    barAt = at
    b.setComponent(Transform(at))
  }

  private fun colorOf(f: String, i: Int) = if (f.length == 54) f[i] - '0' else if (i % 9 == 4) (i - 4) / 9 else -1
  private fun material(g: Geo, ci: Int, alpha: Float) = Material().apply {
    val c = if (ci in 0..5) g.colors[ci] else g.gray
    unlit = true
    if (alpha < 1f) { baseColor = Color4(c.red, c.green, c.blue, alpha); alphaMode = AlphaMode.TRANSLUCENT.mode } else baseColor = c
  }

  companion object {
    // Two hands closer than this (meters) hold the cube between them.
    const val HOLD_APART = 0.32f
    // The faces' normals in the page's frame, U R F D L B (FACE_GEOM in js/draw.js).
    val FACE_N = arrayOf(floatArrayOf(0f, 1f, 0f), floatArrayOf(1f, 0f, 0f), floatArrayOf(0f, 0f, 1f),
      floatArrayOf(0f, -1f, 0f), floatArrayOf(-1f, 0f, 0f), floatArrayOf(0f, 0f, -1f))
  }

  // ----- quaternions as [x, y, z, w], as quest/core.js has them -----
  private fun axis(n: FloatArray, deg: Float): FloatArray {
    val h = deg * Math.PI.toFloat() / 360f; val s = sin(h)
    return floatArrayOf(n[0] * s, n[1] * s, n[2] * s, cos(h))
  }
  private fun mul(a: FloatArray, b: FloatArray) = floatArrayOf(
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2])
  private fun rot(q: FloatArray, v: FloatArray): FloatArray {
    val (x, y, z, w) = q
    val ix = w * v[0] + y * v[2] - z * v[1]; val iy = w * v[1] + z * v[0] - x * v[2]
    val iz = w * v[2] + x * v[1] - y * v[0]; val iw = -x * v[0] - y * v[1] - z * v[2]
    return floatArrayOf(ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x)
  }
  // The turn whose x, y and z axes are a, b and c (each a unit vector, a right-handed set).
  private fun basis(a: FloatArray, b: FloatArray, c: FloatArray): FloatArray {
    val m00 = a[0]; val m10 = a[1]; val m20 = a[2]; val m01 = b[0]; val m11 = b[1]; val m21 = b[2]; val m02 = c[0]; val m12 = c[1]; val m22 = c[2]
    val tr = m00 + m11 + m22
    return if (tr > 0) { val s = sqrt(tr + 1f) * 2f; floatArrayOf((m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, 0.25f * s) }
    else if (m00 > m11 && m00 > m22) { val s = sqrt(1f + m00 - m11 - m22) * 2f; floatArrayOf(0.25f * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s) }
    else if (m11 > m22) { val s = sqrt(1f + m11 - m00 - m22) * 2f; floatArrayOf((m01 + m10) / s, 0.25f * s, (m12 + m21) / s, (m02 - m20) / s) }
    else { val s = sqrt(1f + m22 - m00 - m11) * 2f; floatArrayOf((m02 + m20) / s, (m12 + m21) / s, 0.25f * s, (m10 - m01) / s) }
  }
  // A pose in the page's frame, in cubie units, as the scene's pose in meters: turned over z.
  private fun scene(p: FloatArray, q: FloatArray, u: Float) =
    Pose(Vector3(p[0] * u, p[1] * u, -p[2] * u), Quaternion(q[3], -q[0], -q[1], q[2]))
}
