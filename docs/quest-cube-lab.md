# Quest cube lab

The smart cube lab's live cube on a Meta Quest 3: `quest/index.html`, started with `quest/run.sh`.

- Architecture: https://claude.ai/artifact/525c7hhUHiwiv6qmCHf8h7
- Setup guide (Developer Mode, adb, the first session): https://claude.ai/artifact/DPxUXLhYHhbrMVg1GLxASJ

## In short

The Quest Browser has WebXR but no Web Bluetooth. The Twistwright app for macOS reads the cube, as
it does for Safari, and the headset reaches the Mac through `adb reverse`: `localhost:27272` on the
Quest is the app's page server, `localhost:27273` its bridge. `localhost` is a secure context, so
WebXR runs over plain http, and the bridge's origin check (`http://localhost:27272`) passes with no
change to the app.

The page draws with WebGL 2 and no library. `quest/core.js` is pure and `test/quest.js` checks that
every face move's layer turn lands on the next state, then drives the page over the fake bridge and
a fake WebXR session.

## Hands first

You hold the real cube in the headset, so every control works by hand tracking, with one free hand.
A controller is a second way, never the only one. To put the cube down and pick up a controller for
one action is a bad step: do not add a control that needs it.

- Two rows of buttons float under the cube, square to you: Tilt, Level, Clear, Hidden faces,
  Smaller, Larger, Hide panel; then the hold's tiles (Top: white, yellow; Front: green, orange,
  blue, red, as on the Smart cube tab) and Exit. An index fingertip presses one when it goes
  through the face from in front (`questPoke` in `quest/core.js`): once per poke, nothing from
  behind or from the side. A button lights while a fingertip is near it and flashes on the press.
- Exit asks for a second poke within 3 s ("Poke again"), so a stray fingertip does not end the
  session. The headset's own menu button ends it too.
- A third row has Drill mode (below: Drill a case), which also listens for case names.
- Hidden faces draws the faces turned away from you as in a mirror out past each face, as the
  site's `draw.js` does (`questMirror`, `questHiddenFaces`). The rows then sit lower, clear of the
  mirrors. It is the site's setting, `cw:hidden`.
- The hands are not drawn, in VR either: they hold the real cube, and the drawn joints got in the
  way. The floor and the controllers are drawn in VR.
- A pinch on the cube carries it.
- A pinch held 0.6 s away from the cube brings it back in front of you. A short pinch does nothing,
  and so does a pinch while the other hand is within 20 cm (`questHandFree`): both hands on the real
  cube are close together, and a stray pinch there must not move the twin.
- Controllers: grip carries, trigger away brings back, A tilt, B level, right stick size (its
  press: hidden faces), X clear, Y panel, the left stick's press ends the session.

The flat page has the same hold tiles and Hidden faces under the cube. It has no demo cube and no
keys: the cube is the real one, or a drill.

## Drill a case

Drill mode (the third row in the session, a chip on the page) puts a case on the picture, whatever
state the real cube is in: the last case drilled (`cw:questDrill`), Sune the first time. Each turn
of the real cube turns the picture. When the picture is solved, "Solved!" shows for 2 s (a card
in front of the cube in the session) with a count to the next one, "Sune in 2…" then "Sune in 1…",
the count of solves goes up, and the case comes again, from the real cube as it is then. Stop drill puts the real cube back in the picture.

### The voice

While Drill mode is on, the page listens (`quest/voice.js`). A case name drills that case: every
two-look OLL and PLL case and every PLL ("T perm", "Sune", "anti sune", "headlights", "chameleon",
"double sune", "U a perm", "G a perm"). The same name, "again" or "next" sets the case up again.
"Stop drill" ends Drill mode; "stop" alone does nothing, so a misheard word does not end it. The
panel's last line (the line under the cube on the page) says what was heard and what it did.

The site's Listen matcher reads the words (`js/listen-match.js`, shared with the Reference and the
Smart cube tab). A sure name wins. A tie between the sets ("T" alone) goes to the set of the case
drilled now; with none, the line asks.

The Quest Browser has no speech recognition (`webkitSpeechRecognition` is not there), so on the
headset the page hears through Vosk in WebAssembly, on the headset itself: vosk-browser and Alpha
Cephei's small US English model (Apache-2.0, `THIRD-PARTY.md`), about 47 MB in `quest/voice/`,
which git ignores. `scripts/quest-voice.js` fetches them, pinned in `package.json` under
`"questVoice"`; `quest/run.sh` runs it. Vosk is told the phrases it may hear (`questVoiceGrammar`:
each name, "perm" after a PLL name, the commands, and `[unk]` for the rest), so talk names nothing.
A letter alone is left out there: Vosk hears "uh" as U. Each OLL letter case has a name to say. The
model loads once, when Drill mode first starts (about a second on a Mac; more on the headset), and
stays for the next drill. A browser with its own speech recognition (Chrome or Safari on a Mac)
uses that; `?voice=vosk` or `?voice=speech` picks one.

Start Drill mode once on the flat page before the session, so the microphone question comes up
there. The Quest app's WebView has no microphone, so the app says the voice is for the Quest
Browser, and its build leaves `quest/voice/` out.

Checked: `test/quest.js` (every name of every case, the grammar, the commands, a fake recognizer
and a fake Vosk on the page), and headless Chrome with the real model, a case name spoken by macOS
`say` into a fake microphone. Not yet tried: the headset's microphone, and Vosk's speed on the
headset.

The picture is the case's state times the moves made since the start: `setup · P0⁻¹ · P`
(`questDrillState`), with P0 the real cube at the start and P the real cube now. The moves between
two pictures are the moves between the two real states, so the layer turns, the move list (as held)
and the stage work unchanged. The case is set up as the cube is held (`questDrillSetup`: the
inverse of the algorithm from solved, turned to the cube's own frame by the hold, `H X H⁻¹`), so a
Sune is on the top you hold up. A new hold sets the case up again. `test/quest.js` checks every case
in every hold: the algorithm done as held solves it.

`questDrill(name)` takes any case of the two-look OLL and PLL and the full PLL by its name or id
(`questDrillFind`: 'Sune', 'T perm', 'co-sune'); the voice calls it. Open: a random AUF on each
new case.

Open on a headset: how well hand tracking sees a hand that holds a cube, and whether the row is in a
good place to reach.

## The Quest app: no Mac

`quest/android/` is an Android app for the headset: the pages in a WebView, the cube over the
headset's own Bluetooth. It is the Mac app's window in Android form. `BleBridge.java` speaks the
messages of `mac/Sources/Bridge.swift`, and `shim.js` puts it behind `webkit.messageHandlers.bridge`,
so `js/bridge.js`, the site, the lab and the Quest page run with no change. The app serves the pages
built in (this checkout at build time) at `https://appassets.androidplatform.net/`, a secure context
with its own storage, and opens on a start page: Smart cube lab, Quest cube, Twistwright.

The cost: an Android WebView has no immersive WebXR. The app is a flat window in the room, not a
cube in passthrough. For the cube in 3D, use the Quest Browser with the Mac (above).

```sh
quest/android/build.sh --install     # build, install over adb, open
quest/android/build.sh --open lab/   # open the installed app on a page
quest/android/build.sh --logs        # the app's log and the pages' console
```

The build needs no Gradle and no Android Studio: a JDK 17 (`brew install openjdk@17`) and the SDK
command-line tools (`brew install --cask android-commandlinetools`, then
`sdkmanager "platforms;android-34" "build-tools;34.0.0"`). `chrome://inspect` on the Mac shows the
app's pages while the headset is on adb.

Checked in an Android 14 emulator (no cube there): the start page, the Nearby devices question on
Connect, the scan starting, the lab, the Quest page's WebGL preview, the site with random-state
scrambles from cubing.js. `test/quest.js` drives `shim.js` and `js/bridge.js` with a fake Java side
and a fake GAN cube. The emulator's software GPU gave an empty WebGL picture when the app started
straight on the Quest page; from the start page it drew. Look for that on the headset.

Not yet tried: a GAN cube over Horizon OS Bluetooth (the scan, the connect, the notifications, the
delay of a turn), and the window on the headset.

## Next

1. Run it on a headset; measure the delay from a turn to the picture.
2. Turn the layer from the move message, before the state answer lands.
3. Put the twin by the hand that holds the cube (hand tracking), or over it at 1:1.
4. Run the Quest app with a cube. If Horizon OS Bluetooth reads it well, give `BleBridge` a
   WebSocket on `ws://localhost:27273` as a relay, so the Quest Browser page gets the cube in
   passthrough with no Mac. The open question there: does the relay keep its Bluetooth link while the
   browser is in an immersive session.
