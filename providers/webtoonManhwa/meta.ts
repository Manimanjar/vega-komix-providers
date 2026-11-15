import { Info, ProviderContext } from "../types";
import { BASE_URL, fetchWithWafFallback } from "./posts";

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  provider?: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const html = await fetchWithWafFallback(link, providerContext);
  const $ = providerContext.cheerio.load(html);

  const title =
    $(".entry-title, h1.title, .bigcontent h1").first().text().trim() ||
    $("title").text().replace(/ - .*$/, "").trim() ||
    "Untitled Webtoon";

  const coverEl = $(".thumb img, .poster img, .series-thumb img").first();
  const coverSrc =
    coverEl.attr("data-src") ||
    coverEl.attr("data-original") ||
    coverEl.attr("src") ||
    "";

  const image = coverSrc.startsWith("//")
    ? `https:${coverSrc}`
    : coverSrc.startsWith("http")
    ? coverSrc
    : `${BASE_URL}${coverSrc.startsWith("/") ? "" : "/"}${coverSrc}`;

  const synopsis =
    $(".entry-content, .synopsis, .summary, .desc").first().text().trim() ||
    "No synopsis available.";

  const author =
    $(".author, .author-name, .spe span:contains('Author')").first().text().replace(/Author:?/i, "").trim() ||
    undefined;

  const artist =
    $(".artist, .artist-name, .spe span:contains('Artist')").first().text().replace(/Artist:?/i, "").trim() ||
    author;

  const statusText = $(".status, .spe span:contains('Status')").first().text().toUpperCase();
  const status = statusText.includes("COMPLET") ? "COMPLETED" : "ONGOING";

  // Extract genre tags
  const tags: string[] = [];
  $(".mgen a, .genres-content a, .genre a").each((_, el) => {
    const t = $(el).text().trim();
    if (t) tags.push(t);
  });

  // Extract all chapters
  const directLinks: Array<{ title: string; link: string }> = [];
  const chapterElements = $("#chapterlist ul li, .eplister ul li, .wp-manga-chapter a, .chapter-list a");

  chapterElements.each((_, el) => {
    const item = $(el);
    const linkEl = item.is("a") ? item : item.find("a").first();
    const href = linkEl.attr("href");
    if (!href) return;

    const fullHref = href.startsWith("http")
      ? href
      : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;

    const chTitle =
      item.find(".chapternum, .chapter-manhwa-title").first().text().trim() ||
      linkEl.text().trim() ||
      "Chapter";

    directLinks.push({
      title: chTitle,
      link: fullHref,
    });
  });

  // Reverse so chapters are in ascending reading order (Chapter 1 first)
  if (directLinks.length > 1) {
    const firstTitle = directLinks[0].title.toLowerCase();
    const lastTitle = directLinks[directLinks.length - 1].title.toLowerCase();
    const firstNum = parseInt(firstTitle.replace(/\D/g, ""), 10) || 0;
    const lastNum = parseInt(lastTitle.replace(/\D/g, ""), 10) || 0;
    if (firstNum > lastNum) {
      directLinks.reverse();
    }
  }

  return {
    title,
    image,
    poster: image,
    cover: image,
    synopsis,
    imdbId: link,
    type: "comic",
    author,
    artist,
    status,
    totalChapters: directLinks.length,
    tags: tags.length > 0 ? tags : ["Manhwa", "Webtoon"],
    linkList: [
      {
        title: "Chapters",
        directLinks,
      },
    ],
  };
}
