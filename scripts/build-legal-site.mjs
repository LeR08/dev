/**
 * Generates the public legal pages from src/data/legal/content.ts.
 *
 *     node scripts/build-legal-site.mjs
 *
 * Google Play requires a privacy policy reachable at a public URL, outside the
 * app. The obvious way to produce one is to paste the text into a web page —
 * and then it silently diverges from the app the first time either is edited.
 * So this reads the same module the app renders and emits static HTML from it;
 * the two cannot disagree.
 *
 * Output goes to docs/, which GitHub Pages can serve directly (repo Settings →
 * Pages → Source: main /docs). Any static host works — the pages have no
 * dependencies, no scripts required to read them, and no external requests.
 *
 * Each document is one page carrying all eight languages. That keeps one
 * canonical URL per document — the store listing wants a single link, not
 * eight — with a switcher on top; without JavaScript every language is simply
 * shown in sequence, so the text is always readable.
 */

import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs');

const LOCALES = ['en', 'fr', 'es', 'de', 'it', 'pt', 'zh', 'ar'];
const LOCALE_NAMES = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  zh: '中文',
  ar: 'العربية',
};
const RTL = new Set(['ar']);

const DOCS = [
  { id: 'privacy', file: 'privacy.html' },
  { id: 'terms', file: 'terms.html' },
  { id: 'notice', file: 'notice.html' },
  // Google Play requires a publicly reachable account-deletion page for any
  // app that lets people create an account, and it has to be reachable without
  // installing the app — someone who has already uninstalled it still has a
  // right to erasure.
  { id: 'deleteAccount', file: 'delete-account.html' },
];

/**
 * content.ts has no imports of its own, so it compiles standalone.
 *
 * It is copied out to a temp directory first: tsc refuses to take a file
 * argument while a tsconfig.json is in scope (TS5112), and the repo's own
 * config targets the app, not a plain Node import.
 */
async function loadContent() {
  const tmp = mkdtempSync(join(tmpdir(), 'legal-'));
  try {
    copyFileSync(join(ROOT, 'src/data/legal/content.ts'), join(tmp, 'content.ts'));
    execFileSync(
      'npx',
      ['tsc', 'content.ts', '--module', 'esnext', '--target', 'es2022', '--moduleResolution', 'bundler'],
      { cwd: tmp, stdio: 'pipe' }
    );
    return await import(join(tmp, 'content.js'));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const escape = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function renderDoc(doc, locale) {
  const sections = doc.sections
    .map(
      (section) => `        <section>
          <h2>${escape(section.heading)}</h2>
${section.body.map((p) => `          <p>${escape(p)}</p>`).join('\n')}
        </section>`
    )
    .join('\n');

  return `      <article class="doc" data-locale="${locale}" lang="${locale}"${
    RTL.has(locale) ? ' dir="rtl"' : ''
  }>
        <h1>${escape(doc.title)}</h1>
        <p class="intro">${escape(doc.intro)}</p>
${sections}
      </article>`;
}

function page({ docId, content, updated }) {
  const titles = LOCALES.map((l) => content[l][docId].title);
  const switcher = LOCALES.map(
    (l) =>
      `      <button type="button" data-target="${l}" class="lang">${escape(LOCALE_NAMES[l])}</button>`
  ).join('\n');

  const articles = LOCALES.map((l) => renderDoc(content[l][docId], l)).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(titles[0])} — TYA</title>
<meta name="description" content="${escape(titles[0])} for the TYA alcohol tracking app.">
<style>
  :root {
    --bg: #F7F5F2; --surface: #FFFFFF; --text: #1C1A17; --muted: #6E675F;
    --border: #E4DFD7; --accent: #4240C7; --accent-soft: #E8E8FC;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #14120F; --surface: #1E1B18; --text: #F3EFE9; --muted: #A9A099;
      --border: #332E2A; --accent: #9698F5; --accent-soft: #28284F;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 2rem 1rem 5rem;
    background: var(--bg); color: var(--text);
    font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  main { max-width: 46rem; margin: 0 auto; }
  .masthead { margin-bottom: 2rem; }
  .app-name { font-weight: 700; letter-spacing: -0.02em; font-size: 1.1rem; }
  .updated { color: var(--muted); font-size: 0.85rem; margin-top: 0.25rem; }
  nav { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 1.25rem 0 2rem; }
  .lang {
    font: inherit; font-size: 0.9rem; cursor: pointer;
    padding: 0.35rem 0.8rem; border-radius: 999px;
    border: 1px solid var(--border); background: var(--surface); color: var(--muted);
  }
  .lang[aria-current="true"] { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); font-weight: 600; }
  .doc {
    background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
    padding: 1.75rem; margin-bottom: 1.5rem;
  }
  h1 { font-size: 1.6rem; line-height: 1.25; margin: 0 0 0.75rem; letter-spacing: -0.02em; }
  h2 { font-size: 1.05rem; margin: 1.75rem 0 0.4rem; }
  .intro { color: var(--muted); margin: 0; }
  p { margin: 0 0 0.6rem; overflow-wrap: break-word; }
  footer { max-width: 46rem; margin: 2.5rem auto 0; color: var(--muted); font-size: 0.85rem; }
  a { color: var(--accent); }
  /* Without JavaScript every language stays visible, so the text is never
     hidden behind a script that failed to run. */
  .js .doc { display: none; }
  .js .doc.is-active { display: block; }
</style>
</head>
<body>
<main>
  <div class="masthead">
    <div class="app-name">TYA</div>
    <div class="updated">Last updated: ${escape(updated)}</div>
  </div>

  <nav aria-label="Language">
${switcher}
  </nav>

${articles}
</main>

<footer>
  <p>TYA is published by LaSolutionDigital.
  Contact: <a href="mailto:romainlambert@lasolutiondigital.com">romainlambert@lasolutiondigital.com</a></p>
  <p><a href="./privacy.html">Privacy Policy</a> · <a href="./terms.html">Terms of Service</a> · <a href="./notice.html">Legal Notice</a> · <a href="./delete-account.html">Delete Your Account</a></p>
</footer>

<script>
  document.documentElement.classList.add('js');
  var docs = document.querySelectorAll('.doc');
  var buttons = document.querySelectorAll('.lang');
  function show(locale) {
    docs.forEach(function (d) { d.classList.toggle('is-active', d.dataset.locale === locale); });
    buttons.forEach(function (b) { b.setAttribute('aria-current', String(b.dataset.target === locale)); });
    document.documentElement.lang = locale;
    try { localStorage.setItem('legal-lang', locale); } catch (e) {}
  }
  buttons.forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.target); }); });
  var known = ${JSON.stringify(LOCALES)};
  var stored = null;
  try { stored = localStorage.getItem('legal-lang'); } catch (e) {}
  var fromBrowser = (navigator.language || 'en').slice(0, 2);
  show(known.indexOf(stored) > -1 ? stored : known.indexOf(fromBrowser) > -1 ? fromBrowser : 'en');
</script>
</body>
</html>
`;
}

function indexPage(updated) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Legal — TYA</title>
<style>
  :root { --bg:#F7F5F2; --surface:#FFF; --text:#1C1A17; --muted:#6E675F; --border:#E4DFD7; --accent:#4240C7; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#14120F; --surface:#1E1B18; --text:#F3EFE9; --muted:#A9A099; --border:#332E2A; --accent:#9698F5; }
  }
  body { margin:0; padding:3rem 1rem; background:var(--bg); color:var(--text);
    font:16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  main { max-width:34rem; margin:0 auto; }
  h1 { letter-spacing:-0.02em; }
  ul { list-style:none; padding:0; }
  li { margin:0.5rem 0; }
  a { display:block; padding:1rem 1.25rem; background:var(--surface); border:1px solid var(--border);
    border-radius:12px; color:var(--accent); text-decoration:none; font-weight:600; }
  .updated { color:var(--muted); font-size:0.85rem; }
</style>
</head>
<body>
<main>
  <h1>TYA — Legal</h1>
  <p class="updated">Last updated: ${escape(updated)}</p>
  <ul>
    <li><a href="./privacy.html">Privacy Policy</a></li>
    <li><a href="./terms.html">Terms of Service</a></li>
    <li><a href="./notice.html">Legal Notice</a></li>
    <li><a href="./delete-account.html">Delete Your Account</a></li>
  </ul>
</main>
</body>
</html>
`;
}

const { LEGAL_CONTENT } = await loadContent();
const updated = new Date().toISOString().slice(0, 10);

mkdirSync(OUT, { recursive: true });
for (const { id, file } of DOCS) {
  writeFileSync(join(OUT, file), page({ docId: id, content: LEGAL_CONTENT, updated }), 'utf8');
  console.log('wrote docs/' + file);
}
// Tells GitHub Pages to serve the files as-is rather than running them through
// Jekyll, which would drop anything it mistakes for a template.
writeFileSync(join(OUT, '.nojekyll'), '', 'utf8');
writeFileSync(join(OUT, 'index.html'), indexPage(updated), 'utf8');
console.log('wrote docs/index.html');
