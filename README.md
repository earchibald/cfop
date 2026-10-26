# Twistwright

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
