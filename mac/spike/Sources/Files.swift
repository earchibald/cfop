import Foundation
import Network
import WebKit

// The two ways the spike serves the same folder: a WKURLSchemeHandler for twistwright://app/, and a
// loopback HTTP server on a port the system picks. Both read the files with lookup().

enum Lookup { case file(URL), folder(String), missing }

// What a path asks for under the root: a file, a folder without its slash, or nothing. Only files
// inside the root pass: the root's path with its slash, so a sibling folder does not.
func lookup(_ root: URL, _ path: String) -> Lookup {
    let top = root.standardizedFileURL.path
    func inside(_ u: URL) -> Bool { u.path == top || u.path.hasPrefix(top + "/") }
    var p = path.isEmpty ? "/" : path
    var dir: ObjCBool = false
    let asked = root.appendingPathComponent(p).standardizedFileURL
    if !p.hasSuffix("/"), inside(asked),
       FileManager.default.fileExists(atPath: asked.path, isDirectory: &dir), dir.boolValue {
        return .folder(p + "/")
    }
    if p.hasSuffix("/") { p += "index.html" }
    let url = root.appendingPathComponent(p).standardizedFileURL
    guard inside(url), FileManager.default.fileExists(atPath: url.path, isDirectory: &dir), !dir.boolValue else { return .missing }
    return .file(url)
}

func mime(_ ext: String) -> String {
    switch ext.lowercased() {
    case "html": return "text/html; charset=utf-8"
    case "css": return "text/css; charset=utf-8"
    case "js", "mjs": return "text/javascript; charset=utf-8"
    case "json", "webmanifest": return "application/json"
    case "svg": return "image/svg+xml"
    case "png": return "image/png"
    case "jpg", "jpeg": return "image/jpeg"
    case "ico": return "image/x-icon"
    case "woff2": return "font/woff2"
    case "wasm": return "application/wasm"
    case "md", "txt": return "text/plain; charset=utf-8"
    default: return "application/octet-stream"
    }
}

// twistwright://app/<path>. A scheme handler cannot redirect, so a folder without its slash is a
// 404 that says so: the menu always opens folders with the slash.
final class SchemeHandler: NSObject, WKURLSchemeHandler {
    let root: URL
    init(root: URL) { self.root = root }

    func webView(_ w: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { task.didFailWithError(URLError(.badURL)); return }
        let path = URLComponents(url: url, resolvingAgainstBaseURL: false)?.path ?? "/"
        var status = 200, type = "text/plain; charset=utf-8", body = Data()
        switch lookup(root, path) {
        case .file(let f):
            if let d = try? Data(contentsOf: f) { body = d; type = mime(f.pathExtension) }
            else { status = 500; body = Data("cannot read the file".utf8) }
        case .folder(let to): status = 404; body = Data("This is a folder. Open \(to) with its slash.".utf8)
        case .missing: status = 404; body = Data("not found".utf8)
        }
        let head = ["Content-Type": type, "Content-Length": String(body.count), "Cache-Control": "no-cache"]
        task.didReceive(HTTPURLResponse(url: url, statusCode: status, httpVersion: "HTTP/1.1", headerFields: head)!)
        task.didReceive(body)
        task.didFinish()
    }
    func webView(_ w: WKWebView, stop task: WKURLSchemeTask) {}
}

// http://127.0.0.1:<port>/, the port picked by the system at start, so no fixed port can clash.
// The fallback the concept names if the custom scheme fails a test.
final class LoopbackServer {
    let root: URL
    var listener: NWListener?
    private(set) var port: UInt16?
    private var waiting: [() -> Void] = []

    init(root: URL) { self.root = root }

    // Run f once the port is known.
    func whenReady(_ f: @escaping () -> Void) { if port != nil { f() } else { waiting.append(f) } }

    func start() {
        let params = NWParameters.tcp
        params.requiredLocalEndpoint = .hostPort(host: "127.0.0.1", port: .any)
        guard let l = try? NWListener(using: params) else { print("Spike: cannot start the loopback server"); return }
        l.newConnectionHandler = { [weak self] c in self?.serve(c) }
        l.stateUpdateHandler = { [weak self] st in
            guard let self = self else { return }
            switch st {
            case .ready:
                self.port = l.port?.rawValue
                print("Spike: loopback server on http://127.0.0.1:\(self.port ?? 0)/")
                let w = self.waiting; self.waiting = []; w.forEach { $0() }
            case .failed(let e): print("Spike: loopback server failed: \(e)")
            default: break
            }
        }
        l.start(queue: .main)
        listener = l
    }

    func serve(_ c: NWConnection) {
        c.start(queue: .main)
        var buf = Data()
        func readMore() {
            c.receive(minimumIncompleteLength: 1, maximumLength: 65536) { [weak self] d, _, done, err in
                guard let self = self else { return }
                if let d = d { buf.append(d) }
                if let r = buf.range(of: Data("\r\n\r\n".utf8)) {
                    self.handle(String(decoding: buf[..<r.lowerBound], as: UTF8.self), c)
                } else if done || err != nil || buf.count > 65536 { c.cancel() }
                else { readMore() }
            }
        }
        readMore()
    }

    func handle(_ head: String, _ c: NWConnection) {
        let parts = head.split(separator: "\r\n").first?.split(separator: " ") ?? []
        guard parts.count >= 2, parts[0] == "GET" || parts[0] == "HEAD" else {
            respond(c, 405, "text/plain", Data("method not allowed".utf8)); return
        }
        let target = String(parts[1])
        let q = target.firstIndex(of: "?")
        let raw = q.map { String(target[..<$0]) } ?? target
        let path = raw.removingPercentEncoding ?? raw
        switch lookup(root, path) {
        case .file(let f):
            if let d = try? Data(contentsOf: f) { respond(c, 200, mime(f.pathExtension), d) }
            else { respond(c, 500, "text/plain", Data("cannot read the file".utf8)) }
        case .folder(let to):
            respond(c, 301, "text/plain", Data(), ["Location": to + (q.map { String(target[$0...]) } ?? "")])
        case .missing:
            respond(c, 404, "text/plain", Data("not found".utf8))
        }
    }

    func respond(_ c: NWConnection, _ status: Int, _ type: String, _ body: Data, _ extra: [String: String] = [:]) {
        let reason = status == 200 ? "OK" : status == 301 ? "Moved Permanently" : "Error"
        var head = "HTTP/1.1 \(status) \(reason)\r\nContent-Type: \(type)\r\nContent-Length: \(body.count)\r\nCache-Control: no-cache\r\nConnection: close\r\n"
        for (k, v) in extra { head += "\(k): \(v)\r\n" }
        head += "\r\n"
        var out = Data(head.utf8); out.append(body)
        c.send(content: out, contentContext: .finalMessage, isComplete: true, completion: .contentProcessed { _ in c.cancel() })
    }
}
