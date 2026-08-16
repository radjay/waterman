# Changelog

## [2026-08-16]

### Fixed
- Spot forecast Today (from Next): desktop places the webcam beside the WIND / WAVES & TIDE / SCORE stack so the charts are no longer a full-width empty column; mobile keeps a stacked layout with the cam above the charts.
- Spot forecast Today’s WIND band plots live station wind the same way NOW does (dots / line over the forecast).
- Spot forecast Today charts support hover and tap-to-inspect tooltips like NOW (mouse + touch; station samples hit-test at the real reading time).

### Changed
- Future days on the spot forecast stay forecast-only; only Today gets the cam, live wind, and chart tips.
- Day-chart WIND y-axis uses 5 kt steps (e.g. 5 / 10 / 15 / 20 / 25), thinning when a denser set would crowd the band.
- Day-chart WAVES & TIDE y-axis uses 0.5 m steps (e.g. 0.5 / 1 / 1.5) instead of a single mid-scale tick.
- Chart hover tip is a stacked card (time, then station / gusts / forecast rows in legend colours) instead of a dense one-liner — same mouse hover and tap-to-inspect behaviour.

## [2026-08-15]

### Fixed
- Fullscreen cam on iPhone landscape no longer sits zoomed / clipped — overlay tracks the visible viewport so LIVE, record, close, and arrows stay on screen (pinch still works elsewhere in the app).
- Lagoa da Albufeira (and other spots still missing morning marks) tide line on NOW now covers the full day after re-scrape; scraper still keeps earlier-today highs/lows.
- Bottom nav highlight sits under one tab only — NOW, NEXT, LIVE, and MORE are four equal slots again.
- Fullscreen cam RECORD / Stop label stays dark on the white pill in night theme (readable over video).
- Fullscreen cam conditions stay a single thin bottom row in landscape on any width; portrait phone stack is tighter so the video stays visible.
- NOW wind chart: tap a point on iPhone to see the same tip and marks as desktop hover; scroll or drag over the chart does not select. Tap again or outside to dismiss.
- NOW wind-chart hover marks the selected station/forecast points on the plot (not only the tip).
- LIVE station wind overlays every cam surface that has a reading (CamFrame, fullscreen, TV mode) — same number as the wind chart, direction as TO.
- LIVE cams show Windguru and Windy shortcuts on the video (top-right, left of fullscreen), without stealing the tap that opens the cam.
- LIVE spot picker includes “All spots” (full coast) alongside “All my spots”; desktop All spots grid scrolls instead of stopping at four.
- NOW chart hover tips sit below the wind band (not covering the wind plot).
- Hovering a station wind reading shows that sample’s clock (e.g. 15:42), not the 3-hour forecast slot it falls in.
- LIVE station wind sits on the cam (top-left badge), with wind direction as TO (same as the rest of the app).
- Whole SCORE columns on the day chart link to that spot’s report for today (not only the digits).
- Webcam images open the fullscreen cam on click (whole frame, not only the corner button), including thumbs under NOW.
- Day-chart y-axis labels no longer sit on top of bars and lines.
- Tide scrape keeps earlier-today highs/lows so the WAVES & TIDE band covers the full charted day, not only the future.

### Changed
- Now answers one spot at a time. Swipe or tap to change the spot.
- Next shows the next windows first, then the rest of the week.
- Live puts the cam and the station line on the same card.
- Spot forecast uses the same numbers as Now, Next, and Live.
- The score on Now and Live is the score for this hour.
- The score on Next is the peak of a window.

### Added
- The four main screens share the selected spot.

---

## [2026-03-01]

### Added
- First-visit onboarding flow with sports, country, and favorite spots selection
- Settings page separate from Profile for better organization
- Request a Spot links in onboarding and Cams page

### Fixed
- Dashboard now shows conditions from all favorite spots (not just first 3)
- Dashboard Best Conditions shows all sports (not just selected sport)
- Onboarding modal no longer flashes on page load for authenticated users
- Duplicate timeslots no longer appear on Reports tab

### Changed
- Dashboard renamed to Home throughout the app
- Best conditions section shows all sports on Home page
- Live webcams section shows all favorite spots
- Profile page split into Profile (account info) and Settings (preferences)
- Account menu reorganized (removed Journal, added Settings and Request a Spot)
- Removed header divider lines for cleaner visual appearance
- Anonymous user preferences now stored in localStorage

---

## [2026-02-28]

### Added
- Dashboard/Home page as default landing with best conditions overview
- Live wind indicators on webcams and reports (data from Windguru)
- Kitesurfing sport with dedicated spots
- Sessions tab added to main navigation
- Request a Spot page for users to suggest new locations
- TV Mode for Cams page (full-screen 3-column grid with focus mode)
- Sport filter to Cams page
- Standard Operating Procedures (SOPs) documentation

### Fixed
- Calendar page displays conditions correctly
- .ics calendar feed no longer returns 500 errors (fixed document read limits)
- .ics calendar now supports kitesurfing
- Fullscreen webcams now use letterboxing instead of cropping
- Live wind data units corrected (knots, not m/s)
- ViewToggle - Report and Sessions tabs both showing active (fixed)
- Mobile navigation issues resolved
- TV mode webcam aspect ratio and cropping issues
- Wind direction display in live wind indicators

### Changed
- Dashboard webcams are now clickable for fullscreen viewing
- Navigation made horizontally scrollable on mobile
- Sessions page redesigned to match app aesthetic
- Live wind display redesigned (prominent badge format)
- Today's past ideal slots preserved until midnight (not filtered out by scraper updates)

---

## [2026-02-02]

### Added
- Session journal to log your wingfoiling and surfing sessions
- Compare actual conditions to forecasted conditions
- Track sessions at custom locations we don't monitor

### Fixed
- Calendar subscription shows correct wind direction
- Calendar subscription only shows daylight session times

---

## [2026-01-31]

### Added
- Scoring Debug admin page for troubleshooting scores
- Flame rating system shows condition quality at a glance (🔥 good, 🔥🔥 great, EPIC! 🔥🔥🔥)

### Fixed
- Wind direction now displays correctly in scoring debug
- Scores now display correctly on all forecast pages
- Sign-in with 6-digit code now works properly
- Mobile menu buttons now tappable
- Personalized scoring toggle updates immediately

### Changed
- Improved score reasoning tone (less surf slang)

---

## [2026-01-30]

### Added
- Personalized scoring based on your skill level and preferences
- Spot notes to save personal tips for each location
- Sunrise/sunset filtering for more accurate session times

### Changed
- Calendar subscriptions now use personalized scores when enabled
- Slots outside daylight hours shown for context only

## [2026-01-29]

### Added
- Favorite spots directly from webcam cards

### Changed
- Sticky header and tabs while scrolling
- Improved mobile menu animations
- Better webcam card interactions

## [2026-01-24]

### Added
- Calendar subscriptions for wingfoiling and surfing
- User accounts with email sign-in
- Profile page for managing preferences
- Favorite spots appear first in the feed
- 6-digit codes for easy sign-in on mobile apps

### Fixed
- Calendar feeds now show current forecast data

### Changed
- Redesigned navigation with mobile hamburger menu
- Webcam modal keyboard shortcuts (arrows, F for fullscreen, Esc to close)

---

## [2026-01-07]

### Added
- Public REST endpoint to fetch conditions data by sport and filter (`/api/conditions/[sport]/[filter]`)

---

## [2025-12-30]

### Added
- Favicon and home screen icon
- Clickable logo in header (takes you home)

### Fixed
- Improved mobile webcam view layout
- Better mobile navigation organization
- Fixed display issues on mobile devices

---

## [2025-12-29]

### Added
- Live webcam feeds from 14 spots
- Fullscreen webcam view with current conditions

### Changed
- Added Cams view alongside Report and Calendar

---

## [2025-12-28]

### Added
- AI-powered condition scoring
- Detailed score explanations showing why conditions are good or bad
- Click any forecast row to see detailed scoring breakdown

### Changed
- Better tide information display
- More accurate condition assessments

---

## [2025-12-27]

### Changed
- General improvements and bug fixes

---

## [2025-12-09]

### Changed
- Improved mobile header layout

---

## [2025-12-08]

### Added
- Last update time shown in footer

### Changed
- UI improvements and mobile layout updates

---

## [2025-12-07]

### Added
- Calendar feeds you can subscribe to
- Separate calendar feeds for wingfoiling and surfing
- Live webcam feeds for some spots

### Changed
- Improved date formatting
- Better tide display

---

## [2025-12-06]

### Added
- Initial release of Waterman
- Real-time forecast data for multiple spots
- Support for wingfoiling and surfing
- Smart filtering to show best conditions
- Tide information for surfing spots
- Responsive design for all devices

---

## Future Features

- ~~User accounts~~ ✅ Implemented 2026-01-24
- ~~Personalized preferences~~ ✅ Implemented 2026-01-24
- ~~Favorite spots~~ ✅ Implemented 2026-01-24
- Email notifications for ideal conditions
- Custom scoring prompts per user
- User-created spots (private/public)
- Social features (share conditions)
- Account settings (email change, deletion)
