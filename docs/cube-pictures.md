# Cube pictures: the plan for seven gaps

A survey of every cube picture in the app found eight gaps. This plan covers seven
of them: 1, 2, 4, 5, 6, 7 and 8. Gap 3 (top views for the 4×4) waits.

The pictures all come from `js/draw.js` and a few drawers in `app.js`, `scan.js`
and `paint.js`. The rules below keep that true: new views are new functions in
`draw.js` or `app.js`, on the same camera and the same sticker tokens.

## 1. Side view for PLL recognition

A cuber reads a PLL case from two sides: the front and the right of the top
layer ("headlights", "blocks"). The app showed PLL from the top only.

- `thumbSide(cube)` in `app.js`: the 3D view from a lower camera (yaw −40°,
  pitch 18°), with the top layer bright and the two layers under it dim.
- The details window of every PLL case (two-look and full) gets a view chip
  row under the picture: **Top** and **Side**. Top is the default.
- A choice of a What it moves part goes back to Top, as the marks live there.

## 2. Hidden faces on the 3D view

The back, the left and the bottom are hidden in the default view. A user had to
drag the cube or switch to the net.

- `hiddenFacePolys(facelets, opts)` in `draw.js`: each face that looks away
  from the camera, moved out along its normal by 2.2 cubie widths. The camera
  sees it from inside the cube, so it reads mirrored, as in a mirror behind the
  cube. It follows the drag.
- `renderCube3D(f, {hidden: true})` draws those faces first, at 55% opacity,
  and shrinks the cube so the faces fit the box.
- A **Hidden faces** chip on the player cube, above Animate. Off by default,
  saved in `cw:hidden`. Only in the 3D view.

## 4. A flat diagram for F2L

F2L cases had the 3D view only.

- `thumbF2LFlat(c)` in `app.js`: the top face and the two faces of the slot
  the pair goes into, laid out flat through the shared net (gap 8). The pair's
  corner and edge keep their colors. The centers keep theirs. Every other
  sticker is gray. A small letter names each face.
- The F2L details window gets **3D** and **Flat** view chips.

## 5. Moving case pictures

A case card was a still picture.

- A new setting, **Play case pictures**, in Settings. Off by default, saved in
  `cw:playPics`. It shows on the phone and the desktop.
- `js/loop.js`: `loopPlay(el, start, moves, opts)` turns the moves on a 3D cube
  in `el`, holds the solved cube for a moment, and starts again.
  `loopStop(el)` puts the still picture back.
- Desktop: a hover or a keyboard focus on a 3×3 case card (OLL/PLL, F2L) or a
  Reference card or row plays its algorithm in the card. The picture comes back when the pointer
  leaves.
- Phone and desktop: the details window opens on a **Play** view that loops the
  algorithm, for the 3×3 cases and the 2×2 speed cases. Top, Side, 3D and Flat
  stay one tap away.
- Reduced motion turns the loop off. The setting then does nothing.

## 6. Color Blind Assist

Color was the only cue on every picture.

- A new section in Settings, **Color Blind Assist**, with one checkbox: Show a
  letter on each sticker. Saved in `cw:cba`. It sets `body.cba`.
- `polysSVG` writes a letter (W R G Y O B) at the center of each sticker. The
  letter is hidden unless `body.cba` is set, so no picture is drawn again when
  the setting changes. The letter is dark on light stickers and white on dark
  ones.
- The same for the net (`renderNet`), the top views (`thumbTop`, `twoThumb`;
  the main tiles, not the thin side strips), the scanner net and the painter.
  HTML tiles (the painter, the face chips) get the letter from CSS.
- Gray stickers (a color that does not matter, or is not known) get no letter.

## 7. Save the picture as an image

No picture could leave the app.

- `pictureSVG(svg)` in `js/picture.js`: a standalone SVG of a picture on the
  page. It resolves every `var(--…)` color, drops what CSS hides (marks not
  chosen, letters when Color Blind Assist is off) and paints the cube
  background behind it.
- `pictureSave(svg, name)`: the SVG on a canvas at 2× size, then a PNG file.
- A **Save image** button on the player cube (top left) and in the details
  window, under the picture. The file name names the case or the seed.

## 8. One net

Three drawers drew the same net: `renderNet`, the scanner's `drawNet` and the
painter's HTML grid. The painter also held the cube yellow up in every method,
whatever cross color the solve used.

- `NET_POS` and `netCells(n, size, faces)` in `draw.js` give each sticker's
  place. `renderNet`, `drawNet` and `thumbF2LFlat` draw with it. The painter
  places its faces in its grid from `NET_POS`.
- The painter holds the 3×3 the way the solve holds it: the cross color down
  (`crossRotation()`). That is yellow up for the beginner method, a white cross
  and the lab, as before; white up for a yellow cross; and so on. `paintHold()`
  names the turn, `heldToEngineFacelets` follows it, and the dialog's words name
  the two colors.

## Tests

`test/pictures.js` covers the pure parts: the side view's bright layer, the
hidden faces (one per face that looks away, none when off), the F2L flat
diagram (the pair in color, the rest gray), the letters, the shared net and
`pictureSVG` (no `var(` left, hidden marks gone). The page tests check the
Settings window, the chips and the view row.
