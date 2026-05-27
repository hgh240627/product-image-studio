const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const {
  assertNoLocalFileReferencesInOutboundRequestForTest,
  containsLocalFileReferenceForTest,
  normalizeGrsaiReferenceImagesForTest
} = require("../main");

async function main() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-local-image-"));
  const imagePath = path.join(tempDir, "sample.png");
  const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
  await fs.writeFile(imagePath, Buffer.from(pngBase64, "base64"));

  const fileUrl = pathToFileURL(imagePath).href;
  const normalized = await normalizeGrsaiReferenceImagesForTest([fileUrl], 1);
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0], pngBase64);
  assert.equal(containsLocalFileReferenceForTest(normalized), false);

  assert.equal(containsLocalFileReferenceForTest("https://zyapi.tuluo.top:8888/v1/responses"), false);
  assert.equal(containsLocalFileReferenceForTest("http://127.0.0.1:8888/v1/chat/completions"), false);
  assert.equal(containsLocalFileReferenceForTest("data:image/png;base64,AAAA"), false);
  assert.equal(containsLocalFileReferenceForTest({ image: [fileUrl] }), true);
  assert.equal(containsLocalFileReferenceForTest({ image: ["C:\\Users\\demo\\AppData\\image.png"] }), true);
  assert.equal(containsLocalFileReferenceForTest({ image: ["C:/Users/demo/AppData/image.png"] }), true);
  assert.equal(containsLocalFileReferenceForTest({ image: ["\\\\server\\share\\image.png"] }), true);
  assert.throws(
    () => assertNoLocalFileReferencesInOutboundRequestForTest("https://example.test/v1/images/generations", JSON.stringify({ image: [fileUrl] })),
    /安全拦截/
  );

  assert.doesNotThrow(() => {
    assertNoLocalFileReferencesInOutboundRequestForTest(
      "https://example.test/v1/images/generations",
      JSON.stringify({ image: normalized })
    );
  });

  await fs.rm(tempDir, { recursive: true, force: true });
  console.log("Local file reference guard checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
