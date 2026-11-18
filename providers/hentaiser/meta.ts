import { Info, ProviderContext } from "../types";
import { BASE_API, APP_URL } from "./posts";

function extractGid(link: string): string {
  if (!link) return "";
  const match = link.match(/([a-f0-9]{32})/i);
  if (match) return match[1];
  const parts = link.trim().replace(/\/$/, "").split("/");
  return parts[parts.length - 1];
}

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  provider?: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const gid = extractGid(link);
  const url = `${BASE_API}/books/${gid}`;

  const res = await providerContext.axios.get(url, {
    headers: {
      ...providerContext.commonHeaders,
      Accept: "application/json, text/plain, */*",
      Origin: APP_URL,
      Referer: `${APP_URL}/`,
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    },
  });

  const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
  if (!data || !data.gid) {
    throw new Error(`Failed to retrieve book metadata for gid: ${gid}`);
  }

  const host = data.host || "https://media.hentaiser.app";
  const image = data.cover ? `${host}${data.cover}` : "";

  const tagList: string[] = data.tags
    ? data.tags
        .split("|")
        .map((t: string) => t.trim())
        .filter(Boolean)
    : [];

  const synopsisParts = [
    data.description || null,
    data.lang ? `Language: ${data.lang.toUpperCase()}` : null,
    data.pages ? `Total Pages: ${data.pages}` : null,
    data.rates && data.rates !== "0.0" ? `Rating: ★ ${data.rates}` : null,
    data.views ? `Views: ${data.views.toLocaleString()}` : null,
  ].filter(Boolean);

  const synopsis = synopsisParts.join("\n\n") || `Hentai/Doujinshi comic set with ${data.pages || "all"} pages.`;

  const readPagesLink = `${BASE_API}/books/${gid}/pages`;

  return {
    title: data.title || "Untitled Comic",
    image,
    poster: image,
    cover: image,
    synopsis,
    imdbId: gid,
    type: "comic",
    status: "COMPLETED",
    // Rating & views as proper fields too (user, 2026-11-18) so the
    // app shows them as badges next to the synopsis, not only inside
    // the synopsis text.
    rating: (() => {
      const r =
        typeof data.rates === "number"
          ? data.rates
          : parseFloat(String(data.rates ?? ""));
      return Number.isFinite(r) && r > 0
        ? String(Math.round(r * 10) / 10)
        : undefined;
    })(),
    views: typeof data.views === "number" ? data.views : undefined,
    totalChapters: 1,
    tags: tagList.length > 0 ? tagList : ["Doujinshi", "Manga"],
    linkList: [
      {
        title: "Full Comic",
        directLinks: [
          {
            title: `Read Complete Comic (${data.pages || "All"} Pages)`,
            link: readPagesLink,
          },
        ],
      },
    ],
  };
}
