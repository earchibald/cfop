import Foundation
import Network
import WebKit

// Where the pages come from. builtin: the copy of the site that mac/build.sh builds into the app, at
// a tagged commit; it needs no internet connection. live: twistwright.com through a proxy, so a new
// deploy shows at once; with no connection the proxy gives the built-in page instead.
enum SiteSource: String { case builtin, live }

// One answer to a request for a file of the site.
struct SiteReply {
    var status: Int
    var type: String
    var body: Data
    var location: String? = nil
}

// The files of the site, for both ways the app shows them: the window (SchemeHandler, at
// twistwright://app/) and Safari (SiteServer, at http://127.0.0.1:27272/). A folder given with
// --root (a checkout, for work on the site itself) wins over both sources.
final class Site {
    let root: URL?
    let builtin: URL?
    var source: SiteSource = .builtin
    // No cache: the site sends max-age=600, and a cached page would show an old version of the
    // site for ten minutes after a deploy. twistwright.com's own edge cache is cleared on deploy.
    let session: URLSession = {
        let c = URLSessionConfiguration.ephemeral
        c.urlCache = nil
        c.requestCachePolicy = .reloadIgnoringLocalCacheData
        c.timeoutIntervalForRequest = 10
        return URLSession(configuration: c)
    }()

    init(root: URL?, builtin: URL?) { self.root = root; self.builtin = builtin }

    // The source in use: the built-in site only when the app has one.
    var serving: SiteSource { source == .builtin && builtin != nil ? .builtin : .live }
    // What /bridge/info and the menus call the pages: root, builtin or live.
    var name: String { root != nil ? "root" : serving.rawValue }

    // target is the path with its query. done runs on the main queue.
    func get(_ target: String, _ done: @escaping (SiteReply) -> Void) {
        if let root = root { done(file(root, target)) }
        else if serving == .builtin, let b = builtin { done(file(b, target)) }
        else { proxy(target, done) }
    }

    func file(_ root: URL, _ target: String) -> SiteReply {
        let q = target.firstIndex(of: "?")
        let path = q.map { String(target[..<$0]) } ?? target
        var p = path.removingPercentEncoding ?? path
        if p.isEmpty { p = "/" }
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
            return SiteReply(status: 301, type: "text/plain", body: Data(), location: path + "/" + (q.map { String(target[$0...]) } ?? ""))
        }
        if p.hasSuffix("/") { p += "index.html" }
        let url = root.appendingPathComponent(p).standardizedFileURL
        guard inside(url), let d = try? Data(contentsOf: url) else {
            return SiteReply(status: 404, type: "text/plain", body: Data("not found".utf8))
        }
        return SiteReply(status: 200, type: mime(url.pathExtension), body: d)
    }

    func proxy(_ target: String, _ done: @escaping (SiteReply) -> Void) {
        guard let url = URL(string: target, relativeTo: SITE) else { done(SiteReply(status: 400, type: "text/plain", body: Data("bad path".utf8))); return }
        session.dataTask(with: url) { [weak self] d, r, _ in
            DispatchQueue.main.async {
                guard let self = self else { return }
                guard let r = r as? HTTPURLResponse, let d = d else {
                    // No answer from twistwright.com: the built-in page, so the app works offline.
                    if let b = self.builtin { done(self.file(b, target)) }
                    else { done(SiteReply(status: 502, type: "text/html; charset=utf-8", body: Data(OFFLINE_PAGE.utf8))) }
                    return
                }
                done(SiteReply(status: r.statusCode, type: r.value(forHTTPHeaderField: "Content-Type") ?? "application/octet-stream", body: d))
            }
        }.resume()
    }
}

// The window's pages at twistwright://app/<path>. The origin twistwright://app is a secure
// context, keeps its storage across launches and runs module workers (the spike in mac/spike/
// showed each). A scheme handler cannot redirect, so a folder without its slash gets a small page
// that goes to the folder with one.
let SCHEME = "twistwright"
let APP_ORIGIN = "\(SCHEME)://app"

final class SchemeHandler: NSObject, WKURLSchemeHandler {
    let site: Site
    // A task that WebKit stopped must not be answered: the live pages answer late.
    private var stopped = Set<ObjectIdentifier>()
    init(site: Site) { self.site = site }

    func webView(_ w: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, let c = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            task.didFailWithError(URLError(.badURL)); return
        }
        let target = (c.percentEncodedPath.isEmpty ? "/" : c.percentEncodedPath) + (c.percentEncodedQuery.map { "?" + $0 } ?? "")
        let key = ObjectIdentifier(task)
        site.get(target) { [weak self] r in
            guard let self = self, self.stopped.remove(key) == nil else { return }
            var r = r
            if let to = r.location {
                let js = String(data: try! JSONSerialization.data(withJSONObject: [to], options: []), encoding: .utf8)!
                r = SiteReply(status: 200, type: "text/html; charset=utf-8",
                              body: Data("<!doctype html><script>location.replace(\(js)[0]+location.hash)</script>".utf8))
            }
            let head = ["Content-Type": r.type, "Content-Length": String(r.body.count), "Cache-Control": "no-cache"]
            task.didReceive(HTTPURLResponse(url: url, statusCode: r.status, httpVersion: "HTTP/1.1", headerFields: head)!)
            task.didReceive(r.body)
            task.didFinish()
        }
    }
    func webView(_ w: WKWebView, stop task: WKURLSchemeTask) { stopped.insert(ObjectIdentifier(task)) }
}

// Serves the Twistwright page on 127.0.0.1 for Safari. The page then has an http://127.0.0.1
// origin, which is a secure context and which Safari lets talk to a WebSocket on 127.0.0.1. Both
// sources share the one origin, so the history in localStorage is the same whichever one is in
// use. /bridge/info tells the page that the app is here and where the bridge listens. It stays
// for the release that moves a Safari user's history into the window; the clean release removes it.
final class SiteServer {
    let port: UInt16
    let site: Site
    var listener: NWListener?

    init(port: UInt16, site: Site) { self.port = port; self.site = site }

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
            respond(c, SiteReply(status: 405, type: "text/plain", body: Data("method not allowed".utf8))); return
        }
        let target = String(parts[1])
        if target.hasPrefix("/bridge/info") {
            var info: [String: Any] = ["app": "Twistwright", "version": appVersion, "ws": "ws://127.0.0.1:\(WS_PORT)/"]
            info["site"] = site.name
            if site.root == nil, let v = BUILTIN_INFO["version"] { info["builtin"] = v }
            respond(c, SiteReply(status: 200, type: "application/json", body: try! JSONSerialization.data(withJSONObject: info)))
            return
        }
        site.get(target) { [weak self] r in self?.respond(c, r) }
    }

    func respond(_ c: NWConnection, _ r: SiteReply) {
        let reason = r.status == 200 ? "OK" : r.status == 301 ? "Moved Permanently" : "Error"
        var head = "HTTP/1.1 \(r.status) \(reason)\r\nContent-Type: \(r.type)\r\nContent-Length: \(r.body.count)\r\nCache-Control: no-cache\r\nConnection: close\r\n"
        if let to = r.location { head += "Location: \(to)\r\n" }
        head += "\r\n"
        var out = Data(head.utf8); out.append(r.body)
        c.send(content: out, contentContext: .finalMessage, isComplete: true, completion: .contentProcessed { _ in c.cancel() })
    }
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

let OFFLINE_PAGE = """
<!doctype html><meta charset="utf-8"><title>Twistwright</title>
<body style="font-family:system-ui;max-width:32em;margin:4em auto;line-height:1.5">
<h1>Twistwright</h1><p>The app is running and the smart cube bridge is ready, but the page did not load from twistwright.com. Check the internet connection, then reload.</p>
"""
