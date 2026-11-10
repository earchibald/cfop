import Foundation
import IOKit.pwr_mgt

// A smart cube's turns come over Bluetooth, not from the keyboard or the mouse, so macOS sees an
// idle Mac and dims, sleeps and locks the screen part way through a drill. The page (js/awake.js)
// sends {op:"awake", seconds} on a turn, at most every 20 s, from the app's window or from Safari
// over the bridge. Each one tells macOS the user is active (as a key press would) and holds the
// display awake until `seconds` after the last one; then the assertion goes and the Mac sleeps as
// its settings say. seconds 0 lets go at once. `pmset -g assertions` lists both while they hold.
final class Awake {
    static let shared = Awake()
    private var activity: IOPMAssertionID = 0
    private var display: IOPMAssertionID = 0
    private var timer: Timer?

    func kick(seconds: Double) {
        DispatchQueue.main.async { self.kickNow(seconds) }
    }
    private func kickNow(_ seconds: Double) {
        guard seconds > 0 else { releaseNow(); return }
        // As a key press: the display wakes if it dimmed, and the idle time starts again.
        IOPMAssertionDeclareUserActivity("Twistwright: a smart cube turn" as CFString, kIOPMUserActiveLocal, &activity)
        if display == 0 {
            let r = IOPMAssertionCreateWithName(kIOPMAssertionTypePreventUserIdleDisplaySleep as CFString,
                                                IOPMAssertionLevel(kIOPMAssertionLevelOn),
                                                "Twistwright: drilling with a smart cube" as CFString, &display)
            if r != kIOReturnSuccess { display = 0 }
        }
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: min(seconds, 3600), repeats: false) { [weak self] _ in self?.releaseNow() }
    }
    func release() { DispatchQueue.main.async { self.releaseNow() } }
    private func releaseNow() {
        timer?.invalidate(); timer = nil
        if display != 0 { IOPMAssertionRelease(display); display = 0 }
        // The activity is held by the app until let go: let it go too, so the Mac may sleep.
        if activity != 0 { IOPMAssertionRelease(activity); activity = 0 }
    }
}
