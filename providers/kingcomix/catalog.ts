import { CatalogList } from "../types";

export const catalog: CatalogList = [
  { title: "Latest Comics", filter: "/" },
  { title: "Popular", filter: "/?sort=popular" },
  { title: "3D Comics", filter: "/category/3d-comics/" },
  { title: "Western", filter: "/category/western/" },
];
