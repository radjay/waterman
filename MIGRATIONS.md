# Database Migrations Guide

This guide explains how to safely run database migrations in the Waterman project.

## Safe Migration Runner

**Always use the safe migration runner** which automatically creates backups before running migrations.

### Usage

```bash
node scripts/runMigration.mjs <migration:function>
```

### Example

```bash
node scripts/runMigration.mjs addKitesurfing:addKitesurfingToSpots
```

### What It Does

1. **Creates a backup**: Exports the current database state to a timestamped JSONL file
2. **Runs the migration**: Executes the specified Convex mutation
3. **Reports results**: Shows success or failure with clear output

### If Something Goes Wrong

If a migration fails, you can restore from the backup:

```bash
npx convex data import backup-<timestamp>.jsonl
```

## Available Migrations

### Add Kitesurfing Sport

Adds kitesurfing as a third sport alongside wingfoiling and surfing.

```bash
node scripts/runMigration.mjs addKitesurfing:addKitesurfingToSpots
```

**What it does:**
- Updates Praia do Guincho to support wingfoil + kitesurfing + surfing
- Adds kitesurfing to Lagoa da Albufeira
- Creates or updates Fonte da Telha for all three sports
- Creates sport configs for each sport/spot combination

**After running:**
- Seed system prompts: `npx convex run seedScoringPrompts:seedSystemSportPrompts`
- Seed spot prompts: `npx convex run seedScoringPrompts:seedScoringPrompts`
- Scrape forecast data: `node scripts/scrape.mjs`

## Manual Backups

You can also create manual backups anytime:

```bash
npx convex data export --format jsonl --path backup-manual-$(date +%Y%m%d-%H%M%S).jsonl
```

## Best Practices

1. **Always backup first** - The migration runner does this automatically
2. **Test in development** - Run migrations in a dev environment first if possible
3. **Review migration code** - Understand what the migration will do before running it
4. **Monitor after migration** - Check that the app works correctly after migrating
5. **Keep backups** - Don't delete backup files until you're sure the migration succeeded

## Troubleshooting

### Migration Runner Not Found

Make sure you're in the project root directory:

```bash
cd /workspace/extra/waterman
node scripts/runMigration.mjs <migration:function>
```

### Backup Failed

If automatic backup fails, you can:
1. Create a manual backup (see above)
2. Create a backup in the Convex dashboard: https://dashboard.convex.dev/
3. Proceed with the migration (not recommended without backup)

### Migration Failed

1. Check the error message in the terminal
2. Review the migration code in `convex/` directory
3. Restore from backup if needed
4. Fix the issue and try again
