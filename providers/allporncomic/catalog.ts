import { CatalogList } from "../types";

export const catalog: CatalogList = [
  {
    title: "Popular Comics",
    filter: "/porncomic/?m_orderby=views",
  },
  {
    title: "Latest Releases",
    filter: "/porncomic/?m_orderby=latest",
  },
  {
    title: "Incest",
    filter: "/porncomic-category/inceste/",
  },
  {
    title: "Family",
    // Same genre taxonomy as the existing Incest genre; the site is behind
    // Cloudflare from here so this slug could not be verified live — it needs
    // one check on the phone after the WAF challenge is solved.
    filter: "/porncomic-category/familya/",
  },
  {
    title: "Top Rated",
    filter: "/porncomic/?m_orderby=rating",
  },
  {
    title: "New Manga",
    filter: "/porncomic/?m_orderby=new-manga",
  },
  {
    title: "A-Z Alphabetical",
    filter: "/porncomic/?m_orderby=alphabet",
  },
];

export const genres: CatalogList = [
  {
    title: "3D Adult Comics",
    filter: "/porncomic-category/3d/",
  },
  {
    title: "Western Porn Comics",
    filter: "/porncomic-category/western/",
  },
  {
    title: "Hentai Manga",
    filter: "/porncomic-category/hentai-manga/",
  },
  {
    title: "Parody Comics",
    filter: "/porncomic-category/parody/",
  },
  {
    title: "Big Breasts",
    filter: "/porncomic-category/big-breasts/",
  },
  {
    title: "MILF",
    filter: "/porncomic-category/milf/",
  },
  {
    title: "Incest",
    filter: "/porncomic-category/inceste/",
  },
  {
    title: "Full Color",
    filter: "/porncomic-category/full-color/",
  },
];
