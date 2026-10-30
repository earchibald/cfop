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
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

// Twistwright on a Meta Quest: a 2D window with the site, the lab and the Quest page in a WebView,
// and the cube over Android Bluetooth (BleBridge). The Quest Browser has no Web Bluetooth; this
// app is the Mac app's window on the headset. The pages are built in (assets/site/, copied by
// build.sh) and served at https://appassets.androidplatform.net/, the address Android keeps for
// an app's own files: a secure context with its own storage, so the cw: keys stay between runs.
// Every page gets shim.js first in its head. An Android WebView has no immersive WebXR, so the
// Quest page shows its flat preview here.
public final class MainActivity extends Activity {
    static final String TAG = BleBridge.TAG;
    static final String HOST = "appassets.androidplatform.net";
    static final String ORIGIN = "https://" + HOST + "/";
    static final String START = "app/";

    WebView web;
    BleBridge bridge;
    byte[] shim;

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
        try { shim = ("<script>" + new String(read(getAssets().open("shim.js")), StandardCharsets.UTF_8) + "</script>").getBytes(StandardCharsets.UTF_8); }
        catch (IOException e) { shim = new byte[0]; Log.e(TAG, "No shim.js in the app"); }

        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) { return serve(r.getUrl()); }
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

    // ----- The built-in pages -----

    static final Map<String, String> TYPES = new HashMap<>();
    static {
        TYPES.put("html", "text/html"); TYPES.put("js", "text/javascript"); TYPES.put("mjs", "text/javascript");
        TYPES.put("css", "text/css"); TYPES.put("json", "application/json"); TYPES.put("svg", "image/svg+xml");
        TYPES.put("png", "image/png"); TYPES.put("jpg", "image/jpeg"); TYPES.put("webp", "image/webp");
        TYPES.put("woff2", "font/woff2"); TYPES.put("wasm", "application/wasm"); TYPES.put("txt", "text/plain");
        TYPES.put("md", "text/markdown"); TYPES.put("ico", "image/x-icon");
    }
    WebResourceResponse serve(Uri u) {
        if (!HOST.equals(u.getHost())) return null;
        String p = u.getPath();
        if (p == null || p.isEmpty()) p = "/";
        if (p.endsWith("/")) p += "index.html";
        if (p.contains("..")) return missing();
        String ext = p.substring(p.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        String type = TYPES.containsKey(ext) ? TYPES.get(ext) : "application/octet-stream";
        Map<String, String> head = new HashMap<>();
        head.put("Cache-Control", "no-cache");
        try {
            InputStream in = getAssets().open("site" + p);
            if (ext.equals("html")) in = new ByteArrayInputStream(withShim(read(in)));
            boolean text = type.startsWith("text/") || type.endsWith("json") || type.endsWith("javascript");
            return new WebResourceResponse(type, text ? "utf-8" : null, 200, "OK", head, in);
        } catch (IOException e) {
            return missing();
        }
    }
    WebResourceResponse missing() {
        return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", new HashMap<>(),
            new ByteArrayInputStream("Not in the app.".getBytes(StandardCharsets.UTF_8)));
    }
    // The shim goes just after <head>, so it runs before any script of the page.
    byte[] withShim(byte[] html) {
        String s = new String(html, StandardCharsets.UTF_8);
        int h = s.toLowerCase(Locale.ROOT).indexOf("<head");
        int at = h < 0 ? 0 : s.indexOf('>', h) + 1;
        ByteArrayOutputStream out = new ByteArrayOutputStream(html.length + shim.length);
        byte[] before = s.substring(0, at).getBytes(StandardCharsets.UTF_8);
        out.write(before, 0, before.length);
        out.write(shim, 0, shim.length);
        byte[] after = s.substring(at).getBytes(StandardCharsets.UTF_8);
        out.write(after, 0, after.length);
        return out.toByteArray();
    }
    static byte[] read(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        for (int n; (n = in.read(buf)) > 0; ) out.write(buf, 0, n);
        in.close();
        return out.toByteArray();
    }
}
