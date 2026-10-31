package com.twistwright.quest

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import org.json.JSONArray
import org.json.JSONObject

// The voice of the Quest page in the app: the headset's own speech service (Horizon OS has one, on
// the headset) through Android's SpeechRecognizer, as window.TwistwrightSpeech. quest/voice.js
// (questVoiceNative) calls start(json) when Drill mode starts and stop() when it ends; in between
// this listens one sentence at a time, again after each, and sends what it hears to
// window.questSpeechEvent: {type: 'ready' | 'partial' | 'final' (texts: the alternatives, the
// likeliest first) | 'blocked' (no microphone) | 'error' (msg)}. A quiet spell or nothing heard
// starts the next sentence with no event. The options: {lang, bias: the phrases to favor}.
class QuestSpeech(private val act: Activity, private val web: WebView) {
  companion object {
    const val ASK = 2 // the microphone question; BleBridge.ASK is 1
    val TAG: String = BleBridge.TAG
  }
  private val main = Handler(Looper.getMainLooper())
  private var rec: SpeechRecognizer? = null
  private var on = false
  private var lang = "en-US"
  private var bias = ArrayList<String>()
  private var onDevice = false // the on-device recognizer, after the default one would not bind
  private var heardOnce = false

  @JavascriptInterface
  fun start(json: String?): String {
    val o = try { JSONObject(json ?: "{}") } catch (e: Exception) { JSONObject() }
    if (!SpeechRecognizer.isRecognitionAvailable(act) && !SpeechRecognizer.isOnDeviceRecognitionAvailable(act)) return "none"
    lang = o.optString("lang", "en-US")
    bias = ArrayList<String>().also { l -> o.optJSONArray("bias")?.let { a -> for (i in 0 until a.length()) l.add(a.getString(i)) } }
    main.post {
      on = true
      if (act.checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) listen()
      else act.requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), ASK)
    }
    return "ok"
  }

  @JavascriptInterface
  fun stop() { main.post { on = false; drop() } }

  // The answer to the microphone question (QuestActivity.onRequestPermissionsResult).
  fun permissionsAnswered() {
    if (!on) return
    if (act.checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) listen()
    else { on = false; send("blocked") }
  }

  fun destroy() { on = false; drop() }

  private fun drop() { rec?.let { try { it.cancel(); it.destroy() } catch (e: Exception) {} }; rec = null }

  private fun recognizer(): SpeechRecognizer {
    rec?.let { return it }
    val r = if (onDevice || !SpeechRecognizer.isRecognitionAvailable(act)) SpeechRecognizer.createOnDeviceSpeechRecognizer(act)
            else SpeechRecognizer.createSpeechRecognizer(act)
    r.setRecognitionListener(listener)
    rec = r
    return r
  }

  private var downloadAsked = false

  private fun intent() = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
      putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
      putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang)
      putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
      putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
      putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5)
      if (bias.isNotEmpty()) putStringArrayListExtra(RecognizerIntent.EXTRA_BIASING_STRINGS, bias)
    }

  private fun listen() {
    if (!on) return
    try { recognizer().startListening(intent()) }
    catch (e: Exception) { Log.w(TAG, "The speech service did not start: $e"); again(1000) }
  }

  private fun again(ms: Long) { main.postDelayed({ if (on) listen() }, ms) }

  private val listener = object : RecognitionListener {
    override fun onReadyForSpeech(params: Bundle?) { heardOnce = true; send("ready") }
    override fun onBeginningOfSpeech() {}
    override fun onRmsChanged(rmsdB: Float) {}
    override fun onBufferReceived(buffer: ByteArray?) {}
    override fun onEndOfSpeech() {}
    override fun onEvent(eventType: Int, params: Bundle?) {}
    override fun onPartialResults(b: Bundle?) { texts(b)?.let { send("partial", it) } }
    override fun onResults(b: Bundle?) { texts(b)?.let { send("final", it) }; again(100) }
    override fun onError(error: Int) {
      if (!on) return
      when (error) {
        SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> again(100)
        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> { on = false; drop(); send("blocked") }
        // A headset new to the voice has no English model yet ("Models are not available for
        // language: en-US - requires download", seen on a Quest 3): ask for it once, and try again
        // until it is there.
        SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE -> {
          if (!downloadAsked) {
            downloadAsked = true
            try { rec?.triggerModelDownload(intent()); Log.i(TAG, "Speech: asked for the English model") }
            catch (e: Exception) { Log.w(TAG, "Speech: the model download did not start: $e") }
          }
          send("error", null, "the headset is getting its English speech model. The voice starts when it is there")
          again(5000)
        }
        SpeechRecognizer.ERROR_RECOGNIZER_BUSY, SpeechRecognizer.ERROR_CLIENT, SpeechRecognizer.ERROR_SERVER_DISCONNECTED -> {
          // the default service would not take us: the on-device one, once
          if (!heardOnce && !onDevice && SpeechRecognizer.isOnDeviceRecognitionAvailable(act)) { onDevice = true; Log.i(TAG, "Speech: the on-device recognizer, after error $error") }
          drop(); again(500)
        }
        else -> { Log.w(TAG, "Speech error $error"); send("error", null, words(error)); drop(); again(1500) }
      }
    }
  }

  private fun texts(b: Bundle?): List<String>? =
    b?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.filter { it.isNotBlank() }?.takeIf { it.isNotEmpty() }

  private fun words(error: Int): String = when (error) {
    SpeechRecognizer.ERROR_AUDIO -> "the microphone gave no sound"
    SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "no network"
    SpeechRecognizer.ERROR_SERVER -> "the speech service failed"
    SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED -> "no English speech model on the headset"
    SpeechRecognizer.ERROR_TOO_MANY_REQUESTS -> "too many requests"
    else -> "error $error"
  }

  private fun send(type: String, texts: List<String>? = null, msg: String? = null) {
    val o = JSONObject().put("type", type)
    if (texts != null) o.put("texts", JSONArray(texts))
    if (msg != null) o.put("msg", msg)
    if (type == "final") Log.i(TAG, "Speech heard: $texts")
    main.post { web.evaluateJavascript("window.questSpeechEvent&&window.questSpeechEvent($o)", null) }
  }
}
