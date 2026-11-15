import { CatalogList } from "../types";

export const catalog: CatalogList = [
  {
    title: "Latest Manhwa",
    filter: "latest",
  },
  {
    title: "Top Ranking",
    filter: "popular",
  },
  {
    title: "Uncensored 18+",
    filter: "genre:uncensore",
  },
  {
    title: "Raw Manhwa",
    filter: "genre:raw",
  },
  {
    title: "Webtoons",
    filter: "genre:webtoon",
  },
  {
    title: "Drama & Romance",
    filter: "genre:drama",
  },
];

export const genres: CatalogList = [
  {
    title: "Uncensored",
    filter: "genre:uncensore",
  },
  {
    title: "Raw",
    filter: "genre:raw",
  },
  {
    title: "Webtoon",
    filter: "genre:webtoon",
  },
  {
    title: "Drama",
    filter: "genre:drama",
  },
  {
    title: "Romance",
    filter: "genre:romance",
  },
];
