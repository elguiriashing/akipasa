# Appearance composition

The shared light/dark preference and the six owner backgrounds are independent.
Brightness, background and accent attributes live on `html`. Palette variables
must be defined there so `body` and component subtrees inherit the selected theme;
do not redeclare the brightness palette on `body`.

`src/app/appearance.css` loads after the shared brand styles. Each owner background
has light and dark surfaces, text, secondary text, borders and an ambient canvas.
Accent text colours differ from bright action fills. Fields remain opaque and
glass panels retain enough surface colour for readability. Saved preferences and
the existing background-upload flow are unchanged.

Passport inherits the same palette through `--passport-*` tokens. Its canvas,
section rail, journal, search, chapter panels and stamp details follow brightness.
The physical cover, city photography and photographic stamp overlays retain their
dark print treatment with light labels. Holographic layers and motion sensitivity
are independent of appearance.

`tests/owner-console.test.ts` checks all 12 background/brightness combinations,
all five accent text colours, secondary text contrast and the inheritance rules.
Physical gyroscope behaviour still requires a device; no sensor logic changes are
part of the theme work.
