const axios = require("axios");
const cheerio = require("cheerio");
const { getPosts, getSearchPosts } = require("../providers/eightMuses/posts");
const { getMeta } = require("../providers/eightMuses/meta");
const { getStream } = require("../providers/eightMuses/stream");

const mockContext = {
  axios,
  cheerio,
  commonHeaders: {},
};

async function test() {
  console.log("=== Testing eightMuses Provider ===");

  console.log("\n1. Testing getPosts (/popular)...");
  const posts = await getPosts({ filter: "/popular", page: 1, providerContext: mockContext });
  console.log(`Found ${posts.length} posts`);
  if (posts.length === 0) throw new Error("No posts returned from eightMuses getPosts");
  console.log("Sample post:", posts[0]);

  console.log("\n2. Testing getSearchPosts ('witch')...");
  const searchResults = await getSearchPosts({ searchQuery: "witch", page: 1, providerContext: mockContext });
  console.log(`Found ${searchResults.length} search results`);
  if (searchResults.length === 0) throw new Error("No search results returned from eightMuses");
  console.log("Sample search result:", searchResults[0]);

  console.log("\n3. Testing getMeta for first post...");
  const meta = await getMeta({ link: posts[0].link, providerContext: mockContext });
  console.log("Title:", meta.title);
  console.log("Chapters / links:", meta.linkList[0].directLinks.length);
  console.log("First directLink:", meta.linkList[0].directLinks[0]);

  console.log("\n4. Testing getStream for first chapter...");
  const stream = await getStream({ link: meta.linkList[0].directLinks[0].link, providerContext: mockContext });
  console.log(`Found ${stream.length} pages`);
  if (stream.length === 0) throw new Error("No stream pages returned from eightMuses");
  console.log("Sample page:", stream[0]);

  console.log("\n✅ eightMuses Provider PASSED 100%!");
}

test().catch(err => {
  console.error("❌ eightMuses test failed:", err);
  process.exit(1);
});
