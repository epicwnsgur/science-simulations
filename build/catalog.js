import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

export function discoverPages(root) {
  const pages = ['index.html'];
  function walk(dir) {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, e.name);
      if (e.isDirectory()) walk(path);
      else if (e.name === 'index.html') pages.push(relative(root, path).split('\\').join('/'));
    }
  }
  for (const dir of ['grades', 'simulations']) walk(join(root, dir));
  return pages.sort();
}
const route = file => '/' + file.replace(/index\.html$/, '');
function target(href, parent) {
  const url = new URL(href, 'https://catalog.local' + parent);
  if (url.origin !== 'https://catalog.local') return null;
  return url.pathname.replace(/index\.html$/, '').replace(/\/?$/, '/');
}
const attr = (s, name) => s.match(new RegExp(`\\b${name}=["']([^"']*)["']`))?.[1];
const folderLinks = html => [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)]
  .filter(m => (attr(m[1], 'class') || '').split(/\s+/).includes('folder'));

// The displayed folder links are the catalog. Count distinct reachable experiments,
// never numbers copied into a label; duplicate links and nested folders are safe.
export function readCatalog(root) {
  const pages = new Map(discoverPages(root).map(file => [route(file), readFileSync(join(root, file), 'utf8')]));
  function summary(path, ancestors = new Set()) {
    const html = pages.get(path);
    if (html === undefined) throw new Error(`목록의 페이지가 없습니다: ${path}`);
    if (ancestors.has(path)) throw new Error(`폴더 순환 연결: ${path}`);
    const stack = new Set([...ancestors, path]);
    const folders = new Set(), experiments = new Set(), pending = new Set();
    [...html.matchAll(/<article\b[^>]*class=["'][^"']*\bfuture-folder\b[^"']*["']/g)].forEach((_,i)=>pending.add(`${path}#pending-${i}`));
    for (const m of folderLinks(html)) {
      const href = attr(m[1], 'href');
      if (!href) continue;
      const next = target(href, path);
      if (!next || !/^\/(grades|simulations)\//.test(next)) continue;
      if (!pages.has(next)) throw new Error(`연결된 페이지가 없습니다: ${path} → ${next}`);
      if (next.startsWith('/simulations/')) experiments.add(next);
      else {
        folders.add(next);
        const child = summary(next, stack);
        child.experiments.forEach(p => experiments.add(p));
        child.pending.forEach(p => pending.add(p));
      }
    }
    return { folders, experiments, pending };
  }
  function label(s) {
    const parts = [];
    if (s.folders.size) parts.push(`폴더 ${s.folders.size}개`);
    if (s.experiments.size) parts.push(`실험 ${s.experiments.size}개`);
    if (s.pending.size) parts.push(`준비 중 ${s.pending.size}개`);
    return parts.join(' · ') || '실험 준비 중';
  }
  function transform(html, path) {
    if (!pages.has(path) || path.startsWith('/simulations/')) return html;
    html = html.replace(/(<span\b[^>]*class=["']available["'][^>]*>)[\s\S]*?<\/span>/g, (_, open) => `${open}${label(summary(path))}</span>`);
    return html.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/g, (all, attrs, body) => {
      if (!(attr(attrs,'class')||'').split(/\s+/).includes('folder')) return all;
      const next = target(attr(attrs,'href') || '',path);
      if (!next?.startsWith('/grades/')) return all;
      return `<a${attrs}>${body.replace(/(<span\b[^>]*class=["']grade["'][^>]*>)[\s\S]*?<\/span>/, (_,open)=>`${open}${label(summary(next))}</span>`)}</a>`;
    });
  }
  return { summary, transform };
}
