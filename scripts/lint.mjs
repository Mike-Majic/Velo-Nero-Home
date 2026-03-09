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

function validateHtmlStructure(file, html) {
  const problems = [];

  const openHtml = [...html.matchAll(/<html\b/gi)].length;
  const closeHtml = [...html.matchAll(/<\/html>/gi)].length;
  const openBody = [...html.matchAll(/<body\b/gi)].length;
  const closeBody = [...html.matchAll(/<\/body>/gi)].length;

  if (openHtml !== 1 || closeHtml !== 1) {
    problems.push(`Expected exactly 1 <html> and 1 </html>, found ${openHtml} / ${closeHtml}`);
  }
  if (openBody !== 1 || closeBody !== 1) {
    problems.push(`Expected exactly 1 <body> and 1 </body>, found ${openBody} / ${closeBody}`);
  }

  const iHtmlOpen = html.search(/<html\b/i);
  const iHeadOpen = html.search(/<head\b/i);
  const iHeadClose = html.search(/<\/head>/i);
  const iBodyOpen = html.search(/<body\b/i);
  const iBodyClose = html.search(/<\/body>/i);
  const iHtmlClose = html.search(/<\/html>/i);

  if (!(iHtmlOpen >= 0 && iHeadOpen >= 0 && iHeadClose > iHeadOpen && iBodyOpen > iHeadClose && iBodyClose > iBodyOpen && iHtmlClose > iBodyClose)) {
    problems.push("Invalid head/body/html tag order");
  }

  if (iHtmlClose >= 0) {
    const trailing = html.slice(iHtmlClose + "</html>".length).trim();
    if (trailing.length > 0) {
      problems.push("Unexpected content found after </html>");
    }
  }

  const scriptsOpen = [...html.matchAll(/<script\b/gi)].length;
  const scriptsClose = [...html.matchAll(/<\/script>/gi)].length;
  if (scriptsOpen !== scriptsClose) {
    problems.push(`Mismatched <script> tags: ${scriptsOpen} openings vs ${scriptsClose} closings`);
  }

  return problems.map((p) => `${file}: ${p}`);
}

const targets = [];
const htmlStructureFailures = [];

for (const dir of jsDirs) {
  try {
    if (statSync(dir).isDirectory()) targets.push(...walkJs(dir));
  } catch {}
}

for (const file of htmlFiles) {
  try {
    const html = readFileSync(file, "utf8");
    htmlStructureFailures.push(...validateHtmlStructure(file, html));
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

if (failures.length || htmlStructureFailures.length) {
  console.error("Lint failed. Issues found:\n");
  for (const f of failures) {
    console.error(`--- ${f.file} ---`);
    console.error(f.error.trim());
    console.error("");
  }
  if (htmlStructureFailures.length) {
    console.error("HTML structure problems:\n");
    for (const p of htmlStructureFailures) console.error(`- ${p}`);
    console.error("");
  }
  process.exit(1);
}

console.log(`OK: checked ${targets.length} script files for syntax.`);
