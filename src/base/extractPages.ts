import { cleanHighResImageUrl } from './cleaner';

/**
 * Universal high-resolution chapter page extractor
 * Audits all page images, filters decorative/tracking assets, and strips downscale CDN parameters
 */
export function extractPages($: any, baseUrl: string, customSelectors: string[] = []): any[] {
  const pages: any[] = [];
  const seenUrls = new Set<string>();

  const defaultSelectors = [
    '.reading-content img',
    '.page-break img',
    '.entry-content img',
    '.wp-manga-chapter-img',
    '.post-content img',
    '.single-content img',
    '.wp-block-image img',
    'figure img',
    'div.text-left img',
    'img.size-full',
  ];

  const selectors = [...customSelectors, ...defaultSelectors].join(', ');

  $(selectors).each((_: number, el: any) => {
    const rawSrc = (
      $(el).attr('data-orig-file') ||
      $(el).attr('data-full-url') ||
      $(el).attr('data-src') ||
      $(el).attr('data-lazy-src') ||
      $(el).attr('data-original') ||
      $(el).attr('src') ||
      ''
    ).trim();

    if (!rawSrc) return;

    const lower = rawSrc.toLowerCase();
    if (
      lower.includes('logo') ||
      lower.includes('avatar') ||
      lower.includes('gravatar') ||
      lower.includes('banner') ||
      lower.includes('1x1') ||
      lower.includes('spinner') ||
      lower.includes('loading') ||
      lower.includes('dflazy') ||
      lower.endsWith('.svg')
    ) {
      return;
    }

    const cleanSrc = cleanHighResImageUrl(rawSrc);
    if (!cleanSrc || seenUrls.has(cleanSrc)) return;
    seenUrls.add(cleanSrc);

    const fullUrl = cleanSrc.startsWith('//')
      ? `https:${cleanSrc}`
      : cleanSrc.startsWith('http')
      ? cleanSrc
      : `${baseUrl}${cleanSrc.startsWith('/') ? '' : '/'}${cleanSrc}`;

    pages.push({
      index: pages.length,
      imageUrl: fullUrl,
    });
  });

  return pages;
}

export const parseChapterPages = extractPages;
