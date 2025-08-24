const fs = require('fs');
const path = require('path');

const repoRoot = __dirname;
const componentsDir = path.join(repoRoot, 'frontend', 'src', 'assets', 'theme', 'components');
const baseDir = path.join(repoRoot, 'frontend', 'src', 'assets', 'theme', 'base');
const functionsDir = path.join(repoRoot, 'frontend', 'src', 'assets', 'theme', 'functions');

function toPosix(p) { return p.replace(/\\/g, '/'); }
function ensureRel(spec) { return spec.startsWith('.') || spec.startsWith('/') ? spec : `./${spec}`; }

function fixFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  const dir = path.dirname(filePath);
  let modified = false;

  // assets/theme/base/*
  code = code.replace(/(from\s+["'])assets\/theme\/base\/([^"']+)(["'])/g, (m, p1, sub, p3) => {
    const abs = path.join(baseDir, sub.endsWith('.js') ? sub : `${sub}.js`);
    let rel = toPosix(path.relative(dir, abs)).replace(/\.js$/i, '');
    rel = ensureRel(rel);
    modified = true;
    return `${p1}${rel}${p3}`;
  });

  // assets/theme/functions/*
  code = code.replace(/(from\s+["'])assets\/theme\/functions\/([^"']+)(["'])/g, (m, p1, sub, p3) => {
    const abs = path.join(functionsDir, sub.endsWith('.js') ? sub : `${sub}.js`);
    let rel = toPosix(path.relative(dir, abs)).replace(/\.js$/i, '');
    rel = ensureRel(rel);
    modified = true;
    return `${p1}${rel}${p3}`;
  });

  if (modified) {
    fs.writeFileSync(filePath, code, 'utf8');
    console.log('Fixed imports:', toPosix(path.relative(repoRoot, filePath)));
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

walk(componentsDir);
console.log('Done fixing component imports.');
