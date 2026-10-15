// Twistwright for macOS: a menu bar app that gives the Twistwright web page a way to a GAN smart
// cube. Safari has no Web Bluetooth, so the app does the Bluetooth work and serves the page at
// http://127.0.0.1:27272/, an address from which Safari lets the page talk to a local WebSocket.
// A twistwright:// link opens the app, and the app opens that page in the default browser.
//
//   Twistwright.app/Contents/MacOS/Twistwright [--root DIR] [--no-open]
//
// --root serves the site from a folder (a checkout) in place of twistwright.com. --no-open does
// not open the browser at launch. Build with mac/build.sh.
import AppKit

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.accessory)
app.run()
