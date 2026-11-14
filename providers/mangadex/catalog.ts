import { Catalog, CatalogList } from "../types";

export const catalog: CatalogList = [
  {
    title: "Popular",
    filter: "order[followedCount]=desc",
  },
  {
    title: "Latest Updates",
    filter: "order[latestUploadedChapter]=desc",
  },
  {
    title: "Top Rated",
    filter: "order[rating]=desc",
  },
  {
    title: "Manhwa / Webtoons",
    filter: "originalLanguage[]=ko&order[followedCount]=desc",
  },
  {
    title: "Manga (Japanese)",
    filter: "originalLanguage[]=ja&order[followedCount]=desc",
  },
  {
    title: "Manhua (Chinese)",
    filter: "originalLanguage[]=zh&order[followedCount]=desc",
  },
];

export const genres: CatalogList = [
  {
    title: "Action",
    filter: "includedTags[]=391b04d2-d83b-44e6-be45-40ec522e6844",
  },
  {
    title: "Adventure",
    filter: "includedTags[]=87cc87cd-a395-47af-b27a-93258283bbc6",
  },
  {
    title: "Comedy",
    filter: "includedTags[]=4d32cc48-9f00-4cca-9b5a-a839f0764984",
  },
  {
    title: "Drama",
    filter: "includedTags[]=b9af3a63-f058-46de-a9a0-e0c13906197a",
  },
  {
    title: "Fantasy",
    filter: "includedTags[]=cdc58574-82b0-456b-ad23-54942d0e6dbf",
  },
  {
    title: "Isekai",
    filter: "includedTags[]=ace0429e-3b10-4321-8010-0c4c478f7292",
  },
  {
    title: "Horror",
    filter: "includedTags[]=cdad7e68-1419-41dd-bdce-6ea700daddde",
  },
  {
    title: "Mystery",
    filter: "includedTags[]=ee96342a-38fc-4297-962e-3c224e75d048",
  },
  {
    title: "Psychological",
    filter: "includedTags[]=3b60b75c-a2d7-4860-ab56-05f391bb889c",
  },
  {
    title: "Romance",
    filter: "includedTags[]=423e2eae-a7a2-4a8b-ac03-a8351462d71d",
  },
  {
    title: "Sci-Fi",
    filter: "includedTags[]=256c8bd9-4904-43c3-bf41-1812634e4d1b",
  },
  {
    title: "Slice of Life",
    filter: "includedTags[]=e5301a23-ebd9-49dd-a0cb-2add944c7fe9",
  },
  {
    title: "Supernatural",
    filter: "includedTags[]=eabc5b4c-6aff-42f3-b657-3e1900004b35",
  },
];
