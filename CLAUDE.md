# Twistwright — working notes for Claude Code

Twistwright is a CFOP trainer for the 3x3 cube. It is a static site with no
build step. GitHub Pages serves `main` at https://earchibald.github.io/cfop/.
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
| `js/solver.js` | Kociemba two-phase solver, `solveTwoPhase(cube, {timeMs})` |
| `js/algs.js` | Algorithm database |
| `js/app.js` | UI, trainer, timer, history, `loadScramble` |
| `js/enter.js` | Enter-a-scramble dialog, `scrambleFromCube(cube, name)` |
| `js/scan-assemble.js` | Scanner stage 5: face rotations, colour repairs, joint colour read (pure, no DOM) |
| `js/scan.js` | Scanner stages 1-4 and the Scan cube dialog |
| `js/glossary.js` | Glossary entries, links in description text, the floating card |
| `test/` | `load.js` jsdom smoke test, `glossary.js`, and the scanner tests |
| `docs/` | Design notes and handoff documents |

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
- One current scramble is shared by all tabs. A tab change never replaces it.
  `setSequence(moves, label, base, drill)` loads the player. Pass a `drill`
  name for anything that does not come from the current scramble, such as a
  case setup. The seed bar then shows a "Back to scramble" note.
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
