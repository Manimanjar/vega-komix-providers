import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const providersDir = path.join(rootDir, 'providers');

const b64 = (s) => Buffer.from(s, 'base64').toString('utf8');

// Encoded Provider Definitions
const P5_ID = 'bmhlbnRhaQ==';
const P5_NAME = 'bkhlbnRhaQ==';
const P5_BASE = 'aHR0cHM6Ly9uaGVudGFpLm5ldA==';
const P5_MIRRORS = ['aHR0cHM6Ly9uaGVudGFpLnRv', 'aHR0cHM6Ly9uaGVudGFpLnh4eA=='];

const P6_ID = 'aGVudGFpZm94';
const P6_NAME = 'SGVudGFpRm94';
const P6_BASE = 'aHR0cHM6Ly9oZW50YWlmb3guY29t';

const P7_ID = 'aGRwb3JuY29taWNz';
const P7_NAME = 'SERQb3JuQ29taWNz';
const P7_BASE = 'aHR0cHM6Ly9oZHBvcm5jb21pY3MuY29t';

const P8_ID = 'bXVsdHBvcm4=';
const P8_NAME = 'TXVsdFBvcm4=';
const P8_BASE = 'aHR0cHM6Ly9tdWx0cG9ybi5uZXQ=';

const P9_ID = 'a2luZ2NvbWl4';
const P9_NAME = 'S2luZ0NvbWl4';
const P9_BASE = 'aHR0cHM6Ly9raW5nY29taXguY29t';

const P10_ID = 'ZWhlbnRhaQ==';
const P10_NAME = 'RS1IZW50YWkgKFdlc3Rlcm4gJiBEb3VqaW5zaGkp';
const P10_BASE = 'aHR0cHM6Ly9lLWhlbnRhaS5vcmc=';
const P10_API = 'aHR0cHM6Ly9hcGkuZS1oZW50YWkub3JnL2FwaS5waHA=';

console.log('[build-komix-providers] Step 1: Cleaning up broken providers...');
const brokenProviders = ['comicsvalley', 'novelcrow', 'komixGallery', 'webtoonManhwa'];
for (const p of brokenProviders) {
  const dirPath = path.join(providersDir, p);
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
    console.log(`[build-komix-providers] Removed broken provider directory: ${p}`);
  }
}

// Helper to write files ensuring dir exists
function writeProviderFile(providerId, filename, content) {
  const pDir = path.join(providersDir, providerId);
  if (!fs.existsSync(pDir)) {
    fs.mkdirSync(pDir, { recursive: true });
  }
  fs.writeFileSync(path.join(pDir, filename), content.trim() + '\n', 'utf8');
}

console.log('[build-komix-providers] Step 2: Generating Provider 5...');
const p5Id = b64(P5_ID);
const p5Base = b64(P5_BASE);
writeProviderFile(p5Id, 'catalog.ts', `
import { CatalogList } from "../types";

export const catalog: CatalogList = [
  { title: "Popular", filter: "sort=popular" },
  { title: "Latest", filter: "sort=recent" },
  { title: "English", filter: "language:english" },
  { title: "Doujinshi", filter: "tag:doujinshi" },
  { title: "Manga", filter: "tag:manga" },
];
`);

writeProviderFile(p5Id, 'posts.ts', `
import { Post, ProviderContext } from "../types";

export const BASE_URL = "${p5Base}";
const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  Accept: "application/json, text/html, */*",
  Referer: "${p5Base}/",
};

export async function getPosts({
  page = 1,
  filter = "sort=recent",
  signal,
  providerContext,
}: {
  page?: number;
  filter?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const query = filter.includes("=") || filter.includes(":") ? filter : "sort=recent";
  let url = \`\${BASE_URL}/api/galleries/all?page=\${page}\`;
  if (query.includes("sort=popular")) {
    url = \`\${BASE_URL}/api/galleries/search?query=pages:>0&sort=popular&page=\${page}\`;
  } else if (query.includes(":")) {
    url = \`\${BASE_URL}/api/galleries/search?query=\${encodeURIComponent(query)}&page=\${page}\`;
  }

  try {
    const res = await providerContext.axios.get(url, {
      headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
      signal,
      timeout: 15000,
    });
    const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
    const resultList = data?.result || data?.galleries || (Array.isArray(data) ? data : []);

    return resultList.map((g: any) => {
      const ext = g.images?.cover?.t === "p" ? "png" : g.images?.cover?.t === "w" ? "webp" : "jpg";
      const cover = g.media_id ? \`https://t3.nhentai.net/galleries/\${g.media_id}/cover.\${ext}\` : "";
      const title = g.title?.pretty || g.title?.english || g.title?.japanese || \`Gallery #\${g.id}\`;
      return {
        title,
        link: \`\${BASE_URL}/g/\${g.id}/\`,
        image: cover,
        poster: cover,
        cover,
        tag: g.num_pages ? \`\${g.num_pages}P\` : undefined,
        provider: "${p5Id}",
      };
    });
  } catch {
    return [];
  }
}

export async function getSearchPosts({
  searchQuery,
  page = 1,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  if (!searchQuery?.trim()) return [];
  const url = \`\${BASE_URL}/api/galleries/search?query=\${encodeURIComponent(searchQuery.trim())}&page=\${page}\`;
  try {
    const res = await providerContext.axios.get(url, {
      headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
      signal,
      timeout: 15000,
    });
    const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
    const resultList = data?.result || [];
    return resultList.map((g: any) => {
      const ext = g.images?.cover?.t === "p" ? "png" : g.images?.cover?.t === "w" ? "webp" : "jpg";
      const cover = g.media_id ? \`https://t3.nhentai.net/galleries/\${g.media_id}/cover.\${ext}\` : "";
      const title = g.title?.pretty || g.title?.english || g.title?.japanese || \`Gallery #\${g.id}\`;
      return {
        title,
        link: \`\${BASE_URL}/g/\${g.id}/\`,
        image: cover,
        poster: cover,
        cover,
        tag: g.num_pages ? \`\${g.num_pages}P\` : undefined,
        provider: "${p5Id}",
      };
    });
  } catch {
    return [];
  }
}
`);

writeProviderFile(p5Id, 'meta.ts', `
import { Info, ProviderContext } from "../types";
import { BASE_URL } from "./posts";

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const fullUrl = link.startsWith("http") ? link : \`\${BASE_URL}\${link.startsWith("/") ? "" : "/"}\${link}\`;
  const idMatch = fullUrl.match(/\\/g\\/(\\d+)/);
  const id = idMatch ? idMatch[1] : "";
  const apiUrl = \`\${BASE_URL}/api/gallery/\${id}\`;

  const res = await providerContext.axios.get(apiUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      Accept: "application/json, text/html, */*",
      Referer: \`\${BASE_URL}/\`,
    },
    timeout: 15000,
  });

  const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
  const title = data.title?.pretty || data.title?.english || data.title?.japanese || \`Gallery #\${id}\`;
  const ext = data.images?.cover?.t === "p" ? "png" : data.images?.cover?.t === "w" ? "webp" : "jpg";
  const image = data.media_id ? \`https://t3.nhentai.net/galleries/\${data.media_id}/cover.\${ext}\` : "";

  const tags: string[] = Array.isArray(data.tags)
    ? data.tags.map((t: any) => t.name).filter(Boolean)
    : ["Doujinshi", "Manga"];

  const numPages = data.num_pages || (Array.isArray(data.images?.pages) ? data.images.pages.length : 1);

  return {
    title,
    image,
    poster: image,
    cover: image,
    synopsis: \`Doujinshi gallery containing \${numPages} pages.\`,
    imdbId: id,
    type: "comic",
    tags,
    totalChapters: 1,
    linkList: [
      {
        title: "Chapters",
        directLinks: [
          {
            id: "1",
            title: title,
            chapterNumber: 1,
            link: fullUrl,
            type: "comic",
          },
        ],
      },
    ],
    chapters: [
      {
        id: "1",
        title: title,
        chapterNumber: 1,
        link: fullUrl,
      },
    ],
    episodes: [
      {
        id: "1",
        title: title,
        chapterNumber: 1,
        link: fullUrl,
      },
    ],
  };
}
`);

writeProviderFile(p5Id, 'stream.ts', `
import { ProviderContext } from "../types";
import { BASE_URL } from "./posts";

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
  const fullUrl = link.startsWith("http") ? link : \`\${BASE_URL}\${link.startsWith("/") ? "" : "/"}\${link}\`;
  const idMatch = fullUrl.match(/\\/g\\/(\\d+)/);
  const id = idMatch ? idMatch[1] : "";
  const apiUrl = \`\${BASE_URL}/api/gallery/\${id}\`;

  const res = await providerContext.axios.get(apiUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      Accept: "application/json, text/html, */*",
      Referer: \`\${BASE_URL}/\`,
    },
    signal,
    timeout: 15000,
  });

  const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
  const mediaId = data.media_id;
  const pages: any[] = Array.isArray(data.images?.pages) ? data.images.pages : [];
  const host = "i3.nhentai.net";

  return pages.map((page: any, idx: number) => {
    const ext = page.t === "p" ? "png" : page.t === "w" ? "webp" : "jpg";
    const imageUrl = \`https://\${host}/galleries/\${mediaId}/\${idx + 1}.\${ext}\`;
    return {
      index: idx,
      server: \`Page \${idx + 1}\`,
      link: imageUrl,
      imageUrl,
      type: "image",
      headers: {
        Referer: \`\${BASE_URL}/\`,
        "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      },
    };
  });
}

export const getPages = getStream;
`);

console.log('[build-komix-providers] Step 3: Generating Provider 6...');
const p6Id = b64(P6_ID);
const p6Base = b64(P6_BASE);
writeProviderFile(p6Id, 'catalog.ts', `
import { CatalogList } from "../types";

export const catalog: CatalogList = [
  { title: "Latest", filter: "/" },
  { title: "Popular", filter: "/pop/" },
  { title: "Western", filter: "/category/western/" },
  { title: "Doujinshi", filter: "/category/doujinshi/" },
  { title: "Manga", filter: "/category/manga/" },
];
`);

writeProviderFile(p6Id, 'posts.ts', `
import { Post, ProviderContext } from "../types";

export const BASE_URL = "${p6Base}";
const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  Referer: "${p6Base}/",
};

export async function getPosts({
  page = 1,
  filter = "/",
  signal,
  providerContext,
}: {
  page?: number;
  filter?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const pathPart = filter.endsWith("/") ? filter : \`\${filter}/\`;
  const url = page > 1 ? \`\${BASE_URL}\${pathPart}pag/\${page}/\` : \`\${BASE_URL}\${pathPart}\`;

  try {
    const res = await providerContext.axios.get(url, {
      headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
      signal,
      timeout: 15000,
    });
    const $ = providerContext.cheerio.load(res.data);
    const posts: Post[] = [];

    $(".lc_galleries .thumb, .overview .thumb").each((_, el) => {
      const a = $(el).find(".inner_thumb a, a").first();
      const href = a.attr("href");
      if (!href) return;
      const title = $(el).find(".caption .g_title a, h2 a, .caption a").first().text().trim() || "Untitled";
      const img = $(el).find("img").first();
      let cover = img.attr("data-src") || img.attr("src") || "";
      if (cover.startsWith("//")) cover = "https:" + cover;
      else if (cover.startsWith("/")) cover = \`\${BASE_URL}\${cover}\`;

      const fullLink = href.startsWith("http") ? href : \`\${BASE_URL}\${href.startsWith("/") ? "" : "/"}\${href}\`;
      posts.push({
        title,
        link: fullLink,
        image: cover,
        poster: cover,
        cover,
        provider: "${p6Id}",
      });
    });

    return posts;
  } catch {
    return [];
  }
}

export async function getSearchPosts({
  searchQuery,
  page = 1,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  if (!searchQuery?.trim()) return [];
  const url = page > 1
    ? \`\${BASE_URL}/search/pag/\${page}/?q=\${encodeURIComponent(searchQuery.trim())}\`
    : \`\${BASE_URL}/search/?q=\${encodeURIComponent(searchQuery.trim())}\`;

  try {
    const res = await providerContext.axios.get(url, {
      headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
      signal,
      timeout: 15000,
    });
    const $ = providerContext.cheerio.load(res.data);
    const posts: Post[] = [];

    $(".lc_galleries .thumb, .overview .thumb").each((_, el) => {
      const a = $(el).find(".inner_thumb a, a").first();
      const href = a.attr("href");
      if (!href) return;
      const title = $(el).find(".caption .g_title a, h2 a, .caption a").first().text().trim() || "Untitled";
      const img = $(el).find("img").first();
      let cover = img.attr("data-src") || img.attr("src") || "";
      if (cover.startsWith("//")) cover = "https:" + cover;
      else if (cover.startsWith("/")) cover = \`\${BASE_URL}\${cover}\`;

      const fullLink = href.startsWith("http") ? href : \`\${BASE_URL}\${href.startsWith("/") ? "" : "/"}\${href}\`;
      posts.push({
        title,
        link: fullLink,
        image: cover,
        poster: cover,
        cover,
        provider: "${p6Id}",
      });
    });

    return posts;
  } catch {
    return [];
  }
}
`);

writeProviderFile(p6Id, 'meta.ts', `
import { Info, ProviderContext } from "../types";
import { BASE_URL } from "./posts";

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const fullUrl = link.startsWith("http") ? link : \`\${BASE_URL}\${link.startsWith("/") ? "" : "/"}\${link}\`;
  const res = await providerContext.axios.get(fullUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: \`\${BASE_URL}/\`,
    },
    timeout: 15000,
  });

  const $ = providerContext.cheerio.load(res.data);
  const title = $(".gallery_right h1").first().text().trim() || $("h1").first().text().trim() || "Comic Gallery";
  const imgEl = $(".gallery_left img, .cover_div img").first();
  let image = imgEl.attr("data-src") || imgEl.attr("src") || "";
  if (image.startsWith("//")) image = "https:" + image;
  else if (image.startsWith("/")) image = \`\${BASE_URL}\${image}\`;

  const tags: string[] = [];
  $(".tag_list li a, .tag_btn").each((_, el) => {
    const t = $(el).text().trim();
    if (t) tags.push(t);
  });

  return {
    title,
    image,
    poster: image,
    cover: image,
    synopsis: \`Full comic gallery from \${title}.\`,
    imdbId: fullUrl,
    type: "comic",
    tags: tags.length > 0 ? tags : ["Doujinshi", "Manga"],
    totalChapters: 1,
    linkList: [
      {
        title: "Chapters",
        directLinks: [
          {
            id: "1",
            title: title,
            chapterNumber: 1,
            link: fullUrl,
            type: "comic",
          },
        ],
      },
    ],
    chapters: [
      {
        id: "1",
        title: title,
        chapterNumber: 1,
        link: fullUrl,
      },
    ],
    episodes: [
      {
        id: "1",
        title: title,
        chapterNumber: 1,
        link: fullUrl,
      },
    ],
  };
}
`);

writeProviderFile(p6Id, 'stream.ts', `
import { ProviderContext } from "../types";
import { BASE_URL } from "./posts";

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
  const fullUrl = link.startsWith("http") ? link : \`\${BASE_URL}\${link.startsWith("/") ? "" : "/"}\${link}\`;
  const res = await providerContext.axios.get(fullUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: \`\${BASE_URL}/\`,
    },
    signal,
    timeout: 15000,
  });

  const html = res.data;
  const loadDirMatch = html.match(/id="load_dir"\\s+value="([^"]+)"/i) || html.match(/"load_dir"\\s*:\\s*"([^"]+)"/i);
  const loadIdMatch = html.match(/id="load_id"\\s+value="([^"]+)"/i) || html.match(/"load_id"\\s*:\\s*"([^"]+)"/i);
  const gThMatch = html.match(/var\\s+g_th\\s*=\\s*\\$\\.parseJSON\\('([^']+)'\\)/i) || html.match(/var\\s+g_th\\s*=\\s*(\\{[^\\}]+\\})/i);

  const loadDir = loadDirMatch ? loadDirMatch[1] : "";
  const loadId = loadIdMatch ? loadIdMatch[1] : "";

  let gTh: Record<string, string> = {};
  if (gThMatch) {
    try {
      gTh = JSON.parse(gThMatch[1]);
    } catch {}
  }

  const pageKeys = Object.keys(gTh);
  const pages: any[] = [];

  if (loadDir && loadId && pageKeys.length > 0) {
    pageKeys.forEach((key, index) => {
      const typeCode = gTh[key];
      const ext = typeCode === "p" ? "png" : typeCode === "w" ? "webp" : "jpg";
      const imageUrl = \`https://i.hentaifox.com/\${loadDir}/\${loadId}/\${key}.\${ext}\`;
      pages.push({
        index,
        server: \`Page \${index + 1}\`,
        link: imageUrl,
        imageUrl,
        type: "image",
        headers: {
          Referer: \`\${BASE_URL}/\`,
          "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
        },
      });
    });
  } else {
    const $ = providerContext.cheerio.load(html);
    $(".gallery_thumb img, .image_div img").each((index, el) => {
      let src = $(el).attr("data-src") || $(el).attr("src") || "";
      if (src.startsWith("//")) src = "https:" + src;
      else if (src.startsWith("/")) src = \`\${BASE_URL}\${src}\`;
      if (src) {
        pages.push({
          index,
          server: \`Page \${index + 1}\`,
          link: src,
          imageUrl: src,
          type: "image",
          headers: {
            Referer: \`\${BASE_URL}/\`,
            "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
          },
        });
      }
    });
  }

  return pages;
}

export const getPages = getStream;
`);

console.log('[build-komix-providers] Step 4: Generating Provider 7...');
const p7Id = b64(P7_ID);
const p7Base = b64(P7_BASE);
writeProviderFile(p7Id, 'catalog.ts', `
import { CatalogList } from "../types";

export const catalog: CatalogList = [
  { title: "Latest", filter: "/" },
  { title: "Most Viewed", filter: "/?orderby=views" },
  { title: "Top Rated", filter: "/?orderby=rating" },
  { title: "Manhwa", filter: "/manhwa/" },
];
`);

writeProviderFile(p7Id, 'posts.ts', `
import { Post, ProviderContext } from "../types";

export const BASE_URL = "${p7Base}";
const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  Referer: "${p7Base}/",
};

export async function getPosts({
  page = 1,
  filter = "/",
  signal,
  providerContext,
}: {
  page?: number;
  filter?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const url = page > 1
    ? (filter.includes("?") ? \`\${BASE_URL}\${filter}&paged=\${page}\` : \`\${BASE_URL}\${filter}page/\${page}/\`)
    : \`\${BASE_URL}\${filter}\`;

  try {
    const res = await providerContext.axios.get(url, {
      headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
      signal,
      timeout: 15000,
    });
    const $ = providerContext.cheerio.load(res.data);
    const posts: Post[] = [];

    $(".post-list article, .item-box, .my-post, article, .post").each((_, el) => {
      const a = $(el).find("h2 a, .entry-title a, a").first();
      const href = a.attr("href");
      if (!href) return;
      const title = a.text().trim() || $(el).find(".entry-title, h2, h3").text().trim() || "Untitled";
      const img = $(el).find("img").first();
      let cover = img.attr("data-src") || img.attr("data-lazy-src") || img.attr("src") || "";
      if (cover.startsWith("//")) cover = "https:" + cover;
      else if (cover.startsWith("/")) cover = \`\${BASE_URL}\${cover}\`;

      posts.push({
        title,
        link: href,
        image: cover,
        poster: cover,
        cover,
        provider: "${p7Id}",
      });
    });

    return posts;
  } catch {
    return [];
  }
}

export async function getSearchPosts({
  searchQuery,
  page = 1,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  if (!searchQuery?.trim()) return [];
  const url = \`\${BASE_URL}/?s=\${encodeURIComponent(searchQuery.trim())}&paged=\${page}\`;

  try {
    const res = await providerContext.axios.get(url, {
      headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
      signal,
      timeout: 15000,
    });
    const $ = providerContext.cheerio.load(res.data);
    const posts: Post[] = [];

    $(".post-list article, .item-box, .my-post, article, .post").each((_, el) => {
      const a = $(el).find("h2 a, .entry-title a, a").first();
      const href = a.attr("href");
      if (!href) return;
      const title = a.text().trim() || $(el).find(".entry-title, h2, h3").text().trim() || "Untitled";
      const img = $(el).find("img").first();
      let cover = img.attr("data-src") || img.attr("data-lazy-src") || img.attr("src") || "";
      if (cover.startsWith("//")) cover = "https:" + cover;
      else if (cover.startsWith("/")) cover = \`\${BASE_URL}\${cover}\`;

      posts.push({
        title,
        link: href,
        image: cover,
        poster: cover,
        cover,
        provider: "${p7Id}",
      });
    });

    return posts;
  } catch {
    return [];
  }
}
`);

writeProviderFile(p7Id, 'meta.ts', `
import { Info, ProviderContext } from "../types";
import { BASE_URL } from "./posts";

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const fullUrl = link.startsWith("http") ? link : \`\${BASE_URL}\${link.startsWith("/") ? "" : "/"}\${link}\`;
  const res = await providerContext.axios.get(fullUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: \`\${BASE_URL}/\`,
    },
    timeout: 15000,
  });

  const $ = providerContext.cheerio.load(res.data);
  const title = $("h1.entry-title, h1").first().text().trim() || "Comic";
  const imgEl = $(".post-thumbnail img, .entry-content img, article img").first();
  let image = imgEl.attr("data-src") || imgEl.attr("data-lazy-src") || imgEl.attr("src") || "";
  if (image.startsWith("//")) image = "https:" + image;
  else if (image.startsWith("/")) image = \`\${BASE_URL}\${image}\`;

  const synopsis = $(".entry-content p, .synopsis").first().text().trim() || \`Read \${title} online.\`;

  const tags: string[] = [];
  $('a[rel="tag"], .post-tags a').each((_, el) => {
    const t = $(el).text().trim();
    if (t) tags.push(t);
  });

  // Check multi-chapter listing if any
  const chapterLinks: any[] = [];
  $(".chapter-list a, .listing-chapters_sub a, .wp-manga-chapter a").each((i, el) => {
    const chHref = $(el).attr("href");
    const chTitle = $(el).text().trim() || \`Chapter \${i + 1}\`;
    if (chHref) {
      chapterLinks.push({
        id: String(i + 1),
        title: chTitle,
        chapterNumber: i + 1,
        link: chHref,
        type: "comic",
      });
    }
  });

  const directLinks = chapterLinks.length > 0 ? chapterLinks : [
    {
      id: "1",
      title: title,
      chapterNumber: 1,
      link: fullUrl,
      type: "comic",
    },
  ];

  return {
    title,
    image,
    poster: image,
    cover: image,
    synopsis,
    imdbId: fullUrl,
    type: "comic",
    tags: tags.length > 0 ? tags : ["Western", "Comics"],
    totalChapters: directLinks.length,
    linkList: [
      {
        title: "Chapters",
        directLinks,
      },
    ],
    chapters: directLinks,
    episodes: directLinks,
  };
}
`);

writeProviderFile(p7Id, 'stream.ts', `
import { ProviderContext } from "../types";
import { cleanHighResImageUrl } from "../cleanImage";
import { BASE_URL } from "./posts";

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
  const fullUrl = link.startsWith("http") ? link : \`\${BASE_URL}\${link.startsWith("/") ? "" : "/"}\${link}\`;
  const res = await providerContext.axios.get(fullUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: \`\${BASE_URL}/\`,
    },
    signal,
    timeout: 15000,
  });

  const $ = providerContext.cheerio.load(res.data);
  const seen = new Set<string>();
  const pages: any[] = [];

  $(".my-gallery figure a, #image-container img, .reading-content img, .entry-content img, .page-break img").each((_, el) => {
    let raw = $(el).attr("href") || $(el).attr("data-src") || $(el).attr("data-lazy-src") || $(el).attr("src") || "";
    if (raw.startsWith("//")) raw = "https:" + raw;
    else if (raw.startsWith("/")) raw = \`\${BASE_URL}\${raw}\`;

    const cleaned = cleanHighResImageUrl(raw);
    if (cleaned && !seen.has(cleaned)) {
      seen.add(cleaned);
      const idx = pages.length;
      pages.push({
        index: idx,
        server: \`Page \${idx + 1}\`,
        link: cleaned,
        imageUrl: cleaned,
        type: "image",
        headers: {
          Referer: \`\${BASE_URL}/\`,
          "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
        },
      });
    }
  });

  return pages;
}

export const getPages = getStream;
`);

console.log('[build-komix-providers] Step 5: Generating Provider 8...');
const p8Id = b64(P8_ID);
const p8Base = b64(P8_BASE);
writeProviderFile(p8Id, 'catalog.ts', `
import { CatalogList } from "../types";

export const catalog: CatalogList = [
  { title: "New", filter: "/new" },
  { title: "Western Comics", filter: "/comics" },
  { title: "Cartoons", filter: "/hentai_manga" },
  { title: "Games", filter: "/games" },
];
`);

writeProviderFile(p8Id, 'posts.ts', `
import { Post, ProviderContext } from "../types";

export const BASE_URL = "${p8Base}";
const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  Referer: "${p8Base}/",
};

export async function getPosts({
  page = 1,
  filter = "/new",
  signal,
  providerContext,
}: {
  page?: number;
  filter?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const url = page > 1
    ? \`\${BASE_URL}\${filter}?page=\${page - 1}\`
    : \`\${BASE_URL}\${filter}\`;

  try {
    const res = await providerContext.axios.get(url, {
      headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
      signal,
      timeout: 15000,
    });
    const $ = providerContext.cheerio.load(res.data);
    const posts: Post[] = [];

    $(".view-content .views-row, .masonry-item, .node-teaser").each((_, el) => {
      const a = $(el).find("a").first();
      const href = a.attr("href");
      if (!href) return;
      const title = $(el).find(".views-field-title a, h2 a, a").first().text().trim() || "Untitled";
      const img = $(el).find("img").first();
      let cover = img.attr("src") || img.attr("data-src") || "";
      if (cover.startsWith("//")) cover = "https:" + cover;
      else if (cover.startsWith("/")) cover = \`\${BASE_URL}\${cover}\`;

      const fullLink = href.startsWith("http") ? href : \`\${BASE_URL}\${href.startsWith("/") ? "" : "/"}\${href}\`;
      posts.push({
        title,
        link: fullLink,
        image: cover,
        poster: cover,
        cover,
        provider: "${p8Id}",
      });
    });

    return posts;
  } catch {
    return [];
  }
}

export async function getSearchPosts({
  searchQuery,
  page = 1,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  if (!searchQuery?.trim()) return [];
  const url = \`\${BASE_URL}/search?query=\${encodeURIComponent(searchQuery.trim())}&page=\${page - 1}\`;

  try {
    const res = await providerContext.axios.get(url, {
      headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
      signal,
      timeout: 15000,
    });
    const $ = providerContext.cheerio.load(res.data);
    const posts: Post[] = [];

    $(".view-content .views-row, .search-result, .masonry-item").each((_, el) => {
      const a = $(el).find("a").first();
      const href = a.attr("href");
      if (!href) return;
      const title = a.text().trim() || "Comic";
      const img = $(el).find("img").first();
      let cover = img.attr("src") || img.attr("data-src") || "";
      if (cover.startsWith("//")) cover = "https:" + cover;
      else if (cover.startsWith("/")) cover = \`\${BASE_URL}\${cover}\`;

      const fullLink = href.startsWith("http") ? href : \`\${BASE_URL}\${href.startsWith("/") ? "" : "/"}\${href}\`;
      posts.push({
        title,
        link: fullLink,
        image: cover,
        poster: cover,
        cover,
        provider: "${p8Id}",
      });
    });

    return posts;
  } catch {
    return [];
  }
}
`);

writeProviderFile(p8Id, 'meta.ts', `
import { Info, ProviderContext } from "../types";
import { BASE_URL } from "./posts";

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const fullUrl = link.startsWith("http") ? link : \`\${BASE_URL}\${link.startsWith("/") ? "" : "/"}\${link}\`;
  const res = await providerContext.axios.get(fullUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: \`\${BASE_URL}/\`,
    },
    timeout: 15000,
  });

  const $ = providerContext.cheerio.load(res.data);
  const title = $("#page-title, h1").first().text().trim() || "Comic Gallery";
  const imgEl = $(".field-name-field-images img, .field-items img").first();
  let image = imgEl.attr("src") || imgEl.attr("data-src") || "";
  if (image.startsWith("//")) image = "https:" + image;
  else if (image.startsWith("/")) image = \`\${BASE_URL}\${image}\`;

  const tags: string[] = [];
  $(".field-name-field-tags a, .field-name-field-artist a, .field-name-field-characters a").each((_, el) => {
    const t = $(el).text().trim();
    if (t) tags.push(t);
  });

  return {
    title,
    image,
    poster: image,
    cover: image,
    synopsis: \`Read \${title} in full color.\`,
    imdbId: fullUrl,
    type: "comic",
    tags: tags.length > 0 ? tags : ["Western Comics", "Games"],
    totalChapters: 1,
    linkList: [
      {
        title: "Chapters",
        directLinks: [
          {
            id: "1",
            title: title,
            chapterNumber: 1,
            link: fullUrl,
            type: "comic",
          },
        ],
      },
    ],
    chapters: [
      {
        id: "1",
        title: title,
        chapterNumber: 1,
        link: fullUrl,
      },
    ],
    episodes: [
      {
        id: "1",
        title: title,
        chapterNumber: 1,
        link: fullUrl,
      },
    ],
  };
}
`);

writeProviderFile(p8Id, 'stream.ts', `
import { ProviderContext } from "../types";
import { BASE_URL } from "./posts";

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
  const fullUrl = link.startsWith("http") ? link : \`\${BASE_URL}\${link.startsWith("/") ? "" : "/"}\${link}\`;
  const res = await providerContext.axios.get(fullUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: \`\${BASE_URL}/\`,
    },
    signal,
    timeout: 15000,
  });

  const html = res.data;
  const xmlMatch = html.match(/configUrl\\s*[:=]\\s*["']([^"']+)["']/i) ||
                   html.match(/["'](\\/juicebox\\/xml\\/field\\/node\\/\\d+\\/field_images\\/full[^"']*)["']/i);

  const pages: any[] = [];
  const seen = new Set<string>();

  if (xmlMatch) {
    const xmlPath = xmlMatch[1];
    const xmlUrl = xmlPath.startsWith("http") ? xmlPath : \`\${BASE_URL}\${xmlPath.startsWith("/") ? "" : "/"}\${xmlPath}\`;
    try {
      const xmlRes = await providerContext.axios.get(xmlUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
          Accept: "application/xml, text/xml, */*",
          Referer: fullUrl,
        },
        timeout: 15000,
      });

      const xmlText = xmlRes.data;
      const imgRegex = /imageURL="([^"]+)"/g;
      let m: RegExpExecArray | null;
      while ((m = imgRegex.exec(xmlText)) !== null) {
        let imgUrl = m[1];
        if (imgUrl.startsWith("//")) imgUrl = "https:" + imgUrl;
        else if (imgUrl.startsWith("/")) imgUrl = \`\${BASE_URL}\${imgUrl}\`;

        if (!seen.has(imgUrl)) {
          seen.add(imgUrl);
          const idx = pages.length;
          pages.push({
            index: idx,
            server: \`Page \${idx + 1}\`,
            link: imgUrl,
            imageUrl: imgUrl,
            type: "image",
            headers: {
              Referer: \`\${BASE_URL}/\`,
              "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
            },
          });
        }
      }
    } catch {}
  }

  // Fallback to DOM images
  if (pages.length === 0) {
    const $ = providerContext.cheerio.load(html);
    $(".jb-idx-thb img, .gallery-item img, .field-name-field-images img").each((_, el) => {
      let raw = $(el).attr("src") || $(el).attr("data-src") || "";
      if (raw.startsWith("//")) raw = "https:" + raw;
      else if (raw.startsWith("/")) raw = \`\${BASE_URL}\${raw}\`;
      if (raw && !seen.has(raw)) {
        seen.add(raw);
        const idx = pages.length;
        pages.push({
          index: idx,
          server: \`Page \${idx + 1}\`,
          link: raw,
          imageUrl: raw,
          type: "image",
          headers: {
            Referer: \`\${BASE_URL}/\`,
            "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
          },
        });
      }
    });
  }

  return pages;
}

export const getPages = getStream;
`);

console.log('[build-komix-providers] Step 6: Generating Provider 9...');
const p9Id = b64(P9_ID);
const p9Base = b64(P9_BASE);
writeProviderFile(p9Id, 'catalog.ts', `
import { CatalogList } from "../types";

export const catalog: CatalogList = [
  { title: "Latest Comics", filter: "/" },
  { title: "Popular", filter: "/?sort=popular" },
  { title: "3D Comics", filter: "/category/3d-comics/" },
  { title: "Western", filter: "/category/western/" },
];
`);

writeProviderFile(p9Id, 'posts.ts', `
import { Post, ProviderContext } from "../types";

export const BASE_URL = "${p9Base}";
const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  Referer: "${p9Base}/",
};

export async function getPosts({
  page = 1,
  filter = "/",
  signal,
  providerContext,
}: {
  page?: number;
  filter?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const url = page > 1
    ? (filter.includes("?") ? \`\${BASE_URL}\${filter}&page=\${page}\` : \`\${BASE_URL}\${filter}page/\${page}/\`)
    : \`\${BASE_URL}\${filter}\`;

  try {
    const res = await providerContext.axios.get(url, {
      headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
      signal,
      timeout: 15000,
    });
    const $ = providerContext.cheerio.load(res.data);
    const posts: Post[] = [];

    $("article, .post, .entry-card, .type-post").each((_, el) => {
      const a = $(el).find("h2 a, .entry-title a, a").first();
      const href = a.attr("href");
      if (!href) return;
      const title = a.text().trim() || $(el).find("h2, .entry-title").text().trim() || "Untitled Comic";
      const img = $(el).find("img").first();
      let cover = img.attr("data-src") || img.attr("data-lazy-src") || img.attr("src") || "";
      if (cover.startsWith("//")) cover = "https:" + cover;
      else if (cover.startsWith("/")) cover = \`\${BASE_URL}\${cover}\`;

      posts.push({
        title,
        link: href,
        image: cover,
        poster: cover,
        cover,
        provider: "${p9Id}",
      });
    });

    return posts;
  } catch {
    return [];
  }
}

export async function getSearchPosts({
  searchQuery,
  page = 1,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  if (!searchQuery?.trim()) return [];
  const url = \`\${BASE_URL}/?s=\${encodeURIComponent(searchQuery.trim())}&page=\${page}\`;

  try {
    const res = await providerContext.axios.get(url, {
      headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
      signal,
      timeout: 15000,
    });
    const $ = providerContext.cheerio.load(res.data);
    const posts: Post[] = [];

    $("article, .post, .entry-card, .type-post").each((_, el) => {
      const a = $(el).find("h2 a, .entry-title a, a").first();
      const href = a.attr("href");
      if (!href) return;
      const title = a.text().trim() || $(el).find("h2, .entry-title").text().trim() || "Untitled Comic";
      const img = $(el).find("img").first();
      let cover = img.attr("data-src") || img.attr("data-lazy-src") || img.attr("src") || "";
      if (cover.startsWith("//")) cover = "https:" + cover;
      else if (cover.startsWith("/")) cover = \`\${BASE_URL}\${cover}\`;

      posts.push({
        title,
        link: href,
        image: cover,
        poster: cover,
        cover,
        provider: "${p9Id}",
      });
    });

    return posts;
  } catch {
    return [];
  }
}
`);

writeProviderFile(p9Id, 'meta.ts', `
import { Info, ProviderContext } from "../types";
import { BASE_URL } from "./posts";

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const fullUrl = link.startsWith("http") ? link : \`\${BASE_URL}\${link.startsWith("/") ? "" : "/"}\${link}\`;
  const res = await providerContext.axios.get(fullUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: \`\${BASE_URL}/\`,
    },
    timeout: 15000,
  });

  const $ = providerContext.cheerio.load(res.data);
  const title = $("h1.entry-title, h1").first().text().trim() || "Western Comic";
  const imgEl = $(".entry-content img, .post-thumbnail img, article img").first();
  let image = imgEl.attr("data-src") || imgEl.attr("data-lazy-src") || imgEl.attr("src") || "";
  if (image.startsWith("//")) image = "https:" + image;
  else if (image.startsWith("/")) image = \`\${BASE_URL}\${image}\`;

  const tags: string[] = [];
  $('a[rel="category tag"], a[rel="tag"]').each((_, el) => {
    const t = $(el).text().trim();
    if (t) tags.push(t);
  });

  return {
    title,
    image,
    poster: image,
    cover: image,
    synopsis: \`Read complete comic of \${title}.\`,
    imdbId: fullUrl,
    type: "comic",
    tags: tags.length > 0 ? tags : ["Western", "3D Comics"],
    totalChapters: 1,
    linkList: [
      {
        title: "Chapters",
        directLinks: [
          {
            id: "1",
            title: title,
            chapterNumber: 1,
            link: fullUrl,
            type: "comic",
          },
        ],
      },
    ],
    chapters: [
      {
        id: "1",
        title: title,
        chapterNumber: 1,
        link: fullUrl,
      },
    ],
    episodes: [
      {
        id: "1",
        title: title,
        chapterNumber: 1,
        link: fullUrl,
      },
    ],
  };
}
`);

writeProviderFile(p9Id, 'stream.ts', `
import { ProviderContext } from "../types";
import { cleanHighResImageUrl } from "../cleanImage";
import { BASE_URL } from "./posts";

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
  const fullUrl = link.startsWith("http") ? link : \`\${BASE_URL}\${link.startsWith("/") ? "" : "/"}\${link}\`;
  const res = await providerContext.axios.get(fullUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: \`\${BASE_URL}/\`,
    },
    signal,
    timeout: 15000,
  });

  const $ = providerContext.cheerio.load(res.data);
  const seen = new Set<string>();
  const pages: any[] = [];

  $(".entry-content img, .wp-block-image img, .single-content img, figure img").each((_, el) => {
    let raw = $(el).attr("data-full-url") || $(el).attr("data-orig-file") || $(el).attr("data-src") || $(el).attr("data-lazy-src") || $(el).attr("src") || "";
    if (raw.startsWith("//")) raw = "https:" + raw;
    else if (raw.startsWith("/")) raw = \`\${BASE_URL}\${raw}\`;

    const cleaned = cleanHighResImageUrl(raw);
    if (cleaned && !seen.has(cleaned)) {
      seen.add(cleaned);
      const idx = pages.length;
      pages.push({
        index: idx,
        server: \`Page \${idx + 1}\`,
        link: cleaned,
        imageUrl: cleaned,
        type: "image",
        headers: {
          Referer: \`\${BASE_URL}/\`,
          "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
        },
      });
    }
  });

  return pages;
}

export const getPages = getStream;
`);

console.log('[build-komix-providers] Step 7: Generating Provider 10...');
const p10Id = b64(P10_ID);
const p10Base = b64(P10_BASE);
const p10Api = b64(P10_API);
writeProviderFile(p10Id, 'catalog.ts', `
import { CatalogList } from "../types";

export const catalog: CatalogList = [
  { title: "Western Comics", filter: "?f_cats=511" },
  { title: "Popular", filter: "/popular" },
  { title: "Doujinshi", filter: "?f_cats=1021" },
  { title: "Manga", filter: "?f_cats=1019" },
  { title: "English", filter: "?f_search=language:english" },
];
`);

writeProviderFile(p10Id, 'posts.ts', `
import { Post, ProviderContext } from "../types";

export const BASE_URL = "${p10Base}";
export const API_URL = "${p10Api}";

const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  Referer: "${p10Base}/",
};

export async function getPosts({
  page = 1,
  filter = "?f_cats=511",
  signal,
  providerContext,
}: {
  page?: number;
  filter?: string;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const url = filter.startsWith("/")
    ? \`\${BASE_URL}\${filter}?page=\${page - 1}\`
    : \`\${BASE_URL}/\${filter}&page=\${page - 1}\`;

  try {
    const res = await providerContext.axios.get(url, {
      headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
      signal,
      timeout: 15000,
    });
    const $ = providerContext.cheerio.load(res.data);
    const posts: Post[] = [];

    $(".itg tr, .gl1t, .gl2t, .itg .gl1c").each((_, el) => {
      const a = $(el).find("a[href*='/g/']").first();
      const href = a.attr("href");
      if (!href) return;
      const title = $(el).find(".glink, .glname, h2, a").first().text().trim() || "Gallery";
      const img = $(el).find("img").first();
      let cover = img.attr("src") || img.attr("data-src") || "";

      posts.push({
        title,
        link: href,
        image: cover,
        poster: cover,
        cover,
        provider: "${p10Id}",
      });
    });

    return posts;
  } catch {
    return [];
  }
}

export async function getSearchPosts({
  searchQuery,
  page = 1,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page?: number;
  signal?: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  if (!searchQuery?.trim()) return [];
  const url = \`\${BASE_URL}/?f_search=\${encodeURIComponent(searchQuery.trim())}&page=\${page - 1}\`;

  try {
    const res = await providerContext.axios.get(url, {
      headers: { ...providerContext.commonHeaders, ...COMMON_HEADERS },
      signal,
      timeout: 15000,
    });
    const $ = providerContext.cheerio.load(res.data);
    const posts: Post[] = [];

    $(".itg tr, .gl1t, .gl2t, .itg .gl1c").each((_, el) => {
      const a = $(el).find("a[href*='/g/']").first();
      const href = a.attr("href");
      if (!href) return;
      const title = $(el).find(".glink, .glname, h2, a").first().text().trim() || "Gallery";
      const img = $(el).find("img").first();
      let cover = img.attr("src") || img.attr("data-src") || "";

      posts.push({
        title,
        link: href,
        image: cover,
        poster: cover,
        cover,
        provider: "${p10Id}",
      });
    });

    return posts;
  } catch {
    return [];
  }
}
`);

writeProviderFile(p10Id, 'meta.ts', `
import { Info, ProviderContext } from "../types";
import { BASE_URL, API_URL } from "./posts";

export async function getMeta({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const fullUrl = link.startsWith("http") ? link : \`\${BASE_URL}\${link.startsWith("/") ? "" : "/"}\${link}\`;
  const m = fullUrl.match(/\\/g\\/(\\d+)\\/([a-f0-9]+)/i);

  let title = "Gallery";
  let image = "";
  let tags: string[] = ["Western Comics", "Doujinshi"];
  let filecount = 1;

  if (m) {
    const gid = parseInt(m[1], 10);
    const token = m[2];
    try {
      const apiRes = await providerContext.axios.post(API_URL, {
        method: "gdata",
        gidlist: [[gid, token]],
        namespace: 1,
      }, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
          Accept: "application/json, */*",
        },
        timeout: 15000,
      });

      const gdata = apiRes.data?.gmetadata?.[0];
      if (gdata) {
        title = gdata.title || gdata.title_jpn || title;
        image = gdata.thumb || image;
        if (Array.isArray(gdata.tags) && gdata.tags.length > 0) {
          tags = gdata.tags;
        }
        if (gdata.filecount) {
          filecount = parseInt(gdata.filecount, 10);
        }
      }
    } catch {}
  }

  if (!image) {
    try {
      const htmlRes = await providerContext.axios.get(fullUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
          Referer: \`\${BASE_URL}/\`,
        },
        timeout: 15000,
      });
      const $ = providerContext.cheerio.load(htmlRes.data);
      title = $("#gn").text().trim() || $("#gj").text().trim() || title;
      const imgStyle = $("#gd1 div").attr("style") || "";
      const bgMatch = imgStyle.match(/url\\(([^)]+)\\)/);
      if (bgMatch) image = bgMatch[1].replace(/['"]/g, "");
    } catch {}
  }

  return {
    title,
    image,
    poster: image,
    cover: image,
    synopsis: \`Read \${title} with \${filecount} pages.\`,
    imdbId: fullUrl,
    type: "comic",
    tags,
    totalChapters: 1,
    linkList: [
      {
        title: "Chapters",
        directLinks: [
          {
            id: "1",
            title: title,
            chapterNumber: 1,
            link: fullUrl,
            type: "comic",
          },
        ],
      },
    ],
    chapters: [
      {
        id: "1",
        title: title,
        chapterNumber: 1,
        link: fullUrl,
      },
    ],
    episodes: [
      {
        id: "1",
        title: title,
        chapterNumber: 1,
        link: fullUrl,
      },
    ],
  };
}
`);

writeProviderFile(p10Id, 'stream.ts', `
import { ProviderContext } from "../types";
import { BASE_URL } from "./posts";

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
  const fullUrl = link.startsWith("http") ? link : \`\${BASE_URL}\${link.startsWith("/") ? "" : "/"}\${link}\`;
  const res = await providerContext.axios.get(fullUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: \`\${BASE_URL}/\`,
    },
    signal,
    timeout: 15000,
  });

  const $ = providerContext.cheerio.load(res.data);
  const viewerLinks: string[] = [];

  $("#gdt a, .gdtm a, .gdtl a").each((_, el) => {
    const href = $(el).attr("href");
    if (href && href.includes("/s/")) {
      viewerLinks.push(href);
    }
  });

  const pages: any[] = [];
  const maxPages = Math.min(viewerLinks.length, 120);

  // Fetch images in concurrent batches of 4
  const batchSize = 4;
  for (let i = 0; i < maxPages; i += batchSize) {
    const chunk = viewerLinks.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      chunk.map(async (vLink, idxInChunk) => {
        const pageIndex = i + idxInChunk;
        const pageRes = await providerContext.axios.get(vLink, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
            Referer: fullUrl,
          },
          timeout: 12000,
        });
        const page$ = providerContext.cheerio.load(pageRes.data);
        const imgSrc = page$("#img").attr("src");
        return { pageIndex, imgSrc };
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value.imgSrc) {
        pages.push({
          index: r.value.pageIndex,
          server: \`Page \${r.value.pageIndex + 1}\`,
          link: r.value.imgSrc,
          imageUrl: r.value.imgSrc,
          type: "image",
          headers: {
            Referer: fullUrl,
            "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
          },
        });
      }
    }
  }

  pages.sort((a, b) => a.index - b.index);
  return pages;
}

export const getPages = getStream;
`);

console.log('[build-komix-providers] Step 8: Updating manifest.json...');
const manifestPath = path.join(rootDir, 'manifest.json');
const manifest = [
  {
    display_name: "MangaDex",
    value: "mangadex",
    version: "1.1.0",
    icon: "https://mangadex.org/favicon.ico",
    type: "comic",
    hasSettings: false,
    disabled: false,
  },
  {
    display_name: "8Muses",
    value: "eightMuses",
    version: "1.1.0",
    icon: "https://8muses.io/favicon.ico",
    type: "comic",
    hasSettings: false,
    disabled: false,
  },
  {
    display_name: "AllPornComic",
    value: "allporncomic",
    version: "1.1.0",
    icon: "https://allporncomic.com/favicon.ico",
    type: "comic",
    hasSettings: false,
    disabled: false,
  },
  {
    display_name: "Hentaiser",
    value: "hentaiser",
    version: "1.1.0",
    icon: "https://www.hentaiser.app/favicon/favicon-32x32.png",
    type: "comic",
    hasSettings: false,
    disabled: false,
  },
  {
    display_name: b64(P5_NAME),
    value: b64(P5_ID),
    version: "1.1.0",
    icon: `${b64(P5_BASE)}/favicon.ico`,
    type: "comic",
    hasSettings: false,
    disabled: false,
  },
  {
    display_name: b64(P6_NAME),
    value: b64(P6_ID),
    version: "1.1.0",
    icon: `${b64(P6_BASE)}/favicon.ico`,
    type: "comic",
    hasSettings: false,
    disabled: false,
  },
  {
    display_name: b64(P7_NAME),
    value: b64(P7_ID),
    version: "1.1.0",
    icon: `${b64(P7_BASE)}/favicon.ico`,
    type: "comic",
    hasSettings: false,
    disabled: false,
  },
  {
    display_name: b64(P8_NAME),
    value: b64(P8_ID),
    version: "1.1.0",
    icon: `${b64(P8_BASE)}/favicon.ico`,
    type: "comic",
    hasSettings: false,
    disabled: false,
  },
  {
    display_name: b64(P9_NAME),
    value: b64(P9_ID),
    version: "1.1.0",
    icon: `${b64(P9_BASE)}/favicon.ico`,
    type: "comic",
    hasSettings: false,
    disabled: false,
  },
  {
    display_name: b64(P10_NAME),
    value: b64(P10_ID),
    version: "1.1.0",
    icon: `${b64(P10_BASE)}/favicon.ico`,
    type: "comic",
    hasSettings: false,
    disabled: false,
  },
];
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

console.log('[build-komix-providers] Step 9: Updating domains.json...');
const domainsPath = path.join(rootDir, 'domains.json');
const domainsData = {
  updatedAt: new Date().toISOString(),
  domains: {
    "mangadex.org": "mangadex.org",
    "uploads.mangadex.org": "uploads.mangadex.org",
    "api.mangadex.org": "api.mangadex.org",
    "8muses.io": "8muses.io",
    "cdn.8muses.io": "cdn.8muses.io",
    "allporncomic.com": "allporncomic.com",
    "allpornmics.com": "allporncomic.com",
    "cdn.allporncomic.com": "cdn.allporncomic.com",
    "hentaiser.com": "hentaiser.app",
    "api.hentaiser.com": "api.hentaiser.app",
    "hentaiser.app": "hentaiser.app",
    "api.hentaiser.app": "api.hentaiser.app",
    "media.hentaiser.app": "media.hentaiser.app",
    "app.hentaiser.app": "app.hentaiser.app",
    [new URL(p5Base).hostname]: new URL(p5Base).hostname,
    [new URL(p6Base).hostname]: new URL(p6Base).hostname,
    [new URL(p7Base).hostname]: new URL(p7Base).hostname,
    [new URL(p8Base).hostname]: new URL(p8Base).hostname,
    [new URL(p9Base).hostname]: new URL(p9Base).hostname,
    [new URL(p10Base).hostname]: new URL(p10Base).hostname,
  },
  mirrors: {
    mangadex: ["https://mangadex.org", "https://api.mangadex.org"],
    eightMuses: ["https://8muses.io", "https://cdn.8muses.io"],
    allporncomic: ["https://allporncomic.com", "https://cdn.allporncomic.com"],
    hentaiser: ["https://api.hentaiser.app", "https://app.hentaiser.app", "https://media.hentaiser.app"],
    [p5Id]: [p5Base, ...P5_MIRRORS.map(m => b64(m))],
    [p6Id]: [p6Base],
    [p7Id]: [p7Base],
    [p8Id]: [p8Base],
    [p9Id]: [p9Base],
    [p10Id]: [p10Base],
  },
};
fs.writeFileSync(domainsPath, JSON.stringify(domainsData, null, 2) + '\n', 'utf8');

console.log('[build-komix-providers] All 10 providers generated and metadata synchronized successfully.');
