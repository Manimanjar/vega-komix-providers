import { CatalogList } from "../types";

export const catalog: CatalogList = [
  { title: "Latest Comics", filter: "/" },
  { title: "Incest", filter: "search:mother|sister" },
  { title: "Family", filter: "search:family" },
  { title: "Popular", filter: "/?sort=popular" },
  // The old /category/western/ and /category/3d-comics/ both 404; the site's
  // real categories are franchise-based. Hentai Manga and Furry are the
  // largest real ones on the site.
  { title: "Hentai Manga", filter: "/category/hentai-manga_porno/" },
  { title: "Furry", filter: "/category/furry-porn-comics/" },
];
