const fs = require('fs');
const path = require('path');

const repoRoot = __dirname;
const examplesDir = path.join(repoRoot, 'frontend', 'src', 'examples');
const compsTplDir = path.join(repoRoot, 'frontend', 'src', 'components-template');

function rewriteFile(filePath, rewriters) {
  let code = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  for (const rewrite of rewriters) {
    const newCode = rewrite(code, filePath);
    if (newCode !== code) {
      code = newCode;
      modified = true;
    }
  }
  if (modified) {
    fs.writeFileSync(filePath, code, 'utf8');
    console.log('Fixed:', path.relative(repoRoot, filePath));
  }
}

function walk(dir, cb) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, cb);
    else if (stat.isFile() && full.endsWith('.js')) cb(full);
  }
}

// 1) In examples/* change "from 'components/..." to "from 'components-template/..." for MD* modules
const rewriteExamples = (code) =>
  code.replace(/from\s+['"]components\//g, "from 'components-template/");

// 2) In components-template/* replace internal imports like "from 'components/MDX/MDXRoot'" with local "./MDXRoot"
const rewriteComponentsTemplate = (code, filePath) => {
  // Replace patterns like: from "components/MDInput/MDInputRoot" -> from "./MDInputRoot"
  return code.replace(/from\s+['"]components\/[A-Za-z0-9_-]+\/(.+?)['"]/g, (m, inner) => {
    return `from './${inner}'`;
  });
};

if (fs.existsSync(examplesDir)) {
  walk(examplesDir, (fp) => rewriteFile(fp, [rewriteExamples]));
}
if (fs.existsSync(compsTplDir)) {
  walk(compsTplDir, (fp) => rewriteFile(fp, [rewriteComponentsTemplate]));
}

console.log('Done rewrites.');
