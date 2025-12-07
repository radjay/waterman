import puppeteer from 'puppeteer';
import { execSync } from 'child_process';
import fs from 'fs';

console.log('=== Puppeteer Path Debug ===\n');

// Check where Puppeteer expects Chrome
console.log('1. Puppeteer executable path:');
try {
  const executablePath = puppeteer.executablePath();
  console.log(`   ${executablePath}`);
  
  // Check if it exists
  if (fs.existsSync(executablePath)) {
    console.log('   ✅ File exists');
  } else {
    console.log('   ❌ File does NOT exist');
  }
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

console.log('\n2. Default cache directory (from env or default):');
const defaultCacheDir = process.env.PUPPETEER_CACHE_DIR || '/opt/render/.cache/puppeteer';
console.log(`   ${defaultCacheDir}`);

console.log('\n3. Environment variables:');
console.log(`   RENDER: ${process.env.RENDER || 'not set'}`);
console.log(`   PUPPETEER_EXECUTABLE_PATH: ${process.env.PUPPETEER_EXECUTABLE_PATH || 'not set'}`);
console.log(`   PUPPETEER_CACHE_DIR: ${process.env.PUPPETEER_CACHE_DIR || 'not set'}`);

console.log('\n4. Checking common Chrome locations:');
const commonPaths = [
  '/opt/render/.cache/puppeteer/chrome/linux-143.0.7499.40/chrome-linux64/chrome',
  '/opt/render/.cache/puppeteer/chrome/linux-143.0.7499.40/chrome-linux64/chrome/chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

for (const path of commonPaths) {
  if (fs.existsSync(path)) {
    console.log(`   ✅ ${path}`);
    // Check if it's executable
    try {
      fs.accessSync(path, fs.constants.X_OK);
      console.log(`      (executable)`);
    } catch {
      console.log(`      (not executable)`);
    }
  } else {
    console.log(`   ❌ ${path}`);
  }
}

console.log('\n5. Listing Puppeteer cache directory:');
try {
  const cacheDir = defaultCacheDir;
  if (fs.existsSync(cacheDir)) {
    const entries = fs.readdirSync(cacheDir, { recursive: true });
    console.log(`   Found ${entries.length} entries:`);
    entries.slice(0, 10).forEach(entry => {
      console.log(`   - ${entry}`);
    });
    if (entries.length > 10) {
      console.log(`   ... and ${entries.length - 10} more`);
    }
  } else {
    console.log(`   ❌ Cache directory does not exist: ${cacheDir}`);
  }
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

console.log('\n6. Trying to find Chrome in cache:');
try {
  const result = execSync('find /opt/render/.cache/puppeteer -name "chrome" -type f 2>/dev/null | head -5', { encoding: 'utf-8' });
  if (result.trim()) {
    console.log('   Found:');
    result.trim().split('\n').forEach(line => {
      console.log(`   - ${line}`);
    });
  } else {
    console.log('   ❌ No chrome executable found');
  }
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

console.log('\n=== End Debug ===');

