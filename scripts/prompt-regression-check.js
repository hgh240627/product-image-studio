const assert = require("node:assert");

process.env.PRODUCT_IMAGE_STUDIO_TEST_MODE = "1";

const {
  buildCategoryPrompt,
  normalizeImageKindSelection,
  planItemsFromPayload,
  adaptImagePromptForModel
} = require("../main");

const K_MAIN = "\u4e3b\u56fe";
const K_SMART = "\u667a\u80fd\u5339\u914d\u56fe";
const K_CLOSE = "\u7279\u5199\u56fe";
const K_SKU = "\u0053\u004b\u0055\u56fe";
const K_WHITE = "\u767d\u5e95\u56fe";
const K_SELL = "\u5356\u70b9\u56fe";
const K_SCENE = "\u573a\u666f\u56fe";
const K_APLUS = "\u9ad8\u7ea7A+";
const M_DETAIL = "\u7ec6\u8282\u6807\u6ce8\u56fe";

const payload = {
  productPackageMode: "bundle",
  productInfo: [
    "Product form: bundle.",
    "Product name: 2-piece multifunctional fruit and vegetable peeler set.",
    "Unit of sale: two peelers, one wood-grain handle and one reddish-brown wood-grain handle.",
    "Components: wood-grain peeler x1; reddish-brown wood-grain peeler x1.",
    "Correct use/material/structure: grip the wood-grain handle; long slot blade touches produce skin for peeling; comb teeth are only for julienne strips; product remains intact after use."
  ].join("\n"),
  packageInputs: {
    unitOfSale: "2-piece bundle",
    bundleComponents: "wood-grain handle peeler x1; reddish-brown wood-grain handle peeler x1",
    componentDifferences: "both tools must be visible; handle colors differ; metal head structure stays identical",
    usageNotes: "grip the wooden handle; only the long slot blade contacts skin for peeling; comb teeth are for julienne strips"
  },
  brand: {
    platform: "Amazon",
    region: "EU",
    language: "English",
    primaryColor: "auto",
    fontStyle: "auto"
  },
  ratio: "1:1",
  resolution: "1K",
  finalPrompt: "A bundle of multifunctional handheld fruit and vegetable peelers with curved wood-grain handles, reddish-brown variant, round rivets, silver metal working heads, long inner slot blade, comb teeth row, and side semicircular notch.",
  analysis: {
    product_package_mode: "bundle",
    product_mechanism: "tool",
    product_summary_zh: "Two-piece wood-grain handle fruit and vegetable peeler set.",
    unit_of_sale: "2-piece bundle",
    use_relationship: "held by the wood-grain handle; the long slot blade glides along fruit or vegetable skin; comb teeth contact vegetables only for striping or shredding",
    correct_use_method: "Hold the wooden handle. For peeling, place the long inner slot blade flat against produce skin. Do not insert the metal head into the vegetable.",
    part_function_map: [
      "wood handle = grip area",
      "long slot blade = peeling edge",
      "comb teeth = julienne striping edge",
      "side notch = localized trimming"
    ],
    detail_focus_areas: ["wood grain handle", "round rivets", "long open slot blade", "comb teeth row", "side notch"],
    misjudgment_risks: ["ordinary peeler redesign", "comb teeth used as peeling blade"],
    forbidden_use_errors: ["do not show the peeler broken", "do not insert the metal head into potato", "do not use comb teeth to peel potato skin"],
    interaction_contract: {
      grip_area: "wood-grain handle",
      working_area: "long inner slot blade for peeling; comb teeth for julienne strips",
      target_object: "fruit or vegetable surface",
      contact_rule: "working edge touches only the surface skin; metal head stays outside the produce",
      product_state_after_use: "tool remains intact, unbent, and unchanged",
      target_state_after_use: "produce skin or strips change, not the product",
      forbidden_scene_errors: ["broken peeler", "tool inserted into produce", "comb teeth peeling potato skin"]
    }
  },
  imageKinds: [
    { kind: K_MAIN, count: 1 },
    { kind: K_SMART, count: 7 },
    { kind: K_SKU, count: 1 },
    { kind: K_WHITE, count: 1 },
    { kind: K_SELL, count: 1 },
    { kind: K_SCENE, count: 1 },
    { kind: K_CLOSE, count: 1 }
  ]
};

const normalized = normalizeImageKindSelection(payload.imageKinds);
assert.deepEqual(normalized.map((item) => item.kind), [K_SKU, K_WHITE, K_SELL, K_SCENE, K_APLUS]);
assert.equal(normalized[4].module, M_DETAIL, "close-up input must become Advanced A+ detail annotation module");

const planItems = planItemsFromPayload({ ...payload, imageKinds: normalized });
assert.equal(planItems.length, 5, "only manually selected allowed categories should generate");

const skuPrompt = buildCategoryPrompt({ ...payload, imageKinds: normalized }, { kind: K_SKU, variantIndex: 0, totalForKind: 1 });
assert.match(skuPrompt, /exact complete purchase unit|Product consistency/i, "SKU prompt must lock complete purchase unit and product consistency");
assert.doesNotMatch(skuPrompt, new RegExp("Suite planning " + "layer|\\u4e3b\\u56fe|\\u667a\\u80fd\\u5339\\u914d", "i"), "category prompt must not contain suite planning layer or deleted categories");

const whitePrompt = buildCategoryPrompt({ ...payload, imageKinds: normalized }, { kind: K_WHITE, variantIndex: 0, totalForKind: 1 });
assert.match(whitePrompt, /product retouch|#FFFFFF|no redesign/i, "white-background prompt must be product retouch only");

const sellPrompt = buildCategoryPrompt({ ...payload, imageKinds: normalized }, { kind: K_SELL, variantIndex: 0, totalForKind: 1 });
assert.match(sellPrompt, /material texture|structure advantage|quantity value|one clear theme/i, "selling-point prompt must allow material, structure, and quantity value themes");

const scenePrompt = buildCategoryPrompt({ ...payload, imageKinds: normalized }, { kind: K_SCENE, variantIndex: 0, totalForKind: 1 });
assert.match(scenePrompt, /short title|interaction contract|correct grip/i, "scene prompt must include short title and interaction contract");

const adapted = adaptImagePromptForModel(scenePrompt, "gpt-image-2", payload, { kind: K_SCENE, variantIndex: 0, totalForKind: 1 });
assert.doesNotMatch(adapted, /Prompt profile:/i, "final image prompt should not expose internal prompt profile prefix");
assert.match(adapted, /product after use|tool remains intact|target after use|produce skin/i, "final prompt must preserve product-after-use and target-after-use constraints");

const wineStopperPayload = {
  productPackageMode: "single",
  productInfo: [
    "产品：单个按压式红酒塞，红色塞入段配置黑/白外壳与翻盖按压头，用于插入瓶口后下压锁紧。",
    "购买单位：单个产品",
    "正确使用/材质结构：红色部分彻底塞进瓶口内，下压头部开关，彻底密封瓶口"
  ].join("\n"),
  packageInputs: {
    unitOfSale: "单个产品",
    usageNotes: "红色部分彻底塞进瓶口内，下压头部开关，彻底密封瓶口"
  },
  brand: {
    platform: "Amazon",
    region: "EU",
    language: "English"
  },
  ratio: "1:1",
  resolution: "1K",
  finalPrompt: "Product identity: single press-type wine bottle stopper; compact plastic accessory with a red cylindrical plug section, black or white outer body option, round collar rim, hinged rounded top lever, parallel grip grooves, small metal side rivet, and thin dark sealing ring.",
  analysis: {
    product_mechanism: "bottle_stopper",
    product_summary_zh: "单个按压式红酒塞",
    unit_of_sale: "单个产品",
    use_relationship: "red plug section goes into the opened wine bottle mouth and the press lever stays above the opening",
    correct_use_method: "insert the red plug downward into the bottle mouth, keep the collar on the lip, then press the top lever down",
    detail_focus_areas: ["red cylindrical plug", "round collar rim", "hinged top press lever", "parallel grip grooves", "side rivet"],
    part_function_map: [
      "red cylindrical plug = sealing part inserted downward into bottle mouth",
      "round collar rim = stop rim on bottle lip",
      "top press lever = upper part pressed after insertion"
    ],
    forbidden_use_errors: ["do not reverse the stopper", "do not put the lever into the bottle mouth"]
  }
};
const wineScenePrompt = buildCategoryPrompt(wineStopperPayload, { kind: K_SCENE, variantIndex: 0, totalForKind: 1 });
const wineAdapted = adaptImagePromptForModel(wineScenePrompt, "gpt-image-2", wineStopperPayload, { kind: K_SCENE, variantIndex: 0, totalForKind: 1 });
assert.doesNotMatch(wineAdapted, /[\u3400-\u9fff]/, "final wine stopper prompt must not contain Chinese text");
assert.doesNotMatch(wineAdapted, /\.{3}|…/, "final wine stopper prompt must not contain ellipsis placeholders");
assert.match(wineAdapted, /red .*plug .*downward|red .*plug .*lower working end/i, "wine stopper prompt must lock red plug downward");
assert.match(wineAdapted, /top press lever .*above|lever .*above/i, "wine stopper prompt must keep press lever above bottle mouth");

console.log("prompt regression checks passed");
