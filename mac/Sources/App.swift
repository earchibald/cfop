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

final class AppDelegate: NSObject, NSApplicationDelegate, NSMenuItemValidation {
    var status: NSStatusItem!
    var site: Site!
    var siteServer: SiteServer!
    var server: BridgeServer!
    var bridge: Bridge!
    var main: PageWindow!
    var lab: PageWindow?
    var setup: SetupWindow!
    // The menu bar item, kept for the release that moves a Safari user into the window.
    let stateItem = NSMenuItem(title: "", action: nil, keyEquivalent: "")
    let cubeItem = NSMenuItem(title: "", action: nil, keyEquivalent: "")
    var sourceItems: [NSMenuItem] = []

    func applicationDidFinishLaunching(_ n: Notification) {
        var root: URL? = nil, noOpen = false, source: SiteSource? = nil, showSetup = false
        var args = CommandLine.arguments.dropFirst()
        while let a = args.popFirst() {
            switch a {
            case "--root": if let p = args.popFirst() { root = URL(fileURLWithPath: p) }
            case "--no-open": noOpen = true
            case "--setup": showSetup = true
            case "--site": if let s = args.popFirst() { source = SiteSource(rawValue: s) }
            case "--port": if let p = args.popFirst().flatMap({ UInt16($0) }), p < 65535 { HTTP_PORT = p; WS_PORT = p + 1 }
            default: break
            }
        }
        bridge = Bridge(onChange: { [weak self] in self?.refreshMenus() })
        bridge.onMigrate = { [weak self] data, c, seq in self?.takeHistory(data, from: c, seq: seq) }
        site = Site(root: root, builtin: BUILTIN)
        // The built-in site unless the user chose the live one. --site sets it for this launch only.
        site.source = source ?? SiteSource(rawValue: UserDefaults.standard.string(forKey: "site") ?? "") ?? .builtin
        siteServer = SiteServer(port: HTTP_PORT, site: site)
        server = BridgeServer(port: WS_PORT, bridge: bridge)
        siteServer.start()
        server.start()
        main = PageWindow(home: "/", title: "Twistwright", autosave: "TwistwrightMain", site: site, bridge: bridge)
        main.onAppLink = { [weak self] u in self?.openLink(u) }
        setup = SetupWindow(bridge: bridge)
        setup.onHistory = { [weak self] in self?.bringHistory(nil) }
        makeMainMenu()
        makeStatusMenu()
        if !noOpen { main.show() }
        // The setup opens once, at the first launch; --setup opens it and leaves that untouched.
        let d = UserDefaults.standard
        if showSetup { setup.show() }
        else if !noOpen && !d.bool(forKey: "setupShown") { d.set(true, forKey: "setupShown"); setup.show() }
    }

    // A closed window leaves the app running: the menu bar item and Safari's bridge stay.
    func applicationShouldTerminateAfterLastWindowClosed(_ a: NSApplication) -> Bool { false }
    func applicationShouldHandleReopen(_ a: NSApplication, hasVisibleWindows f: Bool) -> Bool {
        if !f { main.show() }
        return true
    }
    // twistwright://smart opens the window with the Smart cube dialog. Any other link opens the window.
    func application(_ a: NSApplication, open urls: [URL]) {
        for u in urls { openLink(u) }
    }
    func openLink(_ u: URL) {
        if u.host == "smart" { main.show("/?smart=1") } else { main.show() }
    }

    // ----- The main menu -----

    func makeMainMenu() {
        let bar = NSMenu()
        func sub(_ title: String, _ items: [NSMenuItem]) -> NSMenu {
            let top = NSMenuItem(title: title, action: nil, keyEquivalent: "")
            let m = NSMenu(title: title)
            items.forEach { m.addItem($0) }
            top.submenu = m; bar.addItem(top)
            return m
        }
        func item(_ t: String, _ a: Selector?, _ k: String = "", _ mods: NSEvent.ModifierFlags = .command, mine: Bool = false) -> NSMenuItem {
            let i = NSMenuItem(title: t, action: a, keyEquivalent: k)
            i.keyEquivalentModifierMask = mods
            if mine { i.target = self }
            return i
        }
        _ = sub("Twistwright", [
            item("About Twistwright", #selector(NSApplication.orderFrontStandardAboutPanel(_:))),
            item("Set Up Twistwright…", #selector(showSetup(_:)), mine: true),
            .separator(),
            item("Hide Twistwright", #selector(NSApplication.hide(_:)), "h"),
            item("Hide Others", #selector(NSApplication.hideOtherApplications(_:)), "h", [.command, .option]),
            item("Show All", #selector(NSApplication.unhideAllApplications(_:))),
            .separator(),
            item("Quit Twistwright", #selector(NSApplication.terminate(_:)), "q")])
        _ = sub("File", [
            item("Bring History from Safari…", #selector(bringHistory(_:)), mine: true),
            item("Open in Safari", #selector(openInBrowser(_:)), mine: true),
            .separator(),
            item("Close Window", #selector(NSWindow.performClose(_:)), "w")])
        // Without these items Cmd+C, Cmd+V and Cmd+A never reach the page.
        _ = sub("Edit", [
            item("Undo", Selector(("undo:")), "z"),
            item("Redo", Selector(("redo:")), "z", [.command, .shift]),
            .separator(),
            item("Cut", #selector(NSText.cut(_:)), "x"),
            item("Copy", #selector(NSText.copy(_:)), "c"),
            item("Paste", #selector(NSText.paste(_:)), "v"),
            item("Select All", #selector(NSText.selectAll(_:)), "a")])
        let view = sub("View", [
            item("Reload Page", #selector(reloadPage(_:)), "r", mine: true),
            item("Back", #selector(goBack(_:)), "[", mine: true),
            item("Forward", #selector(goForward(_:)), "]", mine: true),
            .separator(),
            item("Actual Size", #selector(zoomReset(_:)), "0", mine: true),
            item("Zoom In", #selector(zoomIn(_:)), "+", mine: true),
            item("Zoom Out", #selector(zoomOut(_:)), "-", mine: true),
            .separator()])
        addSourceItems(to: view)
        let win = sub("Window", [
            item("Minimize", #selector(NSWindow.performMiniaturize(_:)), "m"),
            item("Zoom", #selector(NSWindow.performZoom(_:))),
            .separator(),
            item("Twistwright", #selector(showMain(_:)), "1", mine: true),
            item("Smart Cube Lab", #selector(showLab(_:)), "2", mine: true)])
        NSApp.windowsMenu = win
        _ = sub("Help", [item("Twistwright on the Web", #selector(openWeb(_:)), mine: true)])
        NSApp.mainMenu = bar
    }
    // Which pages the app shows. The windows load again with the change.
    func addSourceItems(to m: NSMenu) {
        if let root = site.root {
            let it = NSMenuItem(title: "Pages from " + root.lastPathComponent, action: nil, keyEquivalent: "")
            it.isEnabled = false; it.toolTip = root.path; m.addItem(it); return
        }
        let v = BUILTIN_INFO["version"].map { " " + $0 } ?? ""
        let b = NSMenuItem(title: BUILTIN == nil ? "Built-in Pages (not in this build)" : "Built-in Pages" + v,
                           action: #selector(pickSource(_:)), keyEquivalent: "")
        b.toolTip = "The pages built into the app. They work with no internet connection."
        b.representedObject = SiteSource.builtin.rawValue
        let l = NSMenuItem(title: "Live Pages from twistwright.com", action: #selector(pickSource(_:)), keyEquivalent: "")
        l.toolTip = "The newest pages. With no internet connection, the app shows the built-in pages."
        l.representedObject = SiteSource.live.rawValue
        for it in [b, l] { it.target = self; m.addItem(it); sourceItems.append(it) }
    }
    func validateMenuItem(_ it: NSMenuItem) -> Bool {
        if it.action == #selector(pickSource(_:)) {
            it.state = (it.representedObject as? String) == site.serving.rawValue ? .on : .off
            return it.representedObject as? String != SiteSource.builtin.rawValue || BUILTIN != nil
        }
        if [#selector(reloadPage(_:)), #selector(goBack(_:)), #selector(goForward(_:)),
            #selector(zoomReset(_:)), #selector(zoomIn(_:)), #selector(zoomOut(_:))].contains(it.action) {
            guard let p = front else { return false }
            if it.action == #selector(goBack(_:)) { return p.web.canGoBack }
            if it.action == #selector(goForward(_:)) { return p.web.canGoForward }
        }
        return true
    }

    // The window in front, if it is one of the two pages.
    var front: PageWindow? {
        let k = NSApp.keyWindow
        return [main, lab].compactMap { $0 }.first { $0.window === k }
    }
    @objc func reloadPage(_ s: Any?) { front?.web.reload() }
    @objc func goBack(_ s: Any?) { front?.web.goBack() }
    @objc func goForward(_ s: Any?) { front?.web.goForward() }
    @objc func zoomReset(_ s: Any?) { front?.web.pageZoom = 1 }
    @objc func zoomIn(_ s: Any?) { if let w = front?.web { w.pageZoom = min(3, w.pageZoom + 0.1) } }
    @objc func zoomOut(_ s: Any?) { if let w = front?.web { w.pageZoom = max(0.5, w.pageZoom - 0.1) } }
    @objc func showMain(_ s: Any?) { main.show() }
    @objc func showLab(_ s: Any?) {
        if lab == nil {
            lab = PageWindow(home: "/lab/", title: "Smart Cube Lab", autosave: "TwistwrightLab", site: site, bridge: bridge)
            lab?.onAppLink = { [weak self] u in self?.openLink(u) }
        }
        lab?.show()
    }
    @objc func openWeb(_ s: Any?) { NSWorkspace.shared.open(SITE) }
    @objc func showSetup(_ s: Any?) { setup.show() }
    @objc func pickSource(_ s: NSMenuItem) {
        guard let v = s.representedObject as? String, let src = SiteSource(rawValue: v) else { return }
        site.source = src
        UserDefaults.standard.set(src.rawValue, forKey: "site")
        for p in [main, lab].compactMap({ $0 }) where p.hasPage { p.web.reload() }
        refreshMenus()
    }

    // ----- The menu bar item -----

    func makeStatusMenu() {
        status = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        status.button?.image = NSImage(systemSymbolName: "cube", accessibilityDescription: "Twistwright")
        let m = NSMenu()
        m.autoenablesItems = false
        let open = NSMenuItem(title: "Open Twistwright", action: #selector(showMain(_:)), keyEquivalent: ""); open.target = self; m.addItem(open)
        let safari = NSMenuItem(title: "Open in Safari", action: #selector(openInBrowser(_:)), keyEquivalent: ""); safari.target = self; m.addItem(safari)
        let set = NSMenuItem(title: "Set Up Twistwright…", action: #selector(showSetup(_:)), keyEquivalent: ""); set.target = self; m.addItem(set)
        m.addItem(.separator())
        stateItem.isEnabled = false; cubeItem.isEnabled = false
        m.addItem(stateItem); m.addItem(cubeItem)
        m.addItem(.separator())
        let copy = NSMenuItem(title: "Copy the Safari Address", action: #selector(copyAddress(_:)), keyEquivalent: ""); copy.target = self; m.addItem(copy)
        let quit = NSMenuItem(title: "Quit Twistwright", action: #selector(NSApplication.terminate(_:)), keyEquivalent: ""); quit.target = NSApp; m.addItem(quit)
        status.menu = m
        refreshMenus()
    }
    @objc func copyAddress(_ s: Any?) {
        NSPasteboard.general.clearContents(); NSPasteboard.general.setString(LOCAL_URL, forType: .string)
    }
    // The page in Safari, as before the window: the hand-off release keeps this path.
    @objc func openInBrowser(_ s: Any?) { openInSafari(URL(string: LOCAL_URL)!) }
    func openInSafari(_ u: URL) {
        if let safari = NSWorkspace.shared.urlForApplication(withBundleIdentifier: "com.apple.Safari") {
            NSWorkspace.shared.open([u], withApplicationAt: safari, configuration: NSWorkspace.OpenConfiguration())
        } else { NSWorkspace.shared.open(u) }
    }
    func refreshMenus() {
        stateItem.title = "Bluetooth: " + bridge.stateText
        let names = bridge.connectedNames
        cubeItem.title = names.isEmpty ? "No cube connected" : "Connected: " + names.joined(separator: ", ")
        setup?.refresh()
    }

    // ----- The history from Safari -----

    // Safari keeps the history of http://127.0.0.1:27272/; the window keeps its own, at
    // twistwright://app. To move it, the app opens that page in Safari with ?migrate=1. The page
    // sends its cw: keys over the WebSocket (op migrate), and takeHistory asks the user. The setup
    // window offers it at the first launch.
    @objc func bringHistory(_ s: Any?) { openInSafari(URL(string: LOCAL_URL + "?migrate=1")!) }

    func takeHistory(_ data: [String: String], from c: BridgeClient, seq: Int) {
        let n = data.keys.filter { $0.hasPrefix("cw:") }.count
        if n == 0 { c.send(["ev": "migrated", "seq": seq, "count": 0]); return }
        main.show()
        let a = NSAlert()
        a.messageText = "Bring \(n) saved \(n == 1 ? "item" : "items") from Safari?"
        a.informativeText = "They take the place of the history in this window. Safari keeps its copy."
        a.addButton(withTitle: "Replace"); a.addButton(withTitle: "Cancel")
        a.beginSheetModal(for: main.window) { [weak self] r in
            guard r == .alertFirstButtonReturn, let self = self else {
                c.send(["ev": "migrated", "seq": seq, "count": 0, "cancelled": true]); return
            }
            self.main.replaceHistory(data) { written in
                if let w = written {
                    UserDefaults.standard.set(Date(), forKey: "historyMoved"); self.setup.refresh()
                    c.send(["ev": "migrated", "seq": seq, "count": w])
                }
                else { c.error("The history did not move into the window.", seq: seq) }
            }
        }
    }
}
