import { ProviderContext } from "../types";
import { cleanHighResImageUrl } from "../cleanImage";
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
  const seen = new Set<string>();
  const pages: any[] = [];

  $(".entry-content img, .wp-block-image img, .single-content img, figure img").each((_, el) => {
    let raw = $(el).attr("data-full-url") || $(el).attr("data-orig-file") || $(el).attr("data-src") || $(el).attr("data-lazy-src") || $(el).attr("src") || "";
    if (raw.startsWith("//")) raw = "https:" + raw;
    else if (raw.startsWith("/")) raw = `${BASE_URL}${raw}`;

    const cleaned = cleanHighResImageUrl(raw);
    if (cleaned && !seen.has(cleaned)) {
      seen.add(cleaned);
      const idx = pages.length;
      pages.push({
        index: idx,
        server: `Page ${idx + 1}`,
        link: cleaned,
        imageUrl: cleaned,
        type: "image",
        headers: {
          Referer: `${BASE_URL}/`,
          "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
        },
      });
    }
  });

  return pages;
}

export const getPages = getStream;
