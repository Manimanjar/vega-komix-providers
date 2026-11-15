import { Info, Link, ProviderContext } from "../types";
import { cleanThumbnailUrl, fetchWithResilientRetry, preloadedPosts } from "./posts";

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const preloaded = preloadedPosts.get(link);
  let html = "";

  try {
    html = await fetchWithResilientRetry(link, providerContext);
  } catch (err) {
    // If comic page fails with 523 or timeout, use preloaded card data
    if (preloaded) {
      return {
        title: preloaded.title,
        image: preloaded.image,
        poster: preloaded.image,
        synopsis: `Read ${preloaded.title} on ComicsValley. High-definition 3D and Western comic series.`,
        imdbId: "",
        type: "comic",
        author: "ComicsValley",
        tags: ["3D", "Adult Comic", "PigKing"],
        totalChapters: 1,
        linkList: [
          {
            title: "Full Comic",
            directLinks: [
              {
                title: "Read Full Comic",
                link: preloaded.link,
                type: "comic",
              },
            ],
          },
        ],
      };
    }
  }

  const $ = providerContext.cheerio.load(html || "<html></html>");

  const title =
    $(".post-title h1").first().text().trim() ||
    $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.split("-")[0]?.trim() ||
    preloaded?.title ||
    "ComicsValley Title";

  const rawImage =
    $(".summary_image img").attr("data-src") ||
    $(".summary_image img").attr("src") ||
    $('meta[property="og:image"]').attr("content") ||
    preloaded?.image ||
    "";
  const image = cleanThumbnailUrl(rawImage);

  const synopsis =
    $(".description-summary p, .summary__content p, .manga-excerpt p, .entry-content p")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean)
      .join("\n\n") ||
    $('meta[name="description"]').attr("content") ||
    `Read ${title} on ComicsValley.`;

  const author =
    $(".author-content a").first().text().trim() ||
    $('a[href*="/comic-author/"]').first().text().trim() ||
    "ComicsValley";

  const status = $(".post-status .summary-content").first().text().trim();

  const tags: string[] = [];
  $('.genres-content a, a[href*="/comic-genre/"], a[href*="/comic-tag/"]').each(
    (_, el) => {
      const t = $(el).text().trim();
      if (t && !tags.includes(t)) tags.push(t);
    },
  );

  const chapters: { title: string; link: string }[] = [];
  const seenChapterLinks = new Set<string>();

  $("li.wp-manga-chapter a, .wp-manga-chapter a, .chapter-item a").each(
    (_, el) => {
      const chapLink = $(el).attr("href");
      const chapTitle = $(el).text().trim();

      if (chapLink && !seenChapterLinks.has(chapLink)) {
        seenChapterLinks.add(chapLink);
        chapters.push({
          title: chapTitle || `Chapter ${chapters.length + 1}`,
          link: chapLink,
        });
      }
    },
  );

  const sortedChapters = [...chapters].reverse();

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
    tags: tags.length > 0 ? tags : ["3D", "Adult Comic"],
    status,
    totalChapters: directLinks.length,
    linkList,
  };
}
