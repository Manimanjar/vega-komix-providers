const { providerContext } = require("./provider-test-context");

async function testHentaiser() {
  console.log("\n==========================================");
  console.log("Testing Hentaiser Provider (hentaiser)");
  console.log("==========================================");

  const catalog = require("../dist/hentaiser/catalog.js");
  const posts = require("../dist/hentaiser/posts.js");
  const meta = require("../dist/hentaiser/meta.js");
  const stream = require("../dist/hentaiser/stream.js");

  // 1. Catalog
  console.log(`- Catalog items: ${catalog.catalog.length}`);
  console.log(`- Genre items: ${catalog.genres.length}`);
  if (catalog.catalog.length === 0) throw new Error("hentaiser: catalog empty");

  // 2. getPosts
  console.log("- Calling getPosts (sort=views, page 1)...");
  const postList = await posts.getPosts({
    filter: "sort=views",
    page: 1,
    providerContext,
  });
  console.log(`  ✓ Received ${postList.length} posts`);
  if (postList.length === 0) throw new Error("hentaiser: getPosts returned 0 items");
  console.log(`  ✓ Sample: "${postList[0].title}"`);
  console.log(`  ✓ Cover: ${postList[0].cover}`);
  console.log(`  ✓ Image: ${postList[0].image}`);
  console.log(`  ✓ Poster: ${postList[0].poster}`);
  if (!postList[0].cover || !postList[0].image || !postList[0].poster) {
    throw new Error("hentaiser: Missing image / cover / poster properties!");
  }

  // 3. getSearchPosts
  console.log("- Calling getSearchPosts ('miku')...");
  const searchResults = await posts.getSearchPosts({
    searchQuery: "miku",
    page: 1,
    providerContext,
  });
  console.log(`  ✓ Received ${searchResults.length} search results`);
  if (searchResults.length === 0) throw new Error("hentaiser: getSearchPosts returned 0 items");
  console.log(`  ✓ Sample Search: "${searchResults[0].title}" | Link: ${searchResults[0].link}`);

  // 4. getMeta
  console.log("- Calling getMeta for sample item...");
  const comicMeta = await meta.getMeta({
    link: postList[0].link,
    providerContext,
  });
  console.log(`  ✓ Title: "${comicMeta.title}"`);
  console.log(`  ✓ Image: ${comicMeta.image}`);
  console.log(`  ✓ Cover: ${comicMeta.cover}`);
  console.log(`  ✓ Poster: ${comicMeta.poster}`);
  console.log(`  ✓ Total Chapters/Sets: ${comicMeta.totalChapters}`);
  console.log(`  ✓ DirectLinks: ${comicMeta.linkList[0].directLinks.length}`);
  console.log(`  ✓ First DirectLink: ${comicMeta.linkList[0].directLinks[0].link}`);

  // 5. getStream
  console.log("- Calling getStream to retrieve high-res pages...");
  const readPages = await stream.getStream({
    link: comicMeta.linkList[0].directLinks[0].link,
    providerContext,
  });
  console.log(`  ✓ Received ${readPages.length} pages`);
  if (readPages.length === 0) throw new Error("hentaiser: getStream returned 0 pages");
  console.log(`  ✓ Sample Page 1: ${readPages[0].link}`);
  console.log(`  ✓ Headers:`, readPages[0].headers);

  console.log("\n>>> Hentaiser Provider: 100% VERIFIED & PASSED! <<<\n");
}

testHentaiser().catch((err) => {
  console.error("Hentaiser test failed:", err);
  process.exit(1);
});
