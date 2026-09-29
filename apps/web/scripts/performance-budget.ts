import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const SCRIPT_TAG = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const IMPORT_PATH = /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)(["'])([^"']+)\1/g;

function isJavaScriptType(attributes: string): boolean {
  const type = /\btype\s*=\s*(["'])(.*?)\1/i.exec(attributes)?.[2]?.trim().toLowerCase();
  return !type || type === 'module' || /^(?:text|application)\/(?:x-)?javascript$/.test(type);
}

function withinRoot(path: string, root: string): boolean {
  const rel = relative(root, path);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`));
}

function resolveLocalScript(reference: string, owner: string, root: string): string | undefined {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(reference)) return undefined;
  const pathname = reference.split(/[?#]/, 1)[0] ?? reference;
  const candidate = pathname.startsWith('/')
    ? resolve(root, `.${pathname}`)
    : resolve(dirname(owner), pathname);
  if (!withinRoot(candidate, root)) throw new Error(`Script escapes build directory: ${reference}`);
  return candidate;
}

/** Count gzip transfer bytes for page JavaScript, including inline code and local module imports. */
export function collectJavaScriptGzipBytes(htmlPath: string, clientRoot: string): number {
  const root = resolve(clientRoot);
  const visited = new Set<string>();
  let total = 0;

  const collectFile = (path: string): void => {
    const file = resolve(path);
    if (visited.has(file)) return;
    if (!withinRoot(file, root)) throw new Error(`Script escapes build directory: ${path}`);
    visited.add(file);
    const source = readFileSync(file, 'utf8');
    total += gzipSync(source).byteLength;
    IMPORT_PATH.lastIndex = 0;
    for (const match of source.matchAll(IMPORT_PATH)) {
      const imported = resolveLocalScript(match[2] ?? '', file, root);
      if (imported && /\.m?js$/i.test((match[2] ?? '').split(/[?#]/, 1)[0] ?? ''))
        collectFile(imported);
    }
  };

  for (const match of readFileSync(htmlPath, 'utf8').matchAll(SCRIPT_TAG)) {
    const attributes = match[1] ?? '';
    if (!isJavaScriptType(attributes)) continue;
    const source = match[2] ?? '';
    const src = /\bsrc\s*=\s*(["'])(.*?)\1/i.exec(attributes)?.[2];
    if (src) {
      const file = resolveLocalScript(src, htmlPath, root);
      if (file && /\.m?js$/i.test(src.split(/[?#]/, 1)[0] ?? '')) collectFile(file);
    } else if (source.trim()) {
      total += gzipSync(source).byteLength;
      IMPORT_PATH.lastIndex = 0;
      for (const importedMatch of source.matchAll(IMPORT_PATH)) {
        const imported = resolveLocalScript(importedMatch[2] ?? '', htmlPath, root);
        if (imported && /\.m?js$/i.test((importedMatch[2] ?? '').split(/[?#]/, 1)[0] ?? ''))
          collectFile(imported);
      }
    }
  }

  return total;
}

function listHtmlFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listHtmlFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(path);
  }
  return files;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const clientRoot = resolve(import.meta.dirname, '../dist/client');
  const budgetBytes = 30 * 1024;
  let failed = false;
  for (const htmlPath of listHtmlFiles(clientRoot)) {
    const gzipBytes = collectJavaScriptGzipBytes(htmlPath, clientRoot);
    const page = `/${relative(clientRoot, htmlPath).split(sep).join('/')}`;
    console.log(
      `${gzipBytes <= budgetBytes ? 'PASS' : 'FAIL'} ${page}: ${(gzipBytes / 1024).toFixed(2)} KiB gzip / 30 KiB`,
    );
    if (gzipBytes > budgetBytes) failed = true;
  }
  if (failed) process.exitCode = 1;
}
