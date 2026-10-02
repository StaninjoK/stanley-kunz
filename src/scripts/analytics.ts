/**
 * Minimal, privacy-friendly event layer. Sends nothing unless an analytics provider was configured in
 * src/config/site.ts (which then injects its script). No cookies, no fingerprinting, no personal data.
 */
type GoatCounter = { count: (opts: { path: string; title?: string; event?: boolean }) => void };

export function track(name: string, title = ''): void {
  const gc = (window as unknown as { goatcounter?: GoatCounter }).goatcounter;
  if (gc?.count) {
    gc.count({ path: name.slice(0, 120), title: title.slice(0, 200), event: true });
  }
}
