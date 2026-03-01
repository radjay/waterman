# Changelog

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
