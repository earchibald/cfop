# The phone stage

The stage view (`docs/stage-view.md`) is for a computer: the cube fills the page and the panels
are sheets beside it. A phone has no room for that. Until 1.86 a phone got the old column: the
cube, the timer, the moves, Patterns, the CFOP plan, and only then the section itself. The
lesson, the hint or Next case sat three screens down, and the cube went off the top as soon as
you reached them.

1.86 gives the phone its own stage (`js/phone.js`, `css/phone.css`), for the CFOP tabs with a
cube (Cross, F2L, OLL · PLL, Lab).

## What matters most on a phone

1. The cube. It stays in view.
2. The section's own drill: the Cross lesson, the F2L hint, Next case and Reveal.
3. The trainer on the cube (Cross Trainer, F2L Trainer, OLL · PLL Trainer) and its chips.
4. The moves and the timer, one tap away.
5. The rest (Patterns, the CFOP plan, the smart cube sheet), one tap away.

## The layout

- **The section bar.** The rail is a bar at the foot of the screen, for both methods: five
  sections, each a color square over its name. It replaces the menu button. Theme is back in the
  top bar, and the cube chip shows the cube's name where the section title was.
- **The cube box** sticks under the top bar on a screen 640px tall or more. On a shorter screen
  it scrolls with the page, in the same order.
- **The switch** under the cube picks one sheet: the section (named for it), Moves · Timer, or
  More. A section change shows the section. Moves sent to the player (Step through on cube, a
  case's solution) show Moves · Timer.
- **The chips.** The hold row stays on the picture. Under the picture, in rows: the trainer's
  button, then its Show chips, Overlay, and for F2L-1 the ways and the pairs. The other chips
  (Animate, Hidden faces, the view, Tilt, Virtual cube, Save image, Fullscreen) show with their
  names on the "..." button, so no chip covers the cube.

## How it is built

CSS alone places everything: `#cubeSlot` and `#player` are `display:contents`, so the scramble
pill, the cube box, the switch, the section, the moves, the timer and `#everyMore` are items of
`main.main`, placed with `order`. `body[data-msheet]` hides the sheets not in view. Nothing moves
in the document, so the modules that own those panels do not know about it.

`js/phone.js` adds the switch and the "..." button, keeps `body.mst` and `body[data-msheet]`, and
measures the cube box (`--phcube`) for the switch that sticks under it.

## Not done

- The beginner method keeps its own phone layout; only the section bar is new there.
- The menu (`renderMenu` in `app.js`) is still in the code, with no button on a phone.
- The Keys window of the virtual cube floats as on a computer. It works by touch, and it can
  cover the section bar until you drag it.
- Some text still says "keyboard" or "click" on a phone (the cube menu's virtual cube card).
- Not yet tried on a real iPhone: the sticky cube with Safari's moving toolbar, and the safe
  area under the section bar.
