import { CatalogList } from "../types";

export const catalog: CatalogList = [
  { title: "Latest", filter: "/" },
  { title: "Incest", filter: "/tag/incest/" },
  // No single "family" tag exists on the site; Family merges the
  // mother/sister/brother/father tag pages. (The old "Popular" category was
  // removed: /pop/ and /popular/ both 404 — the site exposes no popular list.)
  { title: "Family", filter: "multi:/tag/mother/|/tag/sister/|/tag/brother/|/tag/father/" },
  { title: "Western", filter: "/category/western/" },
  { title: "Doujinshi", filter: "/category/doujinshi/" },
  { title: "Manga", filter: "/category/manga/" },
];
