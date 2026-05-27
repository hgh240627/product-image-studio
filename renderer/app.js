const state = {
  config: null,
  selectedPromptProvider: "grsai-gemini",
  images: [],
  brand: {
    primaryColor: "auto",
    colorMode: "auto",
    fontStyle: "auto",
    region: "US",
    language: "English",
    platform: "Amazon",
    customStyle: ""
  },
  resolution: "1K",
  ratio: "1:1",
  imageModelRoute: "auto",
  imageModelTier: "standard",
  referenceStrategy: "auto",
  suitePlan: null,
  promptPlan: [],
  selectedResultIndex: -1,
  autoFilledProductInfo: "",
  productFactsReviewPending: false,
  lastAnalyzedProductFacts: "",
  repairHasMarks: false,
  productPackageMode: "single",
  kindCounts: {
    主图: 0,
    SKU图: 0,
    卖点图: 0,
    白底图: 0,
    场景图: 0,
    特写图: 0,
    "高级A+": 0
  },
  aPlusSize: "970x300",
  activeGenerationId: null,
  liveResults: [],
  liveCompletedCount: 0,
  liveTotalCount: 0,
  liveProgressByIndex: {},
  analysis: null,
  route: "image",
  title: {
    platform: "Amazon",
    productPackageMode: "single",
    result: null
  }
};

const INVITE_CODE = "hghlx88888888";
const INVITE_STORAGE_KEY = "productImageStudioInvite";
const AUTO_LOGIN_STORAGE_KEY = "productImageStudioAutoLogin";
const REMEMBER_INVITE_STORAGE_KEY = "productImageStudioRememberInvite";
const ACTIVE_ROUTE_STORAGE_KEY = "productImageStudioRoute";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const A_PLUS_OPTIONS = {
  Amazon: [
    { value: "970x300", label: "970 × 300" },
    { value: "970x600", label: "970 × 600" },
    { value: "1464x600", label: "1464 × 600" },
    { value: "600x450", label: "600 × 450" }
  ],
  Temu: [
    { value: "1:1", label: "1:1（Temu）" }
  ],
  default: [
    { value: "1:1", label: "1:1" },
    { value: "4:5", label: "4:5" },
    { value: "16:9", label: "16:9" }
  ]
};

const PRODUCT_IMAGE_LIMIT = 6;
const CUTOUT_DEFAULT_HINT = "10M 以内，点击或拖拽随手拍产品图";
const CUSTOM_MODEL_VALUE = "__custom_model__";
const MODEL_ICON_BASE = "../assets/model-icons/";
const MODEL_ICON_FILES = {
  chatgpt: "chatgpt.svg",
  gemini: "gemini.svg",
  flux: "flux.svg",
  deepseek: "deepseek.svg",
  doubao: "doubao.svg",
  jimeng: "jimeng.svg",
  qwen: "qwen.svg",
  banana: "nano-banana.svg",
  generic: "ai-generic.svg"
};
const STANDARD_IMAGE_MODELS = new Set(["nano-banana-fast", "gpt-image-2", "nano-banana"]);
const GRSAI_IMAGE_MODEL_INFO = {
  "gpt-image-2": {
    resolutions: ["1K"],
    supportText: "1K",
    tier: "standard",
    strength: "基础稳定，适合日常主图/SKU/白底图。"
  },
  "gpt-image-2-vip": {
    resolutions: ["1K", "2K", "4K"],
    supportText: "1K / 2K / 4K",
    tier: "advanced",
    strength: "细节控制更强，适合高分辨率和复杂详情图。"
  },
  "nano-banana": {
    resolutions: null,
    supportText: "官方直连",
    tier: "standard",
    strength: "产品理解较好，适合常规图生图和套图。"
  },
  "nano-banana-fast": {
    resolutions: null,
    supportText: "官方直连",
    tier: "standard",
    strength: "速度优先，适合快速试图和低风险图片。"
  },
  "nano-banana-2": {
    resolutions: ["1K", "2K", "4K"],
    supportText: "1K / 2K / 4K",
    tier: "advanced",
    strength: "构图和产品一致性更强，适合正式套图。"
  },
  "nano-banana-pro": {
    resolutions: ["1K", "2K", "4K"],
    supportText: "1K / 2K / 4K",
    tier: "advanced",
    strength: "高级产品理解，适合场景、卖点和 A+。"
  },
  "nano-banana-pro-vt": {
    resolutions: ["1K", "2K", "4K"],
    supportText: "1K / 2K / 4K",
    tier: "advanced",
    strength: "更适合复杂视觉和视频感构图。"
  },
  "nano-banana-2-cl": {
    resolutions: ["1K", "2K"],
    supportText: "1K / 2K",
    tier: "advanced",
    strength: "一致性优先，适合克隆/参考感更强的图片。"
  },
  "nano-banana-pro-cl": {
    resolutions: ["1K", "2K", "4K"],
    supportText: "1K / 2K / 4K",
    tier: "advanced",
    strength: "高级一致性，适合复杂套图和局部修复。"
  },
  "nano-banana-2-4k-cl": {
    resolutions: ["4K"],
    supportText: "4K",
    tier: "advanced",
    strength: "4K 一致性专用，适合高精细输出。"
  },
  "nano-banana-pro-vip": {
    resolutions: ["1K", "2K"],
    supportText: "1K / 2K",
    tier: "advanced",
    strength: "VIP 高质量，适合高价值正式出图。"
  },
  "nano-banana-pro-4k-vip": {
    resolutions: ["4K"],
    supportText: "4K",
    tier: "advanced",
    strength: "4K VIP 高细节，适合最终精品图。"
  }
};

const GRSAI_IMAGE_MODELS = [
  "gpt-image-2",
  "gpt-image-2-vip",
  "nano-banana-fast",
  "nano-banana-2",
  "nano-banana-pro",
  "nano-banana-pro-vt",
  "nano-banana-2-cl",
  "nano-banana-pro-cl",
  "nano-banana-2-4k-cl",
  "nano-banana-pro-vip",
  "nano-banana-pro-4k-vip",
  "nano-banana"
];

const API_PROVIDER_PRESETS = {
  "grsai-gemini": {
    label: "Grsai Gemini（推荐）",
    promptBaseUrl: "https://grsai.dakka.com.cn/v1",
    promptModel: "gemini-3.1-pro",
    promptEndpoint: "chat",
    models: ["gemini-3.1-pro", "gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-3-flash", "gemini-3-pro", "gemini-2.5-flash", "gemini-2.5-pro"],
    hint: "固定使用 Grsai 的 OpenAI 兼容 Chat Completions 接口写提示词，默认模型 gemini-3.1-pro。",
    source: "Grsai /v1/chat/completions 文档"
  },
  zyapi: {
    label: "ZyAPI",
    promptBaseUrl: "https://zyapi.tuluo.top:8888/v1",
    promptModel: "gpt-5.4",
    promptEndpoint: "chat",
    models: ["gpt-5.4", "gpt-5.5"],
    hint: "OpenAI 兼容聚合通道；如果某个模型不支持 Chat，可在高级 API 设置里切到 Responses 或自动尝试。",
    source: "现有软件默认配置"
  },
  "openai-response": {
    label: "OpenAI-Response",
    promptBaseUrl: "https://api.openai.com/v1",
    promptModel: "gpt-4.1",
    promptEndpoint: "responses",
    models: ["gpt-4.1", "gpt-4.1-mini", "o4-mini", "o3"],
    hint: "使用 OpenAI Responses API，适合需要推理、工具参数和新版 Responses 能力的模型。",
    source: "OpenAI Responses API"
  },
  openai: {
    label: "OpenAI",
    promptBaseUrl: "https://api.openai.com/v1",
    promptModel: "gpt-4.1",
    promptEndpoint: "chat",
    models: ["gpt-4.1", "gpt-4.1-mini", "gpt-4o", "gpt-4o-mini"],
    hint: "OpenAI Chat Completions 兼容模式。",
    source: "OpenAI API"
  },
  gemini: {
    label: "Gemini",
    promptBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    promptModel: "gemini-2.5-pro",
    promptEndpoint: "gemini",
    models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
    hint: "Google Gemini 原生 generateContent 接口；API Key 会放在请求参数中。",
    source: "Google Gemini API"
  },
  anthropic: {
    label: "Anthropic",
    promptBaseUrl: "https://api.anthropic.com/v1",
    promptModel: "claude-3-5-sonnet-latest",
    promptEndpoint: "anthropic",
    models: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest"],
    hint: "Anthropic Messages API，适合 Claude 系列模型。",
    source: "Anthropic Messages API"
  },
  qwen: {
    label: "千问",
    promptBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    promptModel: "qwen3-vl-plus",
    promptEndpoint: "chat",
    models: ["qwen3-vl-plus", "qwen-vl-plus", "qwen-plus", "qwen-turbo"],
    hint: "千问建议使用 VL 模型做图片识别；官方 OpenAI 兼容地址为阿里云百炼 DashScope compatible-mode/v1。",
    source: "阿里云百炼官方 OpenAI 兼容文档"
  },
  deepseek: {
    label: "DeepSeek",
    promptBaseUrl: "https://api.deepseek.com",
    promptModel: "deepseek-chat",
    promptEndpoint: "chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
    hint: "DeepSeek 官方提供 OpenAI 兼容接口，适合文本提示词和标题任务；图片识别请确认模型是否支持视觉输入。",
    source: "DeepSeek 官方 API 文档"
  },
  doubao: {
    label: "豆包",
    promptBaseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    promptModel: "doubao-seed-1-6-vision-250615",
    promptEndpoint: "chat",
    models: ["doubao-seed-1-6-vision-250615", "doubao-seed-1-6-250615", "doubao-1-5-vision-pro-250328"],
    hint: "豆包使用火山方舟 OpenAI 兼容接口；实际模型名也可以填写控制台创建的 ep- 开头推理接入点 ID。",
    source: "火山方舟官方 OpenAI 兼容文档"
  },
  zhipu: {
    label: "智普/智谱",
    promptBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
    promptModel: "glm-5.1",
    promptEndpoint: "chat",
    models: ["glm-5.1", "glm-4.7", "glm-4.5"],
    hint: "智谱 GLM 官方兼容 OpenAI Chat Completions v4 接口；如账号是 Coding Plan，请按控制台说明改为专属 Coding 地址。",
    source: "智谱官方 API 文档"
  },
  xiaomi: {
    label: "小米",
    promptBaseUrl: "https://api.xiaomimimo.com/v1",
    promptModel: "mimo-v2.5-pro",
    promptEndpoint: "chat",
    models: ["mimo-v2.5-pro", "mimo-v2.5", "mimo-v2-flash"],
    hint: "小米 MiMo 官网可确认 API 平台和 V2.5 系列模型；Base URL 可能随账号和 Token Plan 调整，请以控制台为准。",
    source: "小米 MiMo API 平台"
  },
  custom: {
    label: "自定义",
    promptBaseUrl: "",
    promptModel: "",
    promptEndpoint: "chat",
    models: [],
    hint: "自定义适用于任何兼容 OpenAI 的 API，请手动填写 API 地址、Key、模型和接口类型。",
    source: ""
  }
};

const DEFAULT_PROVIDER_ORDER = [
  "grsai-gemini",
  "zyapi",
  "openai-response",
  "openai",
  "gemini",
  "anthropic",
  "qwen",
  "deepseek",
  "doubao",
  "zhipu",
  "xiaomi"
];

const API_OPTION_DEFAULTS = {
  arrayMessages: true,
  developerMessage: false,
  streamOptions: false,
  serviceTier: false,
  enableThinking: false,
  verbosity: false
};

const CAPABILITY_META = [
  { key: "vision", label: "视觉", short: "眼" },
  { key: "web", label: "联网", short: "网" },
  { key: "reasoning", label: "推理", short: "思" },
  { key: "tools", label: "工具调用", short: "工" },
  { key: "rerank", label: "重排", short: "排" },
  { key: "embedding", label: "嵌入", short: "嵌" }
];

const IMAGE_PROVIDER_PRESETS = {
  grsai: {
    label: "Grsai（当前）",
    providerType: "grsai",
    baseUrl: "https://grsai.dakka.com.cn",
    model1k: "gpt-image-2",
    model2k: "gpt-image-2-vip",
    models: GRSAI_IMAGE_MODELS,
    supported: true,
    hint: "当前默认生图供应商，生成和检测都会真实调用 Grsai /v1/images/generations；检测时会生成 1 张简单测试图。"
  },
  openai: {
    label: "OpenAI Images",
    providerType: "openai-images",
    baseUrl: "https://api.openai.com/v1",
    model1k: "gpt-image-1",
    model2k: "gpt-image-1",
    models: ["gpt-image-1"],
    supported: false,
    hint: "适合后续接入 OpenAI Images API；该适配类型已可保存配置，但当前批量套图仍默认走 Grsai。"
  },
  qwen: {
    label: "通义万相",
    providerType: "custom",
    baseUrl: "https://dashscope.aliyuncs.com/api/v1",
    model1k: "wanx2.1-t2i-turbo",
    model2k: "wanx2.1-t2i-plus",
    models: ["wanx2.1-t2i-turbo", "wanx2.1-t2i-plus"],
    supported: false,
    hint: "通义万相生图接口不是 Grsai 协议，已支持保存配置，生成调用需要后续专门适配。"
  },
  doubao: {
    label: "火山方舟/即梦",
    providerType: "custom",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    model1k: "doubao-seedream-3-0-t2i-250415",
    model2k: "doubao-seedream-3-0-t2i-250415",
    models: ["doubao-seedream-3-0-t2i-250415"],
    supported: false,
    hint: "火山方舟生图模型通常使用方舟控制台模型或接入点，已支持保存配置，生成调用需要后续专门适配。"
  },
  stability: {
    label: "Stability AI",
    providerType: "custom",
    baseUrl: "https://api.stability.ai",
    model1k: "stable-image-core",
    model2k: "stable-image-ultra",
    models: ["stable-image-core", "stable-image-ultra", "sd3.5-large"],
    supported: false,
    hint: "Stability AI 的图片接口为独立协议，已支持保存配置，生成调用需要后续专门适配。"
  },
  replicate: {
    label: "Replicate",
    providerType: "custom",
    baseUrl: "https://api.replicate.com/v1",
    model1k: "black-forest-labs/flux-schnell",
    model2k: "black-forest-labs/flux-1.1-pro",
    models: ["black-forest-labs/flux-schnell", "black-forest-labs/flux-1.1-pro"],
    supported: false,
    hint: "Replicate 使用模型 owner/name 或版本 ID，已支持保存配置，生成调用需要后续专门适配。"
  },
  kling: {
    label: "可灵 Kling",
    providerType: "custom",
    baseUrl: "https://api.klingai.com",
    model1k: "kling-image",
    model2k: "kling-image",
    models: ["kling-image"],
    supported: false,
    hint: "可灵图片接口为独立协议，已支持保存配置，生成调用需要后续专门适配。"
  },
  gemini: {
    label: "Google Gemini",
    providerType: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model1k: "gemini-3.1-flash-image-preview",
    model2k: "gemini-3-pro-image-preview",
    models: ["gemini-3.1-flash-image-preview", "gemini-3-pro-image-preview", "gemini-2.5-flash-image"],
    supported: false,
    hint: "Google Gemini/Nano Banana 官方 API 已可保存配置和获取模型列表，批量生成调用需要后续专门适配。"
  },
  midjourney: {
    label: "Midjourney（MJ）",
    providerType: "custom",
    baseUrl: "",
    model1k: "mj-v7",
    model2k: "mj-v7",
    models: ["mj-v7", "mj-v6.1", "niji-v6"],
    supported: false,
    hint: "Midjourney 目前没有公开官方 API；这里作为 MJ 第三方中转或自有网关配置位，API 地址需要手动填写。"
  },
  bfl: {
    label: "黑森林 Black Forest Labs",
    providerType: "bfl",
    baseUrl: "https://api.bfl.ai/v1",
    model1k: "flux-2-pro-preview",
    model2k: "flux-2-max",
    models: ["flux-2-max", "flux-2-pro-preview", "flux-2-pro", "flux-2-flex", "flux-pro-1.1-ultra", "flux-pro-1.1"],
    supported: false,
    hint: "黑森林官方 FLUX API 使用 x-key 鉴权和异步轮询，已可保存配置和检测余额接口，生成调用需要后续专门适配。"
  },
  custom: {
    label: "自定义",
    providerType: "custom",
    baseUrl: "",
    model1k: "",
    model2k: "",
    models: [],
    supported: false,
    hint: "自定义生图供应商可保存地址、Key、模型和适配类型；非 Grsai 协议需要后续专门适配。"
  }
};

function normalizePlatformKey(platform) {
  const value = String(platform || "").toLowerCase();
  if (value === "temu") return "Temu";
  if (value === "amazon") return "Amazon";
  return platform;
}

function normalizeTitlePlatform(platform) {
  return normalizePlatformKey(platform) === "Temu" ? "Temu" : "Amazon";
}

const els = {
  app: $("#app"),
  inviteGate: $("#inviteGate"),
  inviteCode: $("#inviteCode"),
  autoLogin: $("#autoLogin"),
  rememberInvite: $("#rememberInvite"),
  inviteSubmit: $("#inviteSubmit"),
  inviteError: $("#inviteError"),
  sideNavItems: $$(".side-nav-item"),
  imagePage: $("#imagePage"),
  titlePage: $("#titlePage"),
  videoPage: $("#videoPage"),
  apiState: $("#apiState"),
  routeLabel: $("#routeLabel"),
  cutoutDropzone: $("#cutoutDropzone"),
  cutoutActionBtn: $("#cutoutActionBtn"),
  dropzone: $("#dropzone"),
  fileInput: $("#fileInput"),
  cutoutFileInput: $("#cutoutFileInput"),
  cutoutHint: $("#cutoutHint"),
  productUploadMain: $("#productUploadMain"),
  productUploadHint: $("#productUploadHint"),
  thumbs: $("#thumbs"),
  productPackageMode: $("#productPackageMode"),
  productName: $("#productName"),
  productNameLabel: $("#productNameLabel"),
  productInfoLabel: $("#productInfoLabel"),
  productBriefTitle: $("#productBriefTitle"),
  productBriefCaption: $("#productBriefCaption"),
  packageModeHint: $("#packageModeHint"),
  productModeTips: $("#productModeTips"),
  productInfo: $("#productInfo"),
  charCount: $("#charCount"),
  analyzeBtn: $("#analyzeBtn"),
  generateBtn: $("#generateBtn"),
  summaryBox: $("#summaryBox"),
  sellingPointsBox: $("#sellingPointsBox"),
  promptBox: $("#promptBox"),
  statusLine: $("#statusLine"),
  titleStatusLine: $("#titleStatusLine"),
  titlePlatformGroup: $("#titlePlatformGroup"),
  titlePackageMode: $("#titlePackageMode"),
  titleDropzone: $("#titleDropzone"),
  titleFileInput: $("#titleFileInput"),
  titleThumbs: $("#titleThumbs"),
  titleUploadHint: $("#titleUploadHint"),
  titleProductName: $("#titleProductName"),
  titleProductInfo: $("#titleProductInfo"),
  titleOperatorKeywords: $("#titleOperatorKeywords"),
  titleGenerateBtn: $("#titleGenerateBtn"),
  titleResultMain: $("#titleResultMain"),
  titleLength: $("#titleLength"),
  titleStructureBox: $("#titleStructureBox"),
  titlePairBox: $("#titlePairBox"),
  titleTrendBox: $("#titleTrendBox"),
  titleAlternatesBox: $("#titleAlternatesBox"),
  titleComplianceBox: $("#titleComplianceBox"),
  titleSummaryBox: $("#titleSummaryBox"),
  titleWarningsBox: $("#titleWarningsBox"),
  titleDetailsToggle: $("#titleDetailsToggle"),
  copyTitleBtn: $("#copyTitleBtn"),
  progressBox: $("#progressBox"),
  progressText: $("#progressText"),
  progressNumber: $("#progressNumber"),
  progressFill: $("#progressFill"),
  results: $("#results"),
  planningModelLabel: $("#planningModelLabel"),
  suitePlanStatus: $("#suitePlanStatus"),
  styleMasterBox: $("#styleMasterBox"),
  promptPlanList: $("#promptPlanList"),
  selectedMeta: $("#selectedMeta"),
  selectedPreview: $("#selectedPreview"),
  selectedPreviewImg: $("#selectedPreviewImg"),
  saveSelectedBtn: $("#saveSelectedBtn"),
  openSelectedBtn: $("#openSelectedBtn"),
  promptEditor: $("#promptEditor"),
  regenerateSelectedBtn: $("#regenerateSelectedBtn"),
  modelTierTabs: $("#modelTierTabs"),
  imageModelTierBadge: $("#imageModelTierBadge"),
  currentImageModelName: $("#currentImageModelName"),
  currentImageModelDesc: $("#currentImageModelDesc"),
  modelRouteHint: $("#modelRouteHint"),
  repairCanvasWrap: $("#repairCanvasWrap"),
  repairCanvasImage: $("#repairCanvasImage"),
  repairCanvas: $("#repairCanvas"),
  repairInstruction: $("#repairInstruction"),
  clearRepairMarksBtn: $("#clearRepairMarksBtn"),
  repairSelectedBtn: $("#repairSelectedBtn"),
  recoverHistoryBtn: $("#recoverHistoryBtn"),
  historyList: $("#historyList"),
  totalCountValue: $("#totalCountValue"),
  aPlusOptions: $("#aPlusOptions"),
  aPlusSize: $("#aPlusSize"),
  toast: $("#toast"),
  brandSummary: $("#brandSummary"),
  brandDrawer: $("#brandDrawer"),
  settingsDrawer: $("#settingsDrawer"),
  providerList: $("#providerList"),
  providerSearch: $("#providerSearch"),
  addProviderBtn: $("#addProviderBtn"),
  promptProviderTitle: $("#promptProviderTitle"),
  promptProviderToggle: $("#promptProviderToggle"),
  promptApiSettingsBtn: $("#promptApiSettingsBtn"),
  promptApiAddressPreview: $("#promptApiAddressPreview"),
  promptModelList: $("#promptModelList"),
  promptModelCount: $("#promptModelCount"),
  addPromptModelBtn: $("#addPromptModelBtn"),
  apiAdvancedModal: $("#apiAdvancedModal"),
  closeApiAdvancedBtn: $("#closeApiAdvancedBtn"),
  providerAddModal: $("#providerAddModal"),
  providerNameInput: $("#providerNameInput"),
  providerTypeSelect: $("#providerTypeSelect"),
  cancelProviderAddBtn: $("#cancelProviderAddBtn"),
  confirmProviderAddBtn: $("#confirmProviderAddBtn"),
  closeProviderAddBtn: $("#closeProviderAddBtn"),
  modelEditModal: $("#modelEditModal"),
  modelEditTitle: $("#modelEditTitle"),
  modelEditId: $("#modelEditId"),
  modelEditName: $("#modelEditName"),
  modelEditGroup: $("#modelEditGroup"),
  modelEditSaveBtn: $("#modelEditSaveBtn"),
  closeModelEditBtn: $("#closeModelEditBtn"),
  imageViewer: $("#imageViewer"),
  imageViewerImg: $("#imageViewerImg"),
  imageViewerTitle: $("#imageViewerTitle"),
  closeImageViewer: $("#closeImageViewer"),
  cutoutConfirm: $("#cutoutConfirm"),
  cutoutOriginalPreview: $("#cutoutOriginalPreview"),
  cutoutPreview: $("#cutoutPreview"),
  cutoutUploadConfirm: $("#cutoutUploadConfirm"),
  cutoutCancelX: $("#cutoutCancelX"),
  cutoutCancelBtn: $("#cutoutCancelBtn"),
  cutoutSaveBtn: $("#cutoutSaveBtn"),
  cutoutConfirmBtn: $("#cutoutConfirmBtn"),
  repairResultModal: $("#repairResultModal"),
  repairResultPreview: $("#repairResultPreview"),
  repairResultCloseX: $("#repairResultCloseX"),
  repairResultCloseBtn: $("#repairResultCloseBtn"),
  repairResultSaveBtn: $("#repairResultSaveBtn"),
  errorModal: $("#errorModal"),
  errorModalTitle: $("#errorModalTitle"),
  errorModalMessage: $("#errorModalMessage"),
  errorModalClose: $("#errorModalClose"),
  errorModalCloseX: $("#errorModalCloseX"),
  imageTestModal: $("#imageTestModal"),
  imageTestModelSelect: $("#imageTestModelSelect"),
  imageTestModelCustom: $("#imageTestModelCustom"),
  imageTestProviderLabel: $("#imageTestProviderLabel"),
  imageTestModelHint: $("#imageTestModelHint"),
  imageTestCancelBtn: $("#imageTestCancelBtn"),
  imageTestStartBtn: $("#imageTestStartBtn"),
  imageTestCloseX: $("#imageTestCloseX")
};

let appInitialized = false;
let pendingCutoutResult = null;
let pendingCutoutOriginal = null;
let pendingRepairResult = null;
let errorModalRetryHandler = null;
let imageTestDialogResolver = null;
let repairDrawing = false;
let repairLastPoint = null;

function toast(message, type = "info") {
  els.toast.textContent = message;
  els.toast.classList.toggle("error", type === "error");
  els.toast.classList.remove("hidden");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => els.toast.classList.add("hidden"), 4200);
}

function showErrorModal(message, title = "标题生成失败") {
  showMessageModal(message, title, "error");
}

function showMessageModal(message, title = "提示", type = "info") {
  els.errorModalTitle.textContent = title;
  els.errorModalMessage.textContent = message || "发生未知错误，请检查 API 设置后重试。";
  const card = els.errorModal.querySelector(".error-card");
  card?.classList.toggle("success", type === "success");
  configureErrorModalRetry(null);
  els.errorModal.classList.remove("hidden");
}

function isTimeoutMessage(message) {
  return /超时|timeout|timed out|ETIMEDOUT|ESOCKETTIMEDOUT|请求超时/i.test(String(message || ""));
}

function humanizeErrorMessage(error, fallback = "发生未知错误，请检查 API 设置后重试。") {
  let message = String(error?.message || error || "").trim();
  message = message
    .replace(/^Error invoking remote method '[^']+':\s*/i, "")
    .replace(/^Error:\s*/i, "")
    .trim();
  if (!message) return fallback;
  const debugMatch = message.match(/本次[\s\S]*?实际请求信息：[\s\S]*$/);
  const debugText = debugMatch ? `\n\n${debugMatch[0]}` : "";

  if (/<!doctype|<html|<head|<body|cloudflare|bad gateway/i.test(message) || /\b502\b/i.test(message)) {
    return `当前 API 服务暂时不可用（502 网关错误）。这通常是供应商服务器、Cloudflare 中转或网络线路临时异常，不是您的商品信息填写错误。请稍后重试，或切换其他模型/供应商。${debugText}`;
  }
  if (/\b503\b/i.test(message)) {
    return `当前 API 服务暂时不可用或正在维护（503）。请稍后重试，或切换其他模型/供应商。${debugText}`;
  }
  if (/\b504\b|gateway timeout/i.test(message)) {
    return `当前 API 服务响应超时（504）。请稍后重试，或切换更稳定的模型/线路。${debugText}`;
  }
  if (/\b500\b/i.test(message)) {
    return `当前 API 服务内部错误（500）。请稍后重试，或切换其他模型/供应商。${debugText}`;
  }
  if (/api key|apikey|unauthorized|\b401\b/i.test(message)) {
    return `API Key 未填写、无效或没有权限，请到设置里检查 API Key。${debugText}`;
  }
  if (/\b403\b/i.test(message)) {
    return `当前 API Key 没有访问权限，请检查账号权限、模型权限或余额。${debugText}`;
  }
  if (/\b404\b/i.test(message)) {
    return `接口地址或模型名不存在，请检查 API 地址、接口类型和模型名称。${debugText}`;
  }
  if (/\b429\b|quota|rate limit|余额|额度/i.test(message)) {
    return `请求过于频繁或账号额度不足，请稍后重试，或检查账号余额。${debugText}`;
  }
  if (/\b400\b|请求参数不正确|invalid|bad request|generation failed/i.test(message)) {
    const rawSupplier = message.match(/供应商原始信息：([^\n]+)/)?.[1] || "";
    return `作图接口拒绝了本次请求参数。请优先检查弹窗下方的“本次正式作图实际请求信息”里的模型、尺寸、比例和参考图数量；如果检测模型和正式作图模型不同，请检测正式生成时显示的那个模型。${rawSupplier ? `\n供应商原始信息：${rawSupplier}` : ""}${debugText}`;
  }
  if (/不是标准\s*JSON|缺少\s*final_prompt_en|返回内容[^。；\n]*JSON|模型返回[^。；\n]*JSON|invalid\s+json|parse\s+json/i.test(message)) {
    return `提示词模型返回格式不正确，软件无法读取识别结果。请重试，或切换其他提示词模型。${debugText}`;
  }
  if (/network|fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN/i.test(message)) {
    return `无法连接到 API 服务，请检查网络、API 地址、代理设置，或稍后重试。${debugText}`;
  }
  if (message.length > 500 && !debugText) return `${message.slice(0, 500)}...`;
  return message;
}

function configureErrorModalRetry(handler) {
  errorModalRetryHandler = typeof handler === "function" ? handler : null;
  const actions = els.errorModal.querySelector(".confirm-actions");
  if (!actions) return;
  let retryButton = $("#errorModalRetry");
  if (!retryButton) {
    retryButton = document.createElement("button");
    retryButton.id = "errorModalRetry";
    retryButton.type = "button";
    retryButton.className = "secondary-button";
    retryButton.textContent = "重试";
    retryButton.addEventListener("click", () => {
      const handlerToRun = errorModalRetryHandler;
      closeErrorModal();
      handlerToRun?.();
    });
    actions.insertBefore(retryButton, actions.firstChild);
  }
  retryButton.classList.toggle("hidden", !errorModalRetryHandler);
}

function showFailureModal(error, title, retryHandler) {
  const message = humanizeErrorMessage(error);
  const canRetry = isTimeoutMessage(message) && typeof retryHandler === "function";
  showMessageModal(message, title, "error");
  configureErrorModalRetry(canRetry ? retryHandler : null);
}

function iconPath(iconKey = "generic") {
  return `${MODEL_ICON_BASE}${MODEL_ICON_FILES[iconKey] || MODEL_ICON_FILES.generic}`;
}

function modelIconKey(value = "", provider = "") {
  const text = `${provider || ""} ${value || ""}`.toLowerCase();
  if (/nano[-_\s]?banana|banana/.test(text)) return "banana";
  if (/gemini|imagen|google/.test(text)) return "gemini";
  if (/flux|bfl|black\s*forest|黑森林/.test(text)) return "flux";
  if (/deepseek/.test(text)) return "deepseek";
  if (/jimeng|即梦|jimeng-ai|jimengai/.test(text)) return "jimeng";
  if (/doubao|seed|豆包|volces|火山/.test(text)) return "doubao";
  if (/qwen|tongyi|通义|千问|wanxiang|万相/.test(text)) return "qwen";
  if (/gpt|openai|chatgpt|\bo\d/.test(text)) return "chatgpt";
  return "generic";
}

function providerIconKey(provider = "") {
  const text = String(provider || "").toLowerCase();
  if (text === "grsai") return "banana";
  if (text === "zyapi" || text === "openai") return "chatgpt";
  if (text === "grsai-gemini" || text === "gemini") return "gemini";
  if (text === "qwen") return "qwen";
  if (text === "deepseek") return "deepseek";
  if (text === "doubao") return "jimeng";
  if (text === "bfl") return "flux";
  return modelIconKey(provider);
}

function normalizeProviderKey(value = "") {
  const base = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return base || `custom-${Date.now()}`;
}

function getPromptProviderMeta() {
  const meta = state.config?.promptProviderMeta;
  return meta && typeof meta === "object" ? meta : {};
}

function getPromptProviderApiOptions() {
  const options = state.config?.promptProviderApiOptions;
  return options && typeof options === "object" ? options : {};
}

function getPromptModelCapabilitiesMap() {
  const caps = state.config?.promptModelCapabilities;
  return caps && typeof caps === "object" ? caps : {};
}

function promptProviderPreset(provider = "") {
  const meta = getPromptProviderMeta()[provider];
  if (meta) {
    return {
      ...API_PROVIDER_PRESETS.custom,
      label: meta.name || provider,
      type: meta.type || "OpenAI",
      custom: true,
      promptBaseUrl: meta.promptBaseUrl || "",
      promptEndpoint: meta.promptEndpoint || providerTypeToEndpoint(meta.type),
      promptModel: meta.promptModel || "",
      ...(state.config?.promptProviderCustomPresets?.[provider] || {})
    };
  }
  return API_PROVIDER_PRESETS[provider] || API_PROVIDER_PRESETS.custom;
}

function providerTypeToEndpoint(type = "") {
  const normalized = String(type || "").toLowerCase();
  if (normalized.includes("response")) return "responses";
  if (normalized.includes("gemini")) return "gemini";
  if (normalized.includes("anthropic")) return "anthropic";
  return "chat";
}

function promptProviderLabel(provider = "") {
  return promptProviderPreset(provider).label || provider || "自定义";
}

function allPromptProviders() {
  const providers = new Set(DEFAULT_PROVIDER_ORDER);
  for (const provider of Object.keys(API_PROVIDER_PRESETS)) {
    if (provider !== "custom") providers.add(provider);
  }
  for (const provider of Object.keys(getPromptProviderKeys())) providers.add(provider);
  for (const provider of Object.keys(getPromptProviderModels())) providers.add(provider);
  for (const provider of Object.keys(getPromptProviderMeta())) providers.add(provider);
  providers.delete("custom");
  return Array.from(providers);
}

function promptProviderEnabled(provider) {
  return Boolean(
    getSavedPromptApiKey(provider)
    || (state.config?.promptProvider === provider && state.config?.promptApiKey)
    || getPromptProviderModels()[provider]?.length
  );
}

function inferModelCapabilities(model = "", provider = "") {
  const text = `${provider || ""} ${model || ""}`.toLowerCase();
  const has = (patterns) => patterns.some((pattern) => pattern.test(text));
  const imageGeneration = has([/image/, /imagen/, /seedream/, /wanx/, /flux/, /stable/, /midjourney/]);
  return {
    vision: !imageGeneration && has([/vision/, /\bvl\b/, /qwen.*vl/, /gemini/, /gpt-4o/, /gpt-4\.1/, /claude-3/, /mimo.*omni/, /omni/]),
    web: has([/search/, /sonar/, /web/]),
    reasoning: has([/reasoner/, /thinking/, /\br1\b/, /deepseek-r/, /o1/, /o3/, /o4/, /gpt-5/, /pro/, /glm-4\.5/, /gemini-2\.5/, /claude-3-7/, /claude-4/]),
    tools: !imageGeneration && has([/gpt/, /openai/, /gemini/, /claude/, /qwen/, /doubao/, /glm/, /deepseek/, /mimo/]),
    rerank: has([/rerank/, /ranker/]),
    embedding: has([/embed/, /embedding/, /text-embedding/, /bge/, /voyage/])
  };
}

function modelCapabilities(provider, model) {
  const saved = getPromptModelCapabilitiesMap()[provider]?.[model];
  return { ...inferModelCapabilities(model, provider), ...(saved || {}) };
}

function setModelCapabilities(provider, model, capabilities) {
  const providerKey = provider || "custom";
  const modelName = String(model || "").trim();
  if (!modelName) return {};
  const next = { ...getPromptModelCapabilitiesMap() };
  next[providerKey] = { ...(next[providerKey] || {}), [modelName]: { ...capabilities } };
  state.config = { ...(state.config || {}), promptModelCapabilities: next };
  return next;
}

function syncIconImage(elementId, iconKey) {
  const element = $(`#${elementId}`);
  if (!element) return;
  element.src = iconPath(iconKey);
}

function syncProviderModelIcons() {
  syncIconImage("imageProviderIcon", providerIconKey($("#imageProvider")?.value || state.config?.imageProvider));
  syncIconImage("grsai1kModelIcon", modelIconKey(getSelectedModelValue?.("#grsai1kModel", "#grsai1kModelCustom") || state.config?.image1kModel, $("#imageProvider")?.value || state.config?.imageProvider));
  syncIconImage("grsai2kModelIcon", modelIconKey(getSelectedModelValue?.("#grsai2kModel", "#grsai2kModelCustom") || state.config?.image2kModel, $("#imageProvider")?.value || state.config?.imageProvider));
}

function currentSettingsProvider() {
  return state.selectedPromptProvider || state.config?.promptProvider || "grsai-gemini";
}

function currentPromptRequestInfo() {
  const config = state.config || {};
  const provider = config.promptProvider || "custom";
  const preset = promptProviderPreset(provider);
  const baseUrl = config.promptBaseUrl || preset.promptBaseUrl || "";
  const endpoint = config.promptEndpoint || preset.promptEndpoint || "chat";
  const model = config.promptModel || preset.promptModel || "";
  const requestUrl = endpoint === "chat"
    ? `${String(baseUrl).replace(/\/+$/, "")}/chat/completions`
    : endpoint === "responses"
      ? `${String(baseUrl).replace(/\/+$/, "")}/responses`
      : endpoint === "gemini"
        ? `${String(baseUrl).replace(/\/+$/, "")}/models/${model || "{model}"}:generateContent`
        : endpoint === "anthropic"
          ? `${String(baseUrl).replace(/\/+$/, "")}/messages`
          : `${String(baseUrl).replace(/\/+$/, "")}/chat/completions 或 /responses`;
  return [
    `供应商: ${provider}`,
    `模型: ${model || "未填写"}`,
    `接口类型: ${endpoint}`,
    `请求地址: ${requestUrl}`
  ].join("\n");
}

function showPromptFailureModal(error, title, retryHandler) {
  const baseMessage = humanizeErrorMessage(error);
  const hasDebug = /请求地址:/.test(baseMessage);
  const message = hasDebug
    ? baseMessage
    : `${baseMessage}\n\n当前 AI 分析模型配置：\n${currentPromptRequestInfo()}`;
  const canRetry = isTimeoutMessage(message) && typeof retryHandler === "function";
  showMessageModal(message, title, "error");
  configureErrorModalRetry(canRetry ? retryHandler : null);
}

function showAnalysisRequiredModal() {
  showMessageModal("因您已修改产品描述信息，请重新点击 AI 自动分析。AI 重新分析后会刷新中间的商品识别、卖点和产品身份提示词，再继续生成图片。", "请先重新 AI 分析", "error");
}

function ensureSupportedImageGeneration(actionName = "图片生成") {
  const provider = state.config?.imageProvider || "grsai";
  const providerType = state.config?.imageProviderType || "grsai";
  if (providerType === "grsai") return true;
  const preset = IMAGE_PROVIDER_PRESETS[provider] || IMAGE_PROVIDER_PRESETS.custom;
  showMessageModal(
    `${actionName}已停止：当前作图供应商是 ${preset.label || provider}，适配类型为 ${providerType}。\n当前版本只完整支持 Grsai 的真实生图、重生成、白底图和局部修复。为了避免先调用提示词模型或错误接口造成浪费，请先在 API 设置里切回 Grsai；其他供应商需要后续补充专门生图适配后再使用。`,
    "作图供应商暂未适配",
    "error"
  );
  return false;
}

function closeImageTestModal(value = null) {
  els.imageTestModal?.classList.add("hidden");
  els.imageTestModelCustom?.classList.add("hidden");
  if (imageTestDialogResolver) {
    const resolve = imageTestDialogResolver;
    imageTestDialogResolver = null;
    resolve(value);
  }
}

function selectedImageTestModel() {
  const value = els.imageTestModelSelect?.value || "";
  if (value === CUSTOM_MODEL_VALUE) return els.imageTestModelCustom?.value.trim() || "";
  return value.trim();
}

function syncImageTestModelCustomInput() {
  const isCustom = els.imageTestModelSelect?.value === CUSTOM_MODEL_VALUE;
  els.imageTestModelCustom?.classList.toggle("hidden", !isCustom);
  if (isCustom) els.imageTestModelCustom?.focus();
}

function openImageTestModelDialog(settings) {
  const provider = settings.imageProvider || "grsai";
  const preset = IMAGE_PROVIDER_PRESETS[provider] || IMAGE_PROVIDER_PRESETS.custom;
  const currentGenerationModel = resolveCurrentImageModel();
  const models = uniqueModelOptions([
    currentGenerationModel,
    settings.image1kModel,
    settings.image2kModel,
    ...(getImageProviderModelOptions(provider) || []),
    ...(preset.models || [])
  ]);
  const selected = String(currentGenerationModel || settings.image1kModel || settings.image2kModel || preset.model1k || models[0] || "").trim();

  if (!els.imageTestModal || !els.imageTestModelSelect) {
    return Promise.resolve(selected);
  }

  els.imageTestProviderLabel.textContent = `${preset.label} · ${settings.imageProviderType}`;
  els.imageTestModelHint.textContent = preset.supported
    ? `这会真实调用一次作图接口并返回测试图片，可能产生一次生图费用。默认选中的是当前正式生成会使用的模型：${selected}。`
    : "该供应商当前只支持保存配置；点击测试会返回无法真实出图检测的原因。";
  setSelectModelOptions("#imageTestModelSelect", "#imageTestModelCustom", models, selected);
  syncImageTestModelCustomInput();
  els.imageTestModal.classList.remove("hidden");

  return new Promise((resolve) => {
    imageTestDialogResolver = resolve;
  });
}

function modelIconInfo(model = "") {
  const key = modelIconKey(model, state.config?.promptProvider || "");
  return { key, src: iconPath(key), label: key === "chatgpt" ? "ChatGPT" : key };
}

function renderPlanningModelLabel() {
  if (!els.planningModelLabel) return;
  const promptModel = state.config?.promptModel || "当前提示词模型";
  const icon = modelIconInfo(promptModel);
  els.planningModelLabel.innerHTML = `<img class="model-icon model-icon-img" src="${escapeHtml(icon.src)}" alt=""><span>${escapeHtml(promptModel)}</span>`;
}

function emptyTigerMarkup(mode = "sleeping") {
  const text = mode === "working" ? "正在生成图片，请稍候" : "暂无生成结果";
  return `
    <div class="empty-result-state" aria-label="${escapeHtml(text)}">
      <span class="empty-result-icon">AI</span>
      <strong>${escapeHtml(text)}</strong>
      <small>${mode === "working" ? "任务已提交后会在这里显示每张图片进度" : "上传产品图并完成 AI 分析后即可生成套图"}</small>
    </div>
  `;
}

function closeErrorModal() {
  els.errorModal.classList.add("hidden");
  els.errorModalMessage.textContent = "";
  els.errorModal.querySelector(".error-card")?.classList.remove("success");
  configureErrorModalRetry(null);
}

function setBusy(isBusy, label) {
  els.analyzeBtn.disabled = isBusy;
  els.generateBtn.disabled = isBusy;
  els.analyzeBtn.classList.toggle("ai-running", isBusy && /AI|识别|分析/.test(String(label || "")));
  els.generateBtn.classList.toggle("ai-running", isBusy && /生成|提交|Grsai/.test(String(label || "")));
  if (els.titleGenerateBtn) els.titleGenerateBtn.disabled = isBusy;
  if (els.titleGenerateBtn) els.titleGenerateBtn.classList.toggle("ai-running", isBusy && /标题/.test(String(label || "")));
  if (els.cutoutDropzone && !state.cutoutGenerating) els.cutoutDropzone.classList.toggle("disabled", isBusy);
  if (els.titleDropzone) els.titleDropzone.classList.toggle("disabled", isBusy);
  if (label) els.statusLine.textContent = label;
}

function updateApiState() {
  const promptReady = Boolean(state.config?.promptApiKey);
  const imageProvider = state.config?.imageProvider || "grsai";
  const imageReady = Boolean(getSavedImageApiKey(imageProvider) || state.config?.imageApiKey || state.config?.grsaiApiKey);
  els.apiState.textContent = imageReady ? (promptReady ? "API 已配置" : "作图 API 已配置") : "API 未配置";
  els.apiState.classList.toggle("ready", imageReady);
  const model = resolveCurrentImageModel();
  if (els.routeLabel) {
    els.routeLabel.innerHTML = "";
    const icon = document.createElement("img");
    icon.className = "route-model-icon";
    icon.src = iconPath(modelIconKey(model, imageProvider));
    icon.alt = "";
    const text = document.createElement("span");
    text.textContent = `${model} · ${state.resolution} · ${state.ratio}`;
    els.routeLabel.append(icon, text);
  }
  renderPlanningModelLabel();
  syncProviderModelIcons();
}

function normalizeResolution(value) {
  const text = String(value || "").toUpperCase();
  return ["1K", "2K", "4K"].includes(text) ? text : "1K";
}

function normalizeImageModelRoute(value) {
  const text = String(value || "").trim();
  if (text === "auto" || GRSAI_IMAGE_MODEL_INFO[text]) return text;
  return "auto";
}

function normalizeImageModelTier(value) {
  return value === "advanced" ? "advanced" : "standard";
}

function getModelInfo(model) {
  return GRSAI_IMAGE_MODEL_INFO[String(model || "").trim()] || null;
}

function imageModelTier(model) {
  const text = String(model || "").trim();
  const info = getModelInfo(text);
  if (info?.tier) return info.tier;
  if (STANDARD_IMAGE_MODELS.has(text)) return "standard";
  return /fast|turbo|schnell|core|flash/i.test(text) && !/pro|vip|ultra|max|plus|2|4k|cl/i.test(text)
    ? "standard"
    : "advanced";
}

function imageModelStrength(model) {
  const info = getModelInfo(model);
  if (info?.strength) return info.strength;
  const text = String(model || "").toLowerCase();
  if (/ultra|max|vip|pro|plus|4k/.test(text)) return "高级质量，适合一致性、复杂场景和细节控制。";
  if (/fast|turbo|schnell|core|flash/.test(text)) return "速度优先，适合快速试图和常规图片。";
  return imageModelTier(model) === "advanced"
    ? "高级模型，适合更强的一致性、场景和细节控制。"
    : "普通模型，适合日常套图和快速生成。";
}

function supportsModelResolution(model, resolution) {
  const info = getModelInfo(model);
  const normalized = normalizeResolution(resolution);
  if (!info?.resolutions?.length) return true;
  return info.resolutions.includes(normalized);
}

function resolveCurrentImageModel() {
  const route = normalizeImageModelRoute(state.imageModelRoute || state.config?.imageModelRoute);
  if (route !== "auto") return route;
  const resolution = normalizeResolution(state.resolution);
  if (state.imageModelTier === "advanced") {
    return resolution === "1K"
      ? (state.config?.image2kModel || state.config?.grsai2kModel || "gpt-image-2-vip")
      : (state.config?.image2kModel || state.config?.grsai2kModel || "gpt-image-2-vip");
  }
  return resolution === "1K"
    ? (state.config?.image1kModel || state.config?.grsai1kModel || "gpt-image-2")
    : "nano-banana";
}

function compatibleResolutionsForModel(model) {
  const info = getModelInfo(model);
  return info?.resolutions?.length ? info.resolutions : ["1K", "2K", "4K"];
}

function syncResolutionButtons() {
  const model = resolveCurrentImageModel();
  const supported = compatibleResolutionsForModel(model);
  $$("#resolutionGroup button").forEach((button) => {
    const value = button.dataset.value;
    const disabled = !supported.includes(value);
    button.disabled = disabled;
    button.classList.toggle("disabled", disabled);
    button.classList.toggle("active", state.resolution === value);
  });
}

function ensureResolutionSupported() {
  const model = resolveCurrentImageModel();
  if (supportsModelResolution(model, state.resolution)) return;
  const nextResolution = compatibleResolutionsForModel(model)[0] || "1K";
  state.resolution = nextResolution;
  syncChoiceGroupActive("#resolutionGroup", nextResolution);
}

function syncChoiceGroupActive(containerSelector, value) {
  $$(`${containerSelector} button`).forEach((button) => {
    button.classList.toggle("active", button.dataset.value === value);
  });
}

function updateImageModelUi() {
  const model = resolveCurrentImageModel();
  const info = getModelInfo(model);
  const supportedText = info?.supportText || "按 Grsai 文档/控制台为准";
  const disabled = !supportsModelResolution(model, state.resolution);
  updateApiState();
  const routeLabel = $("#routeLabel");
  if (routeLabel) {
    routeLabel.innerHTML = "";
    const routeIcon = document.createElement("img");
    routeIcon.className = "route-model-icon";
    routeIcon.src = iconPath(modelIconKey(model, state.config?.imageProvider || ""));
    routeIcon.alt = "";
    const routeText = document.createElement("span");
    routeText.textContent = disabled
      ? `${model} · 不支持 ${state.resolution} · ${supportedText}`
      : `${model} · ${state.resolution} · ${state.ratio}`;
    routeLabel.append(routeIcon, routeText);
  }
  const tier = imageModelTier(model);
  state.imageModelTier = normalizeImageModelTier(state.imageModelTier || tier);
  if (els.imageModelTierBadge) {
    els.imageModelTierBadge.textContent = tier === "advanced" ? "高级模型" : "普通模型";
    els.imageModelTierBadge.classList.toggle("advanced", tier === "advanced");
    els.imageModelTierBadge.closest(".image-model-card")?.classList.toggle("advanced-model-card", tier === "advanced");
  }
  if (els.currentImageModelName) {
    els.currentImageModelName.innerHTML = "";
    const icon = document.createElement("img");
    icon.className = "current-model-icon";
    icon.src = iconPath(modelIconKey(model, state.config?.imageProvider || ""));
    icon.alt = "";
    const text = document.createElement("span");
    text.textContent = `${model} · ${state.resolution} · ${state.ratio}`;
    els.currentImageModelName.append(icon, text);
  }
  if (els.currentImageModelDesc) {
    els.currentImageModelDesc.textContent = imageModelStrength(model);
  }
  if (els.modelRouteHint) {
    els.modelRouteHint.textContent = disabled
      ? `当前模型不支持 ${state.resolution}，请切换模型或分辨率。`
      : `当前生图模型：${model}，目标画幅 ${state.ratio}，接口将按像素尺寸强制输出。`;
  }
  $$("#modelTierTabs button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tier === state.imageModelTier);
  });
  syncProviderModelIcons();
}

function populateModelRouteSelect() {
  const select = $("#modelRoute");
  if (!select) return;
  const selected = normalizeImageModelRoute(state.imageModelRoute || state.config?.imageModelRoute);
  const previousValue = select.value;
  const tier = normalizeImageModelTier(state.imageModelTier);
  const effectiveSelected = selected !== "auto" && imageModelTier(selected) !== tier ? "auto" : selected;
  if (state.imageModelRoute !== effectiveSelected) {
    state.imageModelRoute = effectiveSelected;
  }
  select.innerHTML = "";
  const autoModel = resolveCurrentImageModel();
  const auto = document.createElement("option");
  auto.value = "auto";
  auto.textContent = `自动：${autoModel}`;
  select.appendChild(auto);
  for (const model of GRSAI_IMAGE_MODELS.filter((item) => imageModelTier(item) === tier)) {
    const info = getModelInfo(model);
    const option = document.createElement("option");
    option.value = model;
    option.textContent = `${model} · ${info?.supportText || "官方直连"}`;
    select.appendChild(option);
  }
  if (effectiveSelected !== "auto" && [...select.options].some((option) => option.value === effectiveSelected)) {
    select.value = effectiveSelected;
  } else {
    select.value = "auto";
  }
  if (previousValue !== select.value) {
    select.title = select.value === "auto" ? "自动选择当前等级模型" : select.value;
  }
}

function syncImageModelRouteUi() {
  ensureResolutionSupported();
  syncResolutionButtons();
  populateModelRouteSelect();
  updateImageModelUi();
}

function getProductUploadStatusText() {
  const uploaded = state.images.length;
  const remaining = Math.max(0, PRODUCT_IMAGE_LIMIT - uploaded);
  return `已上传 ${uploaded} 张，还可以上传 ${remaining} 张图片；10M 以内，最多 ${PRODUCT_IMAGE_LIMIT} 张，支持拖拽上传`;
}

function updateProductUploadStatus() {
  const uploaded = state.images.length;
  const remaining = Math.max(0, PRODUCT_IMAGE_LIMIT - uploaded);
  if (els.productUploadMain) els.productUploadMain.textContent = "请上传产品图片";
  if (els.productUploadHint) els.productUploadHint.textContent = getProductUploadStatusText();
  if (els.titleUploadHint) els.titleUploadHint.textContent = getProductUploadStatusText();
  els.dropzone?.classList.toggle("is-full", remaining === 0);
  els.titleDropzone?.classList.toggle("is-full", remaining === 0);
}

function getCutoutSelectedFile() {
  return els.cutoutFileInput?.files?.[0] || null;
}

function setCutoutButtonContent(text) {
  if (!els.cutoutActionBtn) return;
  els.cutoutActionBtn.textContent = text;
}

function setCutoutGenerating(isGenerating) {
  state.cutoutGenerating = isGenerating;
  if (!els.cutoutActionBtn) return;
  els.cutoutActionBtn.disabled = isGenerating;
  els.cutoutDropzone?.classList.toggle("disabled", isGenerating);
  els.cutoutDropzone?.classList.toggle("is-generating", isGenerating);
  els.cutoutActionBtn.classList.toggle("is-loading", isGenerating);
  if (isGenerating) {
    els.cutoutActionBtn.innerHTML = '<span class="button-spinner" aria-hidden="true"></span><span>正在制作白底图，请稍后</span>';
    els.cutoutHint.textContent = "任务已提交，请保持软件打开。";
  }
}

function updateCutoutSelection(file) {
  if (!file) {
    resetCutoutSelection();
    return;
  }
  els.cutoutDropzone?.classList.add("has-file");
  setCutoutButtonContent("确认制作白底图");
  els.cutoutHint.textContent = `已选择：${file.name}。点击确认后开始制作。`;
}

function resetCutoutSelection() {
  if (els.cutoutFileInput) els.cutoutFileInput.value = "";
  els.cutoutDropzone?.classList.remove("has-file", "is-generating", "disabled");
  els.cutoutActionBtn?.classList.remove("is-loading");
  if (els.cutoutActionBtn) {
    els.cutoutActionBtn.disabled = false;
    setCutoutButtonContent("白底图制作");
  }
  if (els.cutoutHint) els.cutoutHint.textContent = CUTOUT_DEFAULT_HINT;
}

function updateBrandSummary() {
  const region = state.brand.region || "US";
  const language = state.brand.language || "English";
  const platform = state.brand.platform || "Amazon";
  els.brandSummary.textContent = `${region} / ${language} / ${platform}`;
}

function updateAPlusSizeOptions(platform) {
  const options = A_PLUS_OPTIONS[normalizePlatformKey(platform)] || A_PLUS_OPTIONS.default;
  els.aPlusSize.innerHTML = "";
  for (const option of options) {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    els.aPlusSize.appendChild(element);
  }

  if (!options.some((option) => option.value === state.aPlusSize)) {
    state.aPlusSize = options[0].value;
  }
  els.aPlusSize.value = state.aPlusSize;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function imageUrlToDataUrl(url) {
  const value = String(url || "").trim();
  if (!value || value.startsWith("data:image/")) return value;
  const response = await fetch(value);
  if (!response.ok) throw new Error(`读取图片失败：${response.status}`);
  const blob = await response.blob();
  return fileToDataUrl(blob);
}

async function addFiles(files) {
  const remaining = Math.max(0, PRODUCT_IMAGE_LIMIT - state.images.length);
  const accepted = Array.from(files).filter((file) => file.type.startsWith("image/")).slice(0, remaining);
  if (!accepted.length && files.length) {
    toast(`最多上传 ${PRODUCT_IMAGE_LIMIT} 张真实产品图。`, "error");
  }
  for (const file of accepted) {
    if (file.size > 10 * 1024 * 1024) {
      toast(`${file.name} 超过 10M，已跳过。`, "error");
      continue;
    }
    const dataUrl = await fileToDataUrl(file);
    state.images.push({ name: file.name, dataUrl });
  }
  renderThumbs();
}

async function addImageUrlToProductImages(url, name = `white-background-${Date.now()}.png`) {
  if (state.images.length >= PRODUCT_IMAGE_LIMIT) {
    toast(`最多上传 ${PRODUCT_IMAGE_LIMIT} 张真实产品图。`, "error");
    return false;
  }
  let dataUrl = url;
  if (!String(url || "").startsWith("data:image/")) {
    try {
      dataUrl = await imageUrlToDataUrl(url);
    } catch {
      dataUrl = url;
    }
  }
  state.images.push({ name, dataUrl });
  renderThumbs();
  return true;
}

function renderThumbs() {
  els.thumbs.innerHTML = "";
  for (const [index, image] of state.images.entries()) {
    const item = document.createElement("div");
    item.className = "thumb";
    item.innerHTML = `
      <img src="${image.dataUrl}" alt="">
      <button title="移除" data-index="${index}">×</button>
    `;
    els.thumbs.appendChild(item);
    item.querySelector("img")?.addEventListener("click", () => {
      openImageViewer(image.dataUrl, image.name || `产品图 ${index + 1}`);
    });
  }

  els.thumbs.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.images.splice(Number(button.dataset.index), 1);
      renderThumbs();
    });
  });

  updateProductUploadStatus();
  renderTitleThumbs();
}

function renderTitleThumbs() {
  if (!els.titleThumbs) return;
  els.titleThumbs.innerHTML = "";
  for (const [index, image] of state.images.entries()) {
    const item = document.createElement("div");
    item.className = "thumb";
    item.innerHTML = `
      <img src="${image.dataUrl}" alt="">
      <button title="移除" data-index="${index}">×</button>
    `;
    els.titleThumbs.appendChild(item);
    item.querySelector("img")?.addEventListener("click", () => {
      openImageViewer(image.dataUrl, image.name || `产品图 ${index + 1}`);
    });
  }

  els.titleThumbs.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.images.splice(Number(button.dataset.index), 1);
      renderThumbs();
    });
  });
}

function extractImageFilesFromDataTransfer(dataTransfer) {
  const files = Array.from(dataTransfer?.files || []).filter((file) => file.type.startsWith("image/"));
  if (files.length) return files;

  const items = Array.from(dataTransfer?.items || []);
  return items
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter(Boolean);
}

async function handleProductImageDrop(event) {
  event.preventDefault();
  els.dropzone.classList.remove("dragging");
  const files = extractImageFilesFromDataTransfer(event.dataTransfer);
  if (!files.length) {
    toast("未识别到图片文件。微信图片请先拖出为文件，或复制到本地后再拖入。", "error");
    return;
  }
  await addFiles(files);
}

async function handleTitleImageDrop(event) {
  event.preventDefault();
  els.titleDropzone.classList.remove("dragging");
  const files = extractImageFilesFromDataTransfer(event.dataTransfer);
  if (!files.length) {
    toast("未识别到图片文件。微信图片请先拖出为文件，或复制到本地后再拖入。", "error");
    return;
  }
  await addFiles(files);
}

async function handleCutoutImageFiles(files) {
  const file = Array.from(files || []).find((item) => item.type?.startsWith("image/"));
  if (!file) {
    toast("未识别到图片文件。微信图片请先拖出为文件，或复制到本地后再拖入。", "error");
    return;
  }
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  els.cutoutFileInput.files = dataTransfer.files;
  updateCutoutSelection(file);
}

async function handleCutoutImageDrop(event) {
  event.preventDefault();
  els.cutoutDropzone.classList.remove("dragging");
  const files = extractImageFilesFromDataTransfer(event.dataTransfer);
  await handleCutoutImageFiles(files);
}

function getImageKindPlans() {
  const plans = $$('input[name="imageKind"]:checked').map((input) => ({
    kind: input.value,
    count: Math.max(0, Number(state.kindCounts[input.value] || 0))
  }));
  const seen = new Set();
  return plans.filter((item) => {
    if (item.count <= 0) return false;
    if (seen.has(item.kind)) return false;
    seen.add(item.kind);
    return true;
  });
}

function updateTotalCount() {
  const total = getImageKindPlans().reduce((sum, item) => sum + item.count, 0);
  els.totalCountValue.textContent = String(total);
  els.aPlusOptions.classList.toggle("hidden", !getImageKindPlans().some((item) => item.kind === "高级A+"));
  updateImageModelUi();
}

function productModeCopy(mode = "single") {
  const copies = {
    single: {
      title: "填写单品信息",
      caption: "写清名称和用途，AI 会结合图片自动补全卖点和分镜。",
      nameLabel: "产品名称",
      namePlaceholder: "请填写产品名称",
      infoLabel: "产品描述",
      infoPlaceholder: "请填写有关产品的使用方式或者产品的卖点",
      hint: "单品：围绕一个产品和真实使用关系生成套图。",
      tips: "建议补充：使用场景、适配对象、核心卖点、销售地区或发布平台。"
    },
    bundle: {
      title: "填写组合装信息",
      caption: "说明每个组件的作用和搭配关系，避免 AI 把套装拆错。",
      nameLabel: "组合装产品名称",
      namePlaceholder: "请填写组合装产品名称",
      infoLabel: "组合装说明",
      infoPlaceholder: "请填写组合内容、各组件用途、数量/规格、搭配关系和主卖点",
      hint: "组合装：强调组件关系、完整购买单位和搭配价值。",
      tips: "建议补充：组件清单、各组件数量、适配对象、主件/配件关系、不能被替换或遗漏的细节。"
    },
    multipack: {
      title: "填写多PCS装信息",
      caption: "说明数量、包装方式和消耗场景，让套图体现整包价值。",
      nameLabel: "多PCS装产品名称",
      namePlaceholder: "请填写多PCS装产品名称",
      infoLabel: "数量与用途说明",
      infoPlaceholder: "请填写件数、包装方式、消耗/补充场景、适用对象和核心卖点；数量不确定可写“以图片为准”",
      hint: "多PCS装：突出可数排列、整包价值、补充周期或高频使用。",
      tips: "建议补充：明确件数、单次使用方式、整包/开包展示、堆叠或排列要求、是否允许显示数量文字。"
    }
  };
  return copies[mode] || copies.single;
}

function buildProductInfoText() {
  const mode = state.productPackageMode || "single";
  const copy = productModeCopy(mode);
  const name = els.productName?.value.trim() || "";
  const details = els.productInfo?.value.trim() || "";
  const modeLabel = mode === "bundle" ? "组合装" : mode === "multipack" ? "多PCS装" : "单品";
  return [
    `产品形态：${modeLabel}`,
    name ? `${copy.nameLabel}：${name}` : "",
    details ? `${copy.infoLabel}：${details}` : ""
  ].filter(Boolean).join("\n");
}

function currentProductFactsSignature() {
  return JSON.stringify({
    productPackageMode: state.productPackageMode || "single",
    productName: (els.productName?.value || "").trim(),
    productInfo: (els.productInfo?.value || "").trim()
  });
}

function hasProductInfoInput() {
  return Boolean((els.productName?.value || "").trim() || (els.productInfo?.value || "").trim());
}

function chineseDisplayText(value) {
  const text = String(value || "").trim();
  return hasChineseCharacters(text) ? text : "";
}

function chineseDisplayList(values) {
  const source = Array.isArray(values)
    ? values
    : String(values || "").split(/\r?\n/);
  return source
    .map((item) => String(item || "").trim())
    .filter((item) => item && hasChineseCharacters(item));
}

function composeEditableProductDescription(analysis = {}) {
  const sellingPoints = chineseDisplayList(analysis.selling_points_zh);
  const detailFocus = chineseDisplayList(analysis.detail_focus_areas_zh);
  const risks = chineseDisplayList(analysis.misjudgment_risks_zh);
  const partFunctions = chineseDisplayList(analysis.part_function_map_zh);
  const forbiddenErrors = chineseDisplayList(analysis.forbidden_use_errors_zh);
  const regional = analysis.regional_use_context || {};
  const lines = [
    chineseDisplayText(analysis.product_summary_zh) ? `AI识别摘要：${chineseDisplayText(analysis.product_summary_zh)}` : "",
    chineseDisplayText(regional.real_use_summary_zh) ? `真实用途：${chineseDisplayText(regional.real_use_summary_zh)}` : "",
    chineseDisplayText(analysis.correct_use_method_zh) ? `正确使用方式：${chineseDisplayText(analysis.correct_use_method_zh)}` : "",
    sellingPoints.length ? `核心卖点：${sellingPoints.join("；")}` : "",
    partFunctions.length ? `部件功能：${partFunctions.join("；")}` : "",
    detailFocus.length ? `需要保留的细节：${detailFocus.join("；")}` : "",
    risks.length ? `容易误判的地方：${risks.join("；")}` : "",
    forbiddenErrors.length ? `禁止错误用法：${forbiddenErrors.join("；")}` : ""
  ].filter(Boolean);
  return lines.join("\n");
}

function shouldReplaceProductDescription() {
  const current = els.productInfo?.value.trim() || "";
  return !current || Boolean(state.autoFilledProductInfo && current === state.autoFilledProductInfo);
}

function syncEditableProductDescriptionFromAnalysis(analysis = {}) {
  const description = composeEditableProductDescription(analysis);
  if (!description || !els.productInfo || !shouldReplaceProductDescription()) return false;
  els.productInfo.value = description.slice(0, Number(els.productInfo.maxLength || 2500));
  state.autoFilledProductInfo = els.productInfo.value.trim();
  state.productFactsReviewPending = true;
  updateProductInfoCharCount();
  if (els.productModeTips) {
    els.productModeTips.textContent = "AI 已补全产品描述。请先复核左侧信息；如有不准确，直接修改后再次点击 AI 自动分析。";
  }
  return true;
}

function updateProductInfoCharCount() {
  const total = (els.productName?.value.length || 0) + (els.productInfo?.value.length || 0);
  if (els.charCount) els.charCount.textContent = `${total}/2700`;
}

function syncProductModeUi() {
  const copy = productModeCopy(state.productPackageMode);
  if (els.productBriefTitle) els.productBriefTitle.textContent = copy.title;
  if (els.productBriefCaption) els.productBriefCaption.textContent = copy.caption;
  if (els.productNameLabel) els.productNameLabel.textContent = copy.nameLabel;
  if (els.productName) els.productName.placeholder = copy.namePlaceholder;
  if (els.productInfoLabel) els.productInfoLabel.textContent = copy.infoLabel;
  if (els.productInfo) els.productInfo.placeholder = copy.infoPlaceholder;
  if (els.packageModeHint) els.packageModeHint.textContent = copy.hint;
  if (els.productModeTips) els.productModeTips.textContent = copy.tips;
  updateProductInfoCharCount();
}

function markProductFactsEdited() {
  if (state.lastAnalyzedProductFacts && currentProductFactsSignature() !== state.lastAnalyzedProductFacts) {
    state.productFactsReviewPending = true;
    els.promptBox.value = "";
    renderSuitePlan(null);
    renderPromptPlan([]);
    if (els.productModeTips) {
      els.productModeTips.textContent = "您已修改产品事实信息。为了避免旧提示词继续出图，请重新点击 AI 自动分析。";
    }
    if (els.statusLine) {
      els.statusLine.textContent = "产品描述已修改，请先重新 AI 自动分析";
    }
  }
}

function buildPayload() {
  return {
    productInfo: buildProductInfoText(),
    productPackageMode: state.productPackageMode,
    images: state.images.slice(0, 6).map((image) => image.dataUrl),
    brand: { ...state.brand },
    resolution: state.resolution,
    ratio: state.ratio,
    imageModelRoute: resolveCurrentImageModel(),
    referenceStrategy: state.referenceStrategy,
    imageKinds: getImageKindPlans(),
    aPlusSize: state.aPlusSize
  };
}

function countTitleCharacters(value) {
  return Array.from(String(value || "")).length;
}

function dedupeStrings(values, limit = 8) {
  const seen = new Set();
  const result = [];
  const source = Array.isArray(values) ? values : [values];
  for (const value of source) {
    const text = String(value || "").trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length >= limit) break;
  }
  return result;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function hasChineseCharacters(text) {
  return /[\u4e00-\u9fff]/.test(String(text || ""));
}

function hasLatinLetters(text) {
  return /[A-Za-z]/.test(String(text || ""));
}

function splitDualLanguageTitle(text) {
  const normalized = String(text || "").trim();
  if (!normalized) return { titleZh: "", titleEn: "" };

  const lines = normalized
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length >= 2) {
    return { titleZh: lines[0], titleEn: lines[1] };
  }

  const slashParts = normalized
    .split(/\s+\/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (slashParts.length >= 2) {
    return { titleZh: slashParts[0], titleEn: slashParts.slice(1).join(" ") };
  }

  for (const separator of [" ｜ ", " | ", " - ", " — ", "\t"]) {
    const parts = normalized
      .split(separator)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return { titleZh: parts[0], titleEn: parts.slice(1).join(" ") };
    }
  }

  return { titleZh: normalized, titleEn: "" };
}

function normalizeTitleTrendSignals(value) {
  const data = value && typeof value === "object" ? value : {};
  const regions = Array.isArray(data.regions)
    ? data.regions.map((region) => normalizeTitleTrendSignals(region))
    : [];
  const flattened = regions.reduce((acc, region) => {
    acc.seed_queries.push(...region.seed_queries);
    acc.autocomplete_suggestions.push(...region.autocomplete_suggestions);
    acc.related_queries.push(...region.related_queries);
    acc.rising_queries.push(...region.rising_queries);
    acc.source_urls.push(...region.source_urls);
    return acc;
  }, {
    seed_queries: [],
    autocomplete_suggestions: [],
    related_queries: [],
    rising_queries: [],
    source_urls: []
  });
  return {
    market: String(data.market || data.region_label || data.regionLabel || "").trim(),
    geo: String(data.geo || data.region || "").trim(),
    language: String(data.language || data.hl || "").trim(),
    timeframe: String(data.timeframe || "").trim(),
    source: dedupeStrings(data.source || [], 8),
    source_urls: dedupeStrings([...(data.source_urls || data.sourceUrls || []), ...flattened.source_urls], 12),
    seed_queries: dedupeStrings([...(data.seed_queries || data.seedQueries || []), ...flattened.seed_queries], 12),
    autocomplete_suggestions: dedupeStrings([...(data.autocomplete_suggestions || data.autocompleteSuggestions || []), ...flattened.autocomplete_suggestions], 16),
    related_queries: dedupeStrings([...(data.related_queries || data.relatedQueries || []), ...flattened.related_queries], 16),
    rising_queries: dedupeStrings([...(data.rising_queries || data.risingQueries || []), ...flattened.rising_queries], 16),
    regions
  };
}

function findTitleBannedTerms(text) {
  const source = String(text || "");
  const patterns = [
    { label: "waterproof", pattern: /water\s*proof/i },
    { label: "oilproof", pattern: /oil\s*proof/i },
    { label: "fireproof", pattern: /fire\s*proof/i },
    { label: "protection", pattern: /\bprotection\b/i },
    { label: "safe", pattern: /\bsafe(?:ty)?\b/i },
    { label: "high-temp", pattern: /high[-\s]?temp(?:erature)?/i },
    { label: "low-temp", pattern: /low[-\s]?temp(?:erature)?/i },
    { label: "certified", pattern: /certif(?:ied|ication)/i },
    { label: "eco-friendly", pattern: /eco[-\s]?friendly/i },
    { label: "medical", pattern: /\bmedical\b/i },
    { label: "treatment", pattern: /\btreatment\b/i },
    { label: "baby", pattern: /\bbaby\b/i },
    { label: "infant", pattern: /\binfant\b/i },
    { label: "minor", pattern: /\bminor\b/i },
    { label: "mother-baby", pattern: /mother[-\s]?baby/i },
    { label: "best choice", pattern: /best choice/i },
    { label: "assistant", pattern: /\bassistant\b/i },
    { label: "help", pattern: /\bhelp(?:er|ers|ing|ed)?\b/i },
    { label: "free from", pattern: /free\s+from/i },
    { label: "promo", pattern: /\b(?:promotion|promo|sale|discount|deal|offer|coupon|hot sale|best seller|bestseller|free shipping|limited time|must-have|essential|best choice|best seller)\b/i },
    { label: "anti-theft", pattern: /anti[-\s]?theft/i },
    { label: "anti-scald", pattern: /anti[-\s]?scald/i },
    { label: "BPA", pattern: /\bBPA\b/i },
    { label: "防水", pattern: /防水/ },
    { label: "防油", pattern: /防油/ },
    { label: "防火", pattern: /防火/ },
    { label: "防护", pattern: /防护/ },
    { label: "安全", pattern: /安全/ },
    { label: "环保", pattern: /环保/ },
    { label: "医疗", pattern: /医疗/ },
    { label: "治疗", pattern: /治疗/ },
    { label: "婴幼儿", pattern: /婴幼儿/ },
    { label: "未成年人", pattern: /未成年人/ },
    { label: "母婴", pattern: /母婴/ },
    { label: "最佳选择", pattern: /最佳选择/ },
    { label: "助手", pattern: /助手/ },
    { label: "帮助", pattern: /帮助/ },
    { label: "无X成分", pattern: /无[^，,。.!?；;]{0,12}成分/ }
  ];

  return patterns.filter((item) => item.pattern.test(source)).map((item) => item.label);
}

function stringifyTitleStructure(structure) {
  const value = structure && typeof structure === "object" ? structure : {};
  const parts = [];
  if (value.core_keyword) parts.push(`核心词：${value.core_keyword}`);
  if (value.material) parts.push(`材质：${value.material}`);
  if (Array.isArray(value.eu_hot_terms) && value.eu_hot_terms.length) parts.push(`欧洲热搜词：${value.eu_hot_terms.join(" / ")}`);
  if (Array.isArray(value.us_hot_terms) && value.us_hot_terms.length) parts.push(`美国热搜词：${value.us_hot_terms.join(" / ")}`);
  if (Array.isArray(value.search_keywords) && value.search_keywords.length) parts.push(`高搜索词：${value.search_keywords.join(" / ")}`);
  if (Array.isArray(value.attributes) && value.attributes.length) parts.push(`属性：${value.attributes.join(" / ")}`);
  if (Array.isArray(value.compatibility) && value.compatibility.length) parts.push(`适用/兼容：${value.compatibility.join(" / ")}`);
  if (Array.isArray(value.use_cases) && value.use_cases.length) parts.push(`适用场景：${value.use_cases.join(" / ")}`);
  if (value.scenario) parts.push(`场景：${value.scenario}`);
  if (Array.isArray(value.long_tail_terms) && value.long_tail_terms.length) parts.push(`长尾词：${value.long_tail_terms.join(" / ")}`);
  if (Array.isArray(value.conversion_terms) && value.conversion_terms.length) parts.push(`高转化词：${value.conversion_terms.join(" / ")}`);
  if (Array.isArray(value.operator_keywords_used) && value.operator_keywords_used.length) {
    parts.push(`运营词：${value.operator_keywords_used.join(" / ")}`);
  }
  if (value.title_formula) parts.push(`标题公式：${value.title_formula}`);
  if (value.compliance_focus) parts.push(`合规重点：${value.compliance_focus}`);
  return parts.join("\n");
}

function stringifyTitleTrendSignals(signals, used = []) {
  const value = normalizeTitleTrendSignals(signals);
  const parts = [];
  if (value.geo || value.timeframe) parts.push(`地区 / 周期：${value.geo || "未指定"} / ${value.timeframe || "today 12-m"}`);
  if (value.regions.length) {
    value.regions.forEach((region) => {
      const label = region.market || region.geo || "地区";
      const regionTerms = dedupeStrings([...region.autocomplete_suggestions, ...region.related_queries], 8);
      if (regionTerms.length) parts.push(`${label} 热搜词：${regionTerms.join("、")}`);
    });
  }
  if (value.seed_queries.length) parts.push(`种子词：${value.seed_queries.join("、")}`);
  if (value.autocomplete_suggestions.length) parts.push(`趋势建议：${value.autocomplete_suggestions.join("、")}`);
  if (value.related_queries.length) parts.push(`相关词：${value.related_queries.join("、")}`);
  if (value.rising_queries.length) parts.push(`上升词：${value.rising_queries.join("、")}`);
  if (value.source_urls.length) parts.push(`信息来源：${value.source_urls.join("\n")}`);
  const usedList = dedupeStrings(used, 8);
  if (usedList.length) parts.push(`实际采用：${usedList.join("、")}`);
  return parts.join("\n");
}

function syncTitleChoiceButtons() {
  els.titlePlatformGroup?.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.value === state.title.platform);
  });
  els.titlePackageMode?.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.value === state.title.productPackageMode);
  });
}

function syncTitleInputsFromImage() {
  if (!hasProductInfoInput()) return;
  const imageProductInfo = buildProductInfoText();
  if (!imageProductInfo) return;
  if (!els.titleProductName.value.trim()) {
    const directName = els.productName?.value.trim() || "";
    const firstLine = directName || imageProductInfo.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || "";
    els.titleProductName.value = firstLine.replace(/^.*?：/, "").slice(0, 200);
  }
  if (!els.titleProductInfo.value.trim()) {
    els.titleProductInfo.value = imageProductInfo;
  }
}

function buildTitleProductInfo() {
  const name = els.titleProductName.value.trim();
  const details = els.titleProductInfo.value.trim();
  if (name && details) {
    return `产品名称：${name}\n补充信息：${details}`;
  }
  return name || details || (hasProductInfoInput() ? buildProductInfoText() : "");
}

function setRoute(route) {
  const nextRoute = route === "title" || route === "video" ? route : "image";
  state.route = nextRoute;
  localStorage.setItem(ACTIVE_ROUTE_STORAGE_KEY, nextRoute);

  els.sideNavItems.forEach((button) => {
    button.classList.toggle("active", button.dataset.route === nextRoute);
  });
  els.imagePage.classList.toggle("hidden", nextRoute !== "image");
  els.titlePage.classList.toggle("hidden", nextRoute !== "title");
  els.videoPage.classList.toggle("hidden", nextRoute !== "video");

  if (nextRoute === "title") {
    syncTitleInputsFromImage();
  }
}

function buildTitlePayload() {
  const productInfo = buildTitleProductInfo();
  const operatorKeywords = els.titleOperatorKeywords.value.trim();
  return {
    platform: normalizeTitlePlatform(state.title.platform),
    productPackageMode: state.title.productPackageMode,
    productInfo,
    operatorKeywords,
    brandName: "",
    brand: {
      ...state.brand,
      platform: state.title.platform
    },
    analysis: state.analysis || null,
    images: state.images.slice(0, 2).map((image) => image.dataUrl)
  };
}

function normalizeTitleVariants(result) {
  if (!result) return [];
  const variants = Array.isArray(result.title_variants) && result.title_variants.length
    ? result.title_variants
    : [{
      optimized_title: result.optimized_title || "",
      title_zh: result.title_zh || "",
      title_en: result.title_en || "",
      title_length: result.title_length,
      title_length_limit: result.title_length_limit,
      structure_breakdown: result.structure_breakdown,
      trend_keywords_used: result.trend_keywords_used,
      trend_keywords_by_region: result.trend_keywords_by_region,
      source_notes: result.source_notes,
      summary: result.summary,
      compliance_notes: result.compliance_notes,
      warnings: result.warnings
    }];
  return variants.filter((variant) => variant && (variant.optimized_title || variant.title_zh || variant.title_en));
}

function titleTextForCopy(variant, result, language = "all") {
  if (!variant) return "";
  if (language === "zh") return String(variant.title_zh || "").trim();
  if (language === "en") return String(variant.title_en || (!hasChineseCharacters(variant.optimized_title) ? variant.optimized_title : "") || "").trim();
  if (variant.optimized_title) return String(variant.optimized_title).trim();
  if (result?.platform === "Temu") return [variant.title_zh, variant.title_en].filter(Boolean).join(" / ");
  return String(variant.title_en || "").trim();
}

function titlePairTextForVariant(variant, result, index) {
  const label = `标题 ${index + 1}`;
  if (result?.platform === "Temu") {
    return [
      `${label}`,
      `中文：${variant.title_zh || "未返回"}`,
      `英文：${variant.title_en || "未返回"}`
    ].join("\n");
  }
  return [`${label}`, `英文：${variant.title_en || variant.optimized_title || "未返回"}`].join("\n");
}

async function copyTextToClipboard(text, successMessage = "已复制") {
  const value = String(text || "").trim();
  if (!value) {
    toast("没有可复制的内容。", "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(value);
    toast(successMessage);
  } catch (error) {
    toast(error.message, "error");
  }
}

function renderTitleVariantCards(result) {
  const variants = normalizeTitleVariants(result);
  els.titleResultMain.innerHTML = "";
  els.titleResultMain.classList.toggle("empty", !variants.length);
  if (!variants.length) {
    els.titleResultMain.textContent = "生成后显示 3 条标题方案";
    return;
  }

  const recommendedIndex = Math.max(1, Math.min(variants.length, Number(result.recommended_index || 1))) - 1;
  variants.forEach((variant, index) => {
    const card = document.createElement("article");
    card.className = `title-variant-card${index === recommendedIndex ? " recommended" : ""}`;
    const limit = variant.title_length_limit || result.title_length_limit || (result.platform === "Temu" ? 250 : 200);
    const titleForLength = titleTextForCopy(variant, result, "all");
    const length = variant.title_length || countTitleCharacters(titleForLength);
    const zh = titleTextForCopy(variant, result, "zh");
    const en = titleTextForCopy(variant, result, "en");
    const sourceNotes = dedupeStrings([
      ...(variant.source_notes || []),
      ...((variant.trend_keywords_by_region?.Europe || []).map((term) => `Europe: ${term}`)),
      ...((variant.trend_keywords_by_region?.US || []).map((term) => `US: ${term}`))
    ], 8);

    card.innerHTML = `
      <div class="title-variant-card-head">
        <div>
          <strong>标题 ${index + 1}</strong>
          <small>${length}/${limit} 字符</small>
        </div>
        ${index === recommendedIndex ? `<span class="recommended-badge">最推荐</span>` : ""}
      </div>
      ${zh ? `
        <div class="title-language-block">
          <div>
            <label>中文</label>
            <p>${escapeHtml(zh)}</p>
          </div>
          <button type="button" class="secondary-button" data-copy-title="${index}" data-copy-lang="zh">复制中文</button>
        </div>
      ` : ""}
      ${en ? `
        <div class="title-language-block">
          <div>
            <label>English</label>
            <p>${escapeHtml(en)}</p>
          </div>
          <button type="button" class="secondary-button" data-copy-title="${index}" data-copy-lang="en">复制英文</button>
        </div>
      ` : ""}
      ${index === recommendedIndex && result.recommendation_reason ? `<p class="title-recommend-reason">推荐原因：${escapeHtml(result.recommendation_reason)}</p>` : ""}
      ${sourceNotes.length ? `<p class="title-source-note">来源线索：${escapeHtml(sourceNotes.join("；"))}</p>` : ""}
    `;
    els.titleResultMain.appendChild(card);
  });

  els.titleResultMain.querySelectorAll("[data-copy-title]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.copyTitle || 0);
      const lang = button.dataset.copyLang || "all";
      copyTextToClipboard(titleTextForCopy(variants[index], result, lang), lang === "zh" ? "中文标题已复制" : "英文标题已复制");
    });
  });
}

function renderTitleResult(result) {
  state.title.result = result || null;
  if (els.titleDetailsToggle) els.titleDetailsToggle.open = false;
  if (!result) {
    els.titleResultMain.innerHTML = "";
    els.titleResultMain.textContent = "生成后显示 3 条标题方案";
    els.titleResultMain.classList.add("empty");
    els.titleLength.textContent = "0 字符";
    els.titleStructureBox.textContent = "暂无结果";
    els.titleStructureBox.classList.add("empty");
    els.titlePairBox.textContent = "暂无结果";
    els.titlePairBox.classList.add("empty");
    els.titleTrendBox.textContent = "暂无结果";
    els.titleTrendBox.classList.add("empty");
    els.titleAlternatesBox.textContent = "暂无结果";
    els.titleAlternatesBox.classList.add("empty");
    els.titleComplianceBox.textContent = "暂无结果";
    els.titleComplianceBox.classList.add("empty");
    els.titleSummaryBox.textContent = "暂无结果";
    els.titleSummaryBox.classList.add("empty");
    els.titleWarningsBox.textContent = "暂无结果";
    els.titleWarningsBox.classList.add("empty");
    els.copyTitleBtn.disabled = true;
    return;
  }

  const limit = result.title_length_limit || (result.platform === "Temu" ? 250 : 200);
  renderTitleVariantCards(result);
  els.titleLength.textContent = `${result.title_length || countTitleCharacters(result.optimized_title || "")}/${limit} 字符`;
  const variants = normalizeTitleVariants(result);
  const recommendedIndex = Math.max(1, Math.min(variants.length || 1, Number(result.recommended_index || 1))) - 1;
  const recommendedVariant = variants[recommendedIndex] || variants[0] || result;

  const structureText = stringifyTitleStructure(recommendedVariant.structure_breakdown || result.structure_breakdown);
  els.titleStructureBox.textContent = structureText || "暂无结果";
  els.titleStructureBox.classList.toggle("empty", !structureText);

  const pairText = variants.length
    ? variants.map((variant, index) => titlePairTextForVariant(variant, result, index)).join("\n\n")
    : "";
  els.titlePairBox.textContent = pairText;
  els.titlePairBox.classList.toggle("empty", !pairText);

  const trendText = stringifyTitleTrendSignals(result.trend_signals, recommendedVariant.trend_keywords_used || result.trend_keywords_used);
  els.titleTrendBox.textContent = trendText || "暂无结果";
  els.titleTrendBox.classList.toggle("empty", !trendText);

  const alternatesText = Array.isArray(result.alternate_titles) && result.alternate_titles.length
    ? result.alternate_titles.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : variants.length
      ? variants.map((variant, index) => `${index + 1}. ${titleTextForCopy(variant, result, "all")}`).join("\n")
      : "";
  els.titleAlternatesBox.textContent = alternatesText || "暂无结果";
  els.titleAlternatesBox.classList.toggle("empty", !alternatesText);

  const complianceText = Array.isArray(result.compliance_notes) && result.compliance_notes.length
    ? result.compliance_notes.join("\n")
    : "";
  els.titleComplianceBox.textContent = complianceText || "暂无结果";
  els.titleComplianceBox.classList.toggle("empty", !complianceText);

  const summaryText = [
    result.recommendation_reason ? `最推荐第 ${result.recommended_index || 1} 条：${result.recommendation_reason}` : "",
    result.title_strategy,
    result.summary
  ].filter(Boolean).join("\n");
  els.titleSummaryBox.textContent = summaryText || "暂无结果";
  els.titleSummaryBox.classList.toggle("empty", !summaryText);

  const warningsText = Array.isArray(result.warnings) && result.warnings.length
    ? result.warnings.join("\n")
    : "";
  els.titleWarningsBox.textContent = warningsText || "暂无结果";
  els.titleWarningsBox.classList.toggle("empty", !warningsText);

  els.copyTitleBtn.disabled = !titleTextForCopy(recommendedVariant, result, "all");
  els.titleStatusLine.textContent = `标题已生成，${limit} 字符上限已校验`;
}

async function copyTitleToClipboard() {
  const result = state.title.result;
  const variants = normalizeTitleVariants(result);
  const recommendedIndex = Math.max(1, Math.min(variants.length || 1, Number(result?.recommended_index || 1))) - 1;
  const title = titleTextForCopy(variants[recommendedIndex] || null, result, "all") || result?.optimized_title || "";
  if (!title) {
    toast("请先生成标题。", "error");
    return;
  }
  await copyTextToClipboard(title, "推荐标题已复制");
}

function translateTitleError(error) {
  let message = humanizeErrorMessage(error, "标题生成失败，请检查 API 配置后重试。");
  if (!message) return "标题生成失败，请检查 API 配置后重试。";
  if (/API 服务暂时不可用|API 服务响应超时|API 服务内部错误|API Key|访问权限|接口地址|请求过于频繁|无法连接|返回格式不正确/i.test(message)) {
    return message;
  }
  if (/Google Trends|搜索趋势词/i.test(message)) {
    return `${message}。这一步是标题优化的强制趋势词检索，不是 API Key 无效；请确认当前网络或代理可以访问 Google Trends 和 Google 搜索建议。`;
  }
  if (/原始错误|标题生成 API 调用失败|标题优化任务超时|标题优化目前只支持|模型返回内容|JSON/i.test(message)) {
    return message;
  }
  if (/api key|unauthorized|401/i.test(message)) {
    return "提示词模型 API Key 未填写、无效或没有权限，请先到设置里检查 API Key。";
  }
  if (/403/i.test(message)) {
    return "提示词模型接口没有访问权限，请检查 API Key、模型名或账号权限。";
  }
  if (/404/i.test(message)) {
    return "提示词模型接口地址未找到，请检查 API 地址或接口类型。";
  }
  if (/429/i.test(message)) {
    return "提示词模型调用过于频繁，请稍后再试。";
  }
  if (/5\d\d/i.test(message)) {
    return "提示词模型服务端返回错误，请稍后再试。";
  }
  if (/google trends|搜索趋势词|google search|suggestions|autocomplete/i.test(message)) {
    return `趋势词检索失败：${message}。请检查网络是否能访问 Google Trends/Google 搜索建议，或稍后重试。`;
  }
  if (/network|fetch failed|timeout|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(message)) {
    return `无法连接到提示词模型接口。请检查网络、API 地址、接口类型或代理设置。原始错误：${message}`;
  }
  if (/invalid model|model.*not found/i.test(message)) {
    return "当前填写的模型名不被接口支持，请检查是否为 gpt-5.4、gpt-5.5 或服务端支持的其他名称。";
  }
  return `标题生成失败：${message}`;
}

function setProgress(value, text) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  els.progressBox.classList.remove("hidden");
  els.progressBox.classList.remove("progress-failed", "progress-success");
  els.progressBox.classList.toggle("ai-thinking", safe < 100);
  els.progressFill.style.width = `${safe}%`;
  els.progressNumber.textContent = `${Math.round(safe)}%`;
  if (text) els.progressText.textContent = text;
}

function setProgressFailed(text = "任务失败") {
  els.progressBox.classList.remove("hidden", "ai-thinking", "progress-success");
  els.progressBox.classList.add("progress-failed");
  els.progressFill.style.width = "100%";
  els.progressNumber.textContent = "失败";
  els.progressText.textContent = text;
}

function setProgressSuccess(text = "任务完成") {
  els.progressBox.classList.remove("hidden", "ai-thinking", "progress-failed");
  els.progressBox.classList.add("progress-success");
  els.progressFill.style.width = "100%";
  els.progressNumber.textContent = "100%";
  els.progressText.textContent = text;
}

function shortErrorMessage(error, fallback = "任务失败") {
  const message = humanizeErrorMessage(error, fallback).replace(/\s+/g, " ").trim();
  if (!message) return fallback;
  return message.length > 90 ? `${message.slice(0, 90)}...` : message;
}

function showAnalysis(analysis) {
  state.analysis = analysis;
  const palette = analysis.brand_palette || {};
  const regionalUse = analysis.regional_use_context || {};
  const fontStyle = analysis.brand_font_style || {};
  const summaryParts = [
    chineseDisplayText(analysis.product_summary_zh) || "",
    chineseDisplayText(regionalUse.real_use_summary_zh)
      ? `\n地区用途推断：${regionalUse.target_region || state.brand.region} / ${regionalUse.marketplace || state.brand.platform}；${chineseDisplayText(regionalUse.real_use_summary_zh)}`
      : "",
    palette.primary_color
      ? `\n智能色板：主色 ${palette.primary_color}；副色 ${palette.secondary_color || ""}；强调色 ${palette.accent_color || ""}；背景 ${palette.background_color || ""}`
      : "",
    chineseDisplayText(palette.palette_reason_zh) ? `\n色板理由：${chineseDisplayText(palette.palette_reason_zh)}` : "",
    chineseDisplayText(fontStyle.name_zh) ? `\n字体策略：${chineseDisplayText(fontStyle.name_zh)}` : "",
    chineseDisplayText(regionalUse.assumptions_zh) ? `\n用途假设：${chineseDisplayText(regionalUse.assumptions_zh)}` : ""
  ].filter(Boolean);
  els.summaryBox.value = summaryParts.join("\n");
  els.sellingPointsBox.value = chineseDisplayList(analysis.selling_points_zh).join("\n");
  els.promptBox.value = analysis.final_prompt_en || "";

  const warning = Array.isArray(analysis.warnings) && analysis.warnings.length ? `；${analysis.warnings[0]}` : "";
  els.statusLine.textContent = `产品已自动识别，提示词已生成${warning}`;
  const filledEditableBrief = syncEditableProductDescriptionFromAnalysis(analysis);
  state.lastAnalyzedProductFacts = currentProductFactsSignature();
  state.productFactsReviewPending = false;
  els.statusLine.textContent = filledEditableBrief
    ? "AI 已补全左侧产品描述，请复核后再生成；如修改过，请再次点击 AI 自动分析"
    : "产品已按左侧确认信息重新分析，提示词已生成";
}

async function analyze() {
  const payload = buildPayload();
  if (!hasProductInfoInput() && payload.images.length === 0) {
    toast("请上传商品图或填写商品信息。", "error");
    return false;
  }
  payload.promptConfig = {
    promptProvider: state.config?.promptProvider || "custom",
    promptBaseUrl: state.config?.promptBaseUrl || "",
    promptApiKey: state.config?.promptApiKey || "",
    promptModel: state.config?.promptModel || "",
    promptEndpoint: state.config?.promptEndpoint || "chat",
    promptProviderApiOptions: state.config?.promptProviderApiOptions || {},
    promptModelCapabilities: state.config?.promptModelCapabilities || {}
  };

  setBusy(true, "正在自动识别产品并生成提示词");
  setProgress(12, "AI 自动识别产品中");
  try {
    const analysis = await window.studio.analyzePrompt(payload);
    showAnalysis(analysis);
    setProgressSuccess("识别完成");
    setTimeout(() => els.progressBox.classList.add("hidden"), 700);
    return true;
  } catch (error) {
    setProgressFailed(`AI 识别失败：${shortErrorMessage(error)}`);
    showPromptFailureModal(error, "AI 自动识别产品失败", analyze);
    els.statusLine.textContent = "AI 自动识别产品失败";
    return false;
  } finally {
    setBusy(false);
  }
}

function openCutoutConfirm(result, originalUrl) {
  pendingCutoutResult = result;
  pendingCutoutOriginal = originalUrl;
  els.cutoutOriginalPreview.src = originalUrl;
  els.cutoutPreview.src = result.url;
  els.cutoutUploadConfirm.checked = true;
  els.cutoutConfirm.classList.remove("hidden");
}

function closeCutoutConfirm() {
  els.cutoutConfirm.classList.add("hidden");
  els.cutoutOriginalPreview.src = "";
  els.cutoutPreview.src = "";
  pendingCutoutResult = null;
  pendingCutoutOriginal = null;
}

async function saveImageUrl(url, name = `product-image-${Date.now()}.png`) {
  if (!url) return null;
  const filePath = await window.studio.saveImage({ url, name });
  if (filePath) toast(`已保存：${filePath}`);
  return filePath;
}

async function savePendingCutoutResult() {
  if (!pendingCutoutResult?.url) return;
  try {
    await saveImageUrl(pendingCutoutResult.url, `white-background-${Date.now()}.png`);
  } catch (error) {
    toast(error.message, "error");
  }
}

function openRepairResultModal(result) {
  pendingRepairResult = result || null;
  if (!pendingRepairResult?.url || !els.repairResultModal) return;
  els.repairResultPreview.src = pendingRepairResult.url;
  els.repairResultModal.classList.remove("hidden");
}

function closeRepairResultModal() {
  if (!els.repairResultModal) return;
  els.repairResultModal.classList.add("hidden");
  if (els.repairResultPreview) els.repairResultPreview.src = "";
  pendingRepairResult = null;
}

async function savePendingRepairResult() {
  if (!pendingRepairResult?.url) return;
  try {
    await saveImageUrl(pendingRepairResult.url, `repaired-image-${Date.now()}.png`);
  } catch (error) {
    toast(error.message, "error");
  }
}

async function generateWhiteBackground() {
  if (!ensureSupportedImageGeneration("白底图制作")) return;
  const file = els.cutoutFileInput.files?.[0];
  if (!file) {
    els.cutoutFileInput.click();
    return;
  }
  if (!file.type.startsWith("image/")) {
    toast("请选择图片文件。", "error");
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    toast(`${file.name} 超过 10M，无法生成白底图。`, "error");
    return;
  }

  setBusy(true, "正在生成白底产品图");
  setCutoutGenerating(true);
  try {
    const dataUrl = await fileToDataUrl(file);
    const result = await window.studio.generateWhiteBackground({
      productInfo: buildProductInfoText(),
      images: [dataUrl],
      resolution: state.resolution,
      imageModelRoute: resolveCurrentImageModel(),
      brand: { ...state.brand }
    });
    openCutoutConfirm(result, dataUrl);
  } catch (error) {
    toast(error.message, "error");
    els.statusLine.textContent = "白底图生成失败";
  } finally {
    setBusy(false);
    setCutoutGenerating(false);
    resetCutoutSelection();
  }
}

async function generateTitle() {
  const payload = buildTitlePayload();
  if (!payload.productInfo && payload.images.length === 0 && !payload.analysis) {
    showErrorModal("请先上传产品图、填写商品信息或先完成产品识别，再生成标题。", "缺少产品信息");
    return;
  }

  setBusy(true, "正在调用提示词模型生成标题");
  els.titleStatusLine.textContent = "正在检索趋势词并生成标题";
  try {
    const result = await window.studio.optimizeTitle(payload);
    renderTitleResult(result);
    toast("标题已生成");
  } catch (error) {
    const message = translateTitleError(error);
    showErrorModal(message, "标题生成失败");
    els.titleStatusLine.textContent = "标题生成失败";
  } finally {
    setBusy(false);
  }
}

function renderResults(results) {
  state.liveResults = Array.isArray(results) ? results.slice() : [];
  if (!results.length) {
    els.results.className = "results empty";
    els.results.innerHTML = emptyTigerMarkup("sleeping");
    selectResult(-1);
    return;
  }

  els.results.className = "results";
  els.results.innerHTML = "";

  for (const [index, result] of results.entries()) {
    const card = buildResultCard(result, index);
    els.results.appendChild(card);
  }
  selectResult(0);
}

function resetRepairCanvas() {
  state.repairHasMarks = false;
  repairDrawing = false;
  repairLastPoint = null;
  if (els.repairCanvas) {
    const context = els.repairCanvas.getContext("2d");
    context?.clearRect(0, 0, els.repairCanvas.width || 0, els.repairCanvas.height || 0);
  }
  if (els.clearRepairMarksBtn) els.clearRepairMarksBtn.disabled = true;
  if (els.repairSelectedBtn) els.repairSelectedBtn.disabled = !currentSelectedResult()?.url;
}

function setupRepairCanvasForResult(result) {
  if (!els.repairCanvasWrap || !els.repairCanvas || !els.repairCanvasImage) return;
  resetRepairCanvas();
  const hasImage = Boolean(result?.url);
  els.repairCanvasWrap.classList.toggle("empty", !hasImage);
  els.repairCanvasImage.classList.toggle("hidden", !hasImage);
  els.repairCanvas.classList.toggle("hidden", !hasImage);
  const placeholder = els.repairCanvasWrap.querySelector("span");
  if (placeholder) placeholder.textContent = hasImage ? "" : "选择结果图后，可在这里圈出变形位置";
  if (!hasImage) {
    els.repairCanvasImage.removeAttribute("src");
    return;
  }
  els.repairCanvasImage.onload = () => {
    const rect = els.repairCanvasWrap.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    els.repairCanvas.width = width;
    els.repairCanvas.height = height;
    resetRepairCanvas();
  };
  els.repairCanvasImage.src = result.url;
}

function repairPointFromEvent(event) {
  const rect = els.repairCanvas.getBoundingClientRect();
  const touch = event.touches?.[0] || event.changedTouches?.[0];
  const clientX = touch ? touch.clientX : event.clientX;
  const clientY = touch ? touch.clientY : event.clientY;
  return {
    x: Math.max(0, Math.min(rect.width, clientX - rect.left)),
    y: Math.max(0, Math.min(rect.height, clientY - rect.top))
  };
}

function drawRepairMark(point, previousPoint = null) {
  const context = els.repairCanvas?.getContext("2d");
  if (!context) return;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 16;
  context.strokeStyle = "rgba(255, 68, 92, 0.82)";
  context.fillStyle = "rgba(255, 68, 92, 0.22)";
  if (previousPoint) {
    context.beginPath();
    context.moveTo(previousPoint.x, previousPoint.y);
    context.lineTo(point.x, point.y);
    context.stroke();
  }
  context.beginPath();
  context.arc(point.x, point.y, 8, 0, Math.PI * 2);
  context.fill();
  state.repairHasMarks = true;
  if (els.clearRepairMarksBtn) els.clearRepairMarksBtn.disabled = false;
}

function beginRepairDrawing(event) {
  if (!currentSelectedResult()?.url) return;
  event.preventDefault();
  repairDrawing = true;
  repairLastPoint = repairPointFromEvent(event);
  drawRepairMark(repairLastPoint);
}

function moveRepairDrawing(event) {
  if (!repairDrawing) return;
  event.preventDefault();
  const point = repairPointFromEvent(event);
  drawRepairMark(point, repairLastPoint);
  repairLastPoint = point;
}

function endRepairDrawing() {
  repairDrawing = false;
  repairLastPoint = null;
}

function resetLiveResults() {
  state.liveResults = [];
  state.liveCompletedCount = 0;
  state.liveTotalCount = 0;
  state.liveProgressByIndex = {};
  state.selectedResultIndex = -1;
  els.results.className = "results empty tiger-workspace";
  els.results.innerHTML = emptyTigerMarkup("working");
  updateSelectedResultPanel();
}

function renderSuitePlan(plan = null) {
  state.suitePlan = plan || null;
  const styleBox = els.styleMasterBox;
  const status = els.suitePlanStatus;
  if (!styleBox) return;
  if (!plan) {
    styleBox.className = "style-master-box empty";
    styleBox.textContent = "";
    if (status) status.textContent = "";
    return;
  }

  const master = plan.style_master || plan.styleMaster || {};
  const identity = plan.identity_lock || plan.identityLock || "";
  const parts = [
    master.visual_tone || master.visualTone,
    master.palette || master.color_system || master.colorSystem,
    master.typography || master.font_system || master.fontSystem,
    master.layout_system || master.layoutSystem,
    identity
  ].filter(Boolean);

  styleBox.className = "style-master-box";
  styleBox.innerHTML = parts.length
    ? parts.map((part) => `<span>${escapeHtml(part)}</span>`).join("")
    : "<span>已生成风格母版，等待分镜提示词。</span>";
  if (status) {
    status.textContent = "";
  }
}

function renderPromptPlan(items = []) {
  state.promptPlan = Array.isArray(items) ? items.slice() : [];
  const list = els.promptPlanList;
  if (!list) return;
  if (!state.promptPlan.length) {
    list.className = "prompt-plan-list empty";
    list.textContent = "";
    return;
  }

  list.className = "prompt-plan-list";
  list.innerHTML = "";
  for (const item of state.promptPlan) {
    const row = document.createElement("article");
    row.className = "prompt-plan-item";
    const label = item.kind || "结果图";
    const order = Number(item.index || 0);
    const prompt = String(item.prompt || item.localPrompt || "").trim();
    row.innerHTML = `
      <div class="prompt-plan-head">
        <strong>${order ? `${order}. ` : ""}${escapeHtml(label)}</strong>
        <small>${escapeHtml(item.promptSource || "local")}</small>
      </div>
      <p>${escapeHtml(prompt.slice(0, 260))}${prompt.length > 260 ? "..." : ""}</p>
    `;
    row.addEventListener("click", () => {
      if (order > 0 && state.liveResults[order - 1]) {
        selectResult(order - 1);
      }
      els.promptEditor.value = prompt;
    });
    list.appendChild(row);
  }
}

function pendingCardTitle(item) {
  const title = item.kind || "结果图";
  if (item.totalForKind > 1) {
    return `${title} ${item.variantIndex + 1}/${item.totalForKind}`;
  }
  return title;
}

function renderGeneratingPlaceholder(total = 0, concurrency = 1) {
  state.liveTotalCount = total;
  els.results.className = "results empty generating-results";
  els.results.innerHTML = `
    <div class="generating-panel">
      <div class="generation-loader generation-loader-large" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <strong>正在生成图片</strong>
      <small>${total ? `已提交 ${total} 张任务，并发 ${concurrency || 1} 路生成` : "任务已提交，图片会在完成后直接显示"}</small>
    </div>
  `;
}

function clearGeneratingPlaceholder() {
  if (!els.results.classList.contains("generating-results")) return;
  els.results.className = "results";
  els.results.innerHTML = "";
}

function createPendingResultCard(item) {
  const card = document.createElement("article");
  card.className = "result-card result-card-pending";
  card.dataset.resultIndex = String(item.index);
  card.innerHTML = `
    <div class="result-pending-art">
      <div class="generation-loader" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <strong>${pendingCardTitle(item)}</strong>
      <small data-pending-status>等待提交</small>
    </div>
    <div class="result-meta">${pendingCardTitle(item)} · 生成中</div>
  `;
  return card;
}

function renderPendingResults(items, concurrency = 1) {
  const safeItems = Array.isArray(items) ? items : [];
  if (!safeItems.length) {
    renderGeneratingPlaceholder(0, concurrency);
    return;
  }
  state.liveTotalCount = safeItems.length;
  els.results.className = "results generating-results";
  els.results.innerHTML = "";
  for (const item of safeItems) {
    els.results.appendChild(createPendingResultCard(item));
  }
}

function updatePendingCard(progress) {
  const card = els.results.querySelector(`[data-result-index="${progress.current}"]`);
  if (!card) return;
  const status = card.querySelector("[data-pending-status]");
  if (!status) return;
  const stageLabels = {
    submitting: "正在提交任务",
    queued: "已提交，等待生成",
    polling: "正在生成图片",
    completed: "正在载入结果"
  };
  const progressText = typeof progress.progress === "number" ? ` ${Math.round(progress.progress)}%` : "";
  status.textContent = `${stageLabels[progress.stage] || progress.status || "生成中"}${progressText}`;
}

function replaceResultCard(result, index, resultNumber) {
  clearGeneratingPlaceholder();
  const existing = els.results.querySelector(`[data-result-index="${index}"]`);
  const card = buildResultCard(result, resultNumber);
  card.dataset.resultIndex = String(index);
  if (existing) {
    existing.replaceWith(card);
  } else {
    els.results.appendChild(card);
  }
  if (!els.results.querySelector(".result-card-pending")) {
    els.results.classList.remove("empty", "generating-results");
  }
}

function buildResultCard(result, index) {
  const card = document.createElement("article");
  card.className = `result-card${result.url ? "" : " result-card-status"}`;
  card.dataset.liveIndex = String(index);
  const title = result.kind || "结果图";
  const statusText = result.status === "timeout"
    ? "超时"
    : result.status === "failed"
      ? "失败"
      : "";

  if (result.url) {
    card.innerHTML = `
      <img src="${result.url}" alt="">
      <div class="result-meta">${title}${result.model ? ` · ${result.model}` : ""}${result.imageSize ? ` · ${result.imageSize}` : ""}</div>
      <div class="result-actions">
        <button data-action="save" data-url="${result.url}">保存</button>
        <button data-action="open" data-url="${result.url}">打开</button>
      </div>
    `;
    bindResultCardActions(card, result, index);
  } else {
    card.innerHTML = `
      <div class="result-status-box">
        <strong>${title} ${statusText}</strong>
        <span>${result.error || "未返回图片结果"}</span>
      </div>
    `;
  }

  card.addEventListener("click", (event) => {
    if (event.target.closest("button")) return;
    selectResult(index);
  });
  return card;
}

function appendResultCard(result, index) {
  if (!state.liveResults.length) {
    els.results.className = "results";
    els.results.innerHTML = "";
  }

  clearGeneratingPlaceholder();
  els.results.appendChild(buildResultCard(result, index));
}

function bindResultCardActions(card, result, index) {
  card.querySelector('[data-action="save"]')?.addEventListener("click", async (event) => {
    try {
      const filePath = await window.studio.saveImage({
        url: event.currentTarget.dataset.url,
        name: `product-image-${Date.now()}-${index + 1}.png`
      });
      if (filePath) toast(`已保存：${filePath}`);
    } catch (error) {
      toast(error.message, "error");
    }
  });

  card.querySelector('[data-action="open"]')?.addEventListener("click", () => {
    openImageViewer(result.url, result.kind || "图片预览");
  });

  card.querySelector("img")?.addEventListener("dblclick", () => {
    openImageViewer(result.url, result.kind || "图片预览");
  });
}

function currentSelectedResult() {
  if (state.selectedResultIndex < 0) return null;
  return state.liveResults[state.selectedResultIndex] || null;
}

function updateSelectedResultPanel() {
  const result = currentSelectedResult();
  $$(".result-card").forEach((card) => {
    card.classList.toggle("selected", Number(card.dataset.liveIndex) === state.selectedResultIndex);
  });

  const hasImage = Boolean(result?.url);
  if (els.selectedPreviewImg) {
    els.selectedPreviewImg.src = hasImage ? result.url : "";
    els.selectedPreviewImg.classList.toggle("hidden", !hasImage);
  }
  if (els.selectedPreview) {
    els.selectedPreview.classList.toggle("empty", !hasImage);
    const placeholder = els.selectedPreview.querySelector("span");
    if (placeholder) placeholder.textContent = hasImage ? "" : "暂无预览";
  }
  if (els.selectedMeta) {
    els.selectedMeta.textContent = result
      ? `${result.kind || "结果图"}${result.model ? ` · ${result.model}` : ""}${result.imageSize ? ` · ${result.imageSize}` : ""}`
      : "请选择一张结果图";
  }
  if (els.promptEditor) {
    els.promptEditor.value = result?.prompt || result?.finalPrompt || "";
  }
  if (els.saveSelectedBtn) els.saveSelectedBtn.disabled = !hasImage;
  if (els.openSelectedBtn) els.openSelectedBtn.disabled = !hasImage;
  if (els.regenerateSelectedBtn) els.regenerateSelectedBtn.disabled = !result;
  setupRepairCanvasForResult(result);
}

function selectResult(index) {
  const safeIndex = Number(index);
  if (!Number.isInteger(safeIndex) || safeIndex < 0 || safeIndex >= state.liveResults.length) {
    state.selectedResultIndex = -1;
  } else {
    state.selectedResultIndex = safeIndex;
  }
  updateSelectedResultPanel();
}

async function saveSelectedResult() {
  const result = currentSelectedResult();
  if (!result?.url) return;
  try {
    const filePath = await window.studio.saveImage({
      url: result.url,
      name: `product-image-${Date.now()}-${state.selectedResultIndex + 1}.png`
    });
    if (filePath) toast(`已保存：${filePath}`);
  } catch (error) {
    toast(error.message, "error");
  }
}

function openSelectedResult() {
  const result = currentSelectedResult();
  if (result?.url) openImageViewer(result.url, result.kind || "图片预览");
}

async function regenerateSelectedResult() {
  if (!ensureSupportedImageGeneration("单张重生成")) return;
  const result = currentSelectedResult();
  if (!result) {
    toast("请先选择一张图片。", "error");
    return;
  }
  const prompt = els.promptEditor.value.trim();
  if (!prompt) {
    toast("当前图片提示词不能为空。", "error");
    return;
  }
  const model = resolveCurrentImageModel();
  if (!supportsModelResolution(model, state.resolution)) {
    showMessageModal(`当前模型 ${model} 不支持 ${state.resolution}。请先切换模型或分辨率。`, "模型与分辨率不匹配", "error");
    return;
  }

  els.regenerateSelectedBtn.disabled = true;
  els.regenerateSelectedBtn.textContent = "重生成中";
  setProgress(8, "正在重生成当前图");
  try {
    const payload = buildPayload();
    const output = await window.studio.regenerateImage({
      ...payload,
      analysis: state.analysis || {},
      suitePlan: state.suitePlan || null,
      finalPrompt: els.promptBox.value.trim(),
      negativePrompt: state.analysis?.negative_prompt_en || "",
      prompt,
      kind: result.kind || "结果图",
      variantIndex: result.variantIndex || 0,
      totalForKind: result.totalForKind || 1
    });
    const nextResult = output.result || output.results?.[0];
    if (!nextResult) throw new Error("重生成未返回图片结果。");
    state.liveResults[state.selectedResultIndex] = nextResult;
    replaceResultCard(nextResult, state.selectedResultIndex + 1, state.selectedResultIndex);
    selectResult(state.selectedResultIndex);
    await loadHistory();
    setProgressSuccess("重生成完成");
    setTimeout(() => els.progressBox.classList.add("hidden"), 900);
  } catch (error) {
    setProgressFailed(`重生成失败：${shortErrorMessage(error)}`);
    showFailureModal(error, "单张重生成失败", regenerateSelectedResult);
  } finally {
    els.regenerateSelectedBtn.disabled = !currentSelectedResult();
    els.regenerateSelectedBtn.textContent = "重生成当前图";
  }
}

async function repairSelectedResult() {
  if (!ensureSupportedImageGeneration("局部标记修复")) return;
  const result = currentSelectedResult();
  if (!result?.url) {
    toast("请先选择一张需要修复的结果图。", "error");
    return;
  }
  const instruction = els.repairInstruction?.value.trim() || "";
  if (!instruction) {
    showMessageModal("请先写清楚要修复的地方，例如：只修正刀柄变形，其他区域保持不变。", "缺少修复说明", "error");
    return;
  }
  if (!state.repairHasMarks) {
    showMessageModal("请先在预览图上圈出需要重点修改的位置。", "缺少局部标记", "error");
    return;
  }
  const model = resolveCurrentImageModel();
  if (!supportsModelResolution(model, state.resolution)) {
    showMessageModal(`当前模型 ${model} 不支持 ${state.resolution}。请先切换模型或分辨率。`, "模型与分辨率不匹配", "error");
    return;
  }

  els.repairSelectedBtn.disabled = true;
  els.repairSelectedBtn.textContent = "局部修复中";
  setProgress(8, "正在按标记修复当前图");
  try {
    const payload = buildPayload();
    const output = await window.studio.repairImage({
      ...payload,
      analysis: state.analysis || {},
      suitePlan: state.suitePlan || null,
      finalPrompt: els.promptBox.value.trim(),
      negativePrompt: state.analysis?.negative_prompt_en || "",
      prompt: els.promptEditor.value.trim() || result.prompt || result.finalPrompt || "",
      repairInstruction: instruction,
      repairMarkImage: els.repairCanvas.toDataURL("image/png"),
      sourceImage: result.url,
      kind: result.kind || "结果图",
      variantIndex: result.variantIndex || 0,
      totalForKind: result.totalForKind || 1
    });
    const nextResult = output.result || output.results?.[0];
    if (!nextResult) throw new Error("局部修复未返回图片结果。");
    openRepairResultModal(nextResult);
    await loadHistory();
    setProgressSuccess("局部修复完成");
    setTimeout(() => els.progressBox.classList.add("hidden"), 900);
  } catch (error) {
    setProgressFailed(`局部修复失败：${shortErrorMessage(error)}`);
    showFailureModal(error, "局部修复失败", repairSelectedResult);
  } finally {
    els.repairSelectedBtn.disabled = !currentSelectedResult()?.url;
    els.repairSelectedBtn.textContent = "按标记局部修复";
  }
}

function openImageViewer(url, title = "图片预览") {
  if (!url) return;
  els.imageViewerTitle.textContent = title;
  els.imageViewerImg.src = url;
  els.imageViewer.classList.remove("hidden");
}

function closeImageViewer() {
  els.imageViewer.classList.add("hidden");
  els.imageViewerImg.src = "";
}

async function generate() {
  if (!ensureSupportedImageGeneration("批量套图生成")) return;
  let payload = buildPayload();
  if (!payload.imageKinds.length) {
    toast("至少选择一种图片类型。", "error");
    return;
  }

  if (state.productFactsReviewPending || (state.lastAnalyzedProductFacts && currentProductFactsSignature() !== state.lastAnalyzedProductFacts)) {
    state.productFactsReviewPending = true;
    showAnalysisRequiredModal();
    return;
  }

  if (!els.promptBox.value.trim()) {
    const analyzed = await analyze();
    if (!analyzed) return;
    payload = buildPayload();
  }

  const finalPrompt = els.promptBox.value.trim();
  if (!finalPrompt) {
    toast("缺少最终生图提示词。", "error");
    return;
  }
  const model = resolveCurrentImageModel();
  if (!supportsModelResolution(model, state.resolution)) {
    showMessageModal(`当前模型 ${model} 不支持 ${state.resolution}。请在左侧切换模型或分辨率后再生成。`, "模型与分辨率不匹配", "error");
    return;
  }

  setBusy(true, "正在提交 Grsai 生成任务");
  setProgress(2, "准备提交");
  const generationId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  state.activeGenerationId = generationId;
  resetLiveResults();
  renderSuitePlan(null);
  renderPromptPlan([]);
  state.liveTotalCount = getImageKindPlans().reduce((sum, item) => sum + item.count, 0);
  try {
    const output = await window.studio.generateImage({
      ...payload,
      generationId,
      analysis: state.analysis || {},
      finalPrompt,
      negativePrompt: state.analysis?.negative_prompt_en || ""
    });
    renderSuitePlan(output.suitePlan || state.suitePlan);
    renderPromptPlan(output.promptPlan || state.promptPlan);
    if (!state.liveResults.length) {
      renderResults(output.results || []);
    }
    await loadHistory();
    const successCount = (output.results || []).filter((item) => item.url).length;
    const failedCount = Math.max(0, (output.results || []).length - successCount);
    if (successCount === 0 && failedCount > 0) {
      els.statusLine.textContent = `生成失败，${failedCount} 张图片失败或超时`;
      setProgressFailed(`生成失败：${failedCount} 张图片失败或超时`);
    } else {
      els.statusLine.textContent = `生成完成，成功 ${successCount} 张${failedCount ? `，失败/超时 ${failedCount} 张` : ""}`;
      setProgressSuccess(failedCount ? `生成完成，${failedCount} 张失败或超时` : "生成完成");
      setTimeout(() => els.progressBox.classList.add("hidden"), 900);
    }
  } catch (error) {
    setProgressFailed(`生成失败：${shortErrorMessage(error)}`);
    showFailureModal(error, "图片生成失败", generate);
    els.statusLine.textContent = "生成失败";
  } finally {
    state.activeGenerationId = null;
    setBusy(false);
  }
}

function renderHistory(items) {
  els.historyList.innerHTML = "";
  if (!items.length) {
    els.historyList.innerHTML = '<div class="muted">暂无历史记录</div>';
    return;
  }

  for (const item of items.slice(0, 8)) {
    const row = document.createElement("div");
    row.className = "history-item";
    const created = new Date(item.createdAt).toLocaleString();
    row.innerHTML = `
      <div>
        <strong>${item.platform || "未指定平台"} / ${item.resolution || ""} / ${item.ratio || ""}</strong>
        <small>${created} · ${item.results?.length || 0} 张</small>
      </div>
      <button class="secondary-button">载入</button>
    `;
    row.querySelector("button").addEventListener("click", () => {
      els.promptBox.value = item.prompt || "";
      renderSuitePlan(item.suitePlan || null);
      renderPromptPlan(item.promptPlan || []);
      if (item.results?.length) {
        renderResults(item.results);
        els.statusLine.textContent = "已载入历史记录";
      } else {
        els.results.className = "results empty";
        els.results.innerHTML = emptyTigerMarkup("sleeping");
        els.statusLine.textContent = "已载入历史提示词，图片已过期或被清理";
      }
    });
    els.historyList.appendChild(row);
  }
}

async function loadHistory() {
  const items = await window.studio.getHistory();
  renderHistory(items);
}

function bindChoiceGroup(containerSelector, stateKey) {
  const buttons = $$(`${containerSelector} button`);
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      buttons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state[stateKey] = button.dataset.value;
      if (stateKey === "resolution") {
        ensureResolutionSupported();
        syncImageModelRouteUi();
      } else if (stateKey === "ratio") {
        updateImageModelUi();
      }
    });
  });
}

async function recoverHistoryFromCache() {
  if (!window.studio.recoverHistoryFromCache) {
    toast("当前版本未暴露缓存恢复接口。", "error");
    return;
  }
  els.recoverHistoryBtn.disabled = true;
  try {
    const result = await window.studio.recoverHistoryFromCache();
    await loadHistory();
    toast(`已从缓存恢复 ${result.recoveredCount || 0} 条记录。`);
  } catch (error) {
    showFailureModal(error, "恢复缓存失败", recoverHistoryFromCache);
  } finally {
    els.recoverHistoryBtn.disabled = false;
  }
}

function bindPackageModeTabs() {
  const buttons = $$("#productPackageMode button");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.productPackageMode = button.dataset.value || "single";
      state.title.productPackageMode = state.productPackageMode;
      syncProductModeUi();
      markProductFactsEdited();
      syncTitleChoiceButtons();
    });
  });
}

function syncKindCountDisplay() {
  $$(".kind-row").forEach((row) => {
    const kind = row.dataset.kind;
    const rawCount = Number(state.kindCounts[kind] || 0);
    const count = Math.max(0, Math.min(10, Number.isFinite(rawCount) ? rawCount : 0));
    if (rawCount > 10) {
      toast("单个分类图片的最高数量限制为10", "error");
    }
    state.kindCounts[kind] = count;
    row.querySelector("[data-kind-count]").value = String(count);
    const checkbox = row.querySelector('input[name="imageKind"]');
    checkbox.checked = count > 0;
  });
  updateTotalCount();
}

function openBrandDrawer() {
  $("#primaryColor").value = state.brand.primaryColor === "auto" ? "#7c3aed" : state.brand.primaryColor;
  $("#colorMode").value = state.brand.colorMode || "auto";
  $("#fontStyle").value = state.brand.fontStyle || "auto";
  $("#region").value = state.brand.region || "US";
  $("#language").value = state.brand.language || "English";
  $("#platform").value = state.brand.platform || "Amazon";
  $("#customStyle").value = state.brand.customStyle || "";
  els.brandDrawer.classList.remove("hidden");
}

function saveBrand() {
  const colorMode = $("#colorMode").value;
  state.brand = {
    primaryColor: colorMode === "auto" ? "auto" : $("#primaryColor").value,
    colorMode,
    fontStyle: $("#fontStyle").value,
    region: $("#region").value,
    language: $("#language").value,
    platform: $("#platform").value,
    customStyle: $("#customStyle").value.trim()
  };
  updateBrandSummary();
  updateAPlusSizeOptions(state.brand.platform);
  els.brandDrawer.classList.add("hidden");
}

function openSettingsDrawer() {
  const config = state.config;
  state.selectedPromptProvider = config.promptProvider || "grsai-gemini";
  if ($("#promptProvider")) $("#promptProvider").value = state.selectedPromptProvider;
  $("#promptBaseUrl").value = config.promptBaseUrl || "";
  $("#promptApiKey").value = getSavedPromptApiKey(config.promptProvider || "grsai-gemini") || config.promptApiKey || "";
  $("#promptEndpoint").value = config.promptEndpoint || "chat";
  $("#trendProxyUrl").value = config.trendProxyUrl || "";
  $("#imageProvider").value = config.imageProvider || "grsai";
  const imagePreset = IMAGE_PROVIDER_PRESETS[config.imageProvider || "grsai"] || IMAGE_PROVIDER_PRESETS.grsai;
  const isPresetImageProvider = (config.imageProvider || "grsai") !== "custom";
  $("#imageProviderType").value = isPresetImageProvider ? imagePreset.providerType : (config.imageProviderType || "custom");
  $("#grsaiBaseUrl").value = isPresetImageProvider && Object.prototype.hasOwnProperty.call(imagePreset, "baseUrl") ? imagePreset.baseUrl : (config.grsaiBaseUrl || config.imageBaseUrl || "");
  $("#grsaiApiKey").value = getSavedImageApiKey(config.imageProvider || "grsai") || config.grsaiApiKey || "";
  $("#grsaiConcurrency").value = config.grsaiConcurrency || 6;
  syncPromptProviderUi();
  renderProviderList();
  const provider = state.selectedPromptProvider;
  setPromptModelOptions(getProviderModelOptions(provider), getLastPromptModel(provider) || config.promptModel || "", false);
  renderPromptModelList(provider);
  syncImageProviderUi();
  syncImageModelOptions(config.imageProvider || "grsai", config.grsai1kModel || config.image1kModel || "", config.grsai2kModel || config.image2kModel || "");
  els.settingsDrawer.classList.remove("hidden");
}

function getPromptProviderKeys() {
  const keys = state.config?.promptProviderKeys;
  return keys && typeof keys === "object" ? keys : {};
}

function getSavedPromptApiKey(provider) {
  const normalizedProvider = provider || "custom";
  return String(getPromptProviderKeys()[normalizedProvider] || "").trim();
}

function setPromptApiKeyForProvider(provider, apiKey) {
  const normalizedProvider = provider || "custom";
  const nextKeys = { ...getPromptProviderKeys() };
  const key = String(apiKey || "").trim();
  if (key) {
    nextKeys[normalizedProvider] = key;
  } else {
    delete nextKeys[normalizedProvider];
  }
  state.config = {
    ...(state.config || {}),
    promptProviderKeys: nextKeys,
    promptApiKey: key
  };
  return nextKeys;
}

function syncPromptApiKeyForProvider(provider) {
  const savedKey = getSavedPromptApiKey(provider);
  $("#promptApiKey").value = savedKey;
  const hint = $("#promptApiKeyHint");
  if (hint) {
    const preset = promptProviderPreset(provider);
    hint.textContent = savedKey
      ? `已自动填入这台电脑保存过的 ${preset.label} API Key。`
      : `当前供应商还没有保存 API Key，填写后可点击“保存 Key”。`;
  }
}

function setImageApiKeyForProvider(provider, apiKey) {
  const normalizedProvider = provider || "grsai";
  const nextKeys = { ...getImageProviderKeys() };
  const key = String(apiKey || "").trim();
  if (key) {
    nextKeys[normalizedProvider] = key;
  } else {
    delete nextKeys[normalizedProvider];
  }
  state.config = {
    ...(state.config || {}),
    imageProviderKeys: nextKeys,
    imageApiKey: key,
    grsaiApiKey: key
  };
  return nextKeys;
}

function syncImageApiKeyForProvider(provider) {
  const savedKey = getSavedImageApiKey(provider);
  $("#grsaiApiKey").value = savedKey;
  const hint = $("#imageApiKeyHint");
  if (hint) {
    const preset = IMAGE_PROVIDER_PRESETS[provider] || IMAGE_PROVIDER_PRESETS.custom;
    hint.textContent = savedKey
      ? `已自动填入这台电脑保存过的 ${preset.label} 作图 API Key。`
      : "当前作图供应商还没有保存 API Key，填写后可点击“保存 Key”。";
  }
}

function rememberImageModelsForProvider(provider, model1k, model2k) {
  const normalizedProvider = provider || "grsai";
  const imageProviderModels = { ...getImageProviderModels() };
  const imageProviderLastModels = { ...getImageProviderLastModels() };
  const current = imageProviderModels[normalizedProvider] || [];
  const routeModel = state.imageModelRoute && state.imageModelRoute !== "auto" ? state.imageModelRoute : "";
  imageProviderModels[normalizedProvider] = uniqueModelOptions([model1k, model2k, routeModel, ...current]).slice(0, 200);
  if (model1k) imageProviderLastModels[`${normalizedProvider}:1k`] = model1k;
  if (model2k) imageProviderLastModels[`${normalizedProvider}:2k`] = model2k;
  if (routeModel) imageProviderLastModels[`${normalizedProvider}:route`] = routeModel;
  state.config = {
    ...(state.config || {}),
    imageProviderModels,
    imageProviderLastModels
  };
  return { imageProviderModels, imageProviderLastModels };
}

function syncImageProviderUi() {
  const provider = $("#imageProvider")?.value || "grsai";
  const preset = IMAGE_PROVIDER_PRESETS[provider] || IMAGE_PROVIDER_PRESETS.custom;
  const hint = $("#imageProviderHint");
  if (hint) {
    hint.textContent = `${preset.hint}${preset.supported ? "" : " 当前版本不会直接用它发起批量作图请求。"}`;
  }
  const button = $("#applyImageProviderPresetBtn");
  if (button) {
    button.disabled = provider === "custom";
    button.textContent = provider === "custom" ? "自定义不支持自动填充" : "自动填充作图配置";
  }
  syncProviderModelIcons();
}

function syncImageModelOptions(provider, selected1k = "", selected2k = "", flags = {}) {
  const modelOptions = getImageProviderModelOptions(provider);
  const preset = IMAGE_PROVIDER_PRESETS[provider] || IMAGE_PROVIDER_PRESETS.custom;
  const standardOptions = uniqueModelOptions(modelOptions.filter((model) => imageModelTier(model) === "standard"));
  const advancedOptions = uniqueModelOptions(modelOptions.filter((model) => imageModelTier(model) === "advanced"));
  const preferPreset = Boolean(flags.preferPreset);
  const preferred1k = preferPreset ? (selected1k || preset.model1k || getLastImageModel(provider, "1k") || "") : (selected1k || getLastImageModel(provider, "1k") || preset.model1k || "");
  const preferred2k = preferPreset ? (selected2k || preset.model2k || getLastImageModel(provider, "2k") || "") : (selected2k || getLastImageModel(provider, "2k") || preset.model2k || "");
  setSelectModelOptions("#grsai1kModel", "#grsai1kModelCustom", standardOptions.length ? standardOptions : modelOptions, preferred1k);
  setSelectModelOptions("#grsai2kModel", "#grsai2kModelCustom", advancedOptions.length ? advancedOptions : modelOptions, preferred2k);
  state.config = {
    ...(state.config || {}),
    imageProvider: provider || "grsai",
    image1kModel: getSelectedModelValue("#grsai1kModel", "#grsai1kModelCustom") || preset.model1k,
    image2kModel: getSelectedModelValue("#grsai2kModel", "#grsai2kModelCustom") || preset.model2k
  };
  populateModelRouteSelect();
  $("#modelRoute").value = normalizeImageModelRoute(state.imageModelRoute || state.config?.imageModelRoute);
  syncImageModelRouteUi();
  syncProviderModelIcons();
}

function applyImageProviderPreset(provider, options = {}) {
  const preset = IMAGE_PROVIDER_PRESETS[provider] || IMAGE_PROVIDER_PRESETS.custom;
  if (provider === "custom") {
    if (!options.silent) toast("自定义作图供应商不支持自动填充，请手动填写。", "error");
    syncImageProviderUi();
    return;
  }
  $("#imageProviderType").value = preset.providerType || "custom";
  if (Object.prototype.hasOwnProperty.call(preset, "baseUrl")) $("#grsaiBaseUrl").value = preset.baseUrl;
  state.imageModelRoute = "auto";
  syncImageModelOptions(provider, preset.model1k || "", preset.model2k || "", { preferPreset: true });
  syncImageProviderUi();
  const status = $("#imageApiActionStatus");
  if (status) status.textContent = `已按 ${preset.label} 切换作图 API 地址、适配类型和默认模型；Key 会按作图供应商单独保存。`;
  syncProviderModelIcons();
}

function handleImageProviderChange(provider) {
  const preset = IMAGE_PROVIDER_PRESETS[provider] || IMAGE_PROVIDER_PRESETS.custom;
  syncImageApiKeyForProvider(provider);
  syncImageProviderUi();
  if (provider === "custom") {
    $("#imageProviderType").value = preset.providerType || "custom";
    $("#grsaiBaseUrl").value = "";
    state.imageModelRoute = "auto";
    syncImageModelOptions(provider, getLastImageModel(provider, "1k"), getLastImageModel(provider, "2k"));
    $("#imageApiActionStatus").textContent = "已切换为自定义作图供应商，请手动填写 API 地址、适配类型和模型。";
    syncProviderModelIcons();
    return;
  }
  applyImageProviderPreset(provider, { silent: true });
  syncProviderModelIcons();
}

function getProviderModelOptions(provider) {
  const preset = promptProviderPreset(provider);
  const savedModels = getSavedPromptModels(provider);
  return uniqueModelOptions([...(savedModels || []), ...(preset.models || [])]);
}

function getImageProviderModels() {
  const models = state.config?.imageProviderModels;
  return models && typeof models === "object" ? models : {};
}

function getImageProviderLastModels() {
  const models = state.config?.imageProviderLastModels;
  return models && typeof models === "object" ? models : {};
}

function getImageProviderKeys() {
  const keys = state.config?.imageProviderKeys;
  return keys && typeof keys === "object" ? keys : {};
}

function getSavedImageApiKey(provider) {
  return String(getImageProviderKeys()[provider || "grsai"] || "").trim();
}

function getImageProviderModelOptions(provider) {
  const preset = IMAGE_PROVIDER_PRESETS[provider] || IMAGE_PROVIDER_PRESETS.custom;
  const saved = getImageProviderModels()[provider || "grsai"];
  return uniqueModelOptions([...(Array.isArray(saved) ? saved : []), ...(preset.models || [])]);
}

function getLastImageModel(provider, slot) {
  const key = `${provider || "grsai"}:${slot}`;
  return String(getImageProviderLastModels()[key] || "").trim();
}

function getPromptProviderModels() {
  const models = state.config?.promptProviderModels;
  return models && typeof models === "object" ? models : {};
}

function getPromptProviderLastModels() {
  const models = state.config?.promptProviderLastModels;
  return models && typeof models === "object" ? models : {};
}

function getSavedPromptModels(provider) {
  const normalizedProvider = provider || "custom";
  const values = getPromptProviderModels()[normalizedProvider];
  return Array.isArray(values) ? values : [];
}

function getPromptProviderDefaultBaseUrl(provider) {
  const preset = promptProviderPreset(provider);
  const isSelectedProvider = state.config?.promptProvider === provider;
  return isSelectedProvider ? (state.config?.promptBaseUrl || preset.promptBaseUrl || "") : (preset.promptBaseUrl || "");
}

function getPromptProviderDefaultEndpoint(provider) {
  const preset = promptProviderPreset(provider);
  const isSelectedProvider = state.config?.promptProvider === provider;
  return isSelectedProvider ? (state.config?.promptEndpoint || preset.promptEndpoint || "chat") : (preset.promptEndpoint || "chat");
}

function getLastPromptModel(provider) {
  return String(getPromptProviderLastModels()[provider || "custom"] || "").trim();
}

function rememberPromptModelForProvider(provider, model) {
  const normalizedProvider = provider || "custom";
  const value = String(model || "").trim();
  const promptProviderModels = { ...getPromptProviderModels() };
  const promptProviderLastModels = { ...getPromptProviderLastModels() };

  if (value) {
    promptProviderModels[normalizedProvider] = uniqueModelOptions([
      value,
      ...(promptProviderModels[normalizedProvider] || [])
    ]).slice(0, 200);
    promptProviderLastModels[normalizedProvider] = value;
  }

  state.config = {
    ...(state.config || {}),
    promptProviderModels,
    promptProviderLastModels
  };
  return { promptProviderModels, promptProviderLastModels };
}

function uniqueModelOptions(models) {
  const result = [];
  const seen = new Set();
  for (const model of models || []) {
    const value = String(model || "").trim();
    if (!value || value === "auto" || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function setPromptModelOptions(models, selectedModel = "", fromRemote = false) {
  const select = $("#promptModel");
  const customInput = $("#promptModelCustom");
  const hint = $("#promptModelHint");
  if (!select || !customInput) return;

  const options = uniqueModelOptions(models);
  const selected = String(selectedModel || "").trim();
  if (selected && !options.includes(selected)) {
    options.unshift(selected);
  }

  select.innerHTML = "";
  for (const model of options) {
    const option = document.createElement("option");
    option.value = model;
    option.textContent = model;
    select.appendChild(option);
  }

  const customOption = document.createElement("option");
  customOption.value = CUSTOM_MODEL_VALUE;
  customOption.textContent = "手动输入其他模型";
  select.appendChild(customOption);

  if (selected) {
    select.value = selected;
  } else if (options.length) {
    select.value = options[0];
  } else {
    select.value = CUSTOM_MODEL_VALUE;
  }

  customInput.classList.toggle("hidden", select.value !== CUSTOM_MODEL_VALUE);
  if (select.value === CUSTOM_MODEL_VALUE && selected) {
    customInput.value = selected;
  } else if (select.value !== CUSTOM_MODEL_VALUE) {
    customInput.value = "";
  }

  if (hint) {
    hint.textContent = fromRemote
      ? `已获取 ${options.length} 个模型，可直接在下拉框中选择，避免输入错误。`
      : "图片 AI 分析和标题优化共用这组提示词模型配置；获取模型列表后可直接下拉选择。";
  }
  renderPromptModelList(currentSettingsProvider());
  syncPromptProviderUi();
  syncProviderModelIcons();
}

function setSelectModelOptions(selectId, customInputId, models, selectedModel = "") {
  const select = $(selectId);
  const customInput = $(customInputId);
  if (!select || !customInput) return;
  const options = uniqueModelOptions(models);
  const selected = String(selectedModel || "").trim();
  const selectedMatchesList = !selected || options.includes(selected);
  if (selected && !selectedMatchesList) {
    options.push(selected);
  }
  select.innerHTML = "";
  for (const model of options) {
    const option = document.createElement("option");
    option.value = model;
    option.textContent = model;
    select.appendChild(option);
  }
  const customOption = document.createElement("option");
  customOption.value = CUSTOM_MODEL_VALUE;
  customOption.textContent = "手动输入其他模型";
  select.appendChild(customOption);
  select.value = selected && selectedMatchesList ? selected : options[0] || selected || CUSTOM_MODEL_VALUE;
  customInput.classList.toggle("hidden", select.value !== CUSTOM_MODEL_VALUE);
  if (select.value === CUSTOM_MODEL_VALUE && selected) {
    customInput.value = selected;
  } else if (select.value !== CUSTOM_MODEL_VALUE) {
    customInput.value = "";
  }
  syncProviderModelIcons();
}

function getSelectedModelValue(selectId, customInputId) {
  const value = $(selectId).value;
  if (value === CUSTOM_MODEL_VALUE) return $(customInputId).value.trim();
  return value.trim();
}

function syncCustomModelInput(selectId, customInputId) {
  const isCustom = $(selectId).value === CUSTOM_MODEL_VALUE;
  $(customInputId).classList.toggle("hidden", !isCustom);
  if (isCustom) $(customInputId).focus();
  syncProviderModelIcons();
}

async function persistPromptProviderMemory(provider, patch = {}) {
  state.config = await window.studio.saveConfig({
    ...(state.config || {}),
    promptProvider: provider || "custom",
    ...patch
  });
  return state.config;
}

function getSelectedPromptModel() {
  const value = $("#promptModel")?.value || "";
  if (value === CUSTOM_MODEL_VALUE) {
    return $("#promptModelCustom")?.value.trim() || "";
  }
  return value.trim();
}

function syncPromptModelCustomInput() {
  const isCustom = $("#promptModel").value === CUSTOM_MODEL_VALUE;
  $("#promptModelCustom").classList.toggle("hidden", !isCustom);
  if (isCustom) {
    $("#promptModelCustom").focus();
    return;
  }
  const provider = currentSettingsProvider();
  rememberPromptModelForProvider(provider, getSelectedPromptModel());
  renderPromptModelList(provider);
  syncPromptProviderUi();
  syncProviderModelIcons();
}

function syncPromptProviderUi() {
  const provider = currentSettingsProvider();
  const preset = promptProviderPreset(provider);
  if ($("#promptProvider")) $("#promptProvider").value = provider;
  if ($("#promptProviderTitle")) $("#promptProviderTitle").textContent = preset.label || provider;
  if ($("#promptBaseUrl")) $("#promptBaseUrl").value = getPromptProviderDefaultBaseUrl(provider);
  if ($("#promptApiKey")) $("#promptApiKey").value = getSavedPromptApiKey(provider) || (state.config?.promptProvider === provider ? state.config?.promptApiKey || "" : "");
  if ($("#promptEndpoint")) {
    const endpoint = getPromptProviderDefaultEndpoint(provider);
    if (![...$("#promptEndpoint").options].some((option) => option.value === endpoint)) {
      $("#promptEndpoint").value = "chat";
    } else {
      $("#promptEndpoint").value = endpoint;
    }
  }
  const hint = $("#promptProviderHint");
  if (hint) hint.textContent = `${preset.hint || API_PROVIDER_PRESETS.custom.hint}${preset.source ? ` 来源：${preset.source}。` : ""}`;
  const button = $("#applyProviderPresetBtn");
  if (button) {
    button.disabled = Boolean(preset.custom);
    button.textContent = preset.custom ? "自定义供应商" : "自动填充官方配置";
  }
  if (els.promptProviderToggle) {
    els.promptProviderToggle.checked = promptProviderEnabled(provider);
  }
  if (els.promptApiAddressPreview) {
    const base = ($("#promptBaseUrl")?.value || "").replace(/\/+$/, "");
    const endpoint = $("#promptEndpoint")?.value || "chat";
    const model = getSelectedPromptModel() || promptProviderPreset(provider).promptModel || "{model}";
    els.promptApiAddressPreview.textContent = endpoint === "chat"
      ? `预览：${base}/chat/completions`
      : endpoint === "responses"
        ? `预览：${base}/responses`
        : endpoint === "gemini"
          ? `预览：${base}/models/${model}:generateContent`
          : endpoint === "anthropic"
            ? `预览：${base}/messages`
            : `预览：${base}/chat/completions 或 /responses`;
  }
  syncApiAdvancedControls(provider);
  syncProviderModelIcons();
}

function renderProviderList() {
  if (!els.providerList) return;
  const activeProvider = currentSettingsProvider();
  const query = String(els.providerSearch?.value || "").trim().toLowerCase();
  const providers = allPromptProviders().filter((provider) => {
    const label = promptProviderLabel(provider).toLowerCase();
    return !query || label.includes(query) || provider.includes(query);
  });
  els.providerList.innerHTML = "";
  for (const provider of providers) {
    const preset = promptProviderPreset(provider);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `provider-row${provider === activeProvider ? " active" : ""}`;
    button.dataset.provider = provider;
    const enabled = promptProviderEnabled(provider);
    const initial = (preset.label || provider || "P").slice(0, 1).toUpperCase();
    const icon = iconPath(providerIconKey(provider));
    button.innerHTML = `
      <span class="provider-row-icon"><img src="${escapeHtml(icon)}" alt="" onerror="this.classList.add('hidden');this.nextElementSibling.classList.remove('hidden')" /><b class="hidden">${escapeHtml(initial)}</b></span>
      <span class="provider-row-main">
        <strong>${escapeHtml(preset.label || provider)}</strong>
      </span>
      ${enabled ? '<span class="provider-on">ON</span>' : ""}
    `;
    button.addEventListener("click", () => selectPromptProvider(provider));
    els.providerList.appendChild(button);
  }
}

function renderPromptModelList(provider = currentSettingsProvider()) {
  if (!els.promptModelList) return;
  const models = getProviderModelOptions(provider);
  const selected = getSelectedPromptModel() || getLastPromptModel(provider) || promptProviderPreset(provider).promptModel || "";
  els.promptModelList.innerHTML = "";
  if (els.promptModelCount) els.promptModelCount.textContent = String(models.length);
  if (!models.length) {
    els.promptModelList.innerHTML = '<div class="model-empty">暂无模型，点击右上角 + 添加模型，或获取模型列表。</div>';
    return;
  }
  const group = document.createElement("div");
  group.className = "model-group";
  group.innerHTML = `<div class="model-group-title"><span>默认分组</span></div>`;
  for (const model of models) {
    const row = document.createElement("div");
    row.className = `model-row${model === selected ? " selected" : ""}`;
    row.dataset.model = model;
    const caps = modelCapabilities(provider, model);
    const icon = iconPath(modelIconKey(model, provider));
    row.innerHTML = `
      <button class="model-select-button" type="button" title="设为当前模型">
        <img class="model-row-icon" src="${escapeHtml(icon)}" alt="" />
        <span>${escapeHtml(model)}</span>
      </button>
      <div class="model-capabilities">${CAPABILITY_META.map((item) => `
        <button type="button" class="cap-pill${caps[item.key] ? " active" : ""}" data-capability="${item.key}" title="${escapeHtml(item.label)}">${escapeHtml(item.short)}</button>
      `).join("")}</div>
      <button class="model-edit-button" type="button" title="编辑模型">⚙</button>
      <button class="model-remove-button" type="button" title="移除模型">−</button>
    `;
    row.querySelector(".model-select-button").addEventListener("click", () => selectPromptModel(provider, model));
    row.querySelectorAll("[data-capability]").forEach((capButton) => {
      capButton.addEventListener("click", (event) => {
        event.stopPropagation();
        const key = capButton.dataset.capability;
        const nextCaps = { ...modelCapabilities(provider, model), [key]: !modelCapabilities(provider, model)[key] };
        setModelCapabilities(provider, model, nextCaps);
        capButton.classList.toggle("active", nextCaps[key]);
      });
    });
    row.querySelector(".model-edit-button").addEventListener("click", () => openModelEditModal(provider, model));
    row.querySelector(".model-remove-button").addEventListener("click", () => removePromptModel(provider, model));
    group.appendChild(row);
  }
  els.promptModelList.appendChild(group);
}

function selectPromptProvider(provider) {
  state.selectedPromptProvider = provider || "grsai-gemini";
  if ($("#promptProvider")) $("#promptProvider").value = state.selectedPromptProvider;
  const preset = promptProviderPreset(state.selectedPromptProvider);
  const lastModel = getLastPromptModel(state.selectedPromptProvider) || (state.config?.promptProvider === state.selectedPromptProvider ? state.config?.promptModel : "") || preset.promptModel || "";
  $("#promptBaseUrl").value = getPromptProviderDefaultBaseUrl(state.selectedPromptProvider);
  $("#promptEndpoint").value = getPromptProviderDefaultEndpoint(state.selectedPromptProvider);
  $("#promptApiKey").value = getSavedPromptApiKey(state.selectedPromptProvider) || (state.config?.promptProvider === state.selectedPromptProvider ? state.config?.promptApiKey || "" : "");
  setPromptModelOptions(getProviderModelOptions(state.selectedPromptProvider), lastModel, false);
  renderProviderList();
  renderPromptModelList(state.selectedPromptProvider);
  syncPromptProviderUi();
}

function selectPromptModel(provider, model) {
  setPromptModelOptions(getProviderModelOptions(provider), model, false);
  rememberPromptModelForProvider(provider, model);
  renderPromptModelList(provider);
  syncPromptProviderUi();
}

function removePromptModel(provider, model) {
  const promptProviderModels = { ...getPromptProviderModels() };
  promptProviderModels[provider] = uniqueModelOptions((promptProviderModels[provider] || []).filter((item) => item !== model));
  state.config = { ...(state.config || {}), promptProviderModels };
  setPromptModelOptions(getProviderModelOptions(provider), getSelectedPromptModel(), false);
}

function syncApiAdvancedControls(provider = currentSettingsProvider()) {
  const options = { ...API_OPTION_DEFAULTS, ...(getPromptProviderApiOptions()[provider] || {}) };
  $$("#apiAdvancedModal [data-api-option]").forEach((input) => {
    input.checked = Boolean(options[input.dataset.apiOption]);
  });
}

function collectApiAdvancedOptions(provider = currentSettingsProvider()) {
  const current = { ...getPromptProviderApiOptions() };
  current[provider] = { ...API_OPTION_DEFAULTS };
  $$("#apiAdvancedModal [data-api-option]").forEach((input) => {
    current[provider][input.dataset.apiOption] = Boolean(input.checked);
  });
  state.config = { ...(state.config || {}), promptProviderApiOptions: current };
  return current;
}

function openApiAdvancedModal() {
  syncApiAdvancedControls(currentSettingsProvider());
  els.apiAdvancedModal?.classList.remove("hidden");
}

function closeApiAdvancedModal() {
  collectApiAdvancedOptions(currentSettingsProvider());
  els.apiAdvancedModal?.classList.add("hidden");
}

function openProviderAddModal() {
  if (els.providerNameInput) els.providerNameInput.value = "";
  if (els.providerTypeSelect) els.providerTypeSelect.value = "openai";
  els.providerAddModal?.classList.remove("hidden");
  els.providerNameInput?.focus();
}

async function confirmProviderAdd() {
  const name = String(els.providerNameInput?.value || "").trim();
  if (!name) {
    toast("请先填写供应商名称。", "error");
    return;
  }
  const provider = normalizeProviderKey(name);
  const meta = {
    ...getPromptProviderMeta(),
    [provider]: {
      name,
      type: els.providerTypeSelect?.value || "openai",
      promptEndpoint: providerTypeToEndpoint(els.providerTypeSelect?.value),
      custom: true
    }
  };
  const providerModels = { ...getPromptProviderModels(), [provider]: [] };
  state.config = await window.studio.saveConfig({
    ...state.config,
    promptProviderMeta: meta,
    promptProviderModels: providerModels
  });
  state.selectedPromptProvider = provider;
  els.providerAddModal?.classList.add("hidden");
  renderProviderList();
  selectPromptProvider(provider);
}

function openModelEditModal(provider, model = "") {
  if (!els.modelEditModal) return;
  els.modelEditModal.dataset.provider = provider;
  els.modelEditModal.dataset.originalModel = model;
  if (els.modelEditTitle) els.modelEditTitle.textContent = model ? "编辑模型" : "添加模型";
  if (els.modelEditId) els.modelEditId.value = model;
  if (els.modelEditName) els.modelEditName.value = model;
  if (els.modelEditGroup) els.modelEditGroup.value = promptProviderLabel(provider);
  const caps = modelCapabilities(provider, model);
  $$("#modelEditModal [data-model-capability]").forEach((input) => {
    input.checked = Boolean(caps[input.dataset.modelCapability]);
  });
  els.modelEditModal.classList.remove("hidden");
  els.modelEditId?.focus();
}

async function saveModelEdit() {
  const provider = els.modelEditModal?.dataset.provider || currentSettingsProvider();
  const originalModel = els.modelEditModal?.dataset.originalModel || "";
  const model = String(els.modelEditId?.value || "").trim();
  if (!model) {
    toast("请填写模型 ID。", "error");
    return;
  }
  const currentModels = getProviderModelOptions(provider).filter((item) => item !== originalModel);
  const promptProviderModels = {
    ...getPromptProviderModels(),
    [provider]: uniqueModelOptions([model, ...currentModels]).slice(0, 200)
  };
  const caps = {};
  $$("#modelEditModal [data-model-capability]").forEach((input) => {
    caps[input.dataset.modelCapability] = Boolean(input.checked);
  });
  const promptModelCapabilities = setModelCapabilities(provider, model, caps);
  state.config = await window.studio.saveConfig({
    ...state.config,
    promptProviderModels,
    promptModelCapabilities
  });
  setPromptModelOptions(getProviderModelOptions(provider), model, false);
  els.modelEditModal?.classList.add("hidden");
  renderPromptModelList(provider);
}

function applyPromptProviderPreset(provider, options = {}) {
  const preset = promptProviderPreset(provider);
  if (preset.custom) {
    if (!options.silent) toast("自定义供应商不支持自动填充，请手动填写 API 地址、接口类型和模型。", "error");
    syncPromptProviderUi();
    return;
  }
  if (preset.promptBaseUrl) $("#promptBaseUrl").value = preset.promptBaseUrl;
  if (preset.promptEndpoint) $("#promptEndpoint").value = preset.promptEndpoint;
  setPromptModelOptions(getProviderModelOptions(provider), preset.promptModel || getLastPromptModel(provider) || "", false);
  syncPromptProviderUi();
  renderProviderList();
  renderPromptModelList(provider);
  $("#promptApiActionStatus").textContent = `已自动切换到 ${preset.label} 官方兼容配置；如控制台信息不同，可继续手动编辑。`;
  syncProviderModelIcons();
}

function handlePromptProviderChange(provider) {
  const preset = promptProviderPreset(provider);
  state.selectedPromptProvider = provider || "grsai-gemini";
  syncPromptApiKeyForProvider(provider);
  syncPromptProviderUi();
  if (preset.custom) {
    $("#promptBaseUrl").value = "";
    $("#promptEndpoint").value = preset.promptEndpoint || "chat";
    setPromptModelOptions(getProviderModelOptions(provider), getLastPromptModel(provider), false);
    $("#promptApiActionStatus").textContent = "已切换为自定义供应商，请手动填写 API 地址、接口类型和模型。";
    renderProviderList();
    renderPromptModelList(provider);
    syncProviderModelIcons();
    return;
  }
  applyPromptProviderPreset(provider, { silent: true });
  renderProviderList();
  renderPromptModelList(provider);
  syncProviderModelIcons();
}

function ensureDefaultGrsaiGeminiConfig(config = {}) {
  const next = { ...config };
  const needsPromptPreset = !next.promptProvider || !next.promptBaseUrl || !next.promptModel;
  if (needsPromptPreset) {
    next.promptProvider = "grsai-gemini";
    next.promptBaseUrl = "https://grsai.dakka.com.cn/v1";
    next.promptModel = "gemini-3.1-pro";
    next.promptEndpoint = "chat";
  }
  if (!next.imageModelRoute) next.imageModelRoute = "auto";
  if (!next.image2kModel || next.image2kModel === "nano-banana-2") {
    next.image2kModel = "gpt-image-2-vip";
    next.grsai2kModel = "gpt-image-2-vip";
  }
  return next;
}

function collectPromptApiSettings() {
  const provider = currentSettingsProvider();
  const preset = promptProviderPreset(provider);
  return {
    promptProvider: provider,
    promptBaseUrl: $("#promptBaseUrl").value.trim() || preset.promptBaseUrl || "",
    promptApiKey: $("#promptApiKey").value.trim(),
    promptModel: getSelectedPromptModel() || preset.promptModel || "",
    promptEndpoint: $("#promptEndpoint").value || preset.promptEndpoint || "chat"
  };
}

function collectImageApiSettings() {
  const provider = $("#imageProvider").value || "grsai";
  const preset = IMAGE_PROVIDER_PRESETS[provider] || IMAGE_PROVIDER_PRESETS.custom;
  const isPresetProvider = provider !== "custom";
  const image1kModel = getSelectedModelValue("#grsai1kModel", "#grsai1kModelCustom") || preset.model1k || "";
  const image2kModel = getSelectedModelValue("#grsai2kModel", "#grsai2kModelCustom") || preset.model2k || image1kModel;
  return {
    imageProvider: provider,
    imageProviderType: isPresetProvider && preset.providerType ? preset.providerType : ($("#imageProviderType").value || "custom"),
    imageBaseUrl: isPresetProvider && Object.prototype.hasOwnProperty.call(preset, "baseUrl") ? preset.baseUrl : $("#grsaiBaseUrl").value.trim(),
    imageApiKey: $("#grsaiApiKey").value.trim(),
    imageModelRoute: normalizeImageModelRoute($("#modelRoute")?.value || state.imageModelRoute),
    image1kModel,
    image2kModel
  };
}

async function rememberCurrentPromptModel() {
  const provider = currentSettingsProvider();
  const promptModel = getSelectedPromptModel();
  if (!promptModel) return;
  const remembered = rememberPromptModelForProvider(provider, promptModel);
  await persistPromptProviderMemory(provider, remembered);
  setPromptModelOptions(getProviderModelOptions(provider), promptModel, false);
}

async function saveSettings() {
  const promptSettings = collectPromptApiSettings();
  const provider = promptSettings.promptProvider;
  const promptApiKey = promptSettings.promptApiKey;
  const promptModel = promptSettings.promptModel;
  const promptProviderKeys = setPromptApiKeyForProvider(provider, promptApiKey);
  const { promptProviderModels, promptProviderLastModels } = rememberPromptModelForProvider(provider, promptModel);
  const promptProviderApiOptions = collectApiAdvancedOptions(provider);
  const promptProviderMeta = { ...getPromptProviderMeta() };
  if (promptProviderMeta[provider]) {
    promptProviderMeta[provider] = {
      ...promptProviderMeta[provider],
      promptBaseUrl: promptSettings.promptBaseUrl,
      promptEndpoint: promptSettings.promptEndpoint,
      promptModel
    };
  }
  const imageSettings = collectImageApiSettings();
  const imageProvider = imageSettings.imageProvider;
  const imageApiKey = imageSettings.imageApiKey;
  const imageModelRoute = imageSettings.imageModelRoute;
  const image1kModel = imageSettings.image1kModel;
  const image2kModel = imageSettings.image2kModel;
  const imageProviderKeys = setImageApiKeyForProvider(imageProvider, imageApiKey);
  const { imageProviderModels, imageProviderLastModels } = rememberImageModelsForProvider(imageProvider, image1kModel, image2kModel);
  const next = {
    promptProvider: provider,
    promptBaseUrl: promptSettings.promptBaseUrl,
    promptApiKey,
    promptProviderKeys,
    promptModel,
    promptProviderModels,
    promptProviderLastModels,
    promptProviderMeta,
    promptProviderApiOptions,
    promptModelCapabilities: getPromptModelCapabilitiesMap(),
    promptEndpoint: promptSettings.promptEndpoint,
    trendProxyUrl: $("#trendProxyUrl").value.trim(),
    imageProvider,
    imageProviderType: imageSettings.imageProviderType,
    imageProviderKeys,
    imageProviderModels,
    imageProviderLastModels,
    imageBaseUrl: imageSettings.imageBaseUrl,
    imageApiKey,
    imageModelRoute,
    image1kModel,
    image2kModel,
    grsaiBaseUrl: imageSettings.imageBaseUrl,
    grsaiApiKey: imageApiKey,
    grsai1kModel: image1kModel || "gpt-image-2",
    grsai2kModel: image2kModel || "gpt-image-2-vip",
    grsaiConcurrency: Math.max(1, Math.min(12, Number($("#grsaiConcurrency").value || 6)))
  };

  state.config = await window.studio.saveConfig({ ...state.config, ...next });
  state.imageModelRoute = imageModelRoute;
  populateModelRouteSelect();
  syncImageModelRouteUi();
  updateApiState();
  els.settingsDrawer.classList.add("hidden");
  toast("设置已保存");
}

async function saveCurrentPromptApiKey() {
  const provider = currentSettingsProvider();
  const promptApiKey = $("#promptApiKey").value.trim();
  if (!promptApiKey) {
    showMessageModal("当前 API Key 是空的，无法保存。", "保存失败", "error");
    return;
  }
  const promptProviderKeys = setPromptApiKeyForProvider(provider, promptApiKey);
  state.config = await window.studio.saveConfig({
    ...state.config,
    promptProvider: provider,
    promptBaseUrl: $("#promptBaseUrl").value.trim(),
    promptEndpoint: $("#promptEndpoint").value || "chat",
    promptApiKey,
    promptProviderKeys
  });
  state.config.promptProviderKeys = promptProviderKeys;
  state.config.promptApiKey = promptApiKey;
  syncPromptApiKeyForProvider(provider);
  renderProviderList();
  const preset = promptProviderPreset(provider);
  toast(`${preset.label} 的 API Key 已保存到本机。`);
}

async function saveCurrentImageApiKey() {
  const settings = collectImageApiSettings();
  const provider = settings.imageProvider || "grsai";
  const imageApiKey = settings.imageApiKey;
  if (!imageApiKey) {
    showMessageModal("当前作图 API Key 是空的，无法保存。", "保存失败", "error");
    return;
  }
  const imageProviderKeys = setImageApiKeyForProvider(provider, imageApiKey);
  state.config = await window.studio.saveConfig({
    ...state.config,
    imageProvider: provider,
    imageProviderType: settings.imageProviderType,
    imageBaseUrl: settings.imageBaseUrl,
    imageApiKey,
    grsaiBaseUrl: settings.imageBaseUrl,
    grsaiApiKey: imageApiKey,
    image1kModel: settings.image1kModel,
    image2kModel: settings.image2kModel,
    grsai1kModel: settings.image1kModel || "gpt-image-2",
    grsai2kModel: settings.image2kModel || "gpt-image-2-vip",
    imageProviderKeys
  });
  state.config.imageProviderKeys = imageProviderKeys;
  state.config.imageApiKey = imageApiKey;
  state.config.grsaiApiKey = imageApiKey;
  syncImageApiKeyForProvider(provider);
  const preset = IMAGE_PROVIDER_PRESETS[provider] || IMAGE_PROVIDER_PRESETS.custom;
  toast(`${preset.label} 的作图 API Key 已保存到本机。`);
}

async function rememberCurrentImageModels() {
  const settings = collectImageApiSettings();
  const provider = settings.imageProvider || "grsai";
  const image1kModel = settings.image1kModel;
  const image2kModel = settings.image2kModel;
  if (!image1kModel && !image2kModel) return;
  const remembered = rememberImageModelsForProvider(provider, image1kModel, image2kModel);
  state.config = await window.studio.saveConfig({
    ...state.config,
    imageProvider: provider,
    imageProviderType: settings.imageProviderType,
    imageBaseUrl: settings.imageBaseUrl,
    grsaiBaseUrl: settings.imageBaseUrl,
    image1kModel,
    image2kModel,
    grsai1kModel: image1kModel || "gpt-image-2",
    grsai2kModel: image2kModel || "gpt-image-2-vip",
    ...remembered
  });
  state.config.image1kModel = image1kModel || "gpt-image-2";
  state.config.image2kModel = image2kModel || "gpt-image-2-vip";
  syncImageModelOptions(provider, image1kModel, image2kModel);
}

async function testPromptApiConnection() {
  const settings = collectPromptApiSettings();
  if (!settings.promptBaseUrl || !settings.promptApiKey || !settings.promptModel) {
    showMessageModal("请先填写 API 地址、API Key 和模型名，再检测连接。", "无法检测 API", "error");
    return;
  }

  const button = $("#testPromptApiBtn");
  const status = $("#promptApiActionStatus");
  button.disabled = true;
  if (status) status.textContent = "正在检测连接，请稍后...";
  try {
    const result = await window.studio.testPromptApi(settings);
    const remembered = rememberPromptModelForProvider(settings.promptProvider, settings.promptModel);
    state.config = await window.studio.saveConfig({
      ...state.config,
      promptProvider: settings.promptProvider,
      promptBaseUrl: settings.promptBaseUrl,
      promptApiKey: settings.promptApiKey,
      promptProviderKeys: setPromptApiKeyForProvider(settings.promptProvider, settings.promptApiKey),
      promptModel: settings.promptModel,
      promptEndpoint: settings.promptEndpoint,
      promptProviderApiOptions: collectApiAdvancedOptions(settings.promptProvider),
      promptModelCapabilities: getPromptModelCapabilitiesMap(),
      ...remembered
    });
    setPromptModelOptions(getProviderModelOptions(settings.promptProvider), settings.promptModel, false);
    renderProviderList();
    renderPromptModelList(settings.promptProvider);
    updateApiState();
    renderPlanningModelLabel();
    const modelText = result?.model ? `\n当前测试模型：${result.model}` : "";
    const requestText = result?.requestUrl ? `\n本次检测请求地址：${result.requestUrl}` : "";
    const endpointText = result?.endpoint ? `\n接口类型：${result.endpoint}` : "";
    showMessageModal(`恭喜，API已成功连接，并已保存为当前 AI 分析模型。${modelText}${endpointText}${requestText}`, "连接成功", "success");
    if (status) status.textContent = "连接检测成功，已保存为当前 AI 分析配置。";
  } catch (error) {
    const message = humanizeErrorMessage(error);
    showMessageModal(message || "API 检测失败，请检查配置。", "连接失败", "error");
    if (status) status.textContent = "连接检测失败，请查看弹窗说明。";
  } finally {
    button.disabled = false;
  }
}

async function fetchPromptModels() {
  const settings = collectPromptApiSettings();
  if (!settings.promptBaseUrl || !settings.promptApiKey) {
    showMessageModal("请先填写 API 地址和 API Key，再获取模型列表。", "无法获取模型列表", "error");
    return;
  }

  const button = $("#fetchPromptModelsBtn");
  const status = $("#promptApiActionStatus");
  button.disabled = true;
  if (status) status.textContent = "正在获取模型列表...";
  try {
    const result = await window.studio.listPromptModels(settings);
    const models = Array.isArray(result?.models) ? result.models : [];
    if (!models.length) {
      showMessageModal("接口已返回，但没有读取到模型名称。请确认该供应商是否开放 /models 接口。", "未获取到模型", "error");
      return;
    }
    const provider = settings.promptProvider || "custom";
    const selectedModel = settings.promptModel || models[0];
    const promptProviderModels = {
      ...getPromptProviderModels(),
      [provider]: uniqueModelOptions(models).slice(0, 200)
    };
    const promptProviderLastModels = {
      ...getPromptProviderLastModels(),
      [provider]: selectedModel
    };
    state.config = await window.studio.saveConfig({
      ...state.config,
      promptProvider: provider,
      promptBaseUrl: settings.promptBaseUrl,
      promptApiKey: settings.promptApiKey,
      promptProviderKeys: setPromptApiKeyForProvider(provider, settings.promptApiKey),
      promptModel: selectedModel,
      promptEndpoint: settings.promptEndpoint,
      promptProviderModels,
      promptProviderLastModels,
      promptProviderApiOptions: collectApiAdvancedOptions(provider),
      promptModelCapabilities: getPromptModelCapabilitiesMap()
    });
    setPromptModelOptions(models.slice(0, 200), selectedModel, true);
    renderProviderList();
    renderPromptModelList(provider);
    const shown = models.slice(0, 24).join("\n");
    showMessageModal(`已获取 ${models.length} 个模型。\n\n${shown}${models.length > 24 ? "\n..." : ""}`, "模型列表", "success");
    if (status) status.textContent = `已获取 ${models.length} 个模型，可直接在下拉框选择。`;
  } catch (error) {
    const message = humanizeErrorMessage(error);
    showMessageModal(message || "获取模型列表失败，请检查 API 配置。", "获取失败", "error");
    if (status) status.textContent = "获取模型列表失败，请查看弹窗说明。";
  } finally {
    button.disabled = false;
  }
}

async function testImageApiConnection() {
  const settings = collectImageApiSettings();
  if (!settings.imageBaseUrl || !settings.imageApiKey) {
    showMessageModal("请先填写作图 API 地址和作图 API Key，再检测连接。", "无法检测作图 API", "error");
    return;
  }

  const testModel = await openImageTestModelDialog(settings);
  if (!testModel) return;
  const testSettings = {
    ...settings,
    imageModelRoute: testModel,
    image1kModel: testModel,
    image2kModel: testModel
  };

  const button = $("#testImageApiBtn");
  const status = $("#imageApiActionStatus");
  button.disabled = true;
  if (status) status.textContent = `正在真实检测作图模型 ${testModel}，请稍后...`;
  try {
    const result = await window.studio.testImageApi(testSettings);
    const shouldPinTestedModel = testModel && testModel === resolveCurrentImageModel();
    const nextImageModelRoute = shouldPinTestedModel ? testModel : settings.imageModelRoute;
    const remembered = rememberImageModelsForProvider(settings.imageProvider, settings.image1kModel, settings.image2kModel);
    state.config = await window.studio.saveConfig({
      ...state.config,
      imageProvider: settings.imageProvider,
      imageProviderType: settings.imageProviderType,
      imageBaseUrl: settings.imageBaseUrl,
      grsaiBaseUrl: settings.imageBaseUrl,
      imageApiKey: settings.imageApiKey,
      grsaiApiKey: settings.imageApiKey,
      imageProviderKeys: setImageApiKeyForProvider(settings.imageProvider, settings.imageApiKey),
      imageModelRoute: nextImageModelRoute,
      image1kModel: settings.image1kModel,
      image2kModel: settings.image2kModel,
      grsai1kModel: settings.image1kModel || "gpt-image-2",
      grsai2kModel: settings.image2kModel || "gpt-image-2-vip",
      ...remembered
    });
    state.imageModelRoute = normalizeImageModelRoute(nextImageModelRoute);
    syncImageModelOptions(settings.imageProvider, settings.image1kModel, settings.image2kModel);
    const modelText = [settings.image1kModel, settings.image2kModel].filter(Boolean).join(" / ");
    showMessageModal(`恭喜，作图 API 真实检测已通过。\n本次检测模型：${testModel}${shouldPinTestedModel ? "\n已固定为当前正式生成模型。" : ""}${modelText ? `\n当前作图模型：${modelText}` : ""}${result?.note ? `\n${result.note}` : ""}`, "连接成功", "success");
    if (status) status.textContent = `作图 API 真实检测成功：${testModel}`;
  } catch (error) {
    const message = humanizeErrorMessage(error);
    showMessageModal(message || "作图 API 检测失败，请检查配置。", "连接失败", "error");
    if (status) status.textContent = "作图 API 连接检测失败，请查看弹窗说明。";
  } finally {
    button.disabled = false;
  }
}

async function fetchImageModels() {
  const settings = collectImageApiSettings();
  const canUsePresetList = ["midjourney", "bfl"].includes(settings.imageProvider);
  if ((!settings.imageBaseUrl || !settings.imageApiKey) && !canUsePresetList) {
    showMessageModal("请先填写作图 API 地址和作图 API Key，再获取模型列表。", "无法获取作图模型列表", "error");
    return;
  }

  const button = $("#fetchImageModelsBtn");
  const status = $("#imageApiActionStatus");
  button.disabled = true;
  if (status) status.textContent = "正在获取作图模型列表...";
  try {
    const result = await window.studio.listImageModels(settings);
    const models = Array.isArray(result?.models) ? uniqueModelOptions(result.models).slice(0, 200) : [];
    if (!models.length) {
      showMessageModal("接口已返回，但没有读取到作图模型名称。请确认该供应商是否开放 /models 接口。", "未获取到模型", "error");
      return;
    }
    const provider = settings.imageProvider || "grsai";
    const selected1k = settings.image1kModel || models[0];
    const selected2k = settings.image2kModel || selected1k;
    const imageProviderModels = {
      ...getImageProviderModels(),
      [provider]: models
    };
    const imageProviderLastModels = {
      ...getImageProviderLastModels(),
      [`${provider}:1k`]: selected1k,
      [`${provider}:2k`]: selected2k
    };
    state.config = await window.studio.saveConfig({
      ...state.config,
      imageProvider: provider,
      imageProviderType: settings.imageProviderType,
      imageBaseUrl: settings.imageBaseUrl,
      grsaiBaseUrl: settings.imageBaseUrl,
      imageApiKey: settings.imageApiKey,
      grsaiApiKey: settings.imageApiKey,
      imageProviderKeys: setImageApiKeyForProvider(provider, settings.imageApiKey),
      imageModelRoute: settings.imageModelRoute,
      image1kModel: selected1k,
      image2kModel: selected2k,
      grsai1kModel: selected1k || "gpt-image-2",
      grsai2kModel: selected2k || "gpt-image-2-vip",
      imageProviderModels,
      imageProviderLastModels
    });
    state.imageModelRoute = normalizeImageModelRoute(settings.imageModelRoute);
    syncImageModelOptions(provider, selected1k, selected2k);
    const shown = models.slice(0, 24).join("\n");
    showMessageModal(`已获取 ${models.length} 个作图模型。\n\n${shown}${models.length > 24 ? "\n..." : ""}${result?.note ? `\n\n${result.note}` : ""}`, "作图模型列表", "success");
    if (status) status.textContent = `已获取 ${models.length} 个作图模型，可直接在下拉框选择。`;
  } catch (error) {
    const message = humanizeErrorMessage(error);
    showMessageModal(message || "获取作图模型列表失败，请检查 API 配置。", "获取失败", "error");
    if (status) status.textContent = "获取作图模型列表失败，请查看弹窗说明。";
  } finally {
    button.disabled = false;
  }
}

function bindEvents() {
  els.fileInput.addEventListener("change", (event) => addFiles(event.target.files));
  els.titleFileInput.addEventListener("change", (event) => addFiles(event.target.files));
  els.cutoutFileInput.addEventListener("change", (event) => handleCutoutImageFiles(event.target.files));

  els.sideNavItems.forEach((button) => {
    button.addEventListener("click", () => setRoute(button.dataset.route));
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    els.dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      els.dropzone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    els.dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropzone.classList.remove("dragging");
    });
  });

  els.dropzone.addEventListener("drop", handleProductImageDrop);

  ["dragenter", "dragover"].forEach((eventName) => {
    els.titleDropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      els.titleDropzone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    els.titleDropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.titleDropzone.classList.remove("dragging");
    });
  });

  els.titleDropzone.addEventListener("drop", handleTitleImageDrop);

  ["dragenter", "dragover"].forEach((eventName) => {
    els.cutoutDropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      els.cutoutDropzone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    els.cutoutDropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.cutoutDropzone.classList.remove("dragging");
    });
  });

  els.cutoutDropzone.addEventListener("drop", handleCutoutImageDrop);

  els.productName?.addEventListener("input", () => {
    updateProductInfoCharCount();
    markProductFactsEdited();
  });
  els.productInfo.addEventListener("input", () => {
    updateProductInfoCharCount();
    markProductFactsEdited();
  });
  bindPackageModeTabs();
  syncProductModeUi();

  els.analyzeBtn.addEventListener("click", analyze);
  els.generateBtn.addEventListener("click", generate);
  els.titleGenerateBtn.addEventListener("click", generateTitle);
  els.copyTitleBtn.addEventListener("click", copyTitleToClipboard);
  els.cutoutActionBtn.addEventListener("click", (event) => {
    event.preventDefault();
    if (state.cutoutGenerating) return;
    if (getCutoutSelectedFile()) {
      generateWhiteBackground();
    } else {
      els.cutoutFileInput.click();
    }
  });

  els.titlePlatformGroup.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.title.platform = normalizeTitlePlatform(button.dataset.value);
      syncTitleChoiceButtons();
      syncTitleInputsFromImage();
    });
  });

  els.titlePackageMode.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.title.productPackageMode = button.dataset.value || "single";
      syncTitleChoiceButtons();
    });
  });

  $$(".kind-row").forEach((row) => {
    const kind = row.dataset.kind;
    row.querySelector('input[name="imageKind"]').addEventListener("change", () => {
      const checked = row.querySelector('input[name="imageKind"]').checked;
      state.kindCounts[kind] = checked ? Math.max(1, Number(state.kindCounts[kind] || 0)) : 0;
      syncKindCountDisplay();
    });
    row.querySelector('[data-kind-action="minus"]').addEventListener("click", () => {
      state.kindCounts[kind] = Math.max(0, Number(state.kindCounts[kind] || 0) - 1);
      syncKindCountDisplay();
    });
    row.querySelector('[data-kind-action="plus"]').addEventListener("click", () => {
      const nextCount = Number(state.kindCounts[kind] || 0) + 1;
      if (nextCount > 10) {
        toast("单个分类图片的最高数量限制为10", "error");
      }
      state.kindCounts[kind] = Math.min(10, nextCount);
      syncKindCountDisplay();
    });
    row.querySelector("[data-kind-count]").addEventListener("change", (event) => {
      const nextCount = Number(event.currentTarget.value || 0);
      if (nextCount > 10) {
        toast("单个分类图片的最高数量限制为10", "error");
      }
      state.kindCounts[kind] = Math.max(0, Math.min(10, Number.isFinite(nextCount) ? nextCount : 0));
      syncKindCountDisplay();
    });
  });

  els.aPlusSize.addEventListener("change", () => {
    state.aPlusSize = els.aPlusSize.value;
  });

  bindChoiceGroup("#resolutionGroup", "resolution");
  bindChoiceGroup("#ratioGroup", "ratio");

  $("#openBrandBtn").addEventListener("click", openBrandDrawer);
  $("#closeBrandBtn").addEventListener("click", () => els.brandDrawer.classList.add("hidden"));
  $("#saveBrandBtn").addEventListener("click", saveBrand);

  $("#openSettingsBtn").addEventListener("click", openSettingsDrawer);
  $("#closeSettingsBtn").addEventListener("click", () => els.settingsDrawer.classList.add("hidden"));
  $("#saveSettingsBtn").addEventListener("click", saveSettings);
  $("#promptProvider")?.addEventListener("change", (event) => {
    handlePromptProviderChange(event.currentTarget.value);
  });
  $("#applyProviderPresetBtn")?.addEventListener("click", () => applyPromptProviderPreset(currentSettingsProvider()));
  $("#promptModel").addEventListener("change", syncPromptModelCustomInput);
  $("#promptModelCustom").addEventListener("blur", rememberCurrentPromptModel);
  $("#promptModelCustom").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      rememberCurrentPromptModel();
    }
  });
  $("#savePromptApiKeyBtn").addEventListener("click", saveCurrentPromptApiKey);
  els.providerSearch?.addEventListener("input", renderProviderList);
  els.addProviderBtn?.addEventListener("click", openProviderAddModal);
  els.promptApiSettingsBtn?.addEventListener("click", openApiAdvancedModal);
  els.promptProviderToggle?.addEventListener("change", () => {
    if (!els.promptProviderToggle.checked) {
      $("#promptApiKey").value = "";
      setPromptApiKeyForProvider(currentSettingsProvider(), "");
      renderProviderList();
    }
  });
  $("#promptBaseUrl")?.addEventListener("input", () => syncPromptProviderUi());
  $("#promptEndpoint")?.addEventListener("change", () => syncPromptProviderUi());
  els.addPromptModelBtn?.addEventListener("click", () => openModelEditModal(currentSettingsProvider(), ""));
  els.closeApiAdvancedBtn?.addEventListener("click", closeApiAdvancedModal);
  els.apiAdvancedModal?.addEventListener("click", (event) => {
    if (event.target === els.apiAdvancedModal) closeApiAdvancedModal();
  });
  els.closeProviderAddBtn?.addEventListener("click", () => els.providerAddModal?.classList.add("hidden"));
  els.cancelProviderAddBtn?.addEventListener("click", () => els.providerAddModal?.classList.add("hidden"));
  els.confirmProviderAddBtn?.addEventListener("click", confirmProviderAdd);
  els.providerAddModal?.addEventListener("click", (event) => {
    if (event.target === els.providerAddModal) els.providerAddModal.classList.add("hidden");
  });
  els.closeModelEditBtn?.addEventListener("click", () => els.modelEditModal?.classList.add("hidden"));
  els.modelEditSaveBtn?.addEventListener("click", saveModelEdit);
  els.modelEditModal?.addEventListener("click", (event) => {
    if (event.target === els.modelEditModal) els.modelEditModal.classList.add("hidden");
  });
  $("#imageProvider").addEventListener("change", (event) => {
    handleImageProviderChange(event.currentTarget.value);
  });
  $("#applyImageProviderPresetBtn").addEventListener("click", () => applyImageProviderPreset($("#imageProvider").value));
  els.imageTestModelSelect?.addEventListener("change", syncImageTestModelCustomInput);
  els.imageTestStartBtn?.addEventListener("click", () => {
    const model = selectedImageTestModel();
    if (!model) {
      toast("请先选择或填写要检测的作图模型。", "error");
      return;
    }
    closeImageTestModal(model);
  });
  els.imageTestCancelBtn?.addEventListener("click", () => closeImageTestModal(null));
  els.imageTestCloseX?.addEventListener("click", () => closeImageTestModal(null));
  els.imageTestModal?.addEventListener("click", (event) => {
    if (event.target === els.imageTestModal) closeImageTestModal(null);
  });
  $$("#modelTierTabs button").forEach((button) => {
    button.addEventListener("click", async () => {
      state.imageModelTier = normalizeImageModelTier(button.dataset.tier);
      state.imageModelRoute = "auto";
      state.config = await window.studio.saveConfig({
        ...state.config,
        imageModelRoute: state.imageModelRoute
      });
      syncImageModelRouteUi();
    });
  });
  $("#modelRoute").addEventListener("change", async (event) => {
    state.imageModelRoute = normalizeImageModelRoute(event.currentTarget.value);
    state.config = await window.studio.saveConfig({
      ...state.config,
      imageModelRoute: state.imageModelRoute
    });
    syncImageModelRouteUi();
  });
  $("#grsai1kModel").addEventListener("change", () => {
    syncCustomModelInput("#grsai1kModel", "#grsai1kModelCustom");
    if ($("#grsai1kModel").value !== CUSTOM_MODEL_VALUE) rememberCurrentImageModels();
  });
  $("#grsai2kModel").addEventListener("change", () => {
    syncCustomModelInput("#grsai2kModel", "#grsai2kModelCustom");
    if ($("#grsai2kModel").value !== CUSTOM_MODEL_VALUE) rememberCurrentImageModels();
  });
  $("#grsai1kModelCustom").addEventListener("blur", rememberCurrentImageModels);
  $("#grsai2kModelCustom").addEventListener("blur", rememberCurrentImageModels);
  $("#saveImageApiKeyBtn").addEventListener("click", saveCurrentImageApiKey);
  $("#testPromptApiBtn").addEventListener("click", testPromptApiConnection);
  $("#fetchPromptModelsBtn").addEventListener("click", fetchPromptModels);
  $("#testImageApiBtn").addEventListener("click", testImageApiConnection);
  $("#fetchImageModelsBtn").addEventListener("click", fetchImageModels);
  els.saveSelectedBtn?.addEventListener("click", saveSelectedResult);
  els.openSelectedBtn?.addEventListener("click", openSelectedResult);
  els.regenerateSelectedBtn?.addEventListener("click", regenerateSelectedResult);
  els.clearRepairMarksBtn?.addEventListener("click", resetRepairCanvas);
  els.repairSelectedBtn?.addEventListener("click", repairSelectedResult);
  els.repairCanvas?.addEventListener("pointerdown", beginRepairDrawing);
  els.repairCanvas?.addEventListener("pointermove", moveRepairDrawing);
  window.addEventListener("pointerup", endRepairDrawing);
  els.repairCanvas?.addEventListener("touchstart", beginRepairDrawing, { passive: false });
  els.repairCanvas?.addEventListener("touchmove", moveRepairDrawing, { passive: false });
  window.addEventListener("touchend", endRepairDrawing);
  els.recoverHistoryBtn?.addEventListener("click", recoverHistoryFromCache);

  els.closeImageViewer.addEventListener("click", closeImageViewer);
  els.imageViewer.addEventListener("click", (event) => {
    if (event.target === els.imageViewer) closeImageViewer();
  });

  els.errorModalClose.addEventListener("click", closeErrorModal);
  els.errorModalCloseX.addEventListener("click", closeErrorModal);
  els.errorModal.addEventListener("click", (event) => {
    if (event.target === els.errorModal) closeErrorModal();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.imageViewer.classList.contains("hidden")) {
      closeImageViewer();
    }
    if (event.key === "Escape" && !els.cutoutConfirm.classList.contains("hidden")) {
      closeCutoutConfirm();
    }
    if (event.key === "Escape" && els.repairResultModal && !els.repairResultModal.classList.contains("hidden")) {
      closeRepairResultModal();
    }
    if (event.key === "Escape" && !els.errorModal.classList.contains("hidden")) {
      closeErrorModal();
    }
    if (event.key === "Escape" && els.imageTestModal && !els.imageTestModal.classList.contains("hidden")) {
      closeImageTestModal(null);
    }
  });

  els.cutoutCancelX.addEventListener("click", closeCutoutConfirm);
  els.cutoutCancelBtn.addEventListener("click", closeCutoutConfirm);
  els.cutoutSaveBtn?.addEventListener("click", savePendingCutoutResult);
  els.cutoutConfirm.addEventListener("click", (event) => {
    if (event.target === els.cutoutConfirm) closeCutoutConfirm();
  });
  els.cutoutConfirmBtn.addEventListener("click", async () => {
    if (pendingCutoutResult?.url && els.cutoutUploadConfirm.checked) {
      const added = await addImageUrlToProductImages(pendingCutoutResult.url, `white-background-${Date.now()}.png`);
      if (added) toast("白底图已上传到产品图。");
    }
    closeCutoutConfirm();
  });
  els.repairResultCloseX?.addEventListener("click", closeRepairResultModal);
  els.repairResultCloseBtn?.addEventListener("click", closeRepairResultModal);
  els.repairResultSaveBtn?.addEventListener("click", savePendingRepairResult);
  els.repairResultModal?.addEventListener("click", (event) => {
    if (event.target === els.repairResultModal) closeRepairResultModal();
  });

  window.studio.onGenerationBatch?.((batch) => {
    if (batch.generationId && batch.generationId !== state.activeGenerationId) return;
    renderPendingResults(batch.items || [], batch.concurrency || 1);
    els.statusLine.textContent = `已提交 ${batch.total || 0} 张任务，并发 ${batch.concurrency || 1} 路生成`;
  });

  window.studio.onGenerationPlan?.((payload) => {
    if (payload.generationId && payload.generationId !== state.activeGenerationId) return;
    renderSuitePlan(payload.suitePlan || null);
    renderPromptPlan(payload.promptPlan || []);
  });

  window.studio.onGenerationProgress((progress) => {
    if (progress.generationId && progress.generationId !== state.activeGenerationId) return;
    updatePendingCard(progress);
    if (progress.current) {
      state.liveProgressByIndex[progress.current] = progress;
    }
    const label = progress.total
      ? progress.stage === "planning-suite"
        ? `正在调用提示词模型规划套图 ${progress.total} 张`
        : progress.stage === "rewriting-prompts"
        ? `正在调用提示词模型生成分类提示词 ${progress.current}/${progress.total}`
        : `第 ${progress.current}/${progress.total} 张 · ${progress.kind || "结果图"} · ${progress.model || progress.status || "生成中"}`
      : progress.stage || "生成中";
    if (progress.status === "failed" || progress.status === "timeout") {
      setProgressFailed(`${progress.kind || "图片"}${progress.status === "timeout" ? "超时" : "失败"}：${shortErrorMessage(progress.error || progress.model || "")}`);
      return;
    }
    const progressValues = Object.values(state.liveProgressByIndex).map((item) => Number(item.progress || 0));
    const averageProgress = progress.total && progressValues.length
      ? progressValues.reduce((sum, value) => sum + value, 0) / progress.total
      : progress.progress || 8;
    setProgress(averageProgress, label);
  });

  window.studio.onGenerationResult((payload) => {
    if (payload.generationId && payload.generationId !== state.activeGenerationId) return;
    const results = payload.results || [];
    state.liveCompletedCount += 1;
    const total = payload.total || state.liveTotalCount || state.liveCompletedCount;
    if (payload.current) {
      state.liveProgressByIndex[payload.current] = {
        ...(state.liveProgressByIndex[payload.current] || {}),
        progress: 100
      };
      const progressValues = Object.values(state.liveProgressByIndex).map((item) => Number(item.progress || 0));
      setProgress(progressValues.reduce((sum, value) => sum + value, 0) / total, `已完成 ${state.liveCompletedCount}/${total} 张`);
    }
    for (const result of results) {
      const liveIndex = payload.current ? payload.current - 1 : state.liveResults.length;
      state.liveResults[liveIndex] = result;
      replaceResultCard(result, payload.current || liveIndex + 1, liveIndex);
      if (state.selectedResultIndex < 0) selectResult(liveIndex);
    }
    if (!results.length) {
      const fallback = {
        kind: payload.kind,
        status: payload.status || "failed",
        error: payload.error || "未返回图片结果"
      };
      const liveIndex = payload.current ? payload.current - 1 : state.liveResults.length;
      state.liveResults[liveIndex] = fallback;
      replaceResultCard(fallback, payload.current || liveIndex + 1, liveIndex);
      if (state.selectedResultIndex < 0) selectResult(liveIndex);
    }
    els.statusLine.textContent = `已完成 ${state.liveCompletedCount}/${total} 张`;
  });
}

async function init() {
  if (appInitialized) return;
  appInitialized = true;
  bindEvents();
  state.config = ensureDefaultGrsaiGeminiConfig(await window.studio.getConfig());
  state.selectedPromptProvider = state.config.promptProvider || "grsai-gemini";
  state.imageModelRoute = normalizeImageModelRoute(state.config.imageModelRoute);
  state.brand.region = state.config.defaultRegion || "US";
  state.brand.language = state.config.defaultLanguage || "English";
  state.brand.platform = state.config.defaultPlatform || "Amazon";
  state.title.platform = "Temu";
  state.title.productPackageMode = state.productPackageMode || "single";
  updateApiState();
  updateBrandSummary();
  updateAPlusSizeOptions(state.brand.platform);
  syncKindCountDisplay();
  syncTitleChoiceButtons();
  syncTitleInputsFromImage();
  updateProductUploadStatus();
  resetCutoutSelection();
  renderTitleThumbs();
  renderTitleResult(null);
  populateModelRouteSelect();
  syncImageModelRouteUi();
  setRoute(localStorage.getItem(ACTIVE_ROUTE_STORAGE_KEY) || "image");
  await loadHistory();
}

function loadInviteSettings() {
  const autoLogin = localStorage.getItem(AUTO_LOGIN_STORAGE_KEY);
  const rememberInvite = localStorage.getItem(REMEMBER_INVITE_STORAGE_KEY) === "1";
  const savedInvite = localStorage.getItem(INVITE_STORAGE_KEY) || "";

  els.autoLogin.checked = autoLogin === null ? true : autoLogin === "1";
  els.rememberInvite.checked = rememberInvite;
  if (rememberInvite) els.inviteCode.value = savedInvite;

  if (els.autoLogin.checked && savedInvite === INVITE_CODE) {
    unlockApp();
  } else {
    els.inviteGate.classList.remove("hidden");
    els.app.classList.add("hidden");
    els.inviteCode.focus();
  }
}

function saveInviteSettings() {
  localStorage.setItem(AUTO_LOGIN_STORAGE_KEY, els.autoLogin.checked ? "1" : "0");
  localStorage.setItem(REMEMBER_INVITE_STORAGE_KEY, els.rememberInvite.checked ? "1" : "0");
  if (els.rememberInvite.checked || els.autoLogin.checked) {
    localStorage.setItem(INVITE_STORAGE_KEY, els.inviteCode.value.trim());
  } else {
    localStorage.removeItem(INVITE_STORAGE_KEY);
  }
}

function unlockApp() {
  els.inviteGate.classList.add("hidden");
  els.app.classList.remove("hidden");
  init().catch((error) => {
    toast(error.message, "error");
  });
}

function submitInvite() {
  const value = els.inviteCode.value.trim();
  if (value !== INVITE_CODE) {
    els.inviteError.classList.remove("hidden");
    els.inviteCode.select();
    return;
  }

  els.inviteError.classList.add("hidden");
  saveInviteSettings();
  unlockApp();
}

els.inviteSubmit.addEventListener("click", submitInvite);
els.inviteCode.addEventListener("keydown", (event) => {
  if (event.key === "Enter") submitInvite();
});
els.autoLogin.addEventListener("change", saveInviteSettings);
els.rememberInvite.addEventListener("change", saveInviteSettings);

loadInviteSettings();
