import AppKit
import WebKit

// The page in the app's own window, as a client of the bridge. The page posts its messages to
// webkit.messageHandlers.bridge (PageWindow takes them); the app calls window.bridgeEvent(m) for
// each message back. See js/bridge.js, bridgeNativeConnect.
final class PageClient: BridgeClient {
    weak var web: WKWebView?
    init(_ w: WKWebView) { web = w }
    func send(_ obj: [String: Any]) {
        web?.callAsyncJavaScript("if (window.bridgeEvent) window.bridgeEvent(m);", arguments: ["m": obj],
                                 in: nil, in: .page, completionHandler: nil)
    }
}

// WebKit keeps its message handlers. This one holds the window weakly, so the two do not keep
// each other alive.
final class WeakHandler: NSObject, WKScriptMessageHandlerWithReply {
    weak var target: WKScriptMessageHandlerWithReply?
    init(_ t: WKScriptMessageHandlerWithReply) { target = t }
    func userContentController(_ uc: WKUserContentController, didReceive m: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        if let t = target { t.userContentController(uc, didReceive: m, replyHandler: replyHandler) }
        else { replyHandler(nil, "The window is gone.") }
    }
}

// One window with one page of the site, at twistwright://app/. The app has two: the site and the
// lab. Both pages share the one origin, so they share the saved history.
final class PageWindow: NSObject, NSWindowDelegate, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate,
                        WKScriptMessageHandlerWithReply {
    let home: String
    let bridge: Bridge
    let window: NSWindow
    let web: WKWebView
    var client: PageClient!
    // Links to twistwright:// other than the pages themselves: the app handles them.
    var onAppLink: ((URL) -> Void)?
    // What waits for the page to finish its load: the move of the history writes into it.
    private var whenLoaded: [() -> Void] = []
    private var titleWatch: NSKeyValueObservation?

    init(home: String, title: String, autosave: String, site: Site, bridge: Bridge) {
        self.home = home
        self.bridge = bridge
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(SchemeHandler(site: site), forURLScheme: SCHEME)
        // The page can tell it runs in the app.
        config.applicationNameForUserAgent = "Twistwright/\(appVersion)"
        config.mediaTypesRequiringUserActionForPlayback = []
        web = WKWebView(frame: .zero, configuration: config)
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1280, height: 860),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        super.init()
        config.userContentController.addScriptMessageHandler(WeakHandler(self), contentWorld: .page, name: "bridge")
        client = PageClient(web)
        bridge.add(client)
        web.navigationDelegate = self
        web.uiDelegate = self
        // Safari's Web Inspector reaches the page: Develop > this Mac > Twistwright.
        if #available(macOS 13.3, *) { web.isInspectable = true }
        window.title = title
        window.isReleasedWhenClosed = false
        window.contentView = web
        window.delegate = self
        window.center()
        window.setFrameAutosaveName(autosave)
        window.tabbingMode = .disallowed
        titleWatch = web.observe(\.title, options: [.new]) { [weak self] w, _ in
            if let t = w.title, !t.isEmpty { self?.window.title = t }
        }
    }

    // True while the window shows a page of the site, not the blank page of a closed window.
    var hasPage: Bool { web.url?.scheme == SCHEME }

    func load(_ path: String) {
        web.load(URLRequest(url: URL(string: APP_ORIGIN + path)!))
    }
    // Bring the window to the front, with its page, loaded again if the window was closed.
    func show(_ path: String? = nil) {
        if let p = path { load(p) } else if !hasPage { load(home) }
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }
    // Run f once the page has loaded: at once if it has.
    func afterLoad(_ f: @escaping () -> Void) {
        if hasPage && !web.isLoading { f() } else { whenLoaded.append(f); if !hasPage { load(home) } }
    }

    // A closed window is a closed tab: the page stops, and its cubes and its scan with it.
    func windowWillClose(_ n: Notification) {
        web.load(URLRequest(url: URL(string: "about:blank")!))
    }

    // ----- The bridge -----

    // Page to app. hello is answered; the rest go to the bridge, which answers with bridgeEvent.
    func userContentController(_ uc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        guard let m = message.body as? [String: Any], let op = m["op"] as? String else {
            replyHandler(nil, "The message has no op."); return
        }
        // Only the site's own pages reach the bridge.
        guard message.frameInfo.securityOrigin.protocol == SCHEME else { replyHandler(nil, "Not a page of the app."); return }
        if op == "hello" {
            replyHandler(["version": appVersion, "bluetooth": bridge.stateName] as [String: Any], nil)
            return
        }
        replyHandler(nil, nil)
        if op == "migrate" { client.error("The window has no history to send."); return }
        bridge.handle(m, from: client)
    }

    // ----- Navigation: a new page, links out and downloads -----

    // A new page in the window drops the cubes of the page before it, as a closed tab does.
    func webView(_ w: WKWebView, didCommit n: WKNavigation!) {
        bridge.release(client)
    }
    func webView(_ w: WKWebView, didFinish n: WKNavigation!) {
        guard hasPage else { return }
        let f = whenLoaded; whenLoaded = []
        f.forEach { $0() }
    }

    func isPage(_ u: URL) -> Bool {
        switch u.scheme ?? "" {
        case SCHEME: return u.host == "app"
        case "blob", "data", "about": return true
        default: return false
        }
    }
    func webView(_ w: WKWebView, decidePolicyFor a: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if a.shouldPerformDownload { decisionHandler(.download); return }
        guard let u = a.request.url, !isPage(u) else { decisionHandler(.allow); return }
        // twistwright://smart and the like: as if macOS had opened the link. Any other address
        // goes to the default browser.
        if u.scheme == SCHEME { onAppLink?(u) } else { NSWorkspace.shared.open(u) }
        decisionHandler(.cancel)
    }
    func webView(_ w: WKWebView, decidePolicyFor r: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        decisionHandler(r.canShowMIMEType ? .allow : .download)
    }
    func webView(_ w: WKWebView, navigationAction a: WKNavigationAction, didBecome d: WKDownload) { d.delegate = self }
    func webView(_ w: WKWebView, navigationResponse r: WKNavigationResponse, didBecome d: WKDownload) { d.delegate = self }
    func webView(_ w: WKWebView, didFailProvisionalNavigation n: WKNavigation!, withError e: Error) {
        NSLog("Twistwright: the page did not load: %@", e.localizedDescription)
    }
    func webViewWebContentProcessDidTerminate(_ w: WKWebView) {
        NSLog("Twistwright: the page stopped; loading it again")
        bridge.release(client)
        w.reload()
    }

    // Save image, Save data and the like: a save panel, as Safari asks where to put a file.
    func download(_ d: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename name: String,
                  completionHandler: @escaping (URL?) -> Void) {
        let p = NSSavePanel()
        p.nameFieldStringValue = name
        p.beginSheetModal(for: window) { r in
            // WKDownload does not write over a file. The save panel already asked to replace it.
            if r == .OK, let u = p.url { try? FileManager.default.removeItem(at: u); completionHandler(u) }
            else { completionHandler(nil) }
        }
    }
    func download(_ d: WKDownload, didFailWithError e: Error, resumeData: Data?) {
        NSLog("Twistwright: a download failed: %@", e.localizedDescription)
    }

    // ----- UI: new windows, dialogs, files, camera and microphone -----

    // A link that opens a new tab: a page of the site opens here, any other address in the browser.
    func webView(_ w: WKWebView, createWebViewWith c: WKWebViewConfiguration, for a: WKNavigationAction,
                 windowFeatures f: WKWindowFeatures) -> WKWebView? {
        if let u = a.request.url {
            if isPage(u) { w.load(a.request) } else if u.scheme == SCHEME { onAppLink?(u) } else { NSWorkspace.shared.open(u) }
        }
        return nil
    }
    func webView(_ w: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame f: WKFrameInfo,
                 completionHandler: @escaping () -> Void) {
        let a = NSAlert(); a.messageText = message; a.addButton(withTitle: "OK")
        a.beginSheetModal(for: window) { _ in completionHandler() }
    }
    func webView(_ w: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame f: WKFrameInfo,
                 completionHandler: @escaping (Bool) -> Void) {
        let a = NSAlert(); a.messageText = message
        a.addButton(withTitle: "OK"); a.addButton(withTitle: "Cancel")
        a.beginSheetModal(for: window) { r in completionHandler(r == .alertFirstButtonReturn) }
    }
    func webView(_ w: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?,
                 initiatedByFrame f: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let a = NSAlert(); a.messageText = prompt
        a.addButton(withTitle: "OK"); a.addButton(withTitle: "Cancel")
        let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 280, height: 24))
        field.stringValue = defaultText ?? ""
        a.accessoryView = field
        a.beginSheetModal(for: window) { r in completionHandler(r == .alertFirstButtonReturn ? field.stringValue : nil) }
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
    // the camera and the microphone with no second prompt.
    func webView(_ w: WKWebView, requestMediaCapturePermissionFor o: WKSecurityOrigin, initiatedByFrame f: WKFrameInfo,
                 type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(o.protocol == SCHEME ? .grant : .deny)
    }

    // ----- The history -----

    // Put the history from Safari in place of the window's own: every cw: key goes, then the
    // keys given come in. done gets the number written, or nil on an error. The page loads
    // again so that it reads them.
    func replaceHistory(_ data: [String: String], _ done: @escaping (Int?) -> Void) {
        afterLoad { [weak self] in
            guard let self = self else { return }
            let js = """
            for (const k of Object.keys(localStorage)) if (k.startsWith('cw:')) localStorage.removeItem(k);
            let n = 0;
            for (const [k, v] of Object.entries(d)) if (k.startsWith('cw:')) { localStorage.setItem(k, v); n++; }
            return n;
            """
            self.web.callAsyncJavaScript(js, arguments: ["d": data], in: nil, in: .page) { r in
                switch r {
                case .success(let v): done((v as? NSNumber)?.intValue ?? 0); self.web.reload()
                case .failure(let e): NSLog("Twistwright: the history did not move: %@", e.localizedDescription); done(nil)
                }
            }
        }
    }
}
