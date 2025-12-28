# Changelog

All notable changes to Waterman will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- AI-powered condition scoring system (in development)
- Changelog page to track feature updates

---

## [2025-12-28]

### Added
- Changelog page accessible at `/changelog`
- Changelog link in footer navigation

### Changed
- UI improvements: lighter borders, spacing adjustments, and surfing layout fixes

---

## [2025-12-27]

### Changed
- Refactor: Separate persistence logic from UI components and remove direction from criteria

---

## [2025-12-09]

### Changed
- Improve mobile header: smaller logo and extra top padding

---

## [2025-12-08]

### Added
- Script to remove today's scrapes
- Display most recent scrape timestamp in footer
- Historical forecast data tracking with scrape validation

### Changed
- Update UI: button styles, EPIC badge positioning, and mobile layout
- Refactor: extract utilities and create reusable components
- Comprehensive codebase cleanup and reorganization
- Improve scraper timeout handling for Render
- Handle HTTP 410 responses from Windy on Render

---

## [2025-12-07]

### Added
- Public calendar feed for ideal timeslots
- Calendar integration with iCal feeds
- Separate calendar subscriptions for wingfoiling and surfing
- Webcam support for supported spots
- Live webcam feeds with HLS video streaming
- Click to view real-time conditions at favorite locations
- Improve tide display and UI refinements

### Changed
- UX improvements: header updates, footer with calendar links, live wind reports, and dropdown arrow fixes
- Update calendar feed URLs to path-based routing and fix line breaks
- Improve date formatting and update filter UI
- Fix Puppeteer Chrome installation for Render
- Make scraper environment-aware: only use Render-specific config on Render
- Update cron schedule to run 4 times per day (every 6 hours)

---

## [2025-12-06]

### Added
- Initial release of Waterman
- Real-time weather forecast data from Windy.app for multiple water sports spots
- Automatic daily updates of forecast conditions
- Support for multiple spots across different locations
- Multi-sport support (wingfoiling and surfing)
- Wingfoiling conditions tracking with wind speed, gust, and direction requirements
- Surfing conditions tracking with wave height, period, direction, and tide information
- Easy switching between sports to view relevant forecasts
- Spots can support multiple sports simultaneously
- Smart filtering system
- Filter to see all conditions or just the ideal ones
- Sport-specific criteria automatically applied (wind direction, speed, swell, tide, etc.)
- Shows only the best times when conditions match your sport's requirements
- Forecasts grouped by day for easy planning
- Within each day, forecasts organized by spot
- Clear visual separation between different spots and time slots
- Tide information for surfing spots
- High and low tide times and heights displayed
- Tide data integrated with wave condition forecasts
- Responsive design for desktop, tablet, and mobile devices
- Mobile-optimized card layout for easy viewing on small screens
- Touch-friendly interface for mobile users
- Waterman Report frontend with newspaper theme
- Wave data filtering
- Puppeteer scraper logic with granular slots analysis
- Convex backend with schema, seed script, and spot configuration

---

## Future Features

The following features are planned for future releases:

- User accounts and authentication
- Personalized condition preferences
- Custom scoring criteria per user
- Favorite spots management
- Spot request system
- Email notifications for ideal conditions
- Multi-language support

