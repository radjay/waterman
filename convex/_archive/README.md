# Archived Migration Scripts

This directory contains one-time migration and data update scripts that have been executed and are no longer needed in the active codebase.

## Scripts

### `fixConfig.ts`
One-off script to update all spot configs with direction ranges (315-135 degrees).
**Status**: Executed - Historical reference only

### `updateStats.ts`
Duplicate of `fixConfig.ts` - same functionality (update directionFrom/directionTo).
**Status**: Executed - Historical reference only

### `updateCarcavelosConfig.ts`
One-off script to update Carcavelos surf spot configuration with correct wave direction range.
**Status**: Executed - Historical reference only

### `migrate.ts`
Migration script to add `sports` array field to existing spots and normalize sport names to lowercase.
**Status**: Executed - Historical reference only

### `addLiveReports.ts`
One-off data update script to add live report URLs to spots.
**Status**: Executed - Historical reference only

### `addWebcams.ts`
One-off data update script to add webcam URLs and stream sources to spots.
**Status**: Executed - Historical reference only

## Note
These scripts are kept for historical reference only. Do not run them again as they may cause data inconsistencies or duplicate updates.

