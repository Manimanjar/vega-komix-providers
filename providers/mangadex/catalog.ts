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
  // MangaDex has exactly one family-related tag: Incest
  // (5bd0e105-4481-44ca-b6e7-7544da56b1a3). There is no Family, mother, sister,
  // brother or father tag, so Family uses the same tag ordered by latest
  // uploads (the freshest family-themed manga). Both lists only include the
  // provider's safe/suggestive/erotica ratings, never pornographic.
  {
    title: "Incest",
    filter: "includedTags[]=5bd0e105-4481-44ca-b6e7-7544da56b1a3&order[followedCount]=desc",
  },
  {
    title: "Family",
    filter: "includedTags[]=5bd0e105-4481-44ca-b6e7-7544da56b1a3&order[latestUploadedChapter]=desc",
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
    filter: "includedTags[]=391b0423-d847-456f-aff0-8b0cfc03066b",
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
    filter: "includedTags[]=cdc58593-87dd-415e-bbc0-2ec27bf404cc",
  },
  {
    title: "Isekai",
    filter: "includedTags[]=ace04997-f6bd-436e-b261-779182193d3d",
  },
  {
    title: "Horror",
    filter: "includedTags[]=cdad7e68-1419-41dd-bdce-27753074a640",
  },
  {
    title: "Mystery",
    filter: "includedTags[]=ee968100-4191-4968-93d3-f82d72be7e46",
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
    filter: "includedTags[]=256c8bd9-4904-4360-bf4f-508a76d67183",
  },
  {
    title: "Slice of Life",
    filter: "includedTags[]=e5301a23-ebd9-49dd-a0cb-2add944c7fe9",
  },
  {
    title: "Supernatural",
    filter: "includedTags[]=eabc5b4c-6aff-42f3-b657-3e90cbd00b75",
  },
];
