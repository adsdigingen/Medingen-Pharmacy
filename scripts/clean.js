const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

const pathsToClean = [
  // Build and packaging outputs
  'apps/desktop/dist',
  'apps/desktop/dist-installer',
  'apps/desktop/renderer/.next',
  'apps/desktop/renderer/out',
  'apps/desktop/renderer/tsconfig.tsbuildinfo',
  'apps/desktop/server/dist',
  'packages/db/dist',
  'apps/cloud/dist',
];

const filesToClean = [
  // Obsolete config backups and metadata files
  'apps/desktop/renderer/next.config.ts.backup',
  'apps/desktop/renderer/AGENTS.md',
  'apps/desktop/renderer/CLAUDE.md',
];

console.log('=== Medingen Pharmacy Clean Script ===\n');

// Clean directories
pathsToClean.forEach((relPath) => {
  const fullPath = path.join(rootDir, relPath);
  if (fs.existsSync(fullPath)) {
    try {
      console.log(`Cleaning directory: ${relPath}`);
      fs.rmSync(fullPath, { recursive: true, force: true });
    } catch (err) {
      console.error(`Failed to clean directory ${relPath}: ${err.message}`);
    }
  }
});

// Clean single files
filesToClean.forEach((relPath) => {
  const fullPath = path.join(rootDir, relPath);
  if (fs.existsSync(fullPath)) {
    try {
      console.log(`Cleaning file: ${relPath}`);
      fs.rmSync(fullPath, { force: true });
    } catch (err) {
      console.error(`Failed to clean file ${relPath}: ${err.message}`);
    }
  }
});

console.log('\nCleanup finished successfully.');
