const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function run() {
  if (process.platform !== 'linux') {
    console.error('This script must be run on Linux (dpkg/apt baseline).');
    process.exit(1);
  }

  let stdout = '';
  try {
    stdout = execFileSync('dpkg-query', ['-W', '-f=${Package}\n'], { encoding: 'utf8' });
  } catch (e) {
    console.error('Failed to run dpkg-query. Are you on Debian/Ubuntu and is dpkg installed?');
    process.exit(1);
  }

  const pkgs = Array.from(new Set(stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean))).sort();
  const outPath = path.resolve(__dirname, '..', 'electron', 'apt-baseline.json');

  fs.writeFileSync(outPath, JSON.stringify(pkgs, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${pkgs.length} packages to ${outPath}`);
}

run();
