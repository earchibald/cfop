import AppKit

var HTTP_PORT: UInt16 = 27272
var WS_PORT: UInt16 = 27273
let SITE = URL(string: "https://www.twistwright.com")!
var LOCAL_URL: String { "http://127.0.0.1:\(HTTP_PORT)/" }
let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "dev"

// The copy of the site that mac/build.sh builds into the app, and site.json beside it: the git ref,
// the commit and the site's APP_VERSION. nil in a build made with --no-site.
let BUILTIN: URL? = {
    guard let r = Bundle.main.resourceURL?.appendingPathComponent("site"),
          FileManager.default.fileExists(atPath: r.appendingPathComponent("index.html").path) else { return nil }
    return r
}()
let BUILTIN_INFO: [String: String] = {
    guard let u = Bundle.main.resourceURL?.appendingPathComponent("site.json"), let d = try? Data(contentsOf: u),
          let o = try? JSONSerialization.jsonObject(with: d) as? [String: String] else { return [:] }
    return o
}()

final class AppDelegate: NSObject, NSApplicationDelegate {
    var status: NSStatusItem!
    var site: SiteServer!
    var server: BridgeServer!
    var bridge: Bridge!
    let stateItem = NSMenuItem(title: "", action: nil, keyEquivalent: "")
    let cubeItem = NSMenuItem(title: "", action: nil, keyEquivalent: "")
    let builtinItem = NSMenuItem(title: "", action: nil, keyEquivalent: "")
    let liveItem = NSMenuItem(title: "", action: nil, keyEquivalent: "")

    func applicationDidFinishLaunching(_ n: Notification) {
        var root: URL? = nil, noOpen = false, source: SiteSource? = nil
        var args = CommandLine.arguments.dropFirst()
        while let a = args.popFirst() {
            switch a {
            case "--root": if let p = args.popFirst() { root = URL(fileURLWithPath: p) }
            case "--no-open": noOpen = true
            case "--site": if let s = args.popFirst() { source = SiteSource(rawValue: s) }
            case "--port": if let p = args.popFirst().flatMap({ UInt16($0) }), p < 65535 { HTTP_PORT = p; WS_PORT = p + 1 }
            default: break
            }
        }
        bridge = Bridge(onChange: { [weak self] in self?.refreshMenu() })
        site = SiteServer(port: HTTP_PORT, root: root, builtin: BUILTIN)
        // The built-in site unless the user chose the live one. --site sets it for this launch only.
        site.source = source ?? SiteSource(rawValue: UserDefaults.standard.string(forKey: "site") ?? "") ?? .builtin
        server = BridgeServer(port: WS_PORT, bridge: bridge)
        site.start()
        server.start()
        makeMenu()
        if !noOpen { openPage("") }
    }

    // twistwright://smart opens the page with the Smart cube dialog. Any other link opens the page.
    func application(_ a: NSApplication, open urls: [URL]) {
        for u in urls { openPage(u.host == "smart" ? "?smart=1" : "") }
    }
    func applicationShouldHandleReopen(_ a: NSApplication, hasVisibleWindows f: Bool) -> Bool {
        openPage(""); return false
    }

    func makeMenu() {
        status = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        status.button?.image = NSImage(systemSymbolName: "cube", accessibilityDescription: "Twistwright")
        let m = NSMenu()
        m.autoenablesItems = false
        for (title, sel, key) in [("Open Twistwright", #selector(openSite), "o")] {
            let it = NSMenuItem(title: title, action: sel, keyEquivalent: key); it.target = self; m.addItem(it)
        }
        m.addItem(.separator())
        // Which pages the app serves. A reload of the page shows the change.
        if let root = site.root {
            let it = NSMenuItem(title: "Pages from " + root.lastPathComponent, action: nil, keyEquivalent: "")
            it.isEnabled = false; it.toolTip = root.path; m.addItem(it)
        } else {
            let v = BUILTIN_INFO["version"].map { " " + $0 } ?? ""
            builtinItem.title = BUILTIN == nil ? "Built-in pages (not in this build)" : "Built-in pages" + v
            builtinItem.toolTip = "The pages built into the app. They work with no internet connection."
            liveItem.title = "Live pages from twistwright.com"
            liveItem.toolTip = "The newest pages. With no internet connection, the app shows the built-in pages."
            for it in [builtinItem, liveItem] { it.target = self; it.action = #selector(pickSource); m.addItem(it) }
            builtinItem.isEnabled = BUILTIN != nil
        }
        m.addItem(.separator())
        stateItem.isEnabled = false; cubeItem.isEnabled = false
        m.addItem(stateItem); m.addItem(cubeItem)
        m.addItem(.separator())
        let copy = NSMenuItem(title: "Copy the address", action: #selector(copyAddress), keyEquivalent: "c"); copy.target = self; m.addItem(copy)
        let quit = NSMenuItem(title: "Quit Twistwright", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"); quit.target = NSApp; m.addItem(quit)
        status.menu = m
        refreshMenu()
    }
    @objc func openSite(_ s: Any?) { openPage("") }
    @objc func pickSource(_ s: NSMenuItem) {
        site.source = s === liveItem ? .live : .builtin
        UserDefaults.standard.set(site.source.rawValue, forKey: "site")
        refreshMenu()
    }
    @objc func copyAddress(_ s: Any?) {
        NSPasteboard.general.clearContents(); NSPasteboard.general.setString(LOCAL_URL, forType: .string)
    }
    func openPage(_ query: String) { NSWorkspace.shared.open(URL(string: LOCAL_URL + query)!) }
    func refreshMenu() {
        stateItem.title = "Bluetooth: " + bridge.stateText
        let names = bridge.connectedNames
        cubeItem.title = names.isEmpty ? "No cube connected" : "Connected: " + names.joined(separator: ", ")
        builtinItem.state = site.serving == .builtin ? .on : .off
        liveItem.state = site.serving == .live ? .on : .off
    }
}
