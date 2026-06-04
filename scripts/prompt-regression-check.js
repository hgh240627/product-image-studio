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
assert.match(skuPrompt, /Visual case-library quality layer|Brand-product photography grammar/i, "SKU prompt must include visual case grammar quality layer");
assert.doesNotMatch(skuPrompt, new RegExp("Suite planning " + "layer|\\u4e3b\\u56fe|\\u667a\\u80fd\\u5339\\u914d", "i"), "category prompt must not contain suite planning layer or deleted categories");

const whitePrompt = buildCategoryPrompt({ ...payload, imageKinds: normalized }, { kind: K_WHITE, variantIndex: 0, totalForKind: 1 });
assert.match(whitePrompt, /product retouch|#FFFFFF|no redesign/i, "white-background prompt must be product retouch only");

const sellPrompt = buildCategoryPrompt({ ...payload, imageKinds: normalized }, { kind: K_SELL, variantIndex: 0, totalForKind: 1 });
assert.match(sellPrompt, /pain-solution|buyer problem|solved result|quantity value|one clear theme/i, "selling-point prompt must focus on buyer pain and solved results");
assert.match(sellPrompt, /Pain-solution selling grammar|Selling-point quality check/i, "selling-point prompt must include pain-solution quality layer");
assert.doesNotMatch(sellPrompt, /Information-card selling grammar/i, "selling-point prompt must not use the old information-card grammar");

const scenePrompt = buildCategoryPrompt({ ...payload, imageKinds: normalized }, { kind: K_SCENE, variantIndex: 0, totalForKind: 1 });
assert.match(scenePrompt, /short title|interaction contract|correct grip/i, "scene prompt must include short title and interaction contract");
assert.match(scenePrompt, /Scene-narrative grammar|Scene quality check/i, "scene prompt must include scene-narrative quality layer");

const adapted = adaptImagePromptForModel(scenePrompt, "gpt-image-2", payload, { kind: K_SCENE, variantIndex: 0, totalForKind: 1 });
assert.doesNotMatch(adapted, /Prompt profile:/i, "final image prompt should not expose internal prompt profile prefix");
assert.match(adapted, /product after use|tool remains intact|target after use|produce skin/i, "final prompt must preserve product-after-use and target-after-use constraints");
assert.ok(adapted.length <= 1250, `final scene prompt must stay concise, got ${adapted.length} chars`);
assert.match(adapted, /Reference product exactly|Correct relationship|Layout:|Style:|Avoid:/i, "final adapted prompt must keep the short final-prompt structure");
assert.doesNotMatch(adapted, /Prompt-case grammar|Quality checklist|Product-only check|Geometry check/i, "final prompt must not expose bulky internal checklist labels");

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

const splashGuardPayload = {
  productPackageMode: "single",
  productInfo: [
    "\u4ea7\u54c1\uff1a\u5355\u4e2a\u5706\u5f62\u534a\u900f\u660e\u6405\u62cc\u7897\u9632\u6e85\u76d6\uff0c\u5e26\u7ea2\u8272\u5f00\u5408\u7247\u3001\u4e2d\u5fc3\u6405\u62cc\u5668\u5165\u53e3\u3001\u4fa7\u8fb9\u63d0\u624b\u548c\u540c\u5fc3\u52a0\u5f3a\u7eb9\u3002",
    "\u7528\u9014\uff1a\u7528\u4e8e\u5bb6\u5ead\u70d8\u7119\u6216\u53a8\u623f\u6405\u62cc\u65f6\u8986\u76d6\u7897\u53e3\uff0c\u51cf\u5c11\u9762\u7cca\u3001\u5976\u6cb9\u6216\u7c89\u7c7b\u5916\u6e85\uff0c\u5e76\u5141\u8bb8\u6405\u62cc\u5668\u4ece\u4e2d\u5fc3\u8fdb\u5165\u3002",
    "\u6b63\u786e\u7528\u6cd5\uff1a\u5c06\u5706\u76d6\u5e73\u653e\u5728\u6405\u62cc\u7897\u53e3\uff0c\u5916\u5708\u5bf9\u9f50\u7897\u6cbf\uff1b\u63e1\u4fa7\u8fb9\u63d0\u624b\u62ff\u53d6\uff0c\u6405\u62cc\u5668\u53ef\u4ece\u4e2d\u5fc3\u67d4\u6027\u5b54\u8fdb\u5165\u6216\u7ea2\u8272\u7247\u4e2d\u95f4\u8fdb\u5165\u3002"
  ].join("\n"),
  packageInputs: {
    unitOfSale: "\u5355\u4e2a\u4ea7\u54c1",
    usageNotes: "\u5c06\u5706\u76d6\u5e73\u653e\u5728\u6405\u62cc\u7897\u53e3\uff0c\u5916\u5708\u5bf9\u9f50\u7897\u6cbf\uff1b\u6405\u62cc\u5668\u4ece\u4e2d\u5fc3\u67d4\u6027\u5b54\u6216\u7ea2\u8272\u5f00\u5408\u7247\u8fdb\u5165"
  },
  brand: {
    platform: "Amazon",
    region: "EU",
    language: "English"
  },
  ratio: "1:1",
  resolution: "1K",
  finalPrompt: "Round translucent mixing bowl splash guard lid with a red opening flap, center mixer entry port, star-shaped flexible slit, side handle, concentric raised reinforcing rings, and small raised dot texture.",
  analysis: {
    product_mechanism: "bag",
    product_summary_zh: "old stale storage bag analysis",
    unit_of_sale: "one large soft rectangular storage bag with zipper lid and sewn handles",
    use_relationship: "the soft rectangular bag stands on a closet shelf; zipper follows the lid opening",
    correct_use_method: "place the bag on a stable surface, open the zipper lid, put household soft goods inside, close the lid, and lift only by the sewn handles",
    detail_focus_areas: ["boxy soft fabric body", "zipper lid seam", "webbing handles attached to side seams"],
    part_function_map: ["zipper = opens and closes the top lid", "webbing handles = lifting points"],
    forbidden_use_errors: ["do not detach handles from seams"]
  }
};

const splashScenePrompt = buildCategoryPrompt(splashGuardPayload, { kind: K_SCENE, variantIndex: 0, totalForKind: 1 });
assert.doesNotMatch(splashScenePrompt, /storage bag|zipper lid|sewn handles|soft goods|closet/i, "local prompt must not inherit stale bag analysis when current facts do not support bag mechanics");

const staleStorageDraft = [
  "Create one realistic lifestyle usage image for an ecommerce detail path, with one short English title: \"Closet Storage\".",
  "Correct use: place the bag on a stable surface, open the zipper lid, put household soft goods inside, close the lid, and lift only by the sewn handles."
].join(" ");
const splashAdapted = adaptImagePromptForModel(staleStorageDraft, "gpt-image-2", splashGuardPayload, { kind: K_SCENE, variantIndex: 0, totalForKind: 1 });
assert.doesNotMatch(splashAdapted, /Closet Storage|storage bag|zipper lid|sewn handles|soft goods|place the bag/i, "final prompt must drop unsupported stale storage-bag creative brief");
assert.match(splashAdapted, /mixing bowl|splash guard|center mixer|red opening flap|side handle/i, "final prompt must keep the current product facts");
assert.ok(splashAdapted.length <= 1250, `final splash-guard scene prompt must stay concise, got ${splashAdapted.length} chars`);

const splashSkuPrompt = buildCategoryPrompt(splashGuardPayload, { kind: K_SKU, variantIndex: 0, totalForKind: 1 });
const splashSkuAdapted = adaptImagePromptForModel(splashSkuPrompt, "gpt-image-2", splashGuardPayload, { kind: K_SKU, variantIndex: 0, totalForKind: 1 });
assert.ok(splashSkuAdapted.length <= 820, `final splash-guard SKU prompt must stay concise, got ${splashSkuAdapted.length} chars`);
assert.match(splashSkuAdapted, /SKU product photo|Reference product exactly|No visible text|Avoid:/i, "final SKU prompt must keep a compact ecommerce structure");
assert.match(splashSkuAdapted, /Show product scope: one product unit/i, "Chinese single-unit input must become concise English product-scope wording");
assert.doesNotMatch(splashSkuAdapted, /\?{2,}|[\u3400-\u9fff]/, "final SKU prompt must not leak Chinese text or placeholder question marks");
assert.doesNotMatch(splashSkuAdapted, /Product identity:.*Product identity:|HEX color codes|palette legend|medical|safety certification|eco claims|non-toxic|BPA/i, "final SKU prompt must avoid repeated identity labels and bulky risky negative terms");

const champagneGlassPayload = {
  productPackageMode: "multipack",
  productInfo: [
    "Product: clear stemmed champagne glasses.",
    "PCS count: 6.",
    "Use: drinkware for serving champagne or sparkling wine.",
    "Correct visual fact: show the glasses themselves; no retail packaging was uploaded."
  ].join("\n"),
  packageInputs: {
    unitOfSale: "6pcs一盒",
    pcsCount: "6",
    packArrangement: "可数排列",
    usageNotes: "饮品倒入杯肚且低于杯口；不要倒置、叠放满杯或把底座当容器。"
  },
  brand: {
    platform: "Amazon",
    region: "EU",
    language: "English"
  },
  ratio: "1:1",
  resolution: "1K",
  finalPrompt: "Six clear stemmed champagne glasses with tall narrow bowls, slender stems, round bases, transparent glass material, and no visible retail box or packaging.",
  analysis: {
    product_package_mode: "multipack",
    product_summary_zh: "6个透明高脚香槟杯",
    unit_of_sale: "6pcs一盒",
    use_relationship: "the glasses stand upright on a table and may hold champagne below the rim",
    correct_use_method: "place each glass upright on its round base; pour beverage into the bowl below the rim",
    detail_focus_areas: ["clear glass bowl", "slender stem", "round base"],
    part_function_map: ["glass bowl = holds drink", "stem = hand grip", "round base = table support"]
  }
};

const glassPromptApiDraft = [
  "Create a selling-point image for a 6-piece champagne glass set.",
  "Show a premium retail box for the 6pcs set beside the glasses."
].join(" ");
const glassAdapted = adaptImagePromptForModel(glassPromptApiDraft, "gpt-image-2", champagneGlassPayload, { kind: K_SELL, variantIndex: 0, totalForKind: 1 });
assert.match(glassAdapted, /Quantity: show exactly 6 identical product pieces/i, "multi-PCS final prompt must use PCS count as visual quantity");
assert.doesNotMatch(glassAdapted, /\b(?:purchase unit|unit of sale|retail box|gift box|carton|packaging|package insert|printed package)\b/i, "multi-PCS final prompt must not turn unit-of-sale wording into visible packaging");
assert.match(glassAdapted, /Only the product pieces may look included|no extra sale\/display materials/i, "multi-PCS final prompt must block invented sale/display objects without naming boxes");
assert.match(glassAdapted, /pain-solution|Pain proof|Result proof|Before\/result proof|problem\/result advertising composition|pain\/result headline/i, "selling-point final prompt must use pain/result selling grammar");
assert.doesNotMatch(glassAdapted, /information-card|detail-page module layout|icon column|magnifier labels|specification block|structured callout system|up to three grounded callouts/i, "selling-point final prompt must not look like an Advanced A+ detail module");

const underSinkOrganizerPayload = {
  productPackageMode: "single",
  productInfo: "Product: black two-tier under-sink organizer rack with pull-out trays, side hanging cup, vertical support posts, and raised tray rims.",
  packageInputs: {
    unitOfSale: "single product",
    usageNotes: "place the rack under a sink cabinet; bottles and cleaning supplies stand on the trays; side cup holds small tools"
  },
  brand: { platform: "Amazon", region: "US", language: "English" },
  ratio: "1:1",
  resolution: "1K",
  finalPrompt: "Black two-tier under-sink organizer with pull-out trays, side cup holder, vertical posts, raised rims, and stable rectangular base.",
  analysis: {
    product_package_mode: "single",
    unit_of_sale: "one product unit",
    use_relationship: "the organizer sits under a sink cabinet and holds cleaning bottles, sponges, and small tools on supported trays",
    correct_use_method: "place the base flat under the sink, put bottles on each tray, and place small tools in the side cup",
    detail_focus_areas: ["two pull-out trays", "side cup holder", "vertical support posts", "raised tray rims"],
    part_function_map: ["trays = hold bottles", "side cup = holds small tools", "posts = support upper tray"]
  }
};
const organizerSell = adaptImagePromptForModel("Create a selling-point image.", "gpt-image-2", underSinkOrganizerPayload, { kind: K_SELL, variantIndex: 0, totalForKind: 3 });
assert.match(organizerSell, /messy cabinet|sink area|organized|tidy result|stop the messy|problem\/result/i, "organizer selling-point should focus on solving the under-sink mess pain");
assert.doesNotMatch(organizerSell, /information-card|icon column|magnifier labels|specification block|structured callout system|Detail annotation module/i, "organizer selling-point should not use A+ module styling");
const staleAplusSellDraft = [
  "Create an information-card detail-page module with an icon column, magnifier labels, specification block, and multiple callouts.",
  "Use the under-sink organizer as the main product."
].join(" ");
const organizerSellFromStaleDraft = adaptImagePromptForModel(staleAplusSellDraft, "gpt-image-2", underSinkOrganizerPayload, { kind: K_SELL, variantIndex: 1, totalForKind: 3 });
assert.doesNotMatch(organizerSellFromStaleDraft, /information-card|detail-page module|icon column|magnifier labels|specification block|multiple callouts/i, "selling-point final prompt must drop stale A+ style creative briefs");
assert.match(organizerSellFromStaleDraft, /Before\/result proof|solved result|problem cue|Pain proof|Result proof/i, "selling-point should fall back to local pain/result rules after dropping stale A+ drafts");

const glassSceneOne = adaptImagePromptForModel("Create a lifestyle usage image.", "gpt-image-2", champagneGlassPayload, { kind: K_SCENE, variantIndex: 0, totalForKind: 10 });
const glassSceneTwo = adaptImagePromptForModel("Create a lifestyle usage image.", "gpt-image-2", champagneGlassPayload, { kind: K_SCENE, variantIndex: 1, totalForKind: 10 });
assert.notEqual(glassSceneOne, glassSceneTwo, "same-category scene variants must produce different final prompts");
assert.match(glassSceneOne, /holds one glass by the stem|adult hand holds one glass/i, "first drinkware scene should use a stem-holding action");
assert.match(glassSceneTwo, /pours champagne|sparkling wine .* into an upright glass/i, "second drinkware scene should use a pouring action, not repeat hand-holding");
assert.match(glassSceneTwo, /variant 2 of 10|do not repeat the action/i, "multi-scene prompt must include explicit diversity guard");

const electronicsPayload = {
  productPackageMode: "single",
  productInfo: "Product: adjustable aluminum phone stand for desk use, with hinge, base, cradle slot, and anti-slip pads.",
  packageInputs: {
    unitOfSale: "single product",
    usageNotes: "place phone or tablet in the cradle slot; hinge adjusts viewing angle; base rests flat on desk"
  },
  brand: { platform: "Amazon", region: "US", language: "English" },
  ratio: "1:1",
  resolution: "1K",
  finalPrompt: "Adjustable aluminum phone stand with flat base, hinge joint, raised cradle slot, anti-slip pads, and brushed metal finish.",
  analysis: {
    product_package_mode: "single",
    unit_of_sale: "one product unit",
    use_relationship: "the stand rests on a desk while a phone sits in the cradle slot",
    correct_use_method: "place the base flat on the desk and put the phone into the front cradle slot; adjust the hinge angle",
    detail_focus_areas: ["hinge joint", "front cradle slot", "flat base", "anti-slip pads"],
    part_function_map: ["base = desk support", "hinge = angle adjustment", "cradle slot = holds phone"]
  }
};
const electronicsScene = adaptImagePromptForModel("Create a lifestyle usage image.", "gpt-image-2", electronicsPayload, { kind: K_SCENE, variantIndex: 1, totalForKind: 4 });
assert.match(electronicsScene, /connects|docks|mounts|places|cable direction|port contact|hinge|stand angle|compatible device/i, "electronics accessories must use the electronics-specific scene matrix");

const petPayload = {
  productPackageMode: "single",
  productInfo: "Product: adjustable dog harness with buckle straps, chest panel, leash ring, and padded textile surface.",
  packageInputs: {
    unitOfSale: "single product",
    usageNotes: "fit the harness around the dog's chest; leash ring stays on top; buckles close at the side"
  },
  brand: { platform: "Amazon", region: "US", language: "English" },
  ratio: "1:1",
  resolution: "1K",
  finalPrompt: "Adjustable dog harness with padded chest panel, side buckles, webbing straps, and top leash ring.",
  analysis: {
    product_package_mode: "single",
    unit_of_sale: "one product unit",
    use_relationship: "the harness fits around a dog's chest with the leash ring on top",
    correct_use_method: "place the chest panel under the dog chest, close side buckles, keep leash ring upward",
    detail_focus_areas: ["padded chest panel", "side buckle", "top leash ring", "webbing strap"],
    part_function_map: ["chest panel = body contact area", "buckles = closure points", "leash ring = leash attachment"]
  }
};
const petScene = adaptImagePromptForModel("Create a lifestyle usage image.", "gpt-image-2", petPayload, { kind: K_SCENE, variantIndex: 0, totalForKind: 3 });
assert.match(petScene, /dog|cat|pet target|feeding|grooming|walking|playing|pet-care/i, "pet products must use the pet-specific scene matrix");

const cleaningPayload = {
  productPackageMode: "single",
  productInfo: "Product: long handle cleaning brush for bathroom tile and sink use, with stiff bristles, angled head, and hanging hole.",
  packageInputs: {
    unitOfSale: "single product",
    usageNotes: "hold the handle and press the bristles against tile grout, sink edge, or bathroom surface"
  },
  brand: { platform: "Amazon", region: "US", language: "English" },
  ratio: "1:1",
  resolution: "1K",
  finalPrompt: "Long handle cleaning brush with angled plastic head, stiff bristles, grip handle, and hanging hole.",
  analysis: {
    product_package_mode: "single",
    unit_of_sale: "one product unit",
    use_relationship: "the brush bristles contact bathroom tile, sink edges, or grout lines while the handle stays in the hand",
    correct_use_method: "grip the handle and scrub with the bristles against the correct surface",
    detail_focus_areas: ["stiff bristles", "angled head", "grip handle", "hanging hole"],
    part_function_map: ["handle = grip", "bristles = cleaning surface", "hanging hole = storage"]
  }
};
const cleaningScene = adaptImagePromptForModel("Create a lifestyle usage image.", "gpt-image-2", cleaningPayload, { kind: K_SCENE, variantIndex: 1, totalForKind: 4 });
assert.match(cleaningScene, /wipe|brush|sponge|liner|filter|pod|cloth|working surface contact|cleaning target/i, "cleaning brushes must use the cleaning matrix instead of beauty brush logic");

const apparelPayload = {
  productPackageMode: "single",
  productInfo: "Product: women's crossbody handbag with zipper closure, adjustable shoulder strap, front pocket, and pebbled faux leather texture.",
  packageInputs: {
    unitOfSale: "single product",
    usageNotes: "wear across the body using the shoulder strap; open the zipper to access the main compartment"
  },
  brand: { platform: "Amazon", region: "US", language: "English" },
  ratio: "1:1",
  resolution: "1K",
  finalPrompt: "Crossbody handbag with adjustable strap, zipper closure, front pocket, and pebbled faux leather surface.",
  analysis: {
    product_package_mode: "single",
    unit_of_sale: "one product unit",
    use_relationship: "the bag hangs from the shoulder or rests on a dressing surface; zipper opens the main compartment",
    correct_use_method: "adjust the strap, wear crossbody, and open the zipper from the top",
    detail_focus_areas: ["adjustable shoulder strap", "zipper closure", "front pocket", "pebbled surface"],
    part_function_map: ["strap = carrying point", "zipper = opening closure", "front pocket = storage"]
  }
};
const apparelScene = adaptImagePromptForModel("Create a lifestyle usage image.", "gpt-image-2", apparelPayload, { kind: K_SCENE, variantIndex: 0, totalForKind: 5 });
assert.match(apparelScene, /wears|folds|buckles|zips|laces|adjusts|places|seam|buckle|zipper|strap/i, "apparel and accessories must use the apparel matrix");

const hardwarePayload = {
  productPackageMode: "single",
  productInfo: "Product: compact ratchet screwdriver with magnetic bit holder, rubber grip handle, forward reverse switch, and included metal bits.",
  packageInputs: {
    unitOfSale: "one screwdriver with included bits",
    usageNotes: "hold the rubber grip and place the bit into a screw head; use the switch to change direction"
  },
  brand: { platform: "Amazon", region: "US", language: "English" },
  ratio: "1:1",
  resolution: "1K",
  finalPrompt: "Ratchet screwdriver with rubber grip, magnetic bit holder, direction switch, and separate metal bits.",
  analysis: {
    product_package_mode: "bundle",
    unit_of_sale: "one screwdriver with included bits",
    use_relationship: "the bit holder points toward a screw head while the handle stays in the hand",
    correct_use_method: "insert the correct bit, place it in the screw head, and turn from the rubber grip",
    detail_focus_areas: ["rubber grip", "magnetic bit holder", "direction switch", "metal bits"],
    part_function_map: ["grip = hand hold", "bit holder = holds bit", "bit = contacts screw head"]
  }
};
const hardwareScene = adaptImagePromptForModel("Create a lifestyle usage image.", "gpt-image-2", hardwarePayload, { kind: K_SCENE, variantIndex: 1, totalForKind: 4 });
assert.match(hardwareScene, /bit|jaw|blade|handle|fastener|tape|level bubble|socket|contact point/i, "hardware tools must use the hardware matrix with correct working contact");

const healthPayload = {
  productPackageMode: "single",
  productInfo: "Product: soft elastic wrist support brace with hook-and-loop strap, thumb opening, and breathable textile surface.",
  packageInputs: {
    unitOfSale: "single product",
    usageNotes: "slide the thumb through the opening and wrap the strap around the wrist"
  },
  brand: { platform: "Amazon", region: "US", language: "English" },
  ratio: "1:1",
  resolution: "1K",
  finalPrompt: "Elastic wrist support brace with thumb opening, hook-and-loop strap, and breathable textile surface.",
  analysis: {
    product_package_mode: "single",
    unit_of_sale: "one product unit",
    use_relationship: "the brace wraps around a wrist with the thumb through the opening",
    correct_use_method: "place thumb through the opening, wrap around wrist, fasten the hook-and-loop strap",
    detail_focus_areas: ["thumb opening", "hook-and-loop strap", "elastic textile", "edge stitching"],
    part_function_map: ["thumb opening = orientation", "strap = closure", "textile body = wrist wrap"]
  }
};
const healthSell = adaptImagePromptForModel("Create a selling-point image.", "gpt-image-2", healthPayload, { kind: K_SELL, variantIndex: 0, totalForKind: 3 });
assert.match(healthSell, /daily-care|non-clinical|strap|bristle|cap|pad|sensor tip|contact surface/i, "health-care products must use health-care proof rules");
assert.doesNotMatch(healthSell, /\b(?:cures?|heals?|pain relief|guaranteed recovery|medical grade)\b/i, "health-care selling prompts must avoid medical promises");

const glassSkuFinal = adaptImagePromptForModel("Create a SKU product image.", "gpt-image-2", champagneGlassPayload, { kind: K_SKU, variantIndex: 0, totalForKind: 1 });
assert.match(glassSkuFinal, /Real tabletop product photo only|100% faithful shape\/color\/material|plain real surface|real contact shadow/i, "SKU final prompt must enforce real product tabletop photography");
const skuLayoutLine = glassSkuFinal.split("\n").find((line) => /^Layout:/i.test(line)) || "";
assert.doesNotMatch(skuLayoutLine, /\bdecorative styling|lifestyle context|use action|hands|people|props\b/i, "SKU positive layout must not invite props, hands, or lifestyle scenes");
assert.match(glassSkuFinal, /Only the product pieces appear; no extra visible objects/i, "SKU final prompt must block extra visible objects");

console.log("prompt regression checks passed");
