# Changelog

## [2026-01-24]

### Added
- **Email-based authentication** with magic links (passwordless sign-in)
- **User accounts** for saving preferences across devices
- **Onboarding flow** for new users to select favorite sports and spots
- **User menu** in header showing account info and sign out option
- **Profile page** where users can edit name, favorite sports, and favorite spots
- **Server-side preference sync** - sport selection automatically saves for authenticated users
- **Favorite spots ordering** - user's favorite spots now appear first in the feed
- **Professional HTML email template** with Waterman branding
- **6-digit verification codes** for easy PWA authentication
  - Magic link emails include both clickable link and 6-digit code
  - "Enter code instead" option on the magic link sent screen
  - Simple code input for signing in to PWA apps
  - Solves cross-browser PWA authentication without complex token copying
  - Codes are valid for 15 minutes (same as magic links)
- Session management with 30-day expiry
- Automatic cleanup of expired magic links and sessions
- Rate limiting for magic link requests to prevent abuse

### Changed
- App now supports both authenticated and anonymous users
- Anonymous users can still use all features without signing in
- Sport preferences sync across devices for authenticated users
- Improved error messages throughout auth flow with helpful guidance
- Enhanced rate limiting to only count active (unused/unexpired) magic links

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
