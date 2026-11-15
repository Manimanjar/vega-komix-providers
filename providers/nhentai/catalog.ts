import { CatalogList } from "../types";

export const catalog: CatalogList = [
  {
    title: "Latest Doujinshi",
    filter: "latest",
  },
  {
    title: "Popular Today",
    filter: "popular",
  },
  {
    title: "English Translated",
    filter: "language:english",
  },
  {
    title: "Japanese Raws",
    filter: "language:japanese",
  },
  {
    title: "Chinese Translated",
    filter: "language:chinese",
  },
  {
    title: "Doujinshi",
    filter: "category:doujinshi",
  },
  {
    title: "Manga",
    filter: "category:manga",
  },
];

export const genres: CatalogList = [
  {
    title: "Doujinshi",
    filter: "category:doujinshi",
  },
  {
    title: "Manga",
    filter: "category:manga",
  },
  {
    title: "Artist CG",
    filter: "category:artistcg",
  },
  {
    title: "Non-H",
    filter: "category:non-h",
  },
  {
    title: "Western",
    filter: "category:western",
  },
];
