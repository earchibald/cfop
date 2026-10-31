package com.twistwright.quest

import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Bitmap
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
import com.meta.spatial.core.Entity
import com.meta.spatial.core.Pose
import com.meta.spatial.core.Quaternion
import com.meta.spatial.core.SpatialFeature
import com.meta.spatial.core.Vector3
import com.meta.spatial.runtime.ReferenceSpace
import com.meta.spatial.toolkit.AppSystemActivity
import com.meta.spatial.toolkit.DpDisplayOptions
import com.meta.spatial.toolkit.Grabbable
import com.meta.spatial.toolkit.LayoutXMLPanelRegistration
import com.meta.spatial.toolkit.Panel
import com.meta.spatial.toolkit.PanelRegistration
import com.meta.spatial.toolkit.QuadShapeOptions
import com.meta.spatial.toolkit.Transform
import com.meta.spatial.toolkit.UIPanelSettings
import com.meta.spatial.toolkit.Visible
import com.meta.spatial.vr.LocomotionSystem
import com.meta.spatial.vr.VRFeature

// Twistwright for Meta Quest: the Quest cube lab as a Horizon OS app (Meta Spatial SDK). In
// passthrough, the Quest page (quest/index.html, built in: Pages.java) is a panel in the room, with
// the cube the app draws beside it (CubeView). The page keeps all the logic, as in the browser: the
// cube's link (js/bridge.js over BleBridge.java, the headset's own Bluetooth), the moves, Drill mode,
// the stage. The app adds what the Quest Browser does not have: the headset's speech service for the
// voice (QuestSpeech), and the cube in the room with no WebXR. The panel's grab bar carries the panel,
// and the cube with it.
class QuestActivity : AppSystemActivity() {
  private var web: WebView? = null
  private var bridge: BleBridge? = null
  private var speech: QuestSpeech? = null
  private lateinit var pages: Pages
  private val cube = CubeView()

  override fun registerFeatures(): List<SpatialFeature> = listOf(VRFeature(this))

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    WebView.setWebContentsDebuggingEnabled(true) // chrome://inspect on the Mac, over adb
    pages = Pages(this)
    systemManager.registerSystem(cube.system)
    systemManager.findSystem<LocomotionSystem>().enableLocomotion(false)
    scene.enablePassthrough(true)
  }

  override fun onSceneReady() {
    super.onSceneReady()
    scene.setReferenceSpace(ReferenceSpace.LOCAL_FLOOR)
    scene.setLightingEnvironment(Vector3(1.2f), Vector3(2f), -Vector3(1f, 3f, -2f), 0.3f)
    // The panel at a seated height, a little to the left and in front; the cube to its right.
    val panel = Entity.create(listOf(
      Panel(R.id.page_panel),
      Transform(Pose(Vector3(-0.3f, 1.15f, 0.95f), Quaternion(1f, 0f, 0f, 0f))),
      Grabbable(),
      Visible(true)))
    cube.attach(panel)
  }

  override fun registerPanels(): List<PanelRegistration> = listOf(
    LayoutXMLPanelRegistration(
      R.id.page_panel,
      layoutIdCreator = { R.layout.page_panel },
      settingsCreator = {
        UIPanelSettings(
          shape = QuadShapeOptions(width = 0.84f, height = 0.63f),
          display = DpDisplayOptions(width = 960f, height = 720f))
      },
      panelSetupWithRootView = { root, _, _ -> pageInto(root) }))

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
    w.addJavascriptInterface(cube.Page(), "TwistwrightQuest")
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
}
