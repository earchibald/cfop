# Third-party code

The Twistwright page loads the libraries below at run time. They are not part of
this repository: `scripts/vendor.js` fetches them from npm into `vendor/`, which
git ignores, and the Pages workflow and `mac/build.sh` run it. `package.json`
pins each one by version and tarball integrity, under `"vendor"`.

Each library keeps its own license. The Twistwright `LICENSE` does not cover
them.

| Library | Version | License | Source |
|---|---|---|---|
| cubing.js | 0.66.1 | MPL-2.0 (offered as MPL-2.0 or GPL-3.0-or-later; Twistwright uses it under MPL-2.0) | https://github.com/cubing/cubing.js/tree/v0.66.1 |
| min2phase, the math helpers inside cubing.js (`vendor/mit/cs0x7f`) | as in cubing.js 0.66.1 | MIT | https://github.com/cs0x7f/min2phase |
| random-uint-below | 3.3.0 | Unlicense | https://github.com/lgarron/random-uint-below.js |

## What Twistwright uses them for

Random-state scrambles for the 3x3 (`js/scramble.js`). TNoodle, the WCA
scrambler, uses the same 3x3 solver (min2phase by Chen Shuang). TNoodle itself
is GPL-3.0 and is not used.

## Changes to the files

The files are as published on npm, with one change. `scripts/vendor.js` writes
each bare import (`"cubing/alg"`, `"random-uint-below"`) as a relative path, so
the search worker finds the files with no import map. It leaves out the files
that need three.js (the cubing.js 3D player and the Bluetooth module). Under
MPL-2.0, the changed files stay under MPL-2.0. The served files are the source
code: they are plain JavaScript, not minified.

## MPL-2.0

cubing.js is subject to the terms of the Mozilla Public License, v. 2.0. A copy
of the license is at https://mozilla.org/MPL/2.0/, and `scripts/vendor.js`
puts the cubing.js copy at `vendor/cubing/LICENSE-MPL.md`.

## MIT: Chen Shuang

The min2phase and 4x4 solver code inside cubing.js is offered by its author
under the MIT license, as well as the GPL-3.0
(https://github.com/cs0x7f/min2phase/issues/17). Twistwright uses it under the
MIT license:

    Copyright (c) 2023 Chen Shuang

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.

## Unlicense: random-uint-below

random-uint-below is released into the public domain under the Unlicense.
`scripts/vendor.js` keeps its `LICENSE.md` at `vendor/random-uint-below/`.
