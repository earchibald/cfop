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

New scramble (the third row in the session, beside Drill mode; a chip on the page) puts a random
scramble on the picture the same way (`questScramble`: 20 random moves, set up as held, over the
real cube with `setup · P0⁻¹ · P`), so the user can solve a fresh scramble without scrambling the
real cube. It ends Drill mode first. Solved: "Solved!" with "New scramble in 2…", "New scramble in
1…", then another; the count of solves goes on. Real cube state (`questRealState`, off while the
picture is the real cube) ends a drill or a scramble and asks the cube for its state again, so the
picture shows its own stickers as they are now, with nothing on the list.

### The voice

While Drill mode is on, the page listens (`quest/voice.js`). A case name drills that case: every
two-look OLL and PLL case and every PLL ("T perm", "Sune", "anti sune", "headlights", "chameleon",
"double sune", "U a perm", "G a perm"). The same name, "again" or "next" sets the case up again.
"Stop drill" ends Drill mode; "stop" alone does nothing, so a misheard word does not end it. The
panel's last line (the line under the cube on the page) says what was heard and what it did.

The Smart cube tab's cube commands work here too (`js/smart-words.js`, shared with
`js/smart-listen.js`). The hold: "yellow up", "green front", "top yellow, front green", "green
toward me", "bottom white"; one color alone keeps the other where it can, as the hold tiles do, and
a new hold sets the case up for it. A turn of the whole cube: "x prime", "turn y", "z two", which
moves the hold. "Clear moves" empties the list. "Reset" sets the case up again and, while the tilt
is live, lines the picture up with the cube (Level). A command must be the whole of what was said,
so a color word in talk does nothing. Vosk is told these phrases too (`questVoiceCubePhrases`),
with no letter alone: say "turn x" or "x prime", not "x".

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
there. In the Quest app (below) the page hears through the headset's own speech service instead,
so the app's build leaves `quest/voice/` out. The older WebView app (`quest/android/`) has no
microphone; there the line says the voice is in the new app or the Quest Browser.

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

## The Quest app (Spatial SDK): the real app

`quest/spatial/` is Twistwright as a Horizon OS app, built with Meta's Spatial SDK (0.14.0, Kotlin,
Gradle). It needs no Mac and no browser: the cube over the headset's Bluetooth, the voice through
the headset's own speech service, and the cube in the room in passthrough.

- **The page is a panel.** The Quest page (`quest/index.html`, built in and served by `Pages.java`
  as the WebView app serves it) floats in the room as a panel, and keeps all the logic: the cube's
  link (`js/bridge.js` over `BleBridge.java`), the moves, Drill mode, New scramble, the stage, the
  hold, the matcher. Hands work on it as on any panel: point or poke. Its grab bar carries it.
- **The app draws the cube** beside the panel, and it moves with the panel (`CubeView.kt`): 26 cubies
  and 54 stickers as boxes, the layer of a move part way through its turn. `quest/native.js` sends
  the geometry once (`questNativeGeometry`) and a frame at each change of the picture
  (`questNativeFrame`: the facelets before the move, the move, how far it has turned, the tilt or
  the hold). The page's own 3D preview, the WebXR buttons and Hidden faces are off in the app
  (`body.native`). The page's frame is right-handed with z toward you, the scene's has z away from
  you; `CubeView.scene()` turns each pose over z.
- **The voice** (`QuestSpeech.kt`, `window.TwistwrightSpeech`): Android's `SpeechRecognizer` on
  the headset's speech service. Horizon OS has one: on a Quest 3 (Android 14, build UP1A.231005.007.A1, seen 2026-10-30),
  `com.oculus.systemintelligence` registers "HzOS Speech On Device Recognition Service" as the
  default. The app asks for the microphone when Drill mode first starts, then listens one sentence at
  a time while Drill mode is on, biased to the case names and the commands
  (`EXTRA_BIASING_STRINGS`, `questVoiceBias`). The page reads the alternatives with the same matcher
  as the other two recognizers (`questVoiceNative` in `quest/voice.js`). If the default service will
  not bind, it falls back to the on-device recognizer.
- It installs over the WebView app (same id, `com.twistwright.quest`, a higher `versionCode`), so the
  pages keep their storage.

```sh
quest/spatial/build.sh --install     # stage the pages, build with Gradle, install over adb, open
quest/spatial/build.sh --logs        # the app's log and the page's console
```

The build needs a JDK 17 and the Android SDK with platform 34 (as below); Gradle comes through the
wrapper (9.4.1) and the Spatial SDK from Maven Central, so the first build needs the network. No
Android Studio and no Spatial Editor: the scene is made in code. `chrome://inspect` shows the
panel's page while the headset is on adb.

What a probe app found on the headset (2026-10-30): `isRecognitionAvailable` is false and
`isOnDeviceRecognitionAvailable` is true, but a plain `createSpeechRecognizer` works: the system
binds it to `OnDeviceRecognitionService` (both of its services say `exported=false`, so an app cannot
bind it itself). The microphone counts only while the app is in front, worn (`RECORD_AUDIO` is a
foreground app-op): with nobody in the headset every try ends in error 9. Then the service said
"Models are not available for language: en-US - requires download" (error 13), so `QuestSpeech`
asks for the model once (`triggerModelDownload`) and tries again every 5 s, and the page's line says
the headset is getting it. If it never comes, look in the headset's settings for voice commands or
dictation, which may fetch it.

Checked: the build; the app installs over the WebView app and starts; `test/quest.js` drives the
page with a fake app (the geometry, the frames, the voice's events). Not yet seen on a headset: the
first sentence heard, the panel and the cube's place and size, the turn of the cube's frame, the cube
over Horizon OS Bluetooth. (`adb shell am broadcast -a com.oculus.vrpowermanager.prox_close` wakes a
headset nobody wears, but a launch waits while a Guardian dialog shows.)

## The Quest app (WebView): the first try

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
