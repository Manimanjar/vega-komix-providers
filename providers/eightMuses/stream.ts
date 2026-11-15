import { PageImage, ProviderContext } from "../types";
import { BASE_URL, COMMON_HEADERS } from "./posts";

export async function getStream({
  link,
  providerContext,
}: {
  link: string;
  type?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<any[]> {
  const fullUrl = link.startsWith("http")
    ? link
    : `${BASE_URL}${link.startsWith("/") ? "" : "/"}${link}`;

  const idMatch = fullUrl.match(/\/g\/(\d+)/);
  const id = idMatch ? idMatch[1] : "";

  // Check if pages count was passed in URL query parameter
  const urlObj = new URL(fullUrl);
  let totalPages = parseInt(urlObj.searchParams.get("pages") || "0", 10);

  // If pages not passed in query, fetch details page to read page count
  if (!totalPages || totalPages <= 0) {
    try {
      const res = await providerContext.axios.get(fullUrl, {
        headers: {
          ...COMMON_HEADERS,
          ...providerContext.commonHeaders,
        },
        timeout: 15000,
      });
      const html = typeof res.data === "string" ? res.data : String(res.data);
      const jsonPagesMatch = html.match(/"pages":(\d+)/);
      if (jsonPagesMatch) {
        totalPages = parseInt(jsonPagesMatch[1], 10);
      } else {
        const textMatch = html.match(/(\d+)\s+pages?/i);
        if (textMatch) {
          totalPages = parseInt(textMatch[1], 10);
        }
      }
    } catch {}
  }

  // Fallback to reasonable minimum if detection failed
  if (!totalPages || totalPages <= 0) {
    totalPages = 10;
  }

  const pages: PageImage[] = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push({
      index: i - 1,
      imageUrl: `${BASE_URL}/api/legacy-media/${id}/${i}`,
      headers: {
        Referer: `${BASE_URL}/`,
        Origin: BASE_URL,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });
  }

  return pages.map((page, index) => ({
    index,
    server: `8Muses Page ${index + 1}`,
    link: page.imageUrl,
    imageUrl: page.imageUrl,
    type: "image",
    headers: page.headers,
  }));
}

export const getPages = getStream;
