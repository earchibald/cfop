package com.twistwright.quest;

import android.content.Context;
import android.net.Uri;
import android.util.Log;
import android.webkit.WebResourceResponse;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

// The pages built into a Quest app (assets/site/, copied by the build), served at
// https://appassets.androidplatform.net/, the address Android keeps for an app's own files: a
// secure context with its own storage, so the cw: keys stay between runs. Every page gets
// assets/shim.js first in its head. Both Quest apps use it: the WebView app (MainActivity) and the
// Spatial SDK app (quest/spatial/, QuestActivity).
final class Pages {
    static final String HOST = "appassets.androidplatform.net";
    static final String ORIGIN = "https://" + HOST + "/";

    final Context ctx;
    final byte[] shim;

    Pages(Context c) {
        ctx = c;
        byte[] s;
        try { s = ("<script>" + new String(read(c.getAssets().open("shim.js")), StandardCharsets.UTF_8) + "</script>").getBytes(StandardCharsets.UTF_8); }
        catch (IOException e) { s = new byte[0]; Log.e(BleBridge.TAG, "No shim.js in the app"); }
        shim = s;
    }

    static final Map<String, String> TYPES = new HashMap<>();
    static {
        TYPES.put("html", "text/html"); TYPES.put("js", "text/javascript"); TYPES.put("mjs", "text/javascript");
        TYPES.put("css", "text/css"); TYPES.put("json", "application/json"); TYPES.put("svg", "image/svg+xml");
        TYPES.put("png", "image/png"); TYPES.put("jpg", "image/jpeg"); TYPES.put("webp", "image/webp");
        TYPES.put("woff2", "font/woff2"); TYPES.put("wasm", "application/wasm"); TYPES.put("txt", "text/plain");
        TYPES.put("md", "text/markdown"); TYPES.put("ico", "image/x-icon");
    }
    // A page or file of the app's, or null for an address that is not the app's.
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
            InputStream in = ctx.getAssets().open("site" + p);
            if (ext.equals("html")) in = new ByteArrayInputStream(withShim(read(in)));
            boolean text = type.startsWith("text/") || type.endsWith("json") || type.endsWith("javascript");
            return new WebResourceResponse(type, text ? "utf-8" : null, 200, "OK", head, in);
        } catch (IOException e) {
            return missing();
        }
    }
    static WebResourceResponse missing() {
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
