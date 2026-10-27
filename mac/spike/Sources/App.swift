import AppKit
import WebKit

let SPIKE_VERSION = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "dev"
// The folder the window shows: the site from the checkout at the root, the probe page at /spike/.
// mac/spike/build.sh copies both in.
let ROOT: URL = Bundle.main.resourceURL!.appendingPathComponent("root")
let SCHEME = "twistwright"

enum Origin: String { case scheme, loopback }

// The reports the probe page sends, one file per origin.
let REPORT_DIR: URL = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
    .appendingPathComponent("TwistwrightSpike")

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate,
                         WKDownloadDelegate, WKScriptMessageHandlerWithReply {
    var window: NSWindow!
    var web: WKWebView!
    var loopback: LoopbackServer!
    var origin: Origin = .scheme
    // The number of this launch, counted in UserDefaults. The probe compares it with what the page
    // stored to tell whether storage outlives a quit.
    var launch = 0
    var reports: [String: Any] = [:]
    var downloads: [ObjectIdentifier: String] = [:]
    var titleWatch: NSKeyValueObservation?
    let schemeItem = NSMenuItem(title: "Custom scheme: twistwright://app/", action: nil, keyEquivalent: "")
    let loopbackItem = NSMenuItem(title: "Loopback: http://127.0.0.1, random port", action: nil, keyEquivalent: "")

    func applicationDidFinishLaunching(_ n: Notification) {
        var path = "/spike/"
        origin = Origin(rawValue: UserDefaults.standard.string(forKey: "origin") ?? "") ?? .scheme
        var args = CommandLine.arguments.dropFirst()
        while let a = args.popFirst() {
            switch a {
            case "--origin": if let o = args.popFirst().flatMap({ Origin(rawValue: $0) }) { origin = o }
            case "--path": if let p = args.popFirst() { path = p }
            default: break
            }
        }
        launch = UserDefaults.standard.integer(forKey: "launches") + 1
        UserDefaults.standard.set(launch, forKey: "launches")
        print("Spike: launch \(launch), origin \(origin.rawValue), files in \(ROOT.path)")
        loopback = LoopbackServer(root: ROOT)
        loopback.start()
        makeMenu()
        makeWindow()
        load(path)
        NSApp.activate(ignoringOtherApps: true)
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ a: NSApplication) -> Bool { true }

    // ----- The window -----

    func makeWindow() {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(SchemeHandler(root: ROOT), forURLScheme: SCHEME)
        config.userContentController.addScriptMessageHandler(self, contentWorld: .page, name: "spike")
        // The page can tell it runs in the app. The real app would hide the Mac app download.
        config.applicationNameForUserAgent = "TwistwrightSpike/\(SPIKE_VERSION)"
        config.mediaTypesRequiringUserActionForPlayback = []
        web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = self
        web.uiDelegate = self
        if #available(macOS 13.3, *) { web.isInspectable = true }
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1280, height: 860),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.isReleasedWhenClosed = false
        window.contentView = web
        window.center()
        window.setFrameAutosaveName("SpikeMain")
        window.makeKeyAndOrderFront(nil)
        titleWatch = web.observe(\.title, options: [.initial, .new]) { [weak self] _, _ in self?.refreshTitle() }
    }
    func refreshTitle() {
        let t = web.title ?? ""
        window.title = (t.isEmpty ? "Twistwright Spike" : t) + " · " + (origin == .scheme ? "custom scheme" : "loopback")
    }

    func base(_ o: Origin) -> String? {
        switch o {
        case .scheme: return "\(SCHEME)://app"
        case .loopback: return loopback.port.map { "http://127.0.0.1:\($0)" }
        }
    }
    // Load a path at the origin in use. The loopback port is known only once the server is ready.
    func load(_ path: String) {
        guard let b = base(origin) else { loopback.whenReady { [weak self] in self?.load(path) }; return }
        web.load(URLRequest(url: URL(string: b + path)!))
        refreshMenu(); refreshTitle()
    }
    // The path and query of the page shown, with the folder's slash kept (URL.path drops it).
    var shownPath: String {
        guard let u = web.url, let c = URLComponents(url: u, resolvingAgainstBaseURL: false) else { return "/spike/" }
        return (c.percentEncodedPath.isEmpty ? "/" : c.percentEncodedPath) + (c.percentEncodedQuery.map { "?" + $0 } ?? "")
    }

    // ----- Menus -----

    func makeMenu() {
        let main = NSMenu()
        func sub(_ title: String, _ items: [NSMenuItem]) {
            let top = NSMenuItem(title: title, action: nil, keyEquivalent: "")
            let m = NSMenu(title: title); m.autoenablesItems = true
            items.forEach { m.addItem($0) }
            top.submenu = m; main.addItem(top)
        }
        func item(_ t: String, _ a: Selector?, _ k: String, _ mods: NSEvent.ModifierFlags = .command, mine: Bool = false) -> NSMenuItem {
            let i = NSMenuItem(title: t, action: a, keyEquivalent: k)
            i.keyEquivalentModifierMask = mods
            if mine { i.target = self }
            return i
        }
        sub("Twistwright Spike", [
            item("About Twistwright Spike", #selector(NSApplication.orderFrontStandardAboutPanel(_:)), ""),
            .separator(),
            item("Hide Twistwright Spike", #selector(NSApplication.hide(_:)), "h"),
            item("Quit Twistwright Spike", #selector(NSApplication.terminate(_:)), "q")])
        // Without these items Cmd+C, Cmd+V and Cmd+A never reach the page.
        sub("Edit", [
            item("Undo", Selector(("undo:")), "z"),
            item("Redo", Selector(("redo:")), "z", [.command, .shift]),
            .separator(),
            item("Cut", #selector(NSText.cut(_:)), "x"),
            item("Copy", #selector(NSText.copy(_:)), "c"),
            item("Paste", #selector(NSText.paste(_:)), "v"),
            item("Select All", #selector(NSText.selectAll(_:)), "a")])
        sub("View", [
            item("Reload", #selector(reloadPage(_:)), "r", mine: true),
            item("Back", #selector(goBack(_:)), "[", mine: true),
            item("Forward", #selector(goForward(_:)), "]", mine: true)])
        schemeItem.action = #selector(pickOrigin(_:)); schemeItem.target = self
        loopbackItem.action = #selector(pickOrigin(_:)); loopbackItem.target = self
        let head = NSMenuItem(title: "Origin", action: nil, keyEquivalent: ""); head.isEnabled = false
        sub("Spike", [
            item("Open the probe", #selector(openProbe(_:)), "1", mine: true),
            item("Open the site", #selector(openSite(_:)), "2", mine: true),
            item("Open the lab", #selector(openLab(_:)), "3", mine: true),
            .separator(), head, schemeItem, loopbackItem,
            .separator(),
            item("Copy the reports", #selector(copyReports(_:)), "c", [.command, .shift], mine: true),
            item("Show the reports in Finder", #selector(showReports(_:)), "", mine: true),
            item("Clear website data and reload", #selector(clearData(_:)), "", mine: true)])
        sub("Window", [
            item("Minimize", #selector(NSWindow.performMiniaturize(_:)), "m"),
            item("Close", #selector(NSWindow.performClose(_:)), "w")])
        NSApp.mainMenu = main
    }
    func refreshMenu() {
        schemeItem.state = origin == .scheme ? .on : .off
        loopbackItem.state = origin == .loopback ? .on : .off
    }

    @objc func reloadPage(_ s: Any?) { web.reload() }
    @objc func goBack(_ s: Any?) { web.goBack() }
    @objc func goForward(_ s: Any?) { web.goForward() }
    @objc func openProbe(_ s: Any?) { load("/spike/") }
    @objc func openSite(_ s: Any?) { load("/") }
    @objc func openLab(_ s: Any?) { load("/lab/") }
    // The page shown, again at the other origin. Each origin keeps its own storage.
    @objc func pickOrigin(_ s: NSMenuItem) {
        let path = shownPath
        origin = s === loopbackItem ? .loopback : .scheme
        UserDefaults.standard.set(origin.rawValue, forKey: "origin")
        load(path)
    }
    @objc func copyReports(_ s: Any?) {
        guard let d = try? JSONSerialization.data(withJSONObject: reportsForCopy(), options: [.prettyPrinted, .sortedKeys]) else { return }
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(String(decoding: d, as: UTF8.self), forType: .string)
    }
    @objc func showReports(_ s: Any?) {
        try? FileManager.default.createDirectory(at: REPORT_DIR, withIntermediateDirectories: true)
        NSWorkspace.shared.open(REPORT_DIR)
    }
    @objc func clearData(_ s: Any?) {
        WKWebsiteDataStore.default().removeData(ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(), modifiedSince: .distantPast) { [weak self] in
            self?.web.reload()
        }
    }

    // ----- Reports -----

    // The reports of this launch, and those of earlier launches from their files.
    func reportsForCopy() -> [String: Any] {
        var all = reports
        for o in ["scheme", "loopback"] where all[o] == nil {
            if let d = try? Data(contentsOf: REPORT_DIR.appendingPathComponent("report-\(o).json")),
               let j = try? JSONSerialization.jsonObject(with: d) { all[o] = j }
        }
        return all
    }
    func save(report r: Any) {
        reports[origin.rawValue] = r
        guard let d = try? JSONSerialization.data(withJSONObject: r, options: [.prettyPrinted, .sortedKeys]) else { return }
        try? FileManager.default.createDirectory(at: REPORT_DIR, withIntermediateDirectories: true)
        try? d.write(to: REPORT_DIR.appendingPathComponent("report-\(origin.rawValue).json"))
    }

    // ----- The page and the app: the shape of the in-process bridge -----

    // Page to app: webkit.messageHandlers.spike.postMessage({op, ...}) resolves with the reply.
    func userContentController(_ uc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        guard let m = message.body as? [String: Any], let op = m["op"] as? String else {
            replyHandler(nil, "The message has no op."); return
        }
        switch op {
        case "info":
            let info: [String: Any] = ["launch": launch, "origin": origin.rawValue, "version": SPIKE_VERSION,
                                       "macos": ProcessInfo.processInfo.operatingSystemVersionString, "reports": REPORT_DIR.path]
            replyHandler(info, nil)
        case "echo":
            var r = m; r["native"] = Date().timeIntervalSince1970 * 1000
            replyHandler(r, nil)
        case "burst":
            // n events, one callAsyncJavaScript each, as the bridge would send cube values.
            let n = (m["n"] as? Int) ?? 100
            for i in 0..<n { push(["ev": "tick", "i": i]) }
            replyHandler(["sent": n], nil)
        case "report":
            if let r = m["report"] { save(report: r) }
            replyHandler(true, nil)
        default:
            replyHandler(nil, "Unknown op \(op).")
        }
    }
    // App to page: window.spikeEvent(m), if the page has one.
    func push(_ m: [String: Any]) {
        web.callAsyncJavaScript("if (window.spikeEvent) window.spikeEvent(m);", arguments: ["m": m], in: nil, in: .page, completionHandler: nil)
    }

    // ----- Navigation: links out and downloads -----

    func isLocal(_ u: URL) -> Bool {
        switch u.scheme ?? "" {
        case SCHEME, "blob", "data", "about": return true
        case "http", "https": return ["127.0.0.1", "localhost"].contains(u.host ?? "")
        default: return false
        }
    }
    // Any other address goes to the default browser. The page hears of it, so the probe can check.
    func openOutside(_ u: URL) {
        NSWorkspace.shared.open(u)
        push(["ev": "external", "url": u.absoluteString])
    }

    func webView(_ w: WKWebView, decidePolicyFor a: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if a.shouldPerformDownload { decisionHandler(.download); return }
        if let u = a.request.url, !isLocal(u) { openOutside(u); decisionHandler(.cancel); return }
        decisionHandler(.allow)
    }
    func webView(_ w: WKWebView, decidePolicyFor r: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        decisionHandler(r.canShowMIMEType ? .allow : .download)
    }
    func webView(_ w: WKWebView, navigationAction a: WKNavigationAction, didBecome d: WKDownload) { d.delegate = self }
    func webView(_ w: WKWebView, navigationResponse r: WKNavigationResponse, didBecome d: WKDownload) { d.delegate = self }
    func webView(_ w: WKWebView, didFailProvisionalNavigation n: WKNavigation!, withError e: Error) {
        print("Spike: the page did not load: \(e.localizedDescription)")
    }
    func webViewWebContentProcessDidTerminate(_ w: WKWebView) {
        print("Spike: the web content process stopped; reloading")
        w.reload()
    }

    func download(_ d: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename name: String,
                  completionHandler: @escaping (URL?) -> Void) {
        downloads[ObjectIdentifier(d)] = name
        let p = NSSavePanel()
        p.nameFieldStringValue = name
        p.beginSheetModal(for: window) { r in
            // WKDownload does not write over a file. The save panel already asked to replace it.
            if r == .OK, let u = p.url { try? FileManager.default.removeItem(at: u); completionHandler(u) }
            else { completionHandler(nil) }
        }
    }
    func downloadDidFinish(_ d: WKDownload) {
        push(["ev": "download", "state": "finished", "file": downloads.removeValue(forKey: ObjectIdentifier(d)) ?? ""])
    }
    func download(_ d: WKDownload, didFailWithError e: Error, resumeData: Data?) {
        push(["ev": "download", "state": "failed", "file": downloads.removeValue(forKey: ObjectIdentifier(d)) ?? "",
              "error": e.localizedDescription])
    }

    // ----- UI: new windows, dialogs, files, camera and microphone -----

    func webView(_ w: WKWebView, createWebViewWith c: WKWebViewConfiguration, for a: WKNavigationAction,
                 windowFeatures f: WKWindowFeatures) -> WKWebView? {
        if let u = a.request.url { if isLocal(u) { w.load(a.request) } else { openOutside(u) } }
        return nil
    }
    func webView(_ w: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame f: WKFrameInfo,
                 completionHandler: @escaping () -> Void) {
        let a = NSAlert(); a.messageText = message; a.addButton(withTitle: "OK")
        a.runModal(); completionHandler()
    }
    func webView(_ w: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame f: WKFrameInfo,
                 completionHandler: @escaping (Bool) -> Void) {
        let a = NSAlert(); a.messageText = message
        a.addButton(withTitle: "OK"); a.addButton(withTitle: "Cancel")
        completionHandler(a.runModal() == .alertFirstButtonReturn)
    }
    func webView(_ w: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?,
                 initiatedByFrame f: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let a = NSAlert(); a.messageText = prompt
        a.addButton(withTitle: "OK"); a.addButton(withTitle: "Cancel")
        let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 280, height: 24))
        field.stringValue = defaultText ?? ""
        a.accessoryView = field
        completionHandler(a.runModal() == .alertFirstButtonReturn ? field.stringValue : nil)
    }
    func webView(_ w: WKWebView, runOpenPanelWith p: WKOpenPanelParameters, initiatedByFrame f: WKFrameInfo,
                 completionHandler: @escaping ([URL]?) -> Void) {
        let o = NSOpenPanel()
        o.allowsMultipleSelection = p.allowsMultipleSelection
        o.canChooseDirectories = p.allowsDirectories
        o.canChooseFiles = true
        o.beginSheetModal(for: window) { r in completionHandler(r == .OK ? o.urls : nil) }
    }
    // macOS asks the user once for the app (the usage strings in Info.plist). The page then gets
    // the device with no second prompt.
    func webView(_ w: WKWebView, requestMediaCapturePermissionFor o: WKSecurityOrigin, initiatedByFrame f: WKFrameInfo,
                 type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        print("Spike: media capture (type \(type.rawValue)) for \(o.protocol)://\(o.host)")
        decisionHandler(.grant)
    }
}
