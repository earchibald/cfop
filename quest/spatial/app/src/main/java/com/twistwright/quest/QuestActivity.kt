package com.twistwright.quest

import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.LinearLayout
import com.meta.spatial.core.Color4
import com.meta.spatial.core.Entity
import com.meta.spatial.core.Pose
import com.meta.spatial.core.Quaternion
import com.meta.spatial.core.SpatialFeature
import com.meta.spatial.core.SystemBase
import com.meta.spatial.core.Vector3
import com.meta.spatial.isdk.IsdkFeature
import com.meta.spatial.runtime.ReferenceSpace
import com.meta.spatial.toolkit.AppSystemActivity
import com.meta.spatial.toolkit.Box
import com.meta.spatial.toolkit.DpDisplayOptions
import com.meta.spatial.toolkit.Grabbable
import com.meta.spatial.toolkit.GrabbableType
import com.meta.spatial.toolkit.LayoutXMLPanelRegistration
import com.meta.spatial.toolkit.Material
import com.meta.spatial.toolkit.Mesh
import com.meta.spatial.toolkit.MeshCollision
import com.meta.spatial.toolkit.Panel
import com.meta.spatial.toolkit.PanelRegistration
import com.meta.spatial.toolkit.PanelRenderMode
import com.meta.spatial.toolkit.QuadShapeOptions
import com.meta.spatial.toolkit.Transform
import com.meta.spatial.toolkit.TransformParent
import com.meta.spatial.toolkit.UIPanelRenderOptions
import com.meta.spatial.toolkit.UIPanelSettings
import com.meta.spatial.toolkit.Visible
import com.meta.spatial.vr.LocomotionSystem
import com.meta.spatial.vr.VRFeature
import org.json.JSONArray
import org.json.JSONObject

// Twistwright for Meta Quest: the Quest cube lab as a Horizon OS app (Meta Spatial SDK). In a dark
// room (no passthrough: the real cube in the hands stays out of sight), the Quest page
// (quest/index.html, built in: Pages.java) is a panel, and the cube the app draws (CubeView) floats
// by itself, with the session's rows of buttons under it (CubeBar). The page keeps all the logic, as
// in the browser: the cube's link (js/bridge.js over BleBridge.java, the headset's own Bluetooth), the
// moves, Drill mode, the stage, what each button does. The app adds what the Quest Browser does not
// have: the headset's speech service for the voice (QuestSpeech), and the cube in the room with no
// WebXR. Hands first (the Interaction SDK): a pinch carries the cube, the bar under the panel carries
// the panel, a fingertip pokes a button. Bring here puts both in front of the user again; the app
// does that once at the start.
class QuestActivity : AppSystemActivity() {
  private var web: WebView? = null
  private var bridge: BleBridge? = null
  private var speech: QuestSpeech? = null
  private lateinit var pages: Pages
  private val cube = CubeView { scene.getViewerPose() }
  private var panel: Entity? = null
  private var bar: CubeBar? = null
  private var barWait: JSONArray? = null
  private var placed = 0 // frames waited for the head before the first Bring here

  override fun registerFeatures(): List<SpatialFeature> = listOf(VRFeature(this), IsdkFeature(this, spatial, systemManager))

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    WebView.setWebContentsDebuggingEnabled(true) // chrome://inspect on the Mac, over adb
    pages = Pages(this)
    cube.onPanel = { on -> panel?.setComponent(Visible(on)) }
    cube.onBar = { b -> runOnUiThread { bar?.show(b) ?: run { barWait = b } } }
    cube.barHeight = BAR_H
    systemManager.registerSystem(cube.system)
    systemManager.registerSystem(firstPlace)
    systemManager.findSystem<LocomotionSystem>().enableLocomotion(false)
    // No passthrough: a dark room with a floor, so the cube in the hands is not seen beside the one
    // drawn.
    scene.enablePassthrough(false)
    scene.setBackfillColor(Color4(0.035f, 0.04f, 0.05f, 1f))
  }

  override fun onSceneReady() {
    super.onSceneReady()
    scene.setReferenceSpace(ReferenceSpace.LOCAL_FLOOR)
    scene.setLightingEnvironment(Vector3(1.2f), Vector3(2f), -Vector3(1f, 3f, -2f), 0.3f)
    Entity.create(listOf(
      Box(Vector3(-4f, -0.02f, -4f), Vector3(4f, 0f, 4f)), Mesh(Uri.parse("mesh://box"), MeshCollision.NoCollision),
      Material().apply { baseColor = Color4(0.11f, 0.12f, 0.14f, 1f) }, Transform(Pose())))
    // Where they start before the head is known, for a user at the origin: the cube in front, the
    // panel to its left. Bring here puts them by the head once it is.
    panel = Entity.create(listOf(
      Panel(R.id.page_panel),
      Transform(Pose(Vector3(-0.42f, 1.15f, 0.8f), Quaternion(1f, 0f, 0f, 0f))),
      Grabbable(true, GrabbableType.FACE),
      Visible(true)))
    cube.place(Pose(Vector3(0.08f, 0.95f, 0.45f), Quaternion(1f, 0f, 0f, 0f)))
    cube.bar = Entity.create(listOf(
      Panel(R.id.bar_panel), TransformParent(cube.root!!),
      Transform(Pose(Vector3(0f, -0.2f, 0f), Quaternion(1f, 0f, 0f, 0f))), Visible(true)))
  }

  // Bring here: the cube 42 cm in front of the head and a little low, square to the user, and the
  // panel further out to its left.
  private fun bringHere() {
    val head = scene.getViewerPose()
    val yaw = head.removePitchAndRoll()
    val f = yaw.forward(); val r = yaw.right()
    cube.place(Pose(head.t + f * 0.42f + r * 0.06f + Vector3(0f, -0.2f, 0f), yaw.q))
    panel?.setComponent(Transform(Pose(head.t + f * 0.72f - r * 0.4f + Vector3(0f, -0.08f, 0f), yaw.q)))
  }
  // The first Bring here, when the head is tracked (a head at the floor is not yet).
  private val firstPlace = object : SystemBase() {
    override fun execute() {
      if (placed < 0 || cube.root == null) return
      if (scene.getViewerPose().t.y > 0.4f || ++placed > 600) { placed = -1; bringHere() }
    }
  }

  // A press on the rows under the cube: Bring here is the app's; the rest are the page's.
  private fun press(id: String) {
    if (id == "here") { bringHere(); return }
    web?.evaluateJavascript("window.questNativeDo&&questNativeDo(" + JSONObject.quote(id) + ")", null)
  }

  override fun registerPanels(): List<PanelRegistration> = listOf(
    LayoutXMLPanelRegistration(
      R.id.page_panel,
      layoutIdCreator = { R.layout.page_panel },
      settingsCreator = {
        UIPanelSettings(
          shape = QuadShapeOptions(width = 0.84f, height = 0.63f),
          display = DpDisplayOptions(width = 960f, height = 720f), rendering = MESH)
      },
      panelSetupWithRootView = { root, _, _ -> pageInto(root) }),
    LayoutXMLPanelRegistration(
      R.id.bar_panel,
      layoutIdCreator = { R.layout.bar_panel },
      settingsCreator = {
        UIPanelSettings(
          shape = QuadShapeOptions(width = BAR_W, height = BAR_H),
          display = DpDisplayOptions(width = 960f, height = 960f * BAR_H / BAR_W), rendering = MESH)
      },
      panelSetupWithRootView = { root, _, _ ->
        val rows = root.findViewById<LinearLayout>(R.id.bar_rows) ?: (root as LinearLayout)
        bar = CubeBar(rows) { id -> press(id) }.also { b -> barWait?.let { b.show(it); barWait = null } }
      }))

  // The WebView goes in the panel's frame, made with the panel's own context the first time.
  private fun pageInto(root: View) {
    val frame = root.findViewById<FrameLayout>(R.id.page_frame) ?: (root as FrameLayout)
    val w = web ?: makePage(frame.context as? android.content.Context ?: this)
    (w.parent as? ViewGroup)?.removeView(w)
    frame.addView(w, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
  }

  private fun makePage(ctx: android.content.Context): WebView {
    val w = WebView(ctx)
    web = w
    w.settings.apply {
      javaScriptEnabled = true
      domStorageEnabled = true
      mediaPlaybackRequiresUserGesture = false
      allowFileAccess = false
      allowContentAccess = false
    }
    val version = try { packageManager.getPackageInfo(packageName, 0).versionName ?: "0" } catch (e: Exception) { "0" }
    val b = BleBridge(this, w, version); bridge = b
    val s = QuestSpeech(this, w); speech = s
    w.addJavascriptInterface(b, "TwistwrightAndroid")
    w.addJavascriptInterface(s, "TwistwrightSpeech")
    w.addJavascriptInterface(cube.Page { runOnUiThread { bringHere() } }, "TwistwrightQuest")
    w.webViewClient = object : WebViewClient() {
      override fun shouldInterceptRequest(v: WebView, r: WebResourceRequest): WebResourceResponse? = pages.serve(r.url)
      // Links away from the app's pages open in the Quest Browser.
      override fun shouldOverrideUrlLoading(v: WebView, r: WebResourceRequest): Boolean {
        if (Pages.HOST == r.url.host) return false
        try { startActivity(Intent(Intent.ACTION_VIEW, r.url)) } catch (e: ActivityNotFoundException) { /* no browser */ }
        return true
      }
      // A new page: the cubes and the scan of the page before are let go.
      override fun onPageStarted(v: WebView, url: String?, icon: Bitmap?) { b.release(); s.destroy() }
    }
    w.webChromeClient = object : WebChromeClient() {
      override fun onConsoleMessage(m: ConsoleMessage): Boolean {
        Log.i(BleBridge.TAG, "${m.message()} (${m.sourceId()}:${m.lineNumber()})")
        return true
      }
    }
    w.loadUrl(Pages.ORIGIN + "quest/")
    return w
  }

  @Deprecated("Activity API")
  override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults)
    when (requestCode) {
      BleBridge.ASK -> bridge?.permissionsAnswered()
      QuestSpeech.ASK -> speech?.permissionsAnswered()
    }
  }

  override fun onDestroy() {
    speech?.destroy()
    bridge?.destroy()
    web?.destroy()
    super.onDestroy()
  }

  companion object {
    // The rows of buttons under the cube, in meters.
    const val BAR_W = 0.40f
    const val BAR_H = 0.135f
    // Both panels are drawn in the scene, not as layers of their own: in front of or behind the
    // cube and the hands as they are, and in the headset's screenshots and casting.
    val MESH = UIPanelRenderOptions(PanelRenderMode.Mesh())
  }
}
