# Twistwright

## Run this checkout: start, stop, restart

```sh
scripts/dev.sh start                 # serve this checkout at http://127.0.0.1:8180/
scripts/dev.sh stop                  # stop it
scripts/dev.sh restart               # stop, then start (takes the same options as start)
scripts/dev.sh status                # running or not, and where
scripts/dev.sh log                   # follow the server log (Ctrl+C to leave)
scripts/dev.sh open                  # open the first-visit preview, /?onboard, in the browser
scripts/sync-main.sh                 # rebase this branch onto origin/main, test, restart the server
```

| Option | Applies to | What it does |
|---|---|---|
| `--port N` | `start`, `restart` | The port. Default `8180` (or `$PORT`). 8000 is left for `npm run serve` in the main checkout. |
| `--host H` | `start`, `restart` | The address to bind. Default `127.0.0.1`; `0.0.0.0` lets a phone on the same Wi-Fi in. |
| `--no-vendor` | `start`, `restart` | Skip `scripts/vendor.js` (cubing.js for random-state scrambles). Without `vendor/` scrambles are random moves. |
| `--no-test` | `sync-main.sh` | Skip `npm test` after the rebase. |
| `--push` | `sync-main.sh` | Push the rebased branch with `--force-with-lease`, to this branch only. |

- **Where to look:** `http://127.0.0.1:8180/?onboard` plays a first visit on every load (the level
  picker), with nothing saved. Without `?onboard` the page uses your saved `cw:` history.
- **No stale files:** the server (`scripts/dev-server.py`) sends `Cache-Control: no-store`, so an
  edit shows on a plain reload.
- **State:** the PID and the log live in `.dev/` (git ignores it). `restart` after a pull or an edit
  is not needed for the page, only for a change to the server script.
- **Rebasing on main:** commit first (a WIP commit is fine), then `scripts/sync-main.sh`. On a
  conflict it stops and says what to run. The onboarding work is described in
  [`docs/onboarding.md`](docs/onboarding.md).

## About

A CFOP trainer for the 3x3 cube. It is a static site with no build step.

## Run it

Open `index.html` from a local web server. The camera API needs a secure
context, so `file://` is not enough for the scanner.

```sh
npm run serve        # then open http://localhost:8000
```

The site deploys to GitHub Pages on every push to `main`.

Scrambles are random-state, from [cubing.js](https://github.com/cubing/cubing.js).
The library is not in git. `scripts/vendor.js` fetches the version pinned in
`package.json` into `vendor/` and checks it. `npm run serve`, `npm test` and the
Pages workflow run it, and a second run uses the copy already in `vendor/`.
To fetch again, run `NOCACHE=1 npm run vendor`. Without `vendor/`, the page uses
random moves.

## Layout

| Path | Contents |
|---|---|
| `index.html` | Page shell and markup |
| `css/app.css` | All styles |
| `js/engine.js` | Cube model, move parser, cross and F2L solvers, last layer, rotations |
| `js/draw.js` | Cube pictures: the 3D view, a layer part way through a move, the net |
| `js/solver.js` | Kociemba two-phase solver and facelet validation |
| `js/algs.js` | Algorithm database with recognition and breakdown text |
| `js/app.js` | UI, trainer, timer, history |
| `js/enter.js` | Enter-a-scramble dialog and `scrambleFromCube` |
| `test/load.js` | jsdom smoke test |

The scripts share one global scope and load in the order above.

## License

All rights reserved. You may read the source and use the site, but you may not
copy, change or reuse it. See [`LICENSE`](LICENSE). The libraries in `vendor/`
keep their own licenses: see [`THIRD-PARTY.md`](THIRD-PARTY.md).

## Test

```sh
npm install
npm test
```
