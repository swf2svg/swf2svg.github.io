import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const PREFERRED_DEFAULT = 'limewire.svg';

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function prettyName(filename) {
  return filename.replace(/_/g, ' ').replace(/\.svg$/i, '');
}

function toSlug(filename) {
  const base = filename
    .toLowerCase()
    .replace(/\.svg$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'svg';
}

function collectSvgFiles(cwd) {
  const entries = readdirSync(cwd);
  return entries
    .filter((name) => extname(name).toLowerCase() === '.svg')
    .filter((name) => {
      try {
        return statSync(join(cwd, name)).isFile();
      } catch {
        return false;
      }
    })
    .sort((a, b) => a.localeCompare(b, 'en'));
}

function buildIdMap(files) {
  const counts = new Map();
  const idMap = new Map();

  for (const file of files) {
    const base = toSlug(file);
    const seen = (counts.get(base) || 0) + 1;
    counts.set(base, seen);
    const unique = seen === 1 ? base : `${base}-${seen}`;
    idMap.set(file, `view-${unique}`);
  }

  return idMap;
}

function buildHtml(files) {
  const defaultFile =
    files.find((name) => name.toLowerCase() === PREFERRED_DEFAULT.toLowerCase()) || files[0] || '';
  const idMap = buildIdMap(files);

  const cards = files
    .map((file, index) => {
      const id = idMap.get(file);
      const isDefault = file === defaultFile;
      const defaultClass = isDefault ? ' default' : '';
      return `      <a class="card${defaultClass}" href="#${id}" title="${escapeHtml(file)}" aria-label="Show ${escapeHtml(prettyName(file))}"><span class="card-index">${String(index + 1).padStart(2, '0')}</span><span class="card-title">${escapeHtml(prettyName(file))}</span></a>`;
    })
    .join('\n');

  const panelOrder = defaultFile
    ? [...files.filter((file) => file !== defaultFile), defaultFile]
    : [];

  const panels = panelOrder
    .map((file) => {
      const id = idMap.get(file);
      const defaultClass = file === defaultFile ? ' viewer-default' : '';
      return `      <object id="${id}" class="viewer-frame${defaultClass}" type="image/svg+xml" data="${escapeHtml(file)}">
        <p class="fallback">Your client doesn't support SVG even though it could without any danger.<br><strong>Raise your voice to get this changed.</strong></p>
      </object>`;
    })
    .join('\n');

  const activeRules = files
    .map((file) => {
      const id = idMap.get(file);
      return `      body:has(#${id}:target) .card[href="#${id}"] {
        background: var(--active-bg);
        color: var(--active-text);
        border-color: #fff;
        font-weight: 700;
      }`;
    })
    .join('\n\n');

  const noSvgMessage = `      <div class="empty">No SVG files found in this directory.</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>swf2svg</title>
  <meta property="og:title" content="swf2svg" />
  <meta property="og:image" content="${escapeHtml(defaultFile || 'limewire.svg')}" />
  <meta property="og:image:type" content="image/svg+xml" />
  <style>
    :root {
      --bg: #000;
      --panel-bg: #070707;
      --panel-line: #4b4b4b;
      --text: #fff;
      --muted: #b8b8b8;
      --active-bg: #fff;
      --active-text: #000;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: var(--bg);
      color: var(--text);
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      display: grid;
      grid-template-columns: 1fr 300px;
    }

    main {
      min-width: 0;
      min-height: 0;
      background: var(--bg);
    }

    .viewer-stack {
      width: 100%;
      height: 100%;
      position: relative;
    }

    .viewer-frame {
      display: none;
      width: 100%;
      height: 100%;
      border: none;
      background: var(--bg);
      position: absolute;
      inset: 0;
    }

    .viewer-default {
      display: block;
    }

    .viewer-frame:target {
      display: block;
    }

    .viewer-frame:target ~ .viewer-default {
      display: none;
    }

    .fallback {
      color: #d2d2d2;
      text-align: center;
      padding: 24px;
      line-height: 1.5;
    }

    .empty {
      width: 100%;
      height: 100%;
      display: grid;
      place-items: center;
      color: #d2d2d2;
      padding: 24px;
      text-align: center;
    }

    aside {
      border-left: 2px solid #fff;
      background: var(--panel-bg);
      display: grid;
      grid-template-rows: auto 1fr;
      min-height: 0;
    }

    .sidebar-header {
      border-bottom: 1px solid var(--panel-line);
      padding: 10px 10px 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .sidebar-header h2 {
      font-size: 0.82rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-weight: 700;
    }

    .sidebar-header span {
      color: var(--muted);
      font-size: 0.74rem;
      white-space: nowrap;
    }

    .list {
      overflow: auto;
      padding: 6px;
      display: grid;
      align-content: start;
      gap: 4px;
    }

    .card {
      text-decoration: none;
      border: 1px solid var(--panel-line);
      background: #111;
      color: var(--text);
      width: 100%;
      min-height: 28px;
      padding: 4px 6px;
      border-radius: 4px;
      display: grid;
      grid-template-columns: 22px 1fr;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      text-align: left;
      transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
    }

    .card:hover {
      background: #1f1f1f;
      border-color: #fff;
    }

    .card:focus-visible {
      outline: 2px solid #fff;
      outline-offset: 1px;
    }

    .card.default {
      background: var(--active-bg);
      color: var(--active-text);
      border-color: #fff;
      font-weight: 700;
    }

    @supports selector(body:has(*)) {
      body:has(.viewer-frame:target) .card.default {
        background: #111;
        color: var(--text);
        border-color: var(--panel-line);
        font-weight: 400;
      }

${activeRules}
    }

    .card-index {
      opacity: 0.75;
      font-size: 0.72rem;
      font-variant-numeric: tabular-nums;
      text-align: right;
    }

    .card-title {
      font-size: 0.76rem;
      line-height: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media (max-width: 900px) {
      body {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr 180px;
      }

      aside {
        border-left: 0;
        border-top: 2px solid #fff;
      }
    }
  </style>
</head>
<body>
  <main>
    <div class="viewer-stack">
${panels || noSvgMessage}
    </div>
  </main>

  <aside>
    <div class="sidebar-header">
      <h2>Library</h2>
      <span>${files.length} items</span>
    </div>
    <div class="list">
${cards}
    </div>
  </aside>
</body>
</html>
`;
}

const cwd = process.cwd();
const svgFiles = collectSvgFiles(cwd);
const html = buildHtml(svgFiles);

writeFileSync(join(cwd, 'svgs.json'), JSON.stringify(svgFiles, null, 2));
writeFileSync(join(cwd, 'index.html'), html);

console.log(`Wrote ${svgFiles.length} SVG names to svgs.json and index.html`);
