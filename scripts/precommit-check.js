// scripts/precommit-check.js
import { execSync } from 'child_process';
import process from 'process';

// ✅ List of packages to skip (ignore updates for)
const SKIP_PACKAGES = [];

console.log('🔍 Checking for major LTS dependency upgrades...');

let outdated = {};
try {
  const raw = execSync('npm outdated --json', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore'],
  });
  outdated = JSON.parse(raw);
} catch (err) {
  if (err.stdout) {
    try {
      outdated = JSON.parse(err.stdout);
    } catch {
      console.log('✅ No outdated packages or parse error.');
      process.exit(0);
    }
  }
}

const updates = Object.entries(outdated)
  .filter(([name]) => !SKIP_PACKAGES.includes(name)) // ⛔ skip listed packages
  .map(([name, info]) => {
    let latest;
    try {
      latest = execSync(`npm show ${name} version`, {
        encoding: 'utf8',
      }).trim();
    } catch {
      return null;
    }

    const currentMajor = Number(info.current.split('.')[0]);
    const latestMajor = Number(latest.split('.')[0]);

    return currentMajor < latestMajor
      ? { name, current: info.current, latest }
      : null;
  })
  .filter(Boolean);

if (updates.length > 0) {
  console.log('❌ Major updates found:');
  updates.forEach(({ name, current, latest }) => {
    console.log(`🔸 ${name}: current=${current}, latest=${latest}`);
  });
  process.exit(1);
} else {
  console.log('✅ No major LTS updates required.');
  process.exit(0);
}
