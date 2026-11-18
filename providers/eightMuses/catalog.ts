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
    filter: "/tag/3d",
  },
  {
    title: "Big Breasts",
    filter: "/tag/big-breasts",
  },
  {
    title: "MILF",
    filter: "/tag/milf",
  },
  {
    title: "Incest",
    // The old /genres?genre=Incest URL returns an empty page; the working
    // incest listing is the tag page.
    filter: "/tag/incest",
  },
  {
    title: "Cheating",
    filter: "/tag/cheating",
  },
  {
    title: "Western",
    filter: "/tag/western",
  },
  {
    title: "Group",
    filter: "/tag/group",
  },
  {
    title: "Full Color",
    filter: "/tag/full-color",
  },
];
