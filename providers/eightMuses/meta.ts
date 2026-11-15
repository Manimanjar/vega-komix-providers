import { Info, ProviderContext } from "../types";
import { BASE_URL, COMMON_HEADERS } from "./posts";

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const fullUrl = link.startsWith("http")
    ? link
    : `${BASE_URL}${link.startsWith("/") ? "" : "/"}${link}`;

  const res = await providerContext.axios.get(fullUrl, {
    headers: {
      ...COMMON_HEADERS,
      ...providerContext.commonHeaders,
    },
    timeout: 15000,
  });

  const html = typeof res.data === "string" ? res.data : String(res.data);
  const $ = providerContext.cheerio.load(html);

  const idMatch = fullUrl.match(/\/g\/(\d+)/);
  const id = idMatch ? idMatch[1] : "";

  // Title extraction
  const title =
    $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.split("-")[0]?.trim() ||
    $("title").text().split("-")[0]?.trim() ||
    `8Muses Comic #${id}`;

  // Description / Synopsis
  const synopsis =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    $(".description, p.summary").text().trim() ||
    "Read this high quality comic on 8Muses.";

  // Cover image
  let image =
    $('meta[property="og:image"]').attr("content") ||
    $('meta[name="twitter:image"]').attr("content") ||
    `${BASE_URL}/api/legacy-media/${id}/cover`;

  if (image.startsWith("/")) {
    image = `${BASE_URL}${image}`;
  }

  // Author
  const author =
    $('meta[name="author"]').attr("content") ||
    $('a[href^="/artist/"]').first().text().trim() ||
    "8Muses";

  // Page count extraction
  let pages = 0;
  const jsonPagesMatch = html.match(/"pages":(\d+)/);
  if (jsonPagesMatch) {
    pages = parseInt(jsonPagesMatch[1], 10);
  } else {
    const textMatch = $("body").text().match(/(\d+)\s+pages?/i);
    if (textMatch) {
      pages = parseInt(textMatch[1], 10);
    }
  }

  // Genres / keywords
  const tags: string[] = [];
  const kw = $('meta[name="keywords"]').attr("content");
  if (kw) {
    kw.split(",")
      .map((t) => t.trim())
      .filter((t) => t && !t.includes("8Muse") && !t.includes("free online"))
      .forEach((t) => tags.push(t));
  }

  return {
    title,
    image,
    poster: image,
    cover: image,
    synopsis,
    imdbId: "",
    type: "comic",
    author,
    tags,
    totalChapters: 1,
    linkList: [
      {
        title: "Complete Gallery",
        directLinks: [
          {
            title: `Read Complete Gallery (${pages > 0 ? pages + " Pages" : "Full"})`,
            link: `${BASE_URL}/g/${id}?pages=${pages}`,
            type: "comic",
          },
        ],
      },
    ],
  };
}
