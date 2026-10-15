import AppKit

let HTTP_PORT: UInt16 = 27272
let WS_PORT: UInt16 = 27273
let SITE = URL(string: "https://www.twistwright.com")!
let LOCAL_URL = "http://127.0.0.1:\(HTTP_PORT)/"
let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "dev"

final class AppDelegate: NSObject, NSApplicationDelegate {
    var status: NSStatusItem!
    var site: SiteServer!
    var server: BridgeServer!
    var bridge: Bridge!
    let stateItem = NSMenuItem(title: "", action: nil, keyEquivalent: "")
    let cubeItem = NSMenuItem(title: "", action: nil, keyEquivalent: "")

    func applicationDidFinishLaunching(_ n: Notification) {
        var root: URL? = nil, noOpen = false
        var args = CommandLine.arguments.dropFirst()
        while let a = args.popFirst() {
            switch a {
            case "--root": if let p = args.popFirst() { root = URL(fileURLWithPath: p) }
            case "--no-open": noOpen = true
            default: break
            }
        }
        bridge = Bridge(onChange: { [weak self] in self?.refreshMenu() })
        site = SiteServer(port: HTTP_PORT, root: root)
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
        stateItem.isEnabled = false; cubeItem.isEnabled = false
        m.addItem(stateItem); m.addItem(cubeItem)
        m.addItem(.separator())
        let copy = NSMenuItem(title: "Copy the address", action: #selector(copyAddress), keyEquivalent: "c"); copy.target = self; m.addItem(copy)
        let quit = NSMenuItem(title: "Quit Twistwright", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"); quit.target = NSApp; m.addItem(quit)
        status.menu = m
        refreshMenu()
    }
    @objc func openSite(_ s: Any?) { openPage("") }
    @objc func copyAddress(_ s: Any?) {
        NSPasteboard.general.clearContents(); NSPasteboard.general.setString(LOCAL_URL, forType: .string)
    }
    func openPage(_ query: String) { NSWorkspace.shared.open(URL(string: LOCAL_URL + query)!) }
    func refreshMenu() {
        stateItem.title = "Bluetooth: " + bridge.stateText
        let names = bridge.connectedNames
        cubeItem.title = names.isEmpty ? "No cube connected" : "Connected: " + names.joined(separator: ", ")
    }
}
