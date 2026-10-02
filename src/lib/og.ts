import fs from 'node:fs/promises';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import type { ImageMetadata } from 'astro';

/**
 * Social preview images (1200×630 JPEG, ~100–200 KB) rendered at build time:
 * real photo on the right, title set in Fraunces on the left, quiet Stanley-Kunz branding.
 * Works for LinkedIn, X, Facebook and WhatsApp (which wants a small JPEG).
 */
const W = 1200;
const H = 630;
const root = process.cwd();
const font = (p: string) => fs.readFile(path.join(root, 'node_modules', p));

let fontsPromise: Promise<{ name: string; data: Buffer; weight: 400 | 500 | 600 | 700; style: 'normal' | 'italic' }[]> | undefined;
function fonts() {
  fontsPromise ??= Promise.all([
    font('@fontsource/fraunces/files/fraunces-latin-500-normal.woff').then((data) => ({ name: 'Fraunces', data, weight: 500 as const, style: 'normal' as const })),
    font('@fontsource/fraunces/files/fraunces-latin-400-italic.woff').then((data) => ({ name: 'Fraunces', data, weight: 400 as const, style: 'italic' as const })),
    font('@fontsource/inter-tight/files/inter-tight-latin-600-normal.woff').then((data) => ({ name: 'Inter Tight', data, weight: 600 as const, style: 'normal' as const })),
    font('@fontsource/inter-tight/files/inter-tight-latin-400-normal.woff').then((data) => ({ name: 'Inter Tight', data, weight: 400 as const, style: 'normal' as const })),
  ]);
  return fontsPromise;
}

export function fsPathOf(img: ImageMetadata): string {
  const p = (img as ImageMetadata & { fsPath?: string }).fsPath;
  if (!p) throw new Error(`OG: no file path for image ${img.src}`);
  return p.split('?')[0]!;
}

async function photoDataUri(file: string, width: number, height: number, position = '50% 50%'): Promise<string> {
  const [px, py] = position.split(' ').map((v) => parseFloat(v) / 100) as [number, number];
  const meta = await sharp(file).rotate().metadata();
  const sw = meta.autoOrient?.width ?? meta.width ?? width;
  const sh = meta.autoOrient?.height ?? meta.height ?? height;
  const scale = Math.max(width / sw, height / sh);
  const rw = Math.round(sw * scale);
  const rh = Math.round(sh * scale);
  const left = Math.round(Math.min(Math.max((rw - width) * (px ?? 0.5), 0), rw - width));
  const top = Math.round(Math.min(Math.max((rh - height) * (py ?? 0.5), 0), rh - height));
  const buf = await sharp(file).rotate().resize(rw, rh).extract({ left, top, width, height }).jpeg({ quality: 82 }).toBuffer();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

export interface OgOptions {
  title: string;
  kicker?: string;
  image?: ImageMetadata;
  imagePosition?: string;
  /** "split": photo right, text left (default). "photo": full-bleed photo with text overlay. */
  layout?: 'split' | 'photo';
}

export async function renderOg({ title, kicker, image, imagePosition, layout = 'split' }: OgOptions): Promise<Buffer> {
  const photoW = layout === 'photo' ? W : 520;
  const photo = image ? await photoDataUri(fsPathOf(image), photoW, H, imagePosition) : undefined;
  const len = title.length;
  const size = len > 90 ? 46 : len > 70 ? 52 : len > 50 ? 58 : len > 30 ? 66 : 80;
  const textW = layout === 'photo' || !photo ? 1000 : 600;

  const el = {
    type: 'div',
    props: {
      style: { width: W, height: H, display: 'flex', position: 'relative', backgroundColor: '#121110', fontFamily: 'Inter Tight' },
      children: [
        photo && {
          type: 'img',
          props: {
            src: photo,
            width: photoW,
            height: H,
            style: { position: 'absolute', right: 0, top: 0, width: photoW, height: H, objectFit: 'cover' },
          },
        },
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              inset: 0,
              display: 'flex',
              backgroundImage:
                layout === 'photo'
                  ? 'linear-gradient(90deg, rgba(18,17,16,0.92) 0%, rgba(18,17,16,0.65) 55%, rgba(18,17,16,0.15) 100%)'
                  : 'linear-gradient(90deg, #121110 0%, #121110 56%, rgba(18,17,16,0.55) 64%, rgba(18,17,16,0) 78%)',
            },
          },
        },
        {
          type: 'div',
          props: {
            style: { position: 'absolute', left: 72, top: 64, bottom: 64, width: textW, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
            children: [
              {
                type: 'div',
                props: {
                  style: { display: 'flex', alignItems: 'center', gap: 14 },
                  children: [
                    { type: 'div', props: { style: { width: 18, height: 18, borderRadius: 18, backgroundColor: '#e8ad2c' } } },
                    { type: 'div', props: { style: { fontFamily: 'Fraunces', fontWeight: 500, fontSize: 34, color: '#f1ece1', letterSpacing: -0.5 }, children: 'Stanley Kunz' } },
                  ],
                },
              },
              {
                type: 'div',
                props: {
                  style: { display: 'flex', flexDirection: 'column', gap: 22 },
                  children: [
                    kicker && {
                      type: 'div',
                      props: {
                        style: { fontSize: 22, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: '#e8ad2c' },
                        children: kicker,
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: { fontFamily: 'Fraunces', fontWeight: 500, fontSize: size, lineHeight: 1.06, letterSpacing: -1.2, color: '#f6f1e6' },
                        children: title,
                      },
                    },
                  ].filter(Boolean),
                },
              },
              {
                type: 'div',
                props: { style: { fontSize: 22, color: '#a59d8c', letterSpacing: 0.5 }, children: 'stanley.kunzglobal.com' },
              },
            ],
          },
        },
      ].filter(Boolean),
    },
  };

  // satori's typings expect React nodes; the plain object tree above is what React.createElement would produce.
  const svg = await satori(el as unknown as Parameters<typeof satori>[0], { width: W, height: H, fonts: await fonts() });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
  return sharp(png).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
}

/** Plain square-ish photo export (e.g. the Person image for structured data). */
export async function renderPhoto(image: ImageMetadata, width: number, height: number, position?: string): Promise<Buffer> {
  const uri = await photoDataUri(fsPathOf(image), width, height, position);
  return Buffer.from(uri.split(',')[1]!, 'base64');
}
