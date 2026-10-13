// Mirror checks for scope-webmcp-adapter. src/ is copied from the
// production repo, where it is built and tested; this verifies the copy:
// every file parses as TypeScript/TSX, and no file carries non-ASCII
// punctuation (em/en dashes, smart quotes, ellipsis).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const BANNED = /[–—‘’“”…]/;
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(name)) files.push(p);
  }
})("src");

let failed = 0;
for (const file of files) {
  const text = readFileSync(file, "utf8");
  const out = ts.transpileModule(text, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ES2022 },
  });
  for (const d of out.diagnostics ?? []) {
    failed++;
    console.error(`${file}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`);
  }
  text.split("\n").forEach((line, i) => {
    if (BANNED.test(line)) {
      failed++;
      console.error(`${file}:${i + 1}: non-ASCII punctuation`);
    }
  });
}
for (const doc of ["README.md"]) {
  readFileSync(doc, "utf8").split("\n").forEach((line, i) => {
    if (BANNED.test(line)) {
      failed++;
      console.error(`${doc}:${i + 1}: non-ASCII punctuation`);
    }
  });
}
if (files.length === 0) {
  console.error("no source files found under src/");
  process.exit(1);
}
console.log(`${files.length} files checked, ${failed} problem(s)`);
process.exit(failed ? 1 : 0);
