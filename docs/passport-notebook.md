# Explorer passport notebook

The public `/es/passports` and `/en/passports` routes now open an interactive
passport cover. Bookmarks replace the section workspace navigation. The index
links to the existing journey, routes, stamp cards and badge collection, followed
by one city photo page for every city in `majorCities`. City images and credits
come from the same catalogue as CityDiscovery. City pages indicate destinations,
not claimed visits or earned stamps; only existing verified records drive XP,
rewards, progress and badges. Existing server actions and authorization remain.

Page turns support buttons, horizontal swipes and arrow keys from the page
heading. Search ignores accents. Legacy `?view=progress|passports|stamps|badges`
links still open the requested chapter; check-in and reward feedback remains
visible above the book. The global app navigation is retained.

The photo and cover foil reuse the Holo Lab's normalized position, smoothing,
prismatic gradients, microfoil, glare and hidden branding reveal. Phone tilt
requires a user gesture and browser permission where required; denied access or
missing sensor data falls back to touch/mouse. Recenter and screen rotation reset
the neutral orientation. Reduced motion disables tilt and page animations. Foil
can be switched off, event listeners are cleaned up, hidden tabs suspend the
animation loop, and only the current city photo is mounted.

Acceptance: cover/index/chapter navigation, accent-insensitive city search,
discovery photo reuse and links, arrow page turns, mobile overflow, legacy chapter
links and reward feedback, reduced-motion behavior, denied sensor permission.
Physical gyroscope feel requires a phone check after publication.
