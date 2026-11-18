import { AxiosStatic } from "axios";
import * as cheerio from "cheerio";

// Content type for providers (replaces zustand import)
export interface Content {
  provider: string;
  [key: string]: any;
}

// getPosts
export interface Post {
  title: string;
  link: string;
  image: string;
  poster?: string;
  cover?: string;
  provider?: string;
  aspectRatio?: number | string;
  borderRadius?: number;
  tag?: string;
  cornerTag?: string;
  // Rating & views as shown on the site (user, 2026-11-18): rating is
  // the site's star/score value (number, e.g. 4.5, or a string the
  // site shows), views is the site's real view count. Both are
  // optional — a site that does not show them leaves them unset, and
  // the app treats unset as "unknown" (sorts last, no badge).
  rating?: number | string;
  views?: number;
  // Total chapter count for this comic, as shown on the site's list
  // card (latest chapter number, or the count from the detail page).
  // Single-gallery sites report 1.
  chapterCount?: number;
  [key: string]: any;
}

export type TextTracks = {
  title: string;
  language: string;
  type: "application/x-subrip" | "application/ttml+xml" | "text/vtt";
  uri: string;
}[];

export interface SkipInterval {
  title?: string;
  from: number;
  to: number;
}

// getStream
/** JSON-serializable DRM configuration returned by a provider. */
export interface StreamDrm {
  type: 'widevine' | 'playready' | 'clearkey' | 'fairplay';
  licenseServer?: string;
  /** License request headers, separate from stream/manifest headers. */
  headers?: Record<string, string>;
  /** ClearKey key IDs mapped to keys, both 32-character hexadecimal strings. */
  clearKeys?: Record<string, string>;
  multiDrm?: boolean;
  contentId?: string;
  certificateUrl?: string;
  base64Certificate?: boolean;
}

export interface Stream {
  server: string;
  link: string;
  type: string;
  quality?: "360" | "480" | "720" | "1080" | "2160" | string;
  tag?: string;
  tags?: string[];
  subtitles?: TextTracks;
  headers?: any;
  drm?: StreamDrm;
  skip?: SkipInterval[];
}

export interface PageImage {
  index: number;
  imageUrl: string;
  width?: number;
  height?: number;
  headers?: Record<string, string>;
}

// getInfo
export interface Info {
  title: string;
  image: string;
  poster?: string;
  cover?: string;
  logo?: string;
  synopsis: string;
  imdbId: string;
  tmdbId?: string;
  type: string;
  tags?: string[];
  cast?: string[];
  rating?: string;
  // Real view count as shown on the site's detail page (user,
  // 2026-11-18). Optional — a site that does not show views leaves it
  // unset and the app hides the views badge.
  views?: number;
  linkList: Link[];
  webUrl?: string;
  author?: string;
  artist?: string;
  status?: string;
  totalChapters?: number;
  [key: string]: any;
}

// getEpisodeLinks / getChapters
export interface EpisodeLink {
  title: string;
  link: string;
  description?: string;
  image?: string;
  skip?: SkipInterval[];
}

export interface ChapterLink {
  id?: string;
  title: string;
  chapterNumber?: number;
  volume?: number;
  scanlator?: string;
  releaseDate?: string;
  language?: string;
  link: string;
  description?: string;
  image?: string;
  skip?: SkipInterval[];
}

export interface Link {
  title: string;
  quality?: string;
  episodesLink?: string;
  directLinks?: Array<{
    title: string;
    link: string;
    type?: "movie" | "series" | "comic";
    description?: string;
    image?: string;
    chapterNumber?: number;
    volume?: number;
    scanlator?: string;
    releaseDate?: string;
    language?: string;
    skip?: SkipInterval[];
  }>;
}

// catalog
export interface Catalog {
  title: string;
  filter: string;
}

export type CatalogList =
  | Catalog[]
  | ((params?: { signal?: AbortSignal; providerContext?: ProviderContext }) => Promise<Catalog[]> | Catalog[]);

export interface ProviderType {
  searchFilter?: string;
  catalog: CatalogList;
  genres: CatalogList;
  blurImage?: boolean;
  nonStreamableServer?: string[];
  nonDownloadableServer?: string[];
  GetStream: ({
    link,
    type,
    signal,
    providerContext,
    isDownload,
  }: {
    link: string;
    type: string;
    signal?: AbortSignal;
    providerContext: ProviderContext;
    isDownload?: boolean;
  }) => Promise<Stream[] | PageImage[]>;
  GetPages?: ({
    link,
    type,
    signal,
    providerContext,
    isDownload,
  }: {
    link: string;
    type?: string;
    signal?: AbortSignal;
    providerContext: ProviderContext;
    isDownload?: boolean;
  }) => Promise<PageImage[]>;
  GetChapters?: ({
    url,
    providerContext,
  }: {
    url: string;
    providerContext: ProviderContext;
  }) => Promise<ChapterLink[]>;
  GetEpisodeLinks?: ({
    url,
    providerContext,
  }: {
    url: string;
    providerContext: ProviderContext;
  }) => Promise<(EpisodeLink | ChapterLink)[]>;
  GetMetaData: ({
    link,
    provider,
    providerContext,
  }: {
    link: string;
    provider: Content["provider"];
    providerContext: ProviderContext;
  }) => Promise<Info>;
  GetHomePosts: ({
    filter,
    page,
    providerValue,
    signal,
    providerContext,
  }: {
    filter: string;
    page: number;
    providerValue: string;
    signal: AbortSignal;
    providerContext: ProviderContext;
  }) => Promise<Post[]>;
  GetSearchPosts: ({
    searchQuery,
    page,
    providerValue,
    signal,
    providerContext,
  }: {
    searchQuery: string;
    page: number;
    providerValue: string;
    signal: AbortSignal;
    providerContext: ProviderContext;
  }) => Promise<Post[]>;
}

// Options to customize the WAF-solving WebView dialog.
// Options to customize the WAF-solving WebView dialog.
export interface OpenWebViewOptions {
  // Title shown in the dialog header.
  title?: string;
  // Helper text shown under the title.
  description?: string;

  headers?: Record<string, string>;

  waitForCookie?: string;

  force?: boolean;
  // If set, the dialog auto-cancels (rejects) after this many milliseconds.
  timeoutMs?: number;

  // Custom JavaScript injected into the WebView. Can communicate back via:
  // window.ReactNativeWebView.postMessage(JSON.stringify({ __waf: true, data: ... }))
  injectedJavaScript?: string;
}

// Result returned to the provider after the user solves the challenge.
export interface OpenWebViewResult {
  // The page response after the challenge is solved: the rendered HTML of the
  // document (document.documentElement.outerHTML).
  data: string;
  // Cookie header value, e.g. "cf_clearance=abc; other=def".
  cookies: string;
  // Cookies as a name -> value map.
  cookieMap: Record<string, string>;
  // The User-Agent used by the WebView.
  userAgent: string;
  // The URL that was opened.
  url: string;
}

export interface ProviderKvStore {
  get: <T = unknown>(key: string) => Promise<T | undefined>;
  set: (key: string, value: unknown) => Promise<void>;
  delete: (key: string) => Promise<boolean>;
  keys: () => Promise<string[]>;
  clear: () => Promise<void>;
}

interface SettingsFieldBase {
  key: string;
  label: string;
  description?: string;
}

interface SettingsTextField extends SettingsFieldBase {
  type: "text";
  defaultValue?: string;
  placeholder?: string;
}

interface SettingsToggleField extends SettingsFieldBase {
  type: "toggle";
  defaultValue?: boolean;
}

interface SettingsSelectField extends SettingsFieldBase {
  type: "select";
  options: { label: string; value: string }[];
  defaultValue?: string;
}

interface SettingsMultiSelectField extends SettingsFieldBase {
  type: "multiselect";
  options: { label: string; value: string }[];
  defaultValue?: string[];
}

interface SettingsNumberField extends SettingsFieldBase {
  type: "number";
  defaultValue?: number;
  min?: number;
  max?: number;
}

export type SettingsField =
  | SettingsTextField
  | SettingsToggleField
  | SettingsSelectField
  | SettingsMultiSelectField
  | SettingsNumberField;

export type ProviderContext = {
  axios: AxiosStatic;
  commonHeaders: Record<string, string>;
  cheerio: typeof cheerio;
  openWebView: (
    url: string,
    options?: OpenWebViewOptions,
  ) => Promise<OpenWebViewResult>;
  kvStore: ProviderKvStore;
};
