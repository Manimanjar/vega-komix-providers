const cheerio = require("cheerio");
const { providerContext } = require("./provider-test-context");

async function testGalleryTemplate() {
  console.log("=== Testing Gallery Scraper Template ===");

  const catalogModule = require("../dist/galleryScraperTemplate/catalog.js");
  const postsModule = require("../dist/galleryScraperTemplate/posts.js");
  const metaModule = require("../dist/galleryScraperTemplate/meta.js");
  const streamModule = require("../dist/galleryScraperTemplate/stream.js");

  // 1. Catalog
  console.log("\n1. Testing Catalog...");
  const catalog = catalogModule.catalog || [];
  const genres = catalogModule.genres || [];
  console.log(`Catalog items: ${catalog.length}, Genres: ${genres.length}`);
  catalog.forEach(c => console.log(` - ${c.title} -> ${c.filter}`));

  // 2. Mock HTML for Posts
  console.log("\n2. Testing parseGalleryCards logic via mock server/context...");
  const samplePostsHtml = `
    <html>
      <body>
        <div class="gallery">
          <a href="/g/12345/" title="Sample Doujinshi Title">
            <img src="//t.gallery.org/galleries/12345/thumb.jpg" />
            <div class="caption">Sample Doujinshi Title</div>
            <span class="tag">Doujinshi</span>
          </a>
        </div>
        <div class="gallery">
          <a href="/g/67890/" title="Epic Action Manhwa">
            <img src="https://cdn.example.org/thumbs/67890/cover.jpg" />
            <div class="caption">Epic Action Manhwa</div>
            <span class="tag">Manhwa</span>
          </a>
        </div>
      </body>
    </html>
  `;

  // Override axios to return mock html for template testing
  const mockContext = {
    ...providerContext,
    axios: {
      get: async () => ({ status: 200, data: samplePostsHtml }),
    },
  };

  const posts = await postsModule.getPosts({
    filter: "/",
    page: 1,
    providerValue: "galleryScraperTemplate",
    providerContext: mockContext,
  });

  console.log(`Parsed ${posts.length} posts from sample HTML:`);
  posts.forEach((p, i) => console.log(` [${i + 1}] ${p.title} (${p.link}) [${p.tag}]`));
  if (posts.length !== 2) throw new Error("Expected 2 posts parsed");

  // 3. Mock HTML for Meta
  console.log("\n3. Testing getMeta parsing...");
  const sampleMetaHtml = `
    <html>
      <head><title>Frieren & Himmel Love Story - Doujinshi</title></head>
      <body>
        <div id="info">
          <h1 class="title">Frieren & Himmel Love Story</h1>
          <h2 class="title">Sousou no Frieren Epilogue</h2>
          <div id="cover">
            <img src="//t.gallery.org/galleries/12345/cover.jpg" />
          </div>
          <div class="tag-container">
            <span class="field">Parodies:</span>
            <a class="tag"><span class="name">sousou no frieren</span></a>
          </div>
          <div class="tag-container">
            <span class="field">Characters:</span>
            <a class="tag"><span class="name">frieren</span></a>
            <a class="tag"><span class="name">himmel</span></a>
          </div>
          <div class="tag-container">
            <span class="field">Tags:</span>
            <a class="tag"><span class="name">romance</span></a>
            <a class="tag"><span class="name">sole female</span></a>
            <a class="tag"><span class="name">sole male</span></a>
          </div>
          <div class="tag-container">
            <span class="field">Artists:</span>
            <a class="tag"><span class="name">artist_san</span></a>
          </div>
          <div class="tag-container">
            <span class="field">Languages:</span>
            <a class="tag"><span class="name">english</span></a>
          </div>
          <div class="tag-container">
            <span class="field">Pages:</span>
            <a class="tag"><span class="name">28 pages</span></a>
          </div>
        </div>
      </body>
    </html>
  `;

  const mockMetaContext = {
    ...providerContext,
    axios: {
      get: async () => ({ status: 200, data: sampleMetaHtml }),
    },
  };

  const meta = await metaModule.getMeta({
    link: "https://example-gallery.org/g/12345/",
    providerContext: mockMetaContext,
  });

  console.log("Parsed Meta:");
  console.log(` - Title: ${meta.title}`);
  console.log(` - Author: ${meta.author}`);
  console.log(` - Total Chapters: ${meta.totalChapters}`);
  console.log(` - Tags: ${meta.tags.join(", ")}`);
  console.log(` - DirectLinks: ${meta.linkList[0]?.directLinks?.length || 0}`);
  if (meta.title !== "Frieren & Himmel Love Story") throw new Error("Title mismatch");
  if (!meta.tags.includes("Parody: sousou no frieren")) throw new Error("Parody tag missing");

  // 4. Mock HTML for Stream
  console.log("\n4. Testing getStream thumbnail-to-fullres parsing...");
  const sampleStreamHtml = `
    <html>
      <body>
        <div id="thumbnail-container">
          <div class="thumb-container">
            <a href="/g/12345/1/"><img src="//t1.gallery.org/galleries/12345/1t.jpg" /></a>
          </div>
          <div class="thumb-container">
            <a href="/g/12345/2/"><img src="//t1.gallery.org/galleries/12345/2t.png" /></a>
          </div>
          <div class="thumb-container">
            <a href="/g/12345/3/"><img src="//t1.gallery.org/galleries/12345/3t.jpg" /></a>
          </div>
        </div>
      </body>
    </html>
  `;

  const mockStreamContext = {
    ...providerContext,
    axios: {
      get: async () => ({ status: 200, data: sampleStreamHtml }),
    },
  };

  const pages = await streamModule.getStream({
    link: "https://example-gallery.org/g/12345/",
    type: "comic",
    providerContext: mockStreamContext,
  });

  console.log(`Extracted ${pages.length} pages:`);
  pages.forEach(p => {
    console.log(` - Page ${p.index + 1}: ${p.imageUrl}`);
  });

  if (pages.length !== 3) throw new Error("Expected 3 pages");
  if (pages[0].imageUrl !== "https://i1.gallery.org/galleries/12345/1.jpg") {
    throw new Error(`Expected full-res URL https://i1.gallery.org/galleries/12345/1.jpg, got ${pages[0].imageUrl}`);
  }
  if (!pages[0].headers?.Referer) throw new Error("Expected Referer header");

  console.log("\n🎉 ALL GALLERY SCRAPER TEMPLATE TESTS PASSED SUCCESSFULLY!");
}

testGalleryTemplate().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
