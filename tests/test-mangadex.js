const { providerContext } = require("./provider-test-context");

async function run() {
  console.log("=== Testing MangaDex Provider ===");

  const catalogModule = require("../dist/mangadex/catalog.js");
  const postsModule = require("../dist/mangadex/posts.js");
  const metaModule = require("../dist/mangadex/meta.js");
  const episodesModule = require("../dist/mangadex/episodes.js");
  const streamModule = require("../dist/mangadex/stream.js");

  // 1. Catalog
  console.log("\n1. Testing catalog...");
  const catalog = catalogModule.catalog || [];
  console.log(`Catalog filters count: ${catalog.length}`);
  catalog.forEach(c => console.log(` - [${c.title}]: ${c.filter}`));

  // 2. getPosts
  console.log("\n2. Testing getPosts (Popular / Default)...");
  const posts = await postsModule.getPosts({
    filter: "",
    page: 1,
    providerValue: "mangadex",
    providerContext,
  });
  console.log(`Fetched ${posts.length} posts.`);
  if (posts.length > 0) {
    console.log("First post:", JSON.stringify(posts[0], null, 2));
  } else {
    throw new Error("No posts returned from getPosts");
  }

  // 3. getSearchPosts
  console.log("\n3. Testing getSearchPosts ('one piece')...");
  const searchResults = await postsModule.getSearchPosts({
    searchQuery: "one piece",
    page: 1,
    providerValue: "mangadex",
    providerContext,
  });
  console.log(`Found ${searchResults.length} search results.`);
  if (searchResults.length > 0) {
    console.log("First search match:", JSON.stringify(searchResults[0], null, 2));
  } else {
    throw new Error("No search results returned for 'one piece'");
  }

  const testMangaId = searchResults[0].link;
  console.log(`\nUsing manga ID: ${testMangaId} (${searchResults[0].title})`);

  // 4. getMeta
  console.log("\n4. Testing getMeta...");
  const meta = await metaModule.getMeta({
    link: testMangaId,
    providerContext,
  });
  console.log("Manga Meta:");
  console.log(` - Title: ${meta.title}`);
  console.log(` - Author: ${meta.author}`);
  console.log(` - Artist: ${meta.artist}`);
  console.log(` - Status: ${meta.status}`);
  console.log(` - Tags: ${meta.tags?.slice(0, 5).join(", ")}`);
  console.log(` - LinkList count: ${meta.linkList.length}`);
  console.log(` - DirectLinks in first link: ${meta.linkList[0]?.directLinks?.length || 0}`);

  // 5. getEpisodes
  console.log("\n5. Testing getEpisodes...");
  const episodes = await episodesModule.getEpisodes({
    url: testMangaId,
    providerContext,
  });
  console.log(`Fetched ${episodes.length} chapters.`);
  if (episodes.length > 0) {
    console.log("First chapter:", JSON.stringify(episodes[0], null, 2));
    console.log("Latest chapter:", JSON.stringify(episodes[episodes.length - 1], null, 2));
  } else {
    throw new Error("No chapters returned from getEpisodes");
  }

  const testChapterId = episodes[0].id || episodes[0].link;
  console.log(`\nUsing chapter ID: ${testChapterId} (${episodes[0].title})`);

  // 6. getStream
  console.log("\n6. Testing getStream (fetching page images)...");
  const pages = await streamModule.getStream({
    link: testChapterId,
    type: "comic",
    providerContext,
  });
  console.log(`Fetched ${pages.length} pages for chapter.`);
  if (pages.length > 0) {
    console.log("Page 1:", JSON.stringify(pages[0], null, 2));
    if (pages.length > 1) {
      console.log(`Page ${pages.length}:`, JSON.stringify(pages[pages.length - 1], null, 2));
    }
  } else {
    throw new Error("No pages returned from getStream");
  }

  console.log("\n🎉 ALL MANGADEX TESTS PASSED SUCCESSFULLY!");
}

run().catch((err) => {
  console.error("\n❌ Test failed:", err);
  process.exit(1);
});
