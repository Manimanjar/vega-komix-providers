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

  const html = res.data;
  const loadDirMatch = html.match(/id="load_dir"\s+value="([^"]+)"/i) || html.match(/"load_dir"\s*:\s*"([^"]+)"/i);
  const loadIdMatch = html.match(/id="load_id"\s+value="([^"]+)"/i) || html.match(/"load_id"\s*:\s*"([^"]+)"/i);
  const gThMatch = html.match(/var\s+g_th\s*=\s*\$\.parseJSON\('([^']+)'\)/i) || html.match(/var\s+g_th\s*=\s*(\{[^\}]+\})/i);

  const loadDir = loadDirMatch ? loadDirMatch[1] : "";
  const loadId = loadIdMatch ? loadIdMatch[1] : "";

  let gTh: Record<string, string> = {};
  if (gThMatch) {
    try {
      gTh = JSON.parse(gThMatch[1]);
    } catch {}
  }

  const pageKeys = Object.keys(gTh);
  const pages: any[] = [];

  if (loadDir && loadId && pageKeys.length > 0) {
    pageKeys.forEach((key, index) => {
      const typeCode = gTh[key];
      const ext = typeCode === "p" ? "png" : typeCode === "w" ? "webp" : "jpg";
      const imageUrl = `https://i.hentaifox.com/${loadDir}/${loadId}/${key}.${ext}`;
      pages.push({
        index,
        server: `Page ${index + 1}`,
        link: imageUrl,
        imageUrl,
        type: "image",
        headers: {
          Referer: `${BASE_URL}/`,
          "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
        },
      });
    });
  } else {
    const $ = providerContext.cheerio.load(html);
    $(".gallery_thumb img, .image_div img").each((index, el) => {
      let src = $(el).attr("data-src") || $(el).attr("src") || "";
      if (src.startsWith("//")) src = "https:" + src;
      else if (src.startsWith("/")) src = `${BASE_URL}${src}`;
      if (src) {
        pages.push({
          index,
          server: `Page ${index + 1}`,
          link: src,
          imageUrl: src,
          type: "image",
          headers: {
            Referer: `${BASE_URL}/`,
            "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
          },
        });
      }
    });
  }

  return pages;
}

export const getPages = getStream;
