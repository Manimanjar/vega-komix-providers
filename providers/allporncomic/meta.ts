import { Info, Link, ProviderContext } from "../types";
import { cleanThumbnailUrl, fetchWithWafFallback } from "./posts";

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const html = await fetchWithWafFallback(link, providerContext);
  const $ = providerContext.cheerio.load(html);

  const title =
    $(".post-title h1").first().text().trim() ||
    $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.split("-")[0]?.trim() ||
    "AllPornComic Title";

  const rawImage =
    $(".summary_image img").attr("data-src") ||
    $(".summary_image img").attr("src") ||
    $('meta[property="og:image"]').attr("content") ||
    "";
  const image = cleanThumbnailUrl(rawImage);

  const synopsis =
    $(".description-summary p, .summary__content p, .manga-excerpt p")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean)
      .join("\n\n") ||
    $('meta[name="description"]').attr("content") ||
    "Read this comic on AllPornComic.";

  const author =
    $(".author-content a").first().text().trim() ||
    $(".artist-content a").first().text().trim() ||
    "AllPornComic";

  const status = $(".post-status .summary-content").first().text().trim();

  const tags: string[] = [];
  $(".genres-content a").each((_, el) => {
    const t = $(el).text().trim();
    if (t) tags.push(t);
  });

  // Extract chapters from list
  const chapters: { title: string; link: string }[] = [];
  const seenChapterLinks = new Set<string>();

  $("li.wp-manga-chapter a, .wp-manga-chapter a").each((_, el) => {
    const chapLink = $(el).attr("href");
    const chapTitle = $(el).text().trim();

    if (chapLink && !seenChapterLinks.has(chapLink)) {
      seenChapterLinks.add(chapLink);
      chapters.push({
        title: chapTitle || `Chapter ${chapters.length + 1}`,
        link: chapLink,
      });
    }
  });

  // Chapters on Madara are listed descending (latest first). Reverse to ascending reading order.
  const sortedChapters = [...chapters].reverse();

  // If no separate chapters found (single chapter / one-shot gallery), provide main comic link
  const directLinks =
    sortedChapters.length > 0
      ? sortedChapters.map((ch) => ({
          title: ch.title,
          link: ch.link,
          type: "comic",
        }))
      : [
          {
            title: "Read Full Comic",
            link,
            type: "comic",
          },
        ];

  const linkList: Link[] = [
    {
      title: "Chapters",
      directLinks,
    },
  ];

  return {
    title,
    image,
    poster: image,
    synopsis,
    imdbId: "",
    type: "comic",
    author,
    tags,
    status,
    totalChapters: directLinks.length,
    linkList,
  };
}
