import Foundation
import Network

// Where the pages come from. builtin: the copy of the site that mac/build.sh builds into the app, at
// a tagged commit; it needs no internet connection. live: twistwright.com through a proxy, so a new
// deploy shows at once; with no connection the proxy gives the built-in page instead.
enum SiteSource: String { case builtin, live }

// Serves the Twistwright page on 127.0.0.1. The page then has an http://127.0.0.1 origin, which
// is a secure context and which Safari lets talk to a WebSocket on 127.0.0.1. Both sources share
// the one origin, so the history in localStorage is the same whichever one is in use. A folder
// given with --root (a checkout, for work on the site itself) wins over both.
// /bridge/info tells the page that the app is here and where the bridge listens.
final class SiteServer {
    let port: UInt16
    let root: URL?
    let builtin: URL?
    var source: SiteSource = .builtin
    var listener: NWListener?
    // No cache: the site sends max-age=600, and a cached page would show an old version of the
    // site for ten minutes after a deploy. twistwright.com's own edge cache is cleared on deploy.
    let session: URLSession = {
        let c = URLSessionConfiguration.ephemeral
        c.urlCache = nil
        c.requestCachePolicy = .reloadIgnoringLocalCacheData
        c.timeoutIntervalForRequest = 10
        return URLSession(configuration: c)
    }()

    init(port: UInt16, root: URL?, builtin: URL?) { self.port = port; self.root = root; self.builtin = builtin }

    // The source in use: the built-in site only when the app has one.
    var serving: SiteSource { source == .builtin && builtin != nil ? .builtin : .live }

    func start() {
        let params = NWParameters.tcp
        params.requiredLocalEndpoint = .hostPort(host: "127.0.0.1", port: NWEndpoint.Port(rawValue: port)!)
        params.allowLocalEndpointReuse = true
        guard let l = try? NWListener(using: params) else { NSLog("Site: cannot listen on \(port)"); return }
        l.newConnectionHandler = { [weak self] c in self?.serve(c) }
        l.stateUpdateHandler = { st in if case .failed(let e) = st { NSLog("Site: \(e)") } }
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
        if target.hasPrefix("/bridge/info") {
            var info: [String: Any] = ["app": "Twistwright", "version": appVersion, "ws": "ws://127.0.0.1:\(WS_PORT)/"]
            info["site"] = root != nil ? "root" : serving.rawValue
            if root == nil, let v = BUILTIN_INFO["version"] { info["builtin"] = v }
            respond(c, 200, "application/json", try! JSONSerialization.data(withJSONObject: info))
            return
        }
        if let root = root { serveFile(root, target, c) }
        else if serving == .builtin, let b = builtin { serveFile(b, target, c) }
        else { proxy(target, c) }
    }

    func serveFile(_ root: URL, _ target: String, _ c: NWConnection) {
        let q = target.firstIndex(of: "?")
        let path = q.map { String(target[..<$0]) } ?? target
        var p = path.removingPercentEncoding ?? path
        // Only files inside the folder: the folder's path with its slash, so a sibling such as
        // site.json beside site/ does not pass.
        let top = root.standardizedFileURL.path
        func inside(_ u: URL) -> Bool { u.path == top || u.path.hasPrefix(top + "/") }
        // A folder without its slash goes to the folder with one, as GitHub Pages does, so that
        // the page's relative links resolve: /lab to /lab/.
        var dir: ObjCBool = false
        let asked = root.appendingPathComponent(p).standardizedFileURL
        if !p.hasSuffix("/"), inside(asked),
           FileManager.default.fileExists(atPath: asked.path, isDirectory: &dir), dir.boolValue {
            let to = path + "/" + (q.map { String(target[$0...]) } ?? "")
            respond(c, 301, "text/plain", Data(), ["Location": to]); return
        }
        if p.hasSuffix("/") { p += "index.html" }
        let url = root.appendingPathComponent(p).standardizedFileURL
        guard inside(url), let d = try? Data(contentsOf: url) else {
            respond(c, 404, "text/plain", Data("not found".utf8)); return
        }
        respond(c, 200, mime(url.pathExtension), d)
    }

    func proxy(_ target: String, _ c: NWConnection) {
        guard let url = URL(string: target, relativeTo: SITE) else { respond(c, 400, "text/plain", Data("bad path".utf8)); return }
        session.dataTask(with: url) { [weak self] d, r, _ in
            DispatchQueue.main.async {
                guard let self = self else { return }
                guard let r = r as? HTTPURLResponse, let d = d else {
                    // No answer from twistwright.com: the built-in page, so the app works offline.
                    if let b = self.builtin { self.serveFile(b, target, c) }
                    else { self.respond(c, 502, "text/html; charset=utf-8", Data(OFFLINE_PAGE.utf8)) }
                    return
                }
                self.respond(c, r.statusCode, r.value(forHTTPHeaderField: "Content-Type") ?? "application/octet-stream", d)
            }
        }.resume()
    }

    func respond(_ c: NWConnection, _ status: Int, _ type: String, _ body: Data, _ extra: [String: String] = [:]) {
        let reason = status == 200 ? "OK" : status == 301 ? "Moved Permanently" : "Error"
        var head = "HTTP/1.1 \(status) \(reason)\r\nContent-Type: \(type)\r\nContent-Length: \(body.count)\r\nCache-Control: no-cache\r\nConnection: close\r\n"
        for (k, v) in extra { head += "\(k): \(v)\r\n" }
        head += "\r\n"
        var out = Data(head.utf8); out.append(body)
        c.send(content: out, contentContext: .finalMessage, isComplete: true, completion: .contentProcessed { _ in c.cancel() })
    }

    func mime(_ ext: String) -> String {
        switch ext.lowercased() {
        case "html": return "text/html; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "js": return "text/javascript; charset=utf-8"
        case "json", "webmanifest": return "application/json"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "ico": return "image/x-icon"
        case "woff2": return "font/woff2"
        case "md", "txt": return "text/plain; charset=utf-8"
        default: return "application/octet-stream"
        }
    }
}

let OFFLINE_PAGE = """
<!doctype html><meta charset="utf-8"><title>Twistwright</title>
<body style="font-family:system-ui;max-width:32em;margin:4em auto;line-height:1.5">
<h1>Twistwright</h1><p>The app is running and the smart cube bridge is ready, but the page did not load from twistwright.com. Check the internet connection, then reload.</p>
"""
