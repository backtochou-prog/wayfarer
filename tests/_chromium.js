// the Chromium the tests launch: $CHROMIUM, else the newest Playwright-installed one under ~/.cache/ms-playwright (any version), else the path the tests used to hard-code
const fs = require('fs'), path = require('path'), os = require('os');
module.exports = function chromiumPath() {
  if (process.env.CHROMIUM) return process.env.CHROMIUM;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), '.cache', 'ms-playwright');
  try {
    const dirs = fs.readdirSync(base).filter(d => /^chromium-\d+$/.test(d)).sort((a, b) => parseInt(b.slice(9), 10) - parseInt(a.slice(9), 10));
    for (const d of dirs) for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome', 'chrome-win/chrome.exe', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) { const f = path.join(base, d, sub); if (fs.existsSync(f)) return f; }
  } catch (e) {}
  return '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome';
};
