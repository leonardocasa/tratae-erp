const fs = require('fs');
const path = require('path');

const root = __dirname;
const componentsDir = path.join(root, 'frontend', 'src', 'assets', 'theme', 'components');

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (stat.isFile() && full.endsWith('.js')) fixFile(full);
  }
}

function fixFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Replace backslashes in import specifiers
  code = code.replace(/(from\s+["'])([^"']+)(["'])/g, (m, p1, spec, p3) => {
    if (spec.includes('\\')) {
      modified = true;
      return p1 + spec.replace(/\\/g, '/') + p3;
    }
    return m;
  });

  if (modified) {
    fs.writeFileSync(filePath, code, 'utf8');
    console.log('Fixed:', path.relative(root, filePath));
  }
}

walk(componentsDir);
console.log('Done.');
