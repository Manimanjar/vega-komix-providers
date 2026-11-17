import { CatalogList } from "../types";

export const catalog: CatalogList = [
  {
    title: "Popular Comics",
    filter: "/popular",
  },
  {
    title: "Latest Releases",
    filter: "/new",
  },
  {
    title: "Incest",
    filter: "/tag/incest",
  },
  {
    title: "Family",
    filter: "/tag/family",
  },
  {
    title: "Top Rated",
    filter: "/top",
  },
  {
    title: "Browse All",
    filter: "/browse",
  },
  {
    title: "Manga & Doujinshi",
    filter: "/manga",
  },
  {
    title: "New Manga",
    filter: "/new-manga",
  },
];

export const genres: CatalogList = [
  {
    title: "3D Comics",
    filter: "/genres?genre=3D",
  },
  {
    title: "Big Breasts",
    filter: "/genres?genre=Big+Breasts",
  },
  {
    title: "MILF",
    filter: "/genres?genre=MILF",
  },
  {
    title: "Incest",
    // The old /genres?genre=Incest URL returns an empty page; the working
    // incest listing is the tag page.
    filter: "/tag/incest",
  },
  {
    title: "Cheating",
    filter: "/genres?genre=Cheating",
  },
  {
    title: "Western",
    filter: "/genres?genre=Western",
  },
  {
    title: "Group",
    filter: "/genres?genre=Group",
  },
  {
    title: "Full Color",
    filter: "/genres?genre=Full+Color",
  },
];
