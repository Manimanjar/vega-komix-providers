import { CatalogList } from "../types";

export const catalog: CatalogList = [
  { title: "Latest", filter: "/" },
  { title: "Most Viewed", filter: "/?orderby=views" },
  { title: "Top Rated", filter: "/?orderby=rating" },
  { title: "Manhwa", filter: "/manhwa/" },
];
