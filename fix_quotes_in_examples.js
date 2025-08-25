const fs = require('fs');
const path = require('path');

const repoRoot = __dirname;
const examplesDir = path.join(repoRoot, 'frontend', 'src', 'examples');

function fixFile(fp) {
  let code = fs.readFileSync(fp, 'utf8');
  const before = code;
  // Normalize mixed quotes on components-template imports
  code = code.replace(/from\s+'components-template\/(.*?)"/g, (m, p1) => `from 'components-template/${p1}'`);
  code = code.replace(/from\s+"components-template\/(.*?)'/g, (m, p1) => `from "components-template/${p1}"`);
  if (code !== before) {
    fs.writeFileSync(fp, code, 'utf8');
    console.log('Fixed quotes:', path.relative(repoRoot, fp));
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (stat.isFile() && full.endsWith('.js')) fixFile(full);
  }
}

if (fs.existsSync(examplesDir)) walk(examplesDir);
console.log('Done fixing quotes.');
