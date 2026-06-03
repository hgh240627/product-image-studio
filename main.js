const electron = require("electron");
const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  session
} = typeof electron === "object" ? electron : {};
const fs = require("node:fs/promises");
const http = require("node:http");
const https = require("node:https");
const path = require("node:path");
const crypto = require("node:crypto");
const zlib = require("node:zlib");
const { pathToFileURL, fileURLToPath } = require("node:url");
const APP_VERSION = (() => {
  try {
    return require("./package.json").version || "dev";
  } catch {
    return "dev";
  }
})();
const RUNTIME_BUILD_ID = `main-${APP_VERSION}-bg-ipc-v2`;
const UPDATE_CHECK_TIMEOUT_MS = 12000;
const DEFAULT_UPDATE_MANIFEST_URL = "https://raw.githubusercontent.com/hgh240627/product-image-studio/main/update.json";

const DEFAULT_CONFIG = {
  promptProvider: "grsai-gemini",
  promptBaseUrl: "https://grsai.dakka.com.cn/v1",
  promptApiKey: "",
  promptProviderKeys: {},
  promptModel: "gemini-3.1-pro",
  promptProviderModels: {},
  promptProviderLastModels: {},
  promptProviderMeta: {},
  promptProviderNotes: {},
  promptProviderApiOptions: {},
  promptModelCapabilities: {},
  promptScopeConfigs: {},
  promptEndpoint: "chat",
  trendProxyUrl: "",
  grsaiBaseUrl: "https://grsai.dakka.com.cn",
  grsaiApiKey: "",
  grsai1kModel: "gpt-image-2",
  grsai2kModel: "gpt-image-2-vip",
  grsaiConcurrency: 6,
  imageProvider: "grsai",
  imageProviderType: "grsai",
  imageProviderKeys: {},
  imageProviderModels: {},
  imageProviderLastModels: {},
  imageBaseUrl: "https://grsai.dakka.com.cn",
  imageApiKey: "",
  imageModelRoute: "auto",
  featureImageModelRoutes: {
    aplus: "auto"
  },
  image1kModel: "gpt-image-2",
  image2kModel: "gpt-image-2-vip",
  defaultRegion: "US",
  defaultLanguage: "English",
  defaultPlatform: "Amazon",
  updateManifestUrl: DEFAULT_UPDATE_MANIFEST_URL,
  updateCheckOnStartup: true
};

const GRSAI_PROMPT_MODELS = [
  "gemini-3.1-pro",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-3-flash",
  "gemini-3-pro",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gpt-5.4",
  "gpt-5.5"
];

const PROMPT_PROVIDER_PRESETS = {
  "grsai-gemini": {
    promptBaseUrl: "https://grsai.dakka.com.cn/v1",
    promptModel: "gemini-3.1-pro",
    promptEndpoint: "chat"
  },
  zyapi: {
    promptBaseUrl: "https://zyapi.tuluo.top:8888/v1",
    promptModel: "gpt-5.4",
    promptEndpoint: "chat"
  },
  "openai-response": {
    promptBaseUrl: "https://api.openai.com/v1",
    promptModel: "gpt-4.1",
    promptEndpoint: "responses"
  },
  openai: {
    promptBaseUrl: "https://api.openai.com/v1",
    promptModel: "gpt-4.1",
    promptEndpoint: "chat"
  },
  gemini: {
    promptBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    promptModel: "gemini-2.5-pro",
    promptEndpoint: "gemini"
  },
  anthropic: {
    promptBaseUrl: "https://api.anthropic.com/v1",
    promptModel: "claude-sonnet-4-5",
    promptEndpoint: "anthropic"
  },
  azure: {
    promptBaseUrl: "",
    promptModel: "",
    promptEndpoint: "chat"
  },
  qwen: {
    promptBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    promptModel: "qwen3-vl-plus",
    promptEndpoint: "chat"
  },
  deepseek: {
    promptBaseUrl: "https://api.deepseek.com",
    promptModel: "deepseek-chat",
    promptEndpoint: "chat"
  },
  doubao: {
    promptBaseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    promptModel: "doubao-seed-2-0-lite-260215",
    promptEndpoint: "auto",
    models: [
      "doubao-seed-2-0-lite-260215",
      "doubao-seed-2-0-pro-260215",
      "doubao-seed-1-6-vision-250615",
      "doubao-seed-1-6-250615",
      "doubao-1-5-vision-pro-250328",
      "deepseek-v3-1-250821",
      "deepseek-r1-250528",
      "deepseek-v4-flash-260425",
      "deepseek-v4-pro-260425"
    ]
  },
  moonshot: {
    promptBaseUrl: "https://api.moonshot.cn/v1",
    promptModel: "kimi-k2-0711-preview",
    promptEndpoint: "chat"
  },
  zhipu: {
    promptBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
    promptModel: "glm-5.1",
    promptEndpoint: "chat"
  },
  baichuan: {
    promptBaseUrl: "https://api.baichuan-ai.com/v1",
    promptModel: "Baichuan4",
    promptEndpoint: "chat"
  },
  minimax: {
    promptBaseUrl: "https://api.minimax.chat/v1",
    promptModel: "MiniMax-M1",
    promptEndpoint: "chat"
  },
  hunyuan: {
    promptBaseUrl: "https://api.hunyuan.cloud.tencent.com/v1",
    promptModel: "hunyuan-turbos-latest",
    promptEndpoint: "chat"
  },
  qianfan: {
    promptBaseUrl: "https://qianfan.baidubce.com/v2",
    promptModel: "ernie-4.5-turbo-vl",
    promptEndpoint: "chat"
  },
  xiaomi: {
    promptBaseUrl: "https://api.xiaomimimo.com/v1",
    promptModel: "mimo-v2.5-pro",
    promptEndpoint: "chat"
  },
  groq: {
    promptBaseUrl: "https://api.groq.com/openai/v1",
    promptModel: "llama-3.3-70b-versatile",
    promptEndpoint: "chat"
  },
  together: {
    promptBaseUrl: "https://api.together.xyz/v1",
    promptModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    promptEndpoint: "chat"
  },
  fireworks: {
    promptBaseUrl: "https://api.fireworks.ai/inference/v1",
    promptModel: "accounts/fireworks/models/llama-v3p3-70b-instruct",
    promptEndpoint: "chat"
  },
  openrouter: {
    promptBaseUrl: "https://openrouter.ai/api/v1",
    promptModel: "openai/gpt-4o-mini",
    promptEndpoint: "chat"
  },
  siliconflow: {
    promptBaseUrl: "https://api.siliconflow.cn/v1",
    promptModel: "Qwen/Qwen2.5-VL-72B-Instruct",
    promptEndpoint: "chat"
  },
  aihubmix: {
    promptBaseUrl: "https://aihubmix.com/v1",
    promptModel: "gpt-4o-mini",
    promptEndpoint: "chat"
  },
  "302ai": {
    promptBaseUrl: "https://api.302.ai/v1",
    promptModel: "gpt-4o-mini",
    promptEndpoint: "chat"
  },
  ollama: {
    promptBaseUrl: "http://127.0.0.1:11434/v1",
    promptModel: "llama3.2-vision",
    promptEndpoint: "chat"
  },
  "lm-studio": {
    promptBaseUrl: "http://127.0.0.1:1234/v1",
    promptModel: "local-model",
    promptEndpoint: "chat"
  },
  "new-api": {
    promptBaseUrl: "",
    promptModel: "",
    promptEndpoint: "chat"
  },
  cherryin: {
    promptBaseUrl: "",
    promptModel: "",
    promptEndpoint: "chat"
  },
  custom: {
    promptBaseUrl: "",
    promptModel: "",
    promptEndpoint: "chat"
  }
};

const GRSAI_IMAGE_MODEL_INFO = {
  "gpt-image-2": {
    label: "gpt-image-2",
    resolutions: ["1K"],
    supportText: "文生图 / 图生图 · 1K"
  },
  "gpt-image-2-vip": {
    label: "gpt-image-2-vip",
    resolutions: ["1K", "2K", "4K"],
    supportText: "文生图 / 图生图 · 1K / 2K / 4K"
  },
  "nano-banana": {
    label: "nano-banana",
    resolutions: null,
    supportText: "文生图 / 图生图 · 官方直连"
  },
  "nano-banana-fast": {
    label: "nano-banana-fast",
    resolutions: null,
    supportText: "文生图 / 图生图 · 官方直连"
  },
  "nano-banana-2": {
    label: "nano-banana-2",
    resolutions: ["1K", "2K", "4K"],
    supportText: "文生图 / 图生图 · 1K / 2K / 4K"
  },
  "nano-banana-pro": {
    label: "nano-banana-pro",
    resolutions: ["1K", "2K", "4K"],
    supportText: "文生图 / 图生图 · 1K / 2K / 4K"
  },
  "nano-banana-pro-vt": {
    label: "nano-banana-pro-vt",
    resolutions: ["1K", "2K", "4K"],
    supportText: "文生图 / 图生图 · 1K / 2K / 4K"
  },
  "nano-banana-2-cl": {
    label: "nano-banana-2-cl",
    resolutions: ["1K", "2K"],
    supportText: "文生图 / 图生图 · 1K / 2K"
  },
  "nano-banana-pro-cl": {
    label: "nano-banana-pro-cl",
    resolutions: ["1K", "2K", "4K"],
    supportText: "文生图 / 图生图 · 1K / 2K / 4K"
  },
  "nano-banana-2-4k-cl": {
    label: "nano-banana-2-4k-cl",
    resolutions: ["4K"],
    supportText: "文生图 / 图生图 · 4K"
  },
  "nano-banana-pro-vip": {
    label: "nano-banana-pro-vip",
    resolutions: ["1K", "2K"],
    supportText: "文生图 / 图生图 · 1K / 2K"
  },
  "nano-banana-pro-4k-vip": {
    label: "nano-banana-pro-4k-vip",
    resolutions: ["4K"],
    supportText: "文生图 / 图生图 · 4K"
  }
};

const GRSAI_IMAGE_MODELS = [
  "gpt-image-2",
  "gpt-image-2-vip",
  "nano-banana",
  "nano-banana-fast",
  "nano-banana-2",
  "nano-banana-pro",
  "nano-banana-pro-vt",
  "nano-banana-2-cl",
  "nano-banana-pro-cl",
  "nano-banana-2-4k-cl",
  "nano-banana-pro-vip",
  "nano-banana-pro-4k-vip"
];

const IMAGE_PROVIDER_PRESETS = {
  grsai: {
    providerType: "grsai",
    baseUrl: "https://grsai.dakka.com.cn",
    model1k: "gpt-image-2",
    model2k: "gpt-image-2-vip"
  },
  openai: {
    providerType: "openai-images",
    baseUrl: "https://api.openai.com/v1",
    model1k: "gpt-image-1",
    model2k: "gpt-image-1"
  },
  qwen: {
    providerType: "custom",
    baseUrl: "https://dashscope.aliyuncs.com/api/v1",
    model1k: "wanx2.1-t2i-turbo",
    model2k: "wanx2.1-t2i-plus"
  },
  doubao: {
    providerType: "custom",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    model1k: "doubao-seedream-3-0-t2i-250415",
    model2k: "doubao-seedream-3-0-t2i-250415"
  },
  stability: {
    providerType: "custom",
    baseUrl: "https://api.stability.ai",
    model1k: "stable-image-core",
    model2k: "stable-image-ultra"
  },
  replicate: {
    providerType: "custom",
    baseUrl: "https://api.replicate.com/v1",
    model1k: "black-forest-labs/flux-schnell",
    model2k: "black-forest-labs/flux-1.1-pro"
  },
  kling: {
    providerType: "custom",
    baseUrl: "https://api.klingai.com",
    model1k: "kling-image",
    model2k: "kling-image"
  },
  gemini: {
    providerType: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model1k: "gemini-3.1-flash-image-preview",
    model2k: "gemini-3-pro-image-preview"
  },
  midjourney: {
    providerType: "custom",
    baseUrl: "",
    model1k: "mj-v7",
    model2k: "mj-v7"
  },
  bfl: {
    providerType: "bfl",
    baseUrl: "https://api.bfl.ai/v1",
    model1k: "flux-2-pro-preview",
    model2k: "flux-2-max"
  },
  custom: {
    providerType: "custom",
    baseUrl: "",
    model1k: "",
    model2k: ""
  }
};

const RATIO_SIZES = {
  "1K": {
    "1:1": "1024x1024",
    "16:9": "1672x941",
    "9:16": "941x1672",
    "4:3": "1443x1090",
    "3:4": "1090x1443",
    "3:2": "1536x1024",
    "2:3": "1024x1536",
    "5:4": "1408x1120",
    "4:5": "1120x1408",
    "21:9": "1920x832",
    "9:21": "832x1920",
    "1:2": "896x1792",
    "2:1": "1792x896"
  },
  "2K": {
    "1:1": "2048x2048",
    "16:9": "2048x1152",
    "9:16": "1152x2048",
    "4:3": "2304x1728",
    "3:4": "1728x2304",
    "3:2": "2048x1360",
    "2:3": "1360x2048",
    "5:4": "2240x1792",
    "4:5": "1792x2240",
    "21:9": "2912x1248",
    "9:21": "1248x2912",
    "1:3": "688x2048",
    "3:1": "2048x688",
    "2:1": "3072x1536",
    "1:2": "1536x3072"
  },
  "4K": {
    "1:1": "2880x2880",
    "16:9": "3840x2160",
    "9:16": "2160x3840",
    "4:3": "3264x2448",
    "3:4": "2448x3264",
    "3:2": "3504x2336",
    "2:3": "2336x3504",
    "5:4": "3200x2560",
    "4:5": "2560x3200",
    "21:9": "3840x1648",
    "9:21": "1648x3840",
    "1:3": "1280x3840",
    "3:1": "3840x1280",
    "2:1": "3840x1920",
    "1:2": "1920x3840"
  }
};

const GRSAI_GPT_IMAGE_2_SIZES = {
  "1:1": "1024x1024",
  "16:9": "1672x941",
  "9:16": "941x1672",
  "4:3": "1443x1090",
  "3:4": "1090x1443",
  "3:2": "1536x1024",
  "2:3": "1024x1536",
  "5:4": "1408x1120",
  "4:5": "1120x1408",
  "21:9": "1920x832",
  "9:21": "832x1920",
  "1:2": "896x1792",
  "2:1": "1792x896"
};

const GRSAI_GPT_IMAGE_2_VIP_SIZES = {
  "1K": {
    "1:1": "1024x1024",
    "16:9": "1280x720",
    "9:16": "720x1280",
    "4:3": "1152x864",
    "3:4": "864x1152",
    "3:2": "1536x1024",
    "2:3": "1024x1536",
    "5:4": "1120x896",
    "4:5": "896x1120",
    "21:9": "1456x624",
    "9:21": "624x1456",
    "2:1": "1536x768",
    "1:2": "768x1536"
  },
  "2K": {
    "1:1": "2048x2048",
    "16:9": "2048x1152",
    "9:16": "1152x2048",
    "4:3": "2304x1728",
    "3:4": "1728x2304",
    "3:2": "2048x1360",
    "2:3": "1360x2048",
    "5:4": "2240x1792",
    "4:5": "1792x2240",
    "21:9": "2912x1248",
    "9:21": "1248x2912",
    "1:3": "688x2048",
    "3:1": "2048x688",
    "2:1": "3072x1536",
    "1:2": "1536x3072"
  },
  "4K": {
    "1:1": "2880x2880",
    "16:9": "3840x2160",
    "9:16": "2160x3840",
    "4:3": "3264x2448",
    "3:4": "2448x3264",
    "3:2": "3504x2336",
    "2:3": "2336x3504",
    "5:4": "3200x2560",
    "4:5": "2560x3200",
    "21:9": "3840x1648",
    "9:21": "1648x3840",
    "1:3": "1280x3840",
    "3:1": "3840x1280",
    "2:1": "3840x1920",
    "1:2": "1920x3840"
  }
};

const SINGLE_IMAGE_TIMEOUT_MS = 5 * 60 * 1000;
const PROMPT_API_TIMEOUT_MS = 3 * 60 * 1000;
const SUITE_PLAN_AI_TIMEOUT_MS = 45 * 1000;
const ENABLE_SEPARATE_AI_SUITE_PLANNING = false;
const PROMPT_REWRITE_CHUNK_TIMEOUT_MS = 45 * 1000;
const PROMPT_REWRITE_TOTAL_TIMEOUT_MS = 2 * 60 * 1000;
const PROMPT_REWRITE_SINGLE_RETRY_TIMEOUT_MS = 35 * 1000;
const TITLE_OPTIMIZATION_TIMEOUT_MS = 3 * 60 * 1000;
const MAX_IMAGE_CONCURRENCY = 10;
const MAX_KIND_COUNT = 10;
const GENERATED_IMAGE_RETENTION_MS = 3 * 24 * 60 * 60 * 1000;
const CATEGORY_PROMPT_REWRITE_CHUNK_SIZE = 50;
const PROMPT_REWRITE_CONCURRENCY = 2;
const PROMPT_REWRITE_SINGLE_RETRY_CONCURRENCY = 2;
const LEGACY_DETAIL_KIND = "\u8be6\u60c5\u56fe";
const ALLOWED_IMAGE_KINDS = new Set(["SKU图", "卖点图", "白底图", "场景图", "高级A+"]);
const APP_TITLE = "全自动套图生成";
const APP_ICON_FILE = process.platform === "win32" ? "app-icon.ico" : "app-icon.png";

function isNanoBananaModel(model) {
  return String(model || "").toLowerCase().startsWith("nano-banana");
}

function normalizeResolution(value) {
  const text = String(value || "").toUpperCase();
  return ["1K", "2K", "4K"].includes(text) ? text : "1K";
}

function isGptImage2VipModel(model) {
  return String(model || "").toLowerCase() === "gpt-image-2-vip";
}

function isGptImage2Model(model) {
  return String(model || "").toLowerCase() === "gpt-image-2";
}

function isGptImageModel(model) {
  return /(^|[/:_\-\s])(?:gpt-image|openai\/gpt-image)/i.test(String(model || ""));
}

function isGeminiImageModel(model) {
  const text = String(model || "").toLowerCase();
  return isNanoBananaModel(text) || /(^|[/:_\-\s])(?:gemini|imagen)(?:[/:_\-\s]|$)/i.test(text);
}

function isFluxImageModel(model) {
  return /(^|[/:_\-\s])(?:flux|black-forest-labs|bfl)(?:[/:_\-\s]|$)/i.test(String(model || "").toLowerCase());
}

function imagePromptProfileForModel(model) {
  if (isGptImageModel(model)) {
    return {
      id: "openai-gpt-image",
      label: "OpenAI GPT Image",
      maxLength: 3600,
      guide: "Use a natural-language creative brief with exact subject, category-specific composition, lighting, visible text policy, and a short grouped avoid list."
    };
  }
  if (isGeminiImageModel(model)) {
    return {
      id: "gemini-image",
      label: "Gemini / Nano Banana Image",
      maxLength: 3800,
      guide: "Use clear descriptive scene instructions, semantic sections, exact preserved elements, and relationship-focused constraints."
    };
  }
  if (isFluxImageModel(model)) {
    return {
      id: "flux-image",
      label: "FLUX-style image",
      maxLength: 2200,
      guide: "Use compact photographic art direction, concrete subject and setting, and minimal negative wording."
    };
  }
  return {
    id: "generic-image",
    label: "Generic image model",
    maxLength: 2600,
    guide: "Use a balanced ecommerce image prompt with product fidelity, composition, text policy, and grouped constraints."
  };
}

function normalizeImageModelRoute(value) {
  const text = String(value || "").trim();
  if (text) return text;
  return DEFAULT_CONFIG.imageModelRoute;
}

function grsaiImageModelInfo(model) {
  return GRSAI_IMAGE_MODEL_INFO[String(model || "").trim()] || null;
}

function supportsImageResolution(model, resolution) {
  const info = grsaiImageModelInfo(model);
  const normalized = normalizeResolution(resolution);
  if (!info || !Array.isArray(info.resolutions) || !info.resolutions.length) return true;
  return info.resolutions.includes(normalized);
}

function resolveConfiguredImageModel(config, resolution) {
  const normalized = normalizeResolution(resolution);
  const route = normalizeImageModelRoute(config.imageModelRoute);
  if (route !== "auto") return route;
  if (normalized === "1K") return config.image1kModel || config.grsai1kModel || DEFAULT_CONFIG.image1kModel;
  return config.image2kModel || config.grsai2kModel || DEFAULT_CONFIG.image2kModel;
}

function resolveImageModelForPayload(config, payload = {}) {
  const requestedResolution = normalizeResolution(payload.resolution);
  const modelRoute = normalizeImageModelRoute(payload.imageModelRoute || config.imageModelRoute);
  const explicitModel = String(payload.imageModelRoute || "").trim();
  const routeConfig = {
    ...config,
    imageModelRoute: modelRoute,
    image1kModel: explicitModel && explicitModel !== "auto" ? explicitModel : config.image1kModel,
    image2kModel: explicitModel && explicitModel !== "auto" ? explicitModel : config.image2kModel
  };
  const model = resolveConfiguredImageModel(routeConfig, requestedResolution);
  if (!supportsImageResolution(model, requestedResolution)) {
    const info = grsaiImageModelInfo(model);
    const support = info?.resolutions?.join(" / ") || "官方未明确";
    throw new Error(`当前模型 ${model} 不支持 ${requestedResolution}。官方支持分辨率：${support}。请在左侧切换模型或分辨率。`);
  }
  return model;
}

function grsaiImageModelDetails() {
  return GRSAI_IMAGE_MODELS.map((model) => {
    const info = grsaiImageModelInfo(model);
    return {
      model,
      ...info
    };
  });
}

let mainWindow;

function appIconPath() {
  return path.join(__dirname, "assets", APP_ICON_FILE);
}

function createWindow() {
  writeRuntimeLog("create-window", { version: APP_VERSION, buildId: RUNTIME_BUILD_ID });
  mainWindow = new BrowserWindow({
    width: 1220,
    height: 860,
    minWidth: 1080,
    minHeight: 760,
    backgroundColor: "#eaf3ff",
    title: APP_TITLE,
    icon: appIconPath(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

function configPath() {
  const userDataPath = app?.getPath ? app.getPath("userData") : path.join(process.env.APPDATA || __dirname, APP_TITLE);
  return path.join(userDataPath, "config.json");
}

function historyPath() {
  const userDataPath = app?.getPath ? app.getPath("userData") : path.join(process.env.APPDATA || __dirname, APP_TITLE);
  return path.join(userDataPath, "history.json");
}

function generatedImagesDir() {
  const userDataPath = app?.getPath ? app.getPath("userData") : path.join(process.env.APPDATA || __dirname, APP_TITLE);
  return path.join(userDataPath, "generated-images");
}

function runtimeLogPath() {
  const userDataPath = app?.getPath ? app.getPath("userData") : path.join(process.env.APPDATA || __dirname, APP_TITLE);
  return path.join(userDataPath, "runtime.log");
}

function sanitizeRuntimeLogValue(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (/^(data:image|https?:\/\/)/i.test(value)) return `${value.slice(0, 96)}...`;
    return value.length > 1200 ? `${value.slice(0, 1200)}...` : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    if (depth >= 2) return `[array:${value.length}]`;
    return value.slice(0, 12).map((item) => sanitizeRuntimeLogValue(item, depth + 1));
  }
  if (typeof value === "object") {
    if (depth >= 2) return "[object]";
    const output = {};
    for (const [key, item] of Object.entries(value).slice(0, 24)) {
      if (/api.?key|token|secret|password|authorization/i.test(key)) {
        output[key] = item ? "[redacted]" : "";
      } else {
        output[key] = sanitizeRuntimeLogValue(item, depth + 1);
      }
    }
    return output;
  }
  return String(value);
}

function writeRuntimeLog(message, details = {}) {
  const line = JSON.stringify({
    at: new Date().toISOString(),
    message,
    ...sanitizeRuntimeLogValue(details)
  });
  fs.appendFile(runtimeLogPath(), `${line}\n`, "utf8").catch(() => {});
}

function uiStatePath() {
  const userDataPath = app?.getPath ? app.getPath("userData") : path.join(process.env.APPDATA || __dirname, APP_TITLE);
  return path.join(userDataPath, "ui-state.json");
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

function imageExtensionFromMime(mime) {
  const value = String(mime || "").toLowerCase();
  if (value.includes("jpeg") || value.includes("jpg")) return ".jpg";
  if (value.includes("webp")) return ".webp";
  if (value.includes("gif")) return ".gif";
  if (value.includes("png")) return ".png";
  return "";
}

function imageExtensionFromSource(source) {
  try {
    const parsed = new URL(source);
    const ext = path.extname(parsed.pathname).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) return ext;
  } catch {
    const ext = path.extname(String(source || "")).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) return ext;
  }
  return ".png";
}

function decodeInlineImageSource(source) {
  const value = String(source || "").trim();
  const dataUrlMatch = value.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (dataUrlMatch) {
    return {
      buffer: Buffer.from(dataUrlMatch[2], "base64"),
      ext: imageExtensionFromMime(dataUrlMatch[1]) || ".png"
    };
  }

  if (!/^https?:\/\//i.test(value) && !/^file:\/\//i.test(value) && /^[a-z0-9+/=\r\n]+$/i.test(value) && value.length > 200) {
    return {
      buffer: Buffer.from(value, "base64"),
      ext: ".png"
    };
  }

  return null;
}

async function readImageSourceBuffer(source) {
  const value = String(source || "").trim();
  const inline = decodeInlineImageSource(value);
  if (inline) return inline;

  if (/^file:\/\//i.test(value)) {
    const filePath = fileURLToPath(value);
    return {
      buffer: await fs.readFile(filePath),
      ext: imageExtensionFromSource(filePath)
    };
  }

  if (path.isAbsolute(value)) {
    return {
      buffer: await fs.readFile(value),
      ext: imageExtensionFromSource(value)
    };
  }

  const response = await fetch(value);
  if (!response.ok) throw new Error(`下载失败: ${response.status}`);
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    ext: imageExtensionFromMime(response.headers.get("content-type")) || imageExtensionFromSource(value)
  };
}

async function imageSourceToDataUrl(source) {
  const value = String(source || "").trim();
  if (!value) return "";
  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(value)) return value;
  if (/^https?:\/\//i.test(value)) return value;
  const { buffer, ext } = await readImageSourceBuffer(value);
  const mimeByExt = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".png": "image/png"
  };
  const mime = mimeByExt[String(ext || ".png").toLowerCase()] || "image/png";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function normalizeImageSourcesForPrompt(images = [], limit = 4) {
  const normalized = [];
  for (const image of (images || []).slice(0, limit)) {
    const value = String(image || "").trim();
    if (!value) continue;
    normalized.push(await imageSourceToDataUrl(value));
  }
  return normalized.filter(Boolean);
}

const AI_FILE_TEXT_LIMIT = 120000;
const AI_FILE_UNSUPPORTED_TEXT = "当前版本只能自动读取文本、代码、CSV、JSON、Markdown、XML、HTML、部分 PDF 文本以及 Office Open XML 文件里的可见文字；这个文件只附带了文件信息。";
const AI_TEXT_FILE_EXTENSIONS = new Set([
  ".txt", ".md", ".markdown", ".csv", ".tsv", ".json", ".jsonl", ".xml", ".html", ".htm", ".log",
  ".ini", ".yaml", ".yml", ".js", ".jsx", ".ts", ".tsx", ".css", ".scss", ".less", ".py", ".java",
  ".go", ".rs", ".php", ".rb", ".c", ".cpp", ".h", ".hpp", ".cs", ".swift", ".kt", ".sql", ".sh",
  ".bat", ".ps1", ".toml", ".env"
]);

function decodeXmlEntities(text = "") {
  return String(text || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_match, code) => {
      const value = Number(code);
      return Number.isFinite(value) ? String.fromCodePoint(value) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => {
      const value = Number.parseInt(code, 16);
      return Number.isFinite(value) ? String.fromCodePoint(value) : "";
    });
}

function stripXmlText(xml = "") {
  return decodeXmlEntities(String(xml || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " "))
    .trim();
}

function inflateRawDeflate(buffer) {
  try {
    return zlib.inflateRawSync(buffer);
  } catch {
    return null;
  }
}

function parseZipEntriesFromLocalHeaders(buffer) {
  const entries = [];
  let offset = 0;
  while (offset + 30 <= buffer.length) {
    const signature = buffer.readUInt32LE(offset);
    if (signature !== 0x04034b50) break;
    const flags = buffer.readUInt16LE(offset + 6);
    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const uncompressedSize = buffer.readUInt32LE(offset + 22);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + fileNameLength + extraLength;
    const name = buffer.slice(nameStart, nameStart + fileNameLength).toString("utf8");
    if (flags & 0x08) break;
    const dataEnd = dataStart + compressedSize;
    if (!name || dataEnd > buffer.length) break;
    const compressed = buffer.slice(dataStart, dataEnd);
    let data = null;
    if (method === 0) data = compressed;
    if (method === 8) data = inflateRawDeflate(compressed);
    if (data && (!uncompressedSize || data.length <= Math.max(uncompressedSize, AI_FILE_TEXT_LIMIT * 3))) {
      entries.push({ name, data });
    }
    offset = dataEnd;
  }
  return entries;
}

function parseZipEntriesFromCentralDirectory(buffer) {
  const entries = [];
  const minSearchStart = Math.max(0, buffer.length - 0xffff - 22);
  let eocdOffset = -1;
  for (let index = buffer.length - 22; index >= minSearchStart; index -= 1) {
    if (buffer.readUInt32LE(index) === 0x06054b50) {
      eocdOffset = index;
      break;
    }
  }
  if (eocdOffset < 0) return entries;
  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  let offset = centralDirectoryOffset;
  for (let index = 0; index < totalEntries && offset + 46 <= buffer.length; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const nameStart = offset + 46;
    const name = buffer.slice(nameStart, nameStart + fileNameLength).toString(flags & 0x0800 ? "utf8" : "utf8");
    offset = nameStart + fileNameLength + extraLength + commentLength;
    if (!name || localHeaderOffset + 30 > buffer.length) continue;
    if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) continue;
    const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > buffer.length) continue;
    const compressed = buffer.slice(dataStart, dataEnd);
    let data = null;
    if (method === 0) data = compressed;
    if (method === 8) data = inflateRawDeflate(compressed);
    if (data && (!uncompressedSize || data.length <= Math.max(uncompressedSize, AI_FILE_TEXT_LIMIT * 3))) {
      entries.push({ name, data });
    }
  }
  return entries;
}

function parseZipEntries(buffer) {
  const centralEntries = parseZipEntriesFromCentralDirectory(buffer);
  return centralEntries.length ? centralEntries : parseZipEntriesFromLocalHeaders(buffer);
}

function officeEntryPriority(name = "") {
  const value = String(name || "");
  if (/^word\/document\.xml$/i.test(value)) return 1;
  if (/^word\/(header|footer)\d*\.xml$/i.test(value)) return 2;
  if (/^xl\/sharedStrings\.xml$/i.test(value)) return 1;
  if (/^xl\/worksheets\/sheet\d+\.xml$/i.test(value)) return 2;
  if (/^ppt\/slides\/slide\d+\.xml$/i.test(value)) return 1;
  if (/^ppt\/notesSlides\/notesSlide\d+\.xml$/i.test(value)) return 3;
  return 9;
}

function extractOfficeOpenXmlText(buffer, ext = "") {
  const entries = parseZipEntries(buffer)
    .filter((entry) => /\.xml$/i.test(entry.name))
    .filter((entry) => {
      if (ext === ".docx") return /^word\//i.test(entry.name);
      if (ext === ".xlsx") return /^xl\/(sharedStrings|worksheets)\//i.test(entry.name);
      if (ext === ".pptx") return /^ppt\/(slides|notesSlides)\//i.test(entry.name);
      return /^(word|xl|ppt)\//i.test(entry.name);
    })
    .sort((a, b) => officeEntryPriority(a.name) - officeEntryPriority(b.name));
  const chunks = [];
  for (const entry of entries) {
    const text = stripXmlText(entry.data.toString("utf8"));
    if (text) chunks.push(text);
    if (chunks.join("\n").length >= AI_FILE_TEXT_LIMIT) break;
  }
  return chunks.join("\n").slice(0, AI_FILE_TEXT_LIMIT).trim();
}

function extractPdfText(buffer) {
  const raw = buffer.toString("latin1");
  const chunks = [];
  const streamPattern = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  while ((match = streamPattern.exec(raw))) {
    const stream = Buffer.from(match[1], "latin1");
    let decoded = "";
    try {
      const inflated = zlib.inflateSync(stream);
      decoded = inflated.toString("latin1");
    } catch {
      decoded = stream.toString("latin1");
    }
    const textMatches = [...decoded.matchAll(/\((?:\\.|[^\\)])*\)/g)]
      .map((item) => item[0].slice(1, -1).replace(/\\([nrtbf()\\])/g, (_m, code) => ({ n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" }[code] || code)));
    if (textMatches.length) chunks.push(textMatches.join(" "));
    if (chunks.join("\n").length >= AI_FILE_TEXT_LIMIT) break;
  }
  return chunks.join("\n").replace(/\s+/g, " ").slice(0, AI_FILE_TEXT_LIMIT).trim();
}

async function readAiWorkspaceFile(payload = {}) {
  const name = String(payload.name || "未命名文件").trim() || "未命名文件";
  const type = String(payload.type || "").trim();
  const dataUrl = String(payload.dataUrl || "").trim();
  const ext = path.extname(name).toLowerCase();
  const match = dataUrl.match(/^data:([^;,]*)(;base64)?,(.*)$/);
  if (!match) throw new Error("文件读取失败：前端没有传入有效文件数据。");
  const encoded = match[3] || "";
  const buffer = match[2]
    ? Buffer.from(encoded, "base64")
    : Buffer.from(decodeURIComponent(encoded), "utf8");
  const result = {
    name,
    type: type || match[1] || "application/octet-stream",
    size: Number(payload.size || buffer.length || 0),
    readable: false,
    text: "",
    note: ""
  };
  try {
    if ((type || "").startsWith("text/") || AI_TEXT_FILE_EXTENSIONS.has(ext)) {
      result.text = buffer.toString("utf8").replace(/^\uFEFF/, "");
    } else if ([".docx", ".xlsx", ".pptx"].includes(ext)) {
      result.text = extractOfficeOpenXmlText(buffer, ext);
      if (!result.text) result.note = "没有从 Office 文件里提取到可见文字。";
    } else if (ext === ".pdf" || /pdf/i.test(type)) {
      result.text = extractPdfText(buffer);
      if (!result.text) result.note = "PDF 没有提取到可读文字，可能是扫描件或加密/压缩格式。";
    } else {
      result.note = AI_FILE_UNSUPPORTED_TEXT;
    }
  } catch (error) {
    result.note = `文件解析失败：${error?.message || "未知错误"}`;
  }
  result.text = String(result.text || "").replace(/\u0000/g, "").slice(0, AI_FILE_TEXT_LIMIT);
  result.readable = Boolean(result.text.trim());
  if (result.text.length >= AI_FILE_TEXT_LIMIT) {
    result.note = `${result.note ? `${result.note} ` : ""}文件内容较长，已截取前 ${AI_FILE_TEXT_LIMIT} 字符发送给模型。`.trim();
  }
  if (!result.readable && !result.note) result.note = AI_FILE_UNSUPPORTED_TEXT;
  return result;
}

const LOCAL_FILE_REFERENCE_PATTERN = /(?:file:\/\/\/?|(?:^|[\s"'[{(,:])(?:[A-Za-z]:[\\/]|\\\\[^\\/\s]+[\\/]))/i;

function containsLocalFileReference(value, seen = new Set()) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return LOCAL_FILE_REFERENCE_PATTERN.test(value);
  if (typeof Buffer !== "undefined" && Buffer.isBuffer?.(value)) return false;
  if (Array.isArray(value)) return value.some((item) => containsLocalFileReference(item, seen));
  if (typeof value === "object") {
    if (seen.has(value)) return false;
    seen.add(value);
    return Object.values(value).some((item) => containsLocalFileReference(item, seen));
  }
  return false;
}

function outboundBodyForInspection(body) {
  if (!body) return null;
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  if (body instanceof URLSearchParams) return body.toString();
  return body;
}

function assertNoLocalFileReferencesInOutboundRequest(url, body) {
  const inspected = outboundBodyForInspection(body);
  if (!containsLocalFileReference(inspected)) return;
  throw new Error(`安全拦截：准备发送到 ${url} 的请求体里仍包含本地文件路径（file:///、C:\\... 或 UNC 路径）。已阻止发送到云端模型，请先把本地图片转换为 base64/data URL。`);
}

function cachedImageFilePath(ext = ".png") {
  const safeExt = ["png", "jpg", "jpeg", "webp", "gif"].includes(String(ext).replace(".", "").toLowerCase())
    ? (ext.startsWith(".") ? ext : `.${ext}`)
    : ".png";
  return path.join(generatedImagesDir(), `${Date.now()}-${crypto.randomUUID()}${safeExt}`);
}

function localPathFromResult(result) {
  if (result?.localPath) return result.localPath;
  const url = String(result?.url || "");
  if (/^file:\/\//i.test(url)) {
    try {
      return fileURLToPath(url);
    } catch {
      return "";
    }
  }
  return "";
}

function isInsideGeneratedImagesDir(filePath) {
  if (!filePath) return false;
  const cacheDir = path.resolve(generatedImagesDir());
  const target = path.resolve(filePath);
  return target.startsWith(`${cacheDir}${path.sep}`);
}

async function removeCachedImage(filePath) {
  if (!isInsideGeneratedImagesDir(filePath)) return;
  await fs.rm(path.resolve(filePath), { force: true });
}

async function cacheGeneratedImageResult(result) {
  if (!result?.url || result.status === "failed" || result.status === "timeout") return result;

  const cachedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + GENERATED_IMAGE_RETENTION_MS).toISOString();
  const sourceUrl = String(result.url || "").trim();

  try {
    const { buffer, ext } = await readImageSourceBuffer(sourceUrl);
    await fs.mkdir(generatedImagesDir(), { recursive: true });
    const filePath = cachedImageFilePath(ext);
    await fs.writeFile(filePath, buffer);
    return {
      ...result,
      url: pathToFileURL(filePath).href,
      originalUrl: result.originalUrl || sourceUrl,
      localPath: filePath,
      cachedAt,
      expiresAt
    };
  } catch (error) {
    console.warn("Failed to cache generated image:", error);
    return {
      ...result,
      expiresAt
    };
  }
}

async function cacheGeneratedImageResults(results) {
  const cached = [];
  for (const result of results || []) {
    cached.push(await cacheGeneratedImageResult(result));
  }
  return cached;
}

function resultExpiryTime(result, entry) {
  const explicit = Date.parse(result?.expiresAt || "");
  if (Number.isFinite(explicit)) return explicit;

  const cached = Date.parse(result?.cachedAt || "");
  if (Number.isFinite(cached)) return cached + GENERATED_IMAGE_RETENTION_MS;

  const created = Date.parse(entry?.createdAt || "");
  if (Number.isFinite(created) && result?.url) return created + GENERATED_IMAGE_RETENTION_MS;

  return null;
}

async function cleanupGeneratedImageCache(now = Date.now()) {
  const dir = generatedImagesDir();
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const filePath = path.join(dir, entry.name);
    if (!isInsideGeneratedImagesDir(filePath)) continue;
    try {
      const stat = await fs.stat(filePath);
      if (now - stat.mtimeMs >= GENERATED_IMAGE_RETENTION_MS) {
        await removeCachedImage(filePath);
      }
    } catch {
      // Ignore cache cleanup races.
    }
  }
}

async function pruneExpiredHistoryResults() {
  const current = await readJson(historyPath(), []);
  const now = Date.now();
  if (!Array.isArray(current)) {
    await cleanupGeneratedImageCache(now);
    return [];
  }

  let changed = false;
  const next = [];
  for (const entry of current) {
    const originalResults = Array.isArray(entry.results) ? entry.results : [];
    const keptResults = [];

    for (const result of originalResults) {
      const expiresAt = resultExpiryTime(result, entry);
      if (expiresAt && expiresAt <= now) {
        changed = true;
        await removeCachedImage(localPathFromResult(result));
        continue;
      }
      keptResults.push(result);
    }

    if (keptResults.length !== originalResults.length) changed = true;
    next.push({ ...entry, results: keptResults });
  }

  if (changed) {
    await writeJson(historyPath(), next.slice(0, 80));
  }
  await cleanupGeneratedImageCache(now);
  return next.slice(0, 80);
}

async function getUiState() {
  return readJson(uiStatePath(), {});
}

async function saveUiStatePatch(patch) {
  const current = await getUiState();
  const next = { ...current, ...patch };
  await writeJson(uiStatePath(), next);
  return next;
}

async function saveConfigForTest(config) {
  const promptSettings = normalizePromptProviderConfig(config || {});
  const imageSettings = normalizeImageProviderConfig(config || {});
  const next = {
    ...DEFAULT_CONFIG,
    ...config,
    promptProvider: promptSettings.promptProvider,
    promptBaseUrl: promptSettings.promptBaseUrl,
    promptModel: promptSettings.promptModel || DEFAULT_CONFIG.promptModel,
    promptEndpoint: promptSettings.promptEndpoint,
    promptProviderKeys: normalizeStringMap(config?.promptProviderKeys),
    promptProviderModels: normalizeStringArrayMap(config?.promptProviderModels),
    promptProviderLastModels: normalizeStringMap(config?.promptProviderLastModels),
    promptProviderMeta: normalizePromptProviderMetaMap(config?.promptProviderMeta),
    promptProviderNotes: normalizePromptProviderNotesMap(config?.promptProviderNotes),
    promptProviderApiOptions: normalizePromptProviderApiOptionsMap(config?.promptProviderApiOptions),
    promptModelCapabilities: normalizePromptModelCapabilitiesMap(config?.promptModelCapabilities),
    promptScopeConfigs: normalizePromptScopeConfigs(config?.promptScopeConfigs),
    imageProvider: imageSettings.imageProvider,
    imageProviderType: imageSettings.imageProviderType,
    imageProviderKeys: normalizeStringMap(config?.imageProviderKeys, normalizeImageProvider),
    imageProviderModels: normalizeStringArrayMap(config?.imageProviderModels, normalizeImageProvider),
    imageProviderLastModels: normalizeStringMap(config?.imageProviderLastModels, normalizeImageModelSlotKey),
    imageBaseUrl: imageSettings.imageBaseUrl,
    grsaiBaseUrl: imageSettings.imageBaseUrl,
    imageApiKey: String(config?.imageApiKey || config?.grsaiApiKey || "").trim(),
    imageModelRoute: normalizeImageModelRoute(config?.imageModelRoute),
    featureImageModelRoutes: normalizeFeatureImageModelRoutes(config?.featureImageModelRoutes),
    image1kModel: imageSettings.image1kModel,
    image2kModel: imageSettings.image2kModel,
    grsai1kModel: imageSettings.image1kModel,
    grsai2kModel: imageSettings.image2kModel,
    trendProxyUrl: normalizeProxyUrl(config?.trendProxyUrl),
    updateManifestUrl: normalizeUpdateUrl(config?.updateManifestUrl || DEFAULT_UPDATE_MANIFEST_URL),
    updateCheckOnStartup: config?.updateCheckOnStartup !== false
  };
  await writeJson(configPath(), next);
  return next;
}

function normalizedBaseUrlForCompare(value) {
  return trimSlash(String(value || "").trim()).toLowerCase();
}

function inferPromptProviderFromBaseUrl(baseUrl) {
  const current = normalizedBaseUrlForCompare(baseUrl);
  if (!current) return "";
  for (const [provider, preset] of Object.entries(PROMPT_PROVIDER_PRESETS)) {
    if (provider === "custom" || !preset.promptBaseUrl) continue;
    const presetUrl = normalizedBaseUrlForCompare(preset.promptBaseUrl);
    if (current === presetUrl || current.startsWith(`${presetUrl}/`)) return provider;
  }
  return "";
}

function inferImageProviderFromBaseUrl(baseUrl) {
  const current = normalizedBaseUrlForCompare(baseUrl);
  if (!current) return "";
  for (const [provider, preset] of Object.entries(IMAGE_PROVIDER_PRESETS)) {
    if (provider === "custom" || !Object.prototype.hasOwnProperty.call(preset, "baseUrl") || !preset.baseUrl) continue;
    const presetUrl = normalizedBaseUrlForCompare(preset.baseUrl);
    if (current === presetUrl || current.startsWith(`${presetUrl}/`)) return provider;
  }
  return "";
}

function migrateLegacyProviderConfig(saved = {}) {
  const next = { ...saved };
  if (!String(next.promptProvider || "").trim()) {
    const inferredPromptProvider = inferPromptProviderFromBaseUrl(next.promptBaseUrl);
    if (inferredPromptProvider) {
      next.promptProvider = inferredPromptProvider;
    } else if (next.promptBaseUrl || next.promptModel || next.promptApiKey) {
      next.promptProvider = "custom";
    }
  }

  if (!String(next.imageProvider || "").trim()) {
    const inferredImageProvider = inferImageProviderFromBaseUrl(next.imageBaseUrl || next.grsaiBaseUrl);
    if (inferredImageProvider) {
      next.imageProvider = inferredImageProvider;
    } else if (next.imageBaseUrl || next.grsaiBaseUrl || next.imageApiKey || next.grsaiApiKey) {
      next.imageProvider = "custom";
    }
  }

  return next;
}

async function getConfig() {
  const saved = migrateLegacyProviderConfig(await readJson(configPath(), {}));
  const merged = { ...DEFAULT_CONFIG, ...saved };
  return {
    ...merged,
    ...normalizePromptProviderConfig(merged),
    ...normalizeImageProviderConfig(merged),
    promptProviderKeys: normalizeStringMap(merged.promptProviderKeys),
    promptProviderModels: normalizeStringArrayMap(merged.promptProviderModels),
    promptProviderLastModels: normalizeStringMap(merged.promptProviderLastModels),
    promptProviderMeta: normalizePromptProviderMetaMap(merged.promptProviderMeta),
    promptProviderNotes: normalizePromptProviderNotesMap(merged.promptProviderNotes),
    promptProviderApiOptions: normalizePromptProviderApiOptionsMap(merged.promptProviderApiOptions),
    promptModelCapabilities: normalizePromptModelCapabilitiesMap(merged.promptModelCapabilities),
    promptScopeConfigs: normalizePromptScopeConfigs(merged.promptScopeConfigs),
    imageProviderKeys: normalizeStringMap(merged.imageProviderKeys, normalizeImageProvider),
    imageProviderModels: normalizeStringArrayMap(merged.imageProviderModels, normalizeImageProvider),
    imageProviderLastModels: normalizeStringMap(merged.imageProviderLastModels, normalizeImageModelSlotKey),
    featureImageModelRoutes: normalizeFeatureImageModelRoutes(merged.featureImageModelRoutes),
    updateManifestUrl: normalizeUpdateUrl(merged.updateManifestUrl || DEFAULT_UPDATE_MANIFEST_URL),
    updateCheckOnStartup: merged.updateCheckOnStartup !== false
  };
}

function assertPromptModelConfigured(config, taskName = "提示词模型调用") {
  if (!String(config?.promptBaseUrl || "").trim()) {
    throw new Error(`${taskName}失败：没有配置提示词模型 API 地址。请先到 API 设置中填写 Base URL。`);
  }
  if (!String(config?.promptApiKey || "").trim()) {
    throw new Error(`${taskName}失败：没有配置提示词模型 API Key。请先到 API 设置中填写 Key。`);
  }
  if (!String(config?.promptModel || "").trim()) {
    throw new Error(`${taskName}失败：没有配置提示词模型。请先到 API 设置中选择或填写模型名。`);
  }
}

function trimSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function authHeaders(apiKey) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}

function normalizePromptProvider(value) {
  const provider = String(value || "").trim().toLowerCase();
  if (!provider) return "custom";
  if (/^[a-z0-9][a-z0-9._:-]{0,63}$/.test(provider)) return provider;
  return "custom";
}

function normalizedPromptProviderPreset(provider) {
  const normalizedProvider = normalizePromptProvider(provider);
  return PROMPT_PROVIDER_PRESETS[normalizedProvider] || PROMPT_PROVIDER_PRESETS.custom;
}

function normalizePromptProviderConfig(config = {}) {
  const inferredProvider = inferPromptProviderFromBaseUrl(config.promptBaseUrl);
  const promptProvider = normalizePromptProvider(config.promptProvider || inferredProvider || "custom");
  const preset = normalizedPromptProviderPreset(promptProvider);
  const promptBaseUrl = trimSlash(config.promptBaseUrl || preset.promptBaseUrl || "");
  const promptModel = String(config.promptModel || preset.promptModel || "").trim();
  const requestedEndpoint = String(config.promptEndpoint || "").trim();
  const supportedEndpoints = ["responses", "chat", "auto", "gemini", "anthropic"];
  const promptEndpoint = supportedEndpoints.includes(requestedEndpoint)
    ? requestedEndpoint
    : (preset.promptEndpoint || "chat");

  return {
    promptProvider,
    promptBaseUrl,
    promptModel,
    promptEndpoint
  };
}

function normalizePromptScope(value = "image") {
  return ["image", "aplus", "ai"].includes(value) ? value : "image";
}

function normalizePromptScopeConfigs(configs = {}) {
  const source = configs && typeof configs === "object" ? configs : {};
  const result = {};
  for (const scope of ["image", "aplus", "ai"]) {
    const raw = source[scope] && typeof source[scope] === "object" ? source[scope] : {};
    const normalized = normalizePromptProviderConfig(raw);
    if (normalized.promptProvider || normalized.promptBaseUrl || normalized.promptModel) {
      result[normalizePromptScope(scope)] = normalized;
    }
  }
  return result;
}

function normalizeFeatureImageModelRoutes(routes = {}) {
  const source = routes && typeof routes === "object" ? routes : {};
  return {
    aplus: normalizeImageModelRoute(source.aplus || "auto")
  };
}

function normalizeImageProvider(value) {
  const provider = String(value || "").trim().toLowerCase();
  if (["grsai", "openai", "qwen", "doubao", "stability", "replicate", "kling", "gemini", "midjourney", "bfl", "custom"].includes(provider)) {
    return provider;
  }
  return "grsai";
}

function normalizeImageProviderType(value) {
  const type = String(value || "").trim().toLowerCase();
  if (["grsai", "openai-images", "gemini", "bfl", "custom"].includes(type)) return type;
  return "grsai";
}

function normalizedImageProviderPreset(provider) {
  const normalizedProvider = normalizeImageProvider(provider);
  return IMAGE_PROVIDER_PRESETS[normalizedProvider] || IMAGE_PROVIDER_PRESETS.grsai;
}

function normalizeImageProviderConfig(config = {}) {
  const inferredProvider = inferImageProviderFromBaseUrl(config.imageBaseUrl || config.grsaiBaseUrl);
  const imageProvider = normalizeImageProvider(config.imageProvider || inferredProvider || "grsai");
  const preset = normalizedImageProviderPreset(imageProvider);
  const isPresetProvider = imageProvider !== "custom";
  const imageProviderType = isPresetProvider
    ? normalizeImageProviderType(preset.providerType)
    : normalizeImageProviderType(config.imageProviderType);
  const imageBaseUrl = trimSlash(config.imageBaseUrl || config.grsaiBaseUrl || (isPresetProvider ? preset.baseUrl : "") || "");
  const fallback1kModel = isPresetProvider ? (preset.model1k || DEFAULT_CONFIG.image1kModel) : "";
  const fallback2kModel = isPresetProvider ? (preset.model2k || fallback1kModel || DEFAULT_CONFIG.image2kModel) : "";
  const image1kModel = String(config.image1kModel || config.grsai1kModel || fallback1kModel).trim();
  const image2kModel = String(config.image2kModel || config.grsai2kModel || fallback2kModel || image1kModel).trim();

  return {
    imageProvider,
    imageProviderType,
    imageBaseUrl,
    grsaiBaseUrl: imageBaseUrl,
    image1kModel,
    image2kModel,
    grsai1kModel: image1kModel,
    grsai2kModel: image2kModel
  };
}

function normalizeImageModelSlotKey(value) {
  const text = String(value || "").trim().toLowerCase();
  const match = text.match(/^([^:]+):(1k|2k|4k|route)$/);
  if (!match) return normalizeImageProvider(text);
  return `${normalizeImageProvider(match[1])}:${match[2]}`;
}

function normalizeStringMap(value, normalizeKey = normalizePromptProvider) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const result = {};
  for (const [key, rawValue] of Object.entries(source)) {
    const normalizedKey = normalizeKey(key);
    const text = String(rawValue || "").trim();
    if (text) result[normalizedKey] = text;
  }
  return result;
}

function normalizeStringArrayMap(value, normalizeKey = normalizePromptProvider) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const result = {};
  for (const [key, rawValues] of Object.entries(source)) {
    const normalizedKey = normalizeKey(key);
    const values = Array.isArray(rawValues) ? rawValues : [rawValues];
    const unique = [];
    const seen = new Set();
    for (const rawValue of values) {
      const text = String(rawValue || "").trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      unique.push(text);
    }
    if (unique.length) result[normalizedKey] = unique.slice(0, 200);
  }
  return result;
}

function normalizePromptProviderMetaMap(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const result = {};
  for (const [key, rawMeta] of Object.entries(source)) {
    const normalizedKey = normalizePromptProvider(key);
    if (!normalizedKey || normalizedKey === "custom" || !rawMeta || typeof rawMeta !== "object" || Array.isArray(rawMeta)) continue;
    const name = String(rawMeta.name || rawMeta.label || normalizedKey).trim();
    result[normalizedKey] = {
      name: name || normalizedKey,
      type: String(rawMeta.type || rawMeta.providerType || "OpenAI").trim() || "OpenAI",
      promptBaseUrl: trimSlash(rawMeta.promptBaseUrl || rawMeta.baseUrl || ""),
      promptEndpoint: ["responses", "chat", "auto", "gemini", "anthropic"].includes(rawMeta.promptEndpoint) ? rawMeta.promptEndpoint : "",
      promptModel: String(rawMeta.promptModel || "").trim(),
      custom: Boolean(rawMeta.custom)
    };
  }
  return result;
}

function normalizePromptProviderNotesMap(value) {
  return normalizeStringMap(value);
}

function normalizePromptProviderApiOptionsMap(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const result = {};
  const allowed = new Set([
    "arrayMessages",
    "developerMessage",
    "streamOptions",
    "serviceTier",
    "enableThinking",
    "verbosity"
  ]);
  for (const [key, rawOptions] of Object.entries(source)) {
    const normalizedKey = normalizePromptProvider(key);
    if (!normalizedKey || !rawOptions || typeof rawOptions !== "object" || Array.isArray(rawOptions)) continue;
    result[normalizedKey] = {};
    for (const option of allowed) {
      result[normalizedKey][option] = Boolean(rawOptions[option]);
    }
  }
  return result;
}

function normalizePromptModelCapabilitiesMap(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const result = {};
  for (const [providerKey, rawModels] of Object.entries(source)) {
    const normalizedProvider = normalizePromptProvider(providerKey);
    if (!normalizedProvider || !rawModels || typeof rawModels !== "object" || Array.isArray(rawModels)) continue;
    const modelMap = {};
    for (const [model, rawCapabilities] of Object.entries(rawModels)) {
      const modelName = String(model || "").trim();
      if (!modelName || !rawCapabilities || typeof rawCapabilities !== "object" || Array.isArray(rawCapabilities)) continue;
      modelMap[modelName] = normalizeModelCapabilities(rawCapabilities, modelName, normalizedProvider);
    }
    if (Object.keys(modelMap).length) result[normalizedProvider] = modelMap;
  }
  return result;
}

function normalizeProxyUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  return `http://${text}`;
}

function summarizeHttpError(status, message) {
  const raw = String(message || "").trim();
  const isHtml = /<!doctype|<html|<head|<body|cloudflare|bad gateway/i.test(raw);
  const statusText = {
    400: "请求参数不正确，请检查模型名、接口类型和输入内容。",
    401: "API Key 无效或没有填写，请到设置里重新检查 Key。",
    403: "当前 API Key 没有访问权限，请检查账号权限、模型权限或余额。",
    404: "接口地址或模型不存在，请检查 API 地址、接口类型和模型名。",
    429: "请求过于频繁或额度不足，请稍后重试，或检查账号余额。",
    500: "供应商服务器内部错误，请稍后重试。",
    502: "供应商服务器或中转线路临时不可用（502 网关错误），通常不是商品信息写错。",
    503: "供应商服务暂时不可用或正在维护，请稍后重试。",
    504: "供应商服务响应超时，请稍后重试，或切换其他模型/线路。"
  }[status];
  if (statusText) return `API 调用失败：${statusText}${raw && !isHtml ? ` 供应商原始信息：${raw.slice(0, 300)}` : ""}`;
  if (isHtml) return `API 调用失败：接口返回了网页错误页面（HTTP ${status}），请稍后重试或切换其他模型/供应商。`;
  return `API 调用失败：HTTP ${status}${raw ? `，${raw.slice(0, 300)}` : ""}`;
}

function appendRequestDebug(error, title, details = {}) {
  const message = String(error?.message || error || `${title}失败`).trim();
  if (message.includes("本次正式作图实际请求信息：") || message.includes("本次作图检测实际请求信息：")) {
    return new Error(message);
  }
  const lines = Object.entries(details)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([key, value]) => `${key}: ${value}`);
  return new Error(`${message}\n\n本次${title}实际请求信息：\n${lines.join("\n")}`);
}

async function requestJson(url, options = {}) {
  const timeoutMs = Number(options.timeoutMs || 0);
  const controller = timeoutMs ? new AbortController() : null;
  const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;
  const fetchOptions = { ...options };
  delete fetchOptions.timeoutMs;
  if (controller && !fetchOptions.signal) fetchOptions.signal = controller.signal;
  assertNoLocalFileReferencesInOutboundRequest(url, fetchOptions.body);

  try {
    const response = await fetch(url, fetchOptions);
    const text = await response.text();
    let body = {};
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text };
      }
    }

    if (!response.ok) {
      const message = body?.error?.message || body?.error || body?.message || body?.raw || response.statusText;
      throw new Error(summarizeHttpError(response.status, message));
    }

    return body;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`请求超时：${url}`);
    }
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function normalizeUpdateUrl(value = "") {
  const text = String(value || "").trim();
  if (!/^https?:\/\//i.test(text)) return "";
  return text;
}

function versionSegments(value = "") {
  return String(value || "")
    .replace(/^v/i, "")
    .split(/[.+-]/)
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
}

function compareVersions(left = "", right = "") {
  const a = versionSegments(left);
  const b = versionSegments(right);
  const length = Math.max(a.length, b.length, 3);
  for (let index = 0; index < length; index += 1) {
    const diff = (a[index] || 0) - (b[index] || 0);
    if (diff > 0) return 1;
    if (diff < 0) return -1;
  }
  return 0;
}

function normalizeUpdateNotes(notes) {
  if (Array.isArray(notes)) return notes.map((item) => String(item || "").trim()).filter(Boolean);
  const text = String(notes || "").trim();
  if (!text) return [];
  return text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function normalizeUpdateManifest(body = {}, manifestUrl = "") {
  const latestVersion = String(body.latestVersion || body.version || body.tag_name || "").replace(/^v/i, "").trim();
  const downloadUrl = normalizeUpdateUrl(body.downloadUrl || body.download_url || body.installerUrl || body.installer_url || "");
  const releaseNotesUrl = normalizeUpdateUrl(body.releaseNotesUrl || body.release_notes_url || body.releaseUrl || body.html_url || "");
  const notes = normalizeUpdateNotes(body.notes || body.changelog || body.body || body.releaseNotes);
  return {
    currentVersion: APP_VERSION,
    latestVersion,
    hasUpdate: latestVersion ? compareVersions(latestVersion, APP_VERSION) > 0 : false,
    downloadUrl,
    releaseNotesUrl,
    releaseUrl: releaseNotesUrl,
    title: String(body.title || body.name || `v${latestVersion}`).trim(),
    summary: String(body.summary || body.description || "").trim(),
    notes,
    publishedAt: String(body.publishedAt || body.published_at || "").trim(),
    manifestUrl
  };
}

async function checkForAppUpdate(options = {}) {
  const config = options.config || await getConfig();
  const manifestUrl = normalizeUpdateUrl(options.updateManifestUrl || config.updateManifestUrl);
  if (!manifestUrl) {
    return {
      currentVersion: APP_VERSION,
      enabled: false,
      hasUpdate: false,
      message: "未配置更新清单地址。"
    };
  }
  const body = await requestJson(manifestUrl, {
    method: "GET",
    headers: { "Cache-Control": "no-cache" },
    timeoutMs: UPDATE_CHECK_TIMEOUT_MS
  });
  const update = normalizeUpdateManifest(body, manifestUrl);
  if (!update.latestVersion) {
    throw new Error("更新清单缺少 latestVersion 或 version 字段。");
  }
  return {
    ...update,
    enabled: true
  };
}

function promptRequestDebugInfo(config, url, endpoint) {
  return [
    `供应商: ${config.promptProvider || "custom"}`,
    `模型: ${config.promptModel || "未填写"}`,
    `接口类型: ${endpoint || config.promptEndpoint || "未填写"}`,
    `请求地址: ${url || promptEndpointPreview(config) || "未生成"}`,
    `配置文件: ${configPath()}`
  ].join("\n");
}

function appendPromptRequestDebug(error, config, url, endpoint, action = "提示词模型调用", extraLines = []) {
  const message = String(error?.message || error || `${action}失败`).trim();
  if (message.includes("请求地址:")) return new Error(message);
  const extras = Array.isArray(extraLines) ? extraLines.filter(Boolean) : [];
  const detail = [promptRequestDebugInfo(config, url, endpoint), ...extras].join("\n");
  return new Error(`${message}\n\n本次${action}实际请求信息：\n${detail}`);
}

async function withTimeout(promise, timeoutMs, message) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function withProgressHeartbeat(promise, onTick, intervalMs = 5000) {
  let timer;
  const startedAt = Date.now();
  if (typeof onTick === "function") {
    timer = setInterval(() => onTick(Date.now() - startedAt), intervalMs);
  }
  try {
    return await promise;
  } finally {
    if (timer) clearInterval(timer);
  }
}

async function withTimeoutAndProgress(promise, timeoutMs, message, onTick, intervalMs = 5000) {
  return withTimeout(
    withProgressHeartbeat(promise, (elapsedMs) => onTick?.(elapsedMs, timeoutMs), intervalMs),
    timeoutMs,
    message
  );
}

function responseText(body) {
  if (!body) return "";
  if (typeof body.output_text === "string") return body.output_text;
  if (typeof body.text === "string") return body.text;
  if (typeof body.content === "string") return body.content;

  if (Array.isArray(body.output)) {
    const parts = [];
    for (const item of body.output) {
      if (typeof item.text === "string") parts.push(item.text);
      if (typeof item.output_text === "string") parts.push(item.output_text);
      if (typeof item.content === "string") parts.push(item.content);
      if (Array.isArray(item.content)) {
        for (const content of item.content) {
          if (typeof content.text === "string") parts.push(content.text);
          if (typeof content.output_text === "string") parts.push(content.output_text);
          if (typeof content.content === "string") parts.push(content.content);
          if (typeof content.value === "string") parts.push(content.value);
        }
      }
    }
    if (parts.length) return parts.join("\n");
  }

  if (Array.isArray(body.candidates)) {
    const parts = [];
    for (const candidate of body.candidates) {
      for (const part of candidate?.content?.parts || []) {
        if (typeof part.text === "string") parts.push(part.text);
      }
    }
    if (parts.length) return parts.join("\n");
  }

  if (Array.isArray(body.content)) {
    const parts = [];
    for (const content of body.content) {
      if (typeof content.text === "string") parts.push(content.text);
      if (typeof content.content === "string") parts.push(content.content);
      if (typeof content.value === "string") parts.push(content.value);
    }
    if (parts.length) return parts.join("\n");
  }

  const firstChoice = body.choices?.[0];
  return firstChoice?.message?.content || firstChoice?.text || "";
}

function includesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function inferModelCapabilities(model = "", provider = "") {
  const text = `${provider || ""} ${model || ""}`.toLowerCase();
  const isImageGeneration = includesAny(text, [/image/, /imagen/, /seedream/, /wanx/, /flux/, /stable/, /midjourney/]);
  const vision = !isImageGeneration && includesAny(text, [/vision/, /\bvl\b/, /qwen.*vl/, /gemini/, /gpt-4o/, /gpt-4\.1/, /claude-3/, /mimo.*omni/, /omni/]);
  const reasoning = includesAny(text, [/reasoner/, /thinking/, /\br1\b/, /deepseek-r/, /o1/, /o3/, /o4/, /gpt-5/, /pro/, /glm-4\.5/, /gemini-2\.5/, /claude-3-7/, /claude-4/]);
  const tools = !isImageGeneration && includesAny(text, [/gpt/, /openai/, /gemini/, /claude/, /qwen/, /doubao/, /glm/, /deepseek/, /mimo/]);
  const embedding = includesAny(text, [/embed/, /embedding/, /text-embedding/, /bge/, /voyage/]);
  const rerank = includesAny(text, [/rerank/, /ranker/]);
  const web = includesAny(text, [/search/, /sonar/, /web/]);
  return { vision, web, reasoning, tools, rerank, embedding };
}

function normalizeModelCapabilities(raw = {}, model = "", provider = "") {
  const inferred = inferModelCapabilities(model, provider);
  return {
    vision: Boolean(raw.vision ?? inferred.vision),
    web: Boolean(raw.web ?? inferred.web),
    reasoning: Boolean(raw.reasoning ?? inferred.reasoning),
    tools: Boolean(raw.tools ?? inferred.tools),
    rerank: Boolean(raw.rerank ?? inferred.rerank),
    embedding: Boolean(raw.embedding ?? inferred.embedding)
  };
}

function resolvedPromptApiOptions(config = {}) {
  const defaults = {
    arrayMessages: true,
    developerMessage: false,
    streamOptions: false,
    serviceTier: false,
    enableThinking: false,
    verbosity: false
  };
  const optionsMap = normalizePromptProviderApiOptionsMap(config.promptProviderApiOptions);
  return { ...defaults, ...(optionsMap[normalizePromptProvider(config.promptProvider)] || {}) };
}

function shouldSendChatThinkingOption(config = {}) {
  const model = String(config.promptModel || "").toLowerCase();
  return /qwen|qwq/i.test(model);
}

function promptEndpointPreview(config = {}) {
  const baseUrl = trimSlash(config.promptBaseUrl);
  const endpoint = config.promptEndpoint || "chat";
  if (endpoint === "chat") return `${baseUrl}/chat/completions`;
  if (endpoint === "responses") return `${baseUrl}/responses`;
  if (endpoint === "gemini") return `${baseUrl}/models/${config.promptModel || "{model}"}:generateContent`;
  if (endpoint === "anthropic") return `${baseUrl}/messages`;
  return `${baseUrl}/chat/completions 或 /responses`;
}

function isVolcenginePromptProvider(config = {}) {
  const provider = normalizePromptProvider(config.promptProvider);
  const baseUrl = String(config.promptBaseUrl || "").toLowerCase();
  return provider === "doubao" || /ark\.cn-[a-z0-9-]+\.volces\.com|volces\.com\/api\/v3/.test(baseUrl);
}

function isVolcenginePromptTextModel(model = "") {
  const text = String(model || "").trim().toLowerCase();
  if (!text) return false;
  if (/^ep-[a-z0-9-]+$/.test(text)) return true;
  if (/(seedream|seedance|hitem|hyper|3d|tts|audio|voice|speech|music|translation|translate|同声|语音|音色|录音)/i.test(text)) {
    return false;
  }
  return /(doubao|deepseek|qwen|glm|kimi|mimo|seed|r1|v3|v4|chat|vision|thinking|pro|lite)/i.test(text);
}

function volcengineModelListNote(rawCount = 0, filteredCount = 0) {
  return [
    `火山方舟 /models 返回的是可见的模型目录，不等于当前 API Key 已授权可调用的模型。本次已从 ${rawCount} 个返回项中过滤出 ${filteredCount} 个更适合作为提示词/识图模型的 ID。`,
    "如果你在控制台购买或创建的是“推理接入点 / 自定义推理接入点 / MLP / 低延时”等套餐，请直接把控制台的 ep-... 接入点 ID 手动添加为模型名；Base URL 仍使用 https://ark.cn-beijing.volces.com/api/v3。",
    "API Key 管理页勾选的模型显示名可能是 Doubao-Seed-2.0-lite 这种名称，实际调用通常使用小写 Model ID，例如 doubao-seed-2-0-lite-260215；以模型广场或代码示例里的 Model ID/Endpoint ID 为准。"
  ].join("\n");
}

function promptAutoEndpointCandidates(config = {}) {
  const provider = normalizePromptProvider(config.promptProvider);
  if (provider === "gemini" || config.promptEndpoint === "gemini") {
    return [["gemini", callGeminiApi]];
  }
  if (provider === "anthropic" || config.promptEndpoint === "anthropic") {
    return [["anthropic", callAnthropicApi]];
  }
  if (isVolcenginePromptProvider(config)) {
    return [
      ["chat", callChatApi],
      ["responses", callResponsesApi]
    ];
  }
  return [
    ["chat", callChatApi],
    ["responses", callResponsesApi]
  ];
}

function uniqueModelsForProvider(provider, currentModel = "") {
  const preset = normalizedPromptProviderPreset(provider);
  const models = [];
  if (currentModel) models.push(currentModel);
  if (preset.promptModel) models.push(preset.promptModel);
  if (Array.isArray(preset.models)) models.push(...preset.models);
  return Array.from(new Set(models.map((item) => String(item || "").trim()).filter(Boolean))).sort();
}

function imageDataUrlToPromptMedia(image) {
  const value = String(image || "").trim();
  const match = value.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (match) {
    return {
      mimeType: match[1],
      data: match[2]
    };
  }
  return {
    mimeType: "image/png",
    data: value
  };
}

function normalizePlatformName(platform) {
  const value = String(platform || "").toLowerCase();
  if (value === "temu") return "Temu";
  if (value === "amazon") return "Amazon";
  if (value === "shopee") return "Shopee";
  if (value === "etsy") return "Etsy";
  return platform || "Amazon";
}

function packageModeLabel(mode) {
  if (mode === "bundle") return "组合装";
  if (mode === "multipack") return "多 PCS 装";
  return "单品";
}

const REGION_LABELS = {
  US: "United States",
  CN: "China",
  EU: "European Union",
  JP: "Japan",
  BR: "Brazil",
  KR: "South Korea",
  THA: "Thailand",
  RU: "Russia"
};

const PALETTE_PRESETS = [
  {
    id: "kitchen-tool",
    pattern: /(peeler|slicer|knife|spatula|scraper|utensil|kitchen|vegetable|fruit|potato|carrot|厨房|削皮|刨丝|切菜|蔬菜|水果|厨具|厨房工具)/i,
    theme_name_zh: "厨房工具清爽食材色板",
    primary_color: "fresh produce green #16A34A",
    secondary_color: "carrot orange #F97316",
    accent_color: "warm wood amber #B7791F",
    neutral_color: "warm off-white #FFF7ED",
    background_color: "soft sage tint #ECFDF5",
    typography_color: "charcoal #1F2937",
    palette_reason_zh: "厨房工具更适合用蔬果绿和胡萝卜橙强化真实使用场景，同时用暖白和木色呼应厨台、木柄或食材。"
  },
  {
    id: "cleaning",
    pattern: /(clean|cleaning|laundry|washer|washing|detergent|tablet|spray|mop|brush|清洁|洗衣|洗涤|除垢|洗衣机|清洗片)/i,
    theme_name_zh: "清洁护理高洁净色板",
    primary_color: "clean aqua #0891B2",
    secondary_color: "lemon fresh yellow #FACC15",
    accent_color: "clear sky blue #38BDF8",
    neutral_color: "crisp white #F8FAFC",
    background_color: "pale aqua #ECFEFF",
    typography_color: "deep teal #164E63",
    palette_reason_zh: "清洁类产品需要传达洁净、清爽和可见效果，蓝绿色负责洁净感，柠檬黄负责高亮和行动提示。"
  },
  {
    id: "storage-home",
    pattern: /(organizer|storage|holder|rack|shelf|drawer|cabinet|bamboo|container|box|收纳|置物|架|抽屉|整理|盒|竹)/i,
    theme_name_zh: "家居收纳温和秩序色板",
    primary_color: "organized teal #0F766E",
    secondary_color: "natural bamboo gold #D97706",
    accent_color: "soft coral #FB7185",
    neutral_color: "warm light gray #F3F4F6",
    background_color: "soft mint #F0FDFA",
    typography_color: "graphite #374151",
    palette_reason_zh: "家居收纳需要秩序感和温度，青绿色适合表达整洁，竹金色或暖色适合连接家居材质。"
  },
  {
    id: "beauty",
    pattern: /(beauty|makeup|cosmetic|skin|hair|nail|jewelry|cream|serum|化妆|美妆|护肤|发饰|首饰|珠宝|香水)/i,
    theme_name_zh: "美妆精品柔和高级色板",
    primary_color: "rose mauve #BE5A83",
    secondary_color: "champagne gold #D6A756",
    accent_color: "deep berry #8A2846",
    neutral_color: "porcelain #FAF7F5",
    background_color: "soft blush #FFF1F2",
    typography_color: "espresso brown #3F2A2A",
    palette_reason_zh: "美妆和饰品更适合柔和肤感、玫瑰色和香槟金，用于营造精致但不过度促销的质感。"
  },
  {
    id: "electronics",
    pattern: /(charger|cable|adapter|phone|tablet|laptop|led|light|camera|speaker|earbud|电子|充电|数据线|手机|电脑|灯|相机|耳机)/i,
    theme_name_zh: "电子产品清晰科技色板",
    primary_color: "electric cyan #06B6D4",
    secondary_color: "signal lime #84CC16",
    accent_color: "clear blue #2563EB",
    neutral_color: "cool white #F8FAFC",
    background_color: "ice gray #EFF6FF",
    typography_color: "ink #111827",
    palette_reason_zh: "电子产品需要清晰、现代和功能感，青蓝负责科技感，青柠色负责功能亮点。"
  },
  {
    id: "outdoor",
    pattern: /(outdoor|camp|travel|sports|fitness|hiking|bike|water bottle|户外|露营|旅行|运动|健身|骑行|水壶)/i,
    theme_name_zh: "户外活力耐用品色板",
    primary_color: "trail green #15803D",
    secondary_color: "safety orange #EA580C",
    accent_color: "sky blue #0EA5E9",
    neutral_color: "stone gray #E5E7EB",
    background_color: "pale leaf #F0FDF4",
    typography_color: "deep forest #14532D",
    palette_reason_zh: "户外用品需要耐用和行动感，绿色建立户外语境，橙色提供强识别的功能高亮。"
  },
  {
    id: "pet",
    pattern: /(pet|dog|cat|leash|collar|toy|宠物|狗|猫|牵引|项圈|猫砂|宠物玩具)/i,
    theme_name_zh: "宠物亲和明快色板",
    primary_color: "friendly teal #14B8A6",
    secondary_color: "playful sunflower #FBBF24",
    accent_color: "soft coral #F97373",
    neutral_color: "warm cream #FFFBEB",
    background_color: "light mint #F0FDFA",
    typography_color: "soft black #1F2937",
    palette_reason_zh: "宠物用品需要亲和、轻松和高点击识别，青绿色和向日葵黄适合表达活力。"
  },
  {
    id: "default",
    pattern: /.*/i,
    theme_name_zh: "通用电商高识别色板",
    primary_color: "commerce teal #0D9488",
    secondary_color: "warm highlight amber #F59E0B",
    accent_color: "clear coral #F97316",
    neutral_color: "clean off-white #F8FAFC",
    background_color: "pale mint #F0FDFA",
    typography_color: "charcoal #1F2937",
    palette_reason_zh: "商品信息不足时使用高识别但不刺眼的电商色板，用青绿色建立可信感，用暖色提供购买和卖点聚焦。"
  }
];

const FONT_STYLE_PRESETS = {
  geometric: {
    name_zh: "几何无衬线",
    style_en: "geometric sans-serif",
    usage_en: "Use a clean geometric sans-serif with precise spacing, suitable for modern and technical products."
  },
  bold: {
    name_zh: "硬朗无衬线",
    style_en: "bold utility sans-serif",
    usage_en: "Use a sturdy bold sans-serif with strong readability, suitable for tools, outdoor, and functional products."
  },
  elegant: {
    name_zh: "优雅衬线",
    style_en: "elegant editorial serif",
    usage_en: "Use an elegant editorial serif or refined high-contrast type treatment, suitable for premium beauty, vintage, and giftable products."
  }
};

function regionLabel(region) {
  return REGION_LABELS[String(region || "").toUpperCase()] || region || "United States";
}

function isAutoValue(value) {
  return !value || String(value).trim().toLowerCase() === "auto";
}

function normalizeColorText(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "string") {
    const text = value.trim();
    return isAutoValue(text) ? fallback : text || fallback;
  }
  if (typeof value === "object") {
    const name = value.name || value.label || value.color || value.description || "";
    const hex = value.hex || value.value || value.code || "";
    const text = [name, hex].filter(Boolean).join(" ").trim();
    return isAutoValue(text) ? fallback : text || fallback;
  }
  const text = String(value).trim();
  return isAutoValue(text) ? fallback : text || fallback;
}

function normalizeHexColor(value) {
  const text = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(text) ? text.toUpperCase() : "";
}

function choosePalettePreset(text) {
  const source = String(text || "");
  return PALETTE_PRESETS.find((preset) => preset.pattern.test(source)) || PALETTE_PRESETS[PALETTE_PRESETS.length - 1];
}

function buildSmartPalette(payload, analysis = {}) {
  const brand = payload.brand || {};
  const platform = normalizePlatformName(brand.platform || payload.platform || "Amazon");
  const region = brand.region || payload.region || "US";
  const productText = [
    payload.productInfo,
    analysis.product_summary_zh,
    analysis.final_prompt_en,
    normalizeStringList(analysis.selling_points_zh).join(" ")
  ].filter(Boolean).join(" ");
  const preset = choosePalettePreset(productText);
  const explicitPrimary = !isAutoValue(brand.primaryColor) ? normalizeHexColor(brand.primaryColor) : "";

  return {
    source: explicitPrimary ? "custom-primary-plus-smart-secondary" : "smart-auto",
    theme_name_zh: explicitPrimary ? `自定义主色 + ${preset.theme_name_zh}` : preset.theme_name_zh,
    primary_color: explicitPrimary ? `custom brand primary ${explicitPrimary}` : preset.primary_color,
    secondary_color: preset.secondary_color,
    accent_color: preset.accent_color,
    neutral_color: preset.neutral_color,
    background_color: preset.background_color,
    typography_color: preset.typography_color,
    palette_reason_zh: `${preset.palette_reason_zh} 目标平台 ${platform}，目标地区 ${regionLabel(region)}。`,
    usage_en: "Preserve the real product colors. Apply the palette to background planes, graphic support shapes, short text emphasis, callout lines, and controlled props only when the image category allows them."
  };
}

function normalizeBrandPalette(payload, analysis = {}) {
  const fallback = buildSmartPalette(payload, analysis);
  const raw = analysis && typeof analysis.brand_palette === "object" ? analysis.brand_palette : {};
  return {
    source: raw.source || fallback.source,
    theme_name_zh: raw.theme_name_zh || raw.theme || raw.name || fallback.theme_name_zh,
    primary_color: normalizeColorText(raw.primary_color || raw.primary || raw.primaryColor, fallback.primary_color),
    secondary_color: normalizeColorText(raw.secondary_color || raw.secondary || raw.secondaryColor, fallback.secondary_color),
    accent_color: normalizeColorText(raw.accent_color || raw.accent || raw.accentColor, fallback.accent_color),
    neutral_color: normalizeColorText(raw.neutral_color || raw.neutral || raw.neutralColor, fallback.neutral_color),
    background_color: normalizeColorText(raw.background_color || raw.background || raw.backgroundColor, fallback.background_color),
    typography_color: normalizeColorText(raw.typography_color || raw.text_color || raw.textColor, fallback.typography_color),
    palette_reason_zh: raw.palette_reason_zh || raw.reason_zh || raw.reason || fallback.palette_reason_zh,
    usage_en: raw.usage_en || raw.usage || fallback.usage_en
  };
}

function inferFontDirection(payload, analysis = {}) {
  const brand = payload.brand || {};
  if (!isAutoValue(brand.fontStyle) && FONT_STYLE_PRESETS[brand.fontStyle]) {
    return {
      source: "custom",
      ...FONT_STYLE_PRESETS[brand.fontStyle]
    };
  }

  const text = [
    payload.productInfo,
    analysis.product_summary_zh,
    analysis.final_prompt_en
  ].filter(Boolean).join(" ");

  if (/(beauty|makeup|cosmetic|jewelry|perfume|gift|美妆|化妆|首饰|珠宝|香水|礼品)/i.test(text)) {
    return { source: "smart-auto", ...FONT_STYLE_PRESETS.elegant };
  }
  if (/(tool|peeler|slicer|knife|outdoor|sports|fitness|hardware|工具|削皮|刨丝|刀|户外|运动|五金)/i.test(text)) {
    return { source: "smart-auto", ...FONT_STYLE_PRESETS.bold };
  }
  return { source: "smart-auto", ...FONT_STYLE_PRESETS.geometric };
}

function normalizeFontDirection(payload, analysis = {}) {
  const fallback = inferFontDirection(payload, analysis);
  const raw = analysis && typeof analysis.brand_font_style === "object" ? analysis.brand_font_style : {};
  if (typeof analysis.brand_font_style === "string" && analysis.brand_font_style.trim()) {
    if (isAutoValue(analysis.brand_font_style)) return fallback;
    return {
      ...fallback,
      style_en: analysis.brand_font_style.trim(),
      usage_en: `Use ${analysis.brand_font_style.trim()} when visible text is allowed.`
    };
  }
  return {
    source: raw.source || fallback.source,
    name_zh: raw.name_zh || raw.name || fallback.name_zh,
    style_en: isAutoValue(raw.style_en || raw.style) ? fallback.style_en : raw.style_en || raw.style || fallback.style_en,
    usage_en: raw.usage_en || raw.usage || fallback.usage_en
  };
}

function buildRegionalUseContext(payload, analysis = {}) {
  const brand = payload.brand || {};
  const platform = normalizePlatformName(brand.platform || payload.platform || "Amazon");
  const region = brand.region || payload.region || "US";
  const text = [payload.productInfo, analysis.product_summary_zh, analysis.final_prompt_en].filter(Boolean).join(" ");
  const mechanism = analysis.product_mechanism || inferProductMechanism(text);
  const useRelationship = analysis.use_relationship || "";
  const defaultUse = {
    liner: "used as a fitted disposable liner inside the correct basket, tray, or pan",
    cover: "used to cover the matching target object with visible rim or edge contact",
    wrap: "used to cover, line, or wrap a target surface with visible edge contact",
    bag: "used to hold, sort, carry, or protect contents through the opening and capacity",
    organizer: "used to organize items inside drawers, cabinets, shelves, or work surfaces",
    container: "used to store, carry, pour, or display contents with visible opening and capacity",
    tray: "used as a surface or holder with visible rim, contents, or host-object relation",
    sheet: "used as a layer, cover, pad, mat, or active contact surface",
    textile: "used through fold, drape, wipe, cover, or contact with the target object",
    tablet: "used as a bare tablet with the correct machine, container, or cleaning target",
    pod: "used as a bare pod with the correct machine, container, or cleaning target",
    liquid: "used by applying, dispensing, or pouring onto the correct target object",
    tool: "used by an adult hand on the correct target object, with the working edge in contact",
    accessory: "used by fitting, installing, attaching, or covering the correct host object"
  }[mechanism] || "used in the most common retail context for this product category";

  return {
    target_region: regionLabel(region),
    marketplace: platform,
    common_product_name_en: payload.productInfo || analysis.product_summary_zh || "product",
    real_use_summary_en: useRelationship || defaultUse,
    typical_use_objects_en: analysis.unit_of_use || defaultUse,
    buyer_pain_points_zh: normalizeStringList(analysis.selling_points_zh).slice(0, 4),
    region_specific_notes_zh: `按 ${regionLabel(region)} 的主流电商买家理解真实用途；若只有产品名，则采用该品类最常见的零售用途，不编造特殊功能。`,
    confidence: mechanism === "unknown" ? "low" : "medium",
    assumptions_zh: payload.productInfo && payload.productInfo.length <= 24
      ? "用户输入较短，已按产品名称和品类常识推断用途；如有特殊型号、尺寸或适配对象，建议补充。"
      : ""
  };
}

function normalizeRegionalUseContext(payload, analysis = {}) {
  const fallback = buildRegionalUseContext(payload, analysis);
  const raw = analysis && typeof analysis.regional_use_context === "object" ? analysis.regional_use_context : {};
  return {
    target_region: raw.target_region || raw.region || fallback.target_region,
    marketplace: raw.marketplace || raw.platform || fallback.marketplace,
    common_product_name_zh: raw.common_product_name_zh || raw.common_name_zh || "",
    common_product_name_en: raw.common_product_name_en || raw.common_name || fallback.common_product_name_en,
    real_use_summary_zh: raw.real_use_summary_zh || raw.real_use_zh || "",
    real_use_summary_en: raw.real_use_summary_en || raw.real_use || fallback.real_use_summary_en,
    typical_use_objects_zh: raw.typical_use_objects_zh || raw.typical_objects_zh || "",
    typical_use_objects_en: raw.typical_use_objects_en || raw.typical_use_objects || fallback.typical_use_objects_en,
    buyer_pain_points_zh: normalizeStringList(raw.buyer_pain_points_zh || raw.buyer_pain_points || fallback.buyer_pain_points_zh),
    region_specific_notes_zh: raw.region_specific_notes_zh || raw.notes_zh || fallback.region_specific_notes_zh,
    confidence: raw.confidence || fallback.confidence,
    assumptions_zh: raw.assumptions_zh || fallback.assumptions_zh
  };
}

function normalizeAnalysisResult(payload, analysis) {
  const next = { ...analysis };
  next.product_summary_zh = String(next.product_summary_zh || next.product_summary || next.summary_zh || "").trim();
  next.selling_points_zh = normalizeStringList(next.selling_points_zh || next.selling_points || next.sellingPointsZh);
  next.key_action_frames = normalizeStringList(next.key_action_frames);
  next.detail_focus_areas = normalizeStringList(next.detail_focus_areas);
  next.detail_focus_areas_zh = normalizeStringList(next.detail_focus_areas_zh || next.detailFocusAreasZh);
  next.misjudgment_risks = normalizeStringList(next.misjudgment_risks);
  next.misjudgment_risks_zh = normalizeStringList(next.misjudgment_risks_zh || next.misjudgmentRisksZh);
  next.part_function_map = normalizeStringList(next.part_function_map || next.partFunctionMap);
  next.part_function_map_zh = normalizeStringList(next.part_function_map_zh || next.partFunctionMapZh);
  next.forbidden_use_errors = normalizeStringList(next.forbidden_use_errors || next.forbiddenUseErrors);
  next.forbidden_use_errors_zh = normalizeStringList(next.forbidden_use_errors_zh || next.forbiddenUseErrorsZh);
  next.correct_use_method = String(next.correct_use_method || next.correctUseMethod || "").trim();
  next.correct_use_method_zh = String(next.correct_use_method_zh || next.correctUseMethodZh || "").trim();
  const rawInteraction = next.interaction_contract && typeof next.interaction_contract === "object" ? next.interaction_contract : {};
  next.interaction_contract = {
    grip_area: String(rawInteraction.grip_area || rawInteraction.gripArea || "").trim(),
    working_area: String(rawInteraction.working_area || rawInteraction.workingArea || "").trim(),
    target_object: String(rawInteraction.target_object || rawInteraction.targetObject || "").trim(),
    contact_rule: String(rawInteraction.contact_rule || rawInteraction.contactRule || "").trim(),
    product_state_after_use: String(rawInteraction.product_state_after_use || rawInteraction.productStateAfterUse || "").trim(),
    target_state_after_use: String(rawInteraction.target_state_after_use || rawInteraction.targetStateAfterUse || "").trim(),
    forbidden_scene_errors: normalizeStringList(rawInteraction.forbidden_scene_errors || rawInteraction.forbiddenSceneErrors)
  };
  next.warnings = normalizeStringList(next.warnings);
  next.product_mechanism = next.product_mechanism || inferProductMechanism(`${payload.productInfo || ""} ${next.final_prompt_en || ""}`);
  next.product_package_mode = next.product_package_mode || payload.productPackageMode || "single";
  next.brand_palette = normalizeBrandPalette(payload, next);
  next.brand_font_style = normalizeFontDirection(payload, next);
  next.regional_use_context = normalizeRegionalUseContext(payload, next);
  if (!next.detail_focus_areas_zh.length) {
    next.detail_focus_areas_zh = chineseFallbackList(next.detail_focus_areas, "需要保留的细节");
  }
  if (!next.misjudgment_risks_zh.length) {
    next.misjudgment_risks_zh = chineseFallbackList(next.misjudgment_risks, "容易误判点");
  }
  if (!next.part_function_map_zh.length) {
    next.part_function_map_zh = chineseFallbackList(next.part_function_map, "部件功能");
  }
  if (!next.forbidden_use_errors_zh.length) {
    next.forbidden_use_errors_zh = chineseFallbackList(next.forbidden_use_errors, "禁止错误用法");
  }
  if (!next.correct_use_method_zh && next.correct_use_method) {
    next.correct_use_method_zh = containsChineseText(next.correct_use_method)
      ? next.correct_use_method
      : "";
  }
  if (!next.regional_use_context.real_use_summary_zh && next.regional_use_context.real_use_summary_en) {
    next.regional_use_context.real_use_summary_zh = containsChineseText(next.regional_use_context.real_use_summary_en)
      ? next.regional_use_context.real_use_summary_en
      : "";
  }
  if (!next.regional_use_context.typical_use_objects_zh && next.regional_use_context.typical_use_objects_en) {
    next.regional_use_context.typical_use_objects_zh = containsChineseText(next.regional_use_context.typical_use_objects_en)
      ? next.regional_use_context.typical_use_objects_en
      : "";
  }
  if (!next.regional_use_context.common_product_name_zh && next.regional_use_context.common_product_name_en) {
    next.regional_use_context.common_product_name_zh = containsChineseText(next.regional_use_context.common_product_name_en)
      ? next.regional_use_context.common_product_name_en
      : "";
  }
  return applyProductMechanismProfile(payload, next);
}

function extractJson(text) {
  if (!text) return null;
  const cleaned = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function buildAnalysisRequest(payload) {
  const brand = payload.brand || {};
  const platform = normalizePlatformName(brand.platform || payload.platform || "Amazon");
  const kindText = (payload.imageKinds || [])
    .map((item) => `${item.kind} x${item.count}`)
    .join(", ") || "未选择";
  const packageMode = payload.productPackageMode || "single";
  const packageInputs = payload.packageInputs && typeof payload.packageInputs === "object" ? payload.packageInputs : {};

  return [
    `商品信息: ${payload.productInfo || "未填写"}`,
    `产品形态: ${packageModeLabel(packageMode)}`,
    `用户填写的购买单位: ${packageInputs.unitOfSale || "未填写"}`,
    `组合装组件清单: ${packageMode === "bundle" ? (packageInputs.bundleComponents || "未填写") : "不适用"}`,
    `组合装差异/配件关系: ${packageMode === "bundle" ? (packageInputs.componentDifferences || "未填写") : "不适用"}`,
    `多PCS数量: ${packageMode === "multipack" ? (packageInputs.pcsCount || "未填写") : "不适用"}`,
    `多PCS包装/排列说明: ${packageMode === "multipack" ? (packageInputs.packArrangement || "未填写") : "不适用"}`,
    `用户补充的正确使用/材质结构: ${packageInputs.usageNotes || "未填写"}`,
    `图片类型: ${kindText}`,
    `销售国家/地区: ${brand.region || payload.region || "US"}`,
    `生成语言: ${brand.language || payload.language || "English"}`,
    `发布平台: ${platform}`,
    `品牌主色: ${brand.primaryColor || "auto"}`,
    `字体风格: ${brand.fontStyle || "auto"}`,
    `自定义视觉要求: ${brand.customStyle || "无"}`,
    `画幅比例: ${payload.ratio || "1:1"}`,
    `分辨率: ${payload.resolution || "1K"}`,
    "如果品牌主色或字体风格是 auto，必须真的根据产品品类、真实用途、目标地区、发布平台和商品材质推导主色、副色、强调色、中性色、背景色和字体策略，不要输出 auto 占位。",
    "如果用户只填写产品名称，必须把该名称当作待识别商品，结合目标地区常见零售用途推断真实使用对象、使用动作、购买单位和不可误判点；不确定时在 warnings 和 regional_use_context.assumptions_zh 说明假设。",
    "上传图片固定为真实产品图，只用于识别并保持产品本体，不作为外部模板案例。",
    "只输出可复用的商品事实、结构关系、正确使用方式和基础视觉方向。商品身份必须以上传产品图和用户商品信息为准。",
    "如果平台是 Temu，请将卖点表达改成更安全的用户收益方向，避免使用高风险合规词，不要直接写违规词，不要直接把材质名当成画面文案。",
    "卖点图方向允许包含材质质感、结构优势、功能步骤、痛点解决、套装价值和数量价值，但每张图只能表达一个主题，不能混成说明书。",
    "基础提示词只允许写产品身份事实：品类、外形、颜色、材质、结构、数量/套装信息、适用平台和语言。不要写构图、背景、灯光、阴影、排版、镜头、画幅比例、分辨率、文字样式、极简风格或白底要求。",
    "final_prompt_en 必须把“可见产品身份”和“用途/使用关系”分开：产品身份只写外观、部件、颜色、材质、数量、结构；用途、适配对象、锅具/食物/家具/电器等目标物不要混入产品身份句子，放到 use_relationship、correct_use_method 和 part_function_map 中。",
    "必须先做产品功能机制核验：对每个可见工作部件分别判断用途、目标物、接触位置、手持方向和不可混用的错误用法。多功能工具尤其要区分不同刀口/齿/孔/开口/按钮的真实功能，不能把一个部件的用途套到另一个部件上。",
    "必须输出 interaction_contract，用短字段锁定使用画面：谁握哪里、哪个工作部件接触哪个目标物、接触方式、使用后产品状态、使用后目标物状态、禁止的画面错误。这个字段用于防止作图模型把产品插入目标物、折断、融合、反向使用或把辅助部件当主功能。",
    "如果是削皮器、刨丝器、梳齿刀、锯齿工具等厨房工具，必须明确：削皮动作使用真实削皮刀口贴住果蔬表皮；梳齿/锯齿/细齿通常用于刨丝、切丝、划丝或辅助处理，不能默认拿来削皮，除非产品事实明确说明。",
    "若产品形态为组合装，必须把不同组件/规格/配件作为购买单位理解，输出每件差异和是否需要全部出镜；若为多 PCS 装，必须把用户填写的 pcs 数量、包装、整包价值感、可数排列或密集堆叠作为重要视觉方向；若为单品，默认以单个产品和真实使用关系为主。",
    "判断产品复杂度：如果有接口、按钮、孔位、螺丝、齿、刀片、透明结构、包装文字、多零件或精细图案，应在 misjudgment_risks 和 detail_focus_areas 中明确提醒需要保真，避免重新设计产品细节。",
    "如果上传图类似带木柄、金属头、铆钉、开槽、梳齿/锯齿/刮齿的厨房手工具，必须把木柄形状、木纹、铆钉数量和位置、金属头轮廓、长开槽、圆铆钉、梳齿数量感、侧边缺口/挂钩缺口全部列入 detail_focus_areas 和 misjudgment_risks；不得把它误判成普通削皮刀或只写成笼统 kitchen tool。",
    "不要在基础提示词里把多个图片类型揉成一个画面，不要要求拼图，不要要求九宫格，不要要求多面板。",
    "用户可见的中文复核内容必须短，避免长篇文章：product_summary_zh 不超过 120 字；correct_use_method_zh 不超过 100 字；part_function_map_zh 每条不超过 36 字；detail_focus_areas_zh 每条不超过 24 字。"
  ].join("\n");
}

function titleCharLength(value) {
  return Array.from(String(value || "")).length;
}

function titleLimitForPlatform(platform) {
  return isTemuPlatform(platform) ? 250 : 200;
}

function titleTargetRangeForPlatform(platform) {
  return isTemuPlatform(platform)
    ? { min: 170, max: 250, target: "180-240" }
    : { min: 120, max: 200, target: "140-190" };
}

function hasChineseText(value) {
  return /[\u4e00-\u9fff]/.test(String(value || ""));
}

function hasLatinText(value) {
  return /[A-Za-z]/.test(String(value || ""));
}

function splitTitlePair(value) {
  const text = String(value || "").trim();
  if (!text) return { title_zh: "", title_en: "" };

  const lines = text.split(/\r?\n+/).map((line) => line.trim()).filter(Boolean);
  if (lines.length >= 2) {
    const chineseLine = lines.find((line) => hasChineseText(line)) || lines[0];
    const englishLine = lines.find((line) => hasLatinText(line) && line !== chineseLine) || lines[1];
    return { title_zh: chineseLine, title_en: englishLine };
  }

  const slashParts = text.split(/\s+\/\s+/).map((part) => part.trim()).filter(Boolean);
  if (slashParts.length >= 2) {
    const chinesePart = slashParts.find((part) => hasChineseText(part)) || slashParts[0];
    const englishPart = slashParts.find((part) => hasLatinText(part) && part !== chinesePart) || slashParts[1];
    return { title_zh: chinesePart, title_en: englishPart };
  }

  for (const separator of [" ｜ ", " | ", " - ", " — ", "\t"]) {
    const parts = text.split(separator).map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const chinesePart = parts.find((part) => hasChineseText(part)) || parts[0];
      const englishPart = parts.find((part) => hasLatinText(part) && part !== chinesePart) || parts[1];
      return { title_zh: chinesePart, title_en: englishPart };
    }
  }

  return hasChineseText(text) ? { title_zh: text, title_en: "" } : { title_zh: "", title_en: text };
}

const TITLE_CONTEXT_MISMATCH_PATTERNS = [
  ["microwave", /\bmicrowave\b/i],
  ["reheating leftovers", /\breheat(?:ing)?\b|\bleftovers?\b/i],
  ["food cover", /\bfood\s+cover\b|\bdish\s+cover\b|\bplate\s+cover\b/i],
  ["餐盘/碗盘加热", /餐盘|碗盘|加热|复热|剩菜|微波炉/]
];

const TITLE_BANNED_PATTERNS = [
  ["促销类词汇", /\b(?:promotion|promo|sale|discount|deal|offer|coupon|hot sale|best seller|bestseller|free shipping|limited time|must-have|essential|lowest price|cheap|best price)\b/i],
  ["subjective claim", /\b(?:best|perfect|no\.?\s*1|number\s*1|top\s*rated|ultimate)\b/i],
  ["waterproof", /water\s*proof/i],
  ["oilproof", /oil\s*proof/i],
  ["fireproof", /fire\s*proof/i],
  ["protection", /\bprotection\b/i],
  ["safe/safety", /\bsafe(?:ty)?\b/i],
  ["high temperature", /high[-\s]?temp(?:erature)?|high[-\s]?temperature|heat[-\s]?resistan/i],
  ["low temperature", /low[-\s]?temp(?:erature)?|low[-\s]?temperature|below[-\s]?zero/i],
  ["certification", /certif(?:ied|ication)|approved/i],
  ["eco-friendly", /eco[-\s]?friendly|environmentally[-\s]?friendly|non[-\s]?toxic/i],
  ["medical/treatment", /\b(?:medical|treatment|therapy|therapeutic|health)\b/i],
  ["baby/minors", /\b(?:baby|infant|toddler|minor|kids?|children)\b/i],
  ["mother-baby", /mother[-\s]?baby|maternity/i],
  ["best choice", /best choice/i],
  ["assistant/help", /\b(?:assistant|help(?:er|ers|ing|ed)?)\b/i],
  ["free from", /free\s+from/i],
  ["BPA", /\bBPA\b/i],
  ["防水", /防水/],
  ["防油", /防油/],
  ["防火", /防火/],
  ["防护", /防护/],
  ["耐高温/高温", /耐高温|高温/],
  ["低温", /低温/],
  ["认证", /认证/],
  ["安全", /安全/],
  ["环保", /环保/],
  ["医疗/治疗", /医疗|治疗/],
  ["婴幼儿/未成年人/母婴", /婴幼儿|未成年人|母婴/],
  ["最佳选择", /最佳选择/],
  ["助手/帮助", /助手|帮助/],
  ["无XX成分", /无[^，,。.!?；;]{0,12}成分/]
];

function findTitleBannedTerms(value) {
  const text = String(value || "");
  const hits = [];
  for (const [label, pattern] of TITLE_BANNED_PATTERNS) {
    if (pattern.test(text)) hits.push(label);
  }
  return Array.from(new Set(hits));
}

function seedEvidenceText(seedInfo = {}) {
  return [
    seedInfo.product_identity_zh,
    seedInfo.product_identity_en,
    seedInfo.category_zh,
    seedInfo.category_en,
    ...(seedInfo.visual_evidence || []),
    ...(seedInfo.confirmed_uses || []),
    ...(seedInfo.compatible_objects || []),
    ...(seedInfo.core_attributes || [])
  ].filter(Boolean).join(" ");
}

function isMixerSplatterGuardEvidence(seedInfo = {}) {
  const text = seedEvidenceText(seedInfo);
  return /打蛋|搅拌|手持搅拌器|mixer|mixing|beater|whisk|batter|egg/i.test(text);
}

function findTitleContextMismatches(value, seedInfo = {}) {
  const text = String(value || "");
  const forbidden = [
    ...(isMixerSplatterGuardEvidence(seedInfo) ? TITLE_CONTEXT_MISMATCH_PATTERNS : []),
    ...normalizeStringList(seedInfo.forbidden_title_concepts || seedInfo.forbiddenTitleConcepts).map((term) => [term, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")])
  ];
  const hits = [];
  for (const [label, pattern] of forbidden) {
    if (pattern.test(text)) hits.push(label);
  }
  return Array.from(new Set(hits));
}

function normalizeTrendRegionSignal(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    market: String(source.market || source.region_label || source.regionLabel || source.geo || "").trim(),
    geo: String(source.geo || source.region || "").trim(),
    language: String(source.language || source.hl || "").trim(),
    search_gl: String(source.search_gl || source.searchGl || source.gl || "").trim(),
    timeframe: String(source.timeframe || "today 12-m").trim(),
    source: normalizeStringList(source.source),
    source_urls: normalizeStringList(source.source_urls || source.sourceUrls || source.urls).slice(0, 10),
    seed_queries: normalizeStringList(source.seed_queries || source.seedQueries).slice(0, 8),
    autocomplete_suggestions: normalizeStringList(source.autocomplete_suggestions || source.autocompleteSuggestions).slice(0, 16),
    related_queries: normalizeStringList(source.related_queries || source.relatedQueries).slice(0, 16),
    rising_queries: normalizeStringList(source.rising_queries || source.risingQueries).slice(0, 16)
  };
}

function normalizeTitleTrendSignals(value) {
  const source = value && typeof value === "object" ? value : {};
  const regions = Array.isArray(source.regions)
    ? source.regions.map(normalizeTrendRegionSignal).filter((region) => region.market || region.geo)
    : [];
  const flattened = regions.reduce((acc, region) => {
    acc.source.push(...region.source);
    acc.source_urls.push(...region.source_urls);
    acc.seed_queries.push(...region.seed_queries);
    acc.autocomplete_suggestions.push(...region.autocomplete_suggestions);
    acc.related_queries.push(...region.related_queries);
    acc.rising_queries.push(...region.rising_queries);
    return acc;
  }, {
    source: [],
    source_urls: [],
    seed_queries: [],
    autocomplete_suggestions: [],
    related_queries: [],
    rising_queries: []
  });

  return {
    source: uniqueStrings([...normalizeStringList(source.source), ...flattened.source], 10),
    source_urls: uniqueStrings([...normalizeStringList(source.source_urls || source.sourceUrls || source.urls), ...flattened.source_urls], 20),
    geo: String(source.geo || source.region || regions.map((region) => region.geo).filter(Boolean).join("/") || "").trim(),
    language: String(source.language || source.hl || regions.map((region) => region.language).filter(Boolean).join("/") || "").trim(),
    timeframe: String(source.timeframe || "today 12-m").trim(),
    seed_queries: uniqueStrings([
      ...normalizeStringList(source.seed_queries || source.seedQueries),
      ...flattened.seed_queries
    ], 12),
    autocomplete_suggestions: uniqueStrings([
      ...normalizeStringList(source.autocomplete_suggestions || source.autocompleteSuggestions),
      ...flattened.autocomplete_suggestions
    ], 24),
    related_queries: uniqueStrings([
      ...normalizeStringList(source.related_queries || source.relatedQueries),
      ...flattened.related_queries
    ], 24),
    rising_queries: uniqueStrings([
      ...normalizeStringList(source.rising_queries || source.risingQueries),
      ...flattened.rising_queries
    ], 24),
    regions
  };
}

function uniqueStrings(values, limit = 12) {
  const seen = new Set();
  const result = [];
  for (const value of values || []) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length >= limit) break;
  }
  return result;
}

function containsChineseText(value) {
  return /[\u4e00-\u9fff]/.test(String(value || ""));
}

function chineseFallbackList(values, prefix, limit = 8) {
  return normalizeStringList(values)
    .filter((item) => containsChineseText(item))
    .slice(0, limit)
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function uniqueMergedStringList(...lists) {
  const seen = new Set();
  const result = [];
  for (const list of lists || []) {
    for (const item of normalizeStringList(list)) {
      const text = String(item || "").replace(/\s+/g, " ").trim();
      if (!text) continue;
      const key = text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(text);
    }
  }
  return result;
}

function mergeTextField(current, fallback) {
  const value = String(current || "").trim();
  return value || String(fallback || "").trim();
}

function operatorMechanismSourceText(payload = {}) {
  const packageInputs = payload.packageInputs && typeof payload.packageInputs === "object" ? payload.packageInputs : {};
  return [
    payload.productInfo,
    payload.finalPrompt,
    payload.productName,
    packageInputs.unitOfSale,
    packageInputs.bundleComponents,
    packageInputs.componentDifferences,
    packageInputs.pcsCount,
    packageInputs.packArrangement,
    packageInputs.usageNotes
  ].filter(Boolean).join(" ").toLowerCase();
}

function analysisMechanismSourceText(analysis = {}) {
  return [
    analysis.product_summary_zh,
    analysis.final_prompt_en,
    analysis.unit_of_sale,
    analysis.unit_of_use,
    analysis.use_relationship,
    analysis.correct_use_method,
    normalizeStringList(analysis.detail_focus_areas).join(" "),
    normalizeStringList(analysis.misjudgment_risks).join(" "),
    normalizeStringList(analysis.part_function_map).join(" "),
    normalizeStringList(analysis.forbidden_use_errors).join(" ")
  ].filter(Boolean).join(" ").toLowerCase();
}

function mechanismSourceText(payload = {}, analysis = {}) {
  return [
    operatorMechanismSourceText(payload),
    analysisMechanismSourceText(analysis)
  ].filter(Boolean).join(" ").toLowerCase();
}

function hasMeaningfulOperatorFacts(text = "") {
  const cleaned = String(text || "")
    .replace(/\b(?:single|one|product|unit|unit of sale|auto|unknown)\b/gi, " ")
    .replace(/[，。；：、,.;&=\/\s]+/g, " ")
    .trim();
  return cleaned.length >= 24;
}

function mechanismProfileSourceText(payload = {}, analysis = {}) {
  const operatorSource = operatorMechanismSourceText(payload);
  if (hasMeaningfulOperatorFacts(operatorSource)) return operatorSource;
  return mechanismSourceText(payload, analysis);
}

function bagEvidencePattern() {
  return /(?:\b(?:moving|storage|packing|laundry|duffel|tote|travel|zipper(?:ed)?|soft)\s+bags?\b|\bbags?\s+(?:with|for|to|that|and)\b|\b(?:zipper|zipped|webbing|sewn)\s+(?:lid|closure|handles?|straps?)\b|\u642c\u5bb6\u888b|\u6536\u7eb3\u888b|\u50a8\u7269\u888b|\u6536\u7eb3\u5305|\u62c9\u94fe\u888b|\u7ec7\u5e26\u63d0\u624b|\u884c\u674e\u888b|\u6574\u7406\u888b)/i;
}

function mechanismEvidencePattern(mechanism = "") {
  const patterns = {
    bag: bagEvidencePattern(),
    cover: /\b(?:cover|lid|cap|guard|splash|splatter|bowl|plate|container)\b|[\u76d6\u7f69]|\u9632\u6e85|\u7897\u53e3|\u6405\u62cc/i,
    elastic_cover: /\b(?:elastic|stretch|food\s+cover|bowl\s+cover|plate\s+cover)\b|\u5f39\u6027|\u677e\u7d27|\u4fdd\u9c9c|\u98df\u54c1\u7f69|\u7897\u7f69|\u76d8\u7f69/i,
    rack: /\b(?:rack|holder|divider|slots?|shelf)\b|\u67b6|\u7f6e\u7269|\u6536\u7eb3|\u9694\u677f|\u7ad6\u69fd|\u5206\u9694/i,
    organizer: /\b(?:organizer|storage|holder|shelf|drawer|cabinet|basket|rack)\b|\u6536\u7eb3|\u7f6e\u7269|\u6574\u7406|\u62bd\u5c49|\u67b6|\u76d2/i,
    tool: /\b(?:tool|peeler|cutter|brush|scraper|knife|spatula|scissors|handle|blade)\b|\u5de5\u5177|\u5200|\u5237|\u94f2|\u522e|\u526a|\u624b\u67c4|\u6728\u67c4/i,
    bottle_stopper: /\b(?:wine\s+bottle\s+stopper|bottle\s+stopper|wine\s+stopper|sealing\s+plug|bottle\s+mouth)\b|\u9152\u74f6\u585e|\u7ea2\u9152\u585e|\u5c01\u53e3\u585e|\u74f6\u585e|\u74f6\u53e3/i,
    electronics: /\b(?:phone|charger|cable|earbuds|headphones|speaker|lamp|led|camera|keyboard|mouse|adapter|usb|connector)\b|\u624b\u673a|\u5145\u7535|\u6570\u636e\u7ebf|\u8033\u673a|\u97f3\u7bb1|\u706f|\u76f8\u673a|\u952e\u76d8|\u9f20\u6807|\u63a5\u53e3/i,
    apparel: /\b(?:shirt|dress|pants|leggings|socks|shoes|boots|slipper|jacket|coat|underwear|bra)\b|\u8863\u670d|\u88d9|\u88e4|\u889c|\u978b|\u5916\u5957|\u5185\u8863/i,
    container: /\b(?:container|box|bin|jar|bottle|cup|bowl|tray)\b|\u5bb9\u5668|\u76d2|\u7bb1|\u74f6|\u676f|\u7897|\u6258\u76d8/i
  };
  return patterns[String(mechanism || "").trim()] || null;
}

function mechanismSupportedByOperatorFacts(mechanism = "", operatorSource = "") {
  if (!hasMeaningfulOperatorFacts(operatorSource)) return true;
  const pattern = mechanismEvidencePattern(mechanism);
  if (!pattern) return true;
  return pattern.test(operatorSource);
}

function promptForeignMechanicRules() {
  return [
    {
      name: "storage/moving bag",
      evidence: bagEvidencePattern(),
      conflict: /\b(?:closet storage|wardrobe storage|storage bag|moving bag|packing bag|zipper lid|zippered lid|zipper closure|sewn handles?|webbing handles?|soft goods?|moving boxes?)\b|\u6536\u7eb3\u888b|\u50a8\u7269\u888b|\u62c9\u94fe|\u8863\u67dc\u6536\u7eb3|\u8f6f\u7269\u6536\u7eb3/i
    }
  ];
}

function unsupportedForeignMechanicConflict(prompt = "", factSource = "") {
  const text = String(prompt || "");
  if (!text.trim()) return null;
  const facts = String(factSource || "");
  for (const rule of promptForeignMechanicRules()) {
    if (rule.conflict.test(text) && !rule.evidence.test(facts)) return rule.name;
  }
  return null;
}

function filterUnsupportedForeignMechanics(items, factSource = "") {
  return normalizeStringList(items).filter((item) => !unsupportedForeignMechanicConflict(item, factSource));
}

function productMechanismProfile(payload = {}, analysis = {}) {
  const source = mechanismProfileSourceText(payload, analysis);
  const profile = {
    product_mechanism: "",
    product_package_mode: "",
    unit_of_sale: "",
    unit_of_use: "",
    use_relationship: "",
    correct_use_method: "",
    key_action_frames: [],
    detail_focus_areas: [],
    detail_focus_areas_zh: [],
    misjudgment_risks: [],
    misjudgment_risks_zh: [],
    part_function_map: [],
    part_function_map_zh: [],
    forbidden_use_errors: [],
    forbidden_use_errors_zh: []
  };

  const add = (key, items) => {
    profile[key] = uniqueMergedStringList(profile[key], Array.isArray(items) ? items : [items]);
  };
  const setMissing = (key, value) => {
    if (!profile[key]) profile[key] = value;
  };

  const hasElasticFoodCover = /(?:elastic|stretch|shower\s*cap|disposable\s+food\s+cover|bowl\s+cover|plate\s+cover|food\s+storage\s+cover|food\s+cover|plastic\s+food\s+cover|200\s*pcs|36\s*cm|14\.17\s*in|保鲜罩|保鲜膜|食品罩|碗罩|盘罩|弹性|松紧|一次性)/i.test(source)
    && /(?:cover|cap|bowl|plate|container|elastic|stretch|保鲜|罩|碗|盘|松紧)/i.test(source);
  const hasPeelerTool = /(?:peeler|peeling|julienne|serrated|comb[-\s]*like|comb\s+teeth|bottle\s+opener|open\s+slot|wood\s+handle|rivet|削皮|刨皮|刨丝|削皮刀|刨皮刀|木柄|铆钉|开瓶|梳齿|齿刃|锯齿)/i.test(source);
  const hasPressWineStopper = /(?:wine\s+bottle\s+stopper|bottle\s+stopper|wine\s+stopper|press[-\s]*type|press\s+to\s+close|red\s+(?:cylindrical\s+)?plug|sealing\s+plug|stopper\s+lever|bottle\s+mouth|酒瓶塞|红酒塞|封口塞|瓶塞|按压式|按压手柄|红色塞|红色部分|瓶口)/i.test(source);
  const hasMovingBag = bagEvidencePattern().test(source);
  const hasRackHolder = /(?:lid\s+rack|pot\s+lid\s+rack|plate\s+rack|cutting\s+board\s+rack|organizer\s+rack|vertical\s+divider|slots?|锅盖架|盖架|盘架|砧板架|置物架|收纳架|隔板|竖槽|分隔柱)/i.test(source);

  if (hasElasticFoodCover) {
    setMissing("product_mechanism", "elastic_cover");
    setMissing("product_package_mode", "multipack");
    setMissing("unit_of_sale", "a multipack of disposable elastic transparent food covers with gathered elastic rims");
    setMissing("unit_of_use", "one elastic food cover stretched over the rim of a bowl, plate, or food container");
    setMissing("use_relationship", "the elastic rim stretches around and grips the outside rim of a bowl, plate, or container; the transparent crinkled film spans over the food without acting like a roll of cling film");
    setMissing("correct_use_method", "hold the elastic rim at the edge with adult fingers, stretch it outward, then release it around the container rim so the cover sits taut over the opening");
    add("key_action_frames", [
      "adult hands stretch the elastic rim around a bowl or plate edge",
      "one cover sits taut over a container with food visible through transparent crinkled film",
      "opened multipack shows many nested elastic covers as quantity context"
    ]);
    add("detail_focus_areas", [
      "transparent crinkled plastic cover surface",
      "gathered elastic rim around the full edge",
      "nested multipack quantity impression",
      "round expanded cap-like cover shape",
      "hands gripping only the elastic edge"
    ]);
    add("detail_focus_areas_zh", ["透明褶皱薄膜", "一圈松紧弹力边", "多片叠放数量感", "罩状展开形态", "手只捏住边缘松紧圈"]);
    add("misjudgment_risks", [
      "do not treat this product as a roll of cling film",
      "do not show a flat sheet being pulled from a roll",
      "do not make hands pinch the middle film as a solid handle",
      "do not remove the gathered elastic rim",
      "do not show the cover floating without gripping a container rim"
    ]);
    add("misjudgment_risks_zh", ["不要误判成卷装保鲜膜", "不要画成从纸筒拉出的平膜", "不要让手抓薄膜中间当把手", "不要丢失一圈松紧边", "不要让罩子悬空不包住容器边缘"]);
    add("part_function_map", [
      "elastic rim = grips the outside rim of the bowl, plate, or container",
      "transparent crinkled film = spans over food as a cover",
      "multipack stack = purchase quantity context, not one thick solid sheet",
      "adult fingers = hold and stretch only the elastic edge"
    ]);
    add("part_function_map_zh", ["松紧边=套住碗/盘/容器外沿", "透明褶皱薄膜=覆盖食物", "多片叠放=数量感不是一整块厚膜", "手指=只拉伸边缘松紧圈"]);
    add("forbidden_use_errors", [
      "do not show a cardboard roll, cutter box, or flat cling-film strip unless visible in the reference",
      "do not seal directly to food without a container rim",
      "do not make the elastic rim disappear",
      "do not imply the plate, bowl, food, or hands are included in the sale"
    ]);
    add("forbidden_use_errors_zh", ["不要添加纸筒/切割盒/卷膜条", "不要没有容器边缘就直接贴在食物上", "不要让松紧圈消失", "不要暗示盘子/碗/食物/手是售卖内容"]);
  }

  if (hasPeelerTool) {
    setMissing("product_mechanism", "tool");
    setMissing("unit_of_sale", "one multifunction kitchen hand tool with a wood handle and stainless metal head");
    setMissing("unit_of_use", "one tool held by an adult hand gripping the wood handle");
    setMissing("use_relationship", "the adult hand grips only the wood handle; only the appropriate stainless working edge or comb teeth may touch produce or a bottle cap depending on the action; rivets, long slot, side notch, and handle are structural or auxiliary parts");
    setMissing("correct_use_method", "orient the stainless head toward the target, keep the wood handle in the palm, and use the correct metal working edge for peeling/scraping/julienne or the side notch only for bottle-cap leverage");
    add("key_action_frames", [
      "adult hand grips the wood handle with the stainless head angled toward produce",
      "working edge or comb teeth contact a vegetable surface at a shallow practical angle",
      "side hooked notch is shown only near a bottle cap if demonstrating opener function"
    ]);
    add("detail_focus_areas", [
      "brown wood handle grain",
      "two round metal rivets in the handle",
      "silver stainless metal head outline",
      "long rounded open slot in the head",
      "two upper metal screws or rivets",
      "comb-like serrated teeth row",
      "side hooked bottle-opener notch"
    ]);
    add("detail_focus_areas_zh", ["木柄纹理", "木柄上的两个圆形铆钉", "银色金属头轮廓", "长圆形开槽", "上方两个圆形金属铆钉/螺钉", "梳齿/锯齿边", "侧边开瓶缺口"]);
    add("misjudgment_risks", [
      "do not turn the tool into an ordinary Y peeler or straight knife",
      "do not remove or duplicate the comb teeth",
      "do not remove the two handle rivets",
      "do not fill in the long open slot",
      "do not use the side notch, rivets, open slot, or wood handle as the peeling blade",
      "do not reverse the grip so the metal head is held like a handle"
    ]);
    add("misjudgment_risks_zh", ["不要变成普通Y型削皮器或直刀", "不要丢失或乱增梳齿", "不要丢失木柄两个铆钉", "不要把长开槽填实", "不要把侧边缺口/铆钉/开槽/木柄当削皮刀口", "不要反向握持金属头"]);
    add("part_function_map", [
      "wood handle = gripping area only",
      "handle rivets = fasteners only",
      "stainless head = working metal body",
      "comb-like teeth row = scraping, julienne, or serrated working edge only",
      "long rounded open slot = structural opening only",
      "side hooked notch = bottle-cap leverage notch only"
    ]);
    add("part_function_map_zh", ["木柄=只用于握持", "木柄铆钉=固定件", "不锈钢头=工作金属主体", "梳齿边=刮丝/刨丝/锯齿工作边", "长圆开槽=结构开口", "侧边钩形缺口=开瓶辅助缺口"]);
    add("forbidden_use_errors", [
      "do not use the wood handle as a blade",
      "do not show fingers holding the sharp metal teeth directly",
      "do not show the tool cutting with the round rivets or open slot",
      "do not make the side notch peel vegetables",
      "do not add extra blades, hinges, wheels, or plastic parts"
    ]);
    add("forbidden_use_errors_zh", ["不要用木柄当刀刃", "不要让手直接抓锋利梳齿", "不要用圆铆钉或长开槽切削", "不要让侧边缺口削果蔬", "不要添加额外刀片/合页/滚轮/塑料件"]);
  }

  if (hasPressWineStopper) {
    setMissing("product_mechanism", "bottle_stopper");
    setMissing("unit_of_sale", "one press-type wine bottle stopper");
    setMissing("unit_of_use", "one stopper fitted into the mouth of an opened wine bottle");
    setMissing("use_relationship", "the red sealing plug is the lower working end and points downward into the bottle mouth; the round collar rim rests on the bottle lip; the outer body and top press lever stay above the bottle mouth");
    setMissing("correct_use_method", "hold the outer body or top lever above the bottle neck, place the red sealing plug downward into the bottle mouth, seat the round collar rim on the bottle lip, then press the top lever down to seal");
    add("key_action_frames", [
      "adult hand holds the top lever above the bottle neck while the red sealing plug points downward",
      "red sealing plug enters the bottle mouth with the round collar rim resting on the lip",
      "after-use bottle is sealed with the top lever and outer body above the bottle opening"
    ]);
    add("detail_focus_areas", [
      "red cylindrical sealing plug at the lower end",
      "round collar rim above the red plug",
      "black or white outer body above the collar",
      "hinged rounded top press lever",
      "parallel grip grooves on the lever",
      "small metal side rivet or hinge pin",
      "thin dark sealing ring near the red plug edge"
    ]);
    add("misjudgment_risks", [
      "do not invert the stopper with the red plug above the lever",
      "do not place the lever or outer body inside the bottle mouth",
      "do not leave the red plug floating above the bottle opening",
      "do not make the bottle neck swallow the collar and lever",
      "do not turn the stopper into a cork, pump, cap, spout, or pourer"
    ]);
    add("part_function_map", [
      "red cylindrical plug = lower sealing part inserted downward into the bottle mouth",
      "round collar rim = stop rim that sits on the bottle lip and remains visible above the mouth",
      "outer body = visible body above the bottle opening",
      "top press lever = upper part pressed down after insertion",
      "side rivet or hinge pin = hinge detail, not the sealing part",
      "lever grooves = finger grip texture"
    ]);
    add("forbidden_use_errors", [
      "never show the red plug on top while the white or black lever goes into the bottle",
      "never insert the top lever, outer body, or side rivet into the bottle mouth",
      "never reverse the product orientation",
      "never show the stopper lying sideways across the bottle mouth as the sealed state",
      "never cover the red plug completely if the image needs to prove orientation; show at least a small visible lower red band at the mouth only when physically plausible"
    ]);
  }

  if (hasMovingBag) {
    setMissing("product_mechanism", "bag");
    setMissing("unit_of_sale", "one large soft rectangular storage or moving bag with zipper lid and sewn handles");
    setMissing("unit_of_use", "one bag standing on a floor, bed, closet shelf, or moving/storage area");
    setMissing("use_relationship", "the soft rectangular bag stands or rests on a support surface; handles attach to reinforced seams; the zipper follows the lid opening; contents may appear only as scale/context and not as included items");
    setMissing("correct_use_method", "place the bag on a stable surface, open the zipper lid, put household soft goods inside, close the lid, and lift only by the sewn handles when the bag shape is supported");
    add("key_action_frames", [
      "bag open with zipper lid folded back and soft household items inside as context",
      "adult hands holding the sewn handles while the bag stays upright",
      "closed bag placed near closet, bed, or moving boxes with clear scale"
    ]);
    add("detail_focus_areas", ["boxy soft fabric body", "zipper lid seam", "webbing handles attached to side seams", "rounded soft corners", "textile surface texture"]);
    add("misjudgment_risks", [
      "do not detach handles from seams",
      "do not make straps pass through the bag body or contents",
      "do not turn the bag into a hard plastic box or suitcase",
      "do not imply contents are included in the sale"
    ]);
    add("part_function_map", [
      "zipper = opens and closes the top lid",
      "webbing handles = lifting/gripping points attached to seams",
      "soft rectangular body = storage volume",
      "contents = scale/use context only"
    ]);
    add("forbidden_use_errors", [
      "do not float the bag without floor/bed/shelf support",
      "do not attach handles to empty air",
      "do not overfill into impossible rigid cube geometry",
      "do not add wheels, hard frame, or suitcase handle unless visible in reference"
    ]);
  }

  if (hasRackHolder) {
    setMissing("product_mechanism", "rack");
    setMissing("unit_of_sale", "one black countertop rack with a rectangular base and multiple vertical divider slots");
    setMissing("unit_of_use", "one rack placed flat on a countertop holding lids, plates, cutting boards, trays, or similar flat items upright between dividers");
    setMissing("use_relationship", "the rectangular base rests flat on a countertop; lids, plates, or cutting boards stand vertically between divider posts/slots with gravity, contact shadows, and no intersections");
    setMissing("correct_use_method", "place the rack base on a stable surface, then insert each lid, plate, tray, or cutting board into a slot between two vertical dividers so it leans slightly but remains supported");
    add("key_action_frames", [
      "rack on kitchen countertop with one or two lids/plates standing between vertical slots",
      "adult hand placing a lid into a slot without blocking the rack geometry",
      "organized after-use result with several flat kitchen items separated by dividers"
    ]);
    add("detail_focus_areas", ["glossy black rectangular base", "multiple upright divider posts", "even slot spacing", "rounded post ends", "open rectangular base cutouts or channels"]);
    add("detail_focus_areas_zh", ["黑色长方形底座", "多根竖向分隔柱", "均匀槽位间距", "圆润柱头", "底座开孔/槽道"]);
    add("misjudgment_risks", [
      "do not turn the rack into a shelf, basket, dish rack with wires, or wall-mounted hook",
      "do not let lids or plates pierce through divider posts",
      "do not make dividers float without a base",
      "do not remove the repeated vertical slots"
    ]);
    add("misjudgment_risks_zh", ["不要变成层架/篮子/铁丝碗碟架/墙挂钩", "不要让锅盖或盘子穿过分隔柱", "不要让分隔柱没有底座而悬空", "不要丢失重复竖槽结构"]);
    add("part_function_map", [
      "rectangular base = countertop support",
      "vertical divider posts = separate and support lids, plates, trays, or cutting boards",
      "open slots = insertion spaces for flat items",
      "stored kitchen items = context only unless sold together"
    ]);
    add("part_function_map_zh", ["长方形底座=放在台面的支撑结构", "竖向分隔柱=分隔并支撑锅盖/盘子/砧板", "槽位=插入扁平物品的空间", "被收纳物=使用场景道具不是售卖内容"]);
    add("forbidden_use_errors", [
      "do not hang the rack vertically on a wall unless the reference shows a wall mount",
      "do not place items on top of divider tips like a shelf",
      "do not make plates/lids float above slots",
      "do not add cookware that appears included in the sale"
    ]);
    add("forbidden_use_errors_zh", ["不要墙挂使用", "不要把物品放在分隔柱顶端当层板", "不要让盘子/锅盖悬在槽位上方", "不要让锅具看起来像包含在售卖内容里"]);
  }

  return profile.product_mechanism ? profile : null;
}

function applyProductMechanismProfile(payload = {}, analysis = {}) {
  const profile = productMechanismProfile(payload, analysis);
  const operatorSource = operatorMechanismSourceText(payload);
  const currentMechanism = String(analysis.product_mechanism || "").trim();
  const currentMechanismUnsupported = currentMechanism
    && currentMechanism !== "unknown"
    && !mechanismSupportedByOperatorFacts(currentMechanism, operatorSource);
  if (!profile && !currentMechanismUnsupported) return analysis;
  const next = { ...analysis };
  const highConfidenceMechanisms = new Set(["elastic_cover", "rack", "bottle_stopper"]);
  if (currentMechanismUnsupported) {
    next.product_mechanism = profile?.product_mechanism || inferProductMechanism(operatorSource) || "unknown";
    for (const key of ["product_summary_zh", "product_summary", "summary_zh", "final_prompt_en"]) {
      if (unsupportedForeignMechanicConflict(next[key], operatorSource)) next[key] = "";
    }
  } else if (!currentMechanism || currentMechanism === "unknown" || (profile && highConfidenceMechanisms.has(profile.product_mechanism) && ["wrap", "cover", "sheet", "organizer", "accessory"].includes(currentMechanism))) {
    next.product_mechanism = profile.product_mechanism || currentMechanism;
  }
  for (const key of ["product_package_mode", "unit_of_sale", "unit_of_use", "use_relationship", "correct_use_method"]) {
    const current = currentMechanismUnsupported || unsupportedForeignMechanicConflict(next[key], operatorSource)
      ? ""
      : next[key];
    next[key] = mergeTextField(current, profile?.[key]);
  }
  for (const key of [
    "key_action_frames",
    "detail_focus_areas",
    "detail_focus_areas_zh",
    "misjudgment_risks",
    "misjudgment_risks_zh",
    "part_function_map",
    "part_function_map_zh",
    "forbidden_use_errors",
    "forbidden_use_errors_zh"
  ]) {
    const current = currentMechanismUnsupported
      ? []
      : filterUnsupportedForeignMechanics(next[key], operatorSource);
    next[key] = uniqueMergedStringList(current, profile?.[key]);
  }
  if (currentMechanismUnsupported || unsupportedForeignMechanicConflict(JSON.stringify(next.regional_use_context || {}), operatorSource)) {
    next.regional_use_context = normalizeRegionalUseContext(payload, { ...next, regional_use_context: {} });
  }
  return next;
}

function normalizeCommercialSearchTerm(value) {
  let text = String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[?？!！]+$/g, "")
    .trim();
  if (!text) return "";

  text = text
    .replace(/\b(?:meaning|near me|nearby|amazon|temu|walmart|target|reviews?|reddit)\b.*$/i, "")
    .replace(/^(?:benefits of|advantages of)\s+/i, "")
    .replace(/^how to (?:use|make|clean|install|choose)\s+/i, "")
    .replace(/^what is (?:a |an |the )?/i, "")
    .replace(/^(?:do|does)\s+(.+?)\s+work$/i, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (!text || text.length < 3) return "";
  if (/\b(?:price|coupon|discount|deal|cheap|free shipping|best seller|bestseller|best)\b/i.test(text)) return "";
  if (/\b(?:where to buy|login|customer service|return policy)\b/i.test(text)) return "";
  if (findTitleBannedTerms(text).length) return "";
  return text;
}

function filterCommercialSearchTerms(values, limit = 12) {
  return uniqueStrings((values || []).map(normalizeCommercialSearchTerm).filter(Boolean), limit);
}

function regionToTrendGeo(region) {
  const value = String(region || "US").toUpperCase();
  const map = {
    US: "US",
    CN: "CN",
    EU: "",
    JP: "JP",
    BR: "BR",
    KR: "KR",
    THA: "TH",
    TH: "TH",
    RU: "RU"
  };
  return Object.prototype.hasOwnProperty.call(map, value) ? map[value] : "US";
}

function googleSearchGlForTrendGeo(geo) {
  const value = String(geo || "").toUpperCase();
  if (value === "GB" || value === "EU") return "gb";
  if (value === "TH") return "th";
  if (value === "JP") return "jp";
  if (value === "BR") return "br";
  if (value === "KR") return "kr";
  if (value === "RU") return "ru";
  if (value === "CN") return "cn";
  return "us";
}

function localeForTrend(language, geo) {
  const lang = String(language || "").toLowerCase();
  if (lang.includes("chinese")) return "zh-CN";
  if (lang.includes("japanese")) return "ja-JP";
  if (lang.includes("russian")) return "ru-RU";
  if (lang.includes("italian")) return "it-IT";
  if (lang.includes("french")) return "fr-FR";
  if (lang.includes("spanish")) return "es-US";
  if (lang.includes("german")) return "de-DE";
  if (geo === "JP") return "ja-JP";
  if (geo === "BR") return "pt-BR";
  if (geo === "KR") return "ko-KR";
  if (geo === "TH") return "th-TH";
  if (geo === "RU") return "ru-RU";
  return "en-US";
}

function parseGooglePrefixedJson(text) {
  const cleaned = String(text || "").replace(/^\)\]\}',?\s*/, "").trim();
  if (!cleaned) return null;
  return JSON.parse(cleaned);
}

function nodeFetchTextDirect(url, { timeoutMs, headers }) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, { method: "GET", headers, timeout: timeoutMs }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          status: response.statusCode,
          statusText: response.statusMessage || "",
          text: Buffer.concat(chunks).toString("utf8")
        });
      });
    });
    request.on("timeout", () => request.destroy(new Error("Connect Timeout Error")));
    request.on("error", reject);
    request.end();
  });
}

function nodeFetchTextViaHttpProxy(url, proxyUrl, { timeoutMs, headers }) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const proxy = new URL(normalizeProxyUrl(proxyUrl));
    if (proxy.protocol !== "http:") {
      reject(new Error("Google Trends 代理地址目前仅支持 http://host:port 格式"));
      return;
    }

    const connect = http.request({
      host: proxy.hostname,
      port: Number(proxy.port || 80),
      method: "CONNECT",
      path: `${target.hostname}:443`,
      timeout: timeoutMs,
      headers: { Host: `${target.hostname}:443` }
    });

    connect.on("connect", (response, socket) => {
      if (response.statusCode !== 200) {
        socket.destroy();
        reject(new Error(`代理 CONNECT 失败：${response.statusCode} ${response.statusMessage || ""}`.trim()));
        return;
      }

      const tlsSocket = tlsConnectSocket(socket, target.hostname, timeoutMs);
      const request = https.request({
        host: target.hostname,
        servername: target.hostname,
        path: `${target.pathname}${target.search}`,
        method: "GET",
        headers,
        createConnection: () => tlsSocket,
        timeout: timeoutMs
      }, (proxiedResponse) => {
        const chunks = [];
        proxiedResponse.on("data", (chunk) => chunks.push(chunk));
        proxiedResponse.on("end", () => {
          resolve({
            ok: proxiedResponse.statusCode >= 200 && proxiedResponse.statusCode < 300,
            status: proxiedResponse.statusCode,
            statusText: proxiedResponse.statusMessage || "",
            text: Buffer.concat(chunks).toString("utf8")
          });
        });
      });
      request.on("timeout", () => request.destroy(new Error("Proxy request timeout")));
      request.on("error", reject);
      request.end();
    });

    connect.on("timeout", () => connect.destroy(new Error("Proxy connect timeout")));
    connect.on("error", reject);
    connect.end();
  });
}

function tlsConnectSocket(socket, servername, timeoutMs) {
  const tls = require("node:tls");
  const tlsSocket = tls.connect({
    socket,
    servername,
    timeout: timeoutMs
  });
  tlsSocket.on("timeout", () => tlsSocket.destroy(new Error("TLS connect timeout")));
  return tlsSocket;
}

function googleFetchText(url, config) {
  const headers = {
    "User-Agent": "Mozilla/5.0 ProductImageStudio/1.0",
    Accept: "application/json,text/plain,*/*"
  };
  const proxyUrl = normalizeProxyUrl(config.trendProxyUrl);
  if (proxyUrl) {
    return nodeFetchTextViaHttpProxy(url, proxyUrl, { timeoutMs: 12000, headers });
  }
  return nodeFetchTextDirect(url, { timeoutMs: 12000, headers });
}

async function fetchGoogleJson(url, label, config = {}) {
  try {
    const response = await googleFetchText(url, config);
    const text = response.text;
    if (!response.ok) {
      throw new Error(`${label} ${response.status} ${response.statusText}`);
    }
    return parseGooglePrefixedJson(text);
  } catch (error) {
    throw new Error(`${error.message}${config.trendProxyUrl ? `；代理：${normalizeProxyUrl(config.trendProxyUrl)}` : ""}`);
  }
}

async function fetchGoogleTrendsAutocomplete(query, hl, config = {}, geo = "") {
  const geoParam = geo ? `&geo=${encodeURIComponent(geo)}` : "";
  const url = `https://trends.google.com/trends/api/autocomplete/${encodeURIComponent(query)}?hl=${encodeURIComponent(hl)}&tz=480${geoParam}`;
  const body = await fetchGoogleJson(url, "Google Trends autocomplete", config);
  const topics = body?.default?.topics || body?.topics || [];
  return uniqueStrings(topics.map((topic) => topic.title || topic.name || topic.query), 10);
}

async function fetchGoogleSearchSuggestions(query, hl, config = {}, gl = "") {
  const glParam = gl ? `&gl=${encodeURIComponent(gl)}` : "";
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=${encodeURIComponent(hl)}${glParam}&q=${encodeURIComponent(query)}`;
  const body = await fetchGoogleJson(url, "Google search suggestions", config);
  return uniqueStrings(Array.isArray(body?.[1]) ? body[1] : [], 10);
}

function buildTitleSeedSystemPrompt() {
  return [
    "You identify ecommerce products from the uploaded product image first, then return short Google Trends seed queries.",
    "Return compact JSON only, no markdown.",
    "Do not generate a listing title.",
    "The uploaded image is the primary evidence. Product name and operator keywords are secondary hints. If text keywords conflict with the image, trust the image.",
    "First classify the exact use boundary: what the product is for, what it is compatible with, and what it is NOT for.",
    "Seed queries must be buyer/search noun phrases, not question phrases. Prefer exact retail category terms, compatible object terms, and use-scenario terms.",
    "Never expand a product into another category just because Google/search terms are popular. For example, a hand mixer bowl splatter guard must not become a microwave food cover, plate cover, dish cover, or leftovers reheating cover unless the image clearly proves that use.",
    "Avoid promotional, certification, safety, medical, eco, baby/minor/maternity, waterproof, oilproof, fireproof, protection, high/low temperature, assistant/help, and free-from wording.",
    "Schema: {\"product_identity_zh\":\"\",\"product_identity_en\":\"\",\"category_zh\":\"\",\"category_en\":\"\",\"visual_evidence\":[\"\"],\"confirmed_uses\":[\"\"],\"compatible_objects\":[\"\"],\"forbidden_title_concepts\":[\"\"],\"seed_queries\":[\"\"],\"core_attributes\":[\"\"],\"warnings\":[\"\"]}. seed_queries must be 3-6 concise English search queries grounded in the image."
  ].join("\n");
}

function buildTitleSeedRequest(payload) {
  const brand = payload.brand || {};
  return [
    `Platform: ${normalizePlatformName(payload.platform || brand.platform || "Temu")}`,
    `Region: ${brand.region || payload.region || "US"}`,
    `Language: ${brand.language || payload.language || "English"}`,
    `Product form: ${packageModeLabel(payload.productPackageMode || "single")}`,
    `Product info: ${String(payload.productInfo || "未填写").slice(0, 900)}`,
    `Operator keywords: ${(normalizeKeywordList(payload.operatorKeywords).join(", ") || "未填写").slice(0, 500)}`,
    payload.analysis?.product_summary_zh ? `Known product summary: ${String(payload.analysis.product_summary_zh).slice(0, 300)}` : "",
    payload.analysis?.final_prompt_en ? `Known product brief: ${String(payload.analysis.final_prompt_en).slice(0, 500)}` : "",
    "Image-first guardrail: inspect the uploaded reference image and only output product identity, uses, attributes, compatible objects, and seed queries that are visually supported or directly supplied by the user.",
    "If the image shows a splatter guard with a central beater/handle opening for mixing, classify it as a mixer bowl splatter guard for egg whisking/batter mixing/kitchen baking. Do not classify it as microwave plate cover, food cover, dish cover, or leftovers reheating cover.",
    "If only a product name is supplied, infer the common retail category wording from that name, image, marketplace, region, and operator keywords. Put uncertainty in warnings."
  ].filter(Boolean).join("\n");
}

function normalizeTitleSeedInfo(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    product_identity_zh: String(source.product_identity_zh || source.productIdentityZh || "").trim(),
    product_identity_en: String(source.product_identity_en || source.productIdentityEn || "").trim(),
    category_zh: String(source.category_zh || source.categoryZh || "").trim(),
    category_en: String(source.category_en || source.categoryEn || "").trim(),
    visual_evidence: uniqueStrings(source.visual_evidence || source.visualEvidence || [], 8),
    confirmed_uses: uniqueStrings(source.confirmed_uses || source.confirmedUses || [], 8),
    compatible_objects: uniqueStrings(source.compatible_objects || source.compatibleObjects || [], 8),
    forbidden_title_concepts: uniqueStrings(source.forbidden_title_concepts || source.forbiddenTitleConcepts || [], 10),
    seed_queries: uniqueStrings(source.seed_queries || source.seedQueries || [], 8),
    core_attributes: uniqueStrings(source.core_attributes || source.coreAttributes || [], 8),
    warnings: normalizeStringList(source.warnings).slice(0, 6)
  };
}

async function callPromptModel(config, systemPrompt, userText, images = []) {
  const endpoint = config.promptEndpoint || "responses";
  const safeImages = await normalizeImageSourcesForPrompt(images, 4);
  if (endpoint === "chat") {
    return callChatApi(config, systemPrompt, userText, safeImages);
  }
  if (endpoint === "gemini") {
    return callGeminiApi(config, systemPrompt, userText, safeImages);
  }
  if (endpoint === "anthropic") {
    return callAnthropicApi(config, systemPrompt, userText, safeImages);
  }
  if (endpoint === "auto") {
    const candidates = promptAutoEndpointCandidates(config);
    const errors = [];
    for (const [candidateEndpoint, caller] of candidates) {
      try {
        return await caller(config, systemPrompt, userText, safeImages);
      } catch (error) {
        errors.push({ endpoint: candidateEndpoint, error });
      }
    }
    const summary = errors
      .map(({ endpoint: failedEndpoint, error }) => `${failedEndpoint}: ${String(error?.message || error || "").split(/\n\n/)[0]}`)
      .join("；");
    const primary = errors[0]?.error;
    throw new Error(`${primary?.message || "auto 接口尝试失败"}\n\nauto 已尝试接口：${summary}`);
  }
  return callResponsesApi(config, systemPrompt, userText, safeImages);
}

async function callTitleSeedPromptModel(config, systemPrompt, userText, images = []) {
  const seedConfig = {
    ...config,
    promptModel: config.promptModel || DEFAULT_CONFIG.promptModel
  };
  return callPromptModel(seedConfig, systemPrompt, userText, images);
}

function explainTitleApiError(error, prefix = "提示词模型调用失败") {
  const raw = String(error?.message || error || "").trim();
  if (!raw) return `${prefix}。`;
  if (/api key|apikey|unauthorized|401/i.test(raw)) {
    return `${prefix}：API Key 未填写、无效或没有权限。原始错误：${raw}`;
  }
  if (/403/i.test(raw)) {
    return `${prefix}：接口无访问权限，请检查 API Key、模型名或账号权限。原始错误：${raw}`;
  }
  if (/404/i.test(raw)) {
    return `${prefix}：接口地址或模型不存在，请检查 API 地址、接口类型和模型名。原始错误：${raw}`;
  }
  if (/429/i.test(raw)) {
    return `${prefix}：请求过于频繁或额度不足，请稍后重试。原始错误：${raw}`;
  }
  if (/5\d\d/i.test(raw)) {
    return `${prefix}：服务端返回错误，请稍后重试。原始错误：${raw}`;
  }
  if (/fetch failed|network|timeout|aborted|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(raw)) {
    return `${prefix}：网络连接失败，请检查网络、API 地址或代理设置。原始错误：${raw}`;
  }
  if (/请求超时|AbortError/i.test(raw)) {
    return `${prefix}：请求超时，请检查提示词 API 服务是否可用，或稍后重试。原始错误：${raw}`;
  }
  if (/model/i.test(raw)) {
    return `${prefix}：模型名可能不被当前接口支持，请检查 gpt-5.4、gpt-5.5 或你手动填写的模型名。原始错误：${raw}`;
  }
  return `${prefix}：${raw}`;
}

function explainPromptApiConnectionError(error, prefix = "API 连接检测失败") {
  const raw = String(error?.message || error || "").trim();
  const debugMatch = raw.match(/本次[\s\S]*?实际请求信息：[\s\S]*$/);
  const debugText = debugMatch ? `\n\n${debugMatch[0]}` : "";
  if (!raw) return `${prefix}：没有拿到接口返回，请检查 API 地址、Key 和网络。`;
  if (/api key|apikey|unauthorized|401/i.test(raw)) {
    return `${prefix}：API Key 未填写、已失效或没有权限，请重新复制控制台里的 Key。${debugText}`;
  }
  if (/403/i.test(raw)) {
    return `${prefix}：账号没有访问权限，请检查 API Key、模型权限、余额或供应商控制台授权。${debugText}`;
  }
  if (/404/i.test(raw)) {
    return `${prefix}：接口地址或模型不存在。请确认 Base URL 不要重复填写 /chat/completions 或 /responses，模型名也要和供应商控制台一致。${debugText}`;
  }
  if (/429/i.test(raw)) {
    return `${prefix}：请求太频繁、额度不足或账号限流，请稍后再试或检查余额。${debugText}`;
  }
  if (/5\d\d/i.test(raw)) {
    return `${prefix}：供应商服务器返回错误，通常不是本软件配置错误，可以稍后重试。${debugText}`;
  }
  if (/fetch failed|network|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN/i.test(raw)) {
    return `${prefix}：网络连不上接口地址，请检查网络、代理、防火墙，或确认 API 地址填写正确。${debugText}`;
  }
  if (/请求超时|timeout|AbortError|aborted/i.test(raw)) {
    return `${prefix}：请求超时，接口没有在限定时间内响应，请检查网络或供应商服务状态。${debugText}`;
  }
  if (/model/i.test(raw)) {
    return `${prefix}：模型名可能不被当前供应商支持，请点击“获取模型列表”或到控制台复制正确模型名。${debugText}`;
  }
  return `${prefix}：${raw}`;
}

function explainVolcenginePromptApiError(error, config = {}, prefix = "火山方舟连接检测失败") {
  const raw = String(error?.message || error || "").trim();
  const debugMatch = raw.match(/本次[\s\S]*?实际请求信息：[\s\S]*$/);
  const debugText = debugMatch ? `\n\n${debugMatch[0]}` : "";
  const model = String(config.promptModel || "").trim();
  const baseUrl = trimSlash(config.promptBaseUrl || "");
  const common = [
    `${prefix}。`,
    "火山方舟需要同时满足：API Key 有该模型权限，模型 ID 或 ep-接入点 ID 填对，并且 Base URL 是方舟 OpenAI 兼容地址。",
    `当前填写：Base URL=${baseUrl || "空"}；模型/接入点=${model || "空"}。`
  ];
  if (/403|permission|forbidden|not authorized|unauthorized/i.test(raw)) {
    common.push("当前更像是 Key 没有勾选/授权这个模型或接入点，或账号余额/项目权限不足。请到火山方舟 API Key 管理里确认该 Key 对应权限，并优先复制控制台代码示例里的 model/ep ID。");
  } else if (/404|not found|not exist|model/i.test(raw)) {
    common.push("当前更像是模型 ID 或接入点 ID 不存在/不匹配。模型列表里的全量 Model ID 不代表 Key 都能调用；如果你买的是推理接入点套餐，请填 ep-... 接入点 ID，而不是页面展示名称。");
  } else if (/400|invalid|bad request/i.test(raw)) {
    common.push("当前更像是接口类型或请求体不被该模型接受。软件已支持 auto 在 /chat/completions 和 /responses 间尝试；仍失败时请确认该模型支持文本 Chat/多模态 Chat，而不是作图、视频、语音、3D 或翻译专用模型。");
  } else {
    common.push("如果控制台示例能跑通，请把示例里的 Base URL、model 字段和接口路径按原样填进软件；特殊套餐通常要填 ep-... 接入点 ID。");
  }
  if (raw) common.push(`供应商原始错误：${raw.replace(debugMatch?.[0] || "", "").trim()}`);
  return `${common.join("\n")}${debugText}`;
}

function normalizePromptApiConfig(config = {}) {
  const normalized = normalizePromptProviderConfig(config);
  return {
    ...DEFAULT_CONFIG,
    ...config,
    ...normalized,
    promptApiKey: String(config.promptApiKey || "").trim(),
    promptModel: normalized.promptModel || DEFAULT_CONFIG.promptModel
  };
}

function resolvePromptConfigForPayload(savedConfig = {}, payload = {}) {
  const incomingPromptConfig = payload?.promptConfig && typeof payload.promptConfig === "object" ? payload.promptConfig : null;
  if (!incomingPromptConfig) return savedConfig;
  return normalizePromptApiConfig({
    ...savedConfig,
    promptProviderKeys: savedConfig.promptProviderKeys,
    promptProviderModels: savedConfig.promptProviderModels,
    promptProviderLastModels: savedConfig.promptProviderLastModels,
    promptProviderApiOptions: savedConfig.promptProviderApiOptions,
    promptModelCapabilities: savedConfig.promptModelCapabilities,
    ...incomingPromptConfig
  });
}

function hasPromptVisualInput(payload = {}) {
  return Boolean(
    payload?.requireVisionPromptModel
    || (Array.isArray(payload?.images) && payload.images.filter(Boolean).length)
    || (Array.isArray(payload?.referenceImages) && payload.referenceImages.filter(Boolean).length)
  );
}

function promptConfigSupportsVision(config = {}) {
  const provider = normalizePromptProvider(config.promptProvider);
  const model = String(config.promptModel || "").trim();
  const caps = normalizePromptModelCapabilitiesMap(config.promptModelCapabilities);
  return Boolean(caps[provider]?.[model]?.vision || inferModelCapabilities(model, provider).vision);
}

function assertVisionPromptModelForPayload(config = {}, payload = {}, taskName = "AI task") {
  if (!hasPromptVisualInput(payload)) return;
  if (promptConfigSupportsVision(config)) return;
  const provider = config.promptProvider || "custom";
  const model = config.promptModel || "not selected";
  throw new Error(`${taskName} requires a multimodal vision model because product images are part of the task. Current prompt model is ${provider} / ${model}; please choose a vision-capable model and run the real vision connection test.`);
}

function promptApiTestMessages() {
  return {
    system: "You are an API health check endpoint. Reply with compact JSON only.",
    user: "Return exactly this JSON object: {\"ok\":true,\"message\":\"connected\"}"
  };
}

function promptApiVisionTestMessages() {
  return {
    system: "You are a vision API health check endpoint. Reply with compact JSON only.",
    user: "Inspect the attached tiny test image and return JSON only: {\"ok\":true,\"vision\":true,\"object\":\"red square\"}"
  };
}

function promptApiHealthTestImage() {
  return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABtSURBVGhD7c+xDYAwFAPRDJf9V2EE6OlOcmS+uCe5cXfrHm69j2kMaDOgzYA2A9oMaMMB195HRxmQHmVAepQB6VEGpEcZkB5lQHqUAelRBqRHGZAeZUB6lAHpUf8L+BoD2gxoM6DNgDYD2sYHPK5PcGHap0AXAAAAAElFTkSuQmCC";
}

function validatePromptApiJsonProbe(body, label, required = {}) {
  const text = responseText(body) || JSON.stringify(body || {});
  const parsed = extractJson(text);
  if (!parsed || parsed.ok !== true) {
    throw new Error(`${label}失败：模型已返回，但不是可解析的 { "ok": true } JSON。原始返回：${String(text || "").slice(0, 500)}`);
  }
  if (required.vision && parsed.vision !== true) {
    throw new Error(`${label}失败：模型没有确认视觉输入能力。原始返回：${String(text || "").slice(0, 500)}`);
  }
  return { text, parsed };
}

function shouldRunPromptVisionProbe(config = {}) {
  if (config.forceVisionProbe) return true;
  const provider = normalizePromptProvider(config.promptProvider);
  const model = String(config.promptModel || "").trim();
  const caps = normalizePromptModelCapabilitiesMap(config.promptModelCapabilities);
  return Boolean(caps[provider]?.[model]?.vision || inferModelCapabilities(model, provider).vision);
}

async function testPromptApiConnection(config) {
  const safeConfig = normalizePromptApiConfig(config);
  if (!safeConfig.promptBaseUrl) {
    throw new Error("API 连接检测失败：请先填写 API 地址。");
  }
  if (!safeConfig.promptApiKey) {
    throw new Error("API 连接检测失败：请先填写 API Key。");
  }
  if (!safeConfig.promptModel) {
    throw new Error("API 连接检测失败：请先填写模型名。");
  }

  const messages = promptApiTestMessages();
  try {
    const body = await callPromptModel(
      { ...safeConfig, promptEndpoint: safeConfig.promptEndpoint === "auto" ? "auto" : safeConfig.promptEndpoint },
      messages.system,
      messages.user,
      []
    );
    const jsonProbe = validatePromptApiJsonProbe(body, "文本 JSON 检测");
    let visionProbe = null;
    if (shouldRunPromptVisionProbe(safeConfig)) {
      const visionMessages = promptApiVisionTestMessages();
      const visionBody = await callPromptModel(
        { ...safeConfig, promptEndpoint: safeConfig.promptEndpoint === "auto" ? "auto" : safeConfig.promptEndpoint },
        visionMessages.system,
        visionMessages.user,
        [promptApiHealthTestImage()]
      );
      visionProbe = validatePromptApiJsonProbe(visionBody, "视觉输入检测", { vision: true });
    }
    const requestUrl = promptEndpointPreview(safeConfig);
    return {
      ok: true,
      model: safeConfig.promptModel,
      provider: safeConfig.promptProvider,
      endpoint: safeConfig.promptEndpoint,
      requestUrl,
      response: jsonProbe.text.slice(0, 300),
      visionOk: Boolean(visionProbe),
      note: visionProbe
        ? "文本 JSON 和视觉输入检测均通过。"
        : "文本 JSON 检测通过；当前模型未标记为视觉模型，未发送图片探针。"
    };
  } catch (error) {
    if (isVolcenginePromptProvider(safeConfig)) {
      throw new Error(explainVolcenginePromptApiError(error, safeConfig));
    }
    throw new Error(explainPromptApiConnectionError(error));
  }
}

async function listPromptApiModels(config) {
  const safeConfig = normalizePromptApiConfig(config);
  if (safeConfig.promptProvider === "grsai-gemini") {
    return {
      ok: true,
      models: GRSAI_PROMPT_MODELS,
      note: "Grsai 的 /v1/chat/completions 文档说明模型名支持所有模型，这里返回软件内置的常用 Grsai 文本模型。"
    };
  }
  if (!safeConfig.promptBaseUrl) {
    throw new Error("获取模型列表失败：请先填写 API 地址。");
  }
  if (!safeConfig.promptApiKey) {
    throw new Error("获取模型列表失败：请先填写 API Key。");
  }

  try {
    const endpoint = safeConfig.promptEndpoint || "chat";
    const url = endpoint === "gemini"
      ? `${trimSlash(safeConfig.promptBaseUrl)}/models?key=${encodeURIComponent(safeConfig.promptApiKey)}`
      : endpoint === "anthropic"
        ? ""
        : `${trimSlash(safeConfig.promptBaseUrl)}/models`;
    if (!url) {
      return {
        ok: true,
        models: uniqueModelsForProvider(safeConfig.promptProvider, safeConfig.promptModel),
        note: "该供应商没有统一开放 /models 接口，已返回软件内置和你保存过的模型。"
      };
    }
    const body = await requestJson(url, {
      method: "GET",
      headers: endpoint === "gemini" ? { "Content-Type": "application/json" } : authHeaders(safeConfig.promptApiKey),
      timeoutMs: 30000
    });
    const models = Array.isArray(body?.data)
      ? body.data
          .map((item) => String(item?.id || item?.name || "").trim())
          .filter(Boolean)
      : Array.isArray(body?.models)
        ? body.models.map((item) => String(item?.id || item?.name || item?.displayName || item || "").trim().replace(/^models\//, "")).filter(Boolean)
        : [];
    if (isVolcenginePromptProvider(safeConfig)) {
      const unique = Array.from(new Set(models));
      const filtered = unique.filter(isVolcenginePromptTextModel);
      return {
        ok: true,
        models: (filtered.length ? filtered : uniqueModelsForProvider(safeConfig.promptProvider, safeConfig.promptModel)).sort(),
        note: volcengineModelListNote(unique.length, filtered.length || uniqueModelsForProvider(safeConfig.promptProvider, safeConfig.promptModel).length)
      };
    }
    return {
      ok: true,
      models: Array.from(new Set(models)).sort()
    };
  } catch (error) {
    if (isVolcenginePromptProvider(safeConfig)) {
      throw new Error(explainVolcenginePromptApiError(error, safeConfig, "获取火山方舟模型列表失败"));
    }
    throw new Error(explainPromptApiConnectionError(error, "获取模型列表失败"));
  }
}

function normalizeImageApiConfig(config = {}) {
  const normalized = normalizeImageProviderConfig(config);
  return {
    ...DEFAULT_CONFIG,
    ...config,
    ...normalized,
    imageApiKey: String(config.imageApiKey || config.grsaiApiKey || "").trim(),
    imageModelRoute: normalizeImageModelRoute(config.imageModelRoute),
    image1kModel: normalized.image1kModel,
    image2kModel: normalized.image2kModel
  };
}

function parseModelList(body) {
  const values = Array.isArray(body?.data)
    ? body.data.map((item) => String(item?.baseModelId || item?.id || item?.name || item?.model || "").trim())
    : Array.isArray(body?.models)
      ? body.models.map((item) => String(item?.baseModelId || item?.id || item?.name || item?.model || item || "").trim())
      : Array.isArray(body)
        ? body.map((item) => String(item?.baseModelId || item?.id || item?.name || item?.model || item || "").trim())
        : [];
  return Array.from(new Set(values.map((value) => value.replace(/^models\//, "")).filter(Boolean))).sort();
}

function explainImageApiConnectionError(error, prefix = "作图 API 连接检测失败") {
  const raw = String(error?.message || error || "").trim();
  const debugMatch = raw.match(/本次[\s\S]*?实际请求信息：[\s\S]*$/);
  const debugText = debugMatch ? `\n\n${debugMatch[0]}` : "";
  if (!raw) return `${prefix}：没有拿到接口返回，请检查作图 API 地址、Key 和网络。`;
  if (/api key|apikey|unauthorized|401/i.test(raw)) {
    return `${prefix}：作图 API Key 未填写、已失效或没有权限，请重新复制供应商控制台里的 Key。${debugText}`;
  }
  if (/403/i.test(raw)) {
    return `${prefix}：账号没有访问作图接口的权限，请检查 API Key、模型权限、余额或供应商控制台授权。${debugText}`;
  }
  if (/404/i.test(raw)) {
    return `${prefix}：接口地址不存在，或该供应商没有开放当前检测接口。请确认 Base URL 不要重复填写 /v1、/models 或 /api/generate。${debugText}`;
  }
  if (/429/i.test(raw)) {
    return `${prefix}：请求太频繁、额度不足或账号限流，请稍后再试或检查余额。${debugText}`;
  }
  if (/5\d\d/i.test(raw)) {
    return `${prefix}：供应商服务器返回错误，通常不是本软件配置错误，可以稍后重试。${debugText}`;
  }
  if (/fetch failed|network|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN/i.test(raw)) {
    return `${prefix}：网络连不上作图 API 地址，请检查网络、代理、防火墙，或确认 API 地址填写正确。${debugText}`;
  }
  if (/请求超时|timeout|AbortError|aborted/i.test(raw)) {
    return `${prefix}：请求超时，作图 API 没有在限定时间内响应，请检查网络或供应商服务状态。${debugText}`;
  }
  if (/model/i.test(raw)) {
    return `${prefix}：作图模型名可能不被当前供应商支持，请点击“获取模型列表”或到控制台复制正确模型名。${debugText}`;
  }
  return `${prefix}：${raw}${debugText && !raw.includes(debugText) ? debugText : ""}`;
}

async function requestOpenAiCompatibleModels(baseUrl, apiKey) {
  const body = await requestJson(`${trimSlash(baseUrl)}/models`, {
    method: "GET",
    headers: authHeaders(apiKey),
    timeoutMs: 30000
  });
  return parseModelList(body);
}

function bflHeaders(apiKey) {
  return {
    "Content-Type": "application/json",
    "x-key": apiKey
  };
}

function urlWithApiKey(url, apiKey) {
  const target = new URL(url);
  target.searchParams.set("key", apiKey);
  return target.toString();
}

async function requestGeminiModels(baseUrl, apiKey) {
  const body = await requestJson(urlWithApiKey(`${trimSlash(baseUrl)}/models`, apiKey), {
    method: "GET",
    timeoutMs: 30000
  });
  const models = parseModelList(body);
  return models.filter((model) => /image|imagen|gemini/i.test(model));
}

function selectedTestImageModel(config) {
  const route = String(config.imageModelRoute || "").trim();
  if (route && route !== "auto") return route;
  return String(config.image1kModel || config.grsai1kModel || config.image2kModel || config.grsai2kModel || DEFAULT_CONFIG.image1kModel).trim();
}

async function requestGrsaiRealImageTest(config) {
  const model = selectedTestImageModel(config);
  if (!model) {
    throw new Error("作图 API 连接检测失败：请先选择要检测的作图模型。");
  }
  const size = resolveGrsaiImageSize(model, "1K", "1:1");
  const url = `${trimSlash(config.imageBaseUrl || config.grsaiBaseUrl)}/v1/images/generations`;
  const prompt = [
    aspectRatioInstruction("1:1", size),
    "Create a very simple clean square test image for API connectivity: a small blue check mark icon centered on a plain white background. No text, no product, no watermark."
  ].join("\n\n");
  let body;
  try {
    body = await requestJson(url, {
      method: "POST",
      headers: authHeaders(config.imageApiKey || config.grsaiApiKey),
      body: JSON.stringify({
        model,
        prompt,
        image: [],
        size,
        response_format: "url"
      }),
      timeoutMs: SINGLE_IMAGE_TIMEOUT_MS
    });
  } catch (error) {
    throw appendRequestDebug(error, "作图检测", {
      供应商: config.imageProvider || "grsai",
      模型: model,
      尺寸: size,
      比例: "1:1",
      参考图数量: 0,
      请求地址: url,
      配置文件: configPath()
    });
  }
  const results = normalizeGrsaiGenerationResults(body, model, { kind: "真实检测" });
  if (!results.some((item) => item.url)) {
    throw new Error("作图 API 真实检测失败：接口返回成功，但没有返回测试图片链接。");
  }
  return {
    ok: true,
    provider: config.imageProvider,
    providerType: config.imageProviderType,
    models: fallbackImageModels("grsai"),
    modelInfo: GRSAI_IMAGE_MODEL_INFO,
    modelDetails: grsaiImageModelDetails(),
    note: `已真实调用 Grsai /v1/images/generations 并生成测试图。检测模型：${model}；测试尺寸：${size}。`
  };
}

function fallbackImageModels(provider) {
  const lists = {
    grsai: GRSAI_IMAGE_MODELS,
    midjourney: ["mj-v7", "mj-v6.1", "niji-v6"],
    bfl: ["flux-2-max", "flux-2-pro-preview", "flux-2-pro", "flux-2-flex", "flux-pro-1.1-ultra", "flux-pro-1.1"]
  };
  return lists[normalizeImageProvider(provider)] || [];
}

async function testImageApiConnection(config) {
  const safeConfig = normalizeImageApiConfig(config);
  if (!safeConfig.imageBaseUrl) {
    throw new Error("作图 API 连接检测失败：请先填写作图 API 地址。");
  }
  if (!safeConfig.imageApiKey) {
    throw new Error("作图 API 连接检测失败：请先填写作图 API Key。");
  }
  if (safeConfig.imageProviderType !== "grsai") {
    throw new Error(`作图 API 真实检测失败：当前版本还没有适配“${safeConfig.imageProvider}”的真实生图检测接口。为了避免误判，检测状态不会再用模型列表、余额接口或本地校验冒充成功。请先切回 Grsai 进行真实出图检测，或等该供应商的生图适配完成后再检测。`);
  }

  try {
    return requestGrsaiRealImageTest(safeConfig);
  } catch (error) {
    throw new Error(explainImageApiConnectionError(error));
  }
}

async function listImageApiModels(config) {
  const safeConfig = normalizeImageApiConfig(config);
  if (safeConfig.imageProvider === "midjourney") {
    return {
      ok: true,
      provider: safeConfig.imageProvider,
      providerType: safeConfig.imageProviderType,
      models: fallbackImageModels("midjourney"),
      note: "Midjourney 没有公开官方 API，这里返回常用 MJ 模型名，适合第三方中转或自有网关配置。"
    };
  }
  if (safeConfig.imageProviderType === "bfl" && !safeConfig.imageApiKey) {
    return {
      ok: true,
      provider: safeConfig.imageProvider,
      providerType: safeConfig.imageProviderType,
      models: fallbackImageModels("bfl"),
      note: "黑森林官方文档没有统一 /models 列表接口，这里返回软件内置的 FLUX 常用模型。检测连接需要填写 API Key。"
    };
  }
  if (!safeConfig.imageBaseUrl) {
    throw new Error("获取作图模型列表失败：请先填写作图 API 地址。");
  }
  if (!safeConfig.imageApiKey) {
    throw new Error("获取作图模型列表失败：请先填写作图 API Key。");
  }

  try {
    let models = [];
    let note = "";
    if (safeConfig.imageProviderType === "grsai") {
      models = fallbackImageModels("grsai");
      note = "Grsai 的 /v1/images/generations 文档说明支持所有图片生成模型；这里返回软件内置的常用 Grsai 图片模型。";
    } else if (safeConfig.imageProviderType === "gemini") {
      models = await requestGeminiModels(safeConfig.imageBaseUrl, safeConfig.imageApiKey);
    } else if (safeConfig.imageProviderType === "bfl") {
      models = fallbackImageModels("bfl");
      note = "黑森林官方文档没有统一 /models 列表接口，这里返回软件内置的 FLUX 常用模型。";
    } else {
      models = await requestOpenAiCompatibleModels(safeConfig.imageBaseUrl, safeConfig.imageApiKey);
    }
    return {
      ok: true,
      provider: safeConfig.imageProvider,
      providerType: safeConfig.imageProviderType,
      models,
      modelInfo: safeConfig.imageProviderType === "grsai" ? GRSAI_IMAGE_MODEL_INFO : undefined,
      modelDetails: safeConfig.imageProviderType === "grsai" ? grsaiImageModelDetails() : undefined,
      note
    };
  } catch (error) {
    if (safeConfig.imageProviderType === "grsai") {
      throw new Error("获取作图模型列表失败：当前 Grsai 通道可能没有开放模型列表接口。你仍然可以使用软件内置的 gpt-image-2、gpt-image-2-vip、nano-banana 系列，或在模型下拉框选择“手动输入其他模型”。");
    }
    if (safeConfig.imageProviderType === "custom") {
      throw new Error(explainImageApiConnectionError(error, "获取作图模型列表失败") + " 如果这是非 OpenAI 兼容供应商，可能本身没有 /models 接口，请手动填写控制台提供的模型名。");
    }
    throw new Error(explainImageApiConnectionError(error, "获取作图模型列表失败"));
  }
}

async function extractTitleSeedInfo(config, payload) {
  const images = (payload.images || []).slice(0, 1);
  try {
    const body = await callTitleSeedPromptModel(config, buildTitleSeedSystemPrompt(), buildTitleSeedRequest(payload), images);
    const text = responseText(body);
    const parsed = extractJson(text);
    const seedInfo = normalizeTitleSeedInfo(parsed);
    if (!seedInfo.seed_queries.length && !seedInfo.product_identity_en) {
      throw new Error(`模型没有返回可用于 Google Trends 检索的产品关键词。模型原始返回：${(text || JSON.stringify(body)).slice(0, 600)}`);
    }
    return seedInfo;
  } catch (error) {
    throw new Error(explainTitleApiError(error, "商品识别和趋势词种子提取失败"));
  }
}

function buildTitleTrendSeeds(payload, seedInfo) {
  const fromOperator = normalizeKeywordList(payload.operatorKeywords);
  const fromProduct = String(payload.productInfo || "")
    .split(/[\n,，、;；.。|]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
  const fromAnalysis = [
    payload.analysis?.regional_use_context?.common_product_name_en,
    payload.analysis?.regional_use_context?.real_use_summary_en,
    payload.analysis?.final_prompt_en
  ].filter(Boolean);

  return uniqueStrings([
    ...(seedInfo.seed_queries || []),
    seedInfo.product_identity_en,
    seedInfo.category_en,
    ...(seedInfo.compatible_objects || []),
    ...(seedInfo.confirmed_uses || []),
    ...fromOperator,
    ...fromProduct,
    ...fromAnalysis
  ].map((item) => String(item || "").replace(/\s+/g, " ").trim().slice(0, 90)), 10);
}

async function fetchTitleTrendSignals(payload, seedInfo, config = {}) {
  const brand = payload.brand || {};
  const primaryGeo = regionToTrendGeo(brand.region || payload.region || "US");
  const markets = [
    { market: "US", geo: "US", hl: "en-US", gl: "us" },
    { market: "Europe", geo: "GB", hl: "en-GB", gl: "gb" }
  ];
  if (primaryGeo && !markets.some((market) => market.geo === primaryGeo)) {
    markets.unshift({
      market: brand.region || payload.region || primaryGeo,
      geo: primaryGeo,
      hl: localeForTrend(brand.language || payload.language || "English", primaryGeo),
      gl: googleSearchGlForTrendGeo(primaryGeo)
    });
  }
  const seeds = buildTitleTrendSeeds(payload, seedInfo);
  if (!seeds.length) {
    throw new Error("未能提取可用于 Google Trends 的搜索词，请补充商品名称或先上传图片让 AI 识别产品。");
  }

  const regions = [];
  const failures = [];
  for (const market of markets) {
    const autocompleteSuggestions = [];
    const relatedQueries = [];
    const sources = [];
    const sourceUrls = [];
    for (const seed of seeds.slice(0, 7)) {
      try {
        const suggestions = await fetchGoogleTrendsAutocomplete(seed, market.hl, config, market.geo);
        if (suggestions.length) {
          sources.push("Google Trends autocomplete");
          sourceUrls.push(`https://trends.google.com/trends/explore?date=today%2012-m&geo=${encodeURIComponent(market.geo)}&q=${encodeURIComponent(seed)}`);
          autocompleteSuggestions.push(...suggestions);
        }
      } catch (error) {
        failures.push(`${market.market}/${seed}: ${error.message}`);
      }

      try {
        const suggestions = await fetchGoogleSearchSuggestions(seed, market.hl, config, market.gl);
        if (suggestions.length) {
          sources.push("Google Search suggestions");
          sourceUrls.push(`https://www.google.com/search?gl=${encodeURIComponent(market.gl)}&hl=${encodeURIComponent(market.hl)}&q=${encodeURIComponent(seed)}`);
          relatedQueries.push(...suggestions);
        }
      } catch (error) {
        failures.push(`${market.market}/${seed}: ${error.message}`);
      }
    }

    regions.push(normalizeTrendRegionSignal({
      market: market.market,
      geo: market.geo,
      language: market.hl,
      search_gl: market.gl,
      source: uniqueStrings(sources, 4),
      source_urls: uniqueStrings(sourceUrls, 8),
      timeframe: "today 12-m",
      seed_queries: filterCommercialSearchTerms(seeds, 10).filter((term) => !findTitleContextMismatches(term, seedInfo).length),
      autocomplete_suggestions: filterCommercialSearchTerms(autocompleteSuggestions, 20).filter((term) => !findTitleContextMismatches(term, seedInfo).length),
      related_queries: filterCommercialSearchTerms(relatedQueries, 20).filter((term) => !findTitleContextMismatches(term, seedInfo).length),
      rising_queries: []
    }));
  }

  const signals = normalizeTitleTrendSignals({
    source: uniqueStrings(regions.flatMap((region) => region.source), 6),
    source_urls: uniqueStrings(regions.flatMap((region) => region.source_urls), 16),
    geo: regions.map((region) => region.geo).filter(Boolean).join("/"),
    language: regions.map((region) => region.language).filter(Boolean).join("/"),
    timeframe: "today 12-m",
    regions
  });

  if (!signals.autocomplete_suggestions.length && !signals.related_queries.length) {
    throw new Error(`Google Trends/搜索建议没有返回可用词汇。${failures[0] ? `原始错误：${failures[0]}` : ""}`);
  }

  return signals;
}

function buildTitleHotSaleBlueprint(platform) {
  if (isTemuPlatform(platform)) {
    return [
      "Temu 爆款标题拆解：不是短品名翻译，而是“核心产品词 + 材质/可见材质外观 + 4 个热搜词(必须 2 个欧洲 + 2 个美国) + 功能卖点 + 适用场景 + 长尾词”的压缩组合。",
      "Temu 中文部分建议 55-85 字符，英文部分建议 105-145 字符，optimized_title 总长目标 180-240 字符；除非商品信息极少，否则低于 170 字符视为失败。",
      "Temu 中文标题必须包含：核心品名、适用/兼容对象、1-2 个真实场景词、1-2 个可见/已知属性词。英文标题必须包含：exact core keyword、compatible object、use case/scenario、category/search modifiers。",
      "Temu 英文标题用英文逗号合理隔开信息块；每个实词首字母大写，介词/连词/冠词等虚词不大写；数字使用阿拉伯数字；计量单位使用 cm/inch、g/oz、kg 等缩写；除逗号、_、.、/、\\ 外不得使用其他符号。",
      "英文标题禁止 Best、Perfect、No.1 等主观形容词，规避普通客户难以理解的行话或行业术语；不能像关键词清单一样无语法堆砌；不允许促销、绝对化、认证、安全/环保/医疗、婴幼儿/未成年人、防水防油防火防护、高低温、助手/帮助、无 XX 成分类表达。"
    ].join("\n");
  }

  return [
    "Amazon 爆款标题拆解：Brand(如有) + 核心产品词 + 材质/可见材质外观 + 4 个热搜词(必须 2 个欧洲 + 2 个美国) + 功能卖点 + 适用场景 + 长尾词。",
    "Amazon 标题目标 140-190 字符，尽量贴近 200 字符上限但不得超过 200；低于 120 字符通常代表结构不完整。",
    "Amazon 前 50-80 字符必须覆盖最大权重核心词和关键属性；后半段用于补充适用对象、场景词、套装/数量和高转化但合规的事实修饰词。",
    "Amazon 英文标题用英文逗号合理隔开信息块；每个实词首字母大写，介词/连词/冠词等虚词不大写；数字使用阿拉伯数字；计量单位使用 cm/inch、g/oz、kg 等缩写；除逗号、_、.、/、\\ 外不得使用其他符号。",
    "Amazon 合规重点：不使用 Best、Perfect、No.1 等主观词、促销词、绝对化词和难懂行业术语；不让同一个非虚词英文词出现超过 2 次。"
  ].join("\n");
}

function buildTitleOptimizationRequest(payload, trendSignals, seedInfo = {}) {
  const platform = normalizePlatformName(payload.platform || payload.brand?.platform || "Temu");
  const productInfo = String(payload.productInfo || "").trim();
  const operatorKeywords = normalizeKeywordList(payload.operatorKeywords).join(", ");
  const packageMode = packageModeLabel(payload.productPackageMode || "single");
  const brandName = String(payload.brandName || payload.brand?.name || "").trim();
  const brand = payload.brand || {};
  const trendPayload = normalizeTitleTrendSignals(trendSignals);
  const isTemu = isTemuPlatform(platform);
  const titleRange = titleTargetRangeForPlatform(platform);
  return [
    `平台: ${platform}`,
    `产品形态: ${packageMode}`,
    `品牌名: ${brandName || "未提供"}`,
    `销售国家/地区: ${brand.region || payload.region || "US"}`,
    `输出语言: ${brand.language || payload.language || "English"}`,
    `商品信息: ${productInfo || "未填写"}`,
    `运营关键词: ${operatorKeywords || "未填写"}`,
    seedInfo.product_identity_zh ? `AI识别产品中文: ${seedInfo.product_identity_zh}` : "",
    seedInfo.product_identity_en ? `AI识别产品英文: ${seedInfo.product_identity_en}` : "",
    seedInfo.category_en ? `AI识别品类: ${seedInfo.category_en}` : "",
    seedInfo.visual_evidence?.length ? `图片可见依据: ${seedInfo.visual_evidence.join("；")}` : "",
    seedInfo.confirmed_uses?.length ? `图片确认用途: ${seedInfo.confirmed_uses.join("；")}` : "",
    seedInfo.compatible_objects?.length ? `适用/兼容对象: ${seedInfo.compatible_objects.join("；")}` : "",
    seedInfo.forbidden_title_concepts?.length ? `禁止误判方向: ${seedInfo.forbidden_title_concepts.join("；")}` : "",
    `Google Trends/搜索信号: ${JSON.stringify(trendPayload, null, 2)}`,
    `标题长度要求: 目标 ${titleRange.target} 字符；最低 ${titleRange.min} 字符；最高 ${titleRange.max} 字符。字符数包含空格和标点。`,
    buildTitleHotSaleBlueprint(platform),
    "请根据平台标题规则、真实商品信息、运营关键词、Google Trends/搜索信号与热销标题结构，一次生成 3 条不同的可直接用于刊登的标题方案。",
    "每条标题都必须按这个结构组织：核心产品词 + 材质/可见材质外观 + 4 个热搜词 + 功能卖点 + 适用场景 + 长尾词；4 个热搜词必须明确来自 2 个欧洲热搜词和 2 个美国热搜词。",
    "必须选择 1 条最推荐标题，给出推荐理由。推荐理由要说明为什么这条在准确性、搜索覆盖、可读性、合规和场景匹配上更优。",
    "英文商品标题必须用英文逗号合理分隔内容；英文标题每个实词首字母大写，但介词、连词、冠词等虚词不大写；尺寸、数量等数字使用阿拉伯数字；计量单位用 cm/inch、g/oz、kg 等缩写。",
    "英文商品标题不得使用除了逗号、_、.、/、\\ 以外的符号；不得使用 Best、Perfect、No.1 等主观形容词；不得使用普通客户难以理解的行话或行业术语。",
    "标题总长 250 字符规定不变；Temu 的 optimized_title 是中文标题 / English Title 的总长度，Amazon 是英文标题长度。",
    "图片事实优先级最高：标题只能写图片、产品名称、商品补充信息或 AI 识别结果支持的用途和适配对象。Google Trends/搜索信号只能用于同一产品事实边界内扩展搜索词，不能改变产品用途。",
    "如果图片识别为打蛋/搅拌防溅盖，标题必须围绕 hand mixer、mixing bowl、egg whisking、batter mixing、baking kitchen tool 等方向；严禁写 microwave、reheating leftovers、food cover、plate cover、dish cover、餐盘碗盘加热、剩菜复热等无依据用途。",
    isTemu
      ? "Temu 重点: 使用中英文对照版本；optimized_title 必须是中文标题 / English Title 的一行对照格式；总字符数不得超过 250 个字符，标点符号也算字符数；标题结构采用核心词 + 适用/兼容对象 + 规格/材质/低风险功能 + 场景 + 类目词。中文和英文都要信息完整，英文不是中文的简短翻译。"
      : "Amazon 重点: 采用品牌/核心词/属性/功能/场景结构；前 50-80 个字符尽量包含最大权重核心词；英文标题 140-190 字符优先；优先保证合规、自然、关键词准确、可读，不堆词。",
    "如果用户只填写产品名称，也必须基于该名称、图片、平台、售卖地区、运营关键词和趋势词生成标题；不要要求用户补齐所有属性。",
    "产品形态必须影响标题结构：单品聚焦单个产品和真实用途；组合装突出组件关系、适配组合或套装购买单位；多 PCS 装突出 pack/set/count 语义，但没有明确数量时不要编造具体数字。",
    "运营关键词只在语义相关时吸收，不要为了堆词而破坏标题自然度；trend_keywords_used 必须列出实际采用的趋势词，至少 2 个，且必须是买家会搜索的商品/场景词。",
    "Google Suggest/Trends 中的 meaning、nearby、do/does/how/what、review、reddit 等信息检索词不能原样进入标题；只能抽取其中有商业搜索价值的商品名、场景名或适用对象词。",
    "标题必须显式组合场景词、高搜索流量词、高转化但合规的事实修饰词、适用对象/兼容对象；只输出核心品名或简单翻译就是失败结果。",
    "严禁出现任何促销类词汇、防水、防油、防火、防护、耐高温、高温、低温、认证、安全、环保、医疗、治疗、婴幼儿、未成年人、母婴、最佳选择、助手、帮助、无XX成分类表达。",
    "输出 JSON schema: {\"platform\":\"...\",\"recommended_index\":1,\"recommendation_reason\":\"...\",\"title_variants\":[{\"optimized_title\":\"...\",\"title_zh\":\"...\",\"title_en\":\"...\",\"structure_breakdown\":{\"core_keyword\":\"...\",\"material\":\"...\",\"us_hot_terms\":[\"\",\"\"],\"eu_hot_terms\":[\"\",\"\"],\"search_keywords\":[\"...\"],\"attributes\":[\"...\"],\"compatibility\":[\"...\"],\"use_cases\":[\"...\"],\"scenario\":\"...\",\"long_tail_terms\":[\"...\"],\"conversion_terms\":[\"...\"],\"operator_keywords_used\":[\"...\"],\"title_formula\":\"核心产品词 + 材质 + 2个欧洲热搜词 + 2个美国热搜词 + 功能卖点 + 适用场景 + 长尾词\",\"compliance_focus\":\"...\"},\"trend_keywords_used\":[\"...\"],\"trend_keywords_by_region\":{\"US\":[\"\",\"\"],\"Europe\":[\"\",\"\"]},\"source_notes\":[\"...\"],\"compliance_notes\":[\"...\"],\"summary\":\"...\"}]}",
    "title_variants 必须刚好 3 条；optimized_title 应等于推荐方案。若平台是 Temu，每条都必须同时给出 title_zh 和 title_en；若平台是 Amazon，可只给 title_en。",
    "请只输出 JSON，不要输出 Markdown。"
  ].filter(Boolean).join("\n");
}

function normalizeTitleStructure(value) {
  const structure = value && typeof value === "object" ? value : {};
  return {
    core_keyword: String(structure.core_keyword || structure.coreKeyword || "").trim(),
    material: String(structure.material || structure.material_keyword || structure.materialKeyword || "").trim(),
    us_hot_terms: normalizeStringList(structure.us_hot_terms || structure.usHotTerms || structure.us_keywords || structure.usKeywords),
    eu_hot_terms: normalizeStringList(structure.eu_hot_terms || structure.euHotTerms || structure.europe_hot_terms || structure.europeHotTerms || structure.eu_keywords || structure.euKeywords),
    search_keywords: normalizeStringList(structure.search_keywords || structure.searchKeywords || structure.traffic_keywords || structure.trafficKeywords),
    attributes: normalizeStringList(structure.attributes || structure.attribute_chain || structure.attributeChain),
    compatibility: normalizeStringList(structure.compatibility || structure.compatible_with || structure.compatibleWith || structure.applicable_to || structure.applicableTo),
    use_cases: normalizeStringList(structure.use_cases || structure.useCases || structure.scenarios),
    scenario: String(structure.scenario || structure.use_scenario || structure.useScenario || "").trim(),
    long_tail_terms: normalizeStringList(structure.long_tail_terms || structure.longTailTerms || structure.long_tail_keywords || structure.longTailKeywords),
    conversion_terms: normalizeStringList(structure.conversion_terms || structure.conversionTerms || structure.conversion_keywords || structure.conversionKeywords),
    operator_keywords_used: normalizeStringList(structure.operator_keywords_used || structure.operatorKeywordsUsed),
    title_formula: String(structure.title_formula || structure.titleFormula || structure.formula || "").trim(),
    compliance_focus: String(structure.compliance_focus || structure.complianceFocus || "").trim()
  };
}

function normalizeTitleRegionKeywordMap(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    US: normalizeStringList(source.US || source.us || source.usa || source.UnitedStates || source.united_states).slice(0, 4),
    Europe: normalizeStringList(source.Europe || source.europe || source.EU || source.eu || source.gb || source.GB).slice(0, 4)
  };
}

function normalizeTitleVariant(payload, value, platform, trendSignals) {
  const pair = splitTitlePair(value?.optimized_title || value?.final_title || value?.title || "");
  let titleZh = String(value?.title_zh || value?.chinese_title || value?.title_cn || pair.title_zh || "").trim();
  let titleEn = String(value?.title_en || value?.english_title || pair.title_en || "").trim();
  let optimizedTitle = String(value?.optimized_title || value?.final_title || value?.title || "").trim()
    || normalizeStringList(value?.alternate_titles || value?.alt_titles || value?.title_variants || value?.alternative_titles)[0]
    || "";

  if (isTemuPlatform(platform)) {
    const repairedPair = splitTitlePair(optimizedTitle);
    if (hasChineseText(titleEn) && hasLatinText(titleZh) && !hasLatinText(titleEn)) {
      [titleZh, titleEn] = [titleEn, titleZh];
    }
    if (titleZh === titleEn && repairedPair.title_zh && repairedPair.title_en) {
      titleZh = repairedPair.title_zh;
      titleEn = repairedPair.title_en;
    }
    if (hasChineseText(titleEn) && repairedPair.title_en) titleEn = repairedPair.title_en;
    if (!hasChineseText(titleZh) && repairedPair.title_zh) titleZh = repairedPair.title_zh;
    if (!optimizedTitle && (titleZh || titleEn)) optimizedTitle = [titleZh, titleEn].filter(Boolean).join(" / ");
    if (!titleZh || !titleEn) {
      titleZh ||= repairedPair.title_zh;
      titleEn ||= repairedPair.title_en;
    }
  } else if (!optimizedTitle && titleEn) {
    optimizedTitle = titleEn;
  }

  const alternateTitles = normalizeStringList(value?.alternate_titles || value?.alt_titles || value?.title_variants || value?.alternative_titles).slice(0, 5);
  const complianceNotes = normalizeStringList(value?.compliance_notes || value?.notes || value?.warnings).slice(0, 6);
  const warnings = normalizeStringList(value?.warnings).slice(0, 6);
  const structureBreakdown = normalizeTitleStructure(value?.structure_breakdown || value?.title_structure || value?.structure);
  const titleStrategy = String(value?.title_strategy || value?.strategy || "").trim();
  const summary = String(value?.summary || value?.explanation || value?.reasoning || "").trim();
  const trendKeywordsUsed = normalizeStringList(value?.trend_keywords_used || value?.trendKeywordsUsed).slice(0, 10);
  const trendKeywordsByRegion = normalizeTitleRegionKeywordMap(value?.trend_keywords_by_region || value?.trendKeywordsByRegion || value?.hot_terms_by_region || value?.hotTermsByRegion);
  if (!trendKeywordsByRegion.US.length && structureBreakdown.us_hot_terms.length) {
    trendKeywordsByRegion.US = structureBreakdown.us_hot_terms.slice(0, 4);
  }
  if (!trendKeywordsByRegion.Europe.length && structureBreakdown.eu_hot_terms.length) {
    trendKeywordsByRegion.Europe = structureBreakdown.eu_hot_terms.slice(0, 4);
  }
  const sourceNotes = normalizeStringList(value?.source_notes || value?.sourceNotes || value?.sources).slice(0, 8);
  const titleLengthLimit = titleLimitForPlatform(platform);

  return {
    optimized_title: optimizedTitle,
    title_zh: titleZh,
    title_en: titleEn || (!isTemuPlatform(platform) ? optimizedTitle : ""),
    alternate_titles: alternateTitles,
    structure_breakdown: structureBreakdown,
    trend_signals: trendSignals,
    trend_keywords_used: trendKeywordsUsed,
    trend_keywords_by_region: trendKeywordsByRegion,
    source_notes: sourceNotes,
    title_strategy: titleStrategy,
    summary,
    compliance_notes: complianceNotes,
    warnings,
    title_length: titleCharLength(optimizedTitle),
    title_length_limit: titleLengthLimit
  };
}

function normalizeTitleOptimizationResult(payload, value) {
  const platform = normalizePlatformName(value?.platform || payload.platform || payload.brand?.platform || "Temu");
  const trendSignals = normalizeTitleTrendSignals(value?.trend_signals || payload.trendSignals || payload.trend_signals);
  const rawVariants = Array.isArray(value?.title_variants) ? value.title_variants
    : Array.isArray(value?.variants) ? value.variants
      : Array.isArray(value?.titles) ? value.titles
        : [];
  const variants = rawVariants
    .map((item) => normalizeTitleVariant(payload, item, platform, trendSignals))
    .filter((item) => item.optimized_title)
    .slice(0, 3);

  if (!variants.length) {
    variants.push(normalizeTitleVariant(payload, value, platform, trendSignals));
  }

  const fallbackAlternates = normalizeStringList(value?.alternate_titles || value?.alt_titles || value?.alternative_titles);
  for (const alternate of fallbackAlternates) {
    if (variants.length >= 3) break;
    variants.push(normalizeTitleVariant(payload, { optimized_title: alternate }, platform, trendSignals));
  }

  const requestedIndex = Number(value?.recommended_index || value?.recommendedIndex || value?.best_index || 1);
  const recommendedIndex = Math.max(1, Math.min(variants.length, Number.isFinite(requestedIndex) ? Math.trunc(requestedIndex) : 1));
  const recommended = variants[recommendedIndex - 1] || variants[0] || normalizeTitleVariant(payload, value, platform, trendSignals);
  const recommendationReason = String(value?.recommendation_reason || value?.recommendationReason || value?.recommended_reason || value?.best_reason || recommended.summary || "").trim();
  const aggregateComplianceNotes = uniqueStrings([
    ...normalizeStringList(value?.compliance_notes || value?.notes),
    ...variants.flatMap((variant) => variant.compliance_notes)
  ], 8);
  const aggregateWarnings = uniqueStrings([
    ...normalizeStringList(value?.warnings),
    ...variants.flatMap((variant) => variant.warnings)
  ], 8);

  return {
    platform,
    optimized_title: recommended.optimized_title,
    title_zh: recommended.title_zh,
    title_en: recommended.title_en,
    alternate_titles: variants
      .filter((_, index) => index !== recommendedIndex - 1)
      .map((variant) => variant.optimized_title)
      .filter(Boolean),
    title_variants: variants,
    recommended_index: recommendedIndex,
    recommendation_reason: recommendationReason,
    structure_breakdown: recommended.structure_breakdown,
    trend_signals: trendSignals,
    trend_keywords_used: recommended.trend_keywords_used,
    trend_keywords_by_region: recommended.trend_keywords_by_region,
    source_notes: recommended.source_notes,
    title_strategy: String(value?.title_strategy || value?.strategy || recommended.title_strategy || "").trim(),
    summary: String(value?.summary || value?.explanation || value?.reasoning || recommended.summary || "").trim(),
    compliance_notes: aggregateComplianceNotes,
    warnings: aggregateWarnings,
    title_length: recommended.title_length,
    title_length_limit: titleLimitForPlatform(platform)
  };
}

function buildTitleOptimizationSystemPrompt(platform) {
  const isTemu = isTemuPlatform(platform);
  const range = titleTargetRangeForPlatform(platform);
  return [
    "You are an ecommerce title optimization agent for cross-border marketplaces.",
    "Return JSON only. No markdown, no code fences, no extra commentary.",
    "Use only the supplied product information, product form, operator keywords, AI product identity, and Google Trends/search-signal data. Do not invent unsupported claims.",
    "Image evidence is the highest-priority source. Google Trends/Search suggestions are only keyword expansion within the image-confirmed product category; they must never override the product identity or intended use visible in the image.",
    "If a search keyword points to a different product category than the image, discard that keyword. Do not use it to make a longer title.",
    "Example boundary: a splatter guard with central beater/handle opening for a hand mixer and mixing bowl is not a microwave plate cover, food cover, dish cover, or leftovers reheating cover.",
    isTemu
      ? "Temu title rules: output a Chinese-English paired title. optimized_title must be one line in this exact idea: 中文标题 / English Title. The whole optimized_title must be <=250 characters including punctuation. Target 180-240 characters and do not go below 170 unless there is truly no more factual information."
      : "Amazon title rules: output an English title. Keep it factual, readable, search-relevant, and within 140-190 characters when possible; never exceed 200 characters.",
    `Length target: ${range.target} characters, minimum ${range.min}, maximum ${range.max}. A short title that only names the product is not acceptable.`,
    "Generate exactly 3 different title variants and mark the best one with recommended_index plus recommendation_reason.",
    "Hot-selling title anatomy must be: Core Product Keyword + Material/Visible Material Look + 4 Hot Search Terms + Functional Selling Point + Applicable Scenario + Long-tail Terms. The 4 hot terms must include exactly 2 Europe terms and 2 US terms from the provided Google Trends/Search signals.",
    "English title punctuation: use commas to separate readable information blocks. Do not use symbols other than comma, underscore, period, slash, and backslash.",
    "English title capitalization: capitalize the first letter of meaningful words, but keep prepositions, conjunctions, and articles lowercase when they are not the first word.",
    "Use Arabic numerals for dimensions and quantities. Use abbreviated measurement units such as cm/inch, g/oz, kg.",
    "Do not use subjective terms such as Best, Perfect, No.1, or obscure industry jargon ordinary shoppers would not understand.",
    "If only a product name is supplied, use the product image, marketplace, region, operator keywords, and search-signal data to infer the common retail category wording. Do not ask for more details.",
    "The product form must change the title structure: single means one product/use case focus; bundle means component or set relationship; multi-PCS means pack/set/count wording without inventing an exact count when it is not supplied.",
    "When operator keywords or Google Trends terms are provided, include only relevant terms that improve search coverage and preserve natural language.",
    "Do not copy question/search-intent terms such as meaning, nearby, do/does/how/what, reviews, or reddit into the title. Extract only retail noun phrases and scenario terms from them.",
    "The final title must include scene/use-case words, high-search retail terms, applicable/compatible object wording, and factual conversion terms when supported.",
    "Never use promotional words, waterproof, oilproof, fireproof, protection, high temperature, low temperature, certification, safety, eco-friendly, medical, treatment, baby/minor/maternity terms, best choice, assistant/help wording, or free-from ingredient claims.",
    "Output schema: {\"platform\":\"...\",\"recommended_index\":1,\"recommendation_reason\":\"...\",\"title_variants\":[{\"optimized_title\":\"...\",\"title_zh\":\"...\",\"title_en\":\"...\",\"structure_breakdown\":{\"core_keyword\":\"...\",\"material\":\"...\",\"us_hot_terms\":[\"\",\"\"],\"eu_hot_terms\":[\"\",\"\"],\"search_keywords\":[\"...\"],\"attributes\":[\"...\"],\"compatibility\":[\"...\"],\"use_cases\":[\"...\"],\"scenario\":\"...\",\"long_tail_terms\":[\"...\"],\"conversion_terms\":[\"...\"],\"operator_keywords_used\":[\"...\"],\"title_formula\":\"...\",\"compliance_focus\":\"...\"},\"trend_keywords_used\":[\"...\"],\"trend_keywords_by_region\":{\"US\":[\"\",\"\"],\"Europe\":[\"\",\"\"]},\"source_notes\":[\"...\"],\"summary\":\"...\",\"compliance_notes\":[\"...\"],\"warnings\":[\"...\"]}],\"trend_signals\":{...},\"summary\":\"...\",\"compliance_notes\":[\"...\"],\"warnings\":[\"...\"]}",
    "Each optimized_title must be a single line that can be used directly in a listing."
  ].join("\n");
}

function amazonRepeatedTitleWords(title) {
  const stopWords = new Set([
    "a", "an", "and", "are", "as", "at", "by", "for", "from", "in", "into", "is", "of", "on", "or", "the", "to", "with", "without"
  ]);
  const counts = new Map();
  for (const word of String(title || "").toLowerCase().match(/[a-z0-9]+/g) || []) {
    if (word.length <= 2 || stopWords.has(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count > 2)
    .map(([word, count]) => `${word}(${count})`);
}

function titleHasRegionHotTerms(result) {
  const byRegion = normalizeTitleRegionKeywordMap(result.trend_keywords_by_region);
  const structure = result.structure_breakdown || {};
  const usTerms = uniqueStrings([...byRegion.US, ...normalizeStringList(structure.us_hot_terms)], 4);
  const euTerms = uniqueStrings([...byRegion.Europe, ...normalizeStringList(structure.eu_hot_terms)], 4);
  return {
    usTerms,
    euTerms,
    hasUs: usTerms.length >= 2,
    hasEu: euTerms.length >= 2
  };
}

function findEnglishTitleSymbolViolations(title) {
  return Array.from(new Set(String(title || "").match(/[^\w\s,./\\]/g) || []));
}

function titleHasStructureCoverage(result) {
  const structure = result.structure_breakdown || {};
  const searchTerms = normalizeStringList(structure.search_keywords);
  const attributes = normalizeStringList(structure.attributes);
  const compatibility = normalizeStringList(structure.compatibility);
  const useCases = normalizeStringList(structure.use_cases);
  const conversionTerms = normalizeStringList(structure.conversion_terms);
  const longTailTerms = normalizeStringList(structure.long_tail_terms);
  const scenario = String(structure.scenario || "").trim();
  return {
    hasCore: Boolean(structure.core_keyword),
    hasSearchTerms: searchTerms.length >= 4 || result.trend_keywords_used.length >= 4,
    hasMaterial: Boolean(structure.material) || attributes.some((item) => /plastic|silicone|steel|glass|wood|cotton|metal|rubber|ceramic|透明|塑料|硅胶|金属|木|棉|陶瓷/i.test(item)),
    hasAttributes: attributes.length >= 1,
    hasApplicability: compatibility.length >= 1 || useCases.length >= 1 || Boolean(scenario),
    hasLongTail: longTailTerms.length >= 1 || searchTerms.some((term) => String(term).split(/\s+/).length >= 3),
    hasConversionTerms: conversionTerms.length >= 1 || attributes.length >= 3
  };
}

function validateTitleOptimizationResult(result, seedInfo = {}) {
  const errors = [];
  const titleText = [result.optimized_title, result.title_zh, result.title_en].filter(Boolean).join(" | ");
  if (!result.optimized_title) {
    errors.push("模型没有返回 optimized_title");
  }

  if (isTemuPlatform(result.platform)) {
    if (!result.title_zh || !result.title_en) {
      errors.push("Temu 标题必须同时返回 title_zh 和 title_en");
    }
    if (!hasChineseText(result.title_zh || result.optimized_title) || !hasLatinText(result.title_en || result.optimized_title)) {
      errors.push("Temu 标题必须是中英文对照版本");
    }
  }

  if (result.title_length > result.title_length_limit) {
    errors.push(`${result.platform} 标题超过 ${result.title_length_limit} 字符，当前 ${result.title_length} 字符`);
  }

  const targetRange = titleTargetRangeForPlatform(result.platform);
  if (result.title_length < targetRange.min) {
    errors.push(`${result.platform} 标题过短：当前 ${result.title_length} 字符，最低需要 ${targetRange.min} 字符；请补充场景词、搜索词、适用对象和真实属性后重写`);
  }

  const bannedTerms = findTitleBannedTerms(titleText);
  if (bannedTerms.length) {
    errors.push(`标题包含禁用词: ${bannedTerms.join(", ")}`);
  }

  const contextMismatches = findTitleContextMismatches(titleText, seedInfo);
  if (contextMismatches.length) {
    errors.push(`标题包含与图片事实冲突的误判用途/品类词: ${contextMismatches.join(", ")}`);
  }

  if (result.trend_keywords_used.length < 2) {
    errors.push("模型没有列出实际采用的 Google Trends/搜索趋势词");
  }

  const regionHotTerms = titleHasRegionHotTerms(result);
  if (!regionHotTerms.hasEu || !regionHotTerms.hasUs) {
    errors.push("标题必须列出并使用 2 个欧洲热搜词和 2 个美国热搜词");
  }

  const coverage = titleHasStructureCoverage(result);
  if (!coverage.hasCore) errors.push("标题结构缺少核心词 core_keyword");
  if (!coverage.hasSearchTerms) errors.push("标题结构缺少 4 个高搜索流量词 search_keywords");
  if (!coverage.hasMaterial) errors.push("标题结构缺少材质/可见材质外观 material");
  if (!coverage.hasAttributes) errors.push("标题结构至少需要 1 个真实属性 attributes");
  if (!coverage.hasApplicability) errors.push("标题结构缺少适用对象/兼容对象/使用场景");
  if (!coverage.hasLongTail) errors.push("标题结构缺少长尾词 long_tail_terms");
  if (!coverage.hasConversionTerms) errors.push("标题结构缺少高转化但合规的事实修饰词 conversion_terms");

  const englishTitle = result.title_en || (!isTemuPlatform(result.platform) ? result.optimized_title : "");
  const invalidSymbols = findEnglishTitleSymbolViolations(englishTitle);
  if (invalidSymbols.length) {
    errors.push(`英文标题包含不允许的符号: ${invalidSymbols.join(" ")}`);
  }

  if (!isTemuPlatform(result.platform)) {
    const repeated = amazonRepeatedTitleWords(result.optimized_title);
    if (repeated.length) {
      errors.push(`Amazon 标题同一非虚词重复超过 2 次: ${repeated.join(", ")}`);
    }
  }

  return errors;
}

function validateTitleOptimizationBundle(result, seedInfo = {}) {
  const errors = [];
  const variants = Array.isArray(result.title_variants) ? result.title_variants : [];
  if (variants.length !== 3) {
    errors.push(`必须返回 3 条标题方案，当前 ${variants.length} 条`);
  }
  if (!result.recommendation_reason) {
    errors.push("必须说明最推荐哪条标题以及推荐原因");
  }
  const seen = new Set();
  variants.forEach((variant, index) => {
    const key = String(variant.optimized_title || "").toLowerCase();
    if (key && seen.has(key)) {
      errors.push(`第 ${index + 1} 条标题与其他方案重复`);
    }
    seen.add(key);
    const variantErrors = validateTitleOptimizationResult({ ...variant, platform: result.platform }, seedInfo);
    errors.push(...variantErrors.map((error) => `第 ${index + 1} 条：${error}`));
  });
  const recommendedIndex = Number(result.recommended_index || 1);
  if (!Number.isInteger(recommendedIndex) || recommendedIndex < 1 || recommendedIndex > Math.max(variants.length, 1)) {
    errors.push("recommended_index 必须指向 1-3 之间的标题方案");
  }
  return errors;
}

function buildTitleRepairRequest(payload, trendSignals, seedInfo, previousOutput, validationErrors) {
  return [
    "上一轮标题没有通过软件校验，请严格修复后重新输出 JSON。",
    `校验失败原因: ${validationErrors.join("；")}`,
    `上一轮模型输出: ${previousOutput || "空"}`,
    "修复重点：必须返回 3 条不同标题方案，并说明最推荐哪条；每条标题必须补齐核心产品词、材质、2 个欧洲热搜词、2 个美国热搜词、功能卖点、适用场景和长尾词；不要为了变长而编造未经图片/商品信息/趋势词支持的参数。",
    "事实修复重点：如果失败原因包含与图片事实冲突的误判用途/品类词，必须完全删除这些词，并回到图片识别出的真实产品用途和兼容对象。",
    buildTitleOptimizationRequest(payload, trendSignals, seedInfo),
    "不要解释修复过程，只返回符合 schema 的 JSON。"
  ].join("\n");
}

async function optimizeTitle(payload) {
  return withTimeout(
    optimizeTitleCore(payload),
    TITLE_OPTIMIZATION_TIMEOUT_MS,
    "标题优化任务超时：提示词模型或趋势词检索没有在 3 分钟内返回，请检查 API 服务、网络或代理后重试。"
  );
}

async function optimizeTitleCore(payload) {
  const config = resolvePromptConfigForPayload(await getConfig(), payload);
  const normalizedPayload = {
    ...payload,
    platform: normalizePlatformName(payload.platform || payload.brand?.platform || "Temu")
  };
  assertVisionPromptModelForPayload(config, normalizedPayload, "Title optimization");

  if (!["Temu", "Amazon"].includes(normalizedPayload.platform)) {
    throw new Error("标题优化目前只支持 Temu 和 Amazon。");
  }

  if (!config.promptApiKey) {
    throw new Error("API_key 未填写：请先在 API 设置中填写提示词模型 API Key。");
  }

  if (!config.promptModel) {
    throw new Error("模型名未填写：请在 API 设置中选择或手动输入 gpt-5.4、gpt-5.5 或其他可用模型名。");
  }

  const seedInfo = await extractTitleSeedInfo(config, normalizedPayload);
  let trendSignals;
  try {
    trendSignals = await fetchTitleTrendSignals(normalizedPayload, seedInfo, config);
  } catch (error) {
    throw new Error(`Google Trends/搜索趋势词检索失败：${error.message}`);
  }

  const systemPrompt = buildTitleOptimizationSystemPrompt(normalizedPayload.platform);
  const images = (normalizedPayload.images || []).slice(0, 1);
  const payloadWithTrend = { ...normalizedPayload, trendSignals };
  let userText = buildTitleOptimizationRequest(normalizedPayload, trendSignals, seedInfo);
  let lastErrors = [];
  let previousOutput = "";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    let text = "";
    try {
      const body = await callPromptModel(config, systemPrompt, userText, images);
      text = responseText(body);
    } catch (error) {
      throw new Error(explainTitleApiError(error, "标题生成 API 调用失败"));
    }

    previousOutput = text;
    const parsed = extractJson(text);
    if (!parsed) {
      lastErrors = ["模型返回内容不是标准 JSON"];
      userText = buildTitleRepairRequest(normalizedPayload, trendSignals, seedInfo, text, lastErrors);
      continue;
    }

    const result = normalizeTitleOptimizationResult(payloadWithTrend, {
      ...parsed,
      trend_signals: parsed.trend_signals || trendSignals
    });

    lastErrors = validateTitleOptimizationBundle(result, seedInfo);
    if (!lastErrors.length) {
      return result;
    }
    userText = buildTitleRepairRequest(normalizedPayload, trendSignals, seedInfo, text, lastErrors);
  }

  throw new Error(`模型返回的标题不符合要求：${lastErrors.join("；") || "未知校验失败"}。上一轮输出：${previousOutput.slice(0, 300)}`);
}

async function callResponsesApi(config, systemPrompt, userText, images, debugLines = []) {
  const url = `${trimSlash(config.promptBaseUrl)}/responses`;
  const safeImages = images.slice(0, 4);
  const content = [{ type: "input_text", text: userText }];
  for (const image of images.slice(0, 4)) {
    content.push({ type: "input_image", image_url: image });
  }

  const options = resolvedPromptApiOptions(config);
  const body = safeImages.length ? {
    model: config.promptModel,
    max_output_tokens: 1800,
    input: [
      { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
      { role: "user", content }
    ]
  } : {
    model: config.promptModel,
    max_output_tokens: 1800,
    instructions: systemPrompt,
    input: userText
  };
  if (options.serviceTier) body.service_tier = "auto";
  if (options.enableThinking) body.reasoning = { effort: "medium" };
  if (options.verbosity) body.text = { verbosity: "medium" };

  try {
    return await requestJson(url, {
      method: "POST",
      headers: authHeaders(config.promptApiKey),
      body: JSON.stringify(body),
      timeoutMs: PROMPT_API_TIMEOUT_MS
    });
  } catch (error) {
    throw appendPromptRequestDebug(error, config, url, "responses", "提示词模型调用", debugLines);
  }
}

async function callChatApi(config, systemPrompt, userText, images, debugLines = []) {
  const url = `${trimSlash(config.promptBaseUrl)}/chat/completions`;
  const options = resolvedPromptApiOptions(config);
  const userContent = images.length
    ? [
        { type: "text", text: userText },
        ...images.slice(0, 4).map((image) => ({ type: "image_url", image_url: { url: image } }))
      ]
    : userText;
  const systemRole = options.developerMessage ? "developer" : "system";
  const normalizedUserContent = !options.arrayMessages && typeof userContent !== "string"
    ? userText
    : userContent;

  const body = {
    model: config.promptModel,
    stream: false,
    max_tokens: 1800,
    messages: [
      { role: systemRole, content: systemPrompt },
      { role: "user", content: normalizedUserContent }
    ]
  };
  if (options.serviceTier) body.service_tier = "auto";
  if (options.enableThinking && shouldSendChatThinkingOption(config)) body.enable_thinking = true;
  if (options.verbosity) body.verbosity = "medium";

  try {
    return await requestJson(url, {
      method: "POST",
      headers: authHeaders(config.promptApiKey),
      body: JSON.stringify(body),
      timeoutMs: PROMPT_API_TIMEOUT_MS
    });
  } catch (error) {
    throw appendPromptRequestDebug(error, config, url, "chat", "提示词模型调用", debugLines);
  }
}

async function callGeminiApi(config, systemPrompt, userText, images, debugLines = []) {
  const model = encodeURIComponent(config.promptModel);
  const baseUrl = trimSlash(config.promptBaseUrl || "https://generativelanguage.googleapis.com/v1beta");
  const url = `${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(config.promptApiKey)}`;
  const parts = [{ text: `${systemPrompt}\n\n${userText}` }];
  for (const image of images.slice(0, 4)) {
    const media = imageDataUrlToPromptMedia(image);
    if (/^https?:\/\//i.test(media.data)) {
      parts.push({ file_data: { mime_type: media.mimeType, file_uri: media.data } });
    } else {
      parts.push({ inline_data: { mime_type: media.mimeType, data: media.data } });
    }
  }
  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: { maxOutputTokens: 1800 }
  };

  try {
    return await requestJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      timeoutMs: PROMPT_API_TIMEOUT_MS
    });
  } catch (error) {
    throw appendPromptRequestDebug(error, config, url.replace(/key=[^&]+/i, "key=***"), "gemini", "提示词模型调用", debugLines);
  }
}

async function callAnthropicApi(config, systemPrompt, userText, images, debugLines = []) {
  const url = `${trimSlash(config.promptBaseUrl || "https://api.anthropic.com/v1")}/messages`;
  const content = [{ type: "text", text: userText }];
  for (const image of images.slice(0, 4)) {
    const media = imageDataUrlToPromptMedia(image);
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: media.mimeType,
        data: media.data
      }
    });
  }
  const body = {
    model: config.promptModel,
    max_tokens: 1800,
    system: systemPrompt,
    messages: [{ role: "user", content }]
  };

  try {
    return await requestJson(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.promptApiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body),
      timeoutMs: PROMPT_API_TIMEOUT_MS
    });
  } catch (error) {
    throw appendPromptRequestDebug(error, config, url, "anthropic", "提示词模型调用", debugLines);
  }
}

function buildAplusWriteRequest(payload = {}) {
  const brand = payload.brand || {};
  const moduleText = uniqueStrings((payload.aplusModules || payload.imageKinds || [])
    .map((item) => typeof item === "string" ? item : (item.module || item.kind || ""))
    .filter(Boolean), 12)
    .join(" / ");
  const productInfo = compactPromptText(payload.productInfo || "", 1800);
  return [
    `商品资料：${productInfo || "未填写"}`,
    `平台：${normalizePlatformName(brand.platform || payload.platform || "Amazon")}`,
    `地区：${brand.region || payload.region || "US"}`,
    `语言：${brand.language || payload.language || "English"}`,
    `A+模块：${moduleText || "默认详情页模块"}`,
    `画幅：${payload.aPlusSize || payload.ratio || "970x600"}`,
    "请为 A+ 详情页帮写可编辑的商品卖点与要求。重点是：真实产品身份、核心卖点、适用人群、使用场景、结构/材质细节、禁止误判点。",
    "不要写虚假认证、夸大承诺、促销词、医疗/安全/环保等高风险承诺。Temu 场景要更保守。",
    "返回严格 JSON，不要 Markdown。字段：product_summary_zh, selling_points_zh(array), detail_focus_areas_zh(array), misjudgment_risks_zh(array), part_function_map_zh(array), correct_use_method_zh, final_prompt_en, warnings(array)。"
  ].join("\n");
}

async function analyzeAplusWritingPrompt(payload, config) {
  const systemPrompt = [
    "你是跨境电商 A+ 详情页文案策划。你只负责把商品事实整理成可编辑的 A+ 卖点与要求。",
    "如果有图片，图片只是商品身份参考；如果没有图片，就根据用户填写的商品名和常见电商语境保守推断，并在 warnings 里说明不确定点。",
    "必须返回严格 JSON。中文字段用简体中文，final_prompt_en 用英文商品身份事实简述。"
  ].join("\n");
  const userText = buildAplusWriteRequest(payload);
  const images = await normalizeImageSourcesForPrompt(payload.images || [], 4);
  const body = await callPromptModel(config, systemPrompt, userText, images);
  const text = responseText(body);
  const parsed = extractJson(text);
  if (!parsed) {
    throw new Error(`A+ AI帮写失败：提示词模型返回内容不是标准 JSON。原始返回：${String(text || "").slice(0, 500)}`);
  }
  const fallbackPrompt = compactPromptText(String(payload.productInfo || "").replace(/\s+/g, " ").trim(), 500);
  return normalizeAnalysisResult(payload, {
    ...parsed,
    final_prompt_en: parsed.final_prompt_en || (fallbackPrompt ? `Product based on user-provided A+ facts: ${fallbackPrompt}` : parsed.product_summary_zh || ""),
    warnings: normalizeStringList(parsed.warnings)
  });
}

async function analyzePrompt(payload) {
  const savedConfig = await getConfig();
  const incomingPromptConfig = payload?.promptConfig && typeof payload.promptConfig === "object" ? payload.promptConfig : null;
  const config = resolvePromptConfigForPayload(savedConfig, payload);
  assertPromptModelConfigured(config, "商品识别/提示词生成");

  assertVisionPromptModelForPayload(config, payload, "Product analysis / prompt generation");

  if (payload?.analysisMode === "aplus-write" && !(Array.isArray(payload.images) && payload.images.filter(Boolean).length)) {
    throw new Error("A+ AI writing requires product images and a multimodal vision model. Pure-text writing is disabled.");
  }

  if (payload?.analysisMode === "aplus-write") {
    return analyzeAplusWritingPrompt(payload, config);
  }

  const systemPrompt = [
    "你是电商商品图视觉策划师和图片生成提示词工程师。",
    "用户上传的图片固定为真实产品图，不是模板案例；你需要识别并保持产品本体，理解商品类型、材质、颜色、核心卖点和适合的电商平台表达。",
    "如果用户只填写产品名称，你也必须基于该名称、目标地区、发布平台和常见零售语境推断真实用途、适配对象、使用动作、买家痛点和禁忌误判点；不要因为信息短就只复述名称。",
    "当品牌主色或字体风格为 auto 时，你必须给出具体可执行的智能主色方案：主色、副色、强调色、中性色、背景色、文字色和选择理由。颜色必须符合产品品类、真实用途、材质、目标地区和平台点击语境；不要输出 auto、generic、随意紫色或只给白灰木色。",
    "不要把外部模板案例当成输入要求；分类图片的风格规则由系统提示词控制，不需要用户上传模板图。",
    "你给出的视觉主题必须适合后续电商作图。卖点图可以围绕痛点解决、材质质感、结构优势、功能步骤、套装价值或数量价值，但每张图只允许一个清晰主题。",
    "如果平台是 Temu，卖点表达必须主动规避高风险词汇、促销词、绝对化词、医疗安全健康环保类高风险表达，以及容易触发审核的材质直述。",
    "Do not plan deleted image categories; the current app generates only SKU image, selling-point image, white-background image, scene image, and Advanced A+.",
    "如果产品有接口、按钮、孔位、螺丝、齿、刀片、透明结构、包装文字、多零件或精细图案，应在 misjudgment_risks 和 detail_focus_areas 中明确需要保真，避免重新设计产品细节。",
    "所有字段名包含 _zh 的值必须使用简体中文表达，禁止返回英文句子；所有字段名包含 _en 的值继续使用英文，供后续生图提示词使用。",
    "输出必须是严格 JSON，不要 Markdown，不要额外解释。",
    "JSON 字段:",
    "product_summary_zh: 中文商品识别摘要;",
    "selling_points_zh: 中文卖点数组;",
    "product_package_mode: 从 single, bundle, multipack 中选择，必须遵守用户产品形态;",
    "product_mechanism: 从 liner, cover, bag, wrap, insert, tray, container, accessory, organizer, tablet, pod, sheet, liquid, textile, tool, bottle_stopper, wearable, apparel, beauty, electronics, furniture, pet, toy, sports, automotive, garden, office, food, decor, unknown 中选择;",
    "quantity_requirement: 若商品信息或图片中能确定购买数量/套装数量则输出，否则空字符串;",
    "unit_of_sale: 消费者买到的形态，例如 stacked paper liners, pack of 100 liners, boxed set;",
    "unit_of_use: 单次使用的形态，例如 one liner placed inside an air fryer basket;",
    "use_relationship: 产品与目标物的真实关系，例如 liner fitted inside air fryer basket with visible rim relation;",
    "regional_use_context: 对象，包含 target_region, marketplace, common_product_name_zh, common_product_name_en, real_use_summary_zh, real_use_summary_en, typical_use_objects_zh, typical_use_objects_en, buyer_pain_points_zh, region_specific_notes_zh, confidence, assumptions_zh。必须说明你按目标地区推断出的真实用途和假设;",
    "brand_palette: 对象，包含 source, theme_name_zh, primary_color, secondary_color, accent_color, neutral_color, background_color, typography_color, palette_reason_zh, usage_en。颜色写清名称和 HEX 或明确色名，不能是 auto;",
    "brand_font_style: 对象，包含 source, name_zh, style_en, usage_en。不能是 auto;",
    "key_action_frames: 英文数组，列出最适合视觉化的关键动作;",
    "detail_focus_areas: 英文数组，列出适合特写的结构/纹理细节;",
    "detail_focus_areas_zh: 中文数组，给用户复核用，必须把 detail_focus_areas 转成自然中文;",
    "misjudgment_risks: 英文数组，列出容易误判或错误生成的地方;",
    "misjudgment_risks_zh: 中文数组，给用户复核用，必须把 misjudgment_risks 转成自然中文;",
    "part_function_map: 英文数组，逐条写清可见部件与用途，例如 peeling blade = peels potato skin; julienne teeth = cuts scallion/carrot strips; handle rivets = fasteners。多功能工具必须明确每个工作端对应的目标物和动作;",
    "part_function_map_zh: 中文数组，给用户复核用，必须把每个部件和对应用途写成中文;",
    "correct_use_method: 英文字符串，写清正确使用方式、产品接触目标物的位置、手持方向和禁止混用的工作端;",
    "correct_use_method_zh: 中文字符串，给用户复核用，必须把 correct_use_method 转成自然中文;",
    "interaction_contract: 对象，包含 grip_area, working_area, target_object, contact_rule, product_state_after_use, target_state_after_use, forbidden_scene_errors。用于锁定使用画面，防止产品插入目标物、折断、融合、反向使用或辅助部件误当主功能;",
    "forbidden_use_errors: 英文数组，列出后续生图必须避免的错误用法，例如 do not use julienne teeth to peel potato skin, do not use serrated comb as the peeling blade, do not reverse the tool orientation;",
    "forbidden_use_errors_zh: 中文数组，给用户复核用，必须把 forbidden_use_errors 转成自然中文;",
    "final_prompt_en: 英文产品身份简报，只描述产品事实、品类、外形、颜色、材质、结构、数量/套装信息、真实用途、适配对象、平台和语言。必须基于图片识别和常见电商语境尽量补全真实产品信息。严禁写品牌色板、HEX 色号、字体策略、构图、背景、灯光、阴影、镜头、排版、画幅比例、分辨率、文字样式、极简风格、白底或任何具体图片类型;",
    "negative_prompt_en: 英文负面提示词;",
    "warnings: 中文注意事项数组。"
  ].join("\n");

  const userText = buildAnalysisRequest(payload);
  const images = await normalizeImageSourcesForPrompt(payload.images || [], 6);
  const endpoint = config.promptEndpoint || "responses";
  const debugLines = [
    `配置来源: ${incomingPromptConfig ? "前端当前设置" : "配置文件"}`,
    `图片数量: ${images.length}`,
    `图片输入: ${images.length ? "是" : "否"}`
  ];

  try {
    let body;
    if (endpoint === "chat") {
      body = await callChatApi(config, systemPrompt, userText, images, debugLines);
    } else if (endpoint === "gemini") {
      body = await callGeminiApi(config, systemPrompt, userText, images, debugLines);
    } else if (endpoint === "anthropic") {
      body = await callAnthropicApi(config, systemPrompt, userText, images, debugLines);
    } else if (endpoint === "auto") {
      body = await callPromptModel(config, systemPrompt, userText, images);
    } else {
      body = await callResponsesApi(config, systemPrompt, userText, images, debugLines);
    }

    const text = responseText(body);
    const parsed = extractJson(text);
    if (parsed?.final_prompt_en) {
      return normalizeAnalysisResult(payload, parsed);
    }
    throw new Error(`商品识别/提示词生成失败：提示词模型返回内容不是标准 JSON 或缺少 final_prompt_en。原始返回：${String(text || "").slice(0, 500)}`);
  } catch (error) {
    throw new Error(error?.message || "商品识别/提示词生成失败");
  }
}

async function runAiWorkspaceChat(payload = {}) {
  const config = resolvePromptConfigForPayload(await getConfig(), payload);
  assertPromptModelConfigured(config, "顶级模型对话");
  const images = await normalizeImageSourcesForPrompt(payload.images || [], 6);
  if (images.length) {
    assertVisionPromptModelForPayload(config, payload, "AI workspace image chat");
  }
  const systemPrompt = [
    "你是这个软件里的顶级模型对话/生图助手。",
    "可以回答日常问题、分析用户上传的文件、识别图片、检查电商作图问题、给出作图或修图建议。",
    "用户问题可以与电商无关；不要强行拉回电商场景。",
    "如果用户上传了可读文件内容，请基于文件内容回答。若附件只包含文件信息或无法读取正文，必须明确说明无法读取正文，不要编造文件内容。",
    "如果用户要求修改图片，请先指出可直接用于作图/改图的简短指令；不要输出冗长提示词，除非用户明确要求。",
    "回答使用用户当前语言，清晰、简短、可执行。"
  ].join("\n");
  const userText = String(payload.message || "").trim();
  if (!userText && !images.length) {
    throw new Error("请输入要问 AI 的内容，或上传图片。");
  }
  const endpoint = config.promptEndpoint || "responses";
  const debugLines = [`图片数量: ${images.length}`];
  let body;
  if (endpoint === "chat") {
    body = await callChatApi(config, systemPrompt, userText || "请分析这张图片。", images, debugLines);
  } else if (endpoint === "gemini") {
    body = await callGeminiApi(config, systemPrompt, userText || "请分析这张图片。", images, debugLines);
  } else if (endpoint === "anthropic") {
    body = await callAnthropicApi(config, systemPrompt, userText || "请分析这张图片。", images, debugLines);
  } else if (endpoint === "auto") {
    body = await callPromptModel(config, systemPrompt, userText || "请分析这张图片。", images);
  } else {
    body = await callResponsesApi(config, systemPrompt, userText || "请分析这张图片。", images, debugLines);
  }
  return { text: responseText(body) };
}

async function runAiWorkspaceImage(payload = {}) {
  const config = await getConfig();
  if ((config.imageProviderType || "grsai") !== "grsai") {
    throw new Error("顶级模型对话/生图当前只完整支持 Grsai 作图协议。");
  }
  if (!(config.imageApiKey || config.grsaiApiKey)) {
    throw new Error("请先在 API 设置中填写作图 API Key。");
  }
  const instruction = String(payload.prompt || payload.message || "").trim();
  if (!instruction) {
    throw new Error("请输入作图或修图指令。");
  }
  const planItem = {
    kind: payload.kind || "顶级模型对话/生图",
    variantIndex: 0,
    totalForKind: 1,
    globalIndex: 0
  };
  const promptItem = {
    index: 0,
    planItem,
    prompt: [
      "Create or edit one image according to the user instruction.",
      "If reference images are provided, preserve the visible subject identity unless the user explicitly asks to change it.",
      "Keep the result physically plausible and avoid warped product parts, fused objects, watermarks, fake logos, dense text, or unsupported claims.",
      `User instruction: ${instruction}`
    ].join("\n"),
    promptSource: "ai-workspace"
  };
  const task = await generateOneImage(
    config,
    {
      ...payload,
      images: (payload.images || []).slice(0, 6),
      resolution: payload.resolution || "1K",
      ratio: payload.ratio || "1:1",
      productPackageMode: "single"
    },
    promptItem,
    1,
    1
  );
  const results = await cacheGeneratedImageResults(normalizeGeneratedTaskResults(task));
  const historyEntry = {
    id: `${Date.now()}`,
    createdAt: new Date().toISOString(),
    featureScope: "ai",
    productInfo: instruction,
    productPackageMode: "single",
    platform: "顶级模型对话/生图",
    resolution: payload.resolution || "1K",
    ratio: payload.ratio || "1:1",
    imageKinds: [{ kind: "顶级模型对话/生图", count: 1 }],
    prompt: instruction,
    promptPlan: [{
      index: 1,
      kind: "顶级模型对话/生图",
      promptSource: "ai-workspace",
      prompt: promptItem.prompt
    }],
    results
  };
  await appendHistory(historyEntry);
  return { result: results[0], results, prompt: promptItem.prompt };
}

function resolvePixelAspectRatio(resolution, ratio) {
  const table = RATIO_SIZES[resolution] || RATIO_SIZES["1K"];
  return table[ratio] || table["1:1"];
}

function resolveGptImage2VipSize(resolution, ratio) {
  const table = GRSAI_GPT_IMAGE_2_VIP_SIZES[normalizeResolution(resolution)] || GRSAI_GPT_IMAGE_2_VIP_SIZES["1K"];
  return table[ratio] || table["1:1"];
}

function resolveGptImage2Size(ratio) {
  return GRSAI_GPT_IMAGE_2_SIZES[ratio] || GRSAI_GPT_IMAGE_2_SIZES["1:1"];
}

function resolveGrsaiImageSize(model, resolution, ratio) {
  const normalized = normalizeResolution(resolution);
  if (isGptImage2Model(model)) return resolveGptImage2Size(ratio);
  if (isGptImage2VipModel(model)) return resolveGptImage2VipSize(normalized, ratio);
  return resolvePixelAspectRatio(normalized, ratio);
}

function aspectRatioInstruction(ratio, size) {
  const value = String(ratio || "1:1").trim() || "1:1";
  const [rawW, rawH] = value.split(":").map((item) => Number(item));
  const shape = rawW && rawH
    ? rawW === rawH
      ? "square"
      : rawW > rawH
        ? "landscape"
        : "portrait"
    : "selected";
  return `Canvas aspect ratio is a hard technical constraint: output exactly ${value} ${shape} composition at ${size}. Do not output a wider, taller, panoramic, cropped, letterboxed, or multi-panel image.`;
}

function grsaiReferenceImageKind(value) {
  const text = String(value || "").trim();
  if (/^https?:\/\//i.test(text)) return "url";
  if (/^file:\/\//i.test(text) || path.isAbsolute(text)) return "local-file";
  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(text)) return "data-url-base64";
  if (text) return "raw-base64";
  return "empty";
}

function normalizeGrsaiReferenceImage(value) {
  const text = String(value || "").trim();
  const dataUrlMatch = text.match(/^data:image\/[a-z0-9.+-]+;base64,([\s\S]+)$/i);
  if (dataUrlMatch) return dataUrlMatch[1].replace(/\s+/g, "");
  return text;
}

async function normalizeGrsaiReferenceImages(images, limit = 6) {
  const normalized = [];
  for (const image of (images || []).slice(0, limit)) {
    const safeImage = await imageSourceToDataUrl(image);
    const reference = normalizeGrsaiReferenceImage(safeImage);
    if (reference) normalized.push(reference);
  }
  return normalized;
}

function splitReferenceLinks(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  return String(value || "")
    .split(/[\r\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function grsaiGenerationReferenceSources(payload = {}, planItem = {}) {
  const productImages = (payload.images || []).filter(Boolean);
  return {
    sources: productImages.slice(0, 6),
    productCount: Math.min(productImages.length, 6),
    styleCount: 0,
    failedDraftCount: 0,
    mode: "product"
  };
}

function grsaiReferenceLockText(payload = {}, planItem = {}, imageCount = 0) {
  const analysis = normalizeAnalysisResult(payload, payload.analysis || {});
  const normalizedPayload = { ...payload, analysis };
  const strategy = visualStrategyFromPayload(normalizedPayload, sanitizeProductIdentityBrief(payload.finalPrompt || analysis.final_prompt_en || ""));
  const referenceInfo = grsaiGenerationReferenceSources(payload, planItem);
  if (!imageCount) {
    return "No product reference image was provided; use the product identity text conservatively and do not invent complex details.";
  }
  return [
    "Reference-image usage is mandatory:",
    "Use the uploaded product image(s) as strict identity references for the product body.",
    "Preserve every visible product part, count, silhouette, color, material, holes, teeth, screws/rivets, seams, cutouts, handle shape, labels, packaging, and included components.",
    "Generate or change only the allowed background, lighting, camera crop, surface, hand/context, and category-specific layout around the product.",
    categoryIdentityAllowance(planItem?.kind, strategy.identityLock || {})
  ].filter(Boolean).join(" ");
}

function summarizeGrsaiReferenceImages(images) {
  const counts = { url: 0, localFile: 0, dataUrlBase64: 0, rawBase64: 0, empty: 0 };
  for (const image of images || []) {
    const kind = grsaiReferenceImageKind(image);
    if (kind === "url") counts.url += 1;
    else if (kind === "local-file") counts.localFile += 1;
    else if (kind === "data-url-base64") counts.dataUrlBase64 += 1;
    else if (kind === "raw-base64") counts.rawBase64 += 1;
    else counts.empty += 1;
  }
  return [
    counts.url ? `URL ${counts.url}` : "",
    counts.localFile ? `本地文件已转base64 ${counts.localFile}` : "",
    counts.dataUrlBase64 ? `dataURL base64 ${counts.dataUrlBase64}` : "",
    counts.rawBase64 ? `裸base64 ${counts.rawBase64}` : "",
    counts.empty ? `空 ${counts.empty}` : ""
  ].filter(Boolean).join("，") || "无";
}

function isTemuPlatform(platform) {
  return String(platform || "").toLowerCase() === "temu";
}

function resolveGenerationRatio(payload, planItem) {
  const platform = normalizePlatformName(payload.brand?.platform || payload.platform || "Amazon");
  if (planItem?.kind === "高级A+" && isTemuPlatform(platform) && payload.aPlusSize === "1:1") {
    return "1:1";
  }
  return payload.ratio || "1:1";
}

async function resolveGrsaiGenerationBody(config, payload, model, prompt, planItem) {
  const resolution = normalizeResolution(payload.resolution);
  const ratio = resolveGenerationRatio(payload, planItem);
  const size = resolveGrsaiImageSize(model, resolution, ratio);
  const referenceSources = grsaiGenerationReferenceSources(payload, planItem);
  const image = await normalizeGrsaiReferenceImages(referenceSources.sources || [], 8);
  const referenceLock = grsaiReferenceLockText(payload, planItem, image.length);
  const promptWithAspect = [aspectRatioInstruction(ratio, size), referenceLock, prompt].filter(Boolean).join("\n\n");
  return {
    model,
    prompt: promptWithAspect,
    image,
    referenceImageSummary: `${summarizeGrsaiReferenceImages(referenceSources.sources || [])}; mode=${referenceSources.mode}; product=${referenceSources.productCount}; style=${referenceSources.styleCount}; primaryStyleIndex=${referenceSources.primaryStyleIndex ?? ""}; failedDraft=${referenceSources.failedDraftCount}`,
    size,
    response_format: "url",
    aspectRatio: ratio,
    imageSize: size
  };
}

function resolveImageConcurrency(config, total) {
  const configured = Number(config.grsaiConcurrency);
  const safeConfigured = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_CONFIG.grsaiConcurrency;
  return Math.max(1, Math.min(total || 1, MAX_IMAGE_CONCURRENCY, Math.floor(safeConfigured)));
}

function withNegativePrompt(prompt, negativePrompt) {
  const builtInNegative = [
    "visible HEX color codes",
    "color palette legend",
    "color swatch row",
    "paint-chip labels",
    "palette names printed in the image",
    "design system spec sheet",
    "physically impossible object intersections",
    "handle passing through product",
    "cover fused to pan handle",
    "floating parts",
    "wrong attachment point",
    "warped product structure",
    "watermark",
    "fake brand logo"
  ].join(", ");
  const extraNegative = [negativePrompt, builtInNegative].filter(Boolean).join(", ");
  return `${prompt}\n\nAvoid: ${extraNegative}`;
}

const PLATFORM_RULES = {
  Amazon: {
    compliance: [
      "Avoid badges, watermarks, fake certification marks, ranking claims, price claims, shipping claims, discount claims, or guarantee claims.",
      "Keep product identity and purchase unit truthful for the selected ecommerce image type."
    ],
    productImage: "Use a product-first product-led image concept with strong clarity and restrained composition."
  },
  Temu: {
    compliance: [
      "Avoid all prohibited or risky Temu wording in the image text: religion or faith references, minors, children, baby or infant references, pregnancy or maternity references, 'free from' or ingredient-exclusion claims, waterproof, oilproof, UV protection, medical, safety, health, eco-friendly, non-toxic, must-have, essential, best helper, best choice, promotion, limited-time offer, protection, BPA, fireproof, anti-theft, anti-scald, heat-resistance temperature claims, below-zero temperature claims, or similar claims.",
      "Avoid directly naming the product material in image copy whenever possible; express benefits through neutral user-facing language instead.",
      "Do not use ranking claims, price claims, discount percentages, shipping promises, guarantee wording, fake certification seals, medical badges, or compliance icons.",
      "Never write dimensions, capacity, temperatures, weight-bearing values, percentage boosts, performance multipliers, compatibility ranges, or technical measurements unless the user provided exact values and the selected image type truly needs them.",
      "If copy is needed, keep it short, concrete, benefit-led, and visually secondary to the product."
    ],
    productImage: "Use a high-click product-led Temu commercial composition with purchase desire. Keep it as a product-led image: product recognition first, mobile thumbnail impact second, and a product-mechanism-selected buying-reason cue third. Optional tiny marketplace label only when it is a safe quantity cue or low-risk result phrase, never a feature poster or infographic."
  },
  Shopee: {
    compliance: [
      "Avoid watermarks, fake badges, oversized promotional copy, price text, discount claims, shipping claims, and montage-like clutter.",
      "Keep the product easy to identify at thumbnail size."
    ],
    productImage: "Use a clean but energetic marketplace-ready product composition optimized for mobile browsing."
  },
  Etsy: {
    compliance: [
      "Avoid fake awards, misleading decorative seals, price claims, and text-heavy promotional poster treatment.",
      "Keep the image authentic and product-led."
    ],
    productImage: "Use an appealing handmade or lifestyle-aware product presentation while preserving accurate product identity."
  }
};

const TYPE_RULES = {
  SKU图: {
    base: "Create exactly one SKU product photo for the exact purchase unit. It is not a use scene, poster, infographic, white cutout, or selling-point image.",
    scene: "Product consistency is the priority. Show the full unit clearly and countably on a clean real photo surface. For bundles, every included component/spec/color must remain visible and truthful. For multi-PCS packs, the count or quantity impression must be obvious without inventing extra pieces. Add only realistic light, contact shadow, clean edges, and material texture.",
    text: "No visible text, icons, labels, callouts, badges, props, hands, people, food, host objects, or decorative items."
  },
  卖点图: {
    base: "Create exactly one ecommerce selling-point image with one clear theme. Allowed themes: pain solved, material texture, structure advantage, correct function, use step, bundle value, quantity value, or easier result.",
    scene: "Choose the most accurate proof format: product plus solved result, correct use action, material/structure proof, compact step, restrained before/after, or purchase-unit value. The product must stay intact, accurate, and responsible for the result. Never show the product broken, inserted into the target, fused with food/host objects, reversed, or using the wrong working part. Keep the prompt and image focused on one idea only.",
    text: "Use at most one short headline and one tiny support phrase. Copy should describe a visible benefit/result or observable detail; avoid long claims, fake numbers, risky measurements, badges, certifications, price, discount, and marketplace names."
  },
  白底图: {
    base: "Create exactly one pure white-background product refinement image.",
    scene: "Only retouch the uploaded product or exact purchase unit: improve material texture, surface clarity, edge cleanliness, lighting balance, small visible defects, dust, and presentation quality. Background must be solid #FFFFFF. Do not redesign the product, change its count, add parts, remove identity details, add props, add a tabletop, or turn it into a scene.",
    text: "No visible text, icon, label, callout, badge, prop, hand, host object, shadowy room, gradient, or decorative element."
  },
  场景图: {
    base: "Create exactly one real lifestyle usage scene with a short title area.",
    scene: "Show where and how the product is naturally used at true scale. Use the interaction contract: correct grip area, correct working part, correct target object, correct contact direction, and truthful after-use state. Product remains recognizable but does not need to dominate the frame. Keep surroundings believable and clean for ecommerce.",
    text: "Add one short title only, preferably 2-5 words in the target language. No long paragraphs, no infographic overlay, no arrows, no dense labels."
  },
  "高级A+": {
    base: "Create exactly one premium ecommerce detail-page module. This is where detail annotation, material/structure close-up, use steps, comparison, set overview, or value story belongs.",
    scene: "Use one coherent module structure with a clear reading path. A detail annotation module may use one macro/near-macro product detail plus up to 3 callouts or magnifier insets pointing to real visible material, structure, edge, rivet, slot, seam, opening, handle, teeth, connector, packaging, or count details. Preserve the advanced A+ restrictions: no fake claims, no unsupported specs, no random collage, no many tiny panels, no product redesign, and no wrong use relationship.",
    text: "Short structured copy is allowed: one headline and up to three concise labels/support points. Every claim must be visually provable from the product facts. Avoid risky measurements, certifications, price, discount, ranking, guarantee, medical/safety/protection claims, and dense paragraphs."
  }
};

function typeRulesFor(kind) {
  return TYPE_RULES[kind] || TYPE_RULES["高级A+"];
}



function categoryEvidenceRule(kind, strategy, platform) {
  const actionText = strategy.keyActions.length
    ? "Action candidates, use only if the selected image type needs action: " + strategy.keyActions.join("; ") + "."
    : "";
  const detailText = strategy.detailFocus.length
    ? "Visible material/structure details to preserve or feature: " + strategy.detailFocus.join("; ") + "."
    : "";
  const riskText = strategy.risks.length
    ? "Hidden accuracy risks to avoid: " + strategy.risks.join("; ") + "."
    : "";
  const partFunctionText = strategy.partFunctionMap.length
    ? "Part-function lock: " + strategy.partFunctionMap.join("; ") + "."
    : "";
  const correctUseText = strategy.correctUseMethod
    ? "Correct use method lock: " + strategy.correctUseMethod + "."
    : "";
  const forbiddenUseText = strategy.forbiddenUseErrors.length
    ? "Forbidden use errors: " + strategy.forbiddenUseErrors.join("; ") + "."
    : "";
  const usageMechanismLock = [partFunctionText, correctUseText, forbiddenUseText].filter(Boolean).join(" ");
  const packageLine = strategy.packageMode === "bundle"
    ? "Bundle rule: show the purchase unit as a coherent bundle; all listed components must stay truthful, countable, and visually distinguishable when the category shows the full set."
    : strategy.packageMode === "multipack"
      ? "Multi-PCS rule: the PCS count and repeated identical pieces must stay truthful; use stacked, grouped, packaged, or countable arrangement when the category shows quantity."
      : "Single-product rule: do not add duplicate pieces, extra accessories, or alternate variants unless the user says they are included.";

  if (kind === "\u0053\u004b\u0055\u56fe") {
    return [
      "SKU image must prove Product consistency and the exact complete purchase unit, not a lifestyle scene.",
      "Every included piece, bundle component, SKU variant, or PCS quantity must remain complete, countable, and visually consistent with the uploaded reference.",
      packageLine,
      usageMechanismLock,
      "Use a clean real product-photo surface only; no use action, no hands, no target object, no decorative props, no text, no callouts.",
      riskText
    ].filter(Boolean).join(" ");
  }

  if (kind === "\u767d\u5e95\u56fe") {
    return [
      "White-background image is product retouch only: solid #FFFFFF background, full product or full purchase unit, clean edge, accurate color/material, subtle shadow only if needed.",
      "Allowed retouch: enhance material texture, sharpen edges, clean dust/small defects, balance light, and improve visible finish. No redesign, no new angle that invents unseen geometry, no props, no text.",
      packageLine,
      usageMechanismLock,
      riskText
    ].filter(Boolean).join(" ");
  }

  if (kind === "\u5356\u70b9\u56fe") {
    return [
      "Selling-point image must use one clear theme only: pain solved, material texture, structure advantage, correct function, short use step, bundle value, quantity value, PCS value, or result proof.",
      "Choose the single theme that best helps a buyer decide; do not combine multiple selling ideas into a long poster.",
      "If action appears, the product must be the cause of the result and the interaction contract must be obeyed; correct grip, correct working part, correct target object, correct contact point, and product after use remains intact.",
      "For material or structure themes, show the real visible part, texture, edge, fastener, slot, seam, connector, handle, blade, teeth, opening, package, or count detail instead of inventing specs.",
      "Use one short headline or concise label only when helpful. Keep copy away from identity-critical product parts.",
      packageLine,
      actionText,
      detailText,
      usageMechanismLock,
      riskText
    ].filter(Boolean).join(" ");
  }

  if (kind === "\u573a\u666f\u56fe") {
    return [
      "Scene image must show believable real-life use evidence at true scale and include one short title.",
      "The short title is a simple scene/result label, not a dense infographic. Keep it readable and away from the product.",
      "The interaction contract is mandatory whenever the product touches another object: correct grip, correct working area, target object, contact rule, product after use, and target after use must not be confused.",
      "Do not show the product broken, inserted into the wrong object, fused with food/host objects, reversed, or using an auxiliary part as the main working part.",
      packageLine,
      actionText,
      usageMechanismLock,
      riskText
    ].filter(Boolean).join(" ");
  }

  if (kind === "\u9ad8\u7ea7A+") {
    return [
      "Advanced A+ is the only place for close-up/detail annotation modules. Detail annotation may use macro or near-macro material/structure proof with labels, leader lines, or magnifier insets.",
      "Use one complete detail-page module: detail annotation, material/structure close-up, use steps, comparison, set overview, bundle/PCS value story, or correct-use guidance.",
      "Every label, icon, callout, or comparison must point to a visible product fact or user-provided fact. Do not invent specs, certifications, dimensions, hidden internals, or unsupported claims.",
      packageLine,
      actionText,
      detailText,
      usageMechanismLock,
      riskText
    ].filter(Boolean).join(" ");
  }

  return [packageLine, actionText, detailText, usageMechanismLock, riskText].filter(Boolean).join(" ");
}

const SELLING_POINT_COPY_HINTS = {
  Temu: "For pain-solution copy, prefer direct but compliant short result phrases that avoid all banned Temu wording. If the pain cannot be stated compliantly, communicate the solved state visually without text.",
  Amazon: "For pain-solution copy, prefer clear, restrained, factual result wording only when needed.",
  Shopee: "For pain-solution copy, prefer short mobile-friendly result text with strong scanning clarity.",
  Etsy: "For pain-solution copy, prefer human, authentic, restrained wording rather than promotional shouting."
};

const VARIATION_RULES = [
  "Variation direction: frontal hero balance, centered product massing, strong clarity.",
  "Variation direction: three-quarter view, stronger depth, product interaction implied.",
  "Variation direction: slightly lower camera angle, more premium commercial drama.",
  "Variation direction: tighter crop with stronger material emphasis and bolder lighting rhythm.",
  "Variation direction: asymmetrical layout with controlled negative space and stronger thumbnail impact.",
  "Variation direction: elevated composition with cleaner geometry and more editorial spacing."
];

const PRODUCT_ONLY_VARIATION_RULES = [
  "Variation direction: front-facing product clarity with exact proportions.",
  "Variation direction: clean three-quarter product angle with exact structure.",
  "Variation direction: slight elevation change to reveal depth without adding context.",
  "Variation direction: tighter product crop while keeping the full purchase unit visible.",
  "Variation direction: orderly set arrangement with every component countable.",
  "Variation direction: material clarity and edge definition, product-only."
];



const SELLING_POINT_VARIATION_RULES = [
  "Selling-point variation: outcome hero information-card. Show the solved result as the main visual, product clearly responsible for it, with one compact benefit headline, generous negative space, and no split-screen comparison.",
  "Selling-point variation: use-action proof card. Show an adult hand or realistic use action demonstrating the product solving one pain point, with one small callout zone and no before/after panel.",
  "Selling-point variation: problem callout layout. Show the pain as a small secondary callout or inset while the product-led image focuses on the product-enabled solved state; do not divide the canvas into equal left/right halves.",
  "Selling-point variation: compact three-step visual flow card. Use three small sequential cues such as pain, product action, result, with the result largest and most readable; no dense feature list.",
  "Selling-point variation: close product plus solved environment. Use a near product view with the surrounding target object visibly improved, supported by 1-2 simple icons only if they clarify the result.",
  "Selling-point variation: before/after comparison only for this variant. Use a restrained split or diagonal comparison with the product causing the improved result, not a repeated generic left-right template.",
  "Selling-point variation: buyer-result badge layout. Product and solved outcome dominate, with one simple low-risk result badge and clean negative space for short copy.",
  "Selling-point variation: pain-free moment. Show the user action becoming easier or tidier in a realistic scene-like infographic, keeping product accuracy and one clear result message."
];

const SCENE_VARIATION_RULES = [
  "Scene variation: natural adult hand in-use action showing the product touching the correct target object at real scale.",
  "Scene variation: target-market adult user partial-body action in the correct environment, ordinary realistic styling, product visible and not blocked.",
  "Scene variation: immediate after-use result proof in the real environment, with the product still recognizable but not staged as a product-led hero.",
  "Scene variation: placement or fit relationship in the correct location, using practical surroundings and no graphics.",
  "Scene variation: process moment with believable adult use motion, natural crop, and enough context to understand where and why the product is used.",
  "Scene variation: shopper scale proof through real surrounding objects and adult hand scale, while avoiding static SKU display or infographic composition.",
  "Scene variation: tidy post-use environment with an adult user nearby or just leaving the frame, product naturally present, no headline, no callouts, no before-after layout.",
  "Scene variation: realistic daily-use environment with the active component emphasized and the full set nearby only if that is natural."
];



const A_PLUS_VARIATION_RULES = [
  "A+ variation: editorial detail-page section with left product/use image and right structured text block, one headline plus 1-3 grounded support points.",
  "A+ variation: hero product/result visual with 3 icon benefits, each tied to a visible product detail or buyer question.",
  "A+ variation: magnifier detail module pointing to one real structure/material detail, supported by short explanation text.",
  "A+ variation: step-by-step use strip with clear reading order, simple icons or numbers, and no unsupported claims.",
  "A+ variation: comparison mini-table or before/after module focused on one shopper decision, not a dense spec sheet.",
  "A+ variation: full-width detail-page banner with organized text zone and one coherent product story."
];

function visualCaseGrammarFor(kind, planItem = {}, strategy = {}) {
  const shared = [
    "Visual case-library quality layer: use a proven prompt-case structure: exact subject, commercial role, composition, camera/lighting, material proof, text policy, and grouped avoid list.",
    "Translate style tags into concrete visual instructions; never copy external prompt examples, never override the uploaded product facts, and never let style become more important than product truth."
  ];
  const kindRules = {
    ["\u0053\u004b\u0055\u56fe"]: [
      "Brand-product photography grammar: exact purchase-unit studio still life, catalog-level clarity, ordered geometry, accurate count, true color, premium material texture, realistic contact shadow, and no editorial props.",
      "Use controlled product arrangement rather than a poster: clean background variation, complete edges, full purchase unit, and enough empty space for marketplace cropping."
    ],
    ["\u767d\u5e95\u56fe"]: [
      "Retouch/cutout grammar: pure product isolation, crisp silhouette, balanced highlights, dust-free edge cleanup, true material finish, and no generated context.",
      "The image should feel like a polished ecommerce product cutout, not a new product rendering or lifestyle composition."
    ],
    ["\u5356\u70b9\u56fe"]: [
      "Information-card selling grammar: one large proof visual, one concise headline zone, one supporting cue or tiny phrase only if useful, clear negative space, and no dense specification sheet.",
      "Choose one layout family only: outcome proof, structure detail, use-step card, restrained comparison, quantity-value card, or problem-result proof."
    ],
    ["\u573a\u666f\u56fe"]: [
      "Scene-narrative grammar: believable real environment, natural camera distance, adult hand/action only if it clarifies use, correct scale, visible product-target relationship, and one short title.",
      "The scene should answer where and how the product is used; avoid advertising collage, infographic overlay, or static product-only display."
    ],
    ["\u9ad8\u7ea7A+"]: [
      "Detail-page module grammar: magazine-like brand-product hierarchy, one dominant visual proof, one planned text zone, up to three grounded callouts/icons/magnifier insets, and a clear reading path.",
      "Pick a module structure that fits the selected A+ objective: detail annotation, material proof, use steps, comparison, set overview, scale guidance, or value story."
    ]
  };
  const moduleLine = kind === "\u9ad8\u7ea7A+" && (planItem.module || planItem.sourceKind)
    ? `Selected module style target: ${publicAplusModuleLabel(planItem.module || planItem.sourceKind)}.`
    : "";
  const mechanismLine = strategy.mechanism
    ? `Product mechanism cue: ${strategy.mechanism}; use style only to clarify this mechanism.`
    : "";
  return [...shared, ...(kindRules[kind] || []), moduleLine, mechanismLine].filter(Boolean).join(" ");
}

function categoryPromptQualityChecklist(kind) {
  const shared = [
    "Final prompt checklist before returning: product identity is stated once; selected category role is unmistakable; composition/camera is concrete; lighting/material words are specific; physical relationship is explicit when any use action appears; text policy is clear; avoid list is short and grouped."
  ];
  const checks = {
    ["\u0053\u004b\u0055\u56fe"]: "SKU quality check: the buyer can tell exactly what arrives, how many pieces/components are included, and nothing in the image looks included unless it belongs to the purchase unit.",
    ["\u767d\u5e95\u56fe"]: "White-background quality check: pure #FFFFFF, full product visibility, crisp edges, accurate count, no tabletop line, no props, no scene, no redesign.",
    ["\u5356\u70b9\u56fe"]: "Selling-point quality check: exactly one buyer reason, one visual proof format, restrained copy, no mixed themes, no unsupported claims, and product remains the cause of the result.",
    ["\u573a\u666f\u56fe"]: "Scene quality check: real-life use, true scale, correct target object and contact rule, one short title, and no infographic clutter.",
    ["\u9ad8\u7ea7A+"]: "A+ quality check: one complete detail-page module, readable hierarchy, every callout tied to visible product proof, and no fake specs or dense paragraphs."
  };
  return [...shared, checks[kind]].filter(Boolean).join(" ");
}

function commercialPolishForKind(kind) {
  const polish = {
    ["\u0053\u004b\u0055\u56fe"]: "premium product catalog photography, ordered arrangement, tactile material clarity, realistic studio shadow, clean crop safety.",
    ["\u767d\u5e95\u56fe"]: "high-end ecommerce retouch, clean silhouette, accurate color, subtle dimensional lighting, no context.",
    ["\u5356\u70b9\u56fe"]: "clean information-card layout, thumbnail-readable hierarchy, product-led proof visual, one concise benefit message, refined empty space.",
    ["\u573a\u666f\u56fe"]: "natural lifestyle photography, believable daily-use context, true scale, practical surroundings, soft commercial light.",
    ["\u9ad8\u7ea7A+"]: "premium detail-page design, magazine-like hierarchy, clear text zone, restrained icon/callout system, product proof first."
  };
  return polish[kind] || "clean ecommerce visual hierarchy, accurate product identity, realistic light, and controlled clutter.";
}

function compactVisualGrammarForKind(kind) {
  const grammar = {
    ["\u0053\u004b\u0055\u56fe"]: "brand-product studio catalog grammar: ordered geometry, countable purchase unit, true color, realistic shadow, tactile material.",
    ["\u767d\u5e95\u56fe"]: "premium retouch/cutout grammar: pure #FFFFFF isolation, crisp silhouette, accurate color, clean edge, truthful material.",
    ["\u5356\u70b9\u56fe"]: "information-card grammar: one proof visual, one short headline zone, one buyer reason, clean negative space.",
    ["\u573a\u666f\u56fe"]: "scene-narrative grammar: real environment, true scale, natural camera distance, correct product-target relationship, one short title.",
    ["\u9ad8\u7ea7A+"]: "detail-page module grammar: dominant proof visual, planned text zone, up to three grounded callouts, clear reading path."
  };
  return grammar[kind] || "clean ecommerce prompt grammar: exact subject, clear role, concrete composition, realistic light, grouped avoid list.";
}



function variationFor(kind, variantIndex, platform = "Amazon") {
  const index = variantIndex % VARIATION_RULES.length;
  if (kind === "\u0053\u004b\u0055\u56fe" || kind === "\u767d\u5e95\u56fe") return PRODUCT_ONLY_VARIATION_RULES[index % PRODUCT_ONLY_VARIATION_RULES.length];
  if (kind === "\u5356\u70b9\u56fe") return SELLING_POINT_VARIATION_RULES[index % SELLING_POINT_VARIATION_RULES.length];
  if (kind === "\u573a\u666f\u56fe") return SCENE_VARIATION_RULES[index % SCENE_VARIATION_RULES.length];
  if (kind === "\u9ad8\u7ea7A+") return A_PLUS_VARIATION_RULES[index % A_PLUS_VARIATION_RULES.length];
  return VARIATION_RULES[index];
}

function countDrivenRule(planItem) {
  if (planItem.kind === "\u5356\u70b9\u56fe" && planItem.totalForKind <= 1) {
    return "Count-driven selling-point rule: because only one selling-point image is requested, choose one strongest theme only: pain solved, material texture, structure advantage, correct function, use step, bundle value, quantity value, or result proof.";
  }
  if (planItem.kind === "\u5356\u70b9\u56fe" && planItem.totalForKind > 1) {
    return "Count-driven selling-point rule: each selling-point image must use a different single theme and a different layout family. Do not repeat the same headline, comparison, scene, material detail, or quantity-value idea.";
  }
  if (planItem.kind === "\u573a\u666f\u56fe" && planItem.totalForKind > 1) {
    return "Count-driven scene rule: each scene must use a different real-use moment, target object, camera distance, or short title while keeping the same correct product interaction contract.";
  }
  if (planItem.kind === "\u9ad8\u7ea7A+" && planItem.totalForKind > 1) {
    return "Count-driven A+ rule: each A+ image should use a different detail-page module objective, such as detail annotation, use steps, material/structure proof, comparison, set overview, or bundle/PCS value story.";
  }
  return "";
}

function professionalQualityRule(kind) {
  const shared = [
    "Professional ecommerce image quality gate: the finished image must answer one shopper question at a glance, keep the product identity accurate, and remain readable as a marketplace thumbnail.",
    "Use visual hierarchy deliberately: one primary subject, one support idea, controlled empty space, realistic shadows/reflections, and no accidental clutter.",
    "Apply commercial prompt-case discipline: subject, role, composition, lighting, material proof, text policy, and avoid list must all be explicit."
  ];
  const byKind = {
    ["\u0053\u004b\u0055\u56fe"]: "Primary shopper question: which exact variant, bundle, or PCS purchase unit will I receive? Prioritize countable components, true colors, accurate arrangement, and clean real-shot texture.",
    ["\u767d\u5e95\u56fe"]: "Primary shopper question: what is the exact product shape and material after clean retouch? Prioritize pure product isolation, full visibility, crisp edges, and no redesign.",
    ["\u5356\u70b9\u56fe"]: "Primary shopper question: what single reason should make me choose this product? Prioritize one clear theme such as material, structure, function, use step, pain solved, bundle value, quantity value, or result proof.",
    ["\u573a\u666f\u56fe"]: "Primary shopper question: how is it used in real life? Prioritize real use relationship, scale, placement, action, short title clarity, and believable context.",
    ["\u9ad8\u7ea7A+"]: "Primary shopper question: why is this product worth choosing? Prioritize detail-page logic, detail annotation, structured proof, readable text zone, and proof tied to the actual product."
  };
  return [...shared, byKind[kind]].filter(Boolean).join(" ");
}

function physicalPlausibilityAuditRule(payload = {}, planItem = {}) {
  const analysis = normalizeAnalysisResult(payload, payload.analysis || {});
  const checks = [
    "Before composing the image, run an internal physical-plausibility audit. Do not write the audit in the image.",
    "Identify every visible object class first: product body, detachable accessory, package, host object, contents/ingredients, user hand/body, tool, surface, background object, text/graphic overlay.",
    "For each object, verify its real structure and ownership: attachment points, handles, openings, rims, lips, seams, hinges, holes, loops, clips, hooks, straps, cords, connectors, buttons, caps, lids, wheels, blades, teeth, folds, layers, thickness, transparent edges, packaging flaps, and which object each part belongs to.",
    "No impossible intersections: no product, handle, strap, cord, hook, clip, lid, cover, liner, cap, guard, tool, utensil, packaging, user hand, furniture, appliance, container, food, plant, or host object may pass through another object, fuse into another object, float without support, duplicate into an impossible shape, or attach to the wrong object.",
    "No false assembly: a detachable product must stay detachable; an accessory must not become a permanent part of the host object; packaging must not merge with the product; a hand must not become part of the product; a support surface must not cut through the product.",
    "Respect contact mechanics: objects that rest, hang, clip, wrap, cover, insert, fit, pour, scrape, cut, clean, store, or organize must show the correct contact surface, insertion depth, rim/edge relationship, gravity direction, shadow, and scale.",
    "Respect occlusion: if one object overlaps another, the front/back relationship, contact shadow, edge continuity, and visible partial shape must be believable. Do not hide a structural contradiction behind blur or text.",
    "Respect functional geometry: the active working part must touch the correct target object; decorative holes, handles, seams, labels, auxiliary teeth, straps, and packaging must not perform the main function unless product facts explicitly say so.",
    "If a requested scene or repair would require unknown geometry not visible in the references, choose a conservative angle or product-only crop rather than hallucinating a new structure."
  ];
  const source = `${payload.productInfo || ""} ${analysis.product_summary_zh || ""} ${analysis.final_prompt_en || ""}`;
  const domainChecks = [
    {
      pattern: /elastic|stretch|disposable\s+food\s+cover|bowl\s+cover|plate\s+cover|food\s+cover|cling|film|wrap|保鲜罩|保鲜膜|食品罩|碗罩|盘罩|松紧|弹性/i,
      text: "Elastic food-cover/wrap distinction check: if the product is an elastic disposable food cover, the gathered elastic rim must wrap around a bowl, plate, or container edge; hands hold only the elastic edge. Do not turn it into a roll of cling film, a flat floating sheet, or a sheet pulled from a cutter box unless the reference clearly shows a roll product."
    },
    {
      pattern: /lid\s*rack|pot\s*lid\s*rack|plate\s*rack|cutting\s*board\s*rack|vertical\s+divider|slots?|锅盖架|盖架|盘架|砧板架|竖槽|分隔柱/i,
      text: "Rack/slot holder check: the base must rest flat on a countertop; lids, plates, trays, or cutting boards must stand between divider posts/slots with correct gravity, scale, and contact shadows. Stored items cannot pierce posts, float above slots, or sit on top of divider tips like shelves."
    },
    {
      pattern: /锅|pot|pan|skillet|saucepan|frying|cookware|cover|lid|guard|liner/i,
      text: "Cookware/cover/liner check: cookware handles belong to the cookware body or rim; covers, guards, lids, liners, mats, and accessories sit on, over, inside, or around the host object only according to real rim/contact geometry. They must not be pierced by, welded to, or merged with cookware handles or the host body."
    },
    {
      pattern: /tool|knife|peeler|slicer|scraper|brush|spatula|scissors|刀|削皮|刨丝|刷|铲|剪/i,
      text: "Hand tool check: the correct working edge or surface must contact the target object. Handles are for gripping only; rivets, hanging holes, decorative holes, seams, or auxiliary teeth cannot perform the main cutting, peeling, scraping, or brushing action unless explicitly supported."
    },
    {
      pattern: /organizer|holder|rack|storage|drawer|shelf|basket|收纳|置物|架|盒|抽屉/i,
      text: "Organizer/storage check: contents must sit inside compartments, slots, shelves, hooks, or pockets with believable gravity and scale. Dividers, rails, drawer walls, hooks, and stored items must not intersect or float."
    },
    {
      pattern: /bag|pouch|wallet|case|sleeve|strap|zipper|包|袋|收纳套|保护套|拉链|肩带/i,
      text: "Bag/case check: openings, zippers, straps, buckles, handles, seams, and contents must connect to the correct textile/plastic/leather body. Straps cannot pass through contents or attach to empty space."
    },
    {
      pattern: /cable|cord|charger|adapter|plug|socket|usb|connector|线|充电|插头|接口/i,
      text: "Cable/electronics check: plugs, ports, buttons, screens, cords, adapters, and connectors must align with the correct sockets and cannot enter impossible surfaces, duplicate, melt into hands, or change connector type."
    },
    {
      pattern: /clothes|shirt|pants|shoe|hat|textile|fabric|garment|衣|裤|鞋|帽|布|织物/i,
      text: "Textile/garment check: folds, seams, straps, sleeves, soles, hems, labels, and body contact must follow fabric physics. Fabric cannot cut through limbs, duplicate seams randomly, or ignore gravity/drape."
    },
    {
      pattern: /bottle|jar|cup|container|box|tray|plate|bowl|瓶|罐|杯|容器|托盘|盘|碗/i,
      text: "Container check: openings, caps, rims, lids, contents, transparency, wall thickness, pouring direction, and contact with surfaces must be coherent. Contents cannot float outside the container or pass through solid walls."
    },
    {
      pattern: /cleaner|tablet|pod|liquid|spray|detergent|清洁|片|胶囊|液体|喷雾/i,
      text: "Consumable/cleaning product check: bare consumables, packaging, liquid, appliance, and target surface must be separated correctly. Packaging must not be placed inside liquid/appliances unless the product facts support it."
    }
  ];
  for (const item of domainChecks) {
    if (item.pattern.test(source)) checks.push(item.text);
  }
  if (analysis.use_relationship) checks.push(`Use relationship to preserve: ${analysis.use_relationship}.`);
  if (analysis.correct_use_method) checks.push(`Correct use method to preserve: ${analysis.correct_use_method}.`);
  if (analysis.forbidden_use_errors?.length) checks.push(`Forbidden physical/use errors: ${analysis.forbidden_use_errors.join("; ")}.`);
  if (planItem.kind) checks.push(`Apply this audit specifically for the selected category ${planItem.kind}; commercial styling never overrides real structure.`);
  return checks.join(" ");
}

function platformRuleFor(platform) {
  return PLATFORM_RULES[platform] || {
    compliance: [
      "Avoid misleading claims, fake badges, price claims, discount claims, shipping claims, guarantee claims, and watermarks."
    ],
    productImage: "Use a product-led ecommerce composition optimized for clarity and clicks."
  };
}

function paletteVisualWords(palette) {
  const parts = [
    palette.primary_color,
    palette.secondary_color,
    palette.accent_color,
    palette.neutral_color,
    palette.background_color,
    palette.typography_color
  ]
    .filter(Boolean)
    .map((value) => String(value)
      .replace(/#[0-9a-f]{3,8}\b/gi, "")
      .replace(/\b(primary|secondary|accent|neutral|background|typography|text|color|brand|custom)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim())
    .filter(Boolean);
  return Array.from(new Set(parts)).slice(0, 5).join(", ") || "category-appropriate commercial colors";
}


function summarizeColorDirection(payload, kind, platform) {
  const analysis = payload.analysis || {};
  const palette = normalizeBrandPalette(payload, analysis);
  if (kind === "\u767d\u5e95\u56fe") {
    return "Color and brand graphics are disabled for white-background images: keep the background pure #FFFFFF and add no accent shapes, gradient, text, or layout surfaces.";
  }
  if (kind === "\u0053\u004b\u0055\u56fe") {
    return "SKU color rule: preserve the real product colors and use only neutral real-shot surface colors. Do not add brand panels, gradients, graphic shapes, decorative accent backgrounds, or artificial color blocks.";
  }
  const paletteWords = paletteVisualWords(palette);
  return [
    "Brand color mood for graphic support: " + paletteWords + ".",
    "Use this color mood only as internal art direction for background accents, subtle support shapes, typography color, or callout styling when the selected category allows graphics.",
    "Never render the palette itself. Do not show color swatches, circular color chips, color bars, color names, HEX codes, style-guide labels, or palette/specification rows in the finished image.",
    "Make the color system intentional but keep it subordinate to the product proof; avoid random stock-photo colors.",
    palette.palette_reason_zh ? "Palette reason: " + palette.palette_reason_zh : ""
  ].filter(Boolean).join(" ");
}


function summarizeTypographyDirection(payload, kind) {
  if (kind === "\u767d\u5e95\u56fe" || kind === "\u0053\u004b\u0055\u56fe") {
    return "Typography rule: no visible text for this category.";
  }
  const font = normalizeFontDirection(payload, payload.analysis || {});
  return "Resolved typography direction: " + font.style_en + ". " + font.usage_en;
}

function summarizeRegionalUseDirection(payload) {
  const context = normalizeRegionalUseContext(payload, payload.analysis || {});
  const pains = context.buyer_pain_points_zh.length
    ? `Buyer pain points from analysis: ${context.buyer_pain_points_zh.join("; ")}.`
    : "";
  const assumptions = context.assumptions_zh ? `Assumption note: ${context.assumptions_zh}` : "";

  return [
    `Regional use context: target region ${context.target_region}, marketplace ${context.marketplace}.`,
    `Common product identity in this market: ${context.common_product_name_en}.`,
    `Real use summary: ${context.real_use_summary_en}.`,
    `Typical use objects/action: ${context.typical_use_objects_en}.`,
    pains,
    context.region_specific_notes_zh ? `Regional note: ${context.region_specific_notes_zh}` : "",
    `Use-confidence: ${context.confidence}.`,
    assumptions,
    "Do not invent a different use case just to make the scene prettier; all usage, props, and buyer-benefit proof must follow this regional product logic."
  ].filter(Boolean).join(" ");
}

function sanitizeTemuCopyHints(text) {
  if (!text) return "";
  const replacements = [
    /waterproof/gi,
    /oilproof/gi,
    /uv protection/gi,
    /medical/gi,
    /safety/gi,
    /health/gi,
    /eco[- ]?friendly/gi,
    /non[- ]?toxic/gi,
    /must[- ]?have/gi,
    /essential/gi,
    /best helper/gi,
    /best choice/gi,
    /limited[- ]?time offer/gi,
    /promotion/gi,
    /protection/gi,
    /bpa/gi,
    /fireproof/gi,
    /anti[- ]?theft/gi,
    /anti[- ]?scald/gi,
    /heat[- ]?resistance[^,.;]*/gi,
    /below[- ]?zero[^,.;]*/gi
  ];

  let sanitized = text;
  for (const pattern of replacements) {
    sanitized = sanitized.replace(pattern, "");
  }
  return sanitized.replace(/\s{2,}/g, " ").trim();
}

function sanitizeProductIdentityBrief(text) {
  if (!text) return "";
  const blockedPatterns = [
    /^Create\s+(?:a|an|one)\s+[^:]{0,260}:\s*/i,
    /^Create\s+(?:a|an|one)\s+[^.]*?\bfeaturing\s+/i,
    /single\s+square/gi,
    /square\s+ecommerce\s+product\s+image/gi,
    /\becommerce\s+product\s+image\b/gi,
    /\b1:1\s+ratio\b/gi,
    /\b[12]K\s+resolution\b/gi,
    /minimal(?:\s+and\s+neat)?\s+composition/gi,
    /neat\s+composition/gi,
    /clear\s+separation\s+from\s+background/gi,
    /soft\s+(?:natural\s+)?lighting/gi,
    /crisp\s+edges/gi,
    /clean\s+modern\s+[^.]*style/gi,
    /\bwhite[-\s]?background\b/gi,
    /\blifestyle\s+scene\b/gi,
    /\bsimple\s+real\s+environment\b/gi,
    /\bcountertop\/tabletop\s+setup\b/gi,
    /Resolved\s+smart\s+palette:[^.]*\./gi,
    /Resolved\s+brand\s+palette[^.]*\./gi,
    /Resolved\s+typography\s+direction:[^.]*\./gi,
    /Brand\s+color\s+mood[^.]*\./gi,
    /Main\s+image\s+color\s+direction[^.]*\./gi,
    /#[0-9a-f]{3,8}\b/gi,
    /Use\s+(?:a\s+)?[^.]*?(?:composition|lighting|edges|background)[^.]*\./gi,
    /visual\s+tone\s+should\s+be[^.]*\./gi,
    /text\s+styling\s+should\s+be[^.]*\./gi,
    /concise\s+english\s+wording\s+only\s+if\s+needed/gi
  ];

  let cleaned = text;
  for (const pattern of blockedPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  return cleaned
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.])/g, "$1")
    .replace(/(?:,\s*){2,}/g, ", ")
    .replace(/\bUse a,\s*/gi, "")
    .replace(/\band\./gi, ".")
    .replace(/,\s*\./g, ".")
    .trim();
}

function inferProductMechanism(text) {
  const value = String(text || "").toLowerCase();
  const checks = [
    ["elastic_cover", /\b(elastic|stretch|shower\s*cap|disposable\s+food\s+cover|bowl\s+cover|plate\s+cover|food\s+storage\s+cover)\b|保鲜罩|食品罩|碗罩|盘罩|弹性|松紧/],
    ["liner", /\b(liner|paper liner|air fryer paper|baking cup|cupcake liner)\b/],
    ["rack", /\b(lid rack|pot lid rack|plate rack|cutting board rack|rack with slots|vertical divider)\b|锅盖架|盖架|盘架|砧板架|竖槽|分隔柱/],
    ["tool", /\b(tool|peeler|cutter|brush|scraper|knife|spatula|julienne|serrated|comb[-\s]*like|comb\s+teeth|bottle\s+opener|open\s+slot|wood\s+handle|rivet)\b|削皮|刨皮|刨丝|削皮刀|刨皮刀|木柄|铆钉|开瓶|梳齿|齿刃|锯齿/],
    ["bottle_stopper", /\b(wine\s+bottle\s+stopper|bottle\s+stopper|wine\s+stopper|press[-\s]*type|press\s+to\s+close|red\s+(?:cylindrical\s+)?plug|sealing\s+plug|bottle\s+mouth)\b|酒瓶塞|红酒塞|封口塞|瓶塞|按压式|红色塞|瓶口/],
    ["cover", /\b(cover|lid|food cover|cap|guard|splash|splatter)\b|[\u76d6\u7f69]|\u9632\u6e85|\u7897\u53e3|\u6405\u62cc/],
    ["wrap", /\b(wrap|film|foil|cling)\b/],
    ["bag", bagEvidencePattern()],
    ["organizer", /\b(organizer|storage|holder|rack)\b/],
    ["container", /\b(container|box|bin|jar|bottle)\b/],
    ["tray", /\b(tray|pan|plate|dish)\b/],
    ["sheet", /\b(sheet|paper|pad|mat)\b/],
    ["textile", /\b(towel|cloth|fabric|blanket|wipe)\b/],
    ["tablet", /\b(tablet|cleaning tablet)\b/],
    ["pod", /\b(pod|capsule)\b/],
    ["liquid", /\b(liquid|spray|gel|solution)\b/],
    ["wearable", /\b(hair tie|hair band|scrunchie|hair clip|ring|bracelet|watch band|glasses|sunglasses|hat|cap|belt)\b|发圈|发绳|头绳|发夹|戒指|手环|表带|眼镜|帽子|腰带/],
    ["apparel", /\b(shirt|dress|pants|leggings|socks|shoes|boots|slipper|jacket|coat|underwear|bra)\b|衣服|连衣裙|裤|袜|鞋|靴|拖鞋|外套|内衣/],
    ["beauty", /\b(makeup|cosmetic|cream|serum|shampoo|skincare|lipstick|mascara|nail|perfume)\b|美妆|化妆|护肤|面霜|精华|洗发|口红|睫毛|指甲|香水/],
    ["electronics", /\b(phone|charger|cable|earbuds|headphones|speaker|lamp|led|camera|keyboard|mouse|adapter|power strip)\b|手机|充电|数据线|耳机|音箱|灯|相机|键盘|鼠标|插座|排插/],
    ["furniture", /\b(chair|table|desk|sofa|shelf|cabinet|bed|mattress|stool)\b|椅|桌|沙发|柜|床|床垫|凳/],
    ["pet", /\b(pet|dog|cat|leash|collar|pet bowl|cat bowl|dog bowl|litter|aquarium)\b|宠物|狗|猫|牵引|项圈|猫碗|狗碗|猫砂|鱼缸/],
    ["toy", /\b(toy|puzzle|doll|blocks|lego|plush|game)\b|玩具|拼图|娃娃|积木|毛绒|游戏/],
    ["sports", /\b(fitness|yoga|dumbbell|resistance band|bike|bicycle|camping|hiking|fishing|gym)\b|健身|瑜伽|哑铃|弹力带|自行车|露营|徒步|钓鱼|运动/],
    ["automotive", /\b(car|auto|vehicle|motorcycle|tire|seat cover|dashboard|windshield)\b|汽车|车载|摩托|轮胎|座套|挡风玻璃/],
    ["garden", /\b(garden|plant|planter|hose|sprinkler|seed|flower|outdoor light)\b|园艺|植物|花盆|水管|喷头|种子|花园/],
    ["office", /\b(office|notebook|pen|marker|folder|label|desk organizer|paper clip)\b|办公|笔记本|钢笔|马克笔|文件夹|标签|回形针/],
    ["food", /\b(food|snack|coffee|tea|candy|chocolate|spice|sauce|drink|beverage)\b|食品|零食|咖啡|茶|糖果|巧克力|香料|酱|饮料/],
    ["decor", /\b(decor|decoration|vase|candle|poster|picture frame|rug|curtain)\b|装饰|花瓶|蜡烛|海报|相框|地毯|窗帘/],
    ["accessory", /\b(accessory|replacement|filter|part|connector)\b/]
  ];

  return checks.find(([, pattern]) => pattern.test(value))?.[0] || "unknown";
}

function inferProductComplexity(text, analysis = {}) {
  const source = [
    text,
    analysis.product_summary_zh,
    analysis.final_prompt_en,
    analysis.use_relationship,
    normalizeStringList(analysis.detail_focus_areas).join(" "),
    normalizeStringList(analysis.misjudgment_risks).join(" ")
  ].filter(Boolean).join(" ").toLowerCase();

  let score = 0;
  const checks = [
    [/\b(button|switch|port|connector|interface|usb|type[- ]?c|plug|socket|screen|display|led|sensor)\b/i, 2],
    [/\b(screw|bolt|rivet|hole|hinge|joint|gear|spring|blade|teeth|serrated|comb|clip|buckle|latch|lock|nozzle|valve)\b/i, 2],
    [/\b(transparent|clear|silicone|mesh|woven|braided|pattern|printed|logo|label|packaging|box text)\b/i, 1],
    [/\b(multi[- ]?part|multiple components|accessories|attachments|adapter|replacement parts|set of|bundle)\b/i, 2],
    [/(按钮|开关|接口|插口|屏幕|显示|灯|传感器|螺丝|铆钉|孔|合页|齿轮|弹簧|刀片|锯齿|梳齿|卡扣|锁扣|喷嘴|阀|透明|网格|编织|图案|印刷|包装|多零件|配件|套装)/i, 2]
  ];

  for (const [pattern, weight] of checks) {
    if (pattern.test(source)) score += weight;
  }

  const detailCount = normalizeStringList(analysis.detail_focus_areas).length;
  const riskCount = normalizeStringList(analysis.misjudgment_risks).length;
  score += Math.min(3, detailCount + riskCount);

  if (score >= 5) return "complex";
  if (score >= 2) return "moderate";
  return "simple";
}

function normalizeStringList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item));
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function uniquePromptFragments(items, limit = 8) {
  const seen = new Set();
  const result = [];
  for (const item of items || []) {
    const text = promptTextField(item, 180);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length >= limit) break;
  }
  return result;
}

function stripUseAndCompositionFromIdentity(text = "") {
  return String(text || "")
    .replace(/\*\*/g, "")
    .replace(/\b(?:Designed|Used|Use it|It is used|Suitable|Compatible|Perfect|Ideal)\s+[^.。]*[.。]/gi, " ")
    .replace(/,?\s*(?:that|which)\s+must\s+(?:sit|rest|fit|attach|clip|wrap|cover|stretch|connect|align|be\s+placed|be\s+shown|go)\b[^.。;]*/gi, " ")
    .replace(/\bmust\s+(?:sit|rest|fit|attach|clip|wrap|cover|stretch|connect|align|be\s+placed|be\s+shown|go)\b[^.。;]*/gi, " ")
    .replace(/\bwithout\s+(?:fusing|merging|passing|touching|intersecting)\b[^.。;]*/gi, " ")
    .replace(/\baround\s+(?:cookware|pan|pot|bowl|plate|container|host|target)\s+geometry\b[^.。;]*/gi, " ")
    .replace(/\b(?:for|with)\s+(?:frying|boiling|cooking|cleaning|washing|storage|draining|serving|organizing)\b[^.。]*[.。]/gi, " ")
    .replace(/\b(?:Create|Make|Generate)\s+[^.。]*(?:image|photo|render|scene|listing|ecommerce)[^.。]*[.。]/gi, " ")
    .replace(/\b(?:Camera|Composition|Background|Lighting|Visual direction|Image-type rule|Commercial role|Shopper question|Physical realism|Text policy|Avoid)\s*:[^.。]*[.。]?/gi, " ")
    .replace(/\b(?:Use relationship|Correct use|Correct use method|Unit of use|Designed use|Real use summary)\s*:[^\n.。]*[.。]?/gi, " ")
    .replace(/\b(?:white[-\s]?background|lifestyle|macro|selling[-\s]?point|SKU|hero|product-led image|detail-page|A\+)\b[^.。]*(?:image|photo|scene|module)[^.。]*[.。]?/gi, " ")
    .replace(/\b(?:Target platform|Marketplace context)\s*:[^\n.。]*/gi, " ")
    .replace(/\b(?:Amazon|Temu|Shopee|Etsy)\b/gi, "ecommerce")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.。])/g, "$1")
    .trim();
}

function inferVisiblePartTerms(source = "") {
  const text = String(source || "").toLowerCase();
  const dictionary = [
    ["wood handle", /\bwood(?:en)?\s+handle\b|木柄|木质手柄|木把/i],
    ["metal rivets", /\brivets?\b|铆钉|固定钉|螺钉|screws?/i],
    ["stainless steel head", /\bstainless|steel|metal head|金属头|不锈钢/i],
    ["comb teeth row", /\bcomb teeth|teeth row|serrated|julienne teeth|齿|梳齿|锯齿|刨丝齿/i],
    ["blade or working edge", /\bblade|cutting edge|peeling edge|刀片|刀口|刃/i],
    ["open slot or cutout", /\bslot|cutout|opening|hole|开槽|开孔|镂空|挂孔/i],
    ["raised rim or lip", /\brim|lip|edge|边缘|包边|凸起/i],
    ["perforations or vent holes", /\bperforation|vent holes?|holes?\b|孔洞|排气孔|圆孔/i],
    ["hinge or folding seam", /\bhinge|fold|seam|折叠|合页|缝线/i],
    ["transparent edge", /\btransparent|clear\b|透明/i],
    ["printed label or logo", /\blogo|label|printed|标志|标签|印刷/i],
    ["package or box", /\bbox|package|packaging|包装|盒/i]
  ];
  return dictionary.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
}

function buildProductIdentityLock(payload = {}, analysis = {}, strategy = {}) {
  const sources = [
    analysis.final_prompt_en,
    payload.finalPrompt,
    analysis.product_summary_zh,
    payload.productInfo,
    normalizeStringList(analysis.detail_focus_areas).join("; "),
    normalizeStringList(analysis.part_function_map).join("; "),
    normalizeStringList(analysis.misjudgment_risks).join("; ")
  ].filter(Boolean).join(" ");
  const rawIdentityBrief = sanitizeProductIdentityBrief(analysis.final_prompt_en || payload.finalPrompt || "");
  const genericIdentityBrief = /uploaded product image|single source of truth|preserve exact product identity|product identity brief only/i.test(rawIdentityBrief);
  const visibleIdentity = compactPromptText(stripUseAndCompositionFromIdentity(
    (!genericIdentityBrief && rawIdentityBrief) || payload.productInfo || analysis.product_summary_zh || sources
  ), 420);
  const visibleParts = uniquePromptFragments([
    ...normalizeStringList(analysis.detail_focus_areas),
    ...inferVisiblePartTerms(sources)
  ], 8);
  const partFunctionMap = uniquePromptFragments(normalizeStringList(analysis.part_function_map), 6);
  const risks = uniquePromptFragments([
    ...normalizeStringList(analysis.misjudgment_risks),
    ...normalizeStringList(analysis.forbidden_use_errors)
  ], 7);
  const unitOfSale = promptTextField(strategy.unitOfSale || analysis.unit_of_sale, 180);
  const useRelationship = promptTextField(strategy.useRelationship || analysis.use_relationship, 260);
  const correctUse = promptTextField(strategy.correctUseMethod || analysis.correct_use_method, 240);
  const mechanism = strategy.mechanism || analysis.product_mechanism || inferProductMechanism(sources);
  const complexity = strategy.complexity || inferProductComplexity(sources, analysis);

  return {
    visibleIdentity,
    visibleParts,
    partFunctionMap,
    risks,
    unitOfSale,
    useRelationship,
    correctUse,
    mechanism,
    complexity
  };
}

function productIdentityLockText(lock = {}, kind = "") {
  const visibleParts = (lock.visibleParts || []).slice(0, 5).join("; ");
  const risks = (lock.risks || []).slice(0, 3).join("; ");
  const lines = [
    "Preserve the exact uploaded product; do not redesign it.",
    lock.visibleIdentity ? `Identity: ${lock.visibleIdentity}.` : "",
    lock.unitOfSale ? `Purchase unit: ${lock.unitOfSale}.` : "",
    visibleParts ? `Keep: ${visibleParts}.` : "",
    risks ? `Avoid: ${risks}.` : "",
    `For ${kind || "this image"}, change presentation only; keep product parts intact.`
  ];
  return compactPromptText(lines.filter(Boolean).join(" "), 520);
}

function categoryIdentityAllowance(kind = "", lock = {}) {
  if (kind === "白底图") {
    return "Identity allowance: product-only cutout behavior. Keep the exact full object visible on #FFFFFF; do not invent unseen backs, accessories, host objects, hands, props, use action, or scene context.";
  }
  if (kind === "SKU图") {
    return "Identity allowance: exact complete purchase unit on a clean real photo surface. Use a real tabletop/countertop background only; no host object, no use action, no hands, no decoration, and no extra included-looking items.";
  }
  if (kind === "场景图") {
    return `Identity allowance: show real use only when the working part and target object are unambiguous. ${lock.useRelationship ? `Use relationship: ${lock.useRelationship}.` : ""} Partial hand or host-object occlusion may touch only simple edges and must not hide identity-critical parts.`;
  }
  if (kind === "卖点图") {
    return `Identity allowance: product is proof of one solved buyer pain, not a broken before-state. ${lock.useRelationship ? `Use relationship: ${lock.useRelationship}.` : ""} Graphics or copy must never cover identity-critical parts.`;
  }
  if (kind === "高级A+") {
    return "Identity allowance: module layouts may include text zones, icons, insets, or steps, but every product depiction and inset must preserve a real visible structure from the reference.";
  }
  return "Identity allowance: preserve the exact reference product and change only the commercial presentation around it.";
}

function normalizeKeywordList(value) {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => normalizeKeywordList(item))
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value !== "string") return [];
  return value
    .split(/[\n,\uFF0C\u3001;\uFF1B|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function visualStrategyFromPayload(payload, identityBrief) {
  const analysis = payload.analysis || {};
  const packageInputs = payload.packageInputs && typeof payload.packageInputs === "object" ? payload.packageInputs : {};
  const productInfo = `${payload.productInfo || ""} ${identityBrief || ""} ${analysis.product_summary_zh || ""}`;
  const packageMode = payload.productPackageMode || analysis.product_package_mode || "single";
  const mechanism = analysis.product_mechanism || inferProductMechanism(productInfo);
  const complexity = inferProductComplexity(productInfo, analysis);
  const defaultUnitOfSale = packageMode === "bundle"
    ? "the complete bundle with all components, sizes, colors, or accessories shown clearly and countably"
    : packageMode === "multipack"
      ? "the full multi-piece purchase unit with visible quantity impression, dense stack, repeated rows, or countable pieces"
      : "the complete single product purchase unit shown clearly";
  const userUnitOfSale = String(packageInputs.unitOfSale || "").trim();
  const userPcsCount = String(packageInputs.pcsCount || "").trim();
  const unitOfSale = userUnitOfSale
    || (packageMode === "multipack" && userPcsCount ? `${userPcsCount} PCS multi-pack purchase unit` : "")
    || analysis.unit_of_sale
    || analysis.quantity_requirement
    || defaultUnitOfSale;
  const unitOfUse = analysis.unit_of_use || "one usable unit shown in a truthful usage relationship";
  const useRelationship = analysis.use_relationship || {
    liner: "the liner must be shown fitted inside the correct basket, tray, pan, or appliance with visible rim, edge, opening, and contact surface relation",
    elastic_cover: "one disposable elastic food cover must stretch around the outside rim of a bowl, plate, or container; the gathered elastic rim and transparent crinkled film must stay visible, and it must not be treated as roll cling film",
    cover: "the cover must be shown covering the correct target object with visible rim, edge, opening, and contact relation",
    wrap: "the wrap must be shown covering or lining the correct object with visible edge and contact relation",
    bag: "the bag must show opening, capacity, contents, or placement relationship",
    rack: "the rack must rest flat on a stable surface; flat items stand between vertical dividers or slots with believable gravity and no intersections",
    organizer: "the organizer must show opening, contents, capacity, and organized result",
    container: "the container must show opening, contents, capacity, or placement relationship",
    tray: "the tray must show top surface, rim, contents, or host-use relation",
    sheet: "the sheet must show edge, layers, fold, texture, or active contact point",
    textile: "the textile must show folded layers, edge, drape, texture, or an active use contact point",
    tablet: "the bare tablet must be separated from packaging and shown with the correct target object",
    pod: "the bare pod must be separated from packaging and shown with the correct target object",
    liquid: "the container, liquid state, and correct target object must be visible",
    tool: "the tool must contact the correct target object while an adult hand performs the key action",
    bottle_stopper: "the red sealing plug must be the lower working end pointing downward into the bottle mouth; the round collar rim, outer body, and top press lever remain above the bottle opening",
    accessory: "the accessory must be shown with the host object, installation position, or fit relationship"
  }[mechanism] || "show a visible action, result, scale, capacity, material, fit, or placement proof instead of an isolated product still life";

  const keyActions = normalizeStringList(analysis.key_action_frames);
  const detailFocus = normalizeStringList(analysis.detail_focus_areas);
  const risks = normalizeStringList(analysis.misjudgment_risks);
  const partFunctionMap = normalizeStringList(analysis.part_function_map || analysis.partFunctionMap);
  const forbiddenUseErrors = normalizeStringList(analysis.forbidden_use_errors || analysis.forbiddenUseErrors);
  const correctUseMethod = String(analysis.correct_use_method || analysis.correctUseMethod || "").trim();
  const interactionContract = analysis.interaction_contract && typeof analysis.interaction_contract === "object" ? analysis.interaction_contract : {};

  const mechanismRules = {
    liner: "Use high-angle or top-down logic when needed so the liner is not mistaken for a bowl or tray; show rim/edge/opening relation and correct host fit.",
    elastic_cover: "Show an elastic food cover stretched over a bowl, plate, or container rim. Hands may touch only the gathered elastic edge; never turn it into a roll of cling film or a floating flat sheet.",
    cover: "Always show covered target object and visible rim/edge/opening relation; never show an empty cover alone as the main proof.",
    wrap: "Show covering, lining, edge adhesion, or contact surface; never show a floating film sheet without a target object.",
    bag: "Show opening, capacity, contents, or organized placement; never show only an empty bag.",
    rack: "Show the rack base, repeated vertical slots, and correctly inserted lids/plates/cutting boards; never let stored items float or pierce divider posts.",
    organizer: "Show contents and organized result; never show an empty organizer as the main proof.",
    container: "Show opening, contents, capacity, or completed placement; avoid empty-container-only scenes.",
    tray: "Show contents, rim, top surface, or host relationship; avoid making it look like a generic bowl.",
    sheet: "Show edge, folds, layers, texture, or active contact; avoid flat blank sheet treatment.",
    textile: "Show fold, drape, thickness, texture, edge, or contact point; avoid flat color-block fabric.",
    tablet: "Use bare product only in use scenes; packaging must not touch liquid, food, appliance, or body.",
    pod: "Use bare product only in use scenes; packaging must not touch liquid, food, appliance, or body.",
    liquid: "Show container, liquid state, and target object; avoid exaggerated splashes or impossible physics.",
    tool: "Show adult hand action and contact between working end and target object; do not make it a static tool portrait.",
    bottle_stopper: "Wine stopper orientation lock: red plug points down into the bottle mouth, collar rim rests on the bottle lip, top press lever stays above the opening; never reverse it.",
    wearable: "Show scale, wearing relation, or set shape without letting a model/body part become the subject.",
    apparel: "Show silhouette, fit, material drape, and size/scale relation without hiding the garment or footwear.",
    electronics: "Show correct connection, port orientation, screen/device relation, or powered result only if realistic; do not invent ports or controls.",
    furniture: "Show scale and room fit while keeping the full functional structure readable.",
    pet: "Show pet scale or pet-use relation only as support; the pet must not cover the product.",
    toy: "Show pieces, play/result context, or scale cue without making the scene about a child or unrelated props.",
    sports: "Show action-ready surface, scale, or use environment while preserving product readability.",
    automotive: "Show correct vehicle part, installation location, or fit relationship; never mount it on the wrong car area.",
    garden: "Show plant, soil, patio, lawn, or outdoor use cue only when it supports product purpose.",
    office: "Show desk/work organization or use result while keeping the product/set dominant.",
    food: "Show packaging and serving/result cue only if truthful; avoid health, ingredient, or performance claims.",
    beauty: "Show product/package, texture, swatch, or application cue without exaggerated body/skin claims.",
    decor: "Show styled interior scale and material mood without clutter or hiding the object.",
    accessory: "Show host object and fit/install relationship; do not show an isolated spare part only."
  };

  const mechanismEvidence = {
    liner: "first visual should prove fit or quantity: liners stacked or fanned with at least one liner fitted inside the correct air fryer basket/tray, visible rim and cavity relation",
    elastic_cover: "first visual should prove elastic cover logic: one transparent crinkled cover stretched around a bowl/plate/container rim, with multipack quantity context only when it helps purchase clarity",
    cover: "first visual should prove covering relation: product covering the target object with edge/rim contact visible",
    wrap: "first visual should prove covering or lining relation with visible edges and contact surface",
    bag: "first visual should prove capacity or organization with contents visible through the opening",
    rack: "first visual should prove slot support: black base on countertop with lids/plates/cutting boards standing between vertical dividers",
    organizer: "first visual should prove organized result and capacity with contents placed inside",
    container: "first visual should prove capacity, contents, or completed placement",
    tray: "first visual should prove size, rim, contents, or host-use relationship",
    sheet: "first visual should prove layers, texture, unfolded edge, or active contact",
    textile: "first visual should prove folded layers, thickness, texture, or drape",
    tablet: "first visual should prove use method or result with bare tablet and correct target object",
    pod: "first visual should prove use method or result with bare pod and correct target object",
    liquid: "first visual should prove application method with container, liquid state, and target object",
    tool: "first visual should prove action: adult hand using the tool on the correct target object",
    bottle_stopper: "first visual should prove correct closure orientation: red sealing plug inserted downward into an opened wine bottle mouth, collar rim visible at the lip, lever above",
    wearable: "first visual should prove complete set or hero piece plus scale/wearing cue; model/body part stays secondary",
    apparel: "first visual should prove fit, silhouette, drape, and complete purchasable garment or footwear",
    electronics: "first visual should prove correct connection, device compatibility context, port orientation, or powered result cue",
    furniture: "first visual should prove scale, structure, and room fit without becoming a wide interior scene",
    pet: "first visual should prove product scale/use with pet or pet-use object as secondary context",
    toy: "first visual should prove complete set, pieces, play value, or result context while keeping product dominant",
    sports: "first visual should prove product scale, action readiness, or correct use environment",
    automotive: "first visual should prove correct fit, installation location, or vehicle-part relationship",
    garden: "first visual should prove outdoor/plant/soil/patio use relation or result",
    office: "first visual should prove desk organization, writing/filing/work result, or complete set value",
    food: "first visual should prove package recognition and appetizing serving cue only when truthful",
    beauty: "first visual should prove package/product, texture/swatch, or application context",
    decor: "first visual should prove styled scale, material, and room-placement appeal",
    accessory: "first visual should prove fit with host object or install position"
  }[mechanism] || "first visual should prove one concrete buying reason: action, result, fit, capacity, quantity, material texture, or complete set";
  const packageEvidence = packageMode === "bundle"
    ? "Bundle mode priority: show the complete set as the buying unit, every component countable and orderly, with a main anchor item plus supporting pieces in a stepped, matrix, or side-by-side layout; do not hide accessories or imply extras."
    : packageMode === "multipack"
      ? "Multi-PCS mode priority: create a strong quantity/value impression using dense visible pieces, orderly stacks, fan layout, repeated rows, transparent-pack density, or stepped piles; quantity text only if explicitly provided."
      : "Single-item mode priority: focus on one product and its strongest usage, fit, material, result, or scale evidence without implying extra pieces.";
  const mainEvidence = `${packageEvidence} ${mechanismEvidence}`;
  const identityLock = buildProductIdentityLock(payload, analysis, {
    mechanism,
    complexity,
    unitOfSale,
    unitOfUse,
    useRelationship,
    keyActions,
    detailFocus,
    risks,
    partFunctionMap,
    forbiddenUseErrors,
    correctUseMethod
  });

  return {
    packageMode,
    mechanism,
    complexity,
    unitOfSale,
    unitOfUse,
    useRelationship,
    keyActions,
    detailFocus,
    risks,
    partFunctionMap,
    forbiddenUseErrors,
    correctUseMethod,
    interactionContract,
    mechanismRule: mechanismRules[mechanism] || "",
    mainEvidence,
    identityLock
  };
}

function productFidelityRule(strategy, kind) {
  const partFunctionLock = strategy.partFunctionMap?.length
    ? `Part-function lock: ${strategy.partFunctionMap.join("; ")}.`
    : "";
  const correctUseLock = strategy.correctUseMethod
    ? `Correct use method lock: ${strategy.correctUseMethod}.`
    : "";
  const forbiddenUseLock = strategy.forbiddenUseErrors?.length
    ? `Forbidden use errors: ${strategy.forbiddenUseErrors.join("; ")}.`
    : "";
  const baseRules = [
    "Product fidelity lock: the uploaded reference and product identity brief are the single source of truth for the product.",
    "Do not change the product type, silhouette, proportions, color placement, material finish, texture, visible logo, brand mark, printed label, handle shape, blade or working-edge arrangement, holes, screws, seams, teeth, connectors, package count, included components, or visible structure.",
    "Do not invent an impossible use method, wrong working end, wrong target object, reversed tool orientation, unsafe-looking interaction, deformation, or extra function.",
    "Part-use accuracy lock: visible parts must be used only for their real function. Never show a serrated comb, teeth row, auxiliary hook, hole, handle, or decorative structure performing the main cutting/peeling/scraping action unless the product facts explicitly say that part does it.",
    partFunctionLock,
    correctUseLock,
    forbiddenUseLock,
    "If the reference or use method is ambiguous, choose a conservative product-only view instead of inventing new parts or a new action."
  ].filter(Boolean);
  const isProductOnlyMain = kind === "\u0053\u004b\u0055\u56fe" || kind === "\u767d\u5e95\u56fe";
  const complexityRule = strategy.complexity === "complex"
    ? (isProductOnlyMain
      ? [
        "Complex-product preservation mode: do not redraw or redesign the product body. Prefer preserved-reference product rendering: keep the visible product surface and details, then improve only scale, crop, rotation, lighting, clean background, and shadow.",
        "Allowed transformations for complex product-only images: scale, crop, flat rotation, slight perspective transform, realistic contact shadow, and exposure cleanup only. Do not generate unseen back, bottom, side, internal parts, new ports, new holes, new buttons, new labels, hands, props, host objects, or a new viewing angle that exposes surfaces missing from the reference.",
        "If the requested pose would require unknown product geometry, use a conservative product-only angle, top-down lay-flat, or near-original view instead of hallucinating details."
      ].join(" ")
      : [
        "Complex-product preservation mode: do not redraw or redesign the product body. Prefer cutout/composite behavior from the uploaded product reference: preserve the visible product surface and details, then generate or adapt only the environment, shadows, hands, and pain/result context around it.",
        "Allowed transformations for complex products: scale, crop, flat rotation, slight perspective transform, realistic contact shadow, and tiny hand/prop occlusion on edges only. Do not generate unseen back, bottom, side, internal parts, new ports, new holes, new buttons, new labels, or a new viewing angle that exposes surfaces missing from the reference.",
        "If the natural use pose needs the product lying flat, tilted, or held in a hand, treat the product like a preserved cutout plane: rotate or perspective-warp only the visible reference face, add the hand/environment around it, and hide no more than a small edge unless the occluded part is simple and predictable.",
        "If the requested pose would require unknown product geometry, use a conservative close-range angle, top-down lay-flat, or near-original view instead of hallucinating details."
      ].join(" "))
    : strategy.complexity === "moderate"
      ? "Moderate-product preservation mode: keep the product structure close to the reference. Use only controlled angle changes, simple rotation, realistic shadows, and conservative context; avoid inventing unseen sides, added parts, or altered details."
      : "Simple-product mode: AI may improve the product presentation more freely, but must still preserve product identity, count, silhouette, color placement, and visible structure.";
  const identityLock = [
    productIdentityLockText(strategy.identityLock || {}, kind),
    categoryIdentityAllowance(kind, strategy.identityLock || {})
  ].filter(Boolean).join(" ");

  if (kind === "\u0053\u004b\u0055\u56fe" || kind === "\u767d\u5e95\u56fe") {
    const categoryRule = kind === "\u0053\u004b\u0055\u56fe"
      ? "For SKU images, a clean tabletop or countertop placement surface is allowed and required, but do not depict use action, people, hands, food, plants, appliances, rooms, host objects, or unrelated props."
      : "For this product-only category, do not depict use action, target objects, people, hands, food, appliances, rooms, or placement context.";
    return [...baseRules, identityLock, complexityRule, categoryRule].join(" ");
  }

  return [
    ...baseRules,
    identityLock,
    complexityRule,
    `Usage truth lock: any hand, action, host object, food, appliance, body, container, or placement must follow the real product relationship: ${strategy.useRelationship}.`
  ].join(" ");
}



function categoryBoundaryRule(kind) {
  const rules = {
    ["\u0053\u004b\u0055\u56fe"]: "Hard category boundary: SKU image is a clean real-shot purchase-unit arrangement. It must not become a lifestyle scene, selling-point infographic, A+ module, white-background cutout, or use demonstration.",
    ["\u5356\u70b9\u56fe"]: "Hard category boundary: selling-point image communicates one selling theme only: pain solved, material texture, structure advantage, correct function, use step, bundle value, quantity value, PCS value, or result proof. It must not become a broad lifestyle photo or dense A+ page.",
    ["\u767d\u5e95\u56fe"]: "Hard category boundary: white-background image is pure white product retouch only. It must not contain scene context, props, hands, graphics, text, surface lines, or product redesign.",
    ["\u573a\u666f\u56fe"]: "Hard category boundary: scene image is real usage evidence with one short title. It must not become a product-only SKU still life, selling-point infographic, A+ module, or wrong-use demonstration.",
    ["\u9ad8\u7ea7A+"]: "Hard category boundary: Advanced A+ is a premium detail-page module. Close-up/detail annotation belongs here; it must use planned hierarchy, concise text/callouts, and visually provable product facts."
  };
  return rules[kind] || "";
}

function outputLayoutRule(kind) {
  if (kind === "\u5356\u70b9\u56fe") return "Output one single finished selling-point image only. Use one intentional layout family and one theme; no contact sheet, random quadrant layout, loose collage, or multiple unrelated ideas in one image.";
  if (kind === "\u9ad8\u7ea7A+") return "Output one single finished ecommerce detail-page module image only. Detail annotation, magnifier inset, callouts, icons, comparison, or step strip are allowed only when they clarify one coherent module.";
  if (kind === "\u573a\u666f\u56fe") return "Output one single finished lifestyle usage image only with one short title. No dense text blocks, no spec table, no callout-heavy infographic, and no split comparison unless the prompt model explicitly selected a restrained result proof.";
  return "Output one single finished image only. Do not output a collage, contact sheet, quadrant layout, split scene, before-after panel, or multiple images combined into one.";
}

function normalizeImageKindSelection(selected) {
  const source = Array.isArray(selected) ? selected : [];
  const seen = new Set();
  const normalized = [];
  for (const item of source) {
    const rawKind = String(item?.kind || "").trim();
    const detailAlias = /\u7279\u5199|\u7ec6\u8282\u6807\u6ce8|\u5546\u54c1\u7ec6\u8282|close\s*-?\s*up|macro/i.test(rawKind);
    const kind = normalizeImageKindName(rawKind);
    let module = item?.module || (/^A\+\//i.test(rawKind) ? rawKind.replace(/^A\+\//i, "").trim() : "");
    if (kind === "\u9ad8\u7ea7A+" && detailAlias && !module) module = "\u7ec6\u8282\u6807\u6ce8\u56fe";
    const dedupeKey = kind === "\u9ad8\u7ea7A+" && module ? kind + ":" + module : kind;
    if (!kind || seen.has(dedupeKey)) continue;
    if (kind === LEGACY_DETAIL_KIND) continue;
    normalized.push({ ...item, kind, module: module || item?.module });
    seen.add(dedupeKey);
  }
  return normalized;
}

function planItemsFromPayload(payload) {
  const selected = normalizeImageKindSelection(payload.imageKinds);
  const items = [];
  for (const item of selected) {
    const count = Math.max(1, Math.min(Number(item.count || 1), MAX_KIND_COUNT));
    for (let variantIndex = 0; variantIndex < count; variantIndex += 1) {
      items.push({ kind: item.kind, sourceKind: item.kind, module: item.module, variantIndex, totalForKind: count });
    }
  }
  return items;
}

function normalizeImageKindName(kind = "") {
  const text = String(kind || "").trim();
  if (!text) return "";
  if (text === LEGACY_DETAIL_KIND) return text;
  if (/^A\+\//i.test(text)) return "\u9ad8\u7ea7A+";
  if (/\u7279\u5199|\u7ec6\u8282\u6807\u6ce8|\u5546\u54c1\u7ec6\u8282|close\s*-?\s*up|macro/i.test(text)) return "\u9ad8\u7ea7A+";
  if (/\u4e3b\u56fe|\u667a\u80fd\u5339\u914d|smart/i.test(text)) return "";
  return ALLOWED_IMAGE_KINDS.has(text) ? text : "";
}

function referenceStrategyLabel(strategy) {
  if (strategy === "detail") return "detail reference strategy";
  return "product reference strategy";
}

function autoReferenceStrategyForKind(kind = "") {
  const text = String(kind || "");
  if (/\u5356\u70b9|\u573a\u666f|\u9ad8\u7ea7A\+|A\+|\u8be6\u60c5|\u7ec6\u8282/.test(text)) return "detail";
  return "main";
}

function resolveReferenceStrategy(payload = {}, planItem = {}) {
  const explicit = String(payload.referenceStrategy || "auto").trim();
  if (["main", "detail"].includes(explicit)) return explicit;
  return autoReferenceStrategyForKind(planItem.kind);
}

function compactPromptText(value, maxLength = 1200) {
  const text = String(value || "")
    .replace(/\r/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength).trim();
  const sentenceEnd = Math.max(
    cut.lastIndexOf("."),
    cut.lastIndexOf(";"),
    cut.lastIndexOf("\n")
  );
  if (sentenceEnd > maxLength * 0.65) return cut.slice(0, sentenceEnd + 1).trim();
  return cut.replace(/[,\s;:.-]+$/g, "").trim();
}

function normalizeFinalImagePromptLanguage(value = "") {
  return String(value || "")
    .replace(/\.\.\.|…/g, "")
    .replace(/单个产品|单品/g, "one product unit")
    .replace(/组合装/g, "bundle")
    .replace(/多\s*PCS\s*装|多PCS装/g, "multi-PCS pack")
    .replace(/购买单位/g, "unit of sale")
    .replace(/按压式红酒塞|按压式酒瓶塞|红酒塞|酒瓶封口塞|酒瓶塞|瓶塞/g, "press-type wine bottle stopper")
    .replace(/红色部分|红色塞入段|红色塞体|红色塞/g, "red sealing plug")
    .replace(/瓶口/g, "bottle mouth")
    .replace(/按压手柄|按压柄|头部开关|拨片|顶部拨片/g, "top press lever")
    .replace(/圆形挡边|圆形领口|挡圈/g, "round collar rim")
    .replace(/场景图/g, "lifestyle usage image")
    .replace(/卖点图/g, "selling-point image")
    .replace(/白底图/g, "white-background image")
    .replace(/主图|智能匹配图|特写图/g, "product image")
    .replace(/高级A\+|详情页/g, "Advanced A+ detail-page")
    .replace(/细节标注图|商品细节图/g, "detail annotation module")
    .replace(/核心卖点图/g, "benefit proof module")
    .replace(/使用场景图/g, "usage scene module")
    .replace(/效果对比图/g, "comparison module")
    .replace(/使用建议图/g, "correct-use guidance module")
    .replace(/[\u3400-\u9fff]+/g, " ")
    .replace(/[，。；：、]/g, ", ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/(?:,\s*){2,}/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();
}

function buildProductFactCard(payload = {}, analysisInput = {}, maxLength = 1400) {
  const analysis = normalizeAnalysisResult(payload, analysisInput || {});
  const brand = payload.brand || {};
  const packageInputs = payload.packageInputs && typeof payload.packageInputs === "object" ? payload.packageInputs : {};
  const interaction = analysis.interaction_contract || {};
  const interactionLine = [
    interaction.grip_area ? `grip ${interaction.grip_area}` : "",
    interaction.working_area ? `working part ${interaction.working_area}` : "",
    interaction.target_object ? `target ${interaction.target_object}` : "",
    interaction.contact_rule ? `contact ${interaction.contact_rule}` : "",
    interaction.product_state_after_use ? `product after use ${interaction.product_state_after_use}` : "",
    interaction.target_state_after_use ? `target after use ${interaction.target_state_after_use}` : ""
  ].filter(Boolean).join("; ");
  const strategyForLock = {
    mechanism: analysis.product_mechanism || inferProductMechanism(`${payload.productInfo || ""} ${analysis.final_prompt_en || ""}`),
    complexity: inferProductComplexity(`${payload.productInfo || ""} ${analysis.final_prompt_en || ""} ${analysis.product_summary_zh || ""}`, analysis),
    unitOfSale: analysis.unit_of_sale || analysis.quantity_requirement || "",
    useRelationship: analysis.use_relationship || "",
    correctUseMethod: analysis.correct_use_method || "",
    detailFocus: normalizeStringList(analysis.detail_focus_areas),
    partFunctionMap: normalizeStringList(analysis.part_function_map),
    forbiddenUseErrors: normalizeStringList(analysis.forbidden_use_errors)
  };
  const identityLock = buildProductIdentityLock(payload, analysis, strategyForLock);
  const identityBrief = identityLock.visibleIdentity || stripUseAndCompositionFromIdentity(sanitizeProductIdentityBrief(analysis.final_prompt_en || payload.finalPrompt || ""));
  const lines = [
    payload.productInfo ? `Operator facts: ${compactPromptText(stripUseAndCompositionFromIdentity(payload.productInfo), 220)}` : "",
    analysis.product_summary_zh ? `AI product summary: ${analysis.product_summary_zh}` : "",
    identityBrief ? `Product identity: ${identityBrief}` : "",
    identityLock.visibleParts?.length ? `Must preserve parts: ${identityLock.visibleParts.slice(0, 6).join("; ")}` : "",
    packageInputs.unitOfSale ? `User unit of sale: ${packageInputs.unitOfSale}` : "",
    packageInputs.bundleComponents ? `Bundle components: ${compactPromptText(packageInputs.bundleComponents, 220)}` : "",
    packageInputs.componentDifferences ? `Bundle differences: ${compactPromptText(packageInputs.componentDifferences, 160)}` : "",
    packageInputs.pcsCount ? `PCS count: ${packageInputs.pcsCount}` : "",
    packageInputs.packArrangement ? `Pack/arrangement: ${compactPromptText(packageInputs.packArrangement, 160)}` : "",
    analysis.unit_of_sale ? `AI unit of sale: ${analysis.unit_of_sale}` : "",
    analysis.unit_of_use ? `Unit of use: ${analysis.unit_of_use}` : "",
    analysis.use_relationship ? `Correct use relationship: ${analysis.use_relationship}` : "",
    analysis.correct_use_method ? `Correct use method: ${analysis.correct_use_method}` : "",
    interactionLine ? `Interaction contract: ${interactionLine}` : "",
    interaction.forbidden_scene_errors?.length ? `Forbidden scene errors: ${interaction.forbidden_scene_errors.slice(0, 4).join("; ")}` : "",
    analysis.part_function_map?.length ? `Part-function facts: ${analysis.part_function_map.slice(0, 5).join("; ")}` : "",
    analysis.detail_focus_areas?.length ? `Visible details: ${analysis.detail_focus_areas.slice(0, 5).join("; ")}` : "",
    analysis.misjudgment_risks?.length ? `Hidden accuracy risks: ${analysis.misjudgment_risks.slice(0, 4).join("; ")}` : "",
    analysis.forbidden_use_errors?.length ? `Hidden forbidden use errors: ${analysis.forbidden_use_errors.slice(0, 4).join("; ")}` : "",
    `Product form: ${payload.productPackageMode || analysis.product_package_mode || "single"}.`,
    `Marketplace context: ${brand.platform || payload.platform || "Amazon"} / ${brand.region || payload.region || "US"} / ${brand.language || payload.language || "English"}.`
  ].filter(Boolean);

  return compactPromptText(lines.join("\n"), maxLength);
}



function normalizePlanText(value, fallback = "") {
  if (value === undefined || value === null) return String(fallback || "").trim();
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizePlanText(item, ""))
      .filter(Boolean)
      .join(" / ") || String(fallback || "").trim();
  }
  if (typeof value === "object") {
    return Object.values(value)
      .map((item) => normalizePlanText(item, ""))
      .filter(Boolean)
      .join(" / ") || String(fallback || "").trim();
  }
  const text = String(value).trim();
  return text && text !== "[object Object]" ? text : String(fallback || "").trim();
}



function referenceStrategyRule(payload, planItem) {
  const strategy = resolveReferenceStrategy(payload, planItem);
  if (strategy === "detail") {
    return [
      "Reference strategy: detail-page workflow.",
      "Use all uploaded product images to understand real materials, structure, use relationship, detail evidence, and unit-of-sale.",
      "Build each image as part of a coherent detail-page reading path while preserving exact product identity.",
      "Reference image order: product references must drive product identity; any generated or style references may guide only composition/background and must never change the product."
    ].join(" ");
  }
  return [
    "Reference strategy: product-reference workflow.",
    "Use uploaded product images as strict product identity references.",
    "Prioritize product fidelity, marketplace clarity, clean commercial composition, and thumbnail readability.",
    "Reference image order: product references must drive product identity; never redraw a similar product from text alone when a product photo is available."
  ].join(" ");
}

function publicMarketplacePhrase(platform) {
  if (platform === "Temu") return "mobile cross-border marketplace";
  if (platform === "Amazon") return "marketplace listing";
  if (platform === "Shopee") return "mobile marketplace";
  if (platform === "Etsy") return "handmade-style marketplace";
  return "ecommerce marketplace";
}

function finalPromptPlatformSanitizerRule(platform) {
  const phrase = publicMarketplacePhrase(platform);
  return [
    "Final image prompt wording rule:",
    `Use generic phrases such as "${phrase}", "ecommerce", "product-led hero image", "selling-point image", "SKU image", "lifestyle usage image", or "detail-page module".`,
    "Do not put marketplace names such as Temu, Amazon, Shopee, or Etsy into the final image prompt as visual words, titles, labels, or style cues.",
    "Marketplace names are internal compliance context only; they must not appear as rendered image text and should not be used as the visible creative style."
  ].join(" ");
}

function sanitizeFinalImagePromptText(prompt = "") {
  const text = String(prompt || "").trim();
  if (!text) return "";
  const cleaned = text
    .replace(/\bTarget platform:\s*(?:Temu|Amazon|Shopee|Etsy)(?:\s+[A-Z]{2})?\.?[^\n]*\n?/gi, "")
    .replace(/\bmarketplace\s+(?:Temu|Amazon|Shopee|Etsy)(?:\s+[A-Z]{2})?\b/gi, "ecommerce marketplace")
    .replace(/\b(?:Temu|Shopee)(?:\s+(?:US|EU|UK|CA|AU))?\s+(?=(?:main|hero|selling|SKU|real-shot|lifestyle|macro|A\+|detail|product|image|marketplace|commerce|listing))/gi, "mobile marketplace ")
    .replace(/\bAmazon(?:\s+(?:US|EU|UK|CA|AU))?\s+(?=(?:main|hero|selling|SKU|real-shot|lifestyle|macro|A\+|detail|product|image|marketplace|commerce|listing))/gi, "marketplace ")
    .replace(/\bEtsy(?:\s+(?:US|EU|UK|CA|AU))?\s+(?=(?:main|hero|selling|SKU|real-shot|lifestyle|macro|A\+|detail|product|image|marketplace|commerce|listing))/gi, "ecommerce ")
    .replace(/\bfor\s+(?:Temu|Amazon|Shopee|Etsy)(?:\s+[A-Z]{2})?\b/gi, "for an ecommerce marketplace")
    .replace(/\bon\s+(?:Temu|Amazon|Shopee|Etsy)(?:\s+[A-Z]{2})?\b/gi, "on a marketplace")
    .replace(/\b(?:Temu|Amazon|Shopee|Etsy)(?:\s+(?:US|EU|UK|CA|AU))?\b/gi, "ecommerce")
    .replace(/\becommerce\s+ecommerce\b/gi, "ecommerce")
    .replace(/\bmobile marketplace marketplace\b/gi, "mobile marketplace")
    .replace(/\bmarketplace marketplace\b/gi, "marketplace")
    .replace(/\.\.\.|…/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return normalizeFinalImagePromptLanguage(cleaned);
}

function sentenceCaseLine(value = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.endsWith(".") || text.endsWith("!") || text.endsWith("?") ? text : `${text}.`;
}

function promptTextField(value = "", maxLength = 420) {
  return compactPromptText(normalizePlanText(value, ""), maxLength)
    .replace(/\s+/g, " ")
    .trim();
}

function isInternalLocalPromptText(text = "") {
  return /Product fact card|Selected image category|Marketplace compliance guidance|Hard category boundary|Product fidelity lock|Final image prompt wording rule/i.test(String(text || ""));
}

function modelPromptFactSourceText(facts = {}) {
  return [
    facts.productFacts,
    facts.identityLock,
    facts.unitOfSale,
    facts.useRelationship,
    facts.correctUse,
    facts.partFunctions,
    facts.visibleParts,
    facts.detailFocus
  ].filter(Boolean).join(" ");
}

function modelCreativeBrief(prompt = "", facts = null) {
  const text = sanitizeFinalImagePromptText(prompt);
  if (!text || isInternalLocalPromptText(text)) return "";
  if (facts && unsupportedForeignMechanicConflict(text, modelPromptFactSourceText(facts))) return "";
  return compactPromptText(text.replace(/\s+/g, " "), 320);
}

function publicKindLabel(kind) {
  const labels = {
    SKU图: "SKU purchase-unit image",
    白底图: "pure white-background product image",
    卖点图: "selling-point image",
    场景图: "lifestyle usage image",
    "高级A+": "detail-page module image"
  };
  return labels[kind] || "ecommerce product image";
}

function modelSpecificTextPolicy(kind, platform) {
  const languageLock = "Visible image text must be English words only. Do not render Chinese, CJK characters, pinyin, or mixed-language text.";
  if (kind === "SKU图" || kind === "白底图") {
    return "No visible text, no badges, no watermarks, no logos that are not already on the product.";
  }
  if (kind === "场景图") {
    return `Use one short title only, in English only; no badges, dense labels, watermarks, or extra paragraphs. ${languageLock}`;
  }
  if (kind === "卖点图") {
    return platform === "Temu"
      ? `Visible copy is optional; if used, use one very short neutral English benefit headline and at most one tiny support phrase, with no numbers, technical claims, material claims, badges, or marketplace names. ${languageLock}`
      : `Use at most one short English benefit headline and one tiny support phrase only if it improves the image; keep copy readable and visually secondary. ${languageLock}`;
  }
  if (kind === "高级A+") {
    return `Short structured English copy is allowed: one headline and up to three visually provable support points; avoid dense paragraphs, numbers, certifications, risky claims, and marketplace names. ${languageLock}`;
  }
  return `Keep any visible text minimal, readable, secondary, and English only. ${languageLock}`;
}

function finalPromptMaxLengthForKind(kind = "", profile = {}) {
  if (kind === "白底图") return 1900;
  if (kind === "SKU图") return 2000;
  if (kind === "场景图") return Math.min(profile.maxLength || 2600, 2600);
  if (kind === "卖点图") return Math.min(profile.maxLength || 2600, 2600);
  if (kind === "高级A+") return Math.min(profile.maxLength || 2700, 2700);
  return Math.min(profile.maxLength || 2500, 2500);
}

function modelSpecificAvoidText(kind, platform, negativePrompt = "") {
  const shared = [
    "marketplace names as text",
    "fake logos or watermarks",
    "unsupported claims or badges",
    "price, discount, ranking, shipping, guarantee, certification",
    "dimensions, capacity, temperature, percentages, technical measurements",
    "color swatches, HEX codes, palette labels",
    "object intersections, fused parts, floating parts, wrong attachments, warped structure",
    "garbled text, misspelled text, unreadable labels, excessive copy, generic stock-photo props"
  ];
  if (kind === "SKU图") {
    shared.push("props, decorative accessories, plants, cookware or host objects, food, hands, people, text, icons, labels, callouts, infographic layout, editorial poster treatment, repeated identical background across SKU images");
  }
  if (kind === "白底图") {
    shared.push("props, hands, host objects, room context, tabletop line, gradients, text, icons, background texture, decorative shadow scene");
  }
  if (kind === "卖点图") {
    shared.push("multiple unrelated themes, dense infographic poster, feature list wall, fake specification table, too many icons, callouts covering the product, before-state showing the uploaded product broken");
  }
  if (kind === "场景图") {
    shared.push("infographic overlays, arrows, dense labels, long text blocks, wrong use action, wrong after-use state, product-only still life, staged catalog display");
  }
  if (kind === "高级A+") {
    shared.push("random collage, many tiny panels, fake cross-sections, unsupported internal structure, dense paragraph layout, more than three callouts unless user explicitly asks");
  }
  if (platform === "Temu") {
    shared.push("risky medical, safety, protection, waterproof, oilproof, heat-resistance, eco, non-toxic, free-from, child/baby/pregnancy wording");
  }
  if (negativePrompt) shared.push(negativePrompt);
  return Array.from(new Set(shared.map((item) => String(item || "").trim()).filter(Boolean))).join("; ");
}

function conciseProductIdentityForImage(payload = {}, analysis = {}, strategy = {}, maxLength = 420) {
  const lock = strategy.identityLock || buildProductIdentityLock(payload, analysis, strategy);
  const identityBrief = lock.visibleIdentity || stripUseAndCompositionFromIdentity(sanitizeProductIdentityBrief(analysis.final_prompt_en || payload.finalPrompt || ""));
  const fallbackFacts = [analysis.product_summary_zh, payload.productInfo].filter(Boolean).join(" ");
  const facts = identityBrief || fallbackFacts;
  const compact = stripUseAndCompositionFromIdentity(String(facts || ""))
    .replace(/\*\*/g, "")
    .replace(/产品形态[:：][^\n。.]*/gi, "")
    .replace(/产品名称[:：]/gi, "")
    .replace(/产品事实卡[:：]?/gi, "")
    .replace(/\b(?:核心用途|适配对象)\b[:：]?/gi, "")
    .replace(/(?:防油防溅|防溢止沸|沥水滤水|辅助翻炒)[:：]/g, "")
    .replace(/适配市面主流锅具[^\n。.]*/g, "")
    .replace(/需确认锅口为圆形[^\n。.]*/g, "")
    .replace(/\b(?:Amazon|Temu|Shopee|Etsy)\b/gi, "ecommerce")
    .replace(/[：:]\s*/g, ": ")
    .replace(/\s+/g, " ")
    .trim();
  const mechanism = strategy.mechanism ? `Product mechanism: ${strategy.mechanism}.` : "";
  const visibleParts = Array.isArray(lock.visibleParts) && lock.visibleParts.length
    ? `Visible parts to preserve: ${lock.visibleParts.slice(0, 6).join("; ")}.`
    : "";
  const detailFocus = Array.isArray(strategy.detailFocus) && strategy.detailFocus.length
    ? `Visible details to preserve: ${strategy.detailFocus.slice(0, 4).join("; ")}.`
    : "";
  return compactPromptText([compact, visibleParts, mechanism, detailFocus].filter(Boolean).join(" "), maxLength);
}

function cleanSkuBackgroundVariant(facts = {}) {
  const variants = [
    "matte warm-white tabletop with a very soft wall fade, no props",
    "light gray stone-like tabletop, clean studio wall, no texture clutter",
    "pale wood tabletop with minimal grain, bright natural studio light, no props",
    "cool off-white acrylic surface, soft reflection, clean empty background",
    "warm neutral paper sweep or seamless tabletop, subtle contact shadow only",
    "light concrete-look surface, minimal and spotless, no decorative items"
  ];
  const index = Math.max(0, Number(facts.variantIndex || 0)) % variants.length;
  return variants[index];
}



function categoryInstructionForModel(kind, platform, strategy = {}) {
  if (kind === "SKU图") {
    return `Show only the exact complete purchase unit clearly and countably in a clean minimalist real-shot setup. Use a different simple real-photo background for every SKU image; no props, no decorative accessories, no host objects, no hands, no people, no use action, no text. ${strategy.packageMode === "bundle" || strategy.packageMode === "multipack" ? "Every included piece or pack count must remain truthful and easy to count." : "Do not add extra accessories or imply extra included items."}`;
  }
  if (kind === "白底图") {
    return "Pure product retouch only: plain #FFFFFF background, centered fully visible product or purchase unit, improved material texture, cleaner edges, balanced light, no redesign, no surface line, props, hands, context, text, icons, or graphics.";
  }
  if (kind === "卖点图") {
    return "Show one selling-point theme only: pain solved, material texture, structure advantage, correct function, use step, bundle value, quantity value, or easier result. The product must remain accurate, intact, and physically plausible; use the interaction contract when any use action appears.";
  }
  if (kind === "场景图") {
    return "Show believable real-life usage evidence at true scale with one short title. The product belongs naturally on or with its target object; no infographic overlay, no dense callouts, no wrong working part or wrong after-use state.";
  }
  if (kind === "高级A+") {
    const moduleRule = aplusModuleSpecificRule(strategy.module || "", strategy);
    return [
      "Create a professional detail-page module with one coherent reading path: product/result visual plus short structured copy, up to three icons/callouts, truthful detail annotation inset, use-step strip, comparison module, set overview, or value story. Every claim must be visually provable.",
      moduleRule
    ].filter(Boolean).join(" ");
  }
  return "Create one ecommerce product image with a clear commercial role, accurate product identity, and realistic object relationships.";
}

function publicAplusModuleLabel(module = "") {
  const text = String(module || "").trim();
  const labels = {
    "首屏主视觉": "premium hero detail-page module",
    "核心卖点图": "core benefit proof module",
    "使用场景图": "usage scene proof module",
    "多角度图": "multi-angle product proof module",
    "场景氛围图": "lifestyle atmosphere/result module",
    "商品细节图": "product detail proof module",
    "细节标注图": "detail annotation module",
    "品牌故事图": "brand/value story module",
    "尺寸容量尺码图": "scale/capacity guidance module",
    "效果对比图": "comparison module",
    "详细规格参数表": "structured facts/spec guidance module",
    "工艺制作图": "craftsmanship/material proof module",
    "配件赠品图": "included contents overview module",
    "系列展示图": "variant or series overview module",
    "商品成分图": "material or structure breakdown module",
    "售后保障图": "service reassurance module",
    "使用建议图": "correct-use guidance module"
  };
  return labels[text] || normalizeFinalImagePromptLanguage(text) || "detail-page module";
}

function aplusModuleSpecificRule(module = "", strategy = {}) {
  const text = String(module || "").trim();
  if (!text) return "";
  const publicLabel = publicAplusModuleLabel(text);
  const shared = [
    `Selected A+ module objective: ${publicLabel}.`,
    "Build one complete professional detail-page section, not a loose collage.",
    "Use a clear hierarchy: one dominant visual proof, one intentional text zone, short readable copy, and only the supporting icons/callouts that the module needs.",
    `Product/use truth to obey: ${strategy.useRelationship || "the real product use relationship from analysis"}.`
  ];
  const rules = {
    "首屏主视觉": [
      "Module structure: premium A+ landing banner. Use one large product/result hero visual plus a concise headline area and 1-2 support phrases. It should establish product value and brand feeling, not repeat a product-led image or SKU photo.",
      "Keep the product prominent and desirable while preserving the exact purchase unit; background may be a refined use environment or material plane chosen from the product category."
    ],
    "核心卖点图": [
      "Module structure: three grounded benefits around one product/use visual. Each benefit must map to a visible part, use step, or result. Do not make a generic feature poster.",
      "Use up to three simple icons or short labels; every claim must be visually provable from the product facts."
    ],
    "使用场景图": [
      "Module structure: real-use proof panel. Show the product in the correct environment with adult hand/body action only when useful. The section should explain where and how it is used.",
      "The hand grip, target object, insertion/covering/holding angle, and contact point must be physically correct."
    ],
    "多角度图": [
      "Module structure: controlled multi-angle product proof. Show 2-3 views or rotations of the exact same product/purchase unit with consistent scale and lighting.",
      "Do not invent unseen parts; if hidden geometry is uncertain, use conservative angle changes from the reference."
    ],
    "场景氛围图": [
      "Module structure: premium atmosphere/result banner. Use a clean realistic environment that sells the lifestyle or result, while product remains clearly recognizable.",
      "Avoid broad decorative scenes that do not explain product value."
    ],
    "商品细节图": [
      "Module structure: detail proof with one dominant macro/detail image and up to three small callouts or magnifier insets.",
      "Callouts must point to real visible parts such as edge, seam, texture, rivet, slot, elastic rim, handle, zipper, divider, or opening."
    ],
    "细节标注图": [
      "Module structure: detail annotation proof. Use one dominant real product/detail view plus up to three short labels, leader lines, or magnifier insets.",
      "Every annotation must point to a real visible material or structure from the uploaded product; do not invent hidden internals, fake cross-sections, or unsupported specs."
    ],
    "品牌故事图": [
      "Module structure: restrained brand/value story. Use product-relevant materials, process, lifestyle context, and short brand-style copy without fake history or unsupported claims.",
      "Product must still appear as the proof, not a decorative background."
    ],
    "尺寸容量尺码图": [
      "Module structure: size/capacity guidance section. Use scale objects, simple dimension placeholders, or fit demonstrations only if supported by user facts/reference text.",
      "Do not invent exact numbers. If exact dimensions are unknown, use relative fit/scale labels rather than fabricated measurements."
    ],
    "效果对比图": [
      "Module structure: before/after or problem/result comparison. Show the problem through environment or old alternative, not by making the uploaded product look broken or wrong.",
      "The improved result must be caused by the product through the correct use relationship."
    ],
    "详细规格参数表": [
      "Module structure: clean spec-table style panel. Include only facts provided by user/analysis; use short rows and avoid dense paragraphs.",
      "If specs are unknown, show observable structure and purchase-unit facts instead of inventing dimensions, materials, capacity, certifications, or performance numbers."
    ],
    "工艺制作图": [
      "Module structure: craftsmanship/process proof. Show material, finish, assembly, seam, fastener, edge, mold, texture, or manufacturing detail that is visible or safely inferable.",
      "Do not invent factory machinery, certifications, or process claims that are not supported."
    ],
    "配件赠品图": [
      "Module structure: complete box/package contents overview. Show only items actually included in the purchase unit.",
      "Separate contextual props from included components visually; do not imply bowls, food, cookware, clothes, or tools are included unless user facts say so."
    ],
    "系列展示图": [
      "Module structure: series/SKU overview. Show color/size/variant lineup only when variants are provided or visible; otherwise make it a compatible-use or purchase-unit range section without inventing fake SKUs.",
      "Keep each variant or piece countable and consistent."
    ],
    "商品成分图": [
      "Module structure: ingredient/material composition panel. Use only confirmed ingredients/materials. For non-consumable products, interpret this as material/structure breakdown, not nutrition or chemical claims.",
      "Avoid health, safety, non-toxic, eco, BPA, medical, or certification claims unless explicitly provided and compliant."
    ],
    "售后保障图": [
      "Module structure: service reassurance panel with product photo and neutral service icons/placeholders.",
      "Do not promise warranty, returns, free shipping, refunds, certifications, or guarantees unless the user provided exact policy wording."
    ],
    "使用建议图": [
      "Module structure: correct-use guidance section. Show 2-4 simple steps or do/don't visual cues based on real product mechanics.",
      "The focus is preventing wrong use: correct grip, correct target object, correct angle, correct contact point, correct placement, and what not to include in the sale."
    ]
  };
  return [...shared, ...(rules[text] || [
    "Choose a module structure that best answers this module name: product/result visual plus concise text, real visible proof, and correct physical use."
  ])].join(" ");
}

function buildImagePromptProductFacts(payload = {}, analysis = {}, strategy = {}, maxLength = 520) {
  const identity = conciseProductIdentityForImage(payload, analysis, strategy, maxLength);
  if (identity) return identity;
  const lines = [
    payload.productInfo ? `Exact product: ${payload.productInfo}` : "",
    strategy.unitOfSale || analysis.unit_of_sale ? `Unit of sale: ${strategy.unitOfSale || analysis.unit_of_sale}` : "",
    analysis.product_summary_zh ? `Visual summary: ${analysis.product_summary_zh}` : "",
    analysis.detail_focus_areas?.length ? `Visible details: ${analysis.detail_focus_areas.slice(0, 5).join("; ")}` : "",
    analysis.misjudgment_risks?.length ? `Accuracy risks: ${analysis.misjudgment_risks.slice(0, 4).join("; ")}` : ""
  ].filter(Boolean);
  return compactPromptText(lines.join(" "), maxLength);
}



function modelPromptFacts(payload = {}, planItem = {}) {
  const analysis = normalizeAnalysisResult(payload, payload.analysis || {});
  const normalizedPayload = { ...payload, analysis };
  const strategy = visualStrategyFromPayload(normalizedPayload, sanitizeProductIdentityBrief(payload.finalPrompt || analysis.final_prompt_en || ""));
  const productFacts = buildImagePromptProductFacts(normalizedPayload, analysis, strategy, 520);
  const platform = normalizePlatformName(payload.brand?.platform || payload.platform || "Amazon");
  const palette = analysis.brand_palette || {};
  const font = analysis.brand_font_style || {};
  const categoryRole = {
    ["\u0053\u004b\u0055\u56fe"]: "exact purchase-unit proof",
    ["\u767d\u5e95\u56fe"]: "pure product retouch proof",
    ["\u5356\u70b9\u56fe"]: "single selling-theme proof",
    ["\u573a\u666f\u56fe"]: "real-use evidence with a short title",
    ["\u9ad8\u7ea7A+"]: "detail-page module proof"
  }[planItem.kind] || "ecommerce product image";
  const categoryAngle = variationFor(planItem.kind, Number(planItem.variantIndex || 0), platform);
  const backgroundHint = planItem.kind === "\u0053\u004b\u0055\u56fe"
    ? "clean real product-photo surface, different from other SKU images"
    : planItem.kind === "\u767d\u5e95\u56fe"
      ? "solid opaque #FFFFFF only"
      : planItem.kind === "\u573a\u666f\u56fe"
        ? "believable real-use environment with one short title"
        : planItem.kind === "\u5356\u70b9\u56fe"
          ? "commercial support area for one concise selling theme"
          : "organized premium detail-page module background";
  return {
    platform,
    variantIndex: Number(planItem.variantIndex || 0),
    totalForKind: Number(planItem.totalForKind || 1),
    kindLabel: publicKindLabel(planItem.kind),
    module: planItem.module || "",
    productFacts,
    unitOfSale: promptTextField(strategy.unitOfSale || analysis.unit_of_sale, 180),
    useRelationship: promptTextField(strategy.useRelationship || analysis.use_relationship, 260),
    correctUse: promptTextField(strategy.correctUseMethod || analysis.correct_use_method, 220),
    interactionContract: strategy.interactionContract || analysis.interaction_contract || {},
    forbiddenUse: Array.isArray(strategy.forbiddenUseErrors) && strategy.forbiddenUseErrors.length ? strategy.forbiddenUseErrors.slice(0, 4).map((item) => promptTextField(item, 120)).filter(Boolean).join("; ") : "",
    partFunctions: Array.isArray(strategy.partFunctionMap) && strategy.partFunctionMap.length ? strategy.partFunctionMap.slice(0, 5).map((item) => promptTextField(item, 140)).filter(Boolean).join("; ") : "",
    identityLock: productIdentityLockText(strategy.identityLock || {}, planItem.kind),
    identityAllowance: categoryIdentityAllowance(planItem.kind, strategy.identityLock || {}),
    visibleParts: Array.isArray(strategy.identityLock?.visibleParts) && strategy.identityLock.visibleParts.length ? strategy.identityLock.visibleParts.slice(0, 7).map((item) => promptTextField(item, 120)).filter(Boolean).join("; ") : "",
    identityRisks: Array.isArray(strategy.identityLock?.risks) && strategy.identityLock.risks.length ? strategy.identityLock.risks.slice(0, 6).map((item) => promptTextField(item, 140)).filter(Boolean).join("; ") : "",
    detailFocus: Array.isArray(strategy.detailFocus) && strategy.detailFocus.length ? strategy.detailFocus.slice(0, 4).map((item) => promptTextField(item, 120)).filter(Boolean).join("; ") : "",
    buyerQuestion: "",
    role: categoryRole,
    uniqueAngle: categoryAngle,
    layoutFamily: planItem.kind === "\u9ad8\u7ea7A+" && planItem.module ? publicAplusModuleLabel(planItem.module) : "",
    sceneFamily: planItem.kind === "\u573a\u666f\u56fe" ? "real-life usage evidence" : "",
    backgroundFamily: backgroundHint,
    copyRole: planItem.kind === "\u0053\u004b\u0055\u56fe" || planItem.kind === "\u767d\u5e95\u56fe" ? "no visible text" : "short, category-safe copy only if useful",
    brandApplication: promptTextField(payload.brand?.customStyle || palette.usage_en || "", 220),
    avoidRepetition: Number(planItem.totalForKind || 1) > 1 ? "Use a different buyer angle, background, camera distance, and message from other images of the same category." : "",
    visualTone: promptTextField(payload.brand?.customStyle || "clean commercial ecommerce, product-led, truthful material texture", 180),
    commercialPolish: commercialPolishForKind(planItem.kind),
    visualCaseGrammar: visualCaseGrammarFor(planItem.kind, planItem, strategy),
    compactVisualGrammar: compactVisualGrammarForKind(planItem.kind),
    promptQualityChecklist: categoryPromptQualityChecklist(planItem.kind),
    palette: promptTextField([palette.primary_color, palette.secondary_color, palette.accent_color, palette.background_color].filter(Boolean).join(" / "), 160),
    typography: promptTextField(font.style_en || "clean readable short copy where allowed", 160),
    ratio: resolveGenerationRatio(payload, planItem),
    categoryInstruction: categoryInstructionForModel(planItem.kind, platform, { ...strategy, module: planItem.module || "" }),
    textPolicy: modelSpecificTextPolicy(planItem.kind, platform),
    avoidText: modelSpecificAvoidText(planItem.kind, platform, payload.negativePrompt),
    kind: planItem.kind
  };
}

function physicalRelationshipSummary(facts) {
  const interaction = facts.interactionContract && typeof facts.interactionContract === "object" ? facts.interactionContract : {};
  const interactionText = [
    interaction.grip_area ? `grip area: ${interaction.grip_area}` : "",
    interaction.working_area ? `working area: ${interaction.working_area}` : "",
    interaction.target_object ? `target: ${interaction.target_object}` : "",
    interaction.contact_rule ? `contact rule: ${interaction.contact_rule}` : "",
    interaction.product_state_after_use ? `product after use: ${interaction.product_state_after_use}` : "",
    interaction.target_state_after_use ? `target after use: ${interaction.target_state_after_use}` : ""
  ].filter(Boolean).join("; ");
  return [
    interactionText ? `Interaction contract: ${interactionText}` : "",
    facts.identityAllowance,
    facts.useRelationship ? `Correct object relationship: ${facts.useRelationship}` : "",
    facts.correctUse ? `Correct use: ${facts.correctUse}` : "",
    facts.partFunctions ? `Part-function facts: ${facts.partFunctions}` : "",
    facts.forbiddenUse ? `Never show: ${facts.forbiddenUse}` : "",
    /elastic[_\s-]?cover|gathered elastic rim|roll cling film/i.test([facts.productFacts, facts.useRelationship, facts.correctUse, facts.visibleParts].filter(Boolean).join(" "))
      ? "Elastic cover handling lock: hands hold only the elastic edge/rim, stretch it around the bowl/plate/container rim, and never pinch the middle film as a solid handle or turn it into a roll of cling film."
      : "",
    /rack|vertical divider|divider posts|slots|slot spacing|lid rack|plate rack/i.test([facts.productFacts, facts.useRelationship, facts.correctUse, facts.visibleParts].filter(Boolean).join(" "))
      ? "Rack slot handling lock: the base must rest flat on a countertop or stable surface; lids, plates, trays, or cutting boards stand between divider posts/slots with contact shadows and cannot float, pierce posts, or sit on divider tips."
      : "",
    /wine bottle stopper|bottle stopper|red sealing plug|press-type|bottle mouth|top press lever/i.test([facts.productFacts, facts.identityLock, facts.useRelationship, facts.correctUse, facts.visibleParts, facts.partFunctions].filter(Boolean).join(" "))
      ? "Wine-stopper orientation lock: the red cylindrical sealing plug is the lower working end and must point downward into the bottle mouth; the round collar rim sits on the bottle lip; the black or white outer body and hinged top press lever remain above the bottle opening. Never invert the stopper, never put the lever/body into the bottle, and never show the red plug floating above the mouth."
      : "",
    "Internally verify realistic attachment points, rim/contact geometry, gravity, occlusion, and scale; no part may pass through, fuse with, float above, or attach to the wrong object."
  ].filter(Boolean).map(sentenceCaseLine).join(" ");
}

function whiteBackgroundGeometrySummary(facts) {
  return [
    facts.identityAllowance,
    facts.visibleParts ? `Identity-critical visible parts: ${facts.visibleParts}` : "",
    facts.identityRisks ? `Avoid identity failures: ${facts.identityRisks}` : "",
    facts.partFunctions ? `Preserve visible part geometry: ${facts.partFunctions}` : "",
    facts.detailFocus ? `Show these visible details clearly: ${facts.detailFocus}` : "",
    facts.forbiddenUse ? `Avoid structural mistakes: ${facts.forbiddenUse}` : "",
    "Internally check the object as a standalone physical product: all holes, rims, seams, tabs, folds, thickness, edges, openings, and accessories must belong to the product itself and must not duplicate, melt, intersect, float, or attach to the wrong place."
  ].filter(Boolean).map(sentenceCaseLine).join(" ");
}

function skuGeometrySummary(facts) {
  return [
    facts.identityAllowance,
    facts.visibleParts ? `Identity-critical visible parts: ${facts.visibleParts}` : "",
    facts.identityRisks ? `Avoid identity failures: ${facts.identityRisks}` : "",
    facts.useRelationship ? `Real use relationship to respect when this SKU is later used in the set: ${facts.useRelationship}` : "",
    facts.correctUse ? `Correct handling/use method: ${facts.correctUse}` : "",
    facts.partFunctions ? `Preserve visible product parts: ${facts.partFunctions}` : "",
    facts.detailFocus ? `Visible details to keep clear: ${facts.detailFocus}` : "",
    facts.forbiddenUse ? `Do not show these structural/use mistakes: ${facts.forbiddenUse}` : "",
    "Show the complete product or complete purchase unit only; no extra accessories, no unrelated props, no decoration, no use action, and no host object unless it is part of the purchase unit or package."
  ].filter(Boolean).map(sentenceCaseLine).join(" ");
}

function buildSkuImagePrompt(facts, style = "structured") {
  const background = cleanSkuBackgroundVariant(facts);
  const lines = [
    `Create one ${facts.ratio || "1:1"} SKU product photograph for an ecommerce listing.`,
    facts.identityLock ? `Product identity lock: ${facts.identityLock}` : "",
    facts.productFacts ? `Subject: ${facts.productFacts}` : "",
    facts.unitOfSale ? `Show exactly the complete purchase unit: ${facts.unitOfSale}` : "",
    `Background: ${background}. It must look like a real clean product photo background, not a white-background cutout. Each SKU image in the set must use a different clean background, camera height, and shadow rhythm.`,
    facts.compactVisualGrammar ? `Prompt-case grammar: ${facts.compactVisualGrammar}` : "",
    facts.commercialPolish ? `Commercial polish: ${facts.commercialPolish}` : "",
    facts.uniqueAngle ? `Camera and arrangement: ${facts.uniqueAngle}` : "Camera and arrangement: tidy product-only arrangement, fully visible and countable.",
    "Composition: complete product centered or neatly arranged, no cropping, no usage action, no lifestyle context, no decorative styling, no extra included-looking items.",
    "Lighting and material: realistic studio or natural product light, truthful shadows, accurate texture, crisp edges.",
    `Product-only check: ${skuGeometrySummary(facts)}`,
    `Text policy: ${facts.textPolicy}`,
    `Avoid: ${facts.avoidText}`,
    "Output one finished image only."
  ];
  const prompt = lines.filter(Boolean).join(style === "compact" ? ". " : "\n");
  return compactPromptText(sanitizeFinalImagePromptText(prompt), 2600);
}

function buildOpenAiImagePrompt(basePrompt, facts) {
  const isWhiteBackground = facts.kind === "白底图";
  const creativeBrief = modelCreativeBrief(basePrompt, facts);
  const whiteLines = [
    `Create one ${facts.ratio || "1:1"} pure white-background product photograph for an ecommerce listing.`,
    facts.identityLock ? `Product identity lock: ${facts.identityLock}` : "",
    facts.productFacts ? `Subject: ${facts.productFacts}` : "",
    facts.unitOfSale ? `Show exactly: ${facts.unitOfSale}` : "",
    "Background: solid opaque #FFFFFF only. No tabletop, countertop, surface line, room, gradient, texture, props, hands, cookware, food, packaging not included in the sale, icons, labels, callouts, or text.",
    facts.compactVisualGrammar ? `Prompt-case grammar: ${facts.compactVisualGrammar}` : "",
    facts.commercialPolish ? `Commercial polish: ${facts.commercialPolish}` : "",
    facts.uniqueAngle ? `Camera: ${facts.uniqueAngle}` : "Camera: centered product-only view, slight three-quarter or elevated angle only if it clarifies real shape.",
    "Composition: product centered, fully visible, not cropped, clean silhouette, enough white margin, realistic contact shadow only if needed to ground the object.",
    "Lighting and material: crisp commercial product lighting, accurate color, matte/gloss texture preserved, sharp edges, no redesign.",
    `Geometry check: ${whiteBackgroundGeometrySummary(facts)}`,
    `Avoid: ${facts.avoidText}`,
    "Output one finished image only."
  ];
  if (isWhiteBackground) {
    return compactPromptText(sanitizeFinalImagePromptText(whiteLines.filter(Boolean).join("\n")), 2600);
  }
  if (facts.kind === "SKU图") {
    return buildSkuImagePrompt(facts);
  }

  const lines = [
    `Create one ${facts.kindLabel} for an ecommerce listing.`,
    creativeBrief ? `Creative brief to honor: ${creativeBrief}` : "",
    facts.buyerQuestion ? `Shopper question: ${facts.buyerQuestion}` : "",
    facts.role ? `Commercial role: ${facts.role}` : "",
    facts.identityLock ? `Product identity lock: ${facts.identityLock}` : "",
    !facts.identityLock && facts.productFacts ? `Product fidelity: ${facts.productFacts}` : "",
    facts.unitOfSale ? `Show the real unit of sale: ${facts.unitOfSale}` : "",
    facts.categoryInstruction ? `Image-type rule: ${facts.categoryInstruction}` : "",
    facts.compactVisualGrammar ? `Prompt-case grammar: ${facts.compactVisualGrammar}` : "",
    facts.commercialPolish ? `Commercial polish: ${facts.commercialPolish}` : "",
    `Physical realism: ${physicalRelationshipSummary(facts)}`,
    facts.uniqueAngle || facts.layoutFamily || facts.sceneFamily
      ? `Composition: ${[facts.uniqueAngle, facts.layoutFamily, facts.sceneFamily].filter(Boolean).join("; ")}`
      : "",
    facts.backgroundFamily || facts.visualTone || facts.brandApplication
      ? `Visual direction: ${[facts.backgroundFamily, facts.visualTone, facts.brandApplication].filter(Boolean).join("; ")}`
      : "",
    `Text policy: ${facts.textPolicy}`,
    facts.promptQualityChecklist ? `Quality checklist: ${facts.promptQualityChecklist}` : "",
    facts.avoidRepetition ? `Set diversity: ${facts.avoidRepetition}` : "",
    `Avoid: ${facts.avoidText}`,
    "Output one finished image only."
  ];
  return compactPromptText(sanitizeFinalImagePromptText(lines.filter(Boolean).join("\n")), finalPromptMaxLengthForKind(facts.kind, imagePromptProfileForModel("gpt-image")));
}

function buildGeminiImagePrompt(basePrompt, facts) {
  const creativeBrief = modelCreativeBrief(basePrompt, facts);
  if (facts.kind === "白底图") {
    return compactPromptText(sanitizeFinalImagePromptText([
      "Scene goal: Pure white-background product-only image for ecommerce.",
      facts.identityLock ? `Product identity lock: ${facts.identityLock}.` : "",
      facts.productFacts ? `Subject to preserve: ${facts.productFacts}.` : "",
      facts.unitOfSale ? `Exact purchase unit: ${facts.unitOfSale}.` : "",
      "Background and layout: solid opaque #FFFFFF, centered complete product, full visibility, clean silhouette, no tabletop, no scene, no props, no text, no icons.",
      facts.uniqueAngle ? `Camera: ${facts.uniqueAngle}.` : "Camera: product-only angle that best reveals the true shape.",
      `Final physical check: ${whiteBackgroundGeometrySummary(facts)}`,
      `Avoid: ${facts.avoidText}.`
    ].filter(Boolean).join("\n")), 2600);
  }
  if (facts.kind === "SKU图") {
    return buildSkuImagePrompt(facts);
  }
  const sections = [
    ["Scene goal", `One ${facts.kindLabel} for a mobile ecommerce listing. ${facts.buyerQuestion ? `Answer this shopper question visually: ${facts.buyerQuestion}.` : ""}`],
    ["Creative brief to honor", creativeBrief],
    ["Product identity lock", facts.identityLock],
    ["Subject to preserve", [!facts.identityLock ? facts.productFacts : "", facts.unitOfSale ? `Unit of sale: ${facts.unitOfSale}` : ""].filter(Boolean).join(" ")],
    ["Image-type rule", facts.categoryInstruction],
    ["Action and object relationships", physicalRelationshipSummary(facts)],
    ["Final check", "Make every visible object physically plausible and keep the product identity unchanged from the references."],
    ["Composition", [facts.role, facts.uniqueAngle, facts.layoutFamily, facts.sceneFamily, facts.backgroundFamily].filter(Boolean).join("; ")],
    ["Style and lighting", [facts.visualTone, facts.commercialPolish, facts.palette, facts.brandApplication, "realistic commercial lighting, truthful material texture, clean hierarchy"].filter(Boolean).join("; ")],
    ["Prompt-case grammar", facts.compactVisualGrammar],
    ["Text", facts.textPolicy],
    ["Quality checklist", facts.promptQualityChecklist],
    ["Avoid", facts.avoidText]
  ];
  const prompt = sections
    .filter(([, value]) => String(value || "").trim())
    .map(([title, value]) => `${title}: ${sentenceCaseLine(value)}`)
    .join("\n");
  return compactPromptText(sanitizeFinalImagePromptText(prompt), finalPromptMaxLengthForKind(facts.kind, imagePromptProfileForModel("nano-banana")));
}

function buildFluxImagePrompt(basePrompt, facts) {
  const creativeBrief = modelCreativeBrief(basePrompt, facts);
  if (facts.kind === "白底图") {
    return compactPromptText(sanitizeFinalImagePromptText([
      "pure white-background ecommerce product photography",
      facts.identityLock ? `identity lock: ${facts.identityLock}` : "",
      facts.productFacts ? `exact product: ${facts.productFacts}` : "",
      facts.unitOfSale ? `complete purchase unit: ${facts.unitOfSale}` : "",
      "solid opaque #FFFFFF background, centered full product, clean silhouette, crisp edges, accurate material texture",
      "no tabletop, no props, no hands, no host object, no food, no text, no icons, no graphics",
      `geometry: ${whiteBackgroundGeometrySummary(facts)}`,
      `avoid: ${facts.avoidText}`
    ].filter(Boolean).join(". ")), 2300);
  }
  if (facts.kind === "SKU图") {
    return buildSkuImagePrompt(facts, "compact");
  }
  const prompt = [
    `${facts.kindLabel}, ecommerce product photography, ${facts.uniqueAngle || facts.role || "clear product-led composition"}`,
    creativeBrief ? `creative brief: ${creativeBrief}` : "",
    facts.identityLock ? `identity lock: ${facts.identityLock}` : "",
    facts.productFacts ? `exact product: ${facts.productFacts}` : "",
    facts.unitOfSale ? `unit of sale: ${facts.unitOfSale}` : "",
    facts.categoryInstruction ? `image rule: ${facts.categoryInstruction}` : "",
    facts.useRelationship ? `correct use relationship: ${facts.useRelationship}` : "",
    facts.backgroundFamily ? `background: ${facts.backgroundFamily}` : "",
    facts.visualTone || facts.palette || facts.commercialPolish ? `style: ${[facts.visualTone, facts.commercialPolish, facts.palette].filter(Boolean).join(", ")}` : "",
    facts.compactVisualGrammar ? `prompt grammar: ${facts.compactVisualGrammar}` : "",
    "realistic shadows, truthful materials, sharp product detail, clean commercial hierarchy",
    `text: ${facts.textPolicy}`,
    `avoid: ${facts.avoidText}`
  ].filter(Boolean).join(". ");
  return compactPromptText(sanitizeFinalImagePromptText(prompt), imagePromptProfileForModel("flux").maxLength);
}

function buildGenericImagePrompt(basePrompt, facts) {
  const creativeBrief = modelCreativeBrief(basePrompt, facts);
  if (facts.kind === "白底图") {
    return compactPromptText(sanitizeFinalImagePromptText([
      `Create one ${facts.kindLabel} for ecommerce.`,
      facts.identityLock ? `Product identity lock: ${facts.identityLock}` : "",
      facts.productFacts ? `Subject: ${facts.productFacts}` : "",
      facts.unitOfSale ? `Show exactly: ${facts.unitOfSale}` : "",
      "Use only a solid #FFFFFF background, full product visibility, clean edges, no scene, no tabletop, no props, no text, no icons.",
      `Geometry check: ${whiteBackgroundGeometrySummary(facts)}`,
      `Avoid: ${facts.avoidText}`
    ].filter(Boolean).join("\n")), 2300);
  }
  if (facts.kind === "SKU图") {
    return buildSkuImagePrompt(facts);
  }
  const prompt = [
    `Create one ${facts.kindLabel} for an ecommerce listing.`,
    creativeBrief ? `Honor this creative brief: ${creativeBrief}` : "",
    facts.identityLock ? `Product identity lock: ${facts.identityLock}` : "",
    facts.productFacts ? `Preserve product identity: ${facts.productFacts}` : "",
    facts.categoryInstruction ? `Image-type rule: ${facts.categoryInstruction}` : "",
    facts.uniqueAngle || facts.layoutFamily ? `Use this image role and layout: ${[facts.role, facts.uniqueAngle, facts.layoutFamily].filter(Boolean).join("; ")}` : "",
    facts.sceneFamily || facts.backgroundFamily ? `Scene/background: ${[facts.sceneFamily, facts.backgroundFamily].filter(Boolean).join("; ")}` : "",
    `Physical plausibility: ${physicalRelationshipSummary(facts)}`,
    facts.visualTone || facts.palette || facts.commercialPolish ? `Style: ${[facts.visualTone, facts.commercialPolish, facts.palette, facts.brandApplication].filter(Boolean).join("; ")}` : "",
    facts.compactVisualGrammar ? `Prompt-case grammar: ${facts.compactVisualGrammar}` : "",
    `Text policy: ${facts.textPolicy}`,
    facts.promptQualityChecklist ? `Quality checklist: ${facts.promptQualityChecklist}` : "",
    `Avoid: ${facts.avoidText}`,
    "Output one image only."
  ].filter(Boolean).join("\n");
  return compactPromptText(sanitizeFinalImagePromptText(prompt), imagePromptProfileForModel("generic").maxLength);
}

function adaptImagePromptForModel(prompt, model, payload = {}, planItem = {}) {
  const profile = imagePromptProfileForModel(model);
  const sanitizedBase = sanitizeFinalImagePromptText(prompt);
  const facts = modelPromptFacts(payload, planItem);
  let adapted;
  if (profile.id === "openai-gpt-image") {
    adapted = buildOpenAiImagePrompt(sanitizedBase, facts);
  } else if (profile.id === "gemini-image") {
    adapted = buildGeminiImagePrompt(sanitizedBase, facts);
  } else if (profile.id === "flux-image") {
    adapted = buildFluxImagePrompt(sanitizedBase, facts);
  } else {
    adapted = buildGenericImagePrompt(sanitizedBase, facts);
  }

  const finalPrompt = compactPromptText(
    sanitizeFinalImagePromptText(adapted),
    finalPromptMaxLengthForKind(facts.kind, profile)
  );
  const operatorSource = operatorMechanismSourceText(payload);
  const validationSource = hasMeaningfulOperatorFacts(operatorSource)
    ? operatorSource
    : modelPromptFactSourceText(facts);
  const conflict = unsupportedForeignMechanicConflict(finalPrompt, validationSource);
  if (conflict) {
    throw new Error(`作图提示词与当前商品事实冲突：检测到未被商品事实支持的 ${conflict} 场景词。请重新运行 AI帮写或检查商品事实后再生成。`);
  }
  return finalPrompt;
}

function buildCategoryPrompt(payload, planItem) {
  const brand = payload.brand || {};
  const platform = normalizePlatformName(brand.platform || payload.platform || "Amazon");
  const payloadWithNormalizedAnalysis = {
    ...payload,
    brand,
    analysis: normalizeAnalysisResult(payload, payload.analysis || {})
  };
  const rules = typeRulesFor(planItem.kind, platform);
  const platformRules = platformRuleFor(platform);
  const variation = variationFor(planItem.kind, planItem.variantIndex, platform);
  const safeBasePrompt = String(payload.finalPrompt || "")
    .replace(/include\s+\w+\s+image-use directions?[^.]*\./gi, "")
    .replace(/within one coherent generation prompt[^.]*\./gi, "")
    .replace(/three image-use directions?[^.]*\./gi, "")
    .replace(/multiple image concepts?[^.]*\./gi, "")
    .trim();
  const identityBrief = sanitizeProductIdentityBrief(safeBasePrompt);
  const strategy = visualStrategyFromPayload(payloadWithNormalizedAnalysis, identityBrief);
  const evidenceRule = categoryEvidenceRule(planItem.kind, strategy, platform);
  const fidelityRule = productFidelityRule(strategy, planItem.kind);
  const boundaryRule = categoryBoundaryRule(planItem.kind);
  const qualityRule = professionalQualityRule(planItem.kind);
  const visualCaseGrammar = visualCaseGrammarFor(planItem.kind, planItem, strategy);
  const promptQualityChecklist = categoryPromptQualityChecklist(planItem.kind);
  const commercialPolish = commercialPolishForKind(planItem.kind);
  const plausibilityRule = physicalPlausibilityAuditRule(payloadWithNormalizedAnalysis, planItem);
  const quantityRule = countDrivenRule(planItem);
  const productFactCard = buildProductFactCard(payloadWithNormalizedAnalysis, payloadWithNormalizedAnalysis.analysis, 900);
  const platformSafeBasePrompt = platform === "Temu" ? sanitizeTemuCopyHints(identityBrief) : identityBrief;
  const aPlusLine = planItem.kind === "高级A+" && payload.aPlusSize
    ? platform === "Temu" && payload.aPlusSize === "1:1"
      ? "A+ detail-page target is Temu square format 1:1. Compose it like a premium square detail-page module with a clear reading path, planned text zone, and supporting icon/callout logic, not like a random lifestyle scene or wide Amazon banner."
      : `A+ target canvas size: ${payload.aPlusSize}. Compose for this detail-page module aspect ratio with readable hierarchy, planned text zone, and module structure.`
    : "";
  const aplusModuleLine = planItem.kind === "高级A+" && (planItem.module || planItem.sourceKind)
    ? aplusModuleSpecificRule(planItem.module || planItem.sourceKind, strategy)
    : "";
  const brandColorDirection = summarizeColorDirection(payloadWithNormalizedAnalysis, planItem.kind, platform);
  const typographyDirection = summarizeTypographyDirection(payloadWithNormalizedAnalysis, planItem.kind);
  const regionalUseDirection = summarizeRegionalUseDirection(payloadWithNormalizedAnalysis);
  const sellingCopyHint = planItem.kind === "卖点图" ? (SELLING_POINT_COPY_HINTS[platform] || SELLING_POINT_COPY_HINTS.Amazon) : "";
  const productReferencePolicy = "The base brief is product identity only, not a composition instruction. The selected image category rules below have higher priority for background, camera angle, lighting, layout, scene, text, and visual design. Preserve the product identity from the uploaded image, but do not preserve the original photo angle or plain background unless that category explicitly asks for it.";
  const suiteDirection = "";
  const referenceStrategy = referenceStrategyRule(payloadWithNormalizedAnalysis, planItem);
  const finalPromptSanitizer = finalPromptPlatformSanitizerRule(platform);
  const temuTextFilter = platform === "Temu"
    ? "For any visible image text, strictly avoid the full Temu risky-term list supplied in the compliance rules. If in doubt, omit the text instead of using risky wording."
    : "";

  return [
    productFactCard ? `Product fact card, factual lock only: ${productFactCard}` : platformSafeBasePrompt,
    platformSafeBasePrompt && !productFactCard ? platformSafeBasePrompt : "",
    suiteDirection,
    referenceStrategy,
    finalPromptSanitizer,
    productReferencePolicy,
    fidelityRule,
    plausibilityRule,
    `Selected image category: ${planItem.kind}.`,
    boundaryRule,
    qualityRule,
    visualCaseGrammar,
    commercialPolish,
    promptQualityChecklist,
    quantityRule,
    rules.base,
    rules.scene,
    rules.text,
    regionalUseDirection,
    evidenceRule,
    brandColorDirection,
    typographyDirection,
    sellingCopyHint,
    `Marketplace compliance guidance: ${platformRules.compliance.join(" ")}`,
    temuTextFilter,
    `Target platform: ${platform}. Target market: ${brand.region || "US"}. Output language policy: ${brand.language || "English"}.`,
    aPlusLine,
    aplusModuleLine,
    variation,
    outputLayoutRule(planItem.kind)
  ].filter(Boolean).join("\n");
}

function buildCategoryPromptRewriteUserText(items, imageModel = "") {
  const profile = imagePromptProfileForModel(imageModel);
  return [
    "Rewrite all requested local category prompts into final English image-generation prompts in this single API call.",
    `The final prompt will be sent to image model "${imageModel || "auto"}"; use the ${profile.label} prompt profile.`,
    `Model prompt profile guidance: ${profile.guide}`,
    "The local prompt is the hard constraint source. Preserve every product-fidelity, category-boundary, platform-compliance, aspect-ratio, and negative instruction.",
    "Preserve every part-function lock, correct-use-method lock, and forbidden-use-error exactly. Never rewrite them into vague wording.",
    "Preserve the Reference image identity lock exactly. In the final prompt, keep product identity as visible shape, materials, colors, count, silhouette, and parts; keep use relationship as a separate physical constraint. Never mix usage description into the product identity sentence.",
    "Use the Product fact card as factual identity/use/structure input only. Do not copy it as a long paragraph. Compress it into the shortest accurate subject and interaction lock.",
    "When writing the final image prompt, do not include marketplace names such as Temu, Amazon, Shopee, or Etsy. Translate platform intent into generic wording such as mobile marketplace, ecommerce listing, marketplace-safe product-led hero, selling-point image, or detail-page module.",
    "Final prompts must be English only. Do not include Chinese/CJK characters, Chinese category names, Chinese module names, or Chinese unit-of-sale text. Translate them into concise English before returning.",
    "Never use ellipses, placeholder dots, or truncated fragments such as \"...\" in final prompts.",
    "Before finalizing each prompt, internally check physical plausibility: correct attachment points, no impossible object intersections, no fused handles/covers/host objects, no floating parts, no wrong use method, no wrong after-use product state, and no hallucinated structure. Include concise explicit anti-error wording when use action appears.",
    "For elastic disposable food covers, preserve the gathered elastic rim and show it stretched around a bowl/plate/container edge; never rewrite it as roll cling film or a flat sheet. For hand tools, preserve the exact grip/working-end relationship. For rack/holder products, show base support and slotted items without intersections. For bags, keep handles, zipper, seams, and contents physically coherent.",
    "Preserve the distinction between SKU image and white-background image exactly: SKU image is a clean product-only real-shot purchase-unit photo; white-background image is pure #FFFFFF product retouch/isolation.",
    "Selling-point image may focus on material, structure, function, use step, pain/result, bundle value, or quantity value, but each prompt must express only one theme.",
    "Lifestyle usage image must include one short English title and correct product usage relationship.",
    "Detail annotation belongs to Advanced A+ as a detail annotation module, not as a standalone macro image type.",
    "Apply the visual case-library quality layer from the local prompt. Treat it as abstract visual grammar only: exact subject, commercial role, composition, camera/lighting, material proof, text policy, and grouped avoid list. Do not copy external examples or invent a fixed style unrelated to the product.",
    "For every final prompt, include enough concrete visual grammar for the selected category: SKU = brand-product studio catalog proof; white background = premium retouch/cutout; selling-point = clean information-card proof; scene = realistic usage narrative; A+ = detail-page module hierarchy.",
    "Before returning, check that each final prompt has product identity, category role, composition, lighting/material, physical relationship when needed, text policy, and short grouped avoid list.",
    "Improve product-specific clarity, visual specificity, and variation. Every returned prompt in this chunk must be visibly different in buyer question, setting, camera distance, layout family, product scale, text/no-text policy, and marketing role from the others unless the category explicitly requires pure product isolation.",
    "Do not add unsupported product features, wrong use cases, fake badges, watermarks, pricing, discounts, certification marks, or unsafe claims.",
    "Return every requested index exactly once. If you cannot complete all prompts, still return JSON with an error field explaining why.",
    "Return strict JSON only with this shape:",
    "{\"prompts\":[{\"index\":1,\"prompt\":\"...\"}]}",
    "Each prompt must be a single finished prompt string for one image. Keep it concise, accurate, and usually under 180-260 English words; avoid long stacked negative clauses when a short grouped avoid list is clearer.",
    JSON.stringify({
      items: items.map((item) => ({
        index: item.index + 1,
        kind: item.planItem.kind,
        variantIndex: item.planItem.variantIndex,
        totalForKind: item.planItem.totalForKind,
        targetImageModel: imageModel || "auto",
        targetPromptProfile: profile.id,
        localPrompt: item.localPrompt
      }))
    })
  ].join("\n");
}

function buildWhiteBackgroundCutoutPrompt(payload = {}) {
  const info = payload.productInfo || "the uploaded product";
  return [
    "Create one perfect pure white background product rendering from the uploaded casual product photo.",
    "The output must preserve the exact product identity, exterior design, silhouette, proportions, size relationship, color placement, material finish, texture, edges, hardware, visible logos, brand marks, printed labels, holes, seams, connectors, included components, and visible structure from the reference image.",
    "Improve only presentation quality: remove messy background, dirt, wrinkles, stains, harsh shadows, low-quality lighting, camera distortion, clutter, and casual-photo defects while keeping the product itself truthful.",
    "Use SKU-level product accuracy and premium ecommerce rendering quality, but do not add any tabletop, countertop, room, props, hands, people, scene, graphics, text, badge, logo, icon, callout, inset, or decorative element.",
    "Background must be plain pure white (#FFFFFF). Show only the product or exact purchase unit, centered, fully visible, cleanly lit, with realistic product texture and clean edges.",
    `Product notes: ${info}.`,
    "Output one single finished image only."
  ].join("\n");
}

function resolveWhiteBackgroundModel(config, payload = {}) {
  return resolveImageModelForPayload(config, payload);
}

async function resolveWhiteBackgroundBody(config, payload) {
  const model = resolveWhiteBackgroundModel(config, payload);
  return resolveGrsaiGenerationBody(
    config,
    {
      ...payload,
      images: (payload.images || []).slice(0, 1),
      resolution: payload.resolution || "1K",
      ratio: "1:1"
    },
    model,
    buildWhiteBackgroundCutoutPrompt(payload),
    { kind: "白底图" }
  );
}

async function rewriteCategoryPromptChunk(config, items, imageModel = "") {
  if (!config.promptApiKey || !items.length) return new Map();

  const systemPrompt = [
    "You are a senior ecommerce image-generation prompt writer.",
    "You convert structured local prompt rules into polished final prompts for an image model.",
    "You must preserve all constraints and compliance rules from the local prompt.",
    "Output strict JSON only. No Markdown."
  ].join("\n");
  const userText = buildCategoryPromptRewriteUserText(items, imageModel);
  const endpoint = config.promptEndpoint || "responses";
  let body;
  writeRuntimeLog("prompt-rewrite-chunk-start", {
    count: items.length,
    indexes: items.map((item) => item.index + 1),
    provider: config.promptProvider,
    model: config.promptModel,
    endpoint,
    imageModel
  });
  const startedAt = Date.now();

  if (endpoint === "chat") {
    body = await callChatApi(config, systemPrompt, userText, []);
  } else if (endpoint === "gemini") {
    body = await callGeminiApi(config, systemPrompt, userText, []);
  } else if (endpoint === "anthropic") {
    body = await callAnthropicApi(config, systemPrompt, userText, []);
  } else if (endpoint === "auto") {
    body = await callPromptModel(config, systemPrompt, userText, []);
  } else {
    body = await callResponsesApi(config, systemPrompt, userText, []);
  }

  const parsed = extractJson(responseText(body));
  if (!parsed || !Array.isArray(parsed.prompts)) {
    const raw = responseText(body);
    throw new Error(`提示词模型返回内容不是标准 JSON prompts 数组。原始返回：${String(raw || "").slice(0, 500)}`);
  }
  if (parsed.error) {
    throw new Error(`提示词模型返回错误：${parsed.error}`);
  }
  const rewritten = new Map();
  for (const item of parsed?.prompts || []) {
    const index = Number(item.index) - 1;
    const sourceItem = items.find((entry) => entry.index === index);
    const planItem = sourceItem?.planItem || {};
    const payload = sourceItem?.payload || {};
    const prompt = adaptImagePromptForModel(item.prompt || "", imageModel, payload, planItem);
    if (Number.isInteger(index) && prompt) rewritten.set(index, prompt);
  }
  writeRuntimeLog("prompt-rewrite-chunk-done", {
    count: items.length,
    returned: rewritten.size,
    indexes: items.map((item) => item.index + 1),
    elapsedMs: Date.now() - startedAt
  });
  return rewritten;
}

async function buildPromptPlan(config, payload, planItems, suitePlan, sendProgress) {
  const payloadWithSuitePlan = { ...payload, suitePlan };
  const imageModel = resolveImageModelForPayload(config, payloadWithSuitePlan);
  const startedAt = Date.now();
  const promptItems = planItems.map((planItem, index) => ({
    index,
    planItem: { ...planItem, globalIndex: index },
    payload: payloadWithSuitePlan,
    localPrompt: buildCategoryPrompt(payloadWithSuitePlan, { ...planItem, globalIndex: index })
  }));

  assertPromptModelConfigured(config, "分类提示词生成");

  writeRuntimeLog("prompt-plan-start", {
    total: promptItems.length,
    mode: "single-call-no-fallback",
    totalTimeoutMs: PROMPT_REWRITE_TOTAL_TIMEOUT_MS,
    provider: config.promptProvider,
    model: config.promptModel,
    endpoint: config.promptEndpoint,
    imageModel
  });
  sendProgress?.({
    stage: "rewriting-prompts",
    current: 0,
    total: promptItems.length,
    progress: 8
  });

  let rewrittenPrompts;
  try {
    rewrittenPrompts = await withTimeout(
      rewriteCategoryPromptChunk(config, promptItems, imageModel),
      PROMPT_REWRITE_TOTAL_TIMEOUT_MS,
      `提示词模型 ${Math.round(PROMPT_REWRITE_TOTAL_TIMEOUT_MS / 1000)} 秒内未一次性返回全部图片提示词。请重试、减少本次图数、切换更快的提示词模型，或检查中转站并发/超时限制。`
    );
  } catch (error) {
    writeRuntimeLog("prompt-plan-single-call-failed", {
      total: promptItems.length,
      elapsedMs: Date.now() - startedAt,
      error: String(error?.message || error)
    });
    throw new Error(`AI提示词生成失败：${error.message || error}。本次未调用作图 API；请检查提示词模型设置后选择重新生成。`);
  }

  const missing = promptItems.filter((item) => !rewrittenPrompts.has(item.index));
  if (missing.length) {
    const missingText = missing.map((item) => item.index + 1).join(", ");
    writeRuntimeLog("prompt-plan-single-call-missing", {
      total: promptItems.length,
      returned: rewrittenPrompts.size,
      missing: missing.map((item) => item.index + 1),
      elapsedMs: Date.now() - startedAt
    });
    throw new Error(`AI提示词生成失败：提示词模型没有返回第 ${missingText} 条提示词。本次未调用作图 API；请重试或减少本次图片数量。`);
  }

  sendProgress?.({
    stage: "rewriting-prompts",
    current: promptItems.length,
    total: promptItems.length,
    progress: 100
  });

  writeRuntimeLog("prompt-plan-done", {
    total: promptItems.length,
    rewritten: rewrittenPrompts.size,
    fallback: 0,
    failed: 0,
    warnings: 0,
    elapsedMs: Date.now() - startedAt,
    mode: "single-call-no-fallback"
  });

  return promptItems.map((item) => {
    const prompt = rewrittenPrompts.get(item.index) || "";
    return {
      ...item,
      prompt,
      promptSource: "prompt-api-single-call",
      promptError: "",
      skipGeneration: false,
      targetImageModel: imageModel,
      payload: undefined
    };
  });
}

function promptFailureResult(promptItem, model = "") {
  const planItem = promptItem.planItem || {};
  return {
    kind: planItem.kind,
    model,
    promptSource: "prompt-api-failed",
    prompt: promptItem.localPrompt || "",
    variantIndex: planItem.variantIndex,
    totalForKind: planItem.totalForKind,
    status: "failed",
    error: promptItem.promptError || "这张图没有可用提示词，已停止作图。"
  };
}

function normalizeGrsaiGenerationResults(body, model, promptItem = {}) {
  const data = Array.isArray(body?.data) ? body.data : [];
  return data.map((item) => ({
    url: String(item?.url || item?.b64_json || "").trim(),
    model,
    kind: promptItem.kind,
    status: item?.url || item?.b64_json ? "succeeded" : "failed"
  })).filter((item) => item.url || item.status === "failed");
}

function normalizeGeneratedTaskResults(task) {  const results = (task.results || []).map((result) => ({
    ...result,
    model: result.model || task.model,
    kind: result.kind || task.kind,
    prompt: result.prompt || task.prompt,
    finalPrompt: result.finalPrompt || task.finalPrompt,
    variantIndex: result.variantIndex ?? task.variantIndex,
    totalForKind: result.totalForKind ?? task.totalForKind,
    promptSource: result.promptSource || task.promptSource,
    promptError: result.promptError || task.promptError || "",
    aspectRatio: result.aspectRatio || task.aspectRatio,
    imageSize: result.imageSize || task.imageSize,
    taskId: result.taskId || task.id
  }));
  if (!results.length) {
    results.push({
      model: task.model,
      kind: task.kind,
      promptSource: task.promptSource,
      aspectRatio: task.aspectRatio,
      imageSize: task.imageSize,
      taskId: task.id,
      status: "failed",
      error: "任务成功但未返回图片链接"
    });
  }
  return results;
}

async function generateImageForTest(event, payload) {
  const generationId = payload?.generationId || `${Date.now()}`;
  const featureScope = payload?.featureScope || "image";
  const sendGenerationProgress = (progress) => {
    event?.sender?.send?.("generation:progress", {
      ...progress,
      generationId,
      featureScope
    });
  };
  sendGenerationProgress({ stage: "accepted", progress: 2 });
  sendGenerationProgress({ stage: "loading-config", progress: 2 });
  const config = resolvePromptConfigForPayload(await getConfig(), payload);
  sendGenerationProgress({ stage: "validating", progress: 3 });
  if ((config.imageProviderType || "grsai") !== "grsai") {
    throw new Error("当前版本批量套图生成只完整支持 Grsai 作图协议。其他作图供应商配置已可保存，生成接口需要后续专门适配。");
  }
  if (!(config.imageApiKey || config.grsaiApiKey)) {
    throw new Error("请先在 API 设置中填写作图 API Key。");
  }
  assertPromptModelConfigured(config, "分类提示词生成");

  assertVisionPromptModelForPayload(config, payload, "Image prompt planning");

  const planItems = planItemsFromPayload(payload);
  if (!planItems.length) {
    throw new Error("请至少选择一种图片类型。");
  }
  const allResults = [];
  const completedTasks = new Array(planItems.length);
  const concurrency = resolveImageConcurrency(config, planItems.length);
  sendGenerationProgress({
    stage: "planning-items",
    current: 0,
    total: planItems.length,
    progress: 3
  });
  const suitePlan = null;
  const payloadWithSuitePlan = { ...payload, suitePlan };

  const promptPlan = await buildPromptPlan(config, payloadWithSuitePlan, planItems, suitePlan, (progress) => {
    sendGenerationProgress({
      ...progress,
      total: planItems.length
    });
  });

  event?.sender?.send?.("generation:plan", {
    generationId,
    featureScope,
    suitePlan,
    promptPlan: promptPlan.map((promptItem) => ({
      index: promptItem.index + 1,
      kind: promptItem.planItem.kind,
      variantIndex: promptItem.planItem.variantIndex,
      totalForKind: promptItem.planItem.totalForKind,
      promptSource: promptItem.promptSource,
      prompt: promptItem.prompt,
      status: promptItem.skipGeneration ? "failed" : "ready",
      error: promptItem.promptError || ""
    }))
  });

  event?.sender?.send?.("generation:batch", {
    generationId,
    featureScope,
    total: planItems.length,
    concurrency,
    items: promptPlan.map((promptItem, index) => ({
      index: index + 1,
      kind: promptItem.planItem.kind,
      variantIndex: promptItem.planItem.variantIndex,
      totalForKind: promptItem.planItem.totalForKind,
      promptSource: promptItem.promptSource
    }))
  });

  await runConcurrent(promptPlan, concurrency, async (promptItem, i) => {
    const planItem = promptItem.planItem;
    if (promptItem.skipGeneration) {
      const failedResult = promptFailureResult(promptItem, resolveConfiguredImageModel(config, payload.resolution));
      completedTasks[i] = {
        id: null,
        status: "failed",
        error: failedResult.error,
        model: failedResult.model,
        kind: planItem.kind,
        promptSource: failedResult.promptSource,
        results: []
      };
      allResults.push(failedResult);
      event?.sender?.send?.("generation:result", {
        generationId,
        featureScope,
        current: i + 1,
        total: planItems.length,
        kind: planItem.kind,
        status: "failed",
        error: failedResult.error,
        results: [failedResult]
      });
      event?.sender?.send?.("generation:progress", {
        generationId,
        featureScope,
        current: i + 1,
        total: planItems.length,
        kind: planItem.kind,
        status: "failed",
        progress: 100,
        error: failedResult.error
      });
      return;
    }
    try {
      const task = await generateOneImage(config, payloadWithSuitePlan, promptItem, i + 1, planItems.length, (progress) => {
        event?.sender?.send?.("generation:progress", {
          ...progress,
          generationId,
          featureScope,
          current: i + 1,
          total: planItems.length
        });
      });
      completedTasks[i] = task;
      const taskResults = await cacheGeneratedImageResults(normalizeGeneratedTaskResults(task));
      allResults.push(...taskResults);
      event?.sender?.send?.("generation:result", {
        generationId,
        featureScope,
        current: i + 1,
        total: planItems.length,
        kind: planItem.kind,
        status: "succeeded",
        results: taskResults
      });
    } catch (error) {
      const failedModel = (() => {
        try {
          return resolveImageModelForPayload(config, payloadWithSuitePlan);
        } catch {
          return resolveConfiguredImageModel(config, payload.resolution);
        }
      })();
      const failedTask = {
        id: null,
        status: "failed",
        error: error.message,
        model: failedModel,
        kind: planItem.kind,
        promptSource: promptItem.promptSource,
        results: []
      };
      completedTasks[i] = failedTask;
      const failedResult = {
        kind: planItem.kind,
        model: failedTask.model,
        promptSource: promptItem.promptSource,
        prompt: promptItem.prompt || promptItem.localPrompt,
        variantIndex: planItem.variantIndex,
        totalForKind: planItem.totalForKind,
        status: error.message.includes("超时") ? "timeout" : "failed",
        error: error.message
      };
      allResults.push(failedResult);
      event?.sender?.send?.("generation:result", {
        generationId,
        featureScope,
        current: i + 1,
        total: planItems.length,
        kind: planItem.kind,
        status: failedResult.status,
        error: error.message,
        results: [failedResult]
      });
      event?.sender?.send?.("generation:progress", {
        generationId,
        featureScope,
        current: i + 1,
        total: planItems.length,
        kind: planItem.kind,
        status: failedResult.status,
        progress: 100
      });
    }
  });

  const successCount = allResults.filter((result) => result.url).length;
  const allTimedOut = allResults.length > 0 && allResults.every((result) => result.status === "timeout" || /超时|timeout|timed out/i.test(String(result.error || "")));
  if (!successCount && allTimedOut) {
    throw new Error("作图 API 调用超时：全部图片任务都没有在限定时间内返回。请检查网络或稍后重试。");
  }

  const historyEntry = {
    id: `${Date.now()}`,
    createdAt: new Date().toISOString(),
    featureScope: payload.featureScope || "image",
    productInfo: payload.productInfo || "",
    productPackageMode: payload.productPackageMode || "single",
    platform: payload.brand?.platform || payload.platform || "",
    resolution: payload.resolution,
    ratio: payload.ratio,
    aPlusSize: payload.aPlusSize,
    imageKinds: normalizeImageKindSelection(payload.imageKinds),
    prompt: payload.finalPrompt,
    suitePlan,
    promptPlan: promptPlan.map((promptItem) => ({
      index: promptItem.index + 1,
      kind: promptItem.planItem.kind,
      variantIndex: promptItem.planItem.variantIndex,
      totalForKind: promptItem.planItem.totalForKind,
      promptSource: promptItem.promptSource,
      prompt: promptItem.prompt
    })),
    results: allResults
  };
  await appendHistory(historyEntry);

  return { results: allResults, tasks: completedTasks, concurrency, suitePlan, promptPlan: historyEntry.promptPlan };
}

async function generateImageCore(event, payload) {
  return generateImageForTest(event, payload);
}

function runBackgroundImageGeneration(event, payload = {}) {
  const generationId = payload?.generationId || `${Date.now()}`;
  const safePayload = { ...payload, generationId };
  const featureScope = safePayload.featureScope || "image";
  const sender = event.sender;
  const send = (channel, data) => {
    if (sender.isDestroyed?.()) return;
    sender.send(channel, {
      ...(data || {}),
      featureScope,
      generationId
    });
  };
  writeRuntimeLog("generation-background-start", { generationId, version: APP_VERSION, buildId: RUNTIME_BUILD_ID });
  setImmediate(async () => {
    try {
      const output = await generateImageCore({
        sender: {
          send: (channel, data) => send(channel, data)
        }
      }, safePayload);
      writeRuntimeLog("generation-background-done", {
        generationId,
        results: output?.results?.length || 0
      });
      send("generation:done", output);
    } catch (error) {
      writeRuntimeLog("generation-background-failed", {
        generationId,
        error: String(error?.stack || error?.message || error)
      });
      send("generation:failed", {
        error: String(error?.message || error || "图片生成失败")
      });
    }
  });
  return {
    generationId,
    accepted: true
  };
}

async function runConcurrent(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runNext() {
    for (;;) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= items.length) return;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => runNext()
  );
  await Promise.all(workers);
  return results;
}

async function generateOneImage(config, payload, promptItem, index, total, sendProgress, overridePrompt = "") {
  const startedAt = Date.now();
  const planItem = promptItem.planItem || promptItem;
  const imageProviderType = config.imageProviderType || "grsai";
  const imageProvider = config.imageProvider || "grsai";
  if (imageProviderType !== "grsai") {
    throw new Error(`当前作图供应商“${imageProvider}”已可保存配置，但批量套图生成暂时只完整支持 Grsai 协议。请切回 Grsai，或后续为该供应商补充专门适配。`);
  }
  const model = resolveImageModelForPayload(config, payload);
  const categoryPrompt = overridePrompt || promptItem.prompt || buildCategoryPrompt(payload, planItem);
  const promptAlreadyFinal = !overridePrompt && /^prompt-api/.test(String(promptItem.promptSource || ""));
  const modelPrompt = promptAlreadyFinal ? categoryPrompt : adaptImagePromptForModel(categoryPrompt, model, payload, planItem);
  const prompt = withNegativePrompt(modelPrompt, payload.negativePrompt);
  const requestBody = await resolveGrsaiGenerationBody(config, payload, model, prompt, planItem);
  const generationBody = {
    model: requestBody.model,
    prompt: requestBody.prompt,
    image: requestBody.image,
    size: requestBody.size,
    response_format: requestBody.response_format
  };

  sendProgress?.({
    stage: "submitting",
    index,
    total,
    kind: planItem.kind,
    model,
    promptSource: promptItem.promptSource || "local",
    aspectRatio: requestBody.aspectRatio,
    imageSize: requestBody.imageSize,
    progress: 3
  });

  const url = `${trimSlash(config.imageBaseUrl || config.grsaiBaseUrl)}/v1/images/generations`;
  let body;
  try {
    body = await requestJson(url, {
      method: "POST",
      headers: authHeaders(config.imageApiKey || config.grsaiApiKey),
      body: JSON.stringify(generationBody),
      timeoutMs: SINGLE_IMAGE_TIMEOUT_MS
    });
  } catch (error) {
    throw appendRequestDebug(error, "正式作图", {
      供应商: config.imageProvider || "grsai",
      模型: model,
      尺寸: requestBody.size,
      比例: requestBody.aspectRatio,
      分辨率: normalizeResolution(payload.resolution),
      图片类型: planItem.kind,
      参考图数量: requestBody.image.length,
      参考图格式: requestBody.referenceImageSummary,
      请求地址: url,
      配置文件: configPath()
    });
  }

  sendProgress?.({
    stage: "completed",
    id: body.id || String(body.created || startedAt),
    index,
    total,
    kind: planItem.kind,
    model,
    promptSource: promptItem.promptSource || "local",
    status: "succeeded",
    progress: 100
  });

  if (Date.now() - startedAt >= SINGLE_IMAGE_TIMEOUT_MS) {
    throw new Error("单张图片生成超时（5分钟）");
  }

  return {
    id: body.id || String(body.created || Date.now()),
    status: "succeeded",
    results: normalizeGrsaiGenerationResults(body, model, planItem),
    model,
    kind: planItem.kind,
    prompt: categoryPrompt,
    finalPrompt: prompt,
    modelPrompt,
    variantIndex: planItem.variantIndex,
    totalForKind: planItem.totalForKind,
    promptSource: promptItem.promptSource || "local",
    promptError: promptItem.promptError || "",
    aspectRatio: requestBody.aspectRatio,
    imageSize: requestBody.imageSize
  };
}

function buildRepairPrompt(payload = {}) {
  const basePrompt = String(payload.prompt || payload.finalPrompt || "").trim();
  const instruction = String(payload.repairInstruction || "").trim();
  const analysis = normalizeAnalysisResult(payload, payload.analysis || {});
  const planItem = {
    kind: payload.kind || "局部修复",
    variantIndex: Number(payload.variantIndex || 0),
    totalForKind: Number(payload.totalForKind || 1)
  };
  const productFactCard = buildProductFactCard(payload, analysis, 1200);
  const plausibilityRule = physicalPlausibilityAuditRule({ ...payload, analysis }, planItem);
  const locks = [
    analysis.part_function_map?.length ? `Part-function lock: ${analysis.part_function_map.join("; ")}.` : "",
    analysis.correct_use_method ? `Correct use method lock: ${analysis.correct_use_method}.` : "",
    analysis.forbidden_use_errors?.length ? `Forbidden use errors: ${analysis.forbidden_use_errors.join("; ")}.` : ""
  ].filter(Boolean).join(" ");
  return [
    "Edit the selected ecommerce image using the provided references.",
    "Reference image 1 is the current generated image to repair.",
    "Reference image 2 is a red marked overlay; the red marked area is the only area that should be changed.",
    "Additional reference images are original product references for product identity and correct structure.",
    productFactCard ? `Product fact card, factual lock only: ${productFactCard}` : "",
    "Repair task:",
    instruction,
    "Self-check before editing: identify the real object being repaired, the object it touches, and the correct attachment/contact point. The repair is successful only if the marked area becomes physically plausible.",
    plausibilityRule,
    "Keep all unmarked areas as visually unchanged as possible: same composition, camera angle, crop, background, lighting, colors, text zones, product count, and surrounding objects.",
    "Inside the marked area, correct the product deformation or wrong use while preserving exact product identity, material, proportions, colors, handle shape, blades, teeth, holes, rivets, seams, labels, and included components.",
    "If the marked problem is a handle or host-object relationship, place the handle only where it belongs on the host object or product rim/body. Do not route a pot/pan handle through the center of a cover, guard, liner, or accessory; do not weld a removable product to the cookware body.",
    "If the user's instruction conflicts with real product structure, follow real structure and produce the closest physically correct repair.",
    locks,
    basePrompt ? `Original image prompt context, lower priority than repair instruction and physical plausibility: ${compactPromptText(basePrompt, 1400)}` : "",
    "Do not create a new design, do not change the whole image, do not add extra products, and do not change the selected aspect ratio."
  ].filter(Boolean).join("\n");
}

async function repairOneImage(config, payload) {
  const imageProviderType = config.imageProviderType || "grsai";
  if (imageProviderType !== "grsai") {
    throw new Error("当前版本局部标记修复只完整支持 Grsai 作图协议。请切回 Grsai，或后续为该供应商补充专门适配。");
  }
  if (!(config.imageApiKey || config.grsaiApiKey)) {
    throw new Error("请先在 API 设置中填写作图 API Key。");
  }
  if (!payload?.sourceImage || !payload?.repairMarkImage) {
    throw new Error("局部修复失败：缺少当前图片或标记图。");
  }
  const model = resolveImageModelForPayload(config, payload);
  const planItem = {
    kind: payload.kind || "局部修复",
    variantIndex: Number(payload.variantIndex || 0),
    totalForKind: Number(payload.totalForKind || 1),
    globalIndex: 0
  };
  const images = [
    payload.sourceImage,
    payload.repairMarkImage,
    ...(payload.images || []).slice(0, 4)
  ].filter(Boolean);
  const requestBody = await resolveGrsaiGenerationBody(
    config,
    { ...payload, images },
    model,
    withNegativePrompt(buildRepairPrompt(payload), payload.negativePrompt),
    planItem
  );
  const generationBody = {
    model: requestBody.model,
    prompt: requestBody.prompt,
    image: requestBody.image,
    size: requestBody.size,
    response_format: requestBody.response_format
  };
  const url = `${trimSlash(config.imageBaseUrl || config.grsaiBaseUrl)}/v1/images/generations`;
  let body;
  try {
    body = await requestJson(url, {
      method: "POST",
      headers: authHeaders(config.imageApiKey || config.grsaiApiKey),
      body: JSON.stringify(generationBody),
      timeoutMs: SINGLE_IMAGE_TIMEOUT_MS
    });
  } catch (error) {
    throw appendRequestDebug(error, "局部修复作图", {
      供应商: config.imageProvider || "grsai",
      模型: model,
      尺寸: requestBody.size,
      比例: requestBody.aspectRatio,
      参考图数量: requestBody.image.length,
      参考图格式: requestBody.referenceImageSummary,
      请求地址: url,
      配置文件: configPath()
    });
  }
  return {
    id: body.id || String(body.created || Date.now()),
    status: "succeeded",
    results: normalizeGrsaiGenerationResults(body, model, planItem),
    model,
    kind: planItem.kind,
    prompt: payload.prompt || payload.finalPrompt || "",
    finalPrompt: requestBody.prompt,
    variantIndex: planItem.variantIndex,
    totalForKind: planItem.totalForKind,
    promptSource: "local-repair",
    aspectRatio: requestBody.aspectRatio,
    imageSize: requestBody.imageSize
  };
}

async function appendHistory(entry) {
  const current = await readJson(historyPath(), []);
  current.unshift(entry);
  await writeJson(historyPath(), current.slice(0, 80));
}

async function recoverHistoryFromCache() {
  await cleanupGeneratedImageCache();
  const current = await readJson(historyPath(), []);
  const history = Array.isArray(current) ? current : [];
  const knownPaths = new Set();
  for (const entry of history) {
    for (const result of entry.results || []) {
      const localPath = localPathFromResult(result);
      if (localPath) knownPaths.add(path.resolve(localPath));
    }
  }

  let files = [];
  try {
    files = await fs.readdir(generatedImagesDir(), { withFileTypes: true });
  } catch {
    return { recoveredCount: 0 };
  }

  const recovered = [];
  for (const file of files) {
    if (!file.isFile()) continue;
    const ext = path.extname(file.name).toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) continue;
    const filePath = path.join(generatedImagesDir(), file.name);
    const resolved = path.resolve(filePath);
    if (knownPaths.has(resolved) || !isInsideGeneratedImagesDir(resolved)) continue;
    let stat;
    try {
      stat = await fs.stat(resolved);
    } catch {
      continue;
    }
    const cachedAt = new Date(stat.mtimeMs || Date.now()).toISOString();
    const expiresAt = new Date((stat.mtimeMs || Date.now()) + GENERATED_IMAGE_RETENTION_MS).toISOString();
    recovered.push({
      id: `recovered-${Math.round(stat.mtimeMs)}-${crypto.randomUUID()}`,
      createdAt: cachedAt,
      productInfo: "从本地图片缓存恢复",
      productPackageMode: "single",
      platform: "",
      resolution: "",
      ratio: "",
      imageKinds: [{ kind: "缓存恢复", count: 1 }],
      prompt: "[已恢复] 该记录由本地缓存图片重建，原始提示词不可用。",
      results: [{
        url: pathToFileURL(resolved).href,
        localPath: resolved,
        cachedAt,
        expiresAt,
        kind: "缓存恢复",
        status: "succeeded"
      }]
    });
  }

  if (recovered.length) {
    await writeJson(historyPath(), [...recovered.reverse(), ...history].slice(0, 80));
  }

  return { recoveredCount: recovered.length };
}

if (app && ipcMain && process.env.PRODUCT_IMAGE_STUDIO_TEST_MODE !== "1") {
  const gotSingleInstanceLock = app.requestSingleInstanceLock();
  if (!gotSingleInstanceLock) {
    writeRuntimeLog("second-instance-quit", { version: APP_VERSION, buildId: RUNTIME_BUILD_ID });
    app.quit();
  } else {
    app.on("second-instance", () => {
      writeRuntimeLog("second-instance-focus", { version: APP_VERSION, buildId: RUNTIME_BUILD_ID });
      if (!mainWindow) return;
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    });
  }

  if (gotSingleInstanceLock) {
    app.whenReady().then(async () => {
    try {
      await session.defaultSession.clearCache();
      await session.defaultSession.clearStorageData({
        storages: ["cachestorage", "shadercache", "serviceworkers"]
      });
      writeRuntimeLog("electron-cache-cleared", { version: APP_VERSION, buildId: RUNTIME_BUILD_ID });
    } catch (error) {
      writeRuntimeLog("electron-cache-clear-failed", { error: String(error?.message || error) });
    }
    pruneExpiredHistoryResults().catch((error) => {
      console.error("Failed to prune expired history results on startup:", error);
    });
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

    app.on("window-all-closed", () => {
      if (process.platform !== "darwin") app.quit();
    });
  }

  ipcMain.handle("config:get", async () => getConfig());
  ipcMain.handle("runtime:info", async () => ({
    version: APP_VERSION,
    buildId: RUNTIME_BUILD_ID,
    mainJs: __filename,
    userData: app.getPath("userData"),
    runtimeLog: runtimeLogPath()
  }));

  ipcMain.handle("runtime:clientLog", async (_event, payload = {}) => {
    writeRuntimeLog("renderer-event", {
      version: APP_VERSION,
      mainBuildId: RUNTIME_BUILD_ID,
      ...(payload || {})
    });
    return { ok: true };
  });

  ipcMain.handle("update:check", async (_event, payload = {}) => {
    return checkForAppUpdate(payload || {});
  });

  ipcMain.handle("update:openUrl", async (_event, url) => {
    const safeUrl = normalizeUpdateUrl(url);
    if (!safeUrl) throw new Error("更新链接为空或不是 http/https 地址。");
    await shell.openExternal(safeUrl);
    return { ok: true };
  });

  ipcMain.handle("config:save", async (_event, config) => {
    const promptSettings = normalizePromptProviderConfig(config || {});
    const imageSettings = normalizeImageProviderConfig(config || {});
    const next = {
      ...DEFAULT_CONFIG,
      ...config,
      promptProvider: promptSettings.promptProvider,
      promptBaseUrl: promptSettings.promptBaseUrl,
      promptModel: promptSettings.promptModel || DEFAULT_CONFIG.promptModel,
      promptEndpoint: promptSettings.promptEndpoint,
      promptProviderKeys: normalizeStringMap(config?.promptProviderKeys),
      promptProviderModels: normalizeStringArrayMap(config?.promptProviderModels),
      promptProviderLastModels: normalizeStringMap(config?.promptProviderLastModels),
      promptProviderMeta: normalizePromptProviderMetaMap(config?.promptProviderMeta),
      promptProviderNotes: normalizePromptProviderNotesMap(config?.promptProviderNotes),
      promptProviderApiOptions: normalizePromptProviderApiOptionsMap(config?.promptProviderApiOptions),
      promptModelCapabilities: normalizePromptModelCapabilitiesMap(config?.promptModelCapabilities),
      promptScopeConfigs: normalizePromptScopeConfigs(config?.promptScopeConfigs),
      imageProvider: imageSettings.imageProvider,
      imageProviderType: imageSettings.imageProviderType,
      imageProviderKeys: normalizeStringMap(config?.imageProviderKeys, normalizeImageProvider),
      imageProviderModels: normalizeStringArrayMap(config?.imageProviderModels, normalizeImageProvider),
      imageProviderLastModels: normalizeStringMap(config?.imageProviderLastModels, normalizeImageModelSlotKey),
      imageBaseUrl: imageSettings.imageBaseUrl,
      grsaiBaseUrl: imageSettings.imageBaseUrl,
      imageApiKey: String(config?.imageApiKey || config?.grsaiApiKey || "").trim(),
      grsaiConcurrency: Math.max(1, Math.min(MAX_IMAGE_CONCURRENCY, Math.floor(Number(config?.grsaiConcurrency || DEFAULT_CONFIG.grsaiConcurrency)) || DEFAULT_CONFIG.grsaiConcurrency)),
      imageModelRoute: normalizeImageModelRoute(config?.imageModelRoute),
      featureImageModelRoutes: normalizeFeatureImageModelRoutes(config?.featureImageModelRoutes),
      image1kModel: imageSettings.image1kModel,
      image2kModel: imageSettings.image2kModel,
      grsai1kModel: imageSettings.image1kModel,
      grsai2kModel: imageSettings.image2kModel,
      trendProxyUrl: normalizeProxyUrl(config?.trendProxyUrl)
    };
    await writeJson(configPath(), next);
    return next;
  });

  ipcMain.handle("history:get", async () => pruneExpiredHistoryResults());
  ipcMain.handle("history:recoverFromCache", async () => recoverHistoryFromCache());
  ipcMain.handle("prompt:testConnection", async (_event, config) => testPromptApiConnection(config));
  ipcMain.handle("prompt:listModels", async (_event, config) => listPromptApiModels(config));
  ipcMain.handle("image:testConnection", async (_event, config) => testImageApiConnection(config));
  ipcMain.handle("image:listModels", async (_event, config) => listImageApiModels(config));

  ipcMain.handle("prompt:analyze", async (_event, payload) => analyzePrompt(payload));
  ipcMain.handle("ai:file:read", async (_event, payload) => readAiWorkspaceFile(payload));
  ipcMain.handle("ai:chat", async (_event, payload) => runAiWorkspaceChat(payload));
  ipcMain.handle("ai:image", async (_event, payload) => runAiWorkspaceImage(payload));
  ipcMain.handle("title:optimize", async (_event, payload) => optimizeTitle(payload));

  ipcMain.handle("image:generate", async (event, payload) => {
    return runBackgroundImageGeneration(event, payload);
  });

  ipcMain.handle("image:generateLegacy", async (event, payload) => {
    const generationId = payload?.generationId || `${Date.now()}`;
    const featureScope = payload?.featureScope || "image";
    const sendGenerationProgress = (progress) => {
      event.sender.send("generation:progress", {
        ...progress,
        generationId,
        featureScope
      });
    };
    sendGenerationProgress({ stage: "accepted", progress: 2 });
    sendGenerationProgress({ stage: "loading-config", progress: 2 });
    const config = resolvePromptConfigForPayload(await getConfig(), payload);
    sendGenerationProgress({ stage: "validating", progress: 3 });
    if ((config.imageProviderType || "grsai") !== "grsai") {
      throw new Error("当前版本批量套图生成只完整支持 Grsai 作图协议。其他作图供应商配置已可保存，生成接口需要后续专门适配。");
    }
    if (!(config.imageApiKey || config.grsaiApiKey)) {
      throw new Error("请先在 API 设置中填写作图 API Key。");
    }
    assertPromptModelConfigured(config, "分类提示词生成");

    assertVisionPromptModelForPayload(config, payload, "Image prompt planning");

    const planItems = planItemsFromPayload(payload);
    if (!planItems.length) {
      throw new Error("请至少选择一种图片类型。");
    }
    const allResults = [];
    const completedTasks = new Array(planItems.length);
    const concurrency = resolveImageConcurrency(config, planItems.length);
    sendGenerationProgress({
      stage: "planning-items",
      current: 0,
      total: planItems.length,
      progress: 3
    });
    const suitePlan = null;
    const payloadWithSuitePlan = { ...payload, suitePlan };

    const promptPlan = await buildPromptPlan(config, payloadWithSuitePlan, planItems, suitePlan, (progress) => {
      sendGenerationProgress({
        ...progress,
        total: planItems.length
      });
    });

    event.sender.send("generation:plan", {
      generationId,
      featureScope,
      suitePlan,
      promptPlan: promptPlan.map((promptItem) => ({
        index: promptItem.index + 1,
        kind: promptItem.planItem.kind,
        variantIndex: promptItem.planItem.variantIndex,
        totalForKind: promptItem.planItem.totalForKind,
        promptSource: promptItem.promptSource,
        prompt: promptItem.prompt,
        status: promptItem.skipGeneration ? "failed" : "ready",
        error: promptItem.promptError || ""
      }))
    });

    event.sender.send("generation:batch", {
      generationId,
      featureScope,
      total: planItems.length,
      concurrency,
      items: promptPlan.map((promptItem, index) => ({
        index: index + 1,
        kind: promptItem.planItem.kind,
        variantIndex: promptItem.planItem.variantIndex,
        totalForKind: promptItem.planItem.totalForKind,
        promptSource: promptItem.promptSource,
        status: promptItem.skipGeneration ? "failed" : "pending",
        error: promptItem.promptError || ""
      }))
    });

    await runConcurrent(promptPlan, concurrency, async (promptItem, i) => {
      const planItem = promptItem.planItem;
      if (promptItem.skipGeneration) {
        const failedResult = promptFailureResult(promptItem, resolveConfiguredImageModel(config, payload.resolution));
        completedTasks[i] = {
          id: null,
          status: "failed",
          error: failedResult.error,
          model: failedResult.model,
          kind: planItem.kind,
          promptSource: failedResult.promptSource,
          results: []
        };
        allResults.push(failedResult);
        event.sender.send("generation:result", {
          generationId,
          featureScope,
          current: i + 1,
          total: planItems.length,
          kind: planItem.kind,
          status: "failed",
          error: failedResult.error,
          results: [failedResult]
        });
        event.sender.send("generation:progress", {
          generationId,
          featureScope,
          current: i + 1,
          total: planItems.length,
          kind: planItem.kind,
          status: "failed",
          progress: 100,
          error: failedResult.error
        });
        return;
      }
      try {
      const task = await generateOneImage(config, payloadWithSuitePlan, promptItem, i + 1, planItems.length, (progress) => {
        event.sender.send("generation:progress", {
          ...progress,
          generationId,
          featureScope,
          current: i + 1,
          total: planItems.length
        });
      });
      completedTasks[i] = task;
      const taskResults = await cacheGeneratedImageResults(normalizeGeneratedTaskResults(task));
      allResults.push(...taskResults);
        event.sender.send("generation:result", {
          generationId,
          featureScope,
          current: i + 1,
          total: planItems.length,
          kind: planItem.kind,
          status: "succeeded",
          results: taskResults
        });
      } catch (error) {
        const failedModel = (() => {
          try {
            return resolveImageModelForPayload(config, payloadWithSuitePlan);
          } catch {
            return resolveConfiguredImageModel(config, payload.resolution);
          }
        })();
        const failedTask = {
          id: null,
          status: "failed",
          error: error.message,
          model: failedModel,
          kind: planItem.kind,
          promptSource: promptItem.promptSource,
          results: []
        };
        completedTasks[i] = failedTask;
        const failedResult = {
          kind: planItem.kind,
          model: failedTask.model,
          promptSource: promptItem.promptSource,
          prompt: promptItem.prompt || promptItem.localPrompt,
          variantIndex: planItem.variantIndex,
          totalForKind: planItem.totalForKind,
          status: error.message.includes("超时") ? "timeout" : "failed",
          error: error.message
        };
        allResults.push(failedResult);
        event.sender.send("generation:result", {
          generationId,
          featureScope,
          current: i + 1,
          total: planItems.length,
          kind: planItem.kind,
          status: failedResult.status,
          error: error.message,
          results: [failedResult]
        });
        event.sender.send("generation:progress", {
          generationId,
          featureScope,
          current: i + 1,
          total: planItems.length,
          kind: planItem.kind,
          status: failedResult.status,
          progress: 100
        });
      }
    });

    const successCount = allResults.filter((result) => result.url).length;
    const allTimedOut = allResults.length > 0 && allResults.every((result) => result.status === "timeout" || /超时|timeout|timed out/i.test(String(result.error || "")));
    if (!successCount && allTimedOut) {
      throw new Error("作图 API 调用超时：全部图片任务都没有在限定时间内返回。请检查网络或稍后重试。");
    }

    const historyEntry = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      featureScope: payload.featureScope || "image",
      productInfo: payload.productInfo || "",
      productPackageMode: payload.productPackageMode || "single",
      platform: payload.brand?.platform || payload.platform || "",
      resolution: payload.resolution,
      ratio: payload.ratio,
      aPlusSize: payload.aPlusSize,
      imageKinds: normalizeImageKindSelection(payload.imageKinds),
      prompt: payload.finalPrompt,
      suitePlan,
      promptPlan: promptPlan.map((promptItem) => ({
        index: promptItem.index + 1,
        kind: promptItem.planItem.kind,
        variantIndex: promptItem.planItem.variantIndex,
        totalForKind: promptItem.planItem.totalForKind,
        promptSource: promptItem.promptSource,
        prompt: promptItem.prompt,
        status: promptItem.skipGeneration ? "failed" : "ready",
        error: promptItem.promptError || ""
      })),
      results: allResults
    };
    await appendHistory(historyEntry);

    return { results: allResults, tasks: completedTasks, concurrency, suitePlan, promptPlan: historyEntry.promptPlan };
  });

  ipcMain.handle("image:regenerate", async (_event, payload) => {
    const config = await getConfig();
    if ((config.imageProviderType || "grsai") !== "grsai") {
      throw new Error("当前版本单张重生成只完整支持 Grsai 作图协议。请切回 Grsai，或后续为该供应商补充专门适配。");
    }
    if (!(config.imageApiKey || config.grsaiApiKey)) {
      throw new Error("请先在 API 设置中填写作图 API Key。");
    }
    const prompt = String(payload?.prompt || "").trim();
    if (!prompt) {
      throw new Error("单张重生成失败：当前图片提示词为空。");
    }

    const planItem = {
      kind: payload.kind || "结果图",
      variantIndex: Number(payload.variantIndex || 0),
      totalForKind: Number(payload.totalForKind || 1),
      globalIndex: 0
    };
    const promptItem = {
      index: 0,
      planItem,
      prompt,
      promptSource: "manual-edit"
    };
    const task = await generateOneImage(config, payload, promptItem, 1, 1);
    const results = await cacheGeneratedImageResults(normalizeGeneratedTaskResults(task));
    const historyEntry = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      featureScope: payload.featureScope || "image",
      productInfo: payload.productInfo || "",
      productPackageMode: payload.productPackageMode || "single",
      platform: payload.brand?.platform || payload.platform || "",
      resolution: payload.resolution,
      ratio: payload.ratio,
      aPlusSize: payload.aPlusSize,
      imageKinds: [{ kind: planItem.kind, count: 1 }],
      prompt: payload.finalPrompt || prompt,
      suitePlan: payload.suitePlan || null,
      promptPlan: [{
        index: 1,
        kind: planItem.kind,
        variantIndex: planItem.variantIndex,
        totalForKind: planItem.totalForKind,
        promptSource: "manual-edit",
        prompt
      }],
      results
    };
    await appendHistory(historyEntry);
    return { result: results[0], results };
  });

  ipcMain.handle("image:repair", async (_event, payload) => {
    const config = await getConfig();
    const task = await repairOneImage(config, payload);
    const results = await cacheGeneratedImageResults(normalizeGeneratedTaskResults(task));
    const historyEntry = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      featureScope: payload.featureScope || "image",
      productInfo: payload.productInfo || "",
      productPackageMode: payload.productPackageMode || "single",
      platform: payload.brand?.platform || payload.platform || "",
      resolution: payload.resolution,
      ratio: payload.ratio,
      aPlusSize: payload.aPlusSize,
      imageKinds: [{ kind: payload.kind || "局部修复", count: 1 }],
      prompt: payload.finalPrompt || payload.prompt || "",
      suitePlan: payload.suitePlan || null,
      promptPlan: [{
        index: 1,
        kind: payload.kind || "局部修复",
        variantIndex: Number(payload.variantIndex || 0),
        totalForKind: Number(payload.totalForKind || 1),
        promptSource: "local-repair",
        prompt: task.finalPrompt
      }],
      results
    };
    await appendHistory(historyEntry);
    return { result: results[0], results };
  });

  ipcMain.handle("image:whiteBackground", async (_event, payload) => {
    const config = await getConfig();
    if ((config.imageProviderType || "grsai") !== "grsai") {
      throw new Error("当前版本白底图制作只完整支持 Grsai 作图协议。请切回 Grsai，或后续为该供应商补充专门适配。");
    }
    if (!(config.imageApiKey || config.grsaiApiKey)) {
      throw new Error("请先在 API 设置中填写作图 API Key。");
    }
    if (!payload?.images?.length) {
      throw new Error("请先上传需要抠白底的产品图片。");
    }

    const requestBody = await resolveWhiteBackgroundBody(config, payload);
    const model = requestBody.model;
    const generationBody = {
      model: requestBody.model,
      prompt: requestBody.prompt,
      image: requestBody.image,
      size: requestBody.size,
      response_format: requestBody.response_format
    };
    const url = `${trimSlash(config.imageBaseUrl || config.grsaiBaseUrl)}/v1/images/generations`;
    let body;
    try {
      body = await requestJson(url, {
        method: "POST",
        headers: authHeaders(config.imageApiKey || config.grsaiApiKey),
        body: JSON.stringify(generationBody),
        timeoutMs: SINGLE_IMAGE_TIMEOUT_MS
      });
    } catch (error) {
      throw appendRequestDebug(error, "白底作图", {
        供应商: config.imageProvider || "grsai",
        模型: model,
        尺寸: requestBody.size,
        比例: requestBody.aspectRatio,
        参考图数量: requestBody.image.length,
        参考图格式: requestBody.referenceImageSummary,
        请求地址: url,
        配置文件: configPath()
      });
    }

    const result = normalizeGrsaiGenerationResults(body, model, { kind: "白底图" })[0];
    if (!result?.url) {
      throw new Error("白底图生成成功但未返回图片链接。");
    }

    return cacheGeneratedImageResult({
      id: body.id || String(body.created || Date.now()),
      status: "succeeded",
      url: result.url,
      model,
      kind: "白底图",
      aspectRatio: requestBody.aspectRatio,
      imageSize: requestBody.imageSize
    });
  });

  ipcMain.handle("image:saveFromUrl", async (_event, payload) => {
    const url = payload?.url;
    if (!url) throw new Error("缺少图片链接。");

    const defaultName = payload.name || `product-image-${Date.now()}.png`;
    const uiState = await getUiState();
    const savedDir = uiState.lastImageSaveDir || "";
    const savedDirExists = savedDir
      ? await fs.access(savedDir).then(() => true).catch(() => false)
      : false;
    const preferredSaveDir = savedDirExists ? savedDir : app.getPath("downloads");
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "保存图片",
      defaultPath: path.join(preferredSaveDir, defaultName),
      filters: [
        { name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });

    if (canceled || !filePath) return null;

    const { buffer } = await readImageSourceBuffer(url);
    await fs.writeFile(filePath, buffer);
    await saveUiStatePatch({ lastImageSaveDir: path.dirname(filePath) });
    return filePath;
  });

  ipcMain.handle("external:open", async (_event, url) => {
    if (url) await shell.openExternal(url);
  });
}

module.exports = {
  analyzePromptForTest: analyzePrompt,
  buildAplusWriteRequestForTest: buildAplusWriteRequest,
  buildCategoryPrompt,
  buildTitleOptimizationRequest,
  buildPromptPlan,
  buildRepairPrompt,
  buildProductFactCard,
  buildProductIdentityLock,
  adaptImagePromptForModel,
  categoryEvidenceRule,
  filterCommercialSearchTerms,
  findTitleContextMismatches,
  generateImageForTest,
  getConfig,
  generateOneImage,
  listImageApiModelsForTest: listImageApiModels,
  listPromptApiModelsForTest: listPromptApiModels,
  normalizeGrsaiReferenceImagesForTest: normalizeGrsaiReferenceImages,
  grsaiGenerationReferenceSourcesForTest: grsaiGenerationReferenceSources,
  assertNoLocalFileReferencesInOutboundRequestForTest: assertNoLocalFileReferencesInOutboundRequest,
  containsLocalFileReferenceForTest: containsLocalFileReference,
  inferProductMechanism,
  normalizeGeneratedTaskResults,
  normalizeImageKindSelection,
  normalizeTitleOptimizationResult,
  optimizeTitle,
  planItemsFromPayload,
  physicalPlausibilityAuditRule,
  pruneExpiredHistoryResultsForTest: pruneExpiredHistoryResults,
  recoverHistoryFromCacheForTest: recoverHistoryFromCache,
  runBackgroundImageGenerationForTest: runBackgroundImageGeneration,
  sanitizeFinalImagePromptText,
  sanitizeProductIdentityBrief,
  saveConfigForTest,
  testImageApiConnectionForTest: testImageApiConnection,
  testPromptApiConnectionForTest: testPromptApiConnection,
  validateTitleOptimizationResult,
  visualStrategyFromPayload
};
