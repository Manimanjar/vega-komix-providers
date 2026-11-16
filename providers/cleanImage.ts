/**
 * Vega Komix - Maximum Resolution & High-Fidelity Image URL Cleaner
 *
 * Strips all CDN resizing parameters, downscaling suffixes, and thumbnail markers
 * to guarantee 100% full original uncompressed resolution.
 *
 * Handles:
 * - Dimension suffixes: e.g. -350x476, -193x278, -1200x800
 * - WordPress auto-scale suffixes: -scaled, -scaled-1200x800
 * - CDN resizing query parameters:
 *   ?resize=..., ?w=..., ?width=..., ?h=..., ?height=..., ?quality=..., ?q=...,
 *   ?format=webp&w=..., ?strip=..., ?fit=..., ?crop=..., ?zoom=...
 */

export function cleanHighResImageUrl(url: string): string {
  if (!url) return '';
  let clean = url.trim();

  // Filter out placeholders, tracking pixels, avatars, spinners
  const lower = clean.toLowerCase();
  if (
    lower.includes('dflazy') ||
    lower.includes('1x1') ||
    lower.endsWith('.svg') ||
    lower.includes('spinner') ||
    lower.includes('loading')
  ) {
    return '';
  }

  // 1. Strip WordPress & CDN dimension suffixes from filename before extension
  // e.g., -scaled, -scaled-1200x800, -350x476, -193x278, -1200x800
  clean = clean.replace(/-scaled(?:-\d+x\d+)?(\.[a-zA-Z0-9]+)(\?|$)/i, '$1$2');
  clean = clean.replace(/-\d+x\d+(\.[a-zA-Z0-9]+)(\?|$)/i, '$1$2');

  // 2. Strip CDN downscaling & quality reduction query parameters
  try {
    const isProtocolRelative = clean.startsWith('//');
    const testUrl = isProtocolRelative ? `https:${clean}` : clean;
    if (testUrl.startsWith('http://') || testUrl.startsWith('https://')) {
      const parsed = new URL(testUrl);
      const paramsToRemove = [
        'resize',
        'w',
        'width',
        'h',
        'height',
        'quality',
        'q',
        'strip',
        'fit',
        'crop',
        'max-width',
        'max-height',
        'zoom',
      ];
      let removedAny = false;
      for (const p of paramsToRemove) {
        if (parsed.searchParams.has(p)) {
          parsed.searchParams.delete(p);
          removedAny = true;
        }
      }

      // If format=webp was passed as part of downscaling / format conversion by CDN
      if (
        parsed.searchParams.get('format') === 'webp' &&
        (removedAny ||
          parsed.hostname.includes('wp.com') ||
          parsed.hostname.includes('wordpress.com') ||
          parsed.hostname.includes('i0.wp.com') ||
          parsed.hostname.includes('i1.wp.com') ||
          parsed.hostname.includes('i2.wp.com'))
      ) {
        parsed.searchParams.delete('format');
        removedAny = true;
      }

      if (removedAny) {
        const searchStr = parsed.searchParams.toString();
        const base = `${parsed.origin}${parsed.pathname}`;
        clean = isProtocolRelative
          ? `${base.replace(/^https?:/, '')}${searchStr ? `?${searchStr}` : ''}`
          : `${base}${searchStr ? `?${searchStr}` : ''}`;
      }
    }
  } catch {
    // Regex fallback if URL constructor fails
    clean = clean.replace(
      /([?&])(?:resize|w|width|h|height|quality|q|format|strip)=[^&#]*/gi,
      '$1'
    );
    clean = clean.replace(/[?&]+$/, '').replace(/\?&/, '?');
  }

  return clean.trim();
}

export function cleanThumbnailUrl(url: string): string {
  return cleanHighResImageUrl(url);
}
