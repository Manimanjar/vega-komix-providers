import { ProviderContext } from "../types";
import { BASE_API, APP_URL } from "./posts";

function extractGid(link: string): string {
  if (!link) return "";
  const match = link.match(/([a-f0-9]{32})/i);
  if (match) return match[1];
  const parts = link.trim().replace(/\/pages$/, "").replace(/\/$/, "").split("/");
  return parts[parts.length - 1];
}

export async function getStream({
  link,
  signal,
  providerContext,
}: {
  link: string;
  type?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<any[]> {
  const gid = extractGid(link);
  const url = `${BASE_API}/books/${gid}/pages`;

  const res = await providerContext.axios.get(url, {
    headers: {
      ...providerContext.commonHeaders,
      Accept: "application/json, text/plain, */*",
      Origin: APP_URL,
      Referer: `${APP_URL}/`,
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    },
    signal,
  });

  const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
  const host = data?.host || "https://media.hentaiser.app";
  const rawPages: string[] = Array.isArray(data?.pages) ? data.pages : [];

  if (rawPages.length === 0) {
    throw new Error(`No pages returned for Hentaiser comic ${gid}`);
  }

  const headers = {
    Referer: `${APP_URL}/`,
    Origin: APP_URL,
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  };

  return rawPages.map((pagePath: string, index: number) => {
    const imageUrl = `${host}${pagePath}`;
    return {
      index,
      server: `Hentaiser Page ${index + 1}`,
      link: imageUrl,
      imageUrl,
      type: "image",
      headers,
    };
  });
}

export const getPages = getStream;
