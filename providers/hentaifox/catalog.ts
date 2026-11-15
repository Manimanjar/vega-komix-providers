import { CatalogList } from "../types";

export const catalog: CatalogList = [
  {
    title: "Latest Galleries",
    filter: "latest",
  },
  {
    title: "Popular",
    filter: "popular",
  },
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
    title: "English Translated",
    filter: "language:english",
  },
  {
    title: "Japanese Raws",
    filter: "language:japanese",
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
    title: "Game CG",
    filter: "category:gamecg",
  },
  {
    title: "Western",
    filter: "category:western",
  },
];
