const path = require("path");
const { providerContext } = require("./provider-test-context");

async function testAdultProvider(name) {
  console.log(`\n============================================================`);
  console.log(`🧪 Testing Adult Provider: ${name}`);
  console.log(`============================================================`);

  const catalogMod = require(`../dist/${name}/catalog.js`);
  const postsMod = require(`../dist/${name}/posts.js`);
  const metaMod = require(`../dist/${name}/meta.js`);
  const streamMod = require(`../dist/${name}/stream.js`);

  // 1. Catalog
  const catalog = catalogMod.catalog || [];
  console.log(`1. Catalog: Found ${catalog.length} items`);
  if (catalog.length === 0) throw new Error(`${name}: Catalog is empty`);
  const firstFilter = catalog[0].filter;

  // 2. Posts
  console.log(`2. getPosts (filter: "${firstFilter}", page: 1)...`);
  const posts = await postsMod.getPosts({
    filter: firstFilter,
    page: 1,
    providerValue: name,
    providerContext,
  });
  console.log(`   ✅ Got ${posts.length} posts`);
  if (!posts || posts.length === 0) throw new Error(`${name}: getPosts returned 0 posts`);
  const firstPost = posts[0];
  console.log(`   Sample Post: "${firstPost.title}" -> ${firstPost.link}`);
  console.log(`   Cover Image: ${firstPost.image}`);

  // 3. Search
  const query = name === "manhwa18" ? "secret" : "naruto";
  console.log(`3. getSearchPosts (query: "${query}")...`);
  const searchResults = await postsMod.getSearchPosts({
    searchQuery: query,
    page: 1,
    providerValue: name,
    providerContext,
  });
  console.log(`   ✅ Search returned ${searchResults.length} results`);

  // 4. Meta
  console.log(`4. getMeta for sample post...`);
  const meta = await metaMod.getMeta({
    link: firstPost.link,
    provider: name,
    providerContext,
  });
  console.log(`   ✅ Got meta: Title="${meta.title}", Type="${meta.type}"`);
  console.log(`   Tags: ${meta.tags?.slice(0, 5).join(", ")}`);
  const episodes = meta.linkList?.[0]?.episodes || [];
  console.log(`   Chapters/Episodes count: ${episodes.length}`);
  if (episodes.length === 0) throw new Error(`${name}: No chapters/episodes in meta`);

  // 5. Stream / Pages
  const episodeToTest = episodes[0];
  console.log(`5. getStream for chapter: "${episodeToTest.title}" (${episodeToTest.link})...`);
  const pages = await streamMod.getStream({
    link: episodeToTest.link,
    providerContext,
  });
  console.log(`   ✅ Got ${pages.length} pages/streams`);
  if (!pages || pages.length === 0) throw new Error(`${name}: getStream returned 0 pages`);
  console.log(`   Sample Page 1: ${pages[0].imageUrl || pages[0].link}`);
  console.log(`   Headers:`, pages[0].headers);

  console.log(`✨ ${name} PASSED ALL TESTS!\n`);
}

async function run() {
  const providers = ["hentaifox", "nhentai", "manhwa18"];
  let passed = 0;
  let failed = 0;

  for (const p of providers) {
    try {
      await testAdultProvider(p);
      passed++;
    } catch (err) {
      console.error(`❌ Provider ${p} failed:`, err.message);
      failed++;
    }
  }

  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log(`SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log(`════════════════════════════════════════════════════════════`);
  if (failed > 0) process.exit(1);
}

run();
