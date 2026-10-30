package com.twistwright.quest;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.bluetooth.BluetoothStatusCodes;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanRecord;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.util.SparseArray;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

// The bridge of mac/Sources/Bridge.swift on Android: JSON messages between the page and Android
// Bluetooth. The page keeps the GAN protocol and the cipher (js/gan.js); the app only moves bytes.
// The page reaches it through quest/android/shim.js, which puts this object (TwistwrightAndroid)
// behind webkit.messageHandlers.bridge, as the Mac app's window has it. The messages are the ones
// that Bridge.swift lists. Here id is the cube's Bluetooth address. Android runs one GATT request at a
// time per cube, so the notify and write requests wait in a queue (Conn.ops).
@SuppressLint("MissingPermission")
public final class BleBridge {
    static final String TAG = "Twistwright";
    static final int ASK = 1;
    static final UUID CCCD = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");
    static final String[] PREFIXES = {"GAN", "MG", "AiCube"};

    final Activity act;
    final WebView web;
    final String version;
    final Handler main = new Handler(Looper.getMainLooper());
    final BluetoothAdapter adapter;
    final SharedPreferences prefs;
    final Map<String, BluetoothDevice> devices = new HashMap<>();
    final Map<String, String> names = new HashMap<>();
    final Map<String, String> macs = new HashMap<>();
    final Map<String, Conn> conns = new HashMap<>();
    boolean scanWanted = false, scanning = false;

    BleBridge(Activity a, WebView w, String v) {
        act = a; web = w; version = v;
        BluetoothManager bm = (BluetoothManager) a.getSystemService(Context.BLUETOOTH_SERVICE);
        adapter = bm == null ? null : bm.getAdapter();
        prefs = a.getSharedPreferences("bridge", Context.MODE_PRIVATE);
        a.registerReceiver(power, new IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED));
    }

    // ----- The page -----

    // From the page, on the WebView's own thread. hello answers at once; the rest goes to the main thread.
    @JavascriptInterface
    public String post(String json) {
        final JSONObject m;
        try { m = new JSONObject(json); } catch (JSONException e) { return null; }
        if ("hello".equals(m.optString("op"))) {
            try { return new JSONObject().put("version", version).put("bluetooth", stateName()).toString(); }
            catch (JSONException e) { return null; }
        }
        main.post(() -> handle(m));
        return null;
    }

    void send(JSONObject m) {
        final String js = "window.bridgeEvent&&window.bridgeEvent(" + m.toString() + ")";
        main.post(() -> web.evaluateJavascript(js, null));
    }
    void send(Object... kv) {
        JSONObject m = new JSONObject();
        try { for (int i = 0; i + 1 < kv.length; i += 2) m.put((String) kv[i], kv[i + 1] == null ? JSONObject.NULL : kv[i + 1]); }
        catch (JSONException e) { return; }
        send(m);
    }
    void error(String message, String id, Long seq) {
        send("ev", "error", "message", message, "id", id, "seq", seq);
    }
    void sendState() { send("ev", "bluetooth", "state", stateName()); }

    void handle(JSONObject m) {
        String op = m.optString("op"), id = m.optString("id", "");
        Long seq = m.has("seq") ? m.optLong("seq") : null;
        switch (op) {
            case "scan":
                // The page's look with no click does not bring up the question. It waits for a press.
                if (m.optBoolean("auto") && "notAsked".equals(stateName())) { sendState(); return; }
                scanWanted = true;
                if (!allowed()) { ask(); return; }
                scanIfReady();
                break;
            case "stop": scanWanted = false; stopScan(); break;
            case "connect": connect(id); break;
            case "disconnect": {
                Conn c = conns.get(id);
                if (c != null) {
                    c.dropped = true;
                    try { c.gatt.disconnect(); } catch (Exception e) { closeConn(c, 0); }
                    main.postDelayed(() -> closeConn(c, 0), 1500);
                }
                break;
            }
            case "notify": notifyOn(id, m.optString("char")); break;
            case "write": write(id, m.optString("char"), m.optString("data"), seq == null ? 0 : seq); break;
            case "migrate": send("ev", "migrated", "seq", seq == null ? 0 : seq, "count", 0, "cancelled", true); break;
            default: error("Unknown request " + op + ".", null, null);
        }
    }

    // A new page, or the app closes: drop every cube and the scan, as Safari does when a tab closes.
    void release() {
        scanWanted = false;
        stopScan();
        for (Conn c : new ArrayList<>(conns.values())) {
            c.dropped = true;
            try { c.gatt.disconnect(); } catch (Exception e) { /* closed below */ }
            closeConn(c, 0);
        }
    }
    void destroy() {
        release();
        try { act.unregisterReceiver(power); } catch (Exception e) { /* not registered */ }
    }

    // ----- Bluetooth, and the permission to use it -----

    static String[] perms() {
        return Build.VERSION.SDK_INT >= 31
            ? new String[]{Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT}
            : new String[]{Manifest.permission.ACCESS_FINE_LOCATION};
    }
    boolean allowed() {
        for (String p : perms()) if (act.checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) return false;
        return true;
    }
    // The names that Bridge.swift gives: poweredOn, poweredOff, unauthorized, unsupported, notAsked, resetting.
    String stateName() {
        if (adapter == null || !act.getPackageManager().hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)) return "unsupported";
        if (!allowed()) return prefs.getBoolean("asked", false) ? "unauthorized" : "notAsked";
        int s = adapter.getState();
        if (s == BluetoothAdapter.STATE_ON) return "poweredOn";
        if (s == BluetoothAdapter.STATE_TURNING_ON || s == BluetoothAdapter.STATE_TURNING_OFF) return "resetting";
        return "poweredOff";
    }
    void ask() {
        prefs.edit().putBoolean("asked", true).apply();
        act.requestPermissions(perms(), ASK);
    }
    // The answer to the question (MainActivity.onRequestPermissionsResult).
    void permissionsAnswered() { sendState(); scanIfReady(); }

    final BroadcastReceiver power = new BroadcastReceiver() {
        @Override public void onReceive(Context c, Intent i) { main.post(() -> { sendState(); scanIfReady(); }); }
    };

    // ----- The scan -----

    final ScanCallback scanCb = new ScanCallback() {
        @Override public void onScanResult(int type, ScanResult r) { main.post(() -> found(r)); }
        @Override public void onBatchScanResults(List<ScanResult> list) { for (ScanResult r : list) main.post(() -> found(r)); }
        @Override public void onScanFailed(int code) { Log.w(TAG, "The scan did not start: " + code); main.post(() -> scanning = false); }
    };
    void scanIfReady() {
        if (!scanWanted || !"poweredOn".equals(stateName())) return;
        if (!scanning) {
            BluetoothLeScanner s = adapter.getBluetoothLeScanner();
            if (s == null) return;
            s.startScan(null, new ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build(), scanCb);
            scanning = true;
        }
        // Cubes seen before are still here for a page that just opened.
        for (String id : devices.keySet()) send(deviceMessage(id));
    }
    void stopScan() {
        if (!scanning) return;
        scanning = false;
        try { BluetoothLeScanner s = adapter.getBluetoothLeScanner(); if (s != null) s.stopScan(scanCb); }
        catch (Exception e) { /* Bluetooth went off */ }
    }
    void found(ScanResult r) {
        if (!scanning) return;
        BluetoothDevice d = r.getDevice();
        ScanRecord rec = r.getScanRecord();
        String name = rec != null ? rec.getDeviceName() : null;
        if (name == null) { try { name = d.getName(); } catch (SecurityException e) { name = null; } }
        if (name == null || !isCube(name)) return;
        String id = d.getAddress();
        boolean isNew = !devices.containsKey(id);
        devices.put(id, d);
        names.put(id, name);
        // The MAC address is the last six of the first nine data bytes, in reverse order. Android
        // gives the data without the two-byte company code. Some advertisements carry none.
        boolean newMac = false;
        if (!macs.containsKey(id) && rec != null) {
            SparseArray<byte[]> md = rec.getManufacturerSpecificData();
            byte[] v = md != null && md.size() > 0 ? md.valueAt(0) : null;
            if (v != null && v.length >= 6) {
                int n = Math.min(v.length, 9);
                StringBuilder s = new StringBuilder();
                for (int i = n - 1; i >= n - 6; i--) { if (s.length() > 0) s.append(':'); s.append(String.format("%02X", v[i] & 0xff)); }
                macs.put(id, s.toString());
                newMac = true;
            }
        }
        if (isNew || newMac) send(deviceMessage(id));
    }
    static boolean isCube(String name) {
        for (String p : PREFIXES) if (name.startsWith(p)) return true;
        return false;
    }
    JSONObject deviceMessage(String id) {
        JSONObject m = new JSONObject();
        try { m.put("ev", "device").put("id", id).put("name", names.containsKey(id) ? names.get(id) : "GAN cube").put("mac", macs.containsKey(id) ? macs.get(id) : JSONObject.NULL); }
        catch (JSONException e) { /* plain values */ }
        return m;
    }

    // ----- A cube's link -----

    // One GATT request. start returns false when it is over at once (it sent its own error, if any).
    abstract static class Op {
        abstract boolean start(Conn c);
        void done(Conn c, int status) {}
    }
    final class Conn {
        final String id;
        BluetoothGatt gatt;
        boolean ready, dropped;
        final ArrayDeque<Op> ops = new ArrayDeque<>();
        Op cur;
        Runnable timer;
        Conn(String id) { this.id = id; }
    }

    void connect(String id) {
        BluetoothDevice d = devices.get(id);
        if (d == null) { error("The cube is not in the list any more. Look for it again.", id, null); return; }
        Conn have = conns.get(id);
        if (have != null) { if (have.ready) sendConnected(have); return; } // else the answer comes when the link is ready
        Conn c = new Conn(id);
        conns.put(id, c);
        c.gatt = d.connectGatt(act, false, gattCallback(c), BluetoothDevice.TRANSPORT_LE);
        if (c.gatt == null) { conns.remove(id); error("The connection did not start.", id, null); }
    }

    BluetoothGattCallback gattCallback(final Conn c) {
        return new BluetoothGattCallback() {
            @Override public void onConnectionStateChange(BluetoothGatt g, int status, int state) {
                main.post(() -> {
                    if (state == BluetoothProfile.STATE_CONNECTED) {
                        // A short interval between messages: a turn reaches the page sooner.
                        g.requestConnectionPriority(BluetoothGatt.CONNECTION_PRIORITY_HIGH);
                        if (!g.discoverServices()) { error("The cube did not list its services.", c.id, null); g.disconnect(); }
                    } else if (state == BluetoothProfile.STATE_DISCONNECTED) closeConn(c, status);
                });
            }
            @Override public void onServicesDiscovered(BluetoothGatt g, int status) {
                main.post(() -> {
                    if (status != BluetoothGatt.GATT_SUCCESS) { error("The cube did not list its services.", c.id, null); g.disconnect(); return; }
                    c.ready = true;
                    sendConnected(c);
                });
            }
            @Override public void onDescriptorWrite(BluetoothGatt g, BluetoothGattDescriptor d, int status) { main.post(() -> opDone(c, status)); }
            @Override public void onCharacteristicWrite(BluetoothGatt g, BluetoothGattCharacteristic ch, int status) { main.post(() -> opDone(c, status)); }
            // Android 13 and later call this one; earlier versions call the one after it.
            @Override public void onCharacteristicChanged(BluetoothGatt g, BluetoothGattCharacteristic ch, byte[] v) { value(c, ch, v); }
            @SuppressWarnings("deprecation")
            @Override public void onCharacteristicChanged(BluetoothGatt g, BluetoothGattCharacteristic ch) {
                if (Build.VERSION.SDK_INT < 33) value(c, ch, ch.getValue());
            }
        };
    }
    void value(Conn c, BluetoothGattCharacteristic ch, byte[] v) {
        if (v == null) return;
        send("ev", "value", "id", c.id, "char", ch.getUuid().toString(), "data", toHex(v));
    }
    void sendConnected(Conn c) {
        JSONArray services = new JSONArray();
        for (BluetoothGattService s : c.gatt.getServices()) {
            JSONArray chars = new JSONArray();
            for (BluetoothGattCharacteristic ch : s.getCharacteristics()) chars.put(ch.getUuid().toString());
            JSONObject o = new JSONObject();
            try { o.put("uuid", s.getUuid().toString()).put("chars", chars); } catch (JSONException e) { continue; }
            services.put(o);
        }
        send("ev", "connected", "id", c.id, "services", services);
    }
    // The link is over: a drop, the page's disconnect, or a connect that did not start.
    void closeConn(Conn c, int status) {
        if (conns.get(c.id) != c) return;
        conns.remove(c.id);
        if (c.timer != null) { main.removeCallbacks(c.timer); c.timer = null; }
        try { c.gatt.close(); } catch (Exception e) { /* gone already */ }
        List<Op> left = new ArrayList<>(c.ops);
        if (c.cur != null) left.add(0, c.cur);
        c.ops.clear(); c.cur = null;
        if (c.dropped) return;
        for (Op o : left) if (o instanceof Write) error("The cube went away.", c.id, ((Write) o).seq);
        if (c.ready) send("ev", "gone", "id", c.id);
        else error("The connection did not start (" + status + "). Turn the cube to wake it, then try again.", c.id, null);
    }
    BluetoothGattCharacteristic find(Conn c, String uuid) {
        if (c == null || !c.ready || uuid == null) return null;
        String u = uuid.toLowerCase();
        for (BluetoothGattService s : c.gatt.getServices())
            for (BluetoothGattCharacteristic ch : s.getCharacteristics())
                if (ch.getUuid().toString().equals(u)) return ch;
        return null;
    }

    // ----- The queue -----

    void enqueue(Conn c, Op o) { c.ops.add(o); next(c); }
    void next(Conn c) {
        while (c.cur == null && !c.ops.isEmpty()) {
            final Op o = c.ops.poll();
            c.cur = o;
            if (!o.start(c)) { c.cur = null; continue; }
            // A request with no answer must not hold the queue.
            c.timer = () -> { if (c.cur == o) opDone(c, -1); };
            main.postDelayed(c.timer, 2500);
        }
    }
    void opDone(Conn c, int status) {
        Op o = c.cur;
        if (o == null) return;
        c.cur = null;
        if (c.timer != null) { main.removeCallbacks(c.timer); c.timer = null; }
        o.done(c, status);
        next(c);
    }

    @SuppressWarnings("deprecation")
    void notifyOn(String id, String uuid) {
        Conn c = conns.get(id);
        BluetoothGattCharacteristic ch = find(c, uuid);
        if (ch == null) { error("No such characteristic.", id, null); return; }
        enqueue(c, new Op() {
            @Override boolean start(Conn c) {
                if (!c.gatt.setCharacteristicNotification(ch, true)) { error("The cube did not start to send.", id, null); return false; }
                BluetoothGattDescriptor d = ch.getDescriptor(CCCD);
                if (d == null) return false;
                byte[] v = (ch.getProperties() & BluetoothGattCharacteristic.PROPERTY_NOTIFY) != 0
                    ? BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE : BluetoothGattDescriptor.ENABLE_INDICATION_VALUE;
                boolean ok;
                if (Build.VERSION.SDK_INT >= 33) ok = c.gatt.writeDescriptor(d, v) == BluetoothStatusCodes.SUCCESS;
                else { d.setValue(v); ok = c.gatt.writeDescriptor(d); }
                if (!ok) error("The cube did not start to send.", id, null);
                return ok;
            }
            @Override void done(Conn c, int status) { if (status != BluetoothGatt.GATT_SUCCESS) error("The cube did not start to send.", id, null); }
        });
    }

    final class Write extends Op {
        final String id; final BluetoothGattCharacteristic ch; final byte[] data; final long seq; final boolean answer;
        Write(String id, BluetoothGattCharacteristic ch, byte[] data, long seq) {
            this.id = id; this.ch = ch; this.data = data; this.seq = seq;
            answer = (ch.getProperties() & BluetoothGattCharacteristic.PROPERTY_WRITE) != 0;
        }
        @SuppressWarnings("deprecation")
        @Override boolean start(Conn c) {
            int type = answer ? BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT : BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE;
            boolean ok;
            if (Build.VERSION.SDK_INT >= 33) ok = c.gatt.writeCharacteristic(ch, data, type) == BluetoothStatusCodes.SUCCESS;
            else { ch.setWriteType(type); ch.setValue(data); ok = c.gatt.writeCharacteristic(ch); }
            if (!ok) { error("The cube did not take the message.", id, seq); return false; }
            if (!answer) send("ev", "written", "seq", seq);
            return true;
        }
        @Override void done(Conn c, int status) {
            if (!answer) return;
            if (status == BluetoothGatt.GATT_SUCCESS) send("ev", "written", "seq", seq);
            else error("The cube did not take the message.", id, seq);
        }
    }
    void write(String id, String uuid, String hex, long seq) {
        Conn c = conns.get(id);
        BluetoothGattCharacteristic ch = find(c, uuid);
        if (ch == null) { error("No such characteristic.", id, seq); return; }
        byte[] data = fromHex(hex);
        if (data == null) { error("Bad data.", id, seq); return; }
        enqueue(c, new Write(id, ch, data, seq));
    }

    // ----- Hex, as Bridge.swift writes it -----

    static String toHex(byte[] d) {
        StringBuilder s = new StringBuilder(d.length * 2);
        for (byte b : d) s.append(String.format("%02x", b & 0xff));
        return s.toString();
    }
    static byte[] fromHex(String s) {
        if (s == null || s.length() % 2 != 0) return null;
        byte[] out = new byte[s.length() / 2];
        for (int i = 0; i < out.length; i++) {
            int hi = Character.digit(s.charAt(2 * i), 16), lo = Character.digit(s.charAt(2 * i + 1), 16);
            if (hi < 0 || lo < 0) return null;
            out[i] = (byte) (hi * 16 + lo);
        }
        return out;
    }
}
