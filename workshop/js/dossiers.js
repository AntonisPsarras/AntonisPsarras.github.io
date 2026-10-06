/* ==========================================================================
   dossiers.js — one source of truth for project copy.

   The portfolio's index.html already contains every project dossier
   (#mcontent-ag … #mcontent-gs). Rather than duplicating that copy, the
   workshop fetches the page (same origin), parses it inertly with DOMParser
   and *rebuilds* each dossier element by element through a strict allowlist.
   Nothing from the fetched document is inserted directly, no HTML strings
   are ever assigned, and only https:/mailto: links survive.
   ========================================================================== */
import { PROJECTS, PROJECT_IDS, ICON_PATHS } from './content.js';

const TAGS = new Set(['DIV', 'SPAN', 'P', 'H3', 'OL', 'UL', 'LI', 'A', 'BUTTON', 'STRONG', 'EM', 'BR']);
const ATTRS = new Set(['class', 'aria-label', 'aria-hidden', 'data-icon', 'href', 'lang']);
const CLASS_RE = /^[a-z][a-z0-9_-]{0,40}$/i;
const SVG_NS = 'http://www.w3.org/2000/svg';

let pending = null;

export function preloadDossiers() {
  if (!pending) {
    pending = fetch('../index.html', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((text) => {
        // The parsed document inherits this page's CSP; drop presentational
        // style attributes first so the (inert) parse doesn't report them.
        const clean = text.replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/gi, '');
        const doc = new DOMParser().parseFromString(clean, 'text/html');
        const map = {};
        for (const id of PROJECT_IDS) {
          const el = doc.getElementById(`mcontent-${id}`);
          if (el) map[id] = el;
        }
        return map;
      })
      .catch((err) => {
        console.warn('[workshop] project dossiers unavailable, using summaries:', err.message);
        return {};
      });
  }
  return pending;
}

/* Returns a DocumentFragment ready to insert into the modal body. */
export async function buildDossier(id) {
  if (!Object.hasOwn(PROJECTS, id)) throw new Error('unknown project');
  const map = await preloadDossiers();
  const frag = document.createDocumentFragment();
  const src = map[id];
  if (src) {
    for (const child of src.childNodes) {
      const node = sanitize(child, 0);
      if (node) frag.appendChild(node);
    }
  }
  if (!frag.querySelector('.modal-title')) return fallbackDossier(id);
  injectIcons(frag);
  return frag;
}

function sanitize(node, depth) {
  if (depth > 14) return null;
  if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent);
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  if (!TAGS.has(node.tagName)) return null;

  const el = document.createElement(node.tagName.toLowerCase());
  for (const attr of Array.from(node.attributes)) {
    const name = attr.name.toLowerCase();
    if (!ATTRS.has(name)) continue;
    const value = attr.value;
    if (name === 'href') {
      const safe = safeHref(value);
      if (safe) el.setAttribute('href', safe);
    } else if (name === 'class') {
      const cls = value.split(/\s+/).filter((c) => CLASS_RE.test(c));
      if (cls.length) el.setAttribute('class', cls.join(' '));
    } else if (name === 'data-icon') {
      if (Object.hasOwn(ICON_PATHS, value)) el.setAttribute('data-icon', value);
    } else if (name === 'aria-hidden') {
      if (value === 'true' || value === 'false') el.setAttribute(name, value);
    } else {
      el.setAttribute(name, value.slice(0, 160));
    }
  }
  if (el.tagName === 'A') {
    if (!el.hasAttribute('href')) return textOnly(node);
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener noreferrer');
  }
  if (el.tagName === 'BUTTON') el.setAttribute('type', 'button');

  for (const child of node.childNodes) {
    const c = sanitize(child, depth + 1);
    if (c) el.appendChild(c);
  }
  return el;
}

function textOnly(node) {
  const span = document.createElement('span');
  span.textContent = node.textContent;
  return span;
}

function safeHref(value) {
  try {
    const url = new URL(value, 'https://antonispsarras.github.io/');
    if (url.protocol === 'https:' || url.protocol === 'mailto:') return url.href;
  } catch { /* fall through */ }
  return null;
}

export function injectIcons(root) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    const paths = ICON_PATHS[el.getAttribute('data-icon')];
    if (!paths || el.querySelector('svg')) return;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    for (const d of paths) {
      const p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', d);
      svg.appendChild(p);
    }
    el.appendChild(svg);
  });
}

/* Minimal card from content.js when the homepage can't be read. */
function fallbackDossier(id) {
  const p = PROJECTS[id];
  const frag = document.createDocumentFragment();
  const meta = el('div', 'modal-meta-row', [el('span', 'modal-sys-id', p.sys)]);
  const titles = el('div', 'modal-title-group', [el('h3', 'modal-title', p.title), el('p', 'modal-tagline', p.tagline)]);
  const links = el('div', 'modal-links');
  for (const [label, href] of p.links) {
    const a = el('a', 'card-link', label);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    links.appendChild(a);
  }
  const more = el('p', 'details-block-text', 'The full dossier lives on the portfolio’s projects section.');
  frag.append(meta, titles, links, more);
  return frag;
}

function el(tag, cls, content) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (typeof content === 'string') n.textContent = content;
  else if (Array.isArray(content)) n.append(...content);
  return n;
}
