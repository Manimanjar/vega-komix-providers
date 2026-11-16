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
  const idMatch = fullUrl.match(/\/g\/(\d+)/);
  const id = idMatch ? idMatch[1] : "";
  const apiUrl = `${BASE_URL}/api/gallery/${id}`;

  const res = await providerContext.axios.get(apiUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      Accept: "application/json, text/html, */*",
      Referer: `${BASE_URL}/`,
    },
    signal,
    timeout: 15000,
  });

  const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
  const mediaId = data.media_id;
  const pages: any[] = Array.isArray(data.images?.pages) ? data.images.pages : [];
  const host = "i3.nhentai.net";

  return pages.map((page: any, idx: number) => {
    const ext = page.t === "p" ? "png" : page.t === "w" ? "webp" : "jpg";
    const imageUrl = `https://${host}/galleries/${mediaId}/${idx + 1}.${ext}`;
    return {
      index: idx,
      server: `Page ${idx + 1}`,
      link: imageUrl,
      imageUrl,
      type: "image",
      headers: {
        Referer: `${BASE_URL}/`,
        "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      },
    };
  });
}

export const getPages = getStream;
