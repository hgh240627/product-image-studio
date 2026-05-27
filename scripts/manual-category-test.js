const fs = require("node:fs/promises");
const path = require("node:path");
const {
  buildPromptPlan,
  generateOneImage,
  getConfig,
  normalizeGeneratedTaskResults,
  planItemsFromPayload
} = require("../main");

const rootDir = path.resolve(__dirname, "..");
const inputImagePath = path.resolve(rootDir, "..", "测试产品图片.png");
const outputDir = path.join(rootDir, "output", "manual-test");
const DEFAULT_KINDS = ["主图", "SKU图", "卖点图", "白底图", "场景图", "特写图", "高级A+"];
const MAX_PER_KIND = 2;

function parseArgs(argv) {
  const options = {
    kinds: DEFAULT_KINDS,
    count: 1,
    label: "",
    platform: "Amazon"
  };

  for (const arg of argv) {
    if (arg.startsWith("--kinds=")) {
      options.kinds = arg.slice("--kinds=".length).split(",").map((item) => item.trim()).filter(Boolean);
    } else if (arg.startsWith("--count=")) {
      options.count = Number(arg.slice("--count=".length));
    } else if (arg.startsWith("--label=")) {
      options.label = arg.slice("--label=".length).replace(/[\\/:*?"<>|]/g, "_").trim();
    } else if (arg.startsWith("--platform=")) {
      options.platform = arg.slice("--platform=".length).trim();
    }
  }

  options.count = Math.max(1, Math.min(MAX_PER_KIND, Number.isFinite(options.count) ? Math.floor(options.count) : 1));
  options.kinds = options.kinds.length ? options.kinds : DEFAULT_KINDS;
  options.platform = /^temu$/i.test(options.platform) ? "Temu" : "Amazon";
  return options;
}

async function fileToDataUrl(filePath) {
  const buffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === ".webp" ? "image/webp" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function downloadImage(url, filePath) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed ${response.status}: ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(filePath, buffer);
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const options = parseArgs(process.argv.slice(2));
  const config = await getConfig();
  if (!config.grsaiApiKey) throw new Error("Missing Grsai API key in app config.");

  const dataUrl = await fileToDataUrl(inputImagePath);
  const targetMarketplace = `${options.platform} US`;
  const payload = {
    productInfo: [
      "Colorful stainless steel measuring spoon set on a ring.",
      "Multiple spoon sizes with polished metal bowls and colored handles.",
      "Used for cooking, baking, spices, powders, and kitchen ingredient measuring.",
      `Target marketplace: ${targetMarketplace}.`
    ].join(" "),
    productPackageMode: "bundle",
    resolution: "1K",
    ratio: "1:1",
    aPlusSize: "1:1",
    images: [dataUrl],
    brand: {
      platform: options.platform,
      region: "US",
      language: "English",
      primaryColor: "auto",
      colorMode: "auto",
      fontStyle: "auto",
      customStyle: ""
    },
    analysis: {
      product_mechanism: "tool",
      product_package_mode: "bundle",
      unit_of_sale: "a complete colorful stainless steel measuring spoon set on a metal ring",
      unit_of_use: "one measuring spoon scooping spices, flour, sugar, or baking ingredients",
      use_relationship: "an adult hand uses one spoon to scoop or pour dry ingredients while the full spoon set remains visible nearby as the purchase unit",
      key_action_frames: [
        "one spoon scooping spice from a jar",
        "one spoon pouring powder into a mixing bowl",
        "full set resting nearby as the purchase unit"
      ],
      detail_focus_areas: [
        "polished stainless steel spoon bowl reflection",
        "rounded bowl rim thickness",
        "colored handle surface and hanging hole",
        "metal ring connection"
      ],
      misjudgment_risks: [
        "do not change spoon count or colors",
        "do not turn spoons into ladles",
        "do not add measurement numbers that may render incorrectly",
        "do not remove the metal ring"
      ],
      selling_points_zh: ["取量更方便", "厨房台面更整洁"]
    },
    finalPrompt: "Use the uploaded product image as the single source of truth for the product appearance. Preserve exact product identity, silhouette, proportions, colors, materials, surface texture, edges, and visible structure. This is a product identity brief only.",
    negativePrompt: "",
    imageKinds: options.kinds.map((kind) => ({ kind, count: options.count }))
  };

  const planItems = planItemsFromPayload(payload);
  if (planItems.some((item) => item.totalForKind > MAX_PER_KIND)) {
    throw new Error("Manual test refuses to run more than 2 images for any category.");
  }
  console.log(`[budget] planned generations: ${planItems.length}; per-kind max: ${MAX_PER_KIND}; platform: ${options.platform}; kinds: ${options.kinds.join(", ")}`);

  const promptPlan = await buildPromptPlan(config, payload, planItems, (progress) => {
    if (progress.stage) console.log(`[prompt] ${progress.stage} ${progress.current || ""}/${progress.total || ""}`);
  });

  const summary = [];
  for (const [index, promptItem] of promptPlan.entries()) {
    const kind = promptItem.planItem.kind;
    console.log(`[generate] ${index + 1}/${promptPlan.length} ${kind}`);
    const task = await generateOneImage(config, payload, promptItem, index + 1, promptPlan.length, (progress) => {
      if (progress.stage || progress.status) {
        console.log(`  ${kind}: ${progress.stage || progress.status} ${Math.round(progress.progress || 0)}%`);
      }
    });
    const results = normalizeGeneratedTaskResults(task);
    for (const [resultIndex, result] of results.entries()) {
      if (!result.url) {
        summary.push({ kind, status: result.status || "failed", error: result.error || "no url" });
        continue;
      }
      const safeKind = kind.replace(/[\\/:*?"<>|]/g, "_");
      const label = options.label ? `${options.label}-` : "";
      const filePath = path.join(outputDir, `${label}${String(index + 1).padStart(2, "0")}-${safeKind}-${promptItem.planItem.variantIndex + 1}-${resultIndex + 1}.png`);
      await downloadImage(result.url, filePath);
      summary.push({ kind, status: "saved", filePath, promptSource: result.promptSource, model: result.model, platform: options.platform });
    }
  }

  const summaryPath = path.join(outputDir, `summary-${Date.now()}.json`);
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf8");
  console.log(`Manual category test complete: ${summaryPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
