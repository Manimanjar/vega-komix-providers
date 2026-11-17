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
  // The configUrl sits in a JSON settings blob: "configUrl":"\/juicebox\/xml\/field\/node\/40498\/field_com_pages\/full?checksum=..."
  // Note the closing quote after the key and the escaped slashes (\/).
  const xmlMatch = html.match(/configUrl["']?\s*[:=]\s*["']([^"']+)["']/i) ||
                   html.match(/["']((?:\\?\/juicebox\\?\/xml\\?\/field\\?\/node\\?\/\d+\\?\/field_\w+\\?\/full[^"']*))["']/i);

  const pages: any[] = [];
  const seen = new Set<string>();

  if (xmlMatch) {
    // Unescape the JSON-escaped slashes or the XML request 404s and no pages load.
    const xmlPath = xmlMatch[1].replace(/\\\//g, "/");
    const xmlUrl = xmlPath.startsWith("http") ? xmlPath : `${BASE_URL}${xmlPath.startsWith("/") ? "" : "/"}${xmlPath}`;
    try {
      const xmlRes = await providerContext.axios.get(xmlUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
          Accept: "application/xml, text/xml, */*",
          Referer: fullUrl,
        },
        timeout: 15000,
      });

      const xmlText = xmlRes.data;
      const imgRegex = /imageURL="([^"]+)"/g;
      let m: RegExpExecArray | null;
      while ((m = imgRegex.exec(xmlText)) !== null) {
        let imgUrl = m[1];
        if (imgUrl.startsWith("//")) imgUrl = "https:" + imgUrl;
        else if (imgUrl.startsWith("/")) imgUrl = `${BASE_URL}${imgUrl}`;

        if (!seen.has(imgUrl)) {
          seen.add(imgUrl);
          const idx = pages.length;
          pages.push({
            index: idx,
            server: `Page ${idx + 1}`,
            link: imgUrl,
            imageUrl: imgUrl,
            type: "image",
            headers: {
              Referer: `${BASE_URL}/`,
              "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
            },
          });
        }
      }
    } catch {}
  }

  // Fallback to DOM images
  if (pages.length === 0) {
    const $ = providerContext.cheerio.load(html);
    $(".jb-idx-thb img, .gallery-item img, .field-name-field-images img").each((_, el) => {
      let raw = $(el).attr("src") || $(el).attr("data-src") || "";
      if (raw.startsWith("//")) raw = "https:" + raw;
      else if (raw.startsWith("/")) raw = `${BASE_URL}${raw}`;
      if (raw && !seen.has(raw)) {
        seen.add(raw);
        const idx = pages.length;
        pages.push({
          index: idx,
          server: `Page ${idx + 1}`,
          link: raw,
          imageUrl: raw,
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
