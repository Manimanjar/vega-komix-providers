import { CatalogList } from "../types";

export const catalog: CatalogList = [
  {
    title: "Popular Galleries",
    filter: "popular",
  },
  {
    title: "Latest Releases",
    filter: "latest",
  },
  {
    title: "Top Rated Doujinshi",
    filter: "top-rated",
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
    title: "Full Color",
    filter: "tag:color",
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
    title: "Western Comic",
    filter: "category:western",
  },
  {
    title: "Non-H",
    filter: "category:non-h",
  },
];
