// Twistwright Spike: a throwaway Mac app that answers the questions of the native app concept
// before any real work starts. One window with a WKWebView shows the probe page (/spike/) and the
// site from this checkout, at one of two origins: a custom scheme (twistwright://app/) or a
// loopback server on a random port. See mac/spike/README.md.
//
//   TwistwrightSpike.app/Contents/MacOS/TwistwrightSpike [--origin scheme|loopback] [--path /spike/]
//
// --origin picks the origin for this launch only; the Spike menu picks it and keeps it. --path is
// the first page to load. Build with mac/spike/build.sh.
import AppKit

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
