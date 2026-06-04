const assert = require("node:assert");

process.env.PRODUCT_IMAGE_STUDIO_TEST_MODE = "1";

const { resolveGrsaiRequestSpecForTest } = require("../main");

const config = {
  imageBaseUrl: "https://grsai.dakka.com.cn",
  grsaiBaseUrl: "https://grsai.dakka.com.cn"
};

function baseRequest(model) {
  return {
    model,
    prompt: "1:1 square image, 1024x1024.\nCreate a simple test image.",
    image: ["base64-reference"],
    size: "1024x1024",
    response_format: "url",
    aspectRatio: "1:1",
    imageSize: "1024x1024"
  };
}

const banana = resolveGrsaiRequestSpecForTest(config, {
  ...baseRequest("nano-banana-fast"),
  imageSize: "1K"
});
assert.equal(banana.endpoint, "https://grsai.dakka.com.cn/v1/api/generate");
assert.equal(banana.apiMode, "native-generate");
assert.deepEqual(Object.keys(banana.body).sort(), ["aspectRatio", "imageSize", "images", "model", "prompt", "replyType"].sort());
assert.equal(banana.body.model, "nano-banana-fast");
assert.equal(banana.body.aspectRatio, "1:1");
assert.equal(banana.body.imageSize, "1K");
assert.equal(banana.body.replyType, "json");
assert.deepEqual(banana.body.images, ["base64-reference"]);
assert.equal(Object.prototype.hasOwnProperty.call(banana.body, "image"), false);
assert.equal(Object.prototype.hasOwnProperty.call(banana.body, "size"), false);
assert.equal(Object.prototype.hasOwnProperty.call(banana.body, "response_format"), false);

const gptImage = resolveGrsaiRequestSpecForTest(config, baseRequest("gpt-image-2"));
assert.equal(gptImage.endpoint, "https://grsai.dakka.com.cn/v1/api/generate");
assert.equal(gptImage.body.aspectRatio, "1024x1024");
assert.equal(Object.prototype.hasOwnProperty.call(gptImage.body, "imageSize"), false);

const generic = resolveGrsaiRequestSpecForTest(config, baseRequest("other-image-model"));
assert.equal(generic.endpoint, "https://grsai.dakka.com.cn/v1/images/generations");
assert.equal(generic.apiMode, "openai-compatible");
assert.deepEqual(Object.keys(generic.body).sort(), ["image", "model", "prompt", "response_format", "size"].sort());

console.log("grsai native routing checks passed");
