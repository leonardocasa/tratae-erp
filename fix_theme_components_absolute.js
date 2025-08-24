const fs = require('fs');
const path = require('path');

const repoRoot = __dirname;
const themeDir = path.join(repoRoot, 'frontend', 'src', 'assets', 'theme');
const componentsDir = path.join(themeDir, 'components');

function toPosix(p) { return p.replace(/\\/g, '/'); }
function ensureRel(spec) { return spec.startsWith('.') || spec.startsWith('/') ? spec : `./${spec}`; }

function fixFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  const dir = path.dirname(filePath);
  let modified = false;

  const regex = /(from\s+["'])assets\/theme\/components\/([^"']+)(["'])/g;
  code = code.replace(regex, (m, p1, sub, p3) => {
    const abs = path.join(componentsDir, sub.endsWith('.js') ? sub : `${sub}.js`);
    let rel = toPosix(path.relative(dir, abs)).replace(/\.js$/i, '');
    rel = ensureRel(rel);
    modified = true;
    return `${p1}${rel}${p3}`;
  });

  if (modified) {
    fs.writeFileSync(filePath, code, 'utf8');
    console.log('Fixed component import:', toPosix(path.relative(repoRoot, filePath)));
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

walk(themeDir);
console.log('Done fixing assets/theme/components imports.');
