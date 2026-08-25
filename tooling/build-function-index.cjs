const fs = require('fs');
const path = require('path');

const root = process.cwd();
const targets = ['Active', 'android modif/TSPModul/lib', 'android modif/TSPModul/test', 'tools'];
const exts = new Set(['.js', '.html', '.dart', '.py']);
const outDir = path.join(root, 'graphify-out');

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ['build', '.dart_tool', 'ephemeral'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (exts.has(path.extname(entry.name))) acc.push(full);
  }
  return acc;
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function lineNo(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function collectFunctions(file) {
  const text = fs.readFileSync(file, 'utf8');
  const found = [];
  const patterns = [
    /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g,
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g,
    /^\s*(?:static\s+)?(?:Future|Stream|Widget|void|int|double|bool|String|Map|List|dynamic)\s+([A-Za-z_$][\w$]*)\s*\(/gm,
    /^\s*def\s+([A-Za-z_][\w]*)\s*\(/gm,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text))) {
      found.push({ name: match[1], file: rel(file), line: lineNo(text, match.index) });
    }
  }
  return found;
}

fs.mkdirSync(outDir, { recursive: true });
const files = targets.flatMap((target) => walk(path.join(root, target))).sort();
const functions = files.flatMap(collectFunctions);
const unique = [];
const seen = new Set();
for (const fn of functions) {
  const key = `${fn.file}:${fn.line}:${fn.name}`;
  if (!seen.has(key)) {
    seen.add(key);
    unique.push(fn);
  }
}

const grouped = new Map();
for (const fn of unique) {
  if (!grouped.has(fn.file)) grouped.set(fn.file, []);
  grouped.get(fn.file).push(fn);
}

let md = '# TSP Modul Function Index\n\n';
md += `Generated: ${new Date().toISOString()}\n\n`;
md += `Files scanned: ${files.length}\n\n`;
md += `Functions indexed: ${unique.length}\n\n`;
md += 'Use this before broad code reads. Open the target file and line instead of scanning entire runtime files.\n\n';
for (const [file, list] of [...grouped.entries()].sort()) {
  md += `## ${file}\n\n`;
  for (const fn of list.sort((a, b) => a.line - b.line || a.name.localeCompare(b.name))) {
    md += `- \`${fn.name}\` - line ${fn.line}\n`;
  }
  md += '\n';
}

fs.writeFileSync(path.join(outDir, 'FUNCTION_INDEX.md'), md, 'utf8');
fs.writeFileSync(path.join(outDir, 'function-index.json'), JSON.stringify({ generatedAt: new Date().toISOString(), files: files.map(rel), functions: unique }, null, 2), 'utf8');
console.log(`Function index: ${unique.length} functions across ${files.length} files`);
