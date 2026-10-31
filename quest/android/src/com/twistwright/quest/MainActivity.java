package com.twistwright.quest;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;


// Twistwright on a Meta Quest: a 2D window with the site, the lab and the Quest page in a WebView,
// and the cube over Android Bluetooth (BleBridge). The Quest Browser has no Web Bluetooth; this
// app is the Mac app's window on the headset. The pages are built in (assets/site/, copied by
// build.sh) and served at https://appassets.androidplatform.net/, the address Android keeps for
// an app's own files: a secure context with its own storage, so the cw: keys stay between runs.
// Every page gets shim.js first in its head. An Android WebView has no immersive WebXR, so the
// Quest page shows its flat preview here.
public final class MainActivity extends Activity {
    static final String TAG = BleBridge.TAG;
    static final String HOST = Pages.HOST;
    static final String ORIGIN = Pages.ORIGIN;
    static final String START = "app/";

    WebView web;
    BleBridge bridge;
    Pages pages;

    @Override protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        WebView.setWebContentsDebuggingEnabled(true); // chrome://inspect on the Mac, over adb
        web = new WebView(this);
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);

        String version = "0";
        try { version = getPackageManager().getPackageInfo(getPackageName(), 0).versionName; }
        catch (PackageManager.NameNotFoundException e) { /* our own package */ }
        bridge = new BleBridge(this, web, version);
        web.addJavascriptInterface(bridge, "TwistwrightAndroid");
        pages = new Pages(this);

        web.setWebViewClient(new WebViewClient() {
            @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) { return pages.serve(r.getUrl()); }
            // Links away from the app's pages open in the Quest Browser.
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (HOST.equals(u.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (ActivityNotFoundException e) { /* no browser */ }
                return true;
            }
            // A new page: the cubes and the scan of the page before are let go.
            @Override public void onPageStarted(WebView v, String url, Bitmap icon) { bridge.release(); }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage m) {
                Log.i(TAG, m.message() + " (" + m.sourceId() + ":" + m.lineNumber() + ")");
                return true;
            }
        });

        String page = getIntent().getStringExtra("page");
        if (saved != null) web.restoreState(saved);
        else web.loadUrl(ORIGIN + (page != null ? page : START));
    }

    // adb shell am start -n com.twistwright.quest/.MainActivity -e page lab/ opens that page.
    @Override protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        String page = i.getStringExtra("page");
        if (page != null) web.loadUrl(ORIGIN + page);
    }
    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }
    @Override public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        if (code == BleBridge.ASK) bridge.permissionsAnswered();
    }
    @SuppressWarnings("deprecation")
    @Override public void onBackPressed() {
        if (web.canGoBack()) web.goBack(); else super.onBackPressed();
    }
    @Override protected void onDestroy() {
        bridge.destroy();
        web.destroy();
        super.onDestroy();
    }
}
