import AppKit
import AVFoundation
import CoreBluetooth
import Speech

// The Set Up Twistwright window. macOS asks once for each thing the app uses, and keeps the answer
// in System Settings > Privacy & Security; this window asks for them all in one place, before the
// page needs them. It opens at launch while macOS has not asked for one of them (the first launch,
// or a build that macOS takes for a new app and so forgets the answers), and again from
// Twistwright > Set Up Twistwright… or the menu bar item. A row that macOS turned off can only be turned on in System Settings, so
// its button opens that pane. The last row moves the history from Safari into the window. Data from any
// other browser comes in through the page itself: Settings > Your data (js/transfer.js).

enum Grant { case notAsked, allowed, off }

struct SetupItem {
    let symbol: String
    let title: String
    let detail: String
    let settings: String              // the Privacy & Security pane
    let status: () -> Grant
    let ask: (@escaping () -> Void) -> Void
}

final class SetupWindow: NSObject, NSWindowDelegate {
    let window: NSWindow
    private var rows: [(item: SetupItem, state: NSTextField, button: NSButton)] = []
    private let historyState = NSTextField(labelWithString: "")
    private var active: NSObjectProtocol?
    // Bring History from Safari.
    var onHistory: (() -> Void)?

    init(bridge: Bridge) {
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 600, height: 300),
                          styleMask: [.titled, .closable], backing: .buffered, defer: false)
        super.init()
        window.title = "Set Up Twistwright"
        window.isReleasedWhenClosed = false
        window.delegate = self
        let pane = "x-apple.systempreferences:com.apple.preference.security?"
        let items = [
            SetupItem(symbol: "dot.radiowaves.left.and.right", title: "Bluetooth",
                      detail: "To connect to a GAN smart cube and read its turns.",
                      settings: pane + "Privacy_Bluetooth",
                      status: {
                          switch CBCentralManager.authorization {
                          case .allowedAlways: return .allowed
                          case .notDetermined: return .notAsked
                          default: return .off
                          }
                      },
                      // The bridge's own manager asks; its state then reaches the page.
                      ask: { [weak bridge] done in bridge?.startCentral(); done() }),
            SetupItem(symbol: "camera", title: "Camera",
                      detail: "To scan your cube: Scan cube reads each face with the camera.",
                      settings: pane + "Privacy_Camera",
                      status: { SetupWindow.grant(AVCaptureDevice.authorizationStatus(for: .video)) },
                      ask: { done in AVCaptureDevice.requestAccess(for: .video) { _ in DispatchQueue.main.async(execute: done) } }),
            SetupItem(symbol: "mic", title: "Microphone",
                      detail: "To hear you: Listen takes case names and commands by voice.",
                      settings: pane + "Privacy_Microphone",
                      status: { SetupWindow.grant(AVCaptureDevice.authorizationStatus(for: .audio)) },
                      ask: { done in AVCaptureDevice.requestAccess(for: .audio) { _ in DispatchQueue.main.async(execute: done) } }),
            SetupItem(symbol: "waveform", title: "Speech Recognition",
                      detail: "To turn what you say into words for Listen.",
                      settings: pane + "Privacy_SpeechRecognition",
                      status: {
                          switch SFSpeechRecognizer.authorizationStatus() {
                          case .authorized: return .allowed
                          case .notDetermined: return .notAsked
                          default: return .off
                          }
                      },
                      ask: { done in SFSpeechRecognizer.requestAuthorization { _ in DispatchQueue.main.async(execute: done) } }),
        ]
        build(items)
        // Back from System Settings: show what changed there.
        active = NotificationCenter.default.addObserver(forName: NSApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
            self?.refresh()
        }
    }

    // The rows that macOS has not asked for yet, by title.
    var notAsked: [String] { rows.filter { $0.item.status() == .notAsked }.map { $0.item.title } }

    static func grant(_ s: AVAuthorizationStatus) -> Grant {
        switch s {
        case .authorized: return .allowed
        case .notDetermined: return .notAsked
        default: return .off
        }
    }

    private func label(_ s: String, size: CGFloat, bold: Bool = false, color: NSColor = .labelColor) -> NSTextField {
        let l = NSTextField(wrappingLabelWithString: s)
        l.font = bold ? .boldSystemFont(ofSize: size) : .systemFont(ofSize: size)
        l.textColor = color
        l.isSelectable = false
        return l
    }

    private func row(symbol: String, title: String, detail: String, state: NSTextField, button: NSButton) -> NSView {
        let icon = NSImageView(image: NSImage(systemSymbolName: symbol, accessibilityDescription: title) ?? NSImage())
        icon.symbolConfiguration = .init(pointSize: 20, weight: .regular)
        icon.contentTintColor = .controlAccentColor
        icon.setContentHuggingPriority(.required, for: .horizontal)
        icon.widthAnchor.constraint(equalToConstant: 28).isActive = true
        let text = NSStackView(views: [label(title, size: 13, bold: true), label(detail, size: 12, color: .secondaryLabelColor)])
        text.orientation = .vertical; text.alignment = .leading; text.spacing = 2
        text.setContentHuggingPriority(.defaultLow, for: .horizontal)
        state.font = .systemFont(ofSize: 13)
        state.alignment = .right
        state.setContentHuggingPriority(.required, for: .horizontal)
        button.bezelStyle = .rounded
        button.setContentHuggingPriority(.required, for: .horizontal)
        // The status or the button, right-aligned in a column of one width on every row.
        let spacer = NSView()
        spacer.setContentHuggingPriority(.defaultLow, for: .horizontal)
        let end = NSStackView(views: [spacer, state, button])
        end.orientation = .horizontal; end.alignment = .centerY; end.spacing = 8; end.distribution = .fill
        end.widthAnchor.constraint(equalToConstant: 220).isActive = true
        let r = NSStackView(views: [icon, text, end])
        r.orientation = .horizontal; r.alignment = .centerY; r.spacing = 12; r.distribution = .fill
        return r
    }

    private func build(_ items: [SetupItem]) {
        let head = label("Twistwright asks macOS for these once. macOS keeps your answers in System Settings > Privacy & Security, and you can change them there at any time.",
                         size: 13)
        var views: [NSView] = [head]
        for it in items {
            let state = NSTextField(labelWithString: "")
            let b = NSButton(title: "Allow…", target: self, action: #selector(press(_:)))
            b.tag = rows.count
            rows.append((it, state, b))
            views.append(NSBox.separator())
            views.append(row(symbol: it.symbol, title: it.title, detail: it.detail, state: state, button: b))
        }
        let hb = NSButton(title: "Bring History…", target: self, action: #selector(history(_:)))
        views.append(NSBox.separator())
        views.append(row(symbol: "clock.arrow.circlepath", title: "History from Safari",
                         detail: "If you used Twistwright in Safari with this app: your times, cases and settings move into this window. The app opens Safari once to send them. From another browser: choose Copy my data in its Settings, then Paste my data in this window's Settings.",
                         state: historyState, button: hb))
        let done = NSButton(title: "Done", target: self, action: #selector(close(_:)))
        done.keyEquivalent = "\r"
        let foot = NSStackView(views: [NSView(), done])
        foot.orientation = .horizontal
        views.append(foot)
        let stack = NSStackView(views: views)
        stack.orientation = .vertical; stack.alignment = .leading; stack.spacing = 14
        stack.edgeInsets = NSEdgeInsets(top: 20, left: 24, bottom: 20, right: 24)
        stack.translatesAutoresizingMaskIntoConstraints = false
        for v in views { v.widthAnchor.constraint(equalTo: stack.widthAnchor, constant: -48).isActive = true }
        let content = NSView()
        content.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: content.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: content.trailingAnchor),
            stack.topAnchor.constraint(equalTo: content.topAnchor),
            stack.bottomAnchor.constraint(equalTo: content.bottomAnchor),
            stack.widthAnchor.constraint(equalToConstant: 600),
        ])
        window.contentView = content
        refresh()
    }

    // Each row as macOS has it now.
    func refresh() {
        for r in rows {
            switch r.item.status() {
            case .allowed:
                r.state.stringValue = "✓ Allowed"; r.state.textColor = .systemGreen; r.button.isHidden = true
            case .notAsked:
                r.state.stringValue = ""; r.button.title = "Allow…"; r.button.isHidden = false
            case .off:
                r.state.stringValue = "Turned off"; r.state.textColor = .secondaryLabelColor
                r.button.title = "Open System Settings"; r.button.isHidden = false
            }
        }
        if let d = UserDefaults.standard.object(forKey: "historyMoved") as? Date {
            historyState.stringValue = "✓ Moved"; historyState.textColor = .systemGreen
            historyState.toolTip = "Moved on " + DateFormatter.localizedString(from: d, dateStyle: .medium, timeStyle: .short)
        } else { historyState.stringValue = ""; historyState.toolTip = nil }
    }

    @objc func press(_ b: NSButton) {
        let it = rows[b.tag].item
        if it.status() == .off { NSWorkspace.shared.open(URL(string: it.settings)!); return }
        it.ask { [weak self] in self?.refresh() }
    }
    @objc func history(_ b: NSButton) { onHistory?() }
    @objc func close(_ b: NSButton) { window.performClose(nil) }

    func show() {
        refresh()
        if !window.isVisible { window.center() }
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }
}

extension NSBox {
    static func separator() -> NSBox { let b = NSBox(); b.boxType = .separator; return b }
}
