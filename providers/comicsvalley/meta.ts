import { Info, Link, ProviderContext } from "../types";
import { BASE_URL, cleanThumbnailUrl, fetchWithResilientRetry, preloadedPosts } from "./posts";

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
    console.warn("ComicsValley fetch error in getMeta:", err);
  }

  const $ = providerContext.cheerio.load(html || "<html><body></body></html>");

  // Title extraction from multiple possible DOM selectors
  const title =
    $("h1.entry-title, h1.post-title, .entry-title, .post-title h1, h1")
      .first()
      .text()
      .trim() ||
    $('meta[property="og:title"]').attr("content")?.split("-")[0]?.trim() ||
    $("title").text().split(/[-–|]/)[0]?.trim() ||
    preloaded?.title ||
    "ComicsValley Comic";

  // Cover image: check first content image, meta og:image, or preloaded card
  const firstContentImg = $(
    ".entry-content img, .wp-block-image img, .post-content img, .single-content img, figure img, p img, .summary_image img"
  ).first();

  const rawImage = (
    firstContentImg.attr("data-src") ||
    firstContentImg.attr("data-lazy-src") ||
    firstContentImg.attr("data-orig-file") ||
    firstContentImg.attr("data-full-url") ||
    firstContentImg.attr("src") ||
    $('meta[property="og:image"]').attr("content") ||
    $('meta[name="twitter:image"]').attr("content") ||
    preloaded?.image ||
    ""
  ).trim();

  const image = cleanThumbnailUrl(rawImage);

  // Synopsis / Description
  const synopsis =
    $(
      ".description-summary p, .summary__content p, .manga-excerpt p, .entry-content p"
    )
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((text) => text && !text.includes("Comic:") && !text.includes("Artist:"))
      .join("\n\n") ||
    $('meta[name="description"]').attr("content") ||
    `Read ${title} on ComicsValley. High-definition full comic.`;

  // Author
  const author =
    $(".author-content a, .artist-content a").first().text().trim() ||
    $('a[href*="/comic-author/"], a[href*="/author/"]').first().text().trim() ||
    "ComicsValley";

  const status = $(".post-status .summary-content").first().text().trim() || "COMPLETED";

  // Categories & Tags
  const tags: string[] = [];
  $(
    ".cat-links a, .tags-links a, a[rel='tag'], .genres-content a, a[href*='/comic-genre/'], a[href*='/comic-tag/']"
  ).each((_, el) => {
    const t = $(el).text().trim();
    if (t && !tags.includes(t)) tags.push(t);
  });

  // Extract chapters if present
  const chapters: { id?: string; title: string; link: string; chapterNumber?: number }[] = [];
  const seenChapterLinks = new Set<string>();

  $("li.wp-manga-chapter a, .wp-manga-chapter a, .chapter-item a, .version-chap li a").each(
    (_, el) => {
      const chapLink = $(el).attr("href")?.trim();
      const chapTitle = $(el).text().trim();

      if (chapLink && !seenChapterLinks.has(chapLink)) {
        seenChapterLinks.add(chapLink);
        chapters.push({
          title: chapTitle || `Chapter ${chapters.length + 1}`,
          link: chapLink,
        });
      }
    }
  );

  let sortedChapters: { id?: string; title: string; link: string; chapterNumber?: number }[] = [];

  if (chapters.length > 0) {
    sortedChapters = [...chapters].reverse();
  } else {
    // Single-File Chapter Rule: When no multi-chapter list exists on the page,
    // ALWAYS populate the chapter list with a single item named exactly as the comic is titled on the website
    sortedChapters = [
      {
        id: "single-1",
        title: title,
        chapterNumber: 1,
        link: link,
      },
    ];
  }

  const directLinks = sortedChapters.map((ch, idx) => ({
    title: ch.title || title,
    link: ch.link || link,
    chapterNumber: ch.chapterNumber ?? (idx + 1),
    type: "comic" as const,
  }));

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
    cover: image,
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
