import fs from 'node:fs';
import YAML from 'yaml';

/** Split a Markdown/MDX file into { data, body, raw }. */
export function readFrontmatter(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!m) return { data: {}, body: raw, raw, yaml: '' };
  return { data: YAML.parse(m[1]) ?? {}, body: m[2], raw, yaml: m[1] };
}

/**
 * Set top-level scalar keys in the frontmatter while keeping the rest of the file (comments, order, formatting) intact.
 * Existing keys are replaced in place; new keys are inserted after `afterKey` (or at the end).
 */
export function setFrontmatterKeys(file, values, afterKey) {
  const { raw } = readFrontmatter(file);
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!m) throw new Error(`No frontmatter in ${file}`);
  let lines = m[1].split(/\r?\n/);
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}: ${YAML.stringify(value).trim()}`;
    const idx = lines.findIndex((l) => l.startsWith(`${key}:`));
    if (idx >= 0) lines[idx] = line;
    else {
      const at = afterKey ? lines.findIndex((l) => l.startsWith(`${afterKey}:`)) : -1;
      if (at >= 0) lines.splice(at + 1, 0, line);
      else lines.push(line);
    }
  }
  const out = raw.replace(m[0], `---\n${lines.join('\n')}\n---`);
  fs.writeFileSync(file, out);
}

export function writeFile(file, data, body) {
  fs.writeFileSync(file, `---\n${YAML.stringify(data).trim()}\n---\n\n${body.trim()}\n`);
}
