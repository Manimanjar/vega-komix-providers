import { ProviderContext } from "../types";
import { API_V2, BASE_URL } from "./posts";

const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  Accept: "application/json, text/html, */*",
  Referer: "https://nhentai.net/",
};

export const PAGE_HOST = "https://i3.nhentai.net";

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

  const res = await providerContext.axios.get(`${API_V2}/galleries/${id}`, {
    headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
    signal,
    timeout: 20000,
  });
  const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
  if (data?.error) throw new Error(`nhentai v2: ${data.error}`);

  const pages: any[] = Array.isArray(data.pages) ? data.pages : [];
  return pages.map((page: any, idx: number) => {
    const path = typeof page === "string" ? page : page.path || "";
    const imageUrl = `${PAGE_HOST}/${String(path).replace(/^\/+/, "")}`;
    return {
      index: typeof page.number === "number" ? page.number - 1 : idx,
      server: `Page ${typeof page.number === "number" ? page.number : idx + 1}`,
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
