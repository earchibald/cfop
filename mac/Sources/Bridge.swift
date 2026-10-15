import Foundation
import Network
import CoreBluetooth

// The bridge: a WebSocket on 127.0.0.1 that carries JSON messages between the page and
// CoreBluetooth. The page keeps the GAN protocol and the cipher (js/gan.js); the app only moves
// bytes. js/bridge.js is the other end.
//
//   page → app   {op:"scan"} {op:"stop"} {op:"connect",id} {op:"disconnect",id}
//                {op:"notify",id,char} {op:"write",id,char,data,seq}
//   app → page   {ev:"hello",version,bluetooth} {ev:"bluetooth",state}
//                {ev:"device",id,name,mac} while a scan runs
//                {ev:"connected",id,services:[{uuid,chars:[uuid]}]} {ev:"gone",id}
//                {ev:"value",id,char,data} {ev:"written",seq} {ev:"error",id?,seq?,message}
//
// data is hex. UUIDs are the 128-bit form in lower case, as Web Bluetooth gives them. id is the
// peripheral identifier that CoreBluetooth gives; mac is read from the manufacturer data, as
// ganMacFromData does, and is null until an advertisement carries it.

final class Client {
    let conn: NWConnection
    weak var server: BridgeServer?
    var rejected = false
    init(_ c: NWConnection, _ s: BridgeServer) { conn = c; server = s }

    func start() {
        conn.stateUpdateHandler = { [weak self] st in
            switch st {
            case .ready:
                guard let self = self else { return }
                if self.rejected { self.conn.cancel(); return }
                self.send(["ev": "hello", "version": appVersion, "bluetooth": self.server?.bridge.stateName ?? "unknown"])
                self.receive()
            case .failed, .cancelled: self?.gone()
            default: break
            }
        }
        conn.start(queue: .main)
    }
    func receive() {
        // isComplete marks the end of one message. The link is over when there is no data with it, or on an error.
        conn.receiveMessage { [weak self] d, ctx, done, err in
            guard let self = self else { return }
            if let md = ctx?.protocolMetadata(definition: NWProtocolWebSocket.definition) as? NWProtocolWebSocket.Metadata {
                if md.opcode == .close { self.conn.cancel(); return }
                if let d = d, md.opcode == .text || md.opcode == .binary,
                   let msg = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any] {
                    self.server?.bridge.handle(msg, from: self)
                }
            }
            if err != nil || (d == nil && done) { self.conn.cancel(); return }
            self.receive()
        }
    }
    func send(_ obj: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: obj) else { return }
        let ctx = NWConnection.ContentContext(identifier: "msg", metadata: [NWProtocolWebSocket.Metadata(opcode: .text)])
        conn.send(content: data, contentContext: ctx, isComplete: true, completion: .contentProcessed { _ in })
    }
    func error(_ message: String, id: String? = nil, seq: Int? = nil) {
        var m: [String: Any] = ["ev": "error", "message": message]
        if let id = id { m["id"] = id }
        if let seq = seq { m["seq"] = seq }
        send(m)
    }
    private var wentAway = false
    func gone() {
        if wentAway { return }
        wentAway = true
        server?.remove(self)
    }
}

final class BridgeServer {
    let port: UInt16
    let bridge: Bridge
    var listener: NWListener?
    var clients: [Client] = []
    var awaiting: [Client] = []

    init(port: UInt16, bridge: Bridge) { self.port = port; self.bridge = bridge; bridge.server = self }

    func start() {
        let params = NWParameters.tcp
        params.requiredLocalEndpoint = .hostPort(host: "127.0.0.1", port: NWEndpoint.Port(rawValue: port)!)
        params.allowLocalEndpointReuse = true
        let ws = NWProtocolWebSocket.Options()
        ws.autoReplyPing = true
        // Only the page that this app serves may use the bridge. A browser always sends Origin.
        // The handler does not name its connection; the handshakes come in the order the
        // connections did, so the verdict goes to the oldest client that has none yet.
        ws.setClientRequestHandler(.main) { [weak self] _, headers in
            let origin = headers.first { $0.name.lowercased() == "origin" }?.value ?? ""
            let ok = ["http://127.0.0.1:\(HTTP_PORT)", "http://localhost:\(HTTP_PORT)"].contains(origin)
            if let cl = self?.awaiting.first { self?.awaiting.removeFirst(); cl.rejected = !ok }
            if !ok { NSLog("Bridge: refused a page from %@", origin) }
            return NWProtocolWebSocket.Response(status: ok ? .accept : .reject, subprotocol: nil)
        }
        params.defaultProtocolStack.applicationProtocols.insert(ws, at: 0)
        guard let l = try? NWListener(using: params) else { NSLog("Bridge: cannot listen on \(port)"); return }
        l.newConnectionHandler = { [weak self] c in
            guard let self = self else { return }
            let cl = Client(c, self)
            self.clients.append(cl); self.awaiting.append(cl)
            cl.start()
        }
        l.stateUpdateHandler = { st in if case .failed(let e) = st { NSLog("Bridge: \(e)") } }
        l.start(queue: .main)
        listener = l
    }
    func remove(_ c: Client) {
        clients.removeAll { $0 === c }; awaiting.removeAll { $0 === c }
        bridge.clientGone(c, others: clients)
    }
    func broadcast(_ m: [String: Any]) { clients.forEach { $0.send(m) } }
}

final class Bridge: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate {
    var central: CBCentralManager?
    var peripherals: [String: CBPeripheral] = [:]
    var macs: [String: String] = [:]
    var owners: [String: Client] = [:]
    var pendingServices: [String: Int] = [:]
    var writes: [String: [(seq: Int, client: Client)]] = [:]
    var scanWanted = false
    weak var server: BridgeServer?
    let onChange: () -> Void

    init(onChange: @escaping () -> Void) { self.onChange = onChange }

    // The manager starts on the first scan, so macOS asks for Bluetooth permission when the user
    // presses Connect, not when the app opens.
    func startCentral() {
        if central == nil { central = CBCentralManager(delegate: self, queue: .main) }
    }
    var stateName: String {
        guard let c = central else { return "unknown" }
        switch c.state {
        case .poweredOn: return "poweredOn"
        case .poweredOff: return "poweredOff"
        case .unauthorized: return "unauthorized"
        case .unsupported: return "unsupported"
        case .resetting: return "resetting"
        default: return "unknown"
        }
    }
    var stateText: String {
        switch stateName {
        case "poweredOn": return scanWanted ? "on, looking for cubes" : "on"
        case "poweredOff": return "off"
        case "unauthorized": return "not allowed. See System Settings > Privacy & Security > Bluetooth"
        case "unsupported": return "not on this Mac"
        case "unknown": return central == nil ? "not started" : "starting"
        default: return stateName
        }
    }
    var connectedNames: [String] {
        peripherals.values.filter { $0.state == .connected }.map { $0.name ?? "GAN cube" }
    }

    func handle(_ msg: [String: Any], from c: Client) {
        let op = msg["op"] as? String ?? ""
        let id = msg["id"] as? String ?? ""
        let seq = msg["seq"] as? Int
        switch op {
        case "scan":
            startCentral(); scanWanted = true; scanIfReady(); onChange()
        case "stop":
            scanWanted = false; central?.stopScan(); onChange()
        case "connect":
            guard let p = peripherals[id] else { c.error("The cube is not in the list any more. Look for it again.", id: id); return }
            owners[id] = c; p.delegate = self
            if p.state == .connected { sendConnected(p) } else { central?.connect(p) }
        case "disconnect":
            if let p = peripherals[id] { central?.cancelPeripheralConnection(p) }
        case "notify":
            guard let p = peripherals[id], let ch = characteristic(p, msg["char"] as? String) else { c.error("No such characteristic.", id: id); return }
            p.setNotifyValue(true, for: ch)
        case "write":
            guard let p = peripherals[id], let ch = characteristic(p, msg["char"] as? String) else { c.error("No such characteristic.", id: id, seq: seq); return }
            guard let data = fromHex(msg["data"] as? String ?? "") else { c.error("Bad data.", id: id, seq: seq); return }
            if ch.properties.contains(.write) {
                writes[id, default: []].append((seq ?? 0, c))
                p.writeValue(data, for: ch, type: .withResponse)
            } else {
                p.writeValue(data, for: ch, type: .withoutResponse)
                c.send(["ev": "written", "seq": seq ?? 0])
            }
        default:
            c.error("Unknown request \(op).")
        }
    }
    // A page went away: drop the cubes it connected, and stop the scan when no page is left.
    func clientGone(_ c: Client, others: [Client]) {
        for (id, o) in owners where o === c {
            owners[id] = nil
            if let p = peripherals[id] { central?.cancelPeripheralConnection(p) }
        }
        if others.isEmpty { scanWanted = false; central?.stopScan() }
        onChange()
    }
    func scanIfReady() {
        guard scanWanted, let c = central, c.state == .poweredOn else { return }
        c.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey: true])
        // Cubes seen before are still here for a page that just opened.
        for (id, p) in peripherals { server?.broadcast(deviceMessage(id, p)) }
    }
    func characteristic(_ p: CBPeripheral, _ uuid: String?) -> CBCharacteristic? {
        guard let u = uuid?.lowercased() else { return nil }
        for s in p.services ?? [] { for ch in s.characteristics ?? [] where fullUUID(ch.uuid) == u { return ch } }
        return nil
    }
    func deviceMessage(_ id: String, _ p: CBPeripheral) -> [String: Any] {
        ["ev": "device", "id": id, "name": p.name ?? "GAN cube", "mac": macs[id] as Any? ?? NSNull()]
    }
    func sendConnected(_ p: CBPeripheral) {
        let id = p.identifier.uuidString
        let services: [[String: Any]] = (p.services ?? []).map {
            ["uuid": fullUUID($0.uuid), "chars": ($0.characteristics ?? []).map { fullUUID($0.uuid) }]
        }
        owners[id]?.send(["ev": "connected", "id": id, "services": services])
        onChange()
    }

    // ----- CBCentralManagerDelegate -----
    func centralManagerDidUpdateState(_ c: CBCentralManager) {
        server?.broadcast(["ev": "bluetooth", "state": stateName])
        scanIfReady(); onChange()
    }
    func centralManager(_ c: CBCentralManager, didDiscover p: CBPeripheral, advertisementData ad: [String: Any], rssi: NSNumber) {
        let name = (ad[CBAdvertisementDataLocalNameKey] as? String) ?? p.name ?? ""
        guard ["GAN", "MG", "AiCube"].contains(where: { name.hasPrefix($0) }) else { return }
        let id = p.identifier.uuidString
        let isNew = peripherals[id] == nil
        peripherals[id] = p
        // The MAC address is the last six of the first nine data bytes, in reverse order, after
        // the two-byte company code. Some advertisements carry no manufacturer data.
        var newMac = false
        if let md = ad[CBAdvertisementDataManufacturerDataKey] as? Data, md.count >= 8, macs[id] == nil {
            let b = [UInt8](md)
            let data = Array(b[2..<min(b.count, 11)])
            macs[id] = data.suffix(6).reversed().map { String(format: "%02X", $0) }.joined(separator: ":")
            newMac = true
        }
        if isNew || newMac { server?.broadcast(deviceMessage(id, p)) }
    }
    func centralManager(_ c: CBCentralManager, didConnect p: CBPeripheral) { p.discoverServices(nil) }
    func centralManager(_ c: CBCentralManager, didFailToConnect p: CBPeripheral, error: Error?) {
        let id = p.identifier.uuidString
        owners[id]?.error(error?.localizedDescription ?? "The connection did not start.", id: id)
        owners[id] = nil
    }
    func centralManager(_ c: CBCentralManager, didDisconnectPeripheral p: CBPeripheral, error: Error?) {
        let id = p.identifier.uuidString
        owners[id]?.send(["ev": "gone", "id": id])
        owners[id] = nil; writes[id] = nil
        onChange()
    }

    // ----- CBPeripheralDelegate -----
    func peripheral(_ p: CBPeripheral, didDiscoverServices error: Error?) {
        let id = p.identifier.uuidString
        let services = p.services ?? []
        pendingServices[id] = services.count
        if services.isEmpty { sendConnected(p); return }
        for s in services { p.discoverCharacteristics(nil, for: s) }
    }
    func peripheral(_ p: CBPeripheral, didDiscoverCharacteristicsFor s: CBService, error: Error?) {
        let id = p.identifier.uuidString
        pendingServices[id] = (pendingServices[id] ?? 1) - 1
        if pendingServices[id] == 0 { sendConnected(p) }
    }
    func peripheral(_ p: CBPeripheral, didUpdateValueFor ch: CBCharacteristic, error: Error?) {
        guard let v = ch.value else { return }
        let id = p.identifier.uuidString
        owners[id]?.send(["ev": "value", "id": id, "char": fullUUID(ch.uuid), "data": toHex(v)])
    }
    func peripheral(_ p: CBPeripheral, didWriteValueFor ch: CBCharacteristic, error: Error?) {
        let id = p.identifier.uuidString
        guard var q = writes[id], !q.isEmpty else { return }
        let w = q.removeFirst(); writes[id] = q
        if let e = error { w.client.error(e.localizedDescription, id: id, seq: w.seq) }
        else { w.client.send(["ev": "written", "seq": w.seq]) }
    }
    func peripheral(_ p: CBPeripheral, didUpdateNotificationStateFor ch: CBCharacteristic, error: Error?) {
        if let e = error { owners[p.identifier.uuidString]?.error(e.localizedDescription, id: p.identifier.uuidString) }
    }
}

// CoreBluetooth shortens a 16-bit or 32-bit UUID; Web Bluetooth gives the 128-bit form.
func fullUUID(_ u: CBUUID) -> String {
    let s = u.uuidString.lowercased()
    if s.count == 4 { return "0000\(s)-0000-1000-8000-00805f9b34fb" }
    if s.count == 8 { return "\(s)-0000-1000-8000-00805f9b34fb" }
    return s
}
func toHex(_ d: Data) -> String { d.map { String(format: "%02x", $0) }.joined() }
func fromHex(_ s: String) -> Data? {
    let chars = Array(s)
    guard chars.count % 2 == 0 else { return nil }
    var out = Data(capacity: chars.count / 2)
    for i in stride(from: 0, to: chars.count, by: 2) {
        guard let b = UInt8(String(chars[i...i + 1]), radix: 16) else { return nil }
        out.append(b)
    }
    return out
}
