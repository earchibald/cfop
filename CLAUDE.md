# Twistwright — working notes for Claude Code

Twistwright is a 3x3 cube trainer with two methods: the Rubik's eight-step
beginner method and CFOP. It is a static site with no build step. GitHub Pages serves `main` at https://earchibald.github.io/cfop/.
Every push to `main` deploys in about 20 seconds.

The app was called Cubeworks. Keep these old names as they are:

- The repo slug `cfop` and the Pages URL. The owner will move them later.
- The `cw:` localStorage prefix. A new prefix would erase saved history.

## Layout

| Path | Contents |
|---|---|
| `index.html` | Page shell and markup |
| `css/app.css` | All styles |
| `js/engine.js` | `Cube` model, `parseAlg`, `applyAlg`, `invertAlg`, cross and F2L solvers, `fromFacelets` validation |
| `js/draw.js` | `cubePolys` and `renderCube3D` (the 3D view, with a layer part way through a move: `{move, t}`), `renderNet`, `moveGeom` (pure, no DOM) |
| `js/solver.js` | Kociemba two-phase solver, `solveTwoPhase(cube, {timeMs})` |
| `js/beginner.js` | Beginner method: the eight steps, triggers and algorithms as data, `solveBeginner(cube)` that follows the guide part by part, `beginnerChunks` (pure, no DOM) |
| `js/algs.js` | Algorithm database |
| `js/app.js` | UI, trainer, timer, history, `loadScramble` |
| `js/enter.js` | Enter-a-scramble dialog, `scrambleFromCube(cube, name)` |
| `js/scan-assemble.js` | Scanner stage 5: face rotations, colour repairs, joint colour read (pure, no DOM) |
| `js/scan.js` | Scanner stages 1-4 and the Scan cube dialog |
| `js/beginner-ui.js` | The method chip and its chooser, `setMethod`, `heldCube`, `begProgress`, the progress panel in the player |
| `js/learn.js` | Beginner Learn tab: the step list, the lesson pages, the Cheat sheet tab, `openLesson(n)` |
| `js/paint.js` | Paint the colours dialog, `openPaint()`, `heldToEngineFacelets` |
| `js/guide.js` | Beginner Solve my cube: the entry cards and the guided solve one part at a time, `startGuide()` |
| `js/practice.js` | Beginner Practice and Progress tabs, `startPractice(n)` |
| `js/glossary.js` | Glossary entries, links in description text, the floating card |
| `test/` | `load.js` jsdom smoke test, `draw.js` (a part turn lands on the moved cube), `tabs.js` (scramble, drills, case cards, clear dialog), `plan.js` (guided solve with rotations), `mobile.js` (phone menu), `glossary.js`, `beginner.js` (the guide's algorithms and 300 beginner solves), `method.js` (the method chip, rails, progress panel), `learn.js`, `guide.js`, `paint.js`, `practice.js` (one per beginner module), and the scanner tests |
| `docs/` | Design notes and handoff documents. `beginner-mode.md` holds the beginner method plan and its open decisions |

The scripts share one global scope. `index.html` loads them in the order
above. Add a new script with a `<script src>` tag after the one it depends on.

## Conventions

- Facelets: an array of 54 colour indices. Index `9*face + pos`, `pos` 0..8
  reads a face left to right, top to bottom. Face order is U R F D L B.
  Colour indices match: 0 white, 1 red, 2 green, 3 yellow, 4 orange, 5 blue.
  The centre of face `i` must be colour `i`.
- `fromFacelets(f)` returns `{ok, errors, cube}` with plain-English errors
  for illegal cubes.
- `scrambleFromCube(cube, name)` derives a scramble from a `Cube`, loads it,
  and switches to the Solve tab. It is the hook for the camera scanner.
- Two methods share the page. `method` is `cfop` or `beginner`; `setMethod(m)`
  switches, `body[data-method]` mirrors it, and CSS shows one rail (`#rail` or
  `#brail`) and one third player panel (timer or progress). Each method keeps
  its own last tab in `cw:tab`/`cw:btab` (`cw:mtab`/`cw:bmtab` on a phone).
  In beginner mode `crossRotation()` is always `z2`: the cube is held yellow
  up, and `heldCube()` is the scramble in that frame. `loadScramble`,
  `cycleStatus`, the tab buttons and `setMethod` fire `cw:scramble`,
  `cw:status`, `cw:tab` and `cw:method` events on `document` for the
  beginner modules. A tab that owns the player registers `tabShow[tab]`.
- One current scramble is shared by all tabs. A tab change never replaces it.
  `setSequence(moves, label, base, drill)` loads the player. Pass a `drill`
  name for anything that does not come from the current scramble, such as a
  case setup. The seed bar then shows a "Back to scramble" note.
- Case status (unlearned, learning, finished) is one map, `llState.status`,
  keyed by the OLL/PLL case id, `f2l-N` for an F2L case, or `beg-N` for a
  beginner step (0 is the basics). `stBtn(id)` draws the button and
  `cycleStatus(id)` changes it. Per-case times use the timer scopes `ll:<id>`
  and `f2l:<n>`. Beginner counts (solves, rounds practised) live in
  `cw:begProg` through `begProgress`.
- Phone layout (760px and narrower): the Reference section is the CFOP home
  screen and Learn is the beginner home. The menu button in the top bar opens
  the other sections. `goTab()` switches sections. Mark text for one layout only with `.desktop-only` or
  `.mobile-only`.
- Prose in the UI follows ASD-STE100 style: short sentences, active voice,
  one idea per sentence.
- One word per idea in the UI: "player" (the move panel), "Reveal" (show an
  answer), "details" (the case window), "solved" (not "done"), "plan" (the
  guided solve). Cubing jargon is fine if `js/glossary.js` defines it. Other
  jargon (maths, code, camera terms) is not: say it in plain words.

## Test and run

```sh
npm install        # once, for jsdom
npm test           # loads the page in jsdom and checks for script errors
npm run serve      # http://localhost:8000 — needed for camera work
```

Run `npm test` before every commit. Add a focused test under `test/` for
any new module with logic that runs without a browser.

## Commit style

Short imperative subject, body that says why. Pull before you commit; the
owner also commits from the Claude web app.
