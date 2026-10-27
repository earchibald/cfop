// Twistwright for macOS: the Twistwright site in a window of its own, with a way to a GAN smart
// cube. WebKit has no Web Bluetooth, so the app does the Bluetooth work (Bridge.swift) and the
// page reaches it through a message handler. The window shows the pages at twistwright://app/,
// from the copy of the site built into the app or live from twistwright.com.
//
// For one release the app also keeps the menu bar item and serves the page to Safari at
// http://127.0.0.1:27272/ with a WebSocket bridge, so a Safari user can move their history into
// the window (File > Bring History from Safari). A twistwright:// link opens the window.
//
//   Twistwright.app/Contents/MacOS/Twistwright [--root DIR] [--no-open] [--site builtin|live] [--port N]
//
// --root shows the site from a folder (a checkout). --no-open opens no window at launch.
// Build with mac/build.sh.
import AppKit

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
