const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function run() {
  if (process.platform !== 'linux') {
    console.error('This script must be run on Linux (snap baseline).');
    process.exit(1);
  }

  let stdout = '';
  try {
    stdout = execFileSync('snap', ['list'], { encoding: 'utf8' });
  } catch (e) {
    console.error('Failed to run `snap list`. Is snap installed and running?');
    process.exit(1);
  }

  const lines = stdout.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const names = [];
  for (const line of lines.slice(1)) {
    const name = line.split(/\s+/)[0];
    if (!name || name === 'Name') continue;
    names.push(name);
  }

  const pkgs = Array.from(new Set(names.map(n => n.toLowerCase()))).sort();
  const outPath = path.resolve(__dirname, '..', 'electron', 'snap-baseline.json');

  fs.writeFileSync(outPath, JSON.stringify(pkgs, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${pkgs.length} snaps to ${outPath}`);
}

run();
