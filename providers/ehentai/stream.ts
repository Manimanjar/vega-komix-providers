import { ProviderContext } from "../types";
import { BASE_URL } from "./posts";

export async function getStream({
  link,
  signal,
  providerContext,
}: {
  link: string;
  type?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<any[]> {
  const fullUrl = link.startsWith("http") ? link : `${BASE_URL}${link.startsWith("/") ? "" : "/"}${link}`;
  const res = await providerContext.axios.get(fullUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: `${BASE_URL}/`,
    },
    signal,
    timeout: 15000,
  });

  const $ = providerContext.cheerio.load(res.data);
  const viewerLinks: string[] = [];

  $("#gdt a, .gdtm a, .gdtl a").each((_, el) => {
    const href = $(el).attr("href");
    if (href && href.includes("/s/")) {
      viewerLinks.push(href);
    }
  });

  const pages: any[] = [];
  const maxPages = Math.min(viewerLinks.length, 120);

  // Fetch images in concurrent batches of 8. Each /s/ viewer page takes ~0.4s,
  // so batches of 4 made a 100-page gallery wait ~10s+ for its page list.
  // Kept at 8, not higher: e-hentai.org rate-limits aggressive parallel hits.
  const batchSize = 8;
  for (let i = 0; i < maxPages; i += batchSize) {
    const chunk = viewerLinks.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      chunk.map(async (vLink, idxInChunk) => {
        const pageIndex = i + idxInChunk;
        const pageRes = await providerContext.axios.get(vLink, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
            Referer: fullUrl,
          },
          timeout: 12000,
        });
        const page$ = providerContext.cheerio.load(pageRes.data);
        const imgSrc = page$("#img").attr("src");
        return { pageIndex, imgSrc };
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value.imgSrc) {
        pages.push({
          index: r.value.pageIndex,
          server: `Page ${r.value.pageIndex + 1}`,
          link: r.value.imgSrc,
          imageUrl: r.value.imgSrc,
          type: "image",
          headers: {
            Referer: fullUrl,
            "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
          },
        });
      }
    }
  }

  pages.sort((a, b) => a.index - b.index);
  return pages;
}

export const getPages = getStream;
