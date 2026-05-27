const electron = require("electron");
const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell
} = typeof electron === "object" ? electron : {};
const fs = require("node:fs/promises");
const http = require("node:http");
const https = require("node:https");
const path = require("node:path");
const crypto = require("node:crypto");
const { pathToFileURL, fileURLToPath } = require("node:url");

const DEFAULT_CONFIG = {
  promptProvider: "grsai-gemini",
  promptBaseUrl: "https://grsai.dakka.com.cn/v1",
  promptApiKey: "",
  promptProviderKeys: {},
  promptModel: "gemini-3.1-pro",
  promptProviderModels: {},
  promptProviderLastModels: {},
  promptProviderMeta: {},
  promptProviderApiOptions: {},
  promptModelCapabilities: {},
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
  image1kModel: "gpt-image-2",
  image2kModel: "gpt-image-2-vip",
  defaultRegion: "US",
  defaultLanguage: "English",
  defaultPlatform: "Amazon"
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
    promptModel: "claude-3-5-sonnet-latest",
    promptEndpoint: "anthropic"
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
    promptModel: "doubao-seed-1-6-vision-250615",
    promptEndpoint: "chat"
  },
  zhipu: {
    promptBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
    promptModel: "glm-5.1",
    promptEndpoint: "chat"
  },
  xiaomi: {
    promptBaseUrl: "https://api.xiaomimimo.com/v1",
    promptModel: "mimo-v2.5-pro",
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
const PROMPT_API_TIMEOUT_MS = 90 * 1000;
const TITLE_OPTIMIZATION_TIMEOUT_MS = 3 * 60 * 1000;
const MAX_IMAGE_CONCURRENCY = 12;
const MAX_KIND_COUNT = 10;
const GENERATED_IMAGE_RETENTION_MS = 3 * 24 * 60 * 60 * 1000;
const CATEGORY_PROMPT_REWRITE_CHUNK_SIZE = 4;
const LEGACY_DETAIL_KIND = "\u8be6\u60c5\u56fe";
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

function normalizeImageModelRoute(value) {
  const text = String(value || "").trim();
  if (text && (text === "auto" || GRSAI_IMAGE_MODEL_INFO[text])) return text;
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
    promptProviderApiOptions: normalizePromptProviderApiOptionsMap(config?.promptProviderApiOptions),
    promptModelCapabilities: normalizePromptModelCapabilitiesMap(config?.promptModelCapabilities),
    imageProvider: imageSettings.imageProvider,
    imageProviderType: imageSettings.imageProviderType,
    imageProviderKeys: normalizeStringMap(config?.imageProviderKeys, normalizeImageProvider),
    imageProviderModels: normalizeStringArrayMap(config?.imageProviderModels, normalizeImageProvider),
    imageProviderLastModels: normalizeStringMap(config?.imageProviderLastModels, normalizeImageModelSlotKey),
    imageBaseUrl: imageSettings.imageBaseUrl,
    grsaiBaseUrl: imageSettings.imageBaseUrl,
    imageApiKey: String(config?.imageApiKey || config?.grsaiApiKey || "").trim(),
    imageModelRoute: normalizeImageModelRoute(config?.imageModelRoute),
    image1kModel: imageSettings.image1kModel,
    image2kModel: imageSettings.image2kModel,
    grsai1kModel: imageSettings.image1kModel,
    grsai2kModel: imageSettings.image2kModel,
    trendProxyUrl: normalizeProxyUrl(config?.trendProxyUrl)
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
  return { ...merged, ...normalizePromptProviderConfig(merged), ...normalizeImageProviderConfig(merged) };
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
  const isPresetProvider = promptProvider !== "custom";
  const promptBaseUrl = trimSlash(isPresetProvider && preset.promptBaseUrl
    ? preset.promptBaseUrl
    : (config.promptBaseUrl || ""));
  const promptModel = String(config.promptModel || preset.promptModel || "").trim();
  const requestedEndpoint = String(config.promptEndpoint || "").trim();
  const supportedEndpoints = ["responses", "chat", "auto", "gemini", "anthropic"];
  const promptEndpoint = supportedEndpoints.includes(requestedEndpoint)
    ? requestedEndpoint
    : (isPresetProvider && preset.promptEndpoint ? preset.promptEndpoint : "chat");

  return {
    promptProvider,
    promptBaseUrl,
    promptModel,
    promptEndpoint
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
  const imageBaseUrl = trimSlash(isPresetProvider && Object.prototype.hasOwnProperty.call(preset, "baseUrl")
    ? preset.baseUrl
    : (config.imageBaseUrl || config.grsaiBaseUrl || ""));
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

function promptEndpointPreview(config = {}) {
  const baseUrl = trimSlash(config.promptBaseUrl);
  const endpoint = config.promptEndpoint || "chat";
  if (endpoint === "chat") return `${baseUrl}/chat/completions`;
  if (endpoint === "responses") return `${baseUrl}/responses`;
  if (endpoint === "gemini") return `${baseUrl}/models/${config.promptModel || "{model}"}:generateContent`;
  if (endpoint === "anthropic") return `${baseUrl}/messages`;
  return `${baseUrl}/chat/completions 或 /responses`;
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
  return next;
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
    .join(", ") || "主图 x1";

  return [
    `商品信息: ${payload.productInfo || "未填写"}`,
    `产品形态: ${packageModeLabel(payload.productPackageMode)}`,
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
    "如果用户只填写产品名称，必须把该名称当作待识别商品，结合目标地区常见零售用途推断真实使用对象、使用动作、买家痛点和不可误判点；不确定时在 warnings 和 regional_use_context.assumptions_zh 说明假设。",
    "上传图片固定为真实产品图，只用于识别并保持产品本体，不作为外部模板案例。",
    "只输出可复用的商品事实、卖点和基础视觉方向。商品身份必须以上传产品图和用户商品信息为准。",
    "如果平台是 Temu，请将卖点表达改成更安全的用户收益方向，避免使用高风险合规词，不要直接写违规词，不要直接把材质名当成画面文案。",
    "卖点图只允许围绕用户痛点解决来规划：每张卖点图解决一个具体痛点。画面和文案都必须是痛点到结果，不要把功能证明、材质细节、使用场景、套装价值、数量价值或产品结构介绍当成卖点图方向。",
    "如果只生成 1 张卖点图，优先规划成强视觉对比的痛点解决图：左侧问题状态，右侧解决后状态，具体对比方式必须由产品真实用途决定。",
    "Temu 主图如需文字标签，只能是数量或低风险结果词；不要把尺寸、容量、温度、承重、百分比、倍数、兼容范围或技术测量值规划成主图文字。",
    "基础提示词只允许写产品身份事实：品类、外形、颜色、材质、结构、数量/套装信息、适用平台和语言。不要写构图、背景、灯光、阴影、排版、镜头、画幅比例、分辨率、文字样式、极简风格或白底要求。",
    "必须先做产品功能机制核验：对每个可见工作部件分别判断用途、目标物、接触位置、手持方向和不可混用的错误用法。多功能工具尤其要区分不同刀口/齿/孔/开口/按钮的真实功能，不能把一个部件的用途套到另一个部件上。",
    "如果是削皮器、刨丝器、梳齿刀、锯齿工具等厨房工具，必须明确：削皮动作使用真实削皮刀口贴住果蔬表皮；梳齿/锯齿/细齿通常用于刨丝、切丝、划丝或辅助处理，不能默认拿来削皮，除非产品事实明确说明。",
    "若产品形态为组合装，必须把不同组件/规格/配件作为购买单位理解；若为多 PCS 装，必须把数量感、整包价值感、可数排列或密集堆叠作为重要视觉方向；若为单品，默认以单个产品和真实使用关系为主。",
    "判断产品复杂度：如果有接口、按钮、孔位、螺丝、齿、刀片、透明结构、包装文字、多零件或精细图案，应在 misjudgment_risks 和 detail_focus_areas 中明确提醒需要保真，避免重新设计产品细节。",
    "不要在基础提示词里把多个图片类型揉成一个画面，不要要求拼图，不要要求九宫格，不要要求多面板。"
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
    const candidates = [
      ["chat", callChatApi],
      ["responses", callResponsesApi],
      ["gemini", callGeminiApi],
      ["anthropic", callAnthropicApi]
    ];
    let lastError;
    for (const [, caller] of candidates) {
      try {
        return await caller(config, systemPrompt, userText, safeImages);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
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

function promptApiTestMessages() {
  return {
    system: "You are an API health check endpoint. Reply with compact JSON only.",
    user: "Return exactly this JSON object: {\"ok\":true,\"message\":\"connected\"}"
  };
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
    const text = responseText(body) || JSON.stringify(body || {});
    const requestUrl = promptEndpointPreview(safeConfig);
    return {
      ok: true,
      model: safeConfig.promptModel,
      provider: safeConfig.promptProvider,
      endpoint: safeConfig.promptEndpoint,
      requestUrl,
      response: text.slice(0, 300)
    };
  } catch (error) {
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
    return {
      ok: true,
      models: Array.from(new Set(models)).sort()
    };
  } catch (error) {
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
  const config = await getConfig();
  const normalizedPayload = {
    ...payload,
    platform: normalizePlatformName(payload.platform || payload.brand?.platform || "Temu")
  };

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
  if (options.streamOptions) body.stream_options = { include_usage: true };
  if (options.serviceTier) body.service_tier = "auto";
  if (options.enableThinking) body.enable_thinking = true;
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

async function analyzePrompt(payload) {
  const savedConfig = await getConfig();
  const incomingPromptConfig = payload?.promptConfig && typeof payload.promptConfig === "object" ? payload.promptConfig : null;
  const config = incomingPromptConfig
    ? normalizePromptApiConfig({
        ...savedConfig,
        promptProviderKeys: savedConfig.promptProviderKeys,
        promptProviderModels: savedConfig.promptProviderModels,
        promptProviderLastModels: savedConfig.promptProviderLastModels,
        ...incomingPromptConfig
      })
    : savedConfig;
  assertPromptModelConfigured(config, "商品识别/提示词生成");

  const systemPrompt = [
    "你是电商商品图视觉策划师和图片生成提示词工程师。",
    "用户上传的图片固定为真实产品图，不是模板案例；你需要识别并保持产品本体，理解商品类型、材质、颜色、核心卖点和适合的电商平台表达。",
    "如果用户只填写产品名称，你也必须基于该名称、目标地区、发布平台和常见零售语境推断真实用途、适配对象、使用动作、买家痛点和禁忌误判点；不要因为信息短就只复述名称。",
    "当品牌主色或字体风格为 auto 时，你必须给出具体可执行的智能主色方案：主色、副色、强调色、中性色、背景色、文字色和选择理由。颜色必须符合产品品类、真实用途、材质、目标地区和平台点击语境；不要输出 auto、generic、随意紫色或只给白灰木色。",
    "不要把外部模板案例当成输入要求；分类图片的风格规则由系统提示词控制，不需要用户上传模板图。",
    "你给出的卖点必须适合后续视觉化成电商图片，而且卖点图只允许解决用户痛点，画面和文案都必须是痛点到结果；不要把功能证明、材质细节、使用场景、套装价值、数量价值或产品结构介绍当成卖点图主题。",
    "如果平台是 Temu，卖点表达必须主动规避高风险词汇、促销词、绝对化词、医疗安全健康环保类高风险表达，以及容易触发审核的材质直述。",
    "如果平台是 Temu，主图文字标签只允许数量或低风险结果词，不能规划尺寸、容量、温度、承重、百分比、倍数、兼容范围或技术测量值。",
    "如果只生成 1 张卖点图，应优先规划左侧痛点、右侧解决后的强对比画面；对比方式必须来自产品真实用途。",
    "如果产品有接口、按钮、孔位、螺丝、齿、刀片、透明结构、包装文字、多零件或精细图案，应在 misjudgment_risks 和 detail_focus_areas 中明确需要保真，避免重新设计产品细节。",
    "所有字段名包含 _zh 的值必须使用简体中文表达，禁止返回英文句子；所有字段名包含 _en 的值继续使用英文，供后续生图提示词使用。",
    "输出必须是严格 JSON，不要 Markdown，不要额外解释。",
    "JSON 字段:",
    "product_summary_zh: 中文商品识别摘要;",
    "selling_points_zh: 中文卖点数组;",
    "product_package_mode: 从 single, bundle, multipack 中选择，必须遵守用户产品形态;",
    "product_mechanism: 从 liner, cover, bag, wrap, insert, tray, container, accessory, organizer, tablet, pod, sheet, liquid, textile, tool, unknown 中选择;",
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
  const image = await normalizeGrsaiReferenceImages(payload.images || [], 6);
  const promptWithAspect = [aspectRatioInstruction(ratio, size), prompt].filter(Boolean).join("\n\n");
  return {
    model,
    prompt: promptWithAspect,
    image,
    referenceImageSummary: summarizeGrsaiReferenceImages(payload.images || []),
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
      "When the image type is 主图, favor a clean marketplace-safe product-led composition."
    ],
    mainImage: "Use a product-first main image concept with strong clarity and restrained composition."
  },
  Temu: {
    compliance: [
      "Avoid all prohibited or risky Temu wording in the image text: religion or faith references, minors, children, baby or infant references, pregnancy or maternity references, 'free from' or ingredient-exclusion claims, waterproof, oilproof, UV protection, medical, safety, health, eco-friendly, non-toxic, must-have, essential, best helper, best choice, promotion, limited-time offer, protection, BPA, fireproof, anti-theft, anti-scald, heat-resistance temperature claims, below-zero temperature claims, or similar claims.",
      "Avoid directly naming the product material in image copy whenever possible; express benefits through neutral user-facing language instead.",
      "Do not use ranking claims, price claims, discount percentages, shipping promises, guarantee wording, fake certification seals, medical badges, or compliance icons.",
      "For Temu main-image labels, never write dimensions, capacity, temperatures, weight-bearing values, percentage boosts, performance multipliers, compatibility ranges, or technical measurements because image models often render them incorrectly.",
      "If copy is needed, keep it short, concrete, benefit-led, and visually secondary to the product."
    ],
    mainImage: "Use a high-click product-led Temu commercial composition with purchase desire. Keep it as a main image: product dominance first, thumbnail impact second, and a compressed real-use or buyer-result cue third. Optional tiny marketplace label only when it is a safe quantity cue or low-risk result phrase, never a feature poster or infographic."
  },
  Shopee: {
    compliance: [
      "Avoid watermarks, fake badges, oversized promotional copy, price text, discount claims, shipping claims, and montage-like clutter.",
      "Keep the product easy to identify at thumbnail size."
    ],
    mainImage: "Use a clean but energetic marketplace-ready product composition optimized for mobile browsing."
  },
  Etsy: {
    compliance: [
      "Avoid fake awards, misleading decorative seals, price claims, and text-heavy promotional poster treatment.",
      "Keep the image authentic and product-led."
    ],
    mainImage: "Use an appealing handmade or lifestyle-aware product presentation while preserving accurate product identity."
  }
};

const TYPE_RULES = {
  主图: {
    base: "Create exactly one high-conversion ecommerce main hero image where the product is the unmistakable hero, not a pure white-background product cutout, not a catalog isolation render, not a wide lifestyle scene, not a small product inside a large environment, not a SKU variant image, not a detail infographic, not a feature poster, and not a collage.",
    scene: "Product dominance rule: the complete purchasable product must occupy roughly 70-90% of the canvas, stay near the visual center, and remain readable at thumbnail size. Main-image distinction rule: main image must not collapse into 白底图; this category must look like a click-driving sales hero, while 白底图 is the only category allowed to be plain pure-white product isolation. Do not output a centered product-only cutout on flat #FFFFFF, do not make a flat white cutout, and do not make a product-only high-key studio packshot. Add at least one restrained non-text hero-image context cue that 白底图 may never use: a premium light material background, a soft kitchen-counter or tabletop plane, a partial close-range use-surface edge, a subtle warm/cool environmental tint, a controlled reflection on a real surface, or a compressed micro-scene fragment tied to the product use. Use commercial lighting, clean depth, realistic shadow, premium angle, stronger product massing, and the context cue to increase purchase desire without turning the image into a lifestyle scene. Props, background, hands, or usage-result cues may appear only as secondary support and must never cover, replace, shrink, or visually compete with the product. If a use context is needed, keep it close-range and partial: a tabletop corner, drawer edge, vehicle seat detail, appliance opening, hand edge, plant pot rim, or other host-object fragment rather than a wide room, full kitchen, full bathroom, full car interior, or distant lifestyle scene. Main images must not contain inset circles, zoom bubbles, arrows, leader lines, feature labels, headline bands, comparison blocks, color swatches, color bars, palette legends, or specification rows.",
    text: "Main-image text is platform-dependent. Amazon must have no visible text. For Temu only, one tiny label may be allowed when it is a safe quantity cue or a low-risk result phrase; otherwise use no text. Never use headline typography, slogans, feature-copy layout, icons, badges, callouts, color names, HEX codes, dimensions, capacity, temperatures, weight-bearing values, percentages, performance multipliers, compatibility ranges, or technical measurements in a main image."
  },
  SKU图: {
    base: "Create exactly one SKU real-shot product arrangement for the exact variant, set, bundle, or multi-PCS purchase unit, not a white-background cutout, not an infographic, not a poster, not a feature callout image, and not a usage-action scene.",
    scene: "Mandatory SKU real-shot rule: preserve the product completely unchanged and make it look like a real person photographed the product in a clean tabletop or countertop setup. Add only material texture quality, realistic natural or studio light, real contact shadows, and a tidy physical surface. The background must be simple, clean, real, and uncluttered, preferably a desktop, tabletop, counter, or neutral surface. For bundle or multi-PCS products, arrange the complete purchase unit neatly and countably on the same clean surface, preserving every included component, package count, shape, material, color, and proportion. Do not add unrelated props, food, plants, people, hands, host objects, usage objects, graphic shapes, icons, labels, inset images, or decorative elements.",
    text: "No text, no icon, no badge, no callout, no feature graphic. The SKU image should feel like a clean, real, tidy product photoshoot with stronger material quality."
  },
  卖点图: {
    base: "Create exactly one ecommerce pain-solution selling-point image. The image must solve one concrete buyer pain point and make the improved outcome obvious at thumbnail size; it must not be a feature proof, material-detail image, lifestyle-only scene, SKU/set-value display, quantity-value display, or A+ detail-page module.",
    scene: "Use one planned benefit layout, not a random scene and not the same split comparison every time. The pain-to-solution story can be shown through a focused result hero, a use-action proof, a problem callout with product solution, a clean process/step moment, a close product plus solved outcome, or a before/after comparison only when that format is the strongest fit. The negative/problem state must never depict the uploaded product itself as broken, low-quality, dirty, missing parts, wrong count, off-ring, disassembled, scattered, or used incorrectly; show the problem through the environment, target object, generic old alternative, difficult action, or messy result instead. Reserve a clean copy area with clear hierarchy: one short benefit/result headline, one tiny support phrase only if needed, and 1-3 simple icons or linear guide marks only when they clarify the reading path. Icons, arrows, leader lines, simple badges, and graphic panels are allowed, but they must guide the eye and cannot hide or redesign the product. The product should be the cause of the solved result, not just decoration, and it must remain intact and accurate when it appears. Even for bundles or multi-PCS products, the complete purchase unit may appear only as proof of the solution; do not make set size, included pieces, quantity, or bundle value the main message. Never show a color palette, color swatch legend, HEX code list, design-system strip, dimensions, capacity, or risky technical measurements.",
    text: "Use only one concise pain-result phrase, plus at most one tiny support phrase. The copy must describe the solved pain or visible outcome, not product features, material names, material slogans, set/count value, component lists, product structure, technical specifications, palette names, color names, dimensions, capacity, or long claims. Keep copy inside intentional safe text zones with high contrast and enough empty space."
  },
  白底图: {
    base: "Create exactly one pure white-background product image, not a scene, not a studio set, not a lifestyle photo, not a collage, and not a comparison chart.",
    scene: "Absolute white-background rule: the background must be plain pure white (#FFFFFF) with no surface line, tabletop, countertop, room, gradient, texture, prop, hand, food, plant, host object, inset, shadowy environment, or decorative context. Show only the exact product or exact purchase unit, centered and fully visible. Improve only lighting quality, cleanliness, product texture clarity, edge definition, and premium finish while preserving the product unchanged.",
    text: "No text, no badge, no label, no icon, no graphic shape, no decorative prop. Pure product presentation only."
  },
  场景图: {
    base: "Create exactly one standalone lifestyle usage scene, not a main hero image, not a SKU still life, not a collage, and not an infographic.",
    scene: "Show the product in a believable real use context that explains where and why it is used: a target-market adult using it, adult hands operating it, the product placed exactly where it naturally belongs, or the immediate after-use state. Prefer practical human presence when it helps prove use: an adult user from the selected market region may appear partially or naturally in-frame, but should not pose like a model, dominate the frame, block the product, or become the subject. This category is about usage evidence, scale, placement, and real object relationships; it must not inherit the main-image 70-90% product-dominance rule. The product should remain clearly recognizable but does not need to fill the frame. Use a natural environment, practical action, realistic scale, and a camera angle suited to the use story. Do not add headline typography, callout labels, icons, arrows, comparison panels, inset circles, zoom bubbles, or specification strips.",
    text: "No visible text by default. Only add text if the product type absolutely requires a tiny realistic label already present on the product."
  },
  特写图: {
    base: "Create exactly one material and craftsmanship close-up detail image. This is a macro product-detail proof image, not a scene image, not a use-action image, not a full product hero, not a SKU arrangement, not a selling-point infographic, and not a generic texture background.",
    scene: "Use macro or near-macro framing to show one truthful visible product detail: material texture, surface finish, polished edge, thickness, layered structure, seam, rivet, connector, handle surface, working edge, opening, rim, weave, transparent edge, molded corner, or other construction detail. The frame should be tight and intentional: the selected detail should occupy most of the image, with only enough surrounding product context to identify which part is shown. Use crisp focus, shallow depth of field, premium lighting, realistic reflections, and tactile texture. Do not show broad kitchen/room/lifestyle context, hand action, ingredient use, before/after comparison, icons, arrows, callouts, or text.",
    text: "No visible text, no labels, no icons, no zoom bubbles, no callout lines. Let material, craftsmanship, texture, and close crop carry the image."
  },
  "高级A+": {
    base: "Create exactly one premium ecommerce detail-page module image, equivalent to an A+ / product detail image. It must have a complete information logic and a designed page-module composition, not a random lifestyle scene, not a single main image, not a SKU still life, and not a loose collage.",
    scene: "Design it like a professional detail-page module with a clear reading path. Choose one module structure that fits the product: left image and right text block, right image and left text block, hero product plus 3 icon benefits, linear guide from problem to result, small magnifier detail inset pointing to a real material/structure detail, step-by-step use strip, comparison mini-table, or full-width lifestyle/result banner with organized text zone. Use hierarchy: one dominant product/result visual, one intentional copy area, up to 3 supporting icons or callouts, and clean spacing. The module must explain one coherent buyer story such as why it solves the problem, how it works, what detail proves quality, how to use it, or what complete set/value the buyer gets. Preserve product accuracy and correct use method. Pick one module objective and make every support point visibly grounded in the product image; do not turn the module into a generic feature bullet poster. If the module uses detail insets, use at most 3 insets and make each inset point to a real visible detail from the uploaded product. Do not make many tiny equal panels, do not create a random scene photo, and do not leave the image with no detail-page logic.",
    text: "Visible copy is allowed and expected when it improves detail-page clarity, but keep it short and structured: one headline, 1-3 concise support points, simple icons, and optional small labels. Every text claim must be visually provable from the product or explicitly supported by the provided analysis; prefer plain observable wording such as easy measuring, tidy storage, clear size selection, polished bowl, rounded rim, color-coded handle, or ring-kept set. Avoid dimensions, capacity, risky technical measurements, unsupported durability/performance claims, anti-stain/odor/protection/safety claims, fake certifications, price, discount, ranking, and long paragraphs. If exact text rendering is risky, reserve clean text blocks and use simple readable placeholder-like short phrases rather than dense copy."
  }
};

function categoryEvidenceRule(kind, strategy, platform) {
  const actionText = strategy.keyActions.length
    ? `Use one of these key action frames when appropriate: ${strategy.keyActions.join("; ")}.`
    : "";
  const detailText = strategy.detailFocus.length
    ? `Detail focus candidates: ${strategy.detailFocus.join("; ")}.`
    : "";
  const riskText = strategy.risks.length
    ? `Avoid these product-specific risks: ${strategy.risks.join("; ")}.`
    : "";
  const partFunctionText = strategy.partFunctionMap.length
    ? `Part-function lock: ${strategy.partFunctionMap.join("; ")}.`
    : "";
  const correctUseText = strategy.correctUseMethod
    ? `Correct use method lock: ${strategy.correctUseMethod}.`
    : "";
  const forbiddenUseText = strategy.forbiddenUseErrors.length
    ? `Forbidden use errors: ${strategy.forbiddenUseErrors.join("; ")}.`
    : "";
  const usageMechanismLock = [partFunctionText, correctUseText, forbiddenUseText].filter(Boolean).join(" ");

  if (kind === "主图") {
    if (platform === "Amazon") {
      return [
        "Amazon main image compliance: no visible text, no badges, no inset images, no icons, no callouts, no misleading props, and clear unit of sale.",
        "Main image must not collapse into 白底图: do not create a plain pure-white product cutout, catalog isolation render, or product-only high-key studio packshot. Make it a product-first sales hero through premium camera angle, commercial shadow/reflection, stronger product massing, and at least one subtle marketplace-safe context cue such as a light kitchen-counter plane, warm off-white material background, close-range surface edge, soft environmental tint, or real-surface reflection while keeping the product dominant.",
        "Keep context extremely restrained and compliant: no hands, no text, no icons, no callouts, no wide lifestyle room, and no unrelated props for Amazon-style main images. For kitchen tools, a very clean counter/surface plane or partial ingredient/use-surface cue may appear only as background evidence and must not become a scene or prop display.",
        `Show the unit of sale clearly: ${strategy.unitOfSale}.`,
        strategy.mechanismRule,
        usageMechanismLock,
        riskText
      ].filter(Boolean).join(" ");
    }
    const temuMainLabelRule = platform === "Temu"
      ? "Temu main-label rule: a label is optional, not mandatory. If used, allow only one tiny quantity cue such as a pack/count/PCS phrase or one low-risk result phrase such as Tidy Look, Easy Use, Less Mess, Quick Clean, Easy Reach, Strong Hold, or Save Space. Never write dimensions, capacity, temperatures, load-bearing values, percentage boosts, performance multipliers, compatibility ranges, technical measurements, price, discount, ranking, badge text, long title, or material claim."
      : "Main-image copy should be avoided unless the marketplace norm clearly allows one very short, compliant product-support cue.";
    return [
      "Non-Amazon main image must be product-dominant, not scene-dominant: the product must be the largest and clearest subject, with any environment compressed into supporting space.",
      "Temu main image is not an Amazon catalog packshot: avoid a plain tabletop-only studio still life. It needs an obvious close-range use cue or buyer-result cue while still staying product-first.",
      "Close-range main-scene rule: use a compressed micro-scene with partial host-object evidence while the product occupies 70-90% of the frame; do not show a wide room, full kitchen, full bathroom, full car interior, full garden, or distant lifestyle scene.",
      "For kitchen tools and sets, include one restrained immediate-use clue such as a partial bowl rim, spice jar edge, flour or spice trace, ingredient surface, or measuring/pouring context near the product; this cue must support purchase desire without becoming a lifestyle scene.",
      `Main-image product evidence, kept close to the product rather than as a wide scene or feature layout: ${strategy.mainEvidence}.`,
      `Show what the buyer receives: ${strategy.unitOfSale}.`,
      `Product package mode: ${strategy.packageMode}.`,
      `Any use relationship must be shown only as natural product context, not as annotated instructions: ${strategy.useRelationship}.`,
      "Background must serve product clarity and purchase desire; it cannot become the main subject.",
      "Do not use a tiny product in a corner, a wide room/kitchen scene, a plain SKU still life, a catalog tabletop shot, or props occupying more visual weight than the product.",
      "Do not create a selling-point layout: no feature headline, no arrows, no callout labels, no inset close-up circle, no zoom bubble, no specification strip, no color swatches, and no HEX color codes.",
      temuMainLabelRule,
      actionText,
      strategy.mechanismRule,
      usageMechanismLock,
      riskText
    ].filter(Boolean).join(" ");
  }

  if (kind === "场景图") {
    return [
      "Lifestyle scene must be usage evidence, not product-with-background, not a main-image hero, and not an infographic.",
      "Do not apply main-image dominance: the product does not need to occupy 70-90% of the canvas. Show believable real scale and natural context instead.",
      `The product must visibly relate to the correct target object: ${strategy.useRelationship}.`,
      `Show the unit of use: ${strategy.unitOfUse}.`,
      `Use target-market realism for ${platform}: when a person appears, use an ordinary adult user suitable for the selected region, never a child, infant, teenager, celebrity, influencer pose, or glamour model.`,
      strategy.packageMode === "bundle" ? "If the full bundle is not natural in use, show the active component in use while keeping the rest of the set nearby as clear purchase-unit context." : "",
      strategy.packageMode === "multipack" ? "Use one piece in the scene when needed, but keep quantity context visible through stacked extras, opened pack, or repeated pieces in the background." : "",
      "Choose one scene mode: adult hand in-use action, adult user partial-body use, post-use result proof, placement/fit relationship, or process moment.",
      "Avoid product placed next to props, empty unused product, background-only decoration, static countertop display, product-dominant hero composition, callouts, icons, arrows, headline bands, inset magnifiers, or before-after panels.",
      actionText,
      strategy.mechanismRule,
      usageMechanismLock,
      riskText
    ].filter(Boolean).join(" ");
  }

  if (kind === "卖点图") {
    return [
      "Selling-point image must solve one buyer pain point; do not make a feature proof, material detail close-up, standalone lifestyle scene, SKU/set-value display, quantity-value display, A+ detail module, or generic product poster.",
      `Solve one target-market buyer pain point for ${platform}; choose the pain point from real product logic, not generic decoration.`,
      `Pain-solution relationship must follow the real product logic: ${strategy.useRelationship}.`,
      "Do not repeat the same left-versus-right comparison by default. Choose the layout that best communicates this pain: outcome hero, use-action proof, problem callout, compact step moment, close product plus solved environment, or before/after comparison only when the contrast itself is the clearest proof.",
      "If using contrast, make the contrast style fit the product: messy versus tidy, dark versus bright, hard-to-reach versus easy-to-reach, dirty versus clean, tangled versus organized, unstable versus neatly held, or wasted space versus saved space. If not using contrast, make the solved outcome obvious through action, environment, posture, or result cues.",
      "Plan a clean copy zone: one short pain-result headline, one tiny support phrase only if needed, and no dense paragraph text. Keep typography away from the product and inside a readable safe area.",
      "Use icons, simple line guides, arrows, soft panels, or subtle badges only to guide the pain-to-result reading path. They must be simple, countable, and secondary to the solved pain.",
      "Do not use detail focus, material close-ups, feature names, material names, bundle/set value, multipack value, quantity display, broad lifestyle atmosphere, or product beauty as the main topic. If the product is a set, show the set only when it helps prove the pain disappearing, not as the headline idea.",
      "Selling-point graphics may use brand colors as design accents, but must never display the palette itself, color chips, color names, HEX codes, dimensions, capacity, or a style-guide/spec-sheet row.",
      actionText,
      strategy.mechanismRule,
      usageMechanismLock,
      riskText
    ].filter(Boolean).join(" ");
  }

  if (kind === "特写图") {
    return [
      "Close-up must prove real material, craftsmanship, surface finish, texture, edge quality, thickness, connector, working edge, seam, rivet, molded corner, or another visible construction detail.",
      "The selected detail should occupy most of the frame. Do not repeat the whole product portrait, do not show a usage scene, and do not include hands, food, rooms, props, icons, arrows, labels, or text.",
      detailText || "Focus on material texture, polished surface, edge/rim, opening, layer, fold, thickness, connector, handle surface, working edge, seam, rivet, molded corner, or construction detail.",
      strategy.mechanismRule,
      usageMechanismLock,
      riskText
    ].filter(Boolean).join(" ");
  }

  if (kind === "高级A+") {
    return [
      "A+ image must be a premium ecommerce detail-page module with complete information logic and a clear reading path.",
      "Choose one professional module structure: left image/right text, right image/left text, hero product plus 3 icon benefits, linear guide from problem to result, small magnifier detail inset, step-by-step use strip, comparison mini-table, or full-width result banner with organized text zone.",
      "Use hierarchy: one dominant product/result visual, one planned text zone, 1-3 supporting icons or callouts, and clean spacing. Do not make many tiny equal panels.",
      `Primary proof should explain a coherent buyer story from: ${strategy.useRelationship}.`,
      strategy.packageMode === "bundle" ? "A+ may show the full set in a premium overview, but every component must remain countable and truthful." : "",
      strategy.packageMode === "multipack" ? "A+ may show quantity/value impression through ordered rows, stack density, or pack contents if truthful." : "",
      "Use supporting areas only for result story, structure explanation, material/detail proof, fit relationship, set overview, use steps, comparison, or premium quality proof. Do not turn A+ into a loose feature list: each point must be tied to a visible product detail, use step, buyer question, or comparison logic.",
      "A small magnifier inset is allowed only if it points to a real detail from the product. Linear guide marks and icons are allowed only when they clarify reading order.",
      "If text is likely to be wrong, keep copy very short and leave clean text blocks rather than generating dense paragraphs. Avoid unsupported durability, safety, medical, protection, certification, or performance claims.",
      actionText,
      detailText,
      strategy.mechanismRule,
      usageMechanismLock,
      riskText
    ].filter(Boolean).join(" ");
  }

  if (kind === "SKU图") {
    return [
      `SKU image must show the complete purchase unit: ${strategy.unitOfSale}.`,
      "Create a real product photoshoot feeling: clean tabletop or countertop surface, realistic light direction, real shadows, true material texture, tidy composition, and no clutter.",
      usageMechanismLock,
      strategy.packageMode === "bundle" ? "Bundle SKU rule: show all bundle components cleanly and countably on the same simple surface, not as random props and not in use." : "",
      strategy.packageMode === "multipack" ? "Multi-PCS SKU rule: show the multi-piece purchase unit neatly with countable pieces, stacked rows, opened pack, or orderly grouped quantity on the same simple surface." : "",
      "Do not add lifestyle environment, people, hands, usage action, food, plants, host objects, room background, graphic layout, icons, labels, callouts, or selling-point infographic.",
      "Use the product mechanism only to preserve the correct working parts and included components; do not demonstrate the use action in SKU images."
    ].filter(Boolean).join(" ");
  }

  return "";
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

const MAIN_IMAGE_VARIATION_RULES = [
  "Main-image variation: frontal sales hero with stronger product massing on a light premium countertop/material plane, commercial shadow/reflection, and no flat white cutout.",
  "Main-image variation: three-quarter commercial hero angle with the complete purchase unit spread wider and countable, using a warm off-white kitchen-surface cue so it is not the same centered product-only pose as 白底图.",
  "Main-image variation: slightly lower premium camera angle with controlled depth, a soft marketplace-safe designed background, and a visible surface edge; no text or graphics.",
  "Main-image variation: tighter product-led crop with bolder lighting rhythm, visible material appeal, and a restrained real-surface reflection while keeping the full purchase unit recognizable.",
  "Main-image variation: product-led asymmetry with controlled negative space and a subtle contextual tonal plane, not centered catalog isolation.",
  "Main-image variation: elevated hero composition with large product massing, realistic contact shadow, a close-range use-surface fragment, and a distinct sales-image silhouette."
];

const TEMU_MAIN_IMAGE_VARIATION_RULES = [
  "Temu main variation: clean product-dominant hero, product occupies 70-90% of the frame, with one close-range use/result cue and label optional only if safe.",
  "Temu main variation: close-range micro-scene, product still occupies 70-90% of the frame, context is only partial host-object evidence such as a bowl rim, ingredient edge, appliance opening, drawer edge, or fitted target object.",
  "Temu main variation: quantity/result emphasis, product remains dominant, use one tiny safe quantity cue or low-risk result phrase only when supported, plus a visible purchase-relevant use cue.",
  "Temu main variation: tighter product-led crop with strong material clarity, a compressed buyer-result clue, and no poster layout.",
  "Temu main variation: product-led asymmetry with compressed background, immediate-use evidence, and thumbnail readability.",
  "Temu main variation: orderly purchase-unit display with large product massing, one partial use-context object, and no wide lifestyle scene."
];

const SELLING_POINT_VARIATION_RULES = [
  "Selling-point variation: outcome hero layout. Show the solved result as the main visual, product clearly responsible for it, with one compact benefit headline and no split-screen comparison.",
  "Selling-point variation: use-action proof. Show an adult hand or realistic use action demonstrating the product solving one pain point, with a small callout zone and no before/after panel.",
  "Selling-point variation: problem callout layout. Show the pain as a small secondary callout or inset while the main image focuses on the product-enabled solved state; do not divide the canvas into equal left/right halves.",
  "Selling-point variation: compact three-step visual flow. Use three small sequential cues such as pain, product action, result, with the result largest and most readable; no dense feature list.",
  "Selling-point variation: close product plus solved environment. Use a near product view with the surrounding target object visibly improved, supported by 1-2 simple icons only if they clarify the result.",
  "Selling-point variation: before/after comparison only for this variant. Use a restrained split or diagonal comparison with the product causing the improved result, not a repeated generic left-right template.",
  "Selling-point variation: buyer-result badge layout. Product and solved outcome dominate, with one simple low-risk result badge and clean negative space for short copy.",
  "Selling-point variation: pain-free moment. Show the user action becoming easier or tidier in a realistic scene-like infographic, keeping product accuracy and one clear result message."
];

const SCENE_VARIATION_RULES = [
  "Scene variation: natural adult hand in-use action showing the product touching the correct target object at real scale.",
  "Scene variation: target-market adult user partial-body action in the correct environment, ordinary realistic styling, product visible and not blocked.",
  "Scene variation: immediate after-use result proof in the real environment, with the product still recognizable but not staged as a main-image hero.",
  "Scene variation: placement or fit relationship in the correct location, using practical surroundings and no graphics.",
  "Scene variation: process moment with believable adult use motion, natural crop, and enough context to understand where and why the product is used.",
  "Scene variation: shopper scale proof through real surrounding objects and adult hand scale, while avoiding static SKU display or infographic composition.",
  "Scene variation: tidy post-use environment with an adult user nearby or just leaving the frame, product naturally present, no headline, no callouts, no before-after layout.",
  "Scene variation: realistic daily-use environment with the active component emphasized and the full set nearby only if that is natural."
];

const CLOSEUP_VARIATION_RULES = [
  "Close-up variation: macro material surface and finish proof, with the detail occupying most of the frame.",
  "Close-up variation: edge/rim/thickness detail with crisp focus, tactile reflections, and only enough surrounding context to identify the part.",
  "Close-up variation: connector, seam, rivet, hole, handle surface, or working-edge construction detail, not a usage scene.",
  "Close-up variation: premium shallow-depth macro crop focused on craftsmanship, no text, no icons, no hands, and no room context.",
  "Close-up variation: controlled reflection and texture detail, preserving the exact product surface and color placement.",
  "Close-up variation: one truthful visible construction detail, cropped tightly enough to prove quality at a glance."
];

const A_PLUS_VARIATION_RULES = [
  "A+ variation: left product/use image and right structured text block with one headline plus 1-3 grounded support points.",
  "A+ variation: hero product/result visual with 3 icon benefits, each tied to a visible product detail or buyer question.",
  "A+ variation: magnifier detail module pointing to one real structure/material detail, supported by short explanation text.",
  "A+ variation: step-by-step use strip with clear reading order, simple icons or numbers, and no unsupported claims.",
  "A+ variation: comparison mini-table or before/after module focused on one shopper decision, not a dense spec sheet.",
  "A+ variation: full-width detail-page banner with organized text zone and one coherent product story."
];

function variationFor(kind, variantIndex, platform = "Amazon") {
  const index = variantIndex % VARIATION_RULES.length;
  if (kind === "SKU图" || kind === "白底图") {
    return PRODUCT_ONLY_VARIATION_RULES[index % PRODUCT_ONLY_VARIATION_RULES.length];
  }
  if (kind === "主图") {
    if (platform === "Temu") {
      return TEMU_MAIN_IMAGE_VARIATION_RULES[index % TEMU_MAIN_IMAGE_VARIATION_RULES.length];
    }
    return MAIN_IMAGE_VARIATION_RULES[index % MAIN_IMAGE_VARIATION_RULES.length];
  }
  if (kind === "卖点图") {
    return SELLING_POINT_VARIATION_RULES[index % SELLING_POINT_VARIATION_RULES.length];
  }
  if (kind === "场景图") {
    return SCENE_VARIATION_RULES[index % SCENE_VARIATION_RULES.length];
  }
  if (kind === "特写图") {
    return CLOSEUP_VARIATION_RULES[index % CLOSEUP_VARIATION_RULES.length];
  }
  if (kind === "高级A+") {
    return A_PLUS_VARIATION_RULES[index % A_PLUS_VARIATION_RULES.length];
  }
  return VARIATION_RULES[index];
}

function countDrivenRule(planItem) {
  if (planItem.kind === "主图" && planItem.totalForKind > 1) {
    return "Count-driven main-image rule: because multiple main images are requested, each one must use a clearly different hero composition, camera angle, product spread, shadow/reflection treatment, and background tone. Do not repeat the same centered product pose or produce duplicate white-background-style cutouts.";
  }
  if (planItem.kind === "卖点图" && planItem.totalForKind <= 1) {
    return "Count-driven selling-point rule: because only one selling-point image is requested, choose the clearest single pain-solution layout for this product. A direct comparison is allowed only if it is the strongest proof; otherwise use outcome hero, use-action proof, problem callout, or close product plus solved environment. Do not choose a feature list, detail proof, set overview, or lifestyle-only scene.";
  }
  if (planItem.kind === "卖点图" && planItem.totalForKind > 1) {
    return "Count-driven selling-point rule: each selling-point image must solve a different buyer pain point and use a different layout family. Do not repeat the same left/right or before/after idea across images, and do not convert extra images into feature lists or set-value displays.";
  }
  if (planItem.kind === "高级A+" && planItem.totalForKind > 1) {
    return "Count-driven A+ rule: each A+ image should use a different detail-page module objective, such as problem-solution, use steps, quality detail, comparison, or set overview. Keep each image self-contained.";
  }
  return "";
}

function professionalQualityRule(kind) {
  const shared = [
    "Professional ecommerce image quality gate: the finished image must answer one shopper question at a glance, keep the product identity accurate, and remain readable as a marketplace thumbnail.",
    "Use visual hierarchy deliberately: one primary subject, one support idea, controlled empty space, realistic shadows/reflections, and no accidental clutter."
  ];

  const byKind = {
    主图: "Primary shopper question: what exactly am I buying? Prioritize product recognition, scale clarity, marketplace compliance, and first-click appeal.",
    SKU图: "Primary shopper question: which exact variant or set will I receive? Prioritize countable components, true colors, accurate arrangement, and clean real-shot texture.",
    白底图: "Primary shopper question: what is the exact product shape? Prioritize pure product isolation, full visibility, clean edges, and no decorative context.",
    卖点图: "Primary shopper question: what problem does this solve for me? Prioritize pain-to-result clarity, simple copy zone, and one visible outcome instead of feature explanation.",
    场景图: "Primary shopper question: how is it used in real life? Prioritize real use relationship, scale, placement, action, and believable context with no graphic overlay.",
    特写图: "Primary shopper question: can I trust the material or workmanship? Prioritize macro detail truth, tactile finish, edge/connector quality, and construction proof.",
    "高级A+": "Primary shopper question: why is this product worth choosing? Prioritize detail-page logic, organized module structure, readable text zone, and proof tied to the actual product."
  };

  return [...shared, byKind[kind]].filter(Boolean).join(" ");
}

function platformRuleFor(platform) {
  return PLATFORM_RULES[platform] || {
    compliance: [
      "Avoid misleading claims, fake badges, price claims, discount claims, shipping claims, guarantee claims, and watermarks."
    ],
    mainImage: "Use a product-led ecommerce composition optimized for clarity and clicks."
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

  if (kind === "白底图") {
    return "Color and brand graphics are disabled for white-background images: keep the background pure white and add no accent shapes, gradient, text, or layout surfaces.";
  }
  if (kind === "SKU图") {
    return "SKU color rule: preserve the real product colors and use only neutral real-shot surface colors. Do not add brand panels, gradients, graphic shapes, decorative accent backgrounds, or artificial color blocks.";
  }
  if (kind === "主图" && platform === "Amazon") {
    return "Amazon main image color rule: do not use brand graphics, color swatches, labels, or decorative color blocks. A subtle high-key off-white/light-gray tonal plane, controlled shadow, or reflection is allowed to distinguish the main hero image from 白底图 while remaining marketplace-safe and product-first.";
  }

  const paletteWords = paletteVisualWords(palette);

  if (kind === "主图") {
    return [
      `Main image color direction: use only a restrained commercial color mood inspired by ${paletteWords}.`,
      "The palette is an internal art-direction reference only, not image content. Do not draw color swatches, color bars, color names, HEX codes, style-guide labels, or palette legends.",
      "Do not add graphic panels, headline bands, callout color strips, or specification rows. For Temu, use color mainly through realistic surface tone, lighting warmth, and the compressed use/result cue rather than a plain catalog tabletop. A tiny Temu-safe quantity/result label may use a high-contrast accent, but color treatment must stay subordinate to product realism and product dominance.",
      `Palette reason: ${palette.palette_reason_zh}`
    ].join(" ");
  }

  return [
    `Brand color mood for graphic support: ${paletteWords}.`,
    "Use this color mood only as internal art direction for background accents, subtle support shapes, typography color, or callout styling when the selected category allows graphics.",
    "Never render the palette itself. Do not show color swatches, circular color chips, color bars, color names, HEX codes, style-guide labels, or palette/specification rows in the finished image.",
    "Make the color system intentional but keep it subordinate to the product proof; avoid random stock-photo colors.",
    `Palette reason: ${palette.palette_reason_zh}`
  ].filter(Boolean).join(" ");
}

function summarizeTypographyDirection(payload, kind) {
  const platform = normalizePlatformName(payload.brand?.platform || payload.platform || "Amazon");
  if (kind === "主图" && platform === "Temu") {
    return "Typography rule for Temu main images: visible text is optional and must be minimal. Use no text by default; if a label is useful, use only one tiny safe quantity cue or one low-risk result phrase, with no dimensions, capacity, technical measurements, percentages, badges, icons, or callout layout.";
  }
  if (kind === "白底图" || kind === "SKU图" || kind === "主图") {
    return "Typography rule: no visible text for this category.";
  }
  const font = normalizeFontDirection(payload, payload.analysis || {});
  return `Resolved typography direction: ${font.style_en}. ${font.usage_en}`;
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
    ["liner", /\b(liner|paper liner|air fryer paper|baking cup|cupcake liner)\b/],
    ["cover", /\b(cover|lid|food cover|cap)\b/],
    ["wrap", /\b(wrap|film|foil|cling)\b/],
    ["bag", /\b(bag|pouch|sack|zip bag)\b/],
    ["organizer", /\b(organizer|storage|holder|rack)\b/],
    ["container", /\b(container|box|bin|jar|bottle)\b/],
    ["tray", /\b(tray|pan|plate|dish)\b/],
    ["sheet", /\b(sheet|paper|pad|mat)\b/],
    ["textile", /\b(towel|cloth|fabric|blanket|wipe)\b/],
    ["tablet", /\b(tablet|cleaning tablet)\b/],
    ["pod", /\b(pod|capsule)\b/],
    ["liquid", /\b(liquid|spray|gel|solution)\b/],
    ["tool", /\b(tool|peeler|cutter|brush|scraper|knife|spatula)\b/],
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
  const productInfo = `${payload.productInfo || ""} ${identityBrief || ""} ${analysis.product_summary_zh || ""}`;
  const packageMode = payload.productPackageMode || analysis.product_package_mode || "single";
  const mechanism = analysis.product_mechanism || inferProductMechanism(productInfo);
  const complexity = inferProductComplexity(productInfo, analysis);
  const defaultUnitOfSale = packageMode === "bundle"
    ? "the complete bundle with all components, sizes, colors, or accessories shown clearly and countably"
    : packageMode === "multipack"
      ? "the full multi-piece purchase unit with visible quantity impression, dense stack, repeated rows, or countable pieces"
      : "the complete single product purchase unit shown clearly";
  const unitOfSale = analysis.unit_of_sale || analysis.quantity_requirement || defaultUnitOfSale;
  const unitOfUse = analysis.unit_of_use || "one usable unit shown in a truthful usage relationship";
  const useRelationship = analysis.use_relationship || {
    liner: "the liner must be shown fitted inside the correct basket, tray, pan, or appliance with visible rim, edge, opening, and contact surface relation",
    cover: "the cover must be shown covering the correct target object with visible rim, edge, opening, and contact relation",
    wrap: "the wrap must be shown covering or lining the correct object with visible edge and contact relation",
    bag: "the bag must show opening, capacity, contents, or placement relationship",
    organizer: "the organizer must show opening, contents, capacity, and organized result",
    container: "the container must show opening, contents, capacity, or placement relationship",
    tray: "the tray must show top surface, rim, contents, or host-use relation",
    sheet: "the sheet must show edge, layers, fold, texture, or active contact point",
    textile: "the textile must show folded layers, edge, drape, texture, or an active use contact point",
    tablet: "the bare tablet must be separated from packaging and shown with the correct target object",
    pod: "the bare pod must be separated from packaging and shown with the correct target object",
    liquid: "the container, liquid state, and correct target object must be visible",
    tool: "the tool must contact the correct target object while an adult hand performs the key action",
    accessory: "the accessory must be shown with the host object, installation position, or fit relationship"
  }[mechanism] || "show a visible action, result, scale, capacity, material, fit, or placement proof instead of an isolated product still life";

  const keyActions = normalizeStringList(analysis.key_action_frames);
  const detailFocus = normalizeStringList(analysis.detail_focus_areas);
  const risks = normalizeStringList(analysis.misjudgment_risks);
  const partFunctionMap = normalizeStringList(analysis.part_function_map || analysis.partFunctionMap);
  const forbiddenUseErrors = normalizeStringList(analysis.forbidden_use_errors || analysis.forbiddenUseErrors);
  const correctUseMethod = String(analysis.correct_use_method || analysis.correctUseMethod || "").trim();

  const mechanismRules = {
    liner: "Use high-angle or top-down logic when needed so the liner is not mistaken for a bowl or tray; show rim/edge/opening relation and correct host fit.",
    cover: "Always show covered target object and visible rim/edge/opening relation; never show an empty cover alone as the main proof.",
    wrap: "Show covering, lining, edge adhesion, or contact surface; never show a floating film sheet without a target object.",
    bag: "Show opening, capacity, contents, or organized placement; never show only an empty bag.",
    organizer: "Show contents and organized result; never show an empty organizer as the main proof.",
    container: "Show opening, contents, capacity, or completed placement; avoid empty-container-only scenes.",
    tray: "Show contents, rim, top surface, or host relationship; avoid making it look like a generic bowl.",
    sheet: "Show edge, folds, layers, texture, or active contact; avoid flat blank sheet treatment.",
    textile: "Show fold, drape, thickness, texture, edge, or contact point; avoid flat color-block fabric.",
    tablet: "Use bare product only in use scenes; packaging must not touch liquid, food, appliance, or body.",
    pod: "Use bare product only in use scenes; packaging must not touch liquid, food, appliance, or body.",
    liquid: "Show container, liquid state, and target object; avoid exaggerated splashes or impossible physics.",
    tool: "Show adult hand action and contact between working end and target object; do not make it a static tool portrait.",
    accessory: "Show host object and fit/install relationship; do not show an isolated spare part only."
  };

  const mechanismEvidence = {
    liner: "first visual should prove fit or quantity: liners stacked or fanned with at least one liner fitted inside the correct air fryer basket/tray, visible rim and cavity relation",
    cover: "first visual should prove covering relation: product covering the target object with edge/rim contact visible",
    wrap: "first visual should prove covering or lining relation with visible edges and contact surface",
    bag: "first visual should prove capacity or organization with contents visible through the opening",
    organizer: "first visual should prove organized result and capacity with contents placed inside",
    container: "first visual should prove capacity, contents, or completed placement",
    tray: "first visual should prove size, rim, contents, or host-use relationship",
    sheet: "first visual should prove layers, texture, unfolded edge, or active contact",
    textile: "first visual should prove folded layers, thickness, texture, or drape",
    tablet: "first visual should prove use method or result with bare tablet and correct target object",
    pod: "first visual should prove use method or result with bare pod and correct target object",
    liquid: "first visual should prove application method with container, liquid state, and target object",
    tool: "first visual should prove action: adult hand using the tool on the correct target object",
    accessory: "first visual should prove fit with host object or install position"
  }[mechanism] || "first visual should prove one concrete buying reason: action, result, fit, capacity, quantity, material texture, or complete set";
  const packageEvidence = packageMode === "bundle"
    ? "Bundle mode priority: show the complete set as the buying unit, every component countable and orderly, with a main anchor item plus supporting pieces in a stepped, matrix, or side-by-side layout; do not hide accessories or imply extras."
    : packageMode === "multipack"
      ? "Multi-PCS mode priority: create a strong quantity/value impression using dense visible pieces, orderly stacks, fan layout, repeated rows, transparent-pack density, or stepped piles; quantity text only if explicitly provided."
      : "Single-item mode priority: focus on one product and its strongest usage, fit, material, result, or scale evidence without implying extra pieces.";
  const mainEvidence = `${packageEvidence} ${mechanismEvidence}`;

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
    mechanismRule: mechanismRules[mechanism] || "",
    mainEvidence
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
  const complexityRule = strategy.complexity === "complex"
    ? [
      "Complex-product preservation mode: do not redraw or redesign the product body. Prefer cutout/composite behavior from the uploaded product reference: preserve the visible product surface and details, then generate or adapt only the environment, shadows, hands, and pain/result context around it.",
      "Allowed transformations for complex products: scale, crop, flat rotation, slight perspective transform, realistic contact shadow, and tiny hand/prop occlusion on edges only. Do not generate unseen back, bottom, side, internal parts, new ports, new holes, new buttons, new labels, or a new viewing angle that exposes surfaces missing from the reference.",
      "If the natural use pose needs the product lying flat, tilted, or held in a hand, treat the product like a preserved cutout plane: rotate or perspective-warp only the visible reference face, add the hand/environment around it, and hide no more than a small edge unless the occluded part is simple and predictable.",
      "If the requested pose would require unknown product geometry, use a conservative close-range angle, top-down lay-flat, or near-original view instead of hallucinating details."
    ].join(" ")
    : strategy.complexity === "moderate"
      ? "Moderate-product preservation mode: keep the product structure close to the reference. Use only controlled angle changes, simple rotation, realistic shadows, and conservative context; avoid inventing unseen sides, added parts, or altered details."
      : "Simple-product mode: AI may improve the product presentation more freely, but must still preserve product identity, count, silhouette, color placement, and visible structure.";

  if (kind === "SKU图" || kind === "白底图") {
    const categoryRule = kind === "SKU图"
      ? "For SKU images, a clean tabletop or countertop placement surface is allowed and required, but do not depict use action, people, hands, food, plants, appliances, rooms, host objects, or unrelated props."
      : "For this product-only category, do not depict use action, target objects, people, hands, food, appliances, rooms, or placement context.";
    return [...baseRules, complexityRule, categoryRule].join(" ");
  }

  return [
    ...baseRules,
    complexityRule,
    `Usage truth lock: any hand, action, host object, food, appliance, body, container, or placement must follow the real product relationship: ${strategy.useRelationship}.`
  ].join(" ");
}

function categoryBoundaryRule(kind) {
  const rules = {
    主图: "Hard category boundary: 主图 is a product-first sales hero. It must increase purchase desire at first glance while keeping the product as the main subject.",
    SKU图: "Hard category boundary: SKU图 is a clean real-shot product arrangement on a simple tabletop/countertop surface. It must not become 场景图, 卖点图, a detail infographic, or 白底图.",
    卖点图: "Hard category boundary: 卖点图 must solve one buyer pain point. It must not become a feature explanation, detail close-up, broad usage scene, product-only SKU, set-value display, or A+ sheet.",
    白底图: "Hard category boundary: 白底图 is pure white product presentation only. It must not contain scene context, props, hands, graphics, or lifestyle cues.",
    场景图: "Hard category boundary: 场景图 is a real usage environment and usage-evidence image. It must not inherit main-image 70-90% dominance, and it must not become a selling-point infographic, A+ module, SKU still life, or broad hero poster.",
    特写图: "Hard category boundary: 特写图 is a material/craftsmanship/detail close-up. It must not become a full product hero, usage scene, broad lifestyle photo, selling-point image, or A+ module.",
    "高级A+": "Hard category boundary: 高级A+ is a premium detail-page module with planned information logic, readable hierarchy, text/icon/callout zones, and a coherent buyer story; it must not be a random scene photo, single main image, SKU still life, or loose collage."
  };
  return rules[kind] || "";
}

function outputLayoutRule(kind) {
  if (kind === "卖点图") {
    return "Output one single finished pain-solution selling-point image only. Use one intentional layout family: outcome hero, use-action proof, problem callout, compact step flow, close product plus solved environment, buyer-result badge, or restrained before/after comparison only when explicitly selected by the variation. Use one planned copy zone and optional simple icons/line guides. Do not output a contact sheet, random quadrant layout, collage of unrelated scenes, or multiple independent images combined into one.";
  }
  if (kind === "高级A+") {
    return "Output one single finished ecommerce detail-page module image only. It may contain a designed module layout with text area, icons, callouts, magnifier inset, comparison mini-table, or step strip when useful. It must read as one coherent detail image, not a contact sheet or random collage.";
  }
  if (kind === "特写图") {
    return "Output one single finished macro detail image only. No collage, no split panel, no usage scene, no broad environment, no text, no icons, and no callouts.";
  }
  if (kind === "场景图") {
    return "Output one single finished lifestyle usage image only. No collage, no split comparison, no product-dominant main-image hero layout, no text blocks, no icons, no arrows, and no magnifier inset.";
  }
  return "Output one single finished image only. Do not output a collage, contact sheet, quadrant layout, split scene, before-after panel, or multiple images combined into one.";
}

function normalizeImageKindSelection(selected) {
  const source = Array.isArray(selected) ? selected : [];
  const seen = new Set();
  const normalized = [];

  for (const item of source) {
    const kind = item?.kind;
    if (!kind || seen.has(kind)) continue;
    if (kind === LEGACY_DETAIL_KIND) continue;
    normalized.push(item);
    seen.add(kind);
  }

  return normalized;
}

function planItemsFromPayload(payload) {
  const selected = normalizeImageKindSelection(payload.imageKinds);
  const items = [];
  for (const item of selected) {
    const count = Math.max(1, Math.min(Number(item.count || 1), MAX_KIND_COUNT));
    for (let variantIndex = 0; variantIndex < count; variantIndex += 1) {
      items.push({
        kind: item.kind,
        variantIndex,
        totalForKind: count
      });
    }
  }
  return items;
}

function referenceStrategyLabel(strategy) {
  if (strategy === "detail") return "详情策略";
  if (strategy === "clone") return "克隆策略";
  return "主图策略";
}

function autoReferenceStrategyForKind(kind = "") {
  const text = String(kind || "");
  if (/克隆|仿/.test(text)) return "clone";
  if (/卖点|场景|特写|高级A\+|A\+|详情/.test(text)) return "detail";
  return "main";
}

function resolveReferenceStrategy(payload = {}, planItem = {}) {
  const explicit = String(payload.referenceStrategy || "auto").trim();
  if (["main", "detail", "clone"].includes(explicit)) return explicit;
  return autoReferenceStrategyForKind(planItem.kind);
}

function normalizeSuitePlan(plan, payload, planItems) {
  const brand = payload.brand || {};
  const analysis = normalizeAnalysisResult(payload, payload.analysis || {});
  const raw = plan && typeof plan === "object" ? plan : {};
  const styleMaster = raw.style_master || raw.styleMaster || {};
  const fallbackPalette = analysis.brand_palette || {};
  const fallbackFont = analysis.brand_font_style || {};
  const fallbackStyleMaster = {
    visual_tone: styleMaster.visual_tone || styleMaster.visualTone || brand.customStyle || "clean commercial ecommerce, product-led, consistent detail-page system",
    palette: styleMaster.palette || styleMaster.color_system || styleMaster.colorSystem || [fallbackPalette.primary_color, fallbackPalette.secondary_color, fallbackPalette.accent_color, fallbackPalette.background_color].filter(Boolean).join(" / "),
    typography: styleMaster.typography || styleMaster.font_system || styleMaster.fontSystem || fallbackFont.style_en || "clean sans-serif hierarchy, readable short copy only where the selected category allows text",
    layout_system: styleMaster.layout_system || styleMaster.layoutSystem || "consistent margins, one dominant visual anchor, controlled text zones, restrained callouts only for detail/A+ modules",
    background_system: styleMaster.background_system || styleMaster.backgroundSystem || "category-specific background with unified lighting rhythm and no decorative clutter"
  };

  const identityLock = String(raw.identity_lock || raw.identityLock || [
    "Use uploaded product images as the source of truth.",
    "Preserve product silhouette, proportions, colors, materials, visible logos, brand marks, printed labels, seams, holes, texture, included components, and unit-of-sale count.",
    "Do not redesign the product or invent unsupported parts."
  ].join(" ")).trim();

  const rawScreens = Array.isArray(raw.screens) ? raw.screens : [];
  const screens = planItems.map((item, index) => {
    const rawScreen = rawScreens[index] || {};
    return {
      index: index + 1,
      kind: rawScreen.kind || item.kind,
      objective: String(rawScreen.objective || `${item.kind} commercial ecommerce image`).trim(),
      composition: String(rawScreen.composition || "one clear product-led composition with a distinct role in the full set").trim(),
      copy_role: String(rawScreen.copy_role || rawScreen.copyRole || "use short readable copy only when the category allows it").trim(),
      reference_policy: String(rawScreen.reference_policy || rawScreen.referencePolicy || referenceStrategyLabel(resolveReferenceStrategy(payload, item))).trim(),
      consistency_notes: String(rawScreen.consistency_notes || rawScreen.consistencyNotes || identityLock).trim()
    };
  });

  return {
    style_master: fallbackStyleMaster,
    identity_lock: identityLock,
    reference_strategy: payload.referenceStrategy || "auto",
    screens
  };
}

function localSuitePlan(payload, planItems) {
  return normalizeSuitePlan(null, payload, planItems);
}

function buildSuitePlanUserText(payload, planItems) {
  const analysis = normalizeAnalysisResult(payload, payload.analysis || {});
  return JSON.stringify({
    task: "Plan an original ecommerce image set before image generation. Do not copy any third-party prompt or layout. Return JSON only.",
    productInfo: payload.productInfo || "",
    referenceStrategy: payload.referenceStrategy || "auto",
    productPackageMode: payload.productPackageMode || "single",
    ratio: payload.ratio || "1:1",
    resolution: payload.resolution || "1K",
    platform: payload.brand?.platform || "Amazon",
    region: payload.brand?.region || "US",
    language: payload.brand?.language || "English",
    brandCustomStyle: payload.brand?.customStyle || "",
    productIdentityBrief: analysis.final_prompt_en || "",
    sellingPoints: analysis.selling_points_zh || [],
    detailFocusAreas: analysis.detail_focus_areas || [],
    misjudgmentRisks: analysis.misjudgment_risks || [],
    partFunctionMap: analysis.part_function_map || [],
    correctUseMethod: analysis.correct_use_method || "",
    forbiddenUseErrors: analysis.forbidden_use_errors || [],
    palette: analysis.brand_palette || {},
    fontStyle: analysis.brand_font_style || {},
    requestedScreens: planItems.map((item, index) => ({
      index: index + 1,
      kind: item.kind,
      variantIndex: item.variantIndex,
      totalForKind: item.totalForKind,
      referenceStrategy: resolveReferenceStrategy(payload, item)
    })),
    outputSchema: {
      style_master: {
        visual_tone: "one concise visual direction for the whole set",
        palette: "concrete color system, no HEX labels printed in images",
        typography: "font hierarchy for generated readable text",
        layout_system: "shared spacing, card/callout, and composition rhythm",
        background_system: "shared background/lighting rules"
      },
      identity_lock: "strict product consistency lock",
      screens: [
        {
          index: 1,
          kind: "screen kind",
          objective: "buyer question answered by this image",
          composition: "specific composition plan",
          copy_role: "text role or no-text rule",
          reference_policy: "how uploaded references are used",
          consistency_notes: "screen-specific fidelity warning"
        }
      ]
    }
  }, null, 2);
}

async function buildSuitePlan(config, payload, planItems, sendProgress) {
  if (!planItems.length) return localSuitePlan(payload, planItems);
  assertPromptModelConfigured(config, "套图策划");

  const systemPrompt = [
    "你是资深电商套图视觉策划师。",
    "你的任务是先规划整套图的风格母版、产品一致性锁和每张图的分镜目标，再交给后续生图提示词生成。",
    "必须使用当前输入和上传参考图作为产品事实来源，不得复制任何第三方软件的私有提示词或版式文案。",
    "必须保持用户选择的画幅比例和分辨率；分镜方案不能规划成横竖比例不一致的构图。",
    "必须保持产品正确使用方式。任何场景、卖点、A+ 分镜里都不得出现错误工作端、错误目标物、反向握持、错误接触位置或把辅助齿/孔/装饰部件当主功能部件使用。",
    "不要把模型名称写入方案。不要要求固定使用 Gemini 或任何指定模型。",
    "如果参考策略是 clone，只能抽象学习参考图的构图节奏、信息层级和商业摄影方向，不得复刻原图文字、Logo、版式或专有设计。",
    "输出严格 JSON，不要 Markdown，不要解释。"
  ].join("\n");

  try {
    sendProgress?.({
      stage: "planning-suite",
      current: 0,
      total: planItems.length,
      progress: 4
    });
    const body = await callPromptModel(
      config,
      systemPrompt,
      buildSuitePlanUserText(payload, planItems),
      (payload.images || []).slice(0, 6)
    );
    const parsed = extractJson(responseText(body));
    if (!parsed) {
      throw new Error("提示词模型返回内容不是标准 JSON。");
    }
    return normalizeSuitePlan(parsed, payload, planItems);
  } catch (error) {
    throw new Error(`套图策划失败：${error.message}`);
  }
}

function suiteDirectionRule(payload, planItem) {
  const suitePlan = payload.suitePlan || {};
  const styleMaster = suitePlan.style_master || {};
  const screens = Array.isArray(suitePlan.screens) ? suitePlan.screens : [];
  const screen = screens[Math.max(0, Number(planItem.globalIndex || 0))] || {};
  const lines = [
    "Suite planning layer:",
    `Whole-set visual tone: ${styleMaster.visual_tone || "consistent ecommerce visual system"}.`,
    `Whole-set palette: ${styleMaster.palette || "product-appropriate commercial palette"}.`,
    `Whole-set typography: ${styleMaster.typography || "readable consistent typography only where allowed"}.`,
    `Whole-set layout system: ${styleMaster.layout_system || "consistent spacing and hierarchy"}.`,
    `Whole-set background and lighting: ${styleMaster.background_system || "category-specific but visually consistent"}.`,
    `Product consistency lock: ${suitePlan.identity_lock || "preserve exact product identity from references"}.`,
    payload.analysis?.part_function_map?.length ? `Part-function map inherited from analysis: ${payload.analysis.part_function_map.join("; ")}.` : "",
    payload.analysis?.correct_use_method ? `Correct use method inherited from analysis: ${payload.analysis.correct_use_method}.` : "",
    payload.analysis?.forbidden_use_errors?.length ? `Forbidden use errors inherited from analysis: ${payload.analysis.forbidden_use_errors.join("; ")}.` : "",
    screen.objective ? `This screen objective: ${screen.objective}.` : "",
    screen.composition ? `This screen composition: ${screen.composition}.` : "",
    screen.copy_role ? `This screen copy role: ${screen.copy_role}.` : "",
    screen.consistency_notes ? `This screen fidelity notes: ${screen.consistency_notes}.` : ""
  ];
  return lines.filter(Boolean).join(" ");
}

function referenceStrategyRule(payload, planItem) {
  const strategy = resolveReferenceStrategy(payload, planItem);
  if (strategy === "clone") {
    return [
      "Reference strategy: clone-inspired original workflow.",
      "The uploaded product images remain the product identity source of truth.",
      "Additional reference images may influence only composition rhythm, scene density, camera distance, and information hierarchy.",
      "Do not copy reference-image text, logo, trademark, exact graphic layout, proprietary page structure, or distinctive creative expression.",
      "If a style reference conflicts with product fidelity, product fidelity wins."
    ].join(" ");
  }
  if (strategy === "detail") {
    return [
      "Reference strategy: detail-page workflow.",
      "Use all uploaded product images to understand real materials, structure, use relationship, detail evidence, and unit-of-sale.",
      "Build each image as part of a coherent detail-page reading path while preserving exact product identity."
    ].join(" ");
  }
  return [
    "Reference strategy: main-image workflow.",
    "Use uploaded product images as strict product identity references.",
    "Prioritize product dominance, marketplace clarity, clean commercial composition, and thumbnail readability."
  ].join(" ");
}

function buildCategoryPrompt(payload, planItem) {
  const brand = payload.brand || {};
  const platform = normalizePlatformName(brand.platform || payload.platform || "Amazon");
  const payloadWithNormalizedAnalysis = {
    ...payload,
    brand,
    analysis: normalizeAnalysisResult(payload, payload.analysis || {})
  };
  const rules = TYPE_RULES[planItem.kind] || TYPE_RULES.主图;
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
  const quantityRule = countDrivenRule(planItem);
  const platformSafeBasePrompt = platform === "Temu" ? sanitizeTemuCopyHints(identityBrief) : identityBrief;
  const aPlusLine = planItem.kind === "高级A+" && payload.aPlusSize
    ? platform === "Temu" && payload.aPlusSize === "1:1"
      ? "A+ detail-page target is Temu square format 1:1. Compose it like a premium square detail-page module with a clear reading path, planned text zone, and supporting icon/callout logic, not like a random lifestyle scene or wide Amazon banner."
      : `A+ target canvas size: ${payload.aPlusSize}. Compose for this detail-page module aspect ratio with readable hierarchy, planned text zone, and module structure.`
    : "";
  const brandColorDirection = summarizeColorDirection(payloadWithNormalizedAnalysis, planItem.kind, platform);
  const typographyDirection = summarizeTypographyDirection(payloadWithNormalizedAnalysis, planItem.kind);
  const regionalUseDirection = summarizeRegionalUseDirection(payloadWithNormalizedAnalysis);
  const sellingCopyHint = planItem.kind === "卖点图" ? (SELLING_POINT_COPY_HINTS[platform] || SELLING_POINT_COPY_HINTS.Amazon) : "";
  const productReferencePolicy = "The base brief is product identity only, not a composition instruction. The selected image category rules below have higher priority for background, camera angle, lighting, layout, scene, text, and visual design. Preserve the product identity from the uploaded image, but do not preserve the original photo angle or plain background unless that category explicitly asks for it.";
  const suiteDirection = suiteDirectionRule(payloadWithNormalizedAnalysis, planItem);
  const referenceStrategy = referenceStrategyRule(payloadWithNormalizedAnalysis, planItem);
  const temuTextFilter = platform === "Temu"
    ? "For any visible image text, strictly avoid the full Temu risky-term list supplied in the compliance rules. If in doubt, omit the text instead of using risky wording."
    : "";

  return [
    platformSafeBasePrompt,
    suiteDirection,
    referenceStrategy,
    productReferencePolicy,
    fidelityRule,
    `Selected image category: ${planItem.kind}.`,
    boundaryRule,
    qualityRule,
    quantityRule,
    rules.base,
    rules.scene,
    rules.text,
    regionalUseDirection,
    evidenceRule,
    brandColorDirection,
    typographyDirection,
    sellingCopyHint,
    planItem.kind === "主图" ? platformRules.mainImage : "",
    `Marketplace compliance guidance: ${platformRules.compliance.join(" ")}`,
    temuTextFilter,
    `Target platform: ${platform}. Target market: ${brand.region || "US"}. Output language policy: ${brand.language || "English"}.`,
    aPlusLine,
    variation,
    outputLayoutRule(planItem.kind)
  ].filter(Boolean).join("\n");
}

function buildCategoryPromptRewriteUserText(items) {
  return [
    "Rewrite each local category prompt into a final English image-generation prompt.",
    "The local prompt is the hard constraint source. Preserve every product-fidelity, category-boundary, platform-compliance, aspect-ratio, and negative instruction.",
    "Preserve every part-function lock, correct-use-method lock, and forbidden-use-error exactly. Never rewrite them into vague wording.",
    "Preserve the distinction between 主图 and 白底图 exactly: 主图 must be a product-first sales hero and must not become a plain pure-white product cutout; 白底图 is the only pure white-background product isolation category.",
    "If the local prompt targets Temu 主图, do not soften it into an Amazon-style catalog/tabletop packshot. Preserve the product-dominant 70-90% rule and include a close-range use cue or buyer-result cue while avoiding infographic/callout layout.",
    "Improve product-specific clarity, visual specificity, and variation. Do not add unsupported product features, wrong use cases, fake badges, watermarks, pricing, discounts, certification marks, or unsafe claims.",
    "Return strict JSON only with this shape:",
    "{\"prompts\":[{\"index\":1,\"prompt\":\"...\"}]}",
    "Each prompt must be a single finished prompt string for one image. Keep it concise but complete.",
    JSON.stringify({
      items: items.map((item) => ({
        index: item.index + 1,
        kind: item.planItem.kind,
        variantIndex: item.planItem.variantIndex,
        totalForKind: item.planItem.totalForKind,
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

async function rewriteCategoryPromptChunk(config, items) {
  if (!config.promptApiKey || !items.length) return new Map();

  const systemPrompt = [
    "You are a senior ecommerce image-generation prompt writer.",
    "You convert structured local prompt rules into polished final prompts for an image model.",
    "You must preserve all constraints and compliance rules from the local prompt.",
    "Output strict JSON only. No Markdown."
  ].join("\n");
  const userText = buildCategoryPromptRewriteUserText(items);
  const endpoint = config.promptEndpoint || "responses";
  let body;

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
  const rewritten = new Map();
  for (const item of parsed?.prompts || []) {
    const index = Number(item.index) - 1;
    const prompt = String(item.prompt || "").trim();
    if (Number.isInteger(index) && prompt) rewritten.set(index, prompt);
  }
  return rewritten;
}

async function buildPromptPlan(config, payload, planItems, suitePlan, sendProgress) {
  const payloadWithSuitePlan = { ...payload, suitePlan };
  const promptItems = planItems.map((planItem, index) => ({
    index,
    planItem: { ...planItem, globalIndex: index },
    localPrompt: buildCategoryPrompt(payloadWithSuitePlan, { ...planItem, globalIndex: index })
  }));

  assertPromptModelConfigured(config, "分类提示词生成");

  const rewrittenPrompts = new Map();
  for (let start = 0; start < promptItems.length; start += CATEGORY_PROMPT_REWRITE_CHUNK_SIZE) {
    const chunk = promptItems.slice(start, start + CATEGORY_PROMPT_REWRITE_CHUNK_SIZE);
    try {
      sendProgress?.({
        stage: "rewriting-prompts",
        current: Math.min(start + chunk.length, promptItems.length),
        total: promptItems.length,
        progress: Math.round((Math.min(start + chunk.length, promptItems.length) / Math.max(1, promptItems.length)) * 100)
      });
      const rewritten = await rewriteCategoryPromptChunk(config, chunk);
      for (const [index, prompt] of rewritten.entries()) {
        rewrittenPrompts.set(index, prompt);
      }
    } catch (error) {
      throw new Error(`分类提示词生成失败：${error.message}`);
    }
  }

  const missing = promptItems.filter((item) => !rewrittenPrompts.has(item.index));
  if (missing.length) {
    throw new Error(`分类提示词生成失败：提示词模型只返回了 ${rewrittenPrompts.size}/${promptItems.length} 条分镜提示词。请重试或更换提示词模型。`);
  }

  return promptItems.map((item) => ({
    ...item,
    prompt: rewrittenPrompts.get(item.index),
    promptSource: "prompt-api"
  }));
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

function normalizeGeneratedTaskResults(task) {
  const results = (task.results || []).map((result) => ({
    ...result,
    model: task.model,
    kind: task.kind,
    prompt: task.prompt,
    finalPrompt: task.finalPrompt,
    variantIndex: task.variantIndex,
    totalForKind: task.totalForKind,
    promptSource: task.promptSource,
    aspectRatio: task.aspectRatio,
    imageSize: task.imageSize,
    taskId: task.id
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
  const config = await getConfig();
  if ((config.imageProviderType || "grsai") !== "grsai") {
    throw new Error("当前版本批量套图生成只完整支持 Grsai 作图协议。其他作图供应商配置已可保存，生成接口需要后续专门适配。");
  }
  if (!(config.imageApiKey || config.grsaiApiKey)) {
    throw new Error("请先在 API 设置中填写作图 API Key。");
  }
  assertPromptModelConfigured(config, "套图策划/分类提示词生成");

  const planItems = planItemsFromPayload(payload);
  if (!planItems.length) {
    throw new Error("请至少选择一种图片类型。");
  }
  const allResults = [];
  const completedTasks = new Array(planItems.length);
  const generationId = payload.generationId || `${Date.now()}`;
  const concurrency = resolveImageConcurrency(config, planItems.length);
  const suitePlan = await buildSuitePlan(config, payload, planItems, (progress) => {
    event?.sender?.send?.("generation:progress", {
      ...progress,
      generationId,
      total: planItems.length
    });
  });
  const payloadWithSuitePlan = { ...payload, suitePlan };

  const promptPlan = await buildPromptPlan(config, payloadWithSuitePlan, planItems, suitePlan, (progress) => {
    event?.sender?.send?.("generation:progress", {
      ...progress,
      generationId,
      total: planItems.length
    });
  });

  event?.sender?.send?.("generation:plan", {
    generationId,
    suitePlan,
    promptPlan: promptPlan.map((promptItem) => ({
      index: promptItem.index + 1,
      kind: promptItem.planItem.kind,
      variantIndex: promptItem.planItem.variantIndex,
      totalForKind: promptItem.planItem.totalForKind,
      promptSource: promptItem.promptSource,
      prompt: promptItem.prompt
    }))
  });

  event?.sender?.send?.("generation:batch", {
    generationId,
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
    try {
      const task = await generateOneImage(config, payloadWithSuitePlan, promptItem, i + 1, planItems.length, (progress) => {
        event?.sender?.send?.("generation:progress", {
          ...progress,
          generationId,
          current: i + 1,
          total: planItems.length
        });
      });
      completedTasks[i] = task;
      const taskResults = await cacheGeneratedImageResults(normalizeGeneratedTaskResults(task));
      allResults.push(...taskResults);
      event?.sender?.send?.("generation:result", {
        generationId,
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
        current: i + 1,
        total: planItems.length,
        kind: planItem.kind,
        status: failedResult.status,
        error: error.message,
        results: [failedResult]
      });
      event?.sender?.send?.("generation:progress", {
        generationId,
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

async function generateOneImage(config, payload, promptItem, index, total, sendProgress) {
  const startedAt = Date.now();
  const planItem = promptItem.planItem || promptItem;
  const imageProviderType = config.imageProviderType || "grsai";
  const imageProvider = config.imageProvider || "grsai";
  if (imageProviderType !== "grsai") {
    throw new Error(`当前作图供应商“${imageProvider}”已可保存配置，但批量套图生成暂时只完整支持 Grsai 协议。请切回 Grsai，或后续为该供应商补充专门适配。`);
  }
  const model = resolveImageModelForPayload(config, payload);
  const categoryPrompt = promptItem.prompt || buildCategoryPrompt(payload, planItem);
  const prompt = withNegativePrompt(categoryPrompt, payload.negativePrompt);
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
    variantIndex: planItem.variantIndex,
    totalForKind: planItem.totalForKind,
    promptSource: promptItem.promptSource || "local",
    aspectRatio: requestBody.aspectRatio,
    imageSize: requestBody.imageSize
  };
}

function buildRepairPrompt(payload = {}) {
  const basePrompt = String(payload.prompt || payload.finalPrompt || "").trim();
  const instruction = String(payload.repairInstruction || "").trim();
  const analysis = normalizeAnalysisResult(payload, payload.analysis || {});
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
    "Repair task:",
    instruction,
    "Keep all unmarked areas as visually unchanged as possible: same composition, camera angle, crop, background, lighting, colors, text zones, product count, and surrounding objects.",
    "Inside the marked area, correct the product deformation or wrong use while preserving exact product identity, material, proportions, colors, handle shape, blades, teeth, holes, rivets, seams, labels, and included components.",
    locks,
    basePrompt ? `Original image prompt context: ${basePrompt}` : "",
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
  app.whenReady().then(() => {
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

  ipcMain.handle("config:get", async () => getConfig());

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
      promptProviderApiOptions: normalizePromptProviderApiOptionsMap(config?.promptProviderApiOptions),
      promptModelCapabilities: normalizePromptModelCapabilitiesMap(config?.promptModelCapabilities),
      imageProvider: imageSettings.imageProvider,
      imageProviderType: imageSettings.imageProviderType,
      imageProviderKeys: normalizeStringMap(config?.imageProviderKeys, normalizeImageProvider),
      imageProviderModels: normalizeStringArrayMap(config?.imageProviderModels, normalizeImageProvider),
      imageProviderLastModels: normalizeStringMap(config?.imageProviderLastModels, normalizeImageModelSlotKey),
      imageBaseUrl: imageSettings.imageBaseUrl,
      grsaiBaseUrl: imageSettings.imageBaseUrl,
      imageApiKey: String(config?.imageApiKey || config?.grsaiApiKey || "").trim(),
      imageModelRoute: normalizeImageModelRoute(config?.imageModelRoute),
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
  ipcMain.handle("title:optimize", async (_event, payload) => optimizeTitle(payload));

  ipcMain.handle("image:generate", async (event, payload) => {
    const config = await getConfig();
    if ((config.imageProviderType || "grsai") !== "grsai") {
      throw new Error("当前版本批量套图生成只完整支持 Grsai 作图协议。其他作图供应商配置已可保存，生成接口需要后续专门适配。");
    }
    if (!(config.imageApiKey || config.grsaiApiKey)) {
      throw new Error("请先在 API 设置中填写作图 API Key。");
    }
    assertPromptModelConfigured(config, "套图策划/分类提示词生成");

    const planItems = planItemsFromPayload(payload);
    if (!planItems.length) {
      throw new Error("请至少选择一种图片类型。");
    }
    const allResults = [];
    const completedTasks = new Array(planItems.length);
    const generationId = payload.generationId || `${Date.now()}`;
    const concurrency = resolveImageConcurrency(config, planItems.length);
    const suitePlan = await buildSuitePlan(config, payload, planItems, (progress) => {
      event.sender.send("generation:progress", {
        ...progress,
        generationId,
        total: planItems.length
      });
    });
    const payloadWithSuitePlan = { ...payload, suitePlan };

    const promptPlan = await buildPromptPlan(config, payloadWithSuitePlan, planItems, suitePlan, (progress) => {
      event.sender.send("generation:progress", {
        ...progress,
        generationId,
        total: planItems.length
      });
    });

    event.sender.send("generation:plan", {
      generationId,
      suitePlan,
      promptPlan: promptPlan.map((promptItem) => ({
        index: promptItem.index + 1,
        kind: promptItem.planItem.kind,
        variantIndex: promptItem.planItem.variantIndex,
        totalForKind: promptItem.planItem.totalForKind,
        promptSource: promptItem.promptSource,
        prompt: promptItem.prompt
      }))
    });

    event.sender.send("generation:batch", {
      generationId,
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
      try {
        const task = await generateOneImage(config, payloadWithSuitePlan, promptItem, i + 1, planItems.length, (progress) => {
          event.sender.send("generation:progress", {
            ...progress,
            generationId,
            current: i + 1,
            total: planItems.length
          });
        });
        completedTasks[i] = task;
        const taskResults = await cacheGeneratedImageResults(normalizeGeneratedTaskResults(task));
        allResults.push(...taskResults);
        event.sender.send("generation:result", {
          generationId,
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
          current: i + 1,
          total: planItems.length,
          kind: planItem.kind,
          status: failedResult.status,
          error: error.message,
          results: [failedResult]
        });
        event.sender.send("generation:progress", {
          generationId,
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
  buildCategoryPrompt,
  buildTitleOptimizationRequest,
  buildPromptPlan,
  categoryEvidenceRule,
  filterCommercialSearchTerms,
  findTitleContextMismatches,
  generateImageForTest,
  getConfig,
  generateOneImage,
  listImageApiModelsForTest: listImageApiModels,
  listPromptApiModelsForTest: listPromptApiModels,
  normalizeGrsaiReferenceImagesForTest: normalizeGrsaiReferenceImages,
  assertNoLocalFileReferencesInOutboundRequestForTest: assertNoLocalFileReferencesInOutboundRequest,
  containsLocalFileReferenceForTest: containsLocalFileReference,
  inferProductMechanism,
  normalizeGeneratedTaskResults,
  normalizeImageKindSelection,
  normalizeTitleOptimizationResult,
  optimizeTitle,
  planItemsFromPayload,
  pruneExpiredHistoryResultsForTest: pruneExpiredHistoryResults,
  recoverHistoryFromCacheForTest: recoverHistoryFromCache,
  sanitizeProductIdentityBrief,
  saveConfigForTest,
  testImageApiConnectionForTest: testImageApiConnection,
  testPromptApiConnectionForTest: testPromptApiConnection,
  validateTitleOptimizationResult,
  visualStrategyFromPayload
};
