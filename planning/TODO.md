# TODO List

Future improvements and features to implement later.

## High Priority

### Deep Links for PWA Authentication
- **What**: Implement iOS Universal Links / Android App Links for direct PWA authentication
- **Why**: Allow magic links to open directly in the Safari PWA instead of default browser
- **Requirements**:
  - Dedicated domain (currently using waterman.radx.dev subdomain)
  - Apple App Site Association file (`.well-known/apple-app-site-association`)
  - Android Digital Asset Links file (`.well-known/assetlinks.json`)
  - Configure domain with proper certificates
- **Blocks**: Need dedicated domain (e.g., `waterman.app`)
- **Related**: Auth PRD, session token transfer is current workaround

## Medium Priority

(To be added)

## Low Priority

(To be added)

---

**Last Updated**: 2026-01-24
