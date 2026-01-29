# Changelog

## [2026-01-29]

### Improved
- **Sticky header with smooth animations** - Header now sticks to top when scrolling with smooth logo scaling and date hiding
- **Sticky tabs and filters bar** - On desktop, the tabs and filters bar now sticks below the header for easy access
- **Sticky section date headers** - Date headers for each forecast section stick below the tabs bar on desktop
- **Mobile menu improvements** - Hamburger menu now uses smooth animations, smaller icon, and better positioning
- **Fixed background pattern** - Background wave pattern now stays fixed while content scrolls
- **Better button sizing** - Reduced button sizes in forecast sections for cleaner look
- **Improved spacing and alignment** - Better padding and spacing throughout for consistent layout

## [2026-01-24]

### Fixed
- **Calendar feeds now show current forecast data** - Fixed issue where calendar events displayed outdated conditions from old scrapes instead of the latest forecast

### Added
- **Calendar subscription feature** - Subscribe to forecast calendars in your calendar app
  - One calendar feed per sport (wingfoiling and surfing)
  - Shows best slot per day per spot (max 2 events per day)
  - Events are 1.5 hours duration (average session length)
  - Works with Google Calendar, Apple Calendar, Outlook, and other iCal-compatible apps
  - Automatic updates every 1 hour as new forecasts are scraped
  - Public feeds for anonymous users (all spots)
  - Personalized feeds for authenticated users (filtered to favorite spots)
  - New `/subscribe` page for managing calendar subscriptions
  - RFC 5545 compliant iCalendar (ICS) format
  - Events include score, conditions, reasoning, and forecast link
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
- **Improved mobile layout** - Sign-in button now appears next to tabs on mobile for better accessibility
- **Tabs and filters no longer take full width** on mobile, creating a more compact layout
- **User menu expanded** - Calendar feeds and changelog links moved from footer to account dropdown for easier access
- **Simplified footer** - Now only shows last updated timestamp
- **Redesigned navigation UI**:
  - Desktop: Auth button now fixed to top-right corner of the page (outside main container)
  - Mobile: New compact hamburger menu in top-left corner (aligned with page title)
  - Mobile: Slide-out panel with user info, profile, calendar links, changelog, and sign out
  - View toggle buttons no longer stretch to full width on mobile

### Improved
- **Webcam modal enhancements**:
  - Click outside the webcam video to close the modal (in addition to the X button)
  - Keyboard navigation: use left/right arrow keys to switch between cams
  - Press F to toggle fullscreen mode
  - Press Escape to close the modal

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
