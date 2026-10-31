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
import com.meta.spatial.toolkit.Box
import com.meta.spatial.toolkit.Material
import com.meta.spatial.toolkit.Mesh
import com.meta.spatial.toolkit.MeshCollision
import com.meta.spatial.toolkit.Transform
import com.meta.spatial.toolkit.TransformParent
import org.json.JSONObject
import java.util.concurrent.atomic.AtomicReference
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

// The cube the app draws beside the page panel, as quest/render.js draws it on the page: 26 dark
// cubies and 54 stickers, the layer of a move part way through its turn. The page sends what to
// draw (quest/native.js) through window.TwistwrightQuest: geometry(json) once, frame(json) at each
// change. Each arrives on the WebView's thread and waits here; the system puts it on the entities
// on the next frame of the scene.
//
// The page's frame is right-handed: x right, y up, z toward you. The scene's is x right, y up, z away
// from you. All the math here is in the page's frame; scene() turns each final pose over z.
class CubeView {
  // The cube's edge in meters, and where it sits from the panel's center (the scene's frame).
  var edge = 0.12f
  var offset = Vector3(0.66f, -0.1f, -0.12f)

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
    companion object {
      fun v(a: org.json.JSONArray) = FloatArray(a.length()) { a.getDouble(it).toFloat() }
      fun color(a: org.json.JSONArray) = Color4(a.getDouble(0).toFloat(), a.getDouble(1).toFloat(), a.getDouble(2).toFloat(), 1f)
    }
  }
  private class Frame(o: JSONObject) {
    val f: String = o.optString("f", "")
    val m: String = o.optString("m", "")
    val t: Float = o.optDouble("t", 0.0).toFloat()
    val q: FloatArray = o.optJSONArray("q")?.let { a -> FloatArray(4) { a.getDouble(it).toFloat() } } ?: floatArrayOf(0f, 0f, 0f, 1f)
  }

  private val geoIn = AtomicReference<Geo?>(null)
  private val frameIn = AtomicReference<Frame?>(null)
  private var geo: Geo? = null
  private var anchor: Entity? = null
  private var parent: Entity? = null
  private val cubies = ArrayList<Entity>()
  private val stickers = ArrayList<Entity>()
  private var facelets: String? = null

  // The page's side: window.TwistwrightQuest.
  inner class Page {
    @JavascriptInterface fun geometry(json: String) {
      try { geoIn.set(Geo(JSONObject(json))) } catch (e: Exception) { Log.e(BleBridge.TAG, "The page's geometry did not read: $e") }
    }
    @JavascriptInterface fun frame(json: String) {
      try { frameIn.set(Frame(JSONObject(json))) } catch (e: Exception) { Log.e(BleBridge.TAG, "A frame did not read: $e") }
    }
  }

  // The cube sits by the panel and moves with it.
  fun attach(panel: Entity) { parent = panel }

  val system = object : SystemBase() {
    override fun execute() {
      val p = parent ?: return
      geoIn.getAndSet(null)?.let { g -> geo = g; build(p, g); facelets = null }
      val g = geo ?: return
      frameIn.getAndSet(null)?.let { draw(g, it) }
    }
  }

  private fun build(panel: Entity, g: Geo) {
    for (e in cubies + stickers) e.destroy()
    cubies.clear(); stickers.clear()
    val a = anchor ?: Entity.create(listOf(TransformParent(panel), Transform(Pose(offset, Quaternion(1f, 0f, 0f, 0f))))).also { anchor = it }
    val u = edge / 3f
    val box = Uri.parse("mesh://box")
    val h = g.gap * u / 2f
    for (p in g.cubies) cubies.add(Entity.create(listOf(
      TransformParent(a), Box(Vector3(-h, -h, -h), Vector3(h, h, h)), Mesh(box, MeshCollision.NoCollision),
      Material().apply { baseColor = g.body; unlit = true }, Transform(Pose()))))
    val s = g.sticker * u / 2f
    val thin = 0.012f * u
    for (st in g.stickers) stickers.add(Entity.create(listOf(
      TransformParent(a), Box(Vector3(-s, -s, -thin), Vector3(s, s, thin)), Mesh(box, MeshCollision.NoCollision),
      Material().apply { baseColor = g.gray; unlit = true }, Transform(Pose()))))
    Log.i(BleBridge.TAG, "The cube: ${cubies.size} cubies, ${stickers.size} stickers")
  }

  private fun draw(g: Geo, fr: Frame) {
    if (fr.f != facelets) {
      facelets = fr.f
      for (i in stickers.indices) {
        val ci = if (fr.f.length == 54) fr.f[i] - '0' else if (i % 9 == 4) (i - 4) / 9 else -1
        stickers[i].setComponent(Material().apply { baseColor = if (ci in 0..5) g.colors[ci] else g.gray; unlit = true })
      }
    }
    val u = edge / 3f
    val cube = fr.q
    val mv = g.moves[fr.m]
    val turn = if (mv != null && fr.t > 0f && fr.t < 1f) axis(mv.first, mv.second.first * fr.t) else null
    fun moves(p: FloatArray) = mv != null && turn != null && mv.second.second.contains(Math.round(mv.first[0] * p[0] + mv.first[1] * p[1] + mv.first[2] * p[2]))
    for (i in cubies.indices) {
      val p = g.cubies[i]
      val q = if (moves(p)) mul(cube, turn!!) else cube
      cubies[i].setComponent(Transform(scene(rot(q, p), q, u)))
    }
    for (i in stickers.indices) {
      val (c, n, r, up) = g.stickers[i]
      val local = basis(r, up, n)
      val at = floatArrayOf(c[0] + n[0] * g.lift, c[1] + n[1] * g.lift, c[2] + n[2] * g.lift)
      val q0 = if (moves(c)) mul(cube, turn!!) else cube
      stickers[i].setComponent(Transform(scene(rot(q0, at), mul(q0, local), u)))
    }
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
