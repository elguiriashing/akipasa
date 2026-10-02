# Explorer passport notebook

The public `/es/passports` and `/en/passports` routes now open an interactive
passport cover. Bookmarks replace the section workspace navigation. The index
links to the existing journey, routes, stamp cards and badge collection, followed
by one city photo page for every city in `majorCities`. City images and credits
come from the same catalogue as CityDiscovery. City pages indicate destinations,
not claimed visits or earned stamps; only existing verified records drive XP,
rewards, progress and badges. Existing server actions and authorization remain.

Page turns support bookmarks, horizontal swipes and arrow keys from the page
heading. Search ignores accents. Legacy `?view=progress|passports|stamps|badges`
links still open the requested chapter; check-in and reward feedback remains
visible above the book. The global app navigation is retained.

The photo and cover foil reuse the Holo Lab's normalized position, smoothing,
prismatic gradients, microfoil, glare and hidden branding reveal. Phone tilt
starts automatically, centred on the first valid sensor reading. Sensor input
has 1.2× gain (20% more response), with the same maximum card tilt and foil limits. Only the photo card tilts together
with its foil; the notebook, journal and chapter controls stay steady. Browsers requiring permission still
need a user gesture; the privacy choices include a separate on-device motion tick
and Accept all requests motion permission directly from the click, before saving
cookie choices. Browser permission is distinct from cookie consent. Rejection of
optional choices also switches off motion locally. Denied access or
missing sensor data falls back to touch/mouse. Recenter and screen rotation reset
the neutral orientation. Reduced motion disables tilt and page animations. Foil
can be switched off, event listeners are cleaned up, hidden tabs suspend the
animation loop, and only the current city photo is mounted.

Acceptance: cover/index/chapter navigation, accent-insensitive city search,
discovery photo reuse and links, arrow page turns, mobile overflow, legacy chapter
links and reward feedback, reduced-motion behavior, denied sensor permission.
Physical gyroscope feel requires a phone check after publication.

Responsive layouts: phones up to 700px stack city art and journal with six chapters
in a 3-by-2 grid. Tablets from 701px to 1100px use six chapter tabs below the book;
portrait tablets stack city spreads, while landscape tablets keep two columns.
Desktop keeps the chapter bookmarks beside the two-page spread. Interactive
controls use at least 44px touch targets, city search uses 16px text to avoid phone
focus zoom, and the privacy panel scrolls within the viewport with wrapping actions.

City artwork now has two image-derived spectral planes: a cyan inverted negative
and an opposing magenta echo. Both reuse the current city photo, shift in opposite
directions with tilt, and appear through fixed lenticular masks. Alpha-only colour overlays replace
backdrop-dependent difference and colour-dodge blends to avoid black/white
compositing flashes on tilted cards. Spectral opacity stays between 0.1 and 0.3;
mask angles and filters remain static during movement. A prismatic
light sweep and directional vignette give the print depth. No new assets, image
rights, WebGL context or sensor uploads are involved. Foil OFF and reduced motion
hide every optical layer and restore the untransformed source photo.
