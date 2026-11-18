import { CatalogList } from "../types";

export const catalog: CatalogList = [
  { title: "New", filter: "/new" },
  { title: "Incest", filter: "search:incest" },
  { title: "Family", filter: "search:family" },
  { title: "Western Comics", filter: "/comics" },
  { title: "Cartoons", filter: "/hentai_manga" },
  // No Games category: games are interactive, not image galleries — every game
  // tap returned 0 pages and errored in the reader. Game links are also
  // filtered out of the other lists in posts.ts.
];
