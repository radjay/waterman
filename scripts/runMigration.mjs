#!/usr/bin/env node

/**
 * Safe migration runner with automatic backups.
 *
 * Usage:
 *   node scripts/runMigration.mjs addKitesurfing:addKitesurfingToSpots
 *
 * This script:
 * 1. Creates a manual backup of the database
 * 2. Runs the specified migration
 * 3. Reports results
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command, args = [], cwd = projectRoot) {
  return new Promise((resolve, reject) => {
    log(`\n${colors.cyan}Running: ${command} ${args.join(' ')}${colors.reset}`);

    const proc = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

async function createBackup() {
  log('\n📦 Step 1: Creating database backup...', colors.bright);
  log('IMPORTANT: Convex CLI does not support automatic exports.', colors.yellow);
  log('Please create a manual backup in the Convex dashboard before proceeding:', colors.yellow);
  log('  1. Go to https://dashboard.convex.dev/', colors.cyan);
  log('  2. Select your project → Settings → Backups', colors.cyan);
  log('  3. Click "Create Backup" to snapshot the current state', colors.cyan);

  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('\nHave you created a backup? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function runMigration(migrationPath) {
  log(`\n🔄 Step 2: Running migration: ${migrationPath}`, colors.bright);

  try {
    await runCommand('npx', ['convex', 'run', migrationPath]);
    log('✓ Migration completed successfully', colors.green);
    return true;
  } catch (error) {
    log('✗ Migration failed!', colors.red);
    log('Error: ' + error.message, colors.red);
    return false;
  }
}

async function main() {
  const migrationPath = process.argv[2];

  if (!migrationPath) {
    log('❌ Error: Migration path required', colors.red);
    log('\nUsage:', colors.bright);
    log('  node scripts/runMigration.mjs <migration:function>', colors.cyan);
    log('\nExample:', colors.bright);
    log('  node scripts/runMigration.mjs addKitesurfing:addKitesurfingToSpots', colors.cyan);
    process.exit(1);
  }

  log('\n═══════════════════════════════════════════════════════', colors.bright);
  log('🚀 Safe Migration Runner', colors.bright);
  log('═══════════════════════════════════════════════════════', colors.bright);
  log(`Migration: ${migrationPath}`, colors.cyan);
  log('═══════════════════════════════════════════════════════\n', colors.bright);

  // Step 1: Create backup
  const backupSuccess = await createBackup();

  if (!backupSuccess) {
    log('\n❌ Migration cancelled - no backup created', colors.red);
    process.exit(1);
  }

  // Step 2: Run migration
  const migrationSuccess = await runMigration(migrationPath);

  // Summary
  log('\n═══════════════════════════════════════════════════════', colors.bright);
  if (migrationSuccess) {
    log('✅ Migration completed successfully!', colors.green);
  } else {
    log('❌ Migration failed!', colors.red);
    log('\nTo restore from backup, use:', colors.yellow);
    log('  npx convex data import <backup-file.jsonl>', colors.cyan);
  }
  log('═══════════════════════════════════════════════════════\n', colors.bright);

  process.exit(migrationSuccess ? 0 : 1);
}

main().catch((error) => {
  log('\n❌ Unexpected error:', colors.red);
  console.error(error);
  process.exit(1);
});
