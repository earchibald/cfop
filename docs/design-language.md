# Design language

The cube is the design. Chrome is monochrome. Colour carries meaning.

| Part | Rule |
|---|---|
| Dark mode | A black cube with the original Rubik's stickers. Body `#0b0b0d`, panels as tiles on it, a warm white sticker as the primary button. |
| Light mode | A GAN stickerless cube on a light grey desk. Off-white panels with thin seams, the black core as the primary button. No pure white. |
| Type | Rubik for text and the timer. Azeret Mono for notation. |
| Shape | Rounded cubies: 16px panels, 10px buttons, 7px chips, hairline borders, a soft top sheen. |
| Mark | The player cube, solved, half way through R: the same view (yaw -32, pitch 28) and the same code, `cubePolys` in `js/draw.js` with `{move:'R',t:0.5}`. app.js draws it into `#mark` on load. Dark mode shows white up and red right. Light mode shows the same cube with yellow up and orange right, because white vanishes on the light desk. One SVG; `--mk-top`, `--mk-side` and `--mk-bottom` switch with the theme, and `--mk-body` is the plastic. |

## Colour means something

| Colour | Meaning |
|---|---|
| Yellow (`--accent`) | The current move, a case in learning, focus. |
| Green (`--good`) | Solved, finished, best time. |
| Red (`--bad`) | Warn, delete. |
| Orange (`--mod`, `--warn`) | A prime move, a drill, inspection. |
| Blue (`--link`) | A link. |
| White on dark, black on light (`--primary`) | The primary action. |

Each section owns a sticker, set with `data-sec` on the tab, the rail button
and the phone menu item: Solve orange, Cross white, F2L green, OLL·PLL
yellow, Lab blue, Reference red. The `.sec-sq` square and the heading mark
read `--sec`.

## Prime moves

A prime move is coloured whole, letter and mark, in bold orange on a tinted
tile. The reader must see that a move is prime without reading the mark.
`R2` is not special: it reads like `R`. The current prime move is a solid
orange tile with white text, so the signal survives the yellow highlight.

## Tokens

Sticker colours are `--sticker-W Y R O G B`, with `--sticker-X` for a sticker
that does not matter and `--sticker-line` for the gap between stickers. The
dark values are the original Rubik's stickers lifted for contrast on black;
the blue moved most. The light values follow GAN stickerless plastic as
sampled from matte product photos: a lemon yellow, a grass green with a
yellow lean, an azure blue, a true red and a yellower orange, all at full
saturation so they read as deep plastic, not faded print.
