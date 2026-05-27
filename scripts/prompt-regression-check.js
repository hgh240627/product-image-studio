const assert = require("node:assert/strict");
const {
  buildCategoryPrompt,
  normalizeImageKindSelection,
  planItemsFromPayload
} = require("../main");

const commonBrand = {
  platform: "Temu",
  region: "US",
  language: "English",
  primaryColor: "auto",
  fontStyle: "auto"
};

const amazonBrand = {
  ...commonBrand,
  platform: "Amazon"
};

const samples = [
  {
    name: "kitchen peeler tool",
    productInfo: "2-in-1 stainless steel vegetable peeler and julienne slicer with wood handle, two metal blades, comb teeth, hanging hole, single tool.",
    productPackageMode: "single",
    analysis: {
      product_mechanism: "tool",
      unit_of_sale: "one 2-in-1 peeler and slicer tool with wood handle",
      unit_of_use: "one tool used by an adult hand on vegetables",
      use_relationship: "the blade or julienne teeth must touch cucumber, carrot, potato, or similar vegetables while an adult hand holds the handle",
      detail_focus_areas: ["metal blade edge", "julienne teeth", "wood handle rivets"],
      misjudgment_risks: ["do not add extra blades", "do not change the handle shape", "do not use it as a knife"],
      part_function_map: ["wide peeling blade = peels fruit and vegetable skin", "julienne teeth row = cuts scallion, carrot, or vegetable strips", "wood handle rivets = fasteners only"],
      correct_use_method: "use the wide peeling blade against potato or fruit skin; use the julienne teeth only for cutting thin strips",
      forbidden_use_errors: ["do not use julienne teeth to peel potato skin", "do not use serrated comb teeth as the peeling blade", "do not reverse the tool orientation"]
    }
  },
  {
    name: "air fryer liners",
    productInfo: "Pack of 100 square disposable air fryer paper liners with raised edges for 6-8 qt baskets.",
    productPackageMode: "multipack",
    analysis: {
      product_mechanism: "liner",
      unit_of_sale: "stacked pack of 100 square paper air fryer liners",
      unit_of_use: "one liner fitted inside an air fryer basket",
      use_relationship: "the liner must sit inside the air fryer basket with raised edge and rim fit visible",
      detail_focus_areas: ["raised liner edge", "paper stack thickness"]
    }
  },
  {
    name: "drawer organizer",
    productInfo: "Expandable bamboo kitchen drawer organizer with multiple compartments for cutlery.",
    productPackageMode: "single",
    analysis: {
      product_mechanism: "organizer",
      unit_of_sale: "one expandable bamboo drawer organizer",
      unit_of_use: "organizer placed in a kitchen drawer with cutlery sorted inside",
      use_relationship: "the organizer must sit inside a drawer with contents arranged in compartments",
      detail_focus_areas: ["expandable side rail", "compartment dividers"]
    }
  },
  {
    name: "cleaning tablets",
    productInfo: "Multi-pack washing machine cleaning tablets in box packaging.",
    productPackageMode: "multipack",
    analysis: {
      product_mechanism: "tablet",
      unit_of_sale: "boxed multi-pack cleaning tablets",
      unit_of_use: "one bare tablet placed near the washing machine drum",
      use_relationship: "use scenes must show a bare tablet separated from packaging near the correct washing machine drum",
      detail_focus_areas: ["round tablet texture", "box contents"]
    }
  },
  {
    name: "chair leg caps",
    productInfo: "Set of silicone chair leg floor protector caps, transparent square caps, multiple sizes.",
    productPackageMode: "bundle",
    analysis: {
      product_mechanism: "accessory",
      unit_of_sale: "complete set of transparent silicone chair leg caps in multiple sizes",
      unit_of_use: "one cap fitted onto a chair leg",
      use_relationship: "the cap must be shown fitted around the bottom of a chair leg with the floor contact visible",
      detail_focus_areas: ["transparent cap edge", "bottom contact surface"]
    }
  }
];

const basePayload = {
  brand: commonBrand,
  resolution: "1K",
  ratio: "1:1",
  aPlusSize: "1:1",
  finalPrompt: "Use the uploaded product image as the single source of truth for the product appearance. Preserve exact product identity, silhouette, proportions, colors, materials, surface texture, edges, and visible structure. This is a product identity brief only.",
  imageKinds: [
    { kind: "主图", count: 1 },
    { kind: "SKU图", count: 1 },
    { kind: "卖点图", count: 1 },
    { kind: "白底图", count: 1 },
    { kind: "场景图", count: 1 },
    { kind: "特写图", count: 1 },
    { kind: "\u8be6\u60c5\u56fe", count: 1 },
    { kind: "高级A+", count: 1 }
  ]
};

function expectIncludes(prompt, fragments, label) {
  for (const fragment of fragments) {
    assert.match(prompt, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), label);
  }
}

function expectExcludes(prompt, patterns, label) {
  for (const pattern of patterns) {
    assert.doesNotMatch(prompt, pattern, label);
  }
}

for (const sample of samples) {
  const payload = {
    ...basePayload,
    productInfo: sample.productInfo,
    productPackageMode: sample.productPackageMode,
    analysis: sample.analysis
  };

  const normalized = normalizeImageKindSelection(payload.imageKinds);
  assert.deepEqual(
    normalized.map((item) => item.kind),
    ["主图", "SKU图", "卖点图", "白底图", "场景图", "特写图", "高级A+"],
    `${sample.name}: legacy detail kind filtering`
  );

  const planItems = planItemsFromPayload(payload);
  assert.equal(planItems.length, 7, `${sample.name}: plan count after de-duplication`);

  for (const planItem of planItems) {
    const prompt = buildCategoryPrompt(payload, planItem);
    expectIncludes(prompt, ["Product fidelity lock", "Hard category boundary"], `${sample.name}: common locks`);

    if (planItem.kind !== "SKU图" && planItem.kind !== "白底图") {
      expectIncludes(prompt, ["Usage truth lock"], `${sample.name}: use-category truth lock`);
    }

    if (sample.name === "kitchen peeler tool") {
      expectIncludes(prompt, ["Part-function lock", "wide peeling blade", "julienne teeth row", "Correct use method lock", "Forbidden use errors", "do not use julienne teeth to peel potato skin"], `${sample.name}: part function and correct use locks`);
    }

    if (planItem.kind === "主图") {
      expectIncludes(prompt, ["70-90% of the canvas", "not scene-dominant", "product must be the largest", "compressed micro-scene"], `${sample.name}: Temu main image dominance and micro-scene`);
      expectIncludes(prompt, ["not an Amazon catalog packshot", "avoid a plain tabletop-only studio still life", "close-range use cue or buyer-result cue", "partial bowl rim", "spice jar edge", "ingredient surface"], `${sample.name}: Temu main image avoids conservative tabletop-only packshot`);
      expectIncludes(prompt, ["not a pure white-background product cutout", "must not collapse into 白底图", "do not make a flat white cutout", "do not make a product-only high-key studio packshot", "at least one restrained non-text hero-image context cue"], `${sample.name}: main image stays distinct from white-background category`);
      expectIncludes(prompt, ["Temu main-label rule", "quantity cue", "low-risk result phrase", "Never write dimensions", "capacity", "technical measurements"], `${sample.name}: Temu main label restrictions`);
      expectIncludes(prompt, ["Typography rule for Temu main images", "visible text is optional", "no dimensions", "capacity"], `${sample.name}: Temu main typography is optional and restricted`);
      expectIncludes(prompt, ["no callout labels", "no inset close-up circle", "no color swatches", "no HEX color codes"], `${sample.name}: main image blocks selling-point layout`);
      expectExcludes(prompt, [/plain pure white \(#FFFFFF\)/i, /Pure product presentation only/i, /Absolute white-background rule/i, /Use one concise benefit headline/i, /This palette is mandatory/i, /use the primary color as/i, /dominant brand plane/i, /Resolved typography direction/i], `${sample.name}: main prompt avoids white-background and selling-point language`);
    }

    if (planItem.kind === "SKU图") {
      expectIncludes(prompt, ["real-shot product arrangement", "clean tabletop or countertop", "realistic light", "real shadows", "true material texture", "No text", "Do not add", "selling-point infographic"], `${sample.name}: SKU real-shot tabletop definition`);
      expectExcludes(prompt, [/controlled studio\/catalog SKU presentation/i, /Show adult hand action/i, /Usage truth lock/i], `${sample.name}: SKU avoids old catalog/usage definitions`);
    }

    if (planItem.kind === "白底图") {
      expectIncludes(prompt, ["plain pure white (#FFFFFF)", "Show only the exact product", "Pure product presentation only"], `${sample.name}: white background strictness`);
      expectExcludes(prompt, [/plain white minimalism/i, /accent palette visibly/i], `${sample.name}: white background no graphic palette`);
    }

    if (planItem.kind === "卖点图") {
      expectIncludes(prompt, ["solve one buyer pain point", "left-versus-right", "problem state", "solved state", "pain-solution", "copy zone", "1-3 simple icons", "linear guide"], `${sample.name}: selling-point pain-solution contrast and layout`);
      expectIncludes(prompt, ["must never depict the uploaded product itself as broken", "generic old alternative", "messy result", "remain intact and accurate"], `${sample.name}: selling-point protects product identity in negative panel`);
      expectIncludes(prompt, ["Brand color mood", "internal art direction", "Never render the palette itself", "Resolved typography direction", "Regional use context"], `${sample.name}: selling-point smart palette and regional use`);
      expectIncludes(prompt, ["color swatches", "color names", "HEX codes", "dimensions", "capacity"], `${sample.name}: selling-point blocks palette and risky numeric text`);
      expectExcludes(prompt, [/\bprimary auto\b/i, /\bsecondary auto\b/i, /#[0-9a-f]{6}\b/i, /dominant brand plane/i, /headline band/i], `${sample.name}: selling-point palette cannot leak raw palette specs`);
    }

    if (planItem.kind === "场景图") {
      expectIncludes(prompt, ["usage evidence", "real use context", "must not inherit the main-image 70-90% product-dominance rule", "real scale", "No visible text by default"], `${sample.name}: scene usage boundary`);
      expectIncludes(prompt, ["no text blocks", "no icons", "no arrows", "no magnifier inset"], `${sample.name}: scene blocks infographic/A+ layout`);
      expectExcludes(prompt, [/product occupies 70-90% of the frame/i, /copy zone/i, /small magnifier detail inset/i], `${sample.name}: scene avoids main/A+ layout rules`);
    }

    if (planItem.kind === "特写图") {
      expectIncludes(prompt, ["material and craftsmanship close-up", "macro", "material texture", "surface finish", "selected detail should occupy most of the frame"], `${sample.name}: close-up material detail`);
      expectIncludes(prompt, ["No visible text", "no icons", "no zoom bubbles", "No collage", "no usage scene"], `${sample.name}: close-up blocks scene/infographic`);
      expectExcludes(prompt, [/left-versus-right/i, /real use context/i, /planned text zone/i, /adult hand in-use action/i], `${sample.name}: close-up avoids selling/scene/A+ logic`);
    }

    if (planItem.kind === "高级A+") {
      expectIncludes(prompt, ["premium ecommerce detail-page module", "complete information logic", "left image and right text block", "hero product plus 3 icon benefits", "linear guide", "small magnifier detail inset", "step-by-step use strip", "comparison mini-table"], `${sample.name}: A+ detail-page module logic`);
      expectIncludes(prompt, ["one headline", "1-3 concise support points", "simple icons", "planned text zone", "module structure"], `${sample.name}: A+ text/icon structure`);
      expectIncludes(prompt, ["Every text claim must be visually provable", "prefer plain observable wording", "use at most 3 insets", "real visible detail"], `${sample.name}: A+ keeps claims and insets grounded`);
      expectIncludes(prompt, ["anti-stain/odor/protection/safety claims"], `${sample.name}: A+ blocks unsupported risky claims`);
      expectIncludes(prompt, ["Brand color mood", "internal art direction", "Regional use context"], `${sample.name}: A+ smart palette and regional use`);
      expectExcludes(prompt, [/#[0-9a-f]{6}\b/i, /dominant brand plane/i, /random lifestyle photo/i], `${sample.name}: A+ palette cannot leak raw palette specs`);
    }
  }
}

const amazonPayload = {
  ...basePayload,
  brand: amazonBrand,
  productInfo: samples[0].productInfo,
  productPackageMode: samples[0].productPackageMode,
  analysis: samples[0].analysis,
  imageKinds: [{ kind: "主图", count: 1 }]
};
const amazonMainPrompt = buildCategoryPrompt(amazonPayload, { kind: "主图", variantIndex: 0, totalForKind: 1 });
expectIncludes(amazonMainPrompt, ["Amazon main image compliance", "must not collapse into 白底图", "product-only high-key studio packshot", "subtle marketplace-safe context cue", "kitchen-counter plane", "no visible text", "Typography rule: no visible text"], "Amazon main image remains compliant but distinct from white-background");
expectExcludes(amazonMainPrompt, [/Amazon main image override: pure white background/i, /plain pure white \(#FFFFFF\)/i, /Pure product presentation only/i, /Absolute white-background rule/i], "Amazon main image no longer imports white-background category rules");

const twoMainPrompt = buildCategoryPrompt(
  {
    ...amazonPayload,
    imageKinds: [{ kind: "主图", count: 2 }]
  },
  { kind: "主图", variantIndex: 1, totalForKind: 2 }
);
expectIncludes(twoMainPrompt, ["multiple main images", "clearly different hero composition", "Do not repeat the same centered product pose", "duplicate white-background-style cutouts"], "multiple main images must avoid duplicate white-background-like outputs");

const complexTemuPrompt = buildCategoryPrompt(
  {
    ...basePayload,
    productInfo: samples[0].productInfo,
    productPackageMode: samples[0].productPackageMode,
    analysis: samples[0].analysis,
    imageKinds: [{ kind: "主图", count: 1 }]
  },
  { kind: "主图", variantIndex: 0, totalForKind: 1 }
);
expectIncludes(complexTemuPrompt, ["Complex-product preservation mode", "do not redraw or redesign the product body", "Allowed transformations", "flat rotation", "slight perspective transform"], "complex product preservation mode");
expectIncludes(complexTemuPrompt, ["thumbnail impact second", "compressed real-use or buyer-result cue third", "immediate-use clue"], "Temu main image keeps purchase-relevant context through rewrite-sensitive wording");

console.log(`Prompt regression checks passed for ${samples.length} product categories.`);
