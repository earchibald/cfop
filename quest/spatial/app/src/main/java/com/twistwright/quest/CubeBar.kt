package com.twistwright.quest

import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import org.json.JSONArray

// The rows of buttons under the cube, as the page's session has them (questBarButtons in
// quest/core.js, in the app's form: no Exit, Bring here): Tilt, Level, Clear, Hidden faces, Smaller,
// Larger, Hide panel; the hold's tiles and Bring here; Drill mode, New scramble, Real cube state and
// Listen. The page sends the buttons in each frame (quest/native.js); a press goes back to the page as
// questNativeDo(id). A fingertip pokes one, or a ray and a pinch.
class CubeBar(private val rows: LinearLayout, private val press: (String) -> Unit) {
  private fun dp(v: Float) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, rows.resources.displayMetrics)

  fun show(buttons: JSONArray) {
    rows.removeAllViews()
    val byRow = sortedMapOf<Int, MutableList<org.json.JSONObject>>()
    for (i in 0 until buttons.length()) { val b = buttons.getJSONObject(i); byRow.getOrPut(b.optInt("row")) { ArrayList() }.add(b) }
    for ((_, list) in byRow) {
      val row = LinearLayout(rows.context).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER }
      list.forEachIndexed { i, b -> row.addView(button(b), params(b, i)) }
      rows.addView(row, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(6f).toInt() })
    }
  }

  private fun params(b: org.json.JSONObject, i: Int): LinearLayout.LayoutParams {
    val tile = b.optBoolean("tile")
    return LinearLayout.LayoutParams(dp(if (tile) 92f else 124f).toInt(), dp(92f).toInt()).apply {
      leftMargin = if (i == 0) 0 else dp(if (b.optBoolean("group")) 30f else 8f).toInt()
    }
  }

  private fun button(b: org.json.JSONObject): View {
    val id = b.getString("id")
    val tile = b.optBoolean("tile")
    val on = b.optBoolean("on")
    val off = b.optBoolean("off")
    return Button(rows.context).apply {
      isAllCaps = false
      text = if (tile) "" else b.optString("label")
      contentDescription = b.optString("label") + if (tile) " " + id.substringAfter('-') else ""
      setTextColor(Color.parseColor("#f1f0ea"))
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 19f)
      setPadding(dp(6f).toInt(), 0, dp(6f).toInt(), 0)
      minWidth = 0; minHeight = 0; minimumWidth = 0; minimumHeight = 0
      stateListAnimator = null
      background = GradientDrawable().apply {
        cornerRadius = dp(16f)
        if (tile) {
          setColor(Color.parseColor(b.optString("color", "#8f8f97")))
          setStroke(dp(if (on) 6f else 1.5f).toInt(), Color.parseColor(if (on) "#f1f0ea" else "#80000000"))
        } else {
          setColor(Color.parseColor(if (on) "#1d3b2a" else "#1e1e22"))
          setStroke(dp(2f).toInt(), Color.parseColor(if (on) "#3cb371" else "#3a3a42"))
        }
      }
      isEnabled = !off
      alpha = if (off) 0.4f else 1f
      setOnClickListener { press(id) }
    }
  }
}
