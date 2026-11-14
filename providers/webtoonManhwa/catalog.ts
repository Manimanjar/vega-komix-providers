import { CatalogList } from "../types";

export const catalog: CatalogList = [
  {
    title: "Popular Manhwa",
    filter: "order=popular",
  },
  {
    title: "Latest Webtoons",
    filter: "order=update",
  },
  {
    title: "Top Rated",
    filter: "order=rating",
  },
  {
    title: "Action & Murim",
    filter: "genre=action",
  },
  {
    title: "Fantasy & Magic",
    filter: "genre=fantasy",
  },
  {
    title: "Reincarnation & System",
    filter: "genre=system",
  },
];

export const genres: CatalogList = [
  {
    title: "Action",
    filter: "genre=action",
  },
  {
    title: "Murim / Martial Arts",
    filter: "genre=martial-arts",
  },
  {
    title: "Fantasy",
    filter: "genre=fantasy",
  },
  {
    title: "Adventure",
    filter: "genre=adventure",
  },
  {
    title: "Comedy",
    filter: "genre=comedy",
  },
  {
    title: "Romance",
    filter: "genre=romance",
  },
  {
    title: "Supernatural",
    filter: "genre=supernatural",
  },
];
