# Smart cubes

| Item | Where |
|---|---|
| Protocol, cipher, Bluetooth link | `js/gan.js` (no DOM) |
| Smart cube dialog | `js/smart-ui.js`, opened by `#smartBtn` in the seed bar (3x3 only) |
| Tests | `test/gan.js` (protocol), `test/smart-ui.js` (dialog), `test/fake-gan.js` (a fake GAN cube) |
| Saved MAC addresses | `cw:ganMac`, a map from the Bluetooth name to the address |
| MAC address helper for macOS | `tools/ganmac/` (Swift command-line tool) |

## What it does now

Version 1.2.0 reads the state of a GAN smart cube and loads a scramble that gives
the same cube, through `scrambleFromCube`. The dialog keeps the link open. While
the dialog is open, the net follows each turn: a move message triggers a new
state request 150 ms later. "My cube is solved" sends the reset command. The
reset tells the cube that its current state is solved.

The app does not use the moves themselves yet. Next steps: a timer that starts
on the first turn and stops on the solve, and a player that follows the cube.

## The GAN protocol

The facts come from gan-web-bluetooth (Andy Fedotov, MIT) and csTimer.

| Gen | Cubes | Service |
|---|---|---|
| 2 | GAN12 ui, GAN12 ui FreePlay, GAN Mini ui FreePlay, GAN356 i Carry, i Carry S, i 3, MoYu AI 2023 | `6e400001-b5a3-f393-e0a9-e50e24dc4179` |
| 3 | GAN356 i Carry 2 | `8653000a-43e6-47b7-9cb0-5fc21d4ae340` |
| 4 | GAN12 ui Maglev, GAN14 ui FreePlay | `00000010-0000-fff7-fff6-fff5fff4fff0` |

`ganOpen` picks the protocol by the service that the cube offers. A user does not
need to know which GAN 12 ui they have.

- **Cipher.** AES-128-CBC with a fixed key and IV. The six bytes of the MAC
  address, in reverse order, are added to the first six bytes of each, mod 255
  (not 256). Each message encrypts its first 16 bytes, then its last 16 bytes.
  Decryption goes in the reverse order. `js/gan.js` has its own AES, because
  `crypto.subtle` cannot decrypt one block without padding.
- **State.** The cube sends 7 corner positions (3 bits), 7 corner twists (2 bits),
  11 edge positions (4 bits) and 11 edge flips (1 bit). The last of each follows
  from the others. The order is Kociemba's, the same as `js/engine.js`, so the
  fields make a `Cube` as they are. The frame is the cube's own: white up, green
  front.
- **A wrong key.** A wrong MAC address decrypts to noise. Noise almost never
  gives two valid permutations, so `ganDecode` returns `bad`. The cube also
  cannot read a request under a wrong key, so it often stays silent. `readState`
  then rejects with `timeout`, or with `badmac` when the cube sent messages and
  none decoded.

## The MAC address

Web Bluetooth does not give the MAC address. The cube puts it at the end of its
manufacturer data, under a company code of the form `0xNN01`. Only
`watchAdvertisements()` reads that data. In Chrome on a computer it needs
`chrome://flags/#enable-experimental-web-platform-features`. Some advertisements
carry no manufacturer data, so `ganWatchMac` skips them and waits for one that does.
Where the browser cannot read it, the dialog asks the user to type it. A typed
address that works is saved by the cube's name.

### ganmac, the helper for macOS

`tools/ganmac/` holds a Swift command-line tool that prints the address. macOS
hides MAC addresses, but CoreBluetooth gives the manufacturer data, and the
tool reads the address from it the same way as `ganMacFromData`.

```sh
tools/ganmac/build.sh          # once; the binary is in .gitignore
tools/ganmac/ganmac --copy     # wake the cube; prints "GAN12uiM_A1B2  AB:12:34:56:78:9A"
```

Options: `--all` keeps scanning, `--raw` prints the manufacturer data in hex,
`--timeout N` sets the wait. The first run makes macOS ask for Bluetooth
permission for the terminal app. The binary carries an Info.plist with a
Bluetooth usage description, because macOS stops a Bluetooth tool without one.

## Browsers

Web Bluetooth works in Chrome and Edge on a computer and on Android. Safari and
Firefox do not have it. On iOS, the Bluefy browser has it. It needs a secure
page: GitHub Pages or `localhost`.
