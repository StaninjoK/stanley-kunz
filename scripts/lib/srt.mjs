import fs from 'node:fs';

/** Parse an .srt file into [{ start: 'hh:mm:ss', seconds, text }]. */
export function parseSrt(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  return raw
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.split(/\r?\n/))
    .filter((lines) => lines.length >= 3 && lines[1].includes('-->'))
    .map((lines) => {
      const start = lines[1].split('-->')[0].trim().slice(0, 8);
      const [h, m, s] = start.split(':').map(Number);
      return { start, seconds: h * 3600 + m * 60 + s, text: lines.slice(2).join(' ').trim() };
    });
}

export const toMinSec = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
