import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, extname } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "vn-lint-"));

const jsDirs = ["api", "lib", "scripts"];
const htmlFiles = ["index.html", "diario.html", "comandi.html", "utenti.html", "logs.html"];

function walkJs(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkJs(full));
    else if (st.isFile() && extname(name) === ".js") out.push(full);
  }
  return out;
}

function checkFile(path) {
  execFileSync("node", ["--check", path], { stdio: "pipe" });
}

const targets = [];
for (const dir of jsDirs) {
  try {
    if (statSync(dir).isDirectory()) targets.push(...walkJs(dir));
  } catch {}
}

for (const file of htmlFiles) {
  try {
    const html = readFileSync(file, "utf8");
    const rx = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    let i = 0;
    while ((m = rx.exec(html))) {
      i += 1;
      const p = join(tmp, `${file.replace(/\W+/g, "_")}_${i}.js`);
      writeFileSync(p, `${m[1]}\n//# sourceURL=${file}:script:${i}\n`, "utf8");
      targets.push(p);
    }
  } catch {}
}

const failures = [];
for (const t of targets) {
  try {
    checkFile(t);
  } catch (err) {
    failures.push({ file: t, error: String(err?.stderr || err?.message || err) });
  }
}

rmSync(tmp, { recursive: true, force: true });

if (failures.length) {
  console.error("Lint failed. Syntax errors found:\n");
  for (const f of failures) {
    console.error(`--- ${f.file} ---`);
    console.error(f.error.trim());
    console.error("");
  }
  process.exit(1);
}

console.log(`OK: checked ${targets.length} script files for syntax.`);
