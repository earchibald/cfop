// ganmac: print the MAC address of a GAN smart cube, for the Smart cube dialog in Twistwright.
// macOS hides Bluetooth MAC addresses, but a GAN cube puts its own at the end of its manufacturer
// data. This reads it the same way as ganMacFromData in js/gan.js.
//
//   ganmac            scan until a GAN cube shows, print its address, quit
//   ganmac --all      keep scanning and print each cube once
//   ganmac --copy     also put the address on the clipboard
//   ganmac --raw      also print the manufacturer data in hex
//   ganmac --timeout N  give up after N seconds (default 20)
import CoreBluetooth
import Foundation

var optAll = false, optCopy = false, optRaw = false, timeout = 20.0
var args = CommandLine.arguments.dropFirst()
while let a = args.popFirst() {
    switch a {
    case "--all": optAll = true
    case "--copy": optCopy = true
    case "--raw": optRaw = true
    case "--timeout": timeout = Double(args.popFirst() ?? "") ?? timeout
    case "-h", "--help":
        print("usage: ganmac [--all] [--copy] [--raw] [--timeout seconds]"); exit(0)
    default:
        FileHandle.standardError.write("ganmac: unknown option \(a)\n".data(using: .utf8)!); exit(2)
    }
}

func fail(_ msg: String) -> Never {
    FileHandle.standardError.write("ganmac: \(msg)\n".data(using: .utf8)!); exit(1)
}

final class Scanner: NSObject, CBCentralManagerDelegate {
    var central: CBCentralManager!
    var seen = [UUID: String]()
    var scanning = false

    override init() {
        super.init()
        central = CBCentralManager(delegate: self, queue: nil)
    }

    func centralManagerDidUpdateState(_ c: CBCentralManager) {
        switch c.state {
        case .poweredOn:
            scanning = true
            print("Scanning. Turn a face of the cube to wake it up.")
            c.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey: true])
        case .unauthorized:
            fail("no Bluetooth permission. Allow it for your terminal app in System Settings > Privacy & Security > Bluetooth.")
        case .poweredOff: fail("Bluetooth is off.")
        case .unsupported: fail("this Mac has no Bluetooth LE.")
        default: break
        }
    }

    func centralManager(_ c: CBCentralManager, didDiscover p: CBPeripheral,
                        advertisementData ad: [String: Any], rssi: NSNumber) {
        let name = (ad[CBAdvertisementDataLocalNameKey] as? String) ?? p.name ?? ""
        guard ["GAN", "MG", "AiCube"].contains(where: { name.hasPrefix($0) }) else { return }
        // Some advertisements carry no manufacturer data. Wait for one that does.
        guard let md = ad[CBAdvertisementDataManufacturerDataKey] as? Data, md.count >= 8 else { return }
        // CoreBluetooth gives the company code (2 bytes, little-endian), then the data. The MAC
        // address is the last six of the first nine data bytes, in reverse order.
        let b = [UInt8](md)
        let company = UInt16(b[0]) | UInt16(b[1]) << 8
        let data = Array(b[2..<min(b.count, 11)])
        let mac = data.suffix(6).reversed().map { String(format: "%02X", $0) }.joined(separator: ":")
        if seen[p.identifier] == mac { return }
        seen[p.identifier] = mac
        print("\(name)  \(mac)")
        if company & 0xFF != 0x01 {
            print("  Note: company code 0x\(String(format: "%04X", company)) is not of the form 0xNN01 that GAN uses. Check this address.")
        }
        if optRaw {
            print("  manufacturer data: \(b.map { String(format: "%02x", $0) }.joined(separator: " ")), signal \(rssi) dBm")
        }
        if optCopy {
            let pb = Process()
            pb.executableURL = URL(fileURLWithPath: "/usr/bin/pbcopy")
            let pipe = Pipe(); pb.standardInput = pipe
            try? pb.run(); pipe.fileHandleForWriting.write(mac.data(using: .utf8)!); pipe.fileHandleForWriting.closeFile(); pb.waitUntilExit()
            print("  Copied to the clipboard.")
        }
        if !optAll { exit(0) }
    }
}

let scanner = Scanner()
DispatchQueue.main.asyncAfter(deadline: .now() + timeout) {
    if !scanner.scanning { fail("Bluetooth did not start. If macOS asked for Bluetooth permission, allow it for your terminal app, then run ganmac again.") }
    if scanner.seen.isEmpty { fail("no GAN cube found in \(Int(timeout)) s. Turn a face to wake the cube, then try again.") }
    exit(0)
}
RunLoop.main.run()
