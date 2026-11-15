import { Info, Link, ProviderContext } from "../types";
import { BASE_URL, BROWSER_HEADERS, cleanThumbnailUrl, fetchWithResilientRetry } from "./posts";

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const html = await fetchWithResilientRetry(link, providerContext, undefined, 3, false);
  const $ = providerContext.cheerio.load(html || "<html><body></body></html>");

  const title =
    $(".post-title h1").first().text().trim() ||
    $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.split("-")[0]?.trim() ||
    "NovelCrow Title";

  const rawImage =
    $(".summary_image img").attr("data-src") ||
    $(".summary_image img").attr("data-lazy-src") ||
    $(".summary_image img").attr("src") ||
    $('meta[property="og:image"]').attr("content") ||
    "";
  const image = cleanThumbnailUrl(rawImage);

  const synopsis =
    $(".description-summary p, .summary__content p, .manga-excerpt p, .entry-content p")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean)
      .join("\n\n") ||
    $('meta[name="description"]').attr("content") ||
    `Read ${title} on NovelCrow.`;

  const author =
    $(".author-content a").first().text().trim() ||
    $(".artist-content a").first().text().trim() ||
    "NovelCrow";

  const status = $(".post-status .summary-content").first().text().trim();

  const tags: string[] = [];
  $(".genres-content a, .cat-links a, .tags-links a").each((_, el) => {
    const t = $(el).text().trim();
    if (t && !tags.includes(t)) tags.push(t);
  });

  const chapters: { id?: string; title: string; link: string; chapterNumber?: number }[] = [];
  const seenChapterLinks = new Set<string>();

  $("li.wp-manga-chapter a, .wp-manga-chapter a, .version-chap li a, .listing-chapters_wrap a").each((_, el) => {
    const chapLink = $(el).attr("href")?.trim();
    const chapTitle = $(el).text().trim();

    if (chapLink && !seenChapterLinks.has(chapLink)) {
      seenChapterLinks.add(chapLink);
      chapters.push({
        title: chapTitle || `Chapter ${chapters.length + 1}`,
        link: chapLink,
      });
    }
  });

  // If no chapters found in initial HTML, try AJAX endpoint using manga postId
  if (chapters.length === 0) {
    const holderId = $("#manga-chapters-holder").attr("data-id")?.trim();
    const inputId = $('input#wp-manga-post-id, input[name="wp-manga-post-id"]').val();
    const shortlink = $('link[rel="shortlink"]').attr("href") || "";
    const shortlinkMatch = shortlink.match(/[?&]p=(\d+)/);
    const htmlMatch = html.match(/id=["']manga-chapters-holder["'][^>]*data-id=["'](\d+)["']/i) || html.match(/manga_id\s*:\s*(\d+)/i);
    const postId = holderId || (inputId ? String(inputId).trim() : "") || (shortlinkMatch ? shortlinkMatch[1] : "") || (htmlMatch ? htmlMatch[1] : "");

    if (postId) {
      try {
        const ajaxRes = await providerContext.axios.post(
          `${BASE_URL}/wp-admin/admin-ajax.php`,
          `action=manga_get_chapters&manga=${encodeURIComponent(postId)}`,
          {
            headers: {
              ...BROWSER_HEADERS,
              ...providerContext.commonHeaders,
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
              Referer: link,
            },
            timeout: 10000,
          }
        );

        if (ajaxRes && ajaxRes.data) {
          const ajaxHtml = typeof ajaxRes.data === "string" ? ajaxRes.data : String(ajaxRes.data);
          const ajax$ = providerContext.cheerio.load(ajaxHtml);
          ajax$("li.wp-manga-chapter a, .wp-manga-chapter a, .version-chap li a, .listing-chapters_wrap a").each((_, el) => {
            const chapLink = ajax$(el).attr("href")?.trim();
            const chapTitle = ajax$(el).text().trim();

            if (chapLink && !seenChapterLinks.has(chapLink)) {
              seenChapterLinks.add(chapLink);
              chapters.push({
                title: chapTitle || `Chapter ${chapters.length + 1}`,
                link: chapLink,
              });
            }
          });
        }
      } catch (err) {
        console.warn("NovelCrow AJAX chapters fetch error:", err);
      }
    }
  }

  let sortedChapters: { id?: string; title: string; link: string; chapterNumber?: number }[] = [];
  if (chapters.length > 0) {
    sortedChapters = [...chapters].reverse();
  } else {
    // Single-File Chapter Fallback
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
    title: ch.title || `Chapter ${idx + 1}`,
    link: ch.link,
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
    tags,
    status,
    totalChapters: directLinks.length,
    linkList,
  };
}
