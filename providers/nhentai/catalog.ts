import { CatalogList } from "../types";

export const catalog: CatalogList = [
  { title: "Popular", filter: "sort=popular" },
  { title: "Latest", filter: "sort=recent" },
  { title: "English", filter: "language:english" },
  { title: "Doujinshi", filter: "tag:doujinshi" },
  { title: "Manga", filter: "tag:manga" },
];
