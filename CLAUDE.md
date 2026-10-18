# Twistwright — working notes for Claude Code

Twistwright is a cube trainer for the 2x2, the 3x3 and the 4x4. The 3x3 has
two methods: the Rubik's eight-step beginner method and CFOP. The 2x2 has two:
the Rubik's Mini guide and a speed section (Ortega, then CLL). The 4x4 has
two: the Rubik's Master guide and an advanced section (reduction with CFOP,
parity drills, Yau described). It is a static site with no build step. GitHub Pages serves `main` at https://earchibald.github.io/cfop/.
Every push to `main` deploys in about 20 seconds.

The app was called Cubeworks. Keep these old names as they are:

- The repo slug `cfop` and the Pages URL. The owner will move them later.
- The `cw:` localStorage prefix. A new prefix would erase saved history.

## Layout

| Path | Contents |
|---|---|
| `index.html` | Page shell and markup |
| `css/app.css` | All styles |
| `js/version.js` | `APP_VERSION`, shown in the Settings window. Loads first |
| `js/engine.js` | `Cube` model, `parseAlg`, `applyAlg`, `invertAlg`, cross and F2L solvers, `crossSolutions` (every cross solution up to a length, each counted once), `fromFacelets` validation |
| `js/two.js` | The 2x2 as the corners of the 3x3 model: `twoFacelets` (24 stickers), `twoSolved`, `twoScramble` (R U F), `twoAlign`, `twoSearch`, `buildTwoTable`, `twoOptimal`, `twoScrambleFor`, `twoFromFacelets` (pure, no DOM) |
| `js/four.js` | The 4x4 as 96 stickers with moves from geometry: `FourCube`, `fourApply`, `parseFour` (R, r, Rr, R'r', Rw, 2R), `fourSolved`, `fourScramble`, `fourToCube` (the reduced cube as a 3x3 `Cube`), `fourFromFacelets` (pure, no DOM) |
| `js/draw.js` | `cubePolys` and `renderCube3D` (the 3D view, with a layer part way through a move: `{move, t}`, and the whole cube turned: `rot`), `renderNet`, `moveGeom` (pure, no DOM) |
| `js/solver.js` | Kociemba two-phase solver, `solveTwoPhase(cube, {timeMs})` |
| `js/beginner.js` | Beginner method, from the current Rubik's solution guide (2020): the eight steps, the algorithms with their sayings as data, `solveBeginner(cube)` that follows the guide part by part, `beginnerChunks` (pure, no DOM) |
| `js/mini.js` | The 2x2 beginner method from the Rubik's Mini guide (2020): five steps, `MINI_ALGS`, `solveMini(cube)`, `miniChunks` (pure, no DOM) |
| `js/master.js` | The 4x4 beginner method from the Rubik's Master guide (2020): centers, edges, then the eight 3x3 steps with the two parity fixes; `MASTER_STEPS`, `MASTER_ALGS`, `solveMaster(fourCube)`, `masterChunks` (pure, no DOM) |
| `js/algs.js` | Algorithm database |
| `js/speed2.js` | 2x2 speed data and solvers: `ORTEGA_OLL`, `ORTEGA_PBL`, `CLL_CASES`, `twoFindStep`, `solveOrtega`, `solveCLL` (pure, no DOM) |
| `js/speed4.js` | 4x4 advanced: `FOUR_PARITY` (the three parity cases), `FOUR_LL` (outside-turn two-look sets), `solveMasterSpeed` (reduction, then CFOP with parity where it falls) (pure, no DOM) |
| `js/app.js` | UI, trainer, timer, history, `loadScramble` |
| `js/enter.js` | Enter-a-scramble dialog, `scrambleFromCube(cube, name)` |
| `js/scan-assemble.js` | Scanner stage 5 for the 3x3, the 2x2 and the 4x4: `scanSize(n)` (pieces and the 24 holdings of any size), `assembleScan` (3x3, faces by center), `assembleFree` (2x2 and 4x4, faces placed by their pieces, every fit returned), color repairs, joint color read (pure, no DOM) |
| `js/scan.js` | Scanner stages 1-4 for any face size and the Scan cube dialog: `readFace(img,{n})`, `makeVoter({n})`, `openScan({n, onCube, onClose})` |
| `js/gan.js` | GAN smart cubes over Web Bluetooth: AES-128 and the GAN cipher, the gen 2, 3 and 4 protocols, `ganDecode` (state messages to a `Cube`, the tilt as a quaternion `q`), `ganWatchMac`, `ganOpen` (the link, `readState`, `correct`: a scanned or painted state as the real one, `fix` kept as `ganFixFor(actual, raw)` and applied to every state) (no DOM) |
| `js/bridge.js` | The macOS app as a Bluetooth bridge for Safari: `bridgeProbe`, `bridgeConnect`, `BRIDGE`, `bridgeDevice` (a cube behind the bridge in the shape of a Web Bluetooth device, so `ganOpen` is unchanged) (no DOM) |
| `js/smart-ui.js` | The Smart cube dialog, `openSmart()`: connect, the chooser list over the bridge, the MAC address, the live net, My cube is solved, Scan my cube and Paint my cube (the real state through `conn.correct`, kept by cube name in `cw:ganFix`), Use this cube; `smartMode()` and the button label (Smart cube, or the download of the macOS app) |
| `js/stage.js` | The CFOP stage of a cube for the smart cube window: `cfopStage(held, prefer)` (Cross, F2L, the two-look OLL and PLL case by name, with the algorithm as held, a whole-cube turn first where the cross is not down), `cfopStageDone` (the moves of the case done so far) (pure, no DOM) |
| `js/cubetab.js` | The cube tab in the top bar while a smart cube is connected: the tab named after the cube (`smartNiceName`), the floating window with the live cube (up to four moves between two states turn their layers in a queue, `cubeTabPath`; the head drags the window, `cw:cubeWin`; six buttons under the picture turn the whole cube, x, y, z and their primes, `cubeTabTurn`: the turn goes on the list, and the hold, one of the 24 `CUBE_TAB_HOLDS`, moves on, so the moves read as held, `cubeTabRelabel`; the tilt turns the picture only, `cubeTabGyro`, lined up with the hold by a heading, `cubeTabYawBasis`, taken again by Reset view; a cube held unlike the hold for 500 ms brings the band under the picture, `cubeTabAwayCheck`, with Read as held, `cubeTabMatch`, and Keep this hold, `cubeTabKeep`; the moves under the picture, merged as they come, `cubeTabMerge`, the last ten shown, Clear moves; the stage above the picture, read after 1200 ms still, its moves hidden and shown one per 1500 ms, faded by a turn, kept while a reading falls behind it, `cubeTabBehind`), Close (Esc), the one-time callout (`cw:cubeTip`); driven by the `cw:smart` events that `smart-ui.js` fires |
| `js/beginner-ui.js` | The method chip and its chooser, `setMethod`, the beginner packs (`BEG_PACKS`, `begPack()`: steps, algorithms, solver, hold, words for the 3x3 and the 2x2), `heldCube`, `begProgress`, the progress panel in the player |
| `js/beghome.js` | Beginner home above the tabs: Up next, "What does your cube look like?" (scan, paint, mix it up, practice on the screen), the "Mix it up with me" walkthrough, the letters view, the Key panel and the captions under tiles. Owns `body[data-begview]`: `ask`, `mix` or `player` |
| `js/learn.js` | Beginner Learn tab: the step list, the lesson pages, the Cheat sheet tab, `openLesson(n)` |
| `js/paint.js` | Paint the colors dialog, `openPaint({onCube, onClose, go})`, `heldToEngineFacelets` |
| `js/guide.js` | Beginner Solve my cube: the entry cards and the guided solve one part at a time, `startGuide()` |
| `js/practice.js` | Beginner Practice and Progress tabs, `startPractice(n)` |
| `js/speed-ui.js` | The 2x2 speed tabs: Solve (Ortega and CLL plans, an optimal solution), Ortega and CLL case drills, Reference; `twoThumb` |
| `js/speed4-ui.js` | The 4x4 advanced tabs: Solve (the plan), Parity (drills), Reference |
| `js/glossary.js` | Glossary entries, links in description text, the floating card |
| `js/listen.js` | Listen, on the phone Reference section: the microphone through the browser's speech recognition, `listenCatalog` (every two-look case, the full PLL and the F2L cases with the names people say for them), `listenNormalize` and `listenMatch` (pure, no DOM), the card with the heard case, every move covered and one uncovered per second, a tap for the next, the card kept until the next name |
| `test/` | `load.js` jsdom smoke test, `two.js` (the 2x2 engine), `mini.js` (the Mini guide's algorithms and 300 solves), `speed2.js` (every Ortega and CLL algorithm, the 42 cases cover every state), `two-ui.js` (the 2x2 in the page), `four.js` (the 4x4 engine), `master.js` (the Master guide's algorithms and 40 solves), `speed4.js` (parity algorithms, outside-turn last layer, plans), `four-ui.js` (the 4x4 in the page), `draw.js` (a part turn lands on the moved cube), `tabs.js` (scramble, drills, case cards, clear dialog), `refspoil.js` (Reference spoilers: first move only, one move per click, Show all moves), `listen.js` (the case names a recognizer gives, the card one move per second, with a fake recognizer), `refmoves.js` (What it moves in the details: plain parts, a clean picture, one part at a time), `settings.js` (the Settings window and the version), `plan.js` (guided solve with rotations), `mobile.js` (phone menu), `glossary.js`, `beginner.js` (the guide's algorithms and 300 beginner solves), `method.js` (the method chip, rails, progress panel), `learn.js`, `guide.js`, `paint.js`, `practice.js`, `home.js` (one per beginner module), and the scanner tests: `scan-assemble.js` (stage 5 for all three sizes), `scan-synth.js` (synthetic faces of each size through stages 1-3), `scan-vote.js` (the voter and six faces end to end), `scan-ui.js` (the dialog for each puzzle), and the smart cube tests: `gan.js` (AES, the cipher, the three protocols), `smart-ui.js` (the dialog), `bridge.js` (the bridge, the chooser list, the download dialog), `stage.js` (the CFOP stage: every two-look case from the cube as held, the turn that brings the cross down, the moves done so far), `cubetab.js` (the cube tab, the callout, the live window, the turn buttons, the hold and the stage), with `fake-gan.js`, a fake GAN cube for `navigator.bluetooth`, and `fake-bridge.js`, a fake macOS app for `WebSocket` |
| `lab/` | The smart cube lab: a page of its own, `lab/index.html`, with a full-page live cube (turns and tilt; straight on, or three faces with the Isometric box, `cw:labIso`; a drag spins the view, `labViewDrag`, a double click puts it back), the moves in a box of their own (`labMovesDraw`, as the cube tab's readout, the newest move outlined), the hold ("I hold it <color> up, <color> toward me": `LAB_HOLDS`, `labRelabel`, kept in `cw:labHold`), Reset cube for the facing, the Patterns window (P: the two-look OLL and PLL cases the cube has shown with their moves as held, `labPatRead` through `cfopStage`, kept in `cw:labPatterns`; New scramble, N: no moves are made; the cube in the hands is the scramble, the matcher starts over with the cross on the bottom as held as its first goal, `lab.goal`, an entry counts that cross's solutions by length up to seven with the shortest ones, `labPatNew` through `crossSolutions`, and a Cross entry lists the moves when it is made), Scan my cube (the state read from the cube again, as at connect; the picture jumps there with no moves added, `labRead`; not the camera), Paint my cube (the site's painter over the lab; the real state goes to `conn.correct`, the fix to `cw:ganFix` as the site saves it, `labPaint`), and the experiments in a panel. The bar wraps onto more rows in a narrow window; the page is a grid under it. It opens as if Connect were pressed, and a cube it has connected before (`cw:labCubes`) connects by itself. `lab/helpers.js` holds the few helpers of `app.js` that the painter expects. `lab/smack.js` (pure, no DOM): the quaternion helpers, `smackDetector` (a short jolt that comes back is a smack; three on one face make a series) and `turnDetector` (the body leaves its rest pose and comes to rest again: turn start, update and finish events, logged; a rest near another hold puts that whole-cube turn on the list and moves the hold) and `twistDetector` (one face turned and turned back three times over is a gesture: Reset cube after a short wait). `lab/lab.js` the UI. `lab/version.js` holds `LAB_VERSION`, shown in the bar: raise it with any change a user of the lab can see. `lab/run.sh` runs the macOS app with `--root` on this checkout and opens `http://127.0.0.1:27272/lab/`, so Safari reaches a cube over the bridge. See `docs/smart-cube.md` |
| `mac/` | Twistwright for macOS: a menu bar app that serves the page at `http://127.0.0.1:27272/` and bridges CoreBluetooth to it over a WebSocket, for Safari; `twistwright://` links open it. `mac/build.sh` builds and signs; releases go to GitHub Releases. See `docs/smart-cube.md` |
| `docs/` | Design notes and handoff documents. `beginner-mode.md` holds the 3x3 beginner method plan and its open decisions; `two-by-two.md` the 2x2 model, both 2x2 methods and the packs; `four-by-four.md` the 4x4 model and both 4x4 methods; `scanner-handoff.md` the scanner; `smart-cube.md` the GAN protocol, the MAC address and the macOS app |

The scripts share one global scope. `index.html` loads them in the order
above. Add a new script with a `<script src>` tag after the one it depends on.

## Conventions

- Facelets: an array of 54 color indices. Index `9*face + pos`, `pos` 0..8
  reads a face left to right, top to bottom. Face order is U R F D L B.
  Color indices match: 0 white, 1 red, 2 green, 3 yellow, 4 orange, 5 blue.
  The center of face `i` must be color `i`.
- `fromFacelets(f)` returns `{ok, errors, cube}` with plain-English errors
  for illegal cubes.
- `scrambleFromCube(cube, name)` derives a scramble from a `Cube`, loads it,
  and switches to the Solve tab. It is the hook for the camera scanner and the
  smart cube.
- Six methods on three puzzles share the page. `method` is `beginner`, `cfop`,
  `mini` (2x2 beginner), `speed2` (2x2 speed), `master` (4x4 beginner) or
  `speed4` (4x4 advanced); `METHODS` in `app.js` maps
  each to a puzzle, a kind (`beg` or `speed`), a rail and a tab key. `setMethod(m)`
  switches; `body[data-method]`, `[data-kind]` and `[data-puzzle]` mirror it. CSS
  shows one rail (`#rail`, `#brail` for all beginner methods, `#srail`, `#frail`)
  and one third player panel (timer or progress). Mark text for one puzzle with
  `.three-only`, `.two-only` or `.four-only`. Each puzzle keeps its own scramble;
  the chip swaps them. Each method keeps its own last tab (`cw:tab`, `cw:btab`,
  `cw:minitab`, `cw:speedtab`, `cw:mastertab`, `cw:fourtab`, with an `m` in
  front on a phone). The beginner modules read everything method-specific from
  `begPack()`. A 2x2 state is a `Cube` whose edges and centers are ignored; a
  4x4 state is a `FourCube` (96 stickers) that `applyAlg` dispatches to;
  `puzzleCube()` gives a solved one of the current puzzle and `setDrawN(n)`
  draws it. A 4x4 move list uses the Master guide's letters (`R`, `r`, `Rr`).
  In beginner mode the solver reads `heldCube()`, the scramble after `z2`
  (yellow up), but the screen never hides that turn: a beginner starts white
  up, and the first part of the guided solve shows `z2` as its own dashed
  "turn over" tile. Every part of a plan carries `up`, the center on top
  while it is done (`'white'` for step 3, `'yellow'` otherwise); where it
  changes, the consumer shows `z2` first. The method follows the current
  Rubik's guide (`docs/beginner-mode.md` names the PDF), not an older one.
  `showScr()` hands beginner mode to `showBegScr()`, which
  shows the question instead of the player; `setSequence` fires
  `cw:sequence`, and any loaded moves switch the view to `player`.
  `loadScramble`, `cycleStatus`, the tab buttons and `setMethod` fire
  `cw:scramble`, `cw:status`, `cw:tab` and `cw:method` events on `document`
  for the beginner modules. A tab that owns the player registers
  `tabShow[tab]`.
- The player's keys read like a media player: arrows step, Shift+arrows jump
  five, Home and End go to the ends, P plays. Space is the timer in CFOP and
  play/pause in beginner mode, where there is no timer. `helpHTML()` draws the
  Keys card for the current method. A one-move step turns the layer on the 3D
  cube (`showCubeMoved`, `anim` in `app.js`); the Animate chip on the cube and
  the A key switch it, per method, saved in `cw:anim`. On by default in beginner
  mode, off in CFOP.
  Auto-step turns each move at the start of its interval, so Play shows the
  first move at once. D deletes the last time and C clears the times; both do
  nothing while the timer runs or where there is no timer. Every control with
  a key carries a `.hk` badge after its label (`<span class="hk">A</span>`);
  CSS hides the badges where there is no keyboard. Add one with any new key.
- What it moves, in the case details: `caseParts` lists the parts in plain
  words ("Two corners swap: front right, back right"), only for what the step
  cares about. The picture carries one hidden mark group per part (`moveMarks`);
  a choice of a part shows its one arrow and outlines its pieces (`mvShow`).
  The small Reference cards carry no marks. Do not put marks on a picture at rest.
- One current scramble is shared by all tabs. A tab change never replaces it.
  `setSequence(moves, label, base, drill)` loads the player. Pass a `drill`
  name for anything that does not come from the current scramble, such as a
  case setup. The seed bar then shows a "Back to scramble" note.
- Case status (unlearned, learning, finished) is one map, `llState.status`,
  keyed by the OLL/PLL case id, `f2l-N` for an F2L case, `beg-N`, `mini-N` or
  `master-N` for a beginner step (0 is the basics), a 2x2 case id (`two:oll:sune`,
  `two:pbl:adj`, `two:cll:L1`) or a 4x4 parity case (`four:oll`). `stBtn(id)` draws the button and
  `cycleStatus(id)` changes it. Per-case times use the timer scopes `ll:<id>`
  and `f2l:<n>`; 2x2 solves use `two`, 4x4 solves `four`, and a case its id.
  Beginner counts (solves, rounds practiced) live in `cw:begProg`, `cw:miniProg`
  and `cw:masterProg` through `begProgress`.
- Phone layout (760px and narrower): the Reference section is the CFOP home
  screen and Learn is the beginner home. The menu button in the top bar opens
  the other sections. `goTab()` switches sections. Mark text for one layout only with `.desktop-only` or
  `.mobile-only`.
- Prose in the UI follows ASD-STE100 style: short sentences, active voice,
  one idea per sentence. American spelling: color, center, practice,
  counterclockwise, gray.
- One word per idea in the UI: "player" (the move panel), "Reveal" (show an
  answer), "details" (the case window), "solved" (not "done"), "plan" (the
  guided solve). Cubing jargon is fine if `js/glossary.js` defines it. Other
  jargon (math, code, camera terms) is not: say it in plain words.

## Test and run

```sh
npm install        # once, for jsdom
npm test           # loads the page in jsdom and checks for script errors
npm run serve      # http://localhost:8000 — needed for camera work
```

Run `npm test` before every commit. Add a focused test under `test/` for
any new module with logic that runs without a browser.

## Version

`APP_VERSION` in `js/version.js` is the version a report names; the Settings
window shows it. Raise it in the same commit as any change a user can see:
the last number for a fix, the middle number for a new feature. Change the
`version` in `package.json` to match; `test/settings.js` fails if they differ.

## Commit style

Short imperative subject, body that says why. Pull before you commit; the
owner also commits from the Claude web app.
