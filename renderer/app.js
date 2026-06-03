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
  featureImageModelRoutes: {
    aplus: "auto"
  },
  imageModelTier: "standard",
  referenceStrategy: "auto",
  suitePlan: null,
  promptPlan: [],
  selectedResultIndex: -1,
  viewResults: {
    image: [],
    aplus: []
  },
  viewSelectedResultIndex: {
    image: -1,
    aplus: -1
  },
  viewLiveCompletedCount: {
    image: 0,
    aplus: 0
  },
  viewLiveTotalCount: {
    image: 0,
    aplus: 0
  },
  viewLiveProgressByIndex: {
    image: {},
    aplus: {}
  },
  viewSuitePlan: {
    image: null,
    aplus: null
  },
  viewPromptPlan: {
    image: [],
    aplus: []
  },
  autoFilledProductInfo: "",
  productFactsReviewPending: false,
  lastAnalyzedProductFacts: "",
  repairHasMarks: false,
  productPackageMode: "single",
  suiteMode: "custom",
  kindCounts: {
    白底图: 1,
    SKU图: 1,
    场景图: 2,
    卖点图: 2,
    "A+/细节标注图": 0
  },
  aPlusSize: "970x300",
  activeGenerationView: "image",
  activeGenerationId: null,
  activeGenerationStartedAt: 0,
  lastGenerationProgressAt: 0,
  generationProgressReceived: false,
  generationScopeById: {},
  generationFinishResolvers: {},
  liveResults: [],
  liveCompletedCount: 0,
  liveTotalCount: 0,
  liveProgressByIndex: {},
  workflowSteps: [],
  analysis: null,
  route: "image",
  ai: {
    mode: "chat",
    imageModelRoute: "auto",
    images: [],
    files: [],
    messages: []
  },
  update: {
    latest: null,
    checking: false
  },
  title: {
    platform: "Amazon",
    productPackageMode: "single",
    result: null
  },
  aplus: {
    images: [],
    analysis: null,
    productName: "",
    productInfo: "",
    format: "970x600"
  }
};

const INVITE_CODE = "hghlx88888888";
const INVITE_STORAGE_KEY = "productImageStudioInvite";
const AUTO_LOGIN_STORAGE_KEY = "productImageStudioAutoLogin";
const REMEMBER_INVITE_STORAGE_KEY = "productImageStudioRememberInvite";
const ACTIVE_ROUTE_STORAGE_KEY = "productImageStudioRoute";
const UPDATE_REMIND_LATER_STORAGE_KEY = "productImageStudioUpdateRemindLaterUntil";
const RENDERER_BUILD_ID = "renderer-0.1.56-local-prompt-quality";
const PROMPT_SCOPE_KEYS = ["image", "aplus", "ai"];
let progressHideTimer = null;
let generationWatchdogTimer = null;

function normalizeResultScope(scope = "image") {
  return ["image", "aplus"].includes(scope) ? scope : "image";
}

function normalizePromptScope(scope = "image") {
  return PROMPT_SCOPE_KEYS.includes(scope) ? scope : "image";
}

function generationResultScope() {
  return normalizeResultScope(state.activeGenerationId ? state.activeGenerationView : state.route);
}

function rememberGenerationScope(generationId, scope = "image") {
  if (!generationId) return;
  state.generationScopeById[generationId] = normalizeResultScope(scope);
}

function generationScopeFromEvent(payload = {}) {
  const payloadScope = payload?.featureScope || payload?.scope;
  if (payloadScope) return normalizeResultScope(payloadScope);
  if (payload?.generationId && state.generationScopeById[payload.generationId]) {
    return normalizeResultScope(state.generationScopeById[payload.generationId]);
  }
  if (state.activeGenerationId && state.generationScopeById[state.activeGenerationId]) {
    return normalizeResultScope(state.generationScopeById[state.activeGenerationId]);
  }
  if (state.activeGenerationId) return normalizeResultScope(state.activeGenerationView);
  return visibleResultScope();
}

function visibleResultScope() {
  return normalizeResultScope(state.route);
}

function scopedResults(scope = visibleResultScope()) {
  const key = normalizeResultScope(scope);
  return state.viewResults[key] || [];
}

function setScopedResults(scope, results) {
  const key = normalizeResultScope(scope);
  state.viewResults[key] = Array.isArray(results) ? results.slice() : [];
  if (key === "image") state.liveResults = state.viewResults[key];
}

function scopedSelectedIndex(scope = visibleResultScope()) {
  const key = normalizeResultScope(scope);
  return Number(state.viewSelectedResultIndex[key] ?? -1);
}

function setScopedSelectedIndex(scope, index) {
  const key = normalizeResultScope(scope);
  state.viewSelectedResultIndex[key] = Number(index);
  if (key === "image") state.selectedResultIndex = state.viewSelectedResultIndex[key];
}

function productImagesForScope(scope = "image") {
  const key = normalizeResultScope(scope);
  if (key === "aplus") return state.aplus.images;
  return state.images;
}

function analysisForScope(scope = "image") {
  const key = normalizeResultScope(scope);
  if (key === "aplus") return state.aplus.analysis || null;
  return state.analysis || null;
}

function setAnalysisForScope(scope, analysis) {
  const key = normalizeResultScope(scope);
  if (key === "aplus") state.aplus.analysis = analysis || null;
  else state.analysis = analysis || null;
}

function getPromptScopeConfigs() {
  const configs = state.config?.promptScopeConfigs;
  return configs && typeof configs === "object" ? configs : {};
}

function compactPromptScopeConfig(config = {}) {
  const provider = String(config.promptProvider || "").trim() || "custom";
  const preset = promptProviderPreset(provider);
  const endpoint = String(config.promptEndpoint || preset.promptEndpoint || "chat").trim();
  return {
    promptProvider: provider,
    promptBaseUrl: String(config.promptBaseUrl || preset.promptBaseUrl || "").trim(),
    promptModel: String(config.promptModel || preset.promptModel || "").trim(),
    promptEndpoint: ["responses", "chat", "auto", "gemini", "anthropic"].includes(endpoint) ? endpoint : (preset.promptEndpoint || "chat")
  };
}

function currentGlobalPromptScopeConfig() {
  const provider = state.config?.promptProvider || currentSettingsProvider() || "custom";
  const preset = promptProviderPreset(provider);
  return compactPromptScopeConfig({
    promptProvider: provider,
    promptBaseUrl: state.config?.promptBaseUrl || preset.promptBaseUrl || "",
    promptModel: state.config?.promptModel || getLastPromptModel(provider) || preset.promptModel || "",
    promptEndpoint: state.config?.promptEndpoint || preset.promptEndpoint || "chat"
  });
}

function ensurePromptScopeDefaults(config = {}) {
  const base = currentGlobalPromptScopeConfigForConfig(config);
  const configs = { ...(config.promptScopeConfigs && typeof config.promptScopeConfigs === "object" ? config.promptScopeConfigs : {}) };
  for (const scope of PROMPT_SCOPE_KEYS) {
    configs[scope] = compactPromptScopeConfig({ ...base, ...(configs[scope] || {}) });
  }
  return { ...config, promptScopeConfigs: configs };
}

function currentGlobalPromptScopeConfigForConfig(config = {}) {
  const provider = config.promptProvider || "custom";
  const preset = API_PROVIDER_PRESETS[provider] || API_PROVIDER_PRESETS.custom;
  return {
    promptProvider: provider,
    promptBaseUrl: config.promptBaseUrl || preset.promptBaseUrl || "",
    promptModel: config.promptModel || preset.promptModel || "",
    promptEndpoint: config.promptEndpoint || preset.promptEndpoint || "chat"
  };
}

function promptScopeStoredConfig(scope = "image") {
  return getPromptScopeConfigs()[normalizePromptScope(scope)] || {};
}

function promptProviderBaseUrl(provider, stored = {}) {
  const preset = promptProviderPreset(provider);
  if (stored.promptProvider === provider && stored.promptBaseUrl) return stored.promptBaseUrl;
  if (state.config?.promptProvider === provider && state.config?.promptBaseUrl) return state.config.promptBaseUrl;
  return preset.promptBaseUrl || "";
}

function promptProviderEndpoint(provider, stored = {}) {
  const preset = promptProviderPreset(provider);
  if (stored.promptProvider === provider && stored.promptEndpoint) return stored.promptEndpoint;
  if (state.config?.promptProvider === provider && state.config?.promptEndpoint) return state.config.promptEndpoint;
  return preset.promptEndpoint || "chat";
}

function promptConfigForScope(scope = "image") {
  const key = normalizePromptScope(scope);
  const stored = promptScopeStoredConfig(key);
  const globalConfig = currentGlobalPromptScopeConfig();
  const provider = stored.promptProvider || globalConfig.promptProvider || "custom";
  const preset = promptProviderPreset(provider);
  const promptModel = stored.promptModel
    || getLastPromptModel(provider)
    || (state.config?.promptProvider === provider ? state.config?.promptModel : "")
    || preset.promptModel
    || "";
  return {
    promptProvider: provider,
    promptBaseUrl: promptProviderBaseUrl(provider, stored),
    promptApiKey: getSavedPromptApiKey(provider) || (state.config?.promptProvider === provider ? state.config?.promptApiKey || "" : ""),
    promptModel,
    promptEndpoint: promptProviderEndpoint(provider, stored),
    promptProviderApiOptions: state.config?.promptProviderApiOptions || {},
    promptModelCapabilities: state.config?.promptModelCapabilities || {}
  };
}

function promptConfigWithApiKey(config = {}) {
  const provider = config.promptProvider || "custom";
  return {
    ...config,
    promptApiKey: getSavedPromptApiKey(provider) || (state.config?.promptProvider === provider ? state.config?.promptApiKey || "" : "") || config.promptApiKey || ""
  };
}

function setPromptScopeConfig(scope, patch = {}) {
  const key = normalizePromptScope(scope);
  const promptScopeConfigs = {
    ...getPromptScopeConfigs(),
    [key]: compactPromptScopeConfig({
      ...promptScopeStoredConfig(key),
      ...patch
    })
  };
  state.config = { ...(state.config || {}), promptScopeConfigs };
  return promptScopeConfigs;
}

function scopedLiveCompletedCount(scope = visibleResultScope()) {
  const key = normalizeResultScope(scope);
  return Number(state.viewLiveCompletedCount[key] || 0);
}

function setScopedLiveCompletedCount(scope, count) {
  const key = normalizeResultScope(scope);
  state.viewLiveCompletedCount[key] = Math.max(0, Number(count || 0));
  if (key === "image") state.liveCompletedCount = state.viewLiveCompletedCount[key];
}

function scopedLiveTotalCount(scope = visibleResultScope()) {
  const key = normalizeResultScope(scope);
  return Number(state.viewLiveTotalCount[key] || 0);
}

function setScopedLiveTotalCount(scope, count) {
  const key = normalizeResultScope(scope);
  state.viewLiveTotalCount[key] = Math.max(0, Number(count || 0));
  if (key === "image") state.liveTotalCount = state.viewLiveTotalCount[key];
}

function scopedLiveProgressByIndex(scope = visibleResultScope()) {
  const key = normalizeResultScope(scope);
  state.viewLiveProgressByIndex[key] = state.viewLiveProgressByIndex[key] || {};
  return state.viewLiveProgressByIndex[key];
}

function resetScopedLiveProgress(scope) {
  const key = normalizeResultScope(scope);
  state.viewLiveProgressByIndex[key] = {};
  if (key === "image") state.liveProgressByIndex = state.viewLiveProgressByIndex[key];
}

function scopedSuitePlan(scope = "image") {
  const key = normalizeResultScope(scope);
  return state.viewSuitePlan[key] || null;
}

function setScopedSuitePlan(scope, plan) {
  const key = normalizeResultScope(scope);
  state.viewSuitePlan[key] = plan || null;
  if (key === "image") state.suitePlan = state.viewSuitePlan[key];
}

function scopedPromptPlan(scope = "image") {
  const key = normalizeResultScope(scope);
  return state.viewPromptPlan[key] || [];
}

function setScopedPromptPlan(scope, items) {
  const key = normalizeResultScope(scope);
  state.viewPromptPlan[key] = Array.isArray(items) ? items.slice() : [];
  if (key === "image") state.promptPlan = state.viewPromptPlan[key];
}

function logClientEvent(event, details = {}) {
  try {
    window.studio?.logClientEvent?.({
      event,
      rendererBuildId: RENDERER_BUILD_ID,
      route: state.route,
      activeGenerationId: state.activeGenerationId,
      ...details
    }).catch(() => {});
  } catch {
    // Client diagnostics must never interrupt generation.
  }
}

function runUiSafely(label, callback) {
  try {
    return callback?.();
  } catch (error) {
    logClientEvent("renderer-ui-error", {
      label,
      error: shortErrorMessage(error)
    });
    return undefined;
  }
}

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
const AI_REFERENCE_IMAGE_LIMIT = 6;
const AI_FILE_LIMIT = 8;
const AI_FILE_MAX_SIZE = 25 * 1024 * 1024;
const AI_FILE_CONTEXT_LIMIT = 90000;
const AI_FILE_TEXT_PER_FILE_LIMIT = 35000;
const CUTOUT_DEFAULT_HINT = "10M 以内，点击或拖拽随手拍产品图";
const CUSTOM_MODEL_VALUE = "__custom_model__";
const MODEL_ICON_BASE = "../assets/model-icons/";
const PROVIDER_ICON_BASE = "../assets/provider-icons/";
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
const PROVIDER_ICON_FILES = {
  "302ai": "302ai.svg",
  aihubmix: "aihubmix.ico",
  aliyun: "aliyun.ico",
  anthropic: "anthropic.ico",
  baichuan: "baichuan.png",
  baidu: "baidu.ico",
  bfl: "bfl.ico",
  cherryin: "cherryin.png",
  deepseek: "deepseek.ico",
  fireworks: "fireworks.ico",
  gemini: "gemini.png",
  groq: "groq.ico",
  lmstudio: "lmstudio.ico",
  minimax: "minimax.ico",
  moonshot: "moonshot.ico",
  ollama: "ollama.png",
  openai: "openai.svg",
  openrouter: "openrouter.ico",
  replicate: "replicate.png",
  siliconflow: "siliconflow.ico",
  stability: "stability.ico",
  tencent: "tencent.ico",
  together: "together.png",
  volcengine: "volcengine.png",
  xiaomi: "xiaomi.ico",
  zhipu: "zhipu.png"
};
const STANDARD_IMAGE_MODELS = new Set(["nano-banana-fast", "gpt-image-2", "nano-banana"]);
const GRSAI_IMAGE_MODEL_INFO = {
  "gpt-image-2": {
    resolutions: ["1K"],
    supportText: "1K",
    tier: "standard",
    strength: "基础稳定，适合日常SKU/白底图/场景图。"
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
    strength: "一致性优先，适合参考图保真和正式套图。"
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
    icon: "gemini",
    category: "relay",
    promptBaseUrl: "https://grsai.dakka.com.cn/v1",
    promptModel: "gemini-3.1-pro",
    promptEndpoint: "chat",
    models: ["gemini-3.1-pro", "gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-3-flash", "gemini-3-pro", "gemini-2.5-flash", "gemini-2.5-pro"],
    hint: "固定使用 Grsai 的 OpenAI 兼容 Chat Completions 接口写提示词，默认模型 gemini-3.1-pro。",
    source: "Grsai /v1/chat/completions 文档"
  },
  zyapi: {
    label: "ZyAPI",
    category: "relay",
    promptBaseUrl: "https://zyapi.tuluo.top:8888/v1",
    promptModel: "gpt-5.4",
    promptEndpoint: "chat",
    models: ["gpt-5.4", "gpt-5.5"],
    hint: "OpenAI 兼容聚合通道；如果某个模型不支持 Chat，可在高级 API 设置里切到 Responses 或自动尝试。",
    source: "现有软件默认配置"
  },
  "openai-response": {
    label: "OpenAI-Response",
    icon: "openai",
    category: "official",
    promptBaseUrl: "https://api.openai.com/v1",
    promptModel: "gpt-4.1",
    promptEndpoint: "responses",
    models: ["gpt-5", "gpt-5-mini", "gpt-4.1", "gpt-4.1-mini", "o4-mini", "o3"],
    hint: "使用 OpenAI Responses API，适合需要推理、工具参数和新版 Responses 能力的模型。",
    source: "OpenAI Responses API"
  },
  openai: {
    label: "OpenAI",
    icon: "openai",
    category: "official",
    promptBaseUrl: "https://api.openai.com/v1",
    promptModel: "gpt-4.1",
    promptEndpoint: "chat",
    models: ["gpt-5", "gpt-5-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4o", "gpt-4o-mini"],
    hint: "OpenAI Chat Completions 兼容模式。",
    source: "OpenAI API"
  },
  gemini: {
    label: "Google Gemini",
    icon: "gemini",
    category: "official",
    promptBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    promptModel: "gemini-2.5-pro",
    promptEndpoint: "gemini",
    models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
    hint: "Google Gemini 原生 generateContent 接口；API Key 会放在请求参数中。",
    source: "Google Gemini API"
  },
  anthropic: {
    label: "Anthropic",
    icon: "anthropic",
    category: "official",
    promptBaseUrl: "https://api.anthropic.com/v1",
    promptModel: "claude-sonnet-4-5",
    promptEndpoint: "anthropic",
    models: ["claude-sonnet-4-5", "claude-opus-4-1", "claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"],
    hint: "Anthropic Messages API，适合 Claude 系列模型。",
    source: "Anthropic Messages API"
  },
  azure: {
    label: "Azure OpenAI",
    icon: "openai",
    category: "official",
    promptBaseUrl: "",
    promptModel: "",
    promptEndpoint: "chat",
    models: [],
    hint: "Azure OpenAI 的地址、部署名和 api-version 由 Azure 资源决定，请按你的 Azure 控制台填写。",
    source: "Azure OpenAI 控制台"
  },
  qwen: {
    label: "阿里云百炼 / 通义千问",
    icon: "aliyun",
    category: "official",
    promptBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    promptModel: "qwen3-vl-plus",
    promptEndpoint: "chat",
    models: ["qwen3-vl-plus", "qwen3-vl-flash", "qwen3-max", "qwen-plus", "qwen-turbo"],
    hint: "千问建议使用 VL 模型做图片识别；官方 OpenAI 兼容地址为阿里云百炼 DashScope compatible-mode/v1。",
    source: "阿里云百炼官方 OpenAI 兼容文档"
  },
  deepseek: {
    label: "深度求索 DeepSeek",
    icon: "deepseek",
    category: "official",
    promptBaseUrl: "https://api.deepseek.com",
    promptModel: "deepseek-chat",
    promptEndpoint: "chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
    hint: "DeepSeek 官方提供 OpenAI 兼容接口，适合文本提示词和标题任务；图片识别请确认模型是否支持视觉输入。",
    source: "DeepSeek 官方 API 文档"
  },
  doubao: {
    label: "火山引擎 / 豆包",
    icon: "volcengine",
    category: "official",
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
    ],
    hint: "火山方舟使用 OpenAI 兼容地址 /api/v3；模型列表返回的是目录，不等于当前 Key 已授权。套餐/推理接入点/自定义接入点请手动填控制台代码示例里的 ep-... 接入点 ID，接口类型建议 auto。",
    source: "火山方舟官方 OpenAI 兼容文档"
  },
  moonshot: {
    label: "月之暗面 / Kimi",
    icon: "moonshot",
    category: "official",
    promptBaseUrl: "https://api.moonshot.cn/v1",
    promptModel: "kimi-k2-0711-preview",
    promptEndpoint: "chat",
    models: ["kimi-k2-0711-preview", "moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
    hint: "月之暗面 Kimi 提供 OpenAI 兼容接口，适合文本理解、长上下文和标题任务；视觉能力以控制台开放模型为准。",
    source: "Moonshot AI OpenAI 兼容 API"
  },
  zhipu: {
    label: "智谱 GLM",
    icon: "zhipu",
    category: "official",
    promptBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
    promptModel: "glm-5.1",
    promptEndpoint: "chat",
    models: ["glm-5.1", "glm-4.7", "glm-4.5"],
    hint: "智谱 GLM 官方兼容 OpenAI Chat Completions v4 接口；如账号是 Coding Plan，请按控制台说明改为专属 Coding 地址。",
    source: "智谱官方 API 文档"
  },
  baichuan: {
    label: "百川智能",
    icon: "baichuan",
    category: "official",
    promptBaseUrl: "https://api.baichuan-ai.com/v1",
    promptModel: "Baichuan4",
    promptEndpoint: "chat",
    models: ["Baichuan4", "Baichuan3-Turbo", "Baichuan3-Turbo-128k"],
    hint: "百川智能提供 OpenAI 兼容调用方式，适合中文文本生成和商品信息理解；视觉能力以控制台模型为准。",
    source: "百川智能 API 文档"
  },
  minimax: {
    label: "MiniMax",
    icon: "minimax",
    category: "official",
    promptBaseUrl: "https://api.minimax.chat/v1",
    promptModel: "MiniMax-M1",
    promptEndpoint: "chat",
    models: ["MiniMax-M1", "abab6.5s-chat", "abab6.5g-chat"],
    hint: "MiniMax 支持对话模型接入，适合文案和标题任务；视觉模型请以控制台开放情况为准。",
    source: "MiniMax API 文档"
  },
  hunyuan: {
    label: "腾讯混元",
    icon: "tencent",
    category: "official",
    promptBaseUrl: "https://api.hunyuan.cloud.tencent.com/v1",
    promptModel: "hunyuan-turbos-latest",
    promptEndpoint: "chat",
    models: ["hunyuan-turbos-latest", "hunyuan-turbo-latest", "hunyuan-lite"],
    hint: "腾讯混元提供兼容 OpenAI 的调用方式，适合中文文案和多模态任务；模型权限以腾讯云控制台为准。",
    source: "腾讯混元 API 文档"
  },
  qianfan: {
    label: "百度千帆 / 文心",
    icon: "baidu",
    category: "official",
    promptBaseUrl: "https://qianfan.baidubce.com/v2",
    promptModel: "ernie-4.5-turbo-vl",
    promptEndpoint: "chat",
    models: ["ernie-4.5-turbo-vl", "ernie-4.5-turbo", "ernie-x1-turbo"],
    hint: "百度千帆 v2 提供 OpenAI 兼容接口，视觉模型适合商品图识别；请确认账号已开通对应模型。",
    source: "百度智能云千帆 v2 API 文档"
  },
  xiaomi: {
    label: "Xiaomi MiMo",
    icon: "xiaomi",
    category: "official",
    promptBaseUrl: "https://api.xiaomimimo.com/v1",
    promptModel: "mimo-v2.5-pro",
    promptEndpoint: "chat",
    models: ["mimo-v2.5-pro", "mimo-v2.5", "mimo-v2-flash"],
    hint: "小米 MiMo 普通 OpenAI 兼容调用默认使用 api.xiaomimimo.com；Token Plan 请填写订阅页给出的专属 Base URL 和 tp- 开头 Key。",
    source: "小米 MiMo API 平台"
  },
  groq: {
    label: "Groq",
    icon: "groq",
    category: "official",
    promptBaseUrl: "https://api.groq.com/openai/v1",
    promptModel: "llama-3.3-70b-versatile",
    promptEndpoint: "chat",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "openai/gpt-oss-120b"],
    hint: "Groq 提供 OpenAI 兼容高速推理接口，适合文本提示词和标题任务。",
    source: "Groq OpenAI 兼容 API"
  },
  together: {
    label: "Together AI",
    icon: "together",
    category: "official",
    promptBaseUrl: "https://api.together.xyz/v1",
    promptModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    promptEndpoint: "chat",
    models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "Qwen/Qwen2.5-VL-72B-Instruct", "deepseek-ai/DeepSeek-R1"],
    hint: "Together AI 提供多模型 OpenAI 兼容接口，模型名通常带 owner/name。",
    source: "Together AI API 文档"
  },
  fireworks: {
    label: "Fireworks AI",
    icon: "fireworks",
    category: "official",
    promptBaseUrl: "https://api.fireworks.ai/inference/v1",
    promptModel: "accounts/fireworks/models/llama-v3p3-70b-instruct",
    promptEndpoint: "chat",
    models: ["accounts/fireworks/models/llama-v3p3-70b-instruct", "accounts/fireworks/models/deepseek-r1"],
    hint: "Fireworks AI 使用 OpenAI 兼容接口，模型名通常是 accounts/.../models/...。",
    source: "Fireworks AI API 文档"
  },
  openrouter: {
    label: "OpenRouter",
    icon: "openrouter",
    category: "relay",
    promptBaseUrl: "https://openrouter.ai/api/v1",
    promptModel: "openai/gpt-4o-mini",
    promptEndpoint: "chat",
    models: ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "google/gemini-2.5-pro", "deepseek/deepseek-chat"],
    hint: "OpenRouter 是第三方聚合平台，模型和兼容参数会随平台变化，可用右侧 API 设置调节。",
    source: "OpenRouter API 文档"
  },
  siliconflow: {
    label: "硅基流动 SiliconFlow",
    icon: "siliconflow",
    category: "relay",
    promptBaseUrl: "https://api.siliconflow.cn/v1",
    promptModel: "Qwen/Qwen2.5-VL-72B-Instruct",
    promptEndpoint: "chat",
    models: ["Qwen/Qwen2.5-VL-72B-Instruct", "deepseek-ai/DeepSeek-R1", "Qwen/Qwen3-235B-A22B"],
    hint: "硅基流动是模型聚合/托管平台，OpenAI 兼容接口可用于国内常用模型。",
    source: "硅基流动 API 文档"
  },
  aihubmix: {
    label: "AiHubMix",
    icon: "aihubmix",
    category: "relay",
    promptBaseUrl: "https://aihubmix.com/v1",
    promptModel: "gpt-4o-mini",
    promptEndpoint: "chat",
    models: ["gpt-4o-mini", "gpt-4.1-mini", "gemini-2.5-pro", "claude-3-5-sonnet-latest"],
    hint: "AiHubMix 是第三方中转平台，适合按平台开放模型填写；必要时可打开 API 设置调节兼容选项。",
    source: "AiHubMix 控制台"
  },
  "302ai": {
    label: "302.AI",
    icon: "302ai",
    category: "relay",
    promptBaseUrl: "https://api.302.ai/v1",
    promptModel: "gpt-4o-mini",
    promptEndpoint: "chat",
    models: ["gpt-4o-mini", "gpt-4.1-mini", "gemini-2.5-pro", "claude-3-5-sonnet-latest"],
    hint: "302.AI 是第三方中转平台，模型命名和兼容参数以平台控制台为准。",
    source: "302.AI API 文档"
  },
  ollama: {
    label: "Ollama",
    icon: "ollama",
    category: "local",
    promptBaseUrl: "http://127.0.0.1:11434/v1",
    promptModel: "llama3.2-vision",
    promptEndpoint: "chat",
    models: ["llama3.2-vision", "llama3.1", "qwen2.5vl", "gemma3"],
    hint: "Ollama 本地模型兼容 OpenAI /v1/chat/completions，需要本机 Ollama 已运行并拉取对应模型。",
    source: "Ollama OpenAI 兼容接口"
  },
  "lm-studio": {
    label: "LM Studio",
    icon: "lmstudio",
    category: "local",
    promptBaseUrl: "http://127.0.0.1:1234/v1",
    promptModel: "local-model",
    promptEndpoint: "chat",
    models: ["local-model"],
    hint: "LM Studio 本地服务兼容 OpenAI 接口，需要先在 LM Studio 启动本地服务器。",
    source: "LM Studio Local Server"
  },
  "new-api": {
    label: "New API",
    category: "relay",
    promptBaseUrl: "",
    promptModel: "",
    promptEndpoint: "chat",
    models: [],
    hint: "New API 类自建中转平台需要填写你的服务地址、Key 和模型名，必要时打开 API 设置调节兼容参数。",
    source: "New API 自建平台"
  },
  cherryin: {
    label: "CherryIN",
    icon: "cherryin",
    category: "relay",
    promptBaseUrl: "",
    promptModel: "",
    promptEndpoint: "chat",
    models: [],
    hint: "CherryIN 类中转服务需要按平台控制台填写 API 地址、Key 和模型名。",
    source: "CherryIN / 中转平台"
  },
  custom: {
    label: "自定义",
    promptBaseUrl: "",
    promptModel: "",
    promptEndpoint: "chat",
    models: [],
    category: "custom",
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
  "azure",
  "qwen",
  "deepseek",
  "doubao",
  "moonshot",
  "zhipu",
  "baichuan",
  "minimax",
  "hunyuan",
  "qianfan",
  "xiaomi",
  "groq",
  "together",
  "fireworks",
  "openrouter",
  "siliconflow",
  "aihubmix",
  "302ai",
  "ollama",
  "lm-studio",
  "new-api",
  "cherryin"
];

const API_OPTION_DEFAULTS = {
  arrayMessages: true,
  developerMessage: false,
  streamOptions: false,
  serviceTier: false,
  enableThinking: false,
  verbosity: false
};

function apiOptionDefaultsForProvider(provider = "") {
  const preset = API_PROVIDER_PRESETS[provider] || {};
  const responseLike = (preset.promptEndpoint || "") === "responses";
  return {
    ...API_OPTION_DEFAULTS,
    streamOptions: false,
    enableThinking: false,
    verbosity: responseLike
  };
}

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

function normalizeFeaturePlatform(platform) {
  return normalizePlatformKey(platform) || "Amazon";
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
  aiPage: $("#aiPage"),
  aplusPage: $("#aplusPage"),
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
  unitOfSaleInput: $("#unitOfSaleInput"),
  bundleFields: $("#bundleFields"),
  bundleComponentsInput: $("#bundleComponentsInput"),
  componentDifferencesInput: $("#componentDifferencesInput"),
  multipackFields: $("#multipackFields"),
  pcsCountInput: $("#pcsCountInput"),
  packArrangementInput: $("#packArrangementInput"),
  usageNotesInput: $("#usageNotesInput"),
  charCount: $("#charCount"),
  analyzeBtn: $("#analyzeBtn"),
  imageAiInlineStatus: $("#imageAiInlineStatus"),
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
  suiteCustomPanel: $("#suiteCustomPanel"),
  progressBox: $("#progressBox"),
  progressText: $("#progressText"),
  progressNumber: $("#progressNumber"),
  progressFill: $("#progressFill"),
  results: $("#results"),
  planningModelLabel: $("#planningModelLabel"),
  mainPromptProviderSelect: $("#mainPromptProviderSelect"),
  mainPromptModelSelect: $("#mainPromptModelSelect"),
  mainPromptModelCustom: $("#mainPromptModelCustom"),
  mainPromptModelTestBtn: $("#mainPromptModelTestBtn"),
  suitePlanStatus: $("#suitePlanStatus"),
  styleMasterBox: $("#styleMasterBox"),
  promptPlanList: $("#promptPlanList"),
  selectedMeta: $("#selectedMeta"),
  selectedPreview: $("#selectedPreview"),
  selectedPreviewImg: $("#selectedPreviewImg"),
  saveSelectedBtn: $("#saveSelectedBtn"),
  openSelectedBtn: $("#openSelectedBtn"),
  promptEditor: $("#promptEditor"),
  promptDrawer: $("#promptDrawer"),
  closePromptDrawerBtn: $("#closePromptDrawerBtn"),
  promptDrawerMeta: $("#promptDrawerMeta"),
  promptDrawerText: $("#promptDrawerText"),
  regenerateSelectedBtn: $("#regenerateSelectedBtn"),
  imageModelTierBadge: $("#imageModelTierBadge"),
  currentImageModelName: $("#currentImageModelName"),
  currentImageModelDesc: $("#currentImageModelDesc"),
  modelRouteHint: $("#modelRouteHint"),
  workflowSteps: $("#workflowSteps"),
  repairCanvasWrap: $("#repairCanvasWrap"),
  repairCanvasImage: $("#repairCanvasImage"),
  repairCanvas: $("#repairCanvas"),
  repairInstruction: $("#repairInstruction"),
  clearRepairMarksBtn: $("#clearRepairMarksBtn"),
  repairSelectedBtn: $("#repairSelectedBtn"),
  aplusStatusLine: $("#aplusStatusLine"),
  aplusDropzone: $("#aplusDropzone"),
  aplusFileInput: $("#aplusFileInput"),
  aplusUploadHint: $("#aplusUploadHint"),
  aplusThumbs: $("#aplusThumbs"),
  aplusPlatform: $("#aplusPlatform"),
  aplusRegion: $("#aplusRegion"),
  aplusLanguage: $("#aplusLanguage"),
  aplusFormat: $("#aplusFormat"),
  aplusProductName: $("#aplusProductName"),
  aplusProductInfo: $("#aplusProductInfo"),
  aplusAnalyzeBtn: $("#aplusAnalyzeBtn"),
  aplusAiInlineStatus: $("#aplusAiInlineStatus"),
  aplusImageModelRoute: $("#aplusImageModelRoute"),
  aplusPlanningModelLabel: $("#aplusPlanningModelLabel"),
  aplusPromptProviderSelect: $("#aplusPromptProviderSelect"),
  aplusPromptModelSelect: $("#aplusPromptModelSelect"),
  aplusPromptModelCustom: $("#aplusPromptModelCustom"),
  aplusPromptModelTestBtn: $("#aplusPromptModelTestBtn"),
  aplusModuleGrid: $("#aplusModuleGrid"),
  aplusSelectAllModulesBtn: $("#aplusSelectAllModulesBtn"),
  aplusGenerateBtn: $("#aplusGenerateBtn"),
  aplusProgressBox: $("#aplusProgressBox"),
  aplusProgressText: $("#aplusProgressText"),
  aplusProgressNumber: $("#aplusProgressNumber"),
  aplusProgressFill: $("#aplusProgressFill"),
  aplusResults: $("#aplusResults"),
  recoverHistoryBtn: $("#recoverHistoryBtn"),
  historyList: $("#historyList"),
  totalCountValue: $("#totalCountValue"),
  aiOpenSettingsBtn: $("#aiOpenSettingsBtn"),
  aiNewChatBtn: $("#aiNewChatBtn"),
  aiModeGroup: $("#aiModeGroup"),
  aiPromptProviderSelect: $("#aiPromptProviderSelect"),
  aiPromptModelSelect: $("#aiPromptModelSelect"),
  aiPromptModelCustom: $("#aiPromptModelCustom"),
  aiImageModelSelect: $("#aiImageModelSelect"),
  aiImageModelCustom: $("#aiImageModelCustom"),
  aiDropzone: $("#aiDropzone"),
  aiFileInput: $("#aiFileInput"),
  aiDocumentDropzone: $("#aiDocumentDropzone"),
  aiDocumentInput: $("#aiDocumentInput"),
  aiDocumentHint: $("#aiDocumentHint"),
  aiUploadHint: $("#aiUploadHint"),
  aiThumbs: $("#aiThumbs"),
  aiFileChips: $("#aiFileChips"),
  aiMessageInput: $("#aiMessageInput"),
  aiClearBtn: $("#aiClearBtn"),
  aiSendBtn: $("#aiSendBtn"),
  aiMessages: $("#aiMessages"),
  aiStatusLine: $("#aiStatusLine"),
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
  providerAddTitle: $("#providerAddTitle"),
  providerNameInput: $("#providerNameInput"),
  providerTypeSelect: $("#providerTypeSelect"),
  cancelProviderAddBtn: $("#cancelProviderAddBtn"),
  confirmProviderAddBtn: $("#confirmProviderAddBtn"),
  closeProviderAddBtn: $("#closeProviderAddBtn"),
  providerNoteModal: $("#providerNoteModal"),
  providerNoteTitle: $("#providerNoteTitle"),
  providerNoteInput: $("#providerNoteInput"),
  providerNoteCancelBtn: $("#providerNoteCancelBtn"),
  providerNoteSaveBtn: $("#providerNoteSaveBtn"),
  providerNoteCloseX: $("#providerNoteCloseX"),
  providerContextMenu: $("#providerContextMenu"),
  promptTestModal: $("#promptTestModal"),
  promptTestProviderLabel: $("#promptTestProviderLabel"),
  promptTestModelSearch: $("#promptTestModelSearch"),
  promptTestModelSelect: $("#promptTestModelSelect"),
  promptTestModelCustom: $("#promptTestModelCustom"),
  promptTestHint: $("#promptTestHint"),
  promptTestCancelBtn: $("#promptTestCancelBtn"),
  promptTestStartBtn: $("#promptTestStartBtn"),
  promptTestCloseX: $("#promptTestCloseX"),
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
  saveViewerImageBtn: $("#saveViewerImageBtn"),
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
  updateManifestUrl: $("#updateManifestUrl"),
  updateCheckOnStartup: $("#updateCheckOnStartup"),
  checkUpdateBtn: $("#checkUpdateBtn"),
  updateActionStatus: $("#updateActionStatus"),
  updateModal: $("#updateModal"),
  updateModalVersion: $("#updateModalVersion"),
  updateModalSummary: $("#updateModalSummary"),
  updateModalNotes: $("#updateModalNotes"),
  updateCloseX: $("#updateCloseX"),
  updateLaterBtn: $("#updateLaterBtn"),
  updateNotesBtn: $("#updateNotesBtn"),
  updateDownloadBtn: $("#updateDownloadBtn"),
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
let currentViewerImage = null;
let errorModalRetryHandler = null;
let imageTestDialogResolver = null;
let promptTestDialogResolver = null;
let promptTestModelOptions = [];
let repairDrawing = false;
let repairLastPoint = null;

function ensureBodyOverlay(element) {
  if (element && element.parentElement !== document.body) {
    document.body.appendChild(element);
  }
  return element;
}

function showOverlay(element) {
  ensureBodyOverlay(element)?.classList.remove("hidden");
}

function hideOverlay(element) {
  element?.classList.add("hidden");
}

function toast(message, type = "info") {
  ensureBodyOverlay(els.toast);
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
  showOverlay(els.errorModal);
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
  if (/火山方舟|推理接入点|接入点 ID|ep-|volces|ark\.cn/i.test(message)) {
    return `${message}${debugText && !message.includes(debugText) ? debugText : ""}`;
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
  const providerFile = PROVIDER_ICON_FILES[iconKey];
  if (providerFile) return `${PROVIDER_ICON_BASE}${providerFile}`;
  return `${MODEL_ICON_BASE}${MODEL_ICON_FILES[iconKey] || MODEL_ICON_FILES.generic}`;
}

function providerIconPath(iconKey = "") {
  const file = PROVIDER_ICON_FILES[iconKey];
  return file ? `${PROVIDER_ICON_BASE}${file}` : iconPath("generic");
}

function modelIconKey(value = "", provider = "") {
  const modelText = String(value || "").toLowerCase();
  const providerText = String(provider || "").toLowerCase();

  if (/(^|[/:_\-\s])(?:gpt|chatgpt)(?:[/:_\-\s]|\d|$)|(^|[/:_\-\s])o[1345](?:[/:_\-\s]|$)|openai/.test(modelText)) return "openai";
  if (/gemini|imagen|google/.test(modelText)) return "gemini";
  if (/claude|anthropic/.test(modelText)) return "anthropic";
  if (/deepseek/.test(modelText)) return "deepseek";
  if (/qwen|tongyi|通义|千问|wanx|万相/.test(modelText)) return "aliyun";
  if (/doubao|seedream|豆包|volces|火山/.test(modelText)) return "volcengine";
  if (/kimi|moonshot/.test(modelText)) return "moonshot";
  if (/glm|zhipu|智谱/.test(modelText)) return "zhipu";
  if (/hunyuan|混元/.test(modelText)) return "tencent";
  if (/ernie|qianfan|baidu|文心|千帆/.test(modelText)) return "baidu";
  if (/minimax|abab/.test(modelText)) return "minimax";
  if (/mimo|xiaomi|小米/.test(modelText)) return "xiaomi";
  if (/flux|bfl|black\s*forest|黑森林/.test(modelText)) return "bfl";
  if (/stable|stability/.test(modelText)) return "stability";
  if (/nano[-_\s]?banana|banana/.test(modelText)) return "gemini";
  if (/jimeng|即梦|jimeng-ai|jimengai/.test(modelText)) return "volcengine";

  const providerIcon = providerIconKey(providerText);
  return providerIcon || "generic";
}

function providerIconKey(provider = "") {
  const text = String(provider || "").toLowerCase();
  if (text === "grsai") return "banana";
  const preset = API_PROVIDER_PRESETS[provider] || IMAGE_PROVIDER_PRESETS[provider];
  if (preset?.icon) return preset.icon;
  const directMap = {
    "302ai": "302ai",
    aihubmix: "aihubmix",
    anthropic: "anthropic",
    azure: "openai",
    baichuan: "baichuan",
    baidu: "baidu",
    bfl: "bfl",
    cherryin: "cherryin",
    deepseek: "deepseek",
    doubao: "volcengine",
    fireworks: "fireworks",
    gemini: "gemini",
    groq: "groq",
    "grsai-gemini": "gemini",
    hunyuan: "tencent",
    kling: "kling",
    "lm-studio": "lmstudio",
    minimax: "minimax",
    moonshot: "moonshot",
    ollama: "ollama",
    openai: "openai",
    "openai-response": "openai",
    openrouter: "openrouter",
    qianfan: "baidu",
    qwen: "aliyun",
    replicate: "replicate",
    siliconflow: "siliconflow",
    stability: "stability",
    together: "together",
    xiaomi: "xiaomi",
    zhipu: "zhipu",
    zyapi: ""
  };
  if (Object.prototype.hasOwnProperty.call(directMap, text)) return directMap[text];
  return "";
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

function getPromptProviderNotes() {
  const notes = state.config?.promptProviderNotes;
  return notes && typeof notes === "object" ? notes : {};
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
      type: meta.type || "openai",
      custom: true,
      category: "custom",
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

function isPromptRelayProvider(provider = currentSettingsProvider()) {
  const preset = promptProviderPreset(provider);
  return ["relay", "local", "custom"].includes(preset.category) || Boolean(preset.custom);
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
    vision: !imageGeneration && has([/vision/, /\bvl\b/, /qwen.*vl/, /gemini/, /gpt-4o/, /gpt-4\.1/, /gpt-5/, /claude-3/, /claude.*sonnet/, /mimo.*omni/, /omni/, /ernie.*vl/, /hunyuan.*vision/]),
    web: has([/search/, /sonar/, /web/, /online/]),
    reasoning: has([/reasoner/, /thinking/, /\br1\b/, /deepseek-r/, /o1/, /o3/, /o4/, /gpt-5/, /pro/, /glm-4\.5/, /glm-5/, /gemini-2\.5/, /claude-3-7/, /claude-4/, /sonnet-4/, /opus-4/, /kimi-k2/, /x1/, /m1/]),
    tools: !imageGeneration && has([/gpt/, /openai/, /gemini/, /claude/, /qwen/, /doubao/, /glm/, /deepseek/, /mimo/, /kimi/, /hunyuan/, /ernie/, /llama/, /minimax/]),
    rerank: has([/rerank/, /ranker/]),
    embedding: has([/embed/, /embedding/, /text-embedding/, /bge/, /voyage/])
  };
}

function modelCapabilities(provider, model) {
  const saved = getPromptModelCapabilitiesMap()[provider]?.[model];
  return { ...inferModelCapabilities(model, provider), ...(saved || {}) };
}

function promptModelCapabilitiesForConfig(config = {}) {
  return modelCapabilities(config.promptProvider || "custom", config.promptModel || "");
}

function currentPromptModelCapabilities(scope = "image") {
  return promptModelCapabilitiesForConfig(promptConfigForScope(scope));
}

function ensureVisionModelForImages(actionName = "AI analysis", scopeOrImages = "image", promptConfig = null) {
  const images = Array.isArray(scopeOrImages) ? scopeOrImages : productImagesForScope(scopeOrImages);
  if (!images.length) return true;
  const config = promptConfig || (Array.isArray(scopeOrImages) ? promptConfigForScope("image") : promptConfigForScope(scopeOrImages));
  const caps = promptModelCapabilitiesForConfig(config);
  if (caps.vision) return true;
  const provider = promptProviderLabel(config.promptProvider || "custom");
  const model = config.promptModel || "not selected";
  showMessageModal(
    `${actionName} must use a multimodal vision model because product images are part of this task.\n\nCurrent prompt/vision model: ${provider} / ${model}\nPlease choose a model marked as vision-capable, then run the real connection test with vision enabled.`,
    "Vision model required",
    "error"
  );
  return false;
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
  return promptRequestInfoForScope("image");
}

function promptRequestInfoForScope(scope = "image") {
  const config = promptConfigForScope(scope);
  const provider = config.promptProvider || "custom";
  const preset = promptProviderPreset(provider);
  const baseUrl = String(config.promptBaseUrl || "").replace(/\/+$/, "");
  const endpoint = config.promptEndpoint || preset.promptEndpoint || "chat";
  const model = config.promptModel || "";
  const requestUrl = endpoint === "chat"
    ? `${baseUrl}/chat/completions`
    : endpoint === "responses"
      ? `${baseUrl}/responses`
      : endpoint === "gemini"
        ? `${baseUrl}/models/${model || "{model}"}:generateContent`
        : endpoint === "anthropic"
          ? `${baseUrl}/messages`
          : `${baseUrl}/chat/completions 或 /responses`;
  return [
    `供应商: ${preset.label || provider}`,
    `模型: ${model || "未填写"}`,
    `接口类型: ${endpoint}`,
    `请求地址: ${requestUrl}`
  ].join("\n");
}

function settingsPromptRequestInfo() {
  const config = state.config || {};
  const provider = currentSettingsProvider();
  const preset = promptProviderPreset(provider);
  const isSelectedProvider = config.promptProvider === provider;
  const baseUrl = ($("#promptBaseUrl")?.value || (isSelectedProvider ? config.promptBaseUrl : "") || preset.promptBaseUrl || "").trim();
  const endpoint = $("#promptEndpoint")?.value || (isSelectedProvider ? config.promptEndpoint : "") || preset.promptEndpoint || "chat";
  const model = getSelectedPromptModel() || (isSelectedProvider ? config.promptModel : "") || preset.promptModel || "";
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
    `供应商: ${preset.label || provider}`,
    `模型: ${model || "未填写"}`,
    `接口类型: ${endpoint}`,
    `请求地址: ${requestUrl}`
  ].join("\n");
}

function showPromptFailureModal(error, title, retryHandler, scope = "image") {
  const baseMessage = humanizeErrorMessage(error);
  const hasDebug = /请求地址:/.test(baseMessage);
  const message = hasDebug
    ? baseMessage
    : `${baseMessage}\n\n当前 AI 分析模型配置：\n${scope ? promptRequestInfoForScope(scope) : settingsPromptRequestInfo()}`;
  const canRetry = isTimeoutMessage(message) && typeof retryHandler === "function";
  showMessageModal(message, title, "error");
  configureErrorModalRetry(canRetry ? retryHandler : null);
}

function showAnalysisRequiredModal() {
  showMessageModal("Product name or reference images changed. The app will re-analyze the product and generate a fresh category prompt plan when you start generation.", "Product analysis will refresh", "info");
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
  hideOverlay(els.imageTestModal);
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

function selectedPromptTestModel() {
  const value = els.promptTestModelSelect?.value || "";
  if (value === CUSTOM_MODEL_VALUE) return els.promptTestModelCustom?.value.trim() || "";
  return value.trim();
}

function syncImageTestModelCustomInput() {
  const isCustom = els.imageTestModelSelect?.value === CUSTOM_MODEL_VALUE;
  els.imageTestModelCustom?.classList.toggle("hidden", !isCustom);
  if (isCustom) els.imageTestModelCustom?.focus();
}

function syncPromptTestModelCustomInput() {
  const isCustom = els.promptTestModelSelect?.value === CUSTOM_MODEL_VALUE;
  els.promptTestModelCustom?.classList.toggle("hidden", !isCustom);
  if (isCustom) els.promptTestModelCustom?.focus();
}

function filterPromptTestModels() {
  if (!els.promptTestModelSelect) return;
  const query = String(els.promptTestModelSearch?.value || "").trim().toLowerCase();
  const selected = selectedPromptTestModel();
  const filtered = promptTestModelOptions.filter((model) => !query || model.toLowerCase().includes(query));
  setSelectModelOptions("#promptTestModelSelect", "#promptTestModelCustom", filtered.length ? filtered : promptTestModelOptions, selected);
  syncPromptTestModelCustomInput();
}

function closePromptTestModal(value = null) {
  hideOverlay(els.promptTestModal);
  els.promptTestModelCustom?.classList.add("hidden");
  if (promptTestDialogResolver) {
    const resolve = promptTestDialogResolver;
    promptTestDialogResolver = null;
    resolve(value);
  }
}

function openPromptTestModelDialog(settings = {}, options = {}) {
  const provider = settings.promptProvider || currentSettingsProvider();
  const preset = promptProviderPreset(provider);
  const selected = String(options.selectedModel || settings.promptModel || getSelectedPromptModel() || preset.promptModel || "").trim();
  promptTestModelOptions = uniqueModelOptions([
    selected,
    settings.promptModel,
    getSelectedPromptModel(),
    getLastPromptModel(provider),
    ...(getProviderModelOptions(provider) || []),
    ...(preset.models || [])
  ]);

  if (!els.promptTestModal || !els.promptTestModelSelect) {
    return Promise.resolve(selected);
  }
  if (els.promptTestProviderLabel) {
    els.promptTestProviderLabel.textContent = `${preset.label || provider} · ${settings.promptEndpoint || preset.promptEndpoint || "chat"}`;
  }
  if (els.promptTestHint) {
    const baseHint = options.forceVisionProbe
      ? "这会真实发送文本 JSON 探测和一张极小测试图，确认当前模型是否能作为提示词/识图模型使用。"
      : "这会真实调用一次当前供应商接口，确认 API 地址、Key、接口类型和所选模型是否能返回可解析 JSON。";
    els.promptTestHint.textContent = provider === "doubao"
      ? `${baseHint} 火山方舟如果使用推理接入点套餐，请选择“手动输入其他模型”并填 ep-... 接入点 ID。`
      : baseHint;
  }
  if (els.promptTestModelSearch) els.promptTestModelSearch.value = "";
  setSelectModelOptions("#promptTestModelSelect", "#promptTestModelCustom", promptTestModelOptions, selected);
  syncPromptTestModelCustomInput();
  showOverlay(els.promptTestModal);
  return new Promise((resolve) => {
    promptTestDialogResolver = resolve;
  });
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
  showOverlay(els.imageTestModal);

  return new Promise((resolve) => {
    imageTestDialogResolver = resolve;
  });
}

function modelIconInfo(model = "", provider = state.config?.promptProvider || "") {
  const key = modelIconKey(model, provider);
  return { key, src: iconPath(key), label: key === "chatgpt" ? "ChatGPT" : key };
}

function normalizePromptDisplayText(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text
    .replace(/\bTemu(?:\s+(?:US|EU|UK|CA|AU))?\s+(?=(?:main|hero|selling|SKU|real-shot|lifestyle|macro|A\+|detail|product|image))/gi, "")
    .replace(/\bAmazon(?:\s+(?:US|EU|UK|CA|AU))?\s+(?=(?:main|hero|selling|SKU|real-shot|lifestyle|macro|A\+|detail|product|image))/gi, "")
    .replace(/\bShopee(?:\s+[A-Z]{2})?\s+(?=(?:main|hero|selling|SKU|real-shot|lifestyle|macro|A\+|detail|product|image))/gi, "")
    .replace(/\bEtsy(?:\s+[A-Z]{2})?\s+(?=(?:main|hero|selling|SKU|real-shot|lifestyle|macro|A\+|detail|product|image))/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function renderPlanningModelLabel() {
  if (!els.planningModelLabel) return;
  const promptModel = state.config?.promptModel || "当前提示词模型";
  const icon = modelIconInfo(promptModel);
  const provider = promptProviderLabel(state.config?.promptProvider || currentSettingsProvider());
  els.planningModelLabel.innerHTML = `<img class="model-icon model-icon-img" src="${escapeHtml(icon.src)}" alt=""><span>${escapeHtml(promptModel)}</span><small>${escapeHtml(provider)}</small>`;
  renderMainPromptModelSelect(promptModel);
}

function renderPlanningModelLabel() {
  renderAllPromptScopeControls();
}

function emptyTigerMarkup(mode = "sleeping") {
  return "";
}

function closeErrorModal() {
  hideOverlay(els.errorModal);
  els.errorModalMessage.textContent = "";
  els.errorModal.querySelector(".error-card")?.classList.remove("success");
  configureErrorModalRetry(null);
}

function closeUpdateModal() {
  hideOverlay(els.updateModal);
}

function updateNotesText(update = {}) {
  const notes = Array.isArray(update.notes) ? update.notes.filter(Boolean) : [];
  if (notes.length) return notes.map((item) => `- ${item}`).join("\n");
  return update.summary || "此版本提供了新的修复和优化。";
}

function showUpdateModal(update = {}) {
  state.update.latest = update;
  if (!els.updateModal) return;
  if (els.updateModalVersion) {
    els.updateModalVersion.textContent = `当前版本 ${update.currentVersion || ""}，最新版本 ${update.latestVersion || ""}`;
  }
  if (els.updateModalSummary) {
    els.updateModalSummary.textContent = update.summary || "检测到可安装的新版本。此更新不会强制安装，你可以自行选择更新时间。";
  }
  if (els.updateModalNotes) {
    els.updateModalNotes.textContent = updateNotesText(update);
  }
  showOverlay(els.updateModal);
}

function updateRemindLaterUntil() {
  return Number(localStorage.getItem(UPDATE_REMIND_LATER_STORAGE_KEY) || 0);
}

function shouldSkipStartupUpdatePrompt() {
  return updateRemindLaterUntil() > Date.now();
}

function setUpdateStatus(message = "") {
  if (els.updateActionStatus) els.updateActionStatus.textContent = message;
}

async function openUpdateDownload() {
  const update = state.update.latest || {};
  if (!update.downloadUrl) {
    showMessageModal("更新清单里没有提供下载地址，请检查 downloadUrl 字段。", "无法立即更新", "error");
    return;
  }
  await window.studio.openUpdateUrl(update.downloadUrl);
  closeUpdateModal();
}

async function openUpdateNotes() {
  const update = state.update.latest || {};
  const notesUrl = update.releaseNotesUrl || update.releaseUrl || "";
  if (!notesUrl) {
    showMessageModal(updateNotesText(update), "更新内容", "info");
    return;
  }
  await window.studio.openUpdateUrl(notesUrl);
}

function remindUpdateLater() {
  localStorage.setItem(UPDATE_REMIND_LATER_STORAGE_KEY, String(Date.now() + 12 * 60 * 60 * 1000));
  closeUpdateModal();
  toast("已设置稍后提醒。");
}

async function checkForUpdates(options = {}) {
  const manual = Boolean(options.manual);
  const manifestUrl = String(els.updateManifestUrl?.value || state.config?.updateManifestUrl || "").trim();
  if (!manifestUrl) {
    const message = "请先填写更新清单地址。";
    if (manual) {
      setUpdateStatus(message);
      showMessageModal(message, "无法检查更新", "error");
    }
    return null;
  }
  if (!manual && shouldSkipStartupUpdatePrompt()) return null;
  if (state.update.checking) return null;

  state.update.checking = true;
  if (els.checkUpdateBtn) els.checkUpdateBtn.disabled = true;
  if (manual) setUpdateStatus("正在检查更新...");
  try {
    const result = await window.studio.checkUpdate({ updateManifestUrl: manifestUrl });
    state.update.latest = result;
    if (result?.hasUpdate) {
      if (manual) setUpdateStatus(`发现新版本 ${result.latestVersion}`);
      showUpdateModal(result);
    } else if (manual) {
      setUpdateStatus(`当前已是最新版本 ${result?.currentVersion || ""}`);
      showMessageModal(`当前已是最新版本：${result?.currentVersion || ""}`, "无需更新", "success");
    }
    return result;
  } catch (error) {
    const message = shortErrorMessage(error);
    if (manual) {
      setUpdateStatus(`检查更新失败：${message}`);
      showMessageModal(`检查更新失败：${message}`, "检查更新失败", "error");
    }
    return null;
  } finally {
    state.update.checking = false;
    if (els.checkUpdateBtn) els.checkUpdateBtn.disabled = false;
  }
}

function scheduleStartupUpdateCheck() {
  if (state.config?.updateCheckOnStartup === false) return;
  if (!String(state.config?.updateManifestUrl || "").trim()) return;
  window.setTimeout(() => {
    checkForUpdates({ manual: false }).catch(() => {});
  }, 1800);
}

function setBusy(isBusy, label) {
  if (els.analyzeBtn) els.analyzeBtn.disabled = isBusy;
  els.generateBtn.disabled = isBusy;
  if (els.aplusAnalyzeBtn) els.aplusAnalyzeBtn.disabled = isBusy;
  if (els.aplusGenerateBtn) els.aplusGenerateBtn.disabled = isBusy;
  els.analyzeBtn?.classList.toggle("ai-running", isBusy && /AI|识别|分析/.test(String(label || "")));
  els.generateBtn.classList.toggle("ai-running", isBusy && /生成|提交|Grsai/.test(String(label || "")));
  els.aplusAnalyzeBtn?.classList.toggle("ai-running", isBusy && /A\+|AI/.test(String(label || "")));
  els.aplusGenerateBtn?.classList.toggle("ai-running", isBusy && /A\+|生成/.test(String(label || "")));
  if (els.titleGenerateBtn) els.titleGenerateBtn.disabled = isBusy;
  if (els.titleGenerateBtn) els.titleGenerateBtn.classList.toggle("ai-running", isBusy && /标题/.test(String(label || "")));
  if (els.cutoutDropzone && !state.cutoutGenerating) els.cutoutDropzone.classList.toggle("disabled", isBusy);
  if (els.titleDropzone) els.titleDropzone.classList.toggle("disabled", isBusy);
  if (label) {
    const statusLine = scopedStatusLine(state.activeGenerationView || state.route);
    if (statusLine) statusLine.textContent = label;
  }
}

function updateApiState() {
  const promptReady = Boolean(state.config?.promptApiKey || Object.values(getPromptProviderKeys()).some((key) => String(key || "").trim()));
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
  if (text) return text;
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
  if (/ultra|max|vip|pro|plus|4k/.test(text)) return "高质量生图模型，适合一致性、复杂场景和细节控制。";
  if (/fast|turbo|schnell|core|flash/.test(text)) return "速度优先生图模型，适合快速试图和常规图片。";
  return imageModelTier(model) === "advanced"
    ? "偏高质量生图模型，适合更强的一致性、场景和细节控制。"
    : "稳定生图模型，适合日常套图和快速生成。";
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
  if (resolution === "1K") {
    return state.config?.image1kModel
      || state.config?.grsai1kModel
      || state.config?.image2kModel
      || state.config?.grsai2kModel
      || "gpt-image-2";
  }
  return state.config?.image2kModel
    || state.config?.grsai2kModel
    || state.config?.image1kModel
    || state.config?.grsai1kModel
    || "nano-banana";
}

function getFeatureImageModelRoutes() {
  const stored = state.config?.featureImageModelRoutes;
  return stored && typeof stored === "object" ? stored : {};
}

function featureImageModelRoute(scope = "image") {
  const key = normalizeResultScope(scope);
  if (key === "image") return normalizeImageModelRoute(state.imageModelRoute || state.config?.imageModelRoute);
  return normalizeImageModelRoute(
    state.featureImageModelRoutes?.[key]
      || getFeatureImageModelRoutes()[key]
      || "auto"
  );
}

function setFeatureImageModelRoute(scope = "image", route = "auto") {
  const key = normalizeResultScope(scope);
  if (key === "image") {
    state.imageModelRoute = normalizeImageModelRoute(route);
    return;
  }
  state.featureImageModelRoutes = {
    ...(state.featureImageModelRoutes || {}),
    [key]: normalizeImageModelRoute(route)
  };
  state.config = {
    ...(state.config || {}),
    featureImageModelRoutes: {
      ...getFeatureImageModelRoutes(),
      ...state.featureImageModelRoutes
    }
  };
}

function resolveImageModelForScope(scope = "image") {
  const key = normalizeResultScope(scope);
  if (key === "image") return resolveCurrentImageModel();
  const route = featureImageModelRoute(key);
  return route === "auto" ? resolveCurrentImageModel() : route;
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
    els.imageModelTierBadge.textContent = "生图模型";
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
  syncProviderModelIcons();
}

function imageModelRouteOptions() {
  const provider = state.config?.imageProvider || $("#imageProvider")?.value || "grsai";
  return uniqueModelOptions([
    state.config?.image1kModel,
    state.config?.image2kModel,
    state.config?.grsai1kModel,
    state.config?.grsai2kModel,
    getSelectedModelValue?.("#grsai1kModel", "#grsai1kModelCustom"),
    getSelectedModelValue?.("#grsai2kModel", "#grsai2kModelCustom"),
    ...(getImageProviderModelOptions(provider) || []),
    ...GRSAI_IMAGE_MODELS
  ]);
}

function aiImageModelOptions(provider = state.config?.imageProvider || $("#imageProvider")?.value || "grsai") {
  return uniqueModelOptions([
    state.config?.image1kModel,
    state.config?.image2kModel,
    state.config?.grsai1kModel,
    state.config?.grsai2kModel,
    normalizeImageModelRoute(state.config?.imageModelRoute || "") !== "auto" ? state.config?.imageModelRoute : "",
    getLastImageModel(provider, "route"),
    ...(getImageProviderModelOptions(provider) || [])
  ]);
}

function selectedAiImageModel() {
  const select = els.aiImageModelSelect;
  const custom = els.aiImageModelCustom;
  if (!select) return "";
  if (select.value === CUSTOM_MODEL_VALUE) return custom?.value.trim() || "";
  return String(select.value || "").trim();
}

function resolveAiImageModel() {
  const selected = selectedAiImageModel();
  if (selected) return selected;
  const stored = normalizeImageModelRoute(state.ai.imageModelRoute || "");
  if (stored && stored !== "auto") return stored;
  return resolveCurrentImageModel();
}

function populateAiImageModelSelect() {
  if (!els.aiImageModelSelect || !els.aiImageModelCustom) return;
  const provider = state.config?.imageProvider || $("#imageProvider")?.value || "grsai";
  const models = aiImageModelOptions(provider);
  const current = normalizeImageModelRoute(state.ai.imageModelRoute || "");
  const providerLast = getLastImageModel(provider, "route");
  const configRoute = normalizeImageModelRoute(state.config?.imageModelRoute || "");
  const selected = [
    current !== "auto" && models.includes(current) ? current : "",
    providerLast && models.includes(providerLast) ? providerLast : "",
    configRoute !== "auto" && models.includes(configRoute) ? configRoute : "",
    state.config?.image1kModel && models.includes(state.config.image1kModel) ? state.config.image1kModel : "",
    models[0] || ""
  ].find(Boolean) || "";
  els.aiImageModelSelect.innerHTML = "";
  for (const model of models) {
    const info = getModelInfo(model);
    const option = document.createElement("option");
    option.value = model;
    option.textContent = `${model}${info?.supportText ? ` · ${info.supportText}` : ""}`;
    els.aiImageModelSelect.appendChild(option);
  }
  const customOption = document.createElement("option");
  customOption.value = CUSTOM_MODEL_VALUE;
  customOption.textContent = "手动输入其他模型";
  els.aiImageModelSelect.appendChild(customOption);
  if (selected !== "auto" && models.includes(selected)) {
    els.aiImageModelSelect.value = selected;
    els.aiImageModelCustom.classList.add("hidden");
    els.aiImageModelCustom.value = "";
  } else if (models.length) {
    els.aiImageModelSelect.value = models[0];
    state.ai.imageModelRoute = models[0];
    els.aiImageModelCustom.classList.add("hidden");
    els.aiImageModelCustom.value = "";
  } else {
    els.aiImageModelSelect.value = CUSTOM_MODEL_VALUE;
    els.aiImageModelCustom.classList.remove("hidden");
  }
}

async function persistAiImageModelSelection() {
  const selected = selectedAiImageModel();
  if (!selected) return;
  state.ai.imageModelRoute = selected;
  const provider = state.config?.imageProvider || "grsai";
  const imageProviderLastModels = {
    ...getImageProviderLastModels(),
    [`${provider}:route`]: selected
  };
  const imageProviderModels = {
    ...getImageProviderModels(),
    [provider]: uniqueModelOptions([selected, ...(getImageProviderModels()[provider] || [])]).slice(0, 200)
  };
  state.config = await window.studio.saveConfig({
    ...state.config,
    imageProviderLastModels,
    imageProviderModels
  });
}

function populateModelRouteSelect() {
  const select = $("#modelRoute");
  if (!select) return;
  const selected = normalizeImageModelRoute(state.imageModelRoute || state.config?.imageModelRoute);
  const previousValue = select.value;
  const effectiveSelected = selected;
  if (state.imageModelRoute !== effectiveSelected) state.imageModelRoute = effectiveSelected;
  const models = imageModelRouteOptions();
  select.innerHTML = "";
  const autoModel = resolveCurrentImageModel();
  const auto = document.createElement("option");
  auto.value = "auto";
  auto.textContent = `自动：${autoModel}`;
  select.appendChild(auto);
  for (const model of models) {
    const info = getModelInfo(model);
    const option = document.createElement("option");
    option.value = model;
    option.textContent = `${model}${info?.supportText ? ` · ${info.supportText}` : ""}`;
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
  populateAiImageModelSelect();
}

function populateFeatureImageModelRouteSelect(scope = "aplus") {
  const key = normalizeResultScope(scope);
  const select = key === "aplus" ? els.aplusImageModelRoute : null;
  if (!select) return;
  const selected = featureImageModelRoute(key);
  const models = uniqueModelOptions([selected !== "auto" ? selected : "", ...imageModelRouteOptions()]);
  select.innerHTML = "";
  const auto = document.createElement("option");
  auto.value = "auto";
  auto.textContent = `自动：${resolveCurrentImageModel()}`;
  select.appendChild(auto);
  for (const model of models) {
    const info = getModelInfo(model);
    const option = document.createElement("option");
    option.value = model;
    option.textContent = `${model}${info?.supportText ? ` · ${info.supportText}` : ""}`;
    select.appendChild(option);
  }
  if (selected !== "auto" && [...select.options].some((option) => option.value === selected)) {
    select.value = selected;
  } else {
    select.value = "auto";
  }
  select.title = select.value === "auto" ? "跟随图片制作页当前生图模型" : select.value;
}

function syncFeatureImageModelRouteUi(scope = "aplus") {
  const key = normalizeResultScope(scope);
  if (key === "image") return;
  populateFeatureImageModelRouteSelect(key);
  const model = resolveImageModelForScope(key);
  const select = key === "aplus" ? els.aplusImageModelRoute : null;
  select?.classList.toggle("model-resolution-warning", !supportsModelResolution(model, state.resolution));
}

function syncAllFeatureImageModelRouteUi() {
  syncFeatureImageModelRouteUi("aplus");
}

function syncImageModelRouteUi() {
  ensureResolutionSupported();
  syncResolutionButtons();
  populateModelRouteSelect();
  syncAllFeatureImageModelRouteUi();
  updateImageModelUi();
}

function getProductUploadStatusText(scope = "image") {
  const uploaded = productImagesForScope(scope).length;
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

function compactImageDataUrl(dataUrl, maxSide = 768, quality = 0.78) {
  return new Promise((resolve) => {
    const value = String(dataUrl || "");
    if (!/^data:image\/[a-z0-9.+-]+;base64,/i.test(value)) {
      resolve(value);
      return;
    }
    const image = new Image();
    image.onload = () => {
      try {
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
        const width = Math.max(1, Math.round((image.naturalWidth || 1) * scale));
        const height = Math.max(1, Math.round((image.naturalHeight || 1) * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.fillStyle = "#fff";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        const compacted = canvas.toDataURL("image/jpeg", quality);
        resolve(compacted && compacted.length < value.length ? compacted : value);
      } catch {
        resolve(value);
      }
    };
    image.onerror = () => resolve(value);
    image.src = value;
  });
}

async function compactPromptImages(images = [], limit = 1, maxSide = 768) {
  const source = (Array.isArray(images) ? images : []).filter(Boolean).slice(0, limit);
  const compacted = [];
  for (const image of source) {
    compacted.push(await compactImageDataUrl(image, maxSide));
  }
  return compacted.filter(Boolean);
}

async function addFiles(files, scope = "image") {
  const key = normalizeResultScope(scope);
  const images = productImagesForScope(key);
  const remaining = Math.max(0, PRODUCT_IMAGE_LIMIT - images.length);
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
    images.push({ name: file.name, dataUrl });
  }
  if (accepted.length && key === "image") markProductFactsEdited();
  if (key === "aplus") renderAplusThumbs();
  else renderThumbs();
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
  markProductFactsEdited();
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
      markProductFactsEdited();
      renderThumbs();
    });
  });

  updateProductUploadStatus();
  renderTitleThumbs();
  renderAplusThumbs();
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
      markProductFactsEdited();
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
  const plans = $$('input[name="imageKind"]:checked').map((input) => {
    const row = input.closest(".kind-row");
    const key = row?.dataset.kind || input.value;
    return {
      kind: input.value,
      module: row?.dataset.module || "",
      count: Math.max(0, Number(state.kindCounts[key] || 0))
    };
  });
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
  els.aPlusOptions?.classList.add("hidden");
  updateImageModelUi();
}

function syncSuiteModeUi() {
  state.suiteMode = "custom";
  els.suiteCustomPanel?.classList.remove("hidden");
  updateTotalCount();
}

function productModeCopy(mode = "single") {
  const copies = {
    single: {
      title: "填写产品名称",
      caption: "填写名称和必要事实，可用 AI帮写生成短商品事实，确认后再生成图片。",
      nameLabel: "产品名称",
      namePlaceholder: "请填写产品名称",
      infoLabel: "商品卖点&要求",
      infoPlaceholder: "建议包含：1.产品名称 2.核心卖点 3.适用人群 4.使用场景 5.具体参数。",
      hint: "单品：围绕一个产品和真实使用关系生成套图。",
      tips: "单品只需要名称、购买单位和正确使用关系；不需要写长篇提示词。"
    },
    bundle: {
      title: "填写组合装名称",
      caption: "组合装需要写清组件、每件差异和完整购买单位。",
      nameLabel: "组合装产品名称",
      namePlaceholder: "请填写组合装产品名称",
      infoLabel: "商品卖点&要求",
      infoPlaceholder: "建议写清组件、数量、核心卖点、适用人群、使用场景和必须保留的参数。",
      hint: "组合装：强调组件关系、完整购买单位和搭配价值。",
      tips: "组合装重点是组件清单、每件差异、是否全部出镜，避免 AI 把套装改成单品。"
    },
    multipack: {
      title: "填写多PCS装名称",
      caption: "多PCS装需要填写 PCS 数量和包装/排列方式。",
      nameLabel: "多PCS装产品名称",
      namePlaceholder: "请填写多PCS装产品名称",
      infoLabel: "商品卖点&要求",
      infoPlaceholder: "建议写清数量、包装、核心卖点、适用人群、使用场景和必须保留的参数。",
      hint: "多PCS装：突出可数排列、整包价值、补充周期或高频使用。",
      tips: "多PCS装重点是数量、整包价值、可数排列或包装密度，避免 AI 随机增减数量。"
    }
  };
  return copies[mode] || copies.single;
}

function buildPackageInputs() {
  return {
    unitOfSale: els.unitOfSaleInput?.value.trim() || "",
    bundleComponents: els.bundleComponentsInput?.value.trim() || "",
    componentDifferences: els.componentDifferencesInput?.value.trim() || "",
    pcsCount: els.pcsCountInput?.value.trim() || "",
    packArrangement: els.packArrangementInput?.value.trim() || "",
    usageNotes: els.usageNotesInput?.value.trim() || ""
  };
}

function buildProductInfoText() {
  const mode = state.productPackageMode || "single";
  const copy = productModeCopy(mode);
  const name = els.productName?.value.trim() || "";
  const details = els.productInfo?.value.trim() || "";
  const packageInputs = buildPackageInputs();
  const modeLabel = mode === "bundle" ? "组合装" : mode === "multipack" ? "多PCS装" : "单品";
  return [
    `产品形态：${modeLabel}`,
    name ? `${copy.nameLabel}：${name}` : "",
    packageInputs.unitOfSale ? `购买单位：${packageInputs.unitOfSale}` : "",
    mode === "bundle" && packageInputs.bundleComponents ? `组件清单：${packageInputs.bundleComponents}` : "",
    mode === "bundle" && packageInputs.componentDifferences ? `组件差异/出镜：${packageInputs.componentDifferences}` : "",
    mode === "multipack" && packageInputs.pcsCount ? `PCS数量：${packageInputs.pcsCount}` : "",
    mode === "multipack" && packageInputs.packArrangement ? `包装/排列：${packageInputs.packArrangement}` : "",
    packageInputs.usageNotes ? `正确使用/材质结构：${packageInputs.usageNotes}` : "",
    details ? `${copy.infoLabel}：${details}` : ""
  ].filter(Boolean).join("\n");
}

function currentProductFactsSignature() {
  const imageFacts = state.images.map((image) => {
    const data = String(image.dataUrl || "");
    return {
      name: image.name || "",
      length: data.length,
      head: data.slice(0, 80),
      tail: data.slice(-80)
    };
  });
  return JSON.stringify({
    productPackageMode: state.productPackageMode || "single",
    productName: (els.productName?.value || "").trim(),
    productInfo: (els.productInfo?.value || "").trim(),
    packageInputs: buildPackageInputs(),
    images: imageFacts
  });
}

function renderSharedProductThumbs(target, scope = "image") {
  if (!target) return;
  const key = normalizeResultScope(scope);
  const images = productImagesForScope(key);
  target.innerHTML = "";
  for (const [index, image] of images.entries()) {
    const item = document.createElement("div");
    item.className = "thumb";
    item.innerHTML = `
      <img src="${image.dataUrl}" alt="">
      <button title="移除" data-index="${index}">×</button>
    `;
    target.appendChild(item);
    item.querySelector("img")?.addEventListener("click", () => {
      openImageViewer(image.dataUrl, image.name || `产品图 ${index + 1}`);
    });
  }
  target.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      images.splice(Number(button.dataset.index), 1);
      if (key === "image") {
        markProductFactsEdited();
        syncAllProductThumbs();
      } else if (key === "aplus") {
        renderAplusThumbs();
      }
    });
  });
}

function syncAllProductThumbs() {
  renderThumbs();
  renderAplusThumbs();
}

function renderAplusThumbs() {
  renderSharedProductThumbs(els.aplusThumbs, "aplus");
  if (els.aplusUploadHint) els.aplusUploadHint.textContent = getProductUploadStatusText("aplus");
}

function renderAiThumbs() {
  if (!els.aiThumbs) return;
  els.aiThumbs.innerHTML = "";
  for (const [index, image] of state.ai.images.entries()) {
    const item = document.createElement("div");
    item.className = "thumb";
    item.innerHTML = `
      <img src="${image.dataUrl}" alt="">
      <button title="移除" data-index="${index}">×</button>
    `;
    item.querySelector("img")?.addEventListener("click", () => openImageViewer(image.dataUrl, image.name || `参考图 ${index + 1}`));
    item.querySelector("button")?.addEventListener("click", () => {
      state.ai.images.splice(index, 1);
      renderAiThumbs();
      if (els.aiStatusLine) {
        els.aiStatusLine.textContent = state.ai.images.length ? `已上传 ${state.ai.images.length} 张参考图` : "等待输入";
      }
    });
    els.aiThumbs.appendChild(item);
  }
  if (els.aiUploadHint) {
    const remaining = Math.max(0, AI_REFERENCE_IMAGE_LIMIT - state.ai.images.length);
    els.aiUploadHint.textContent = `已上传 ${state.ai.images.length} 张，还可上传 ${remaining} 张`;
  }
}

function formatFileSize(bytes = 0) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return "0 KB";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function fileExtension(name = "") {
  const match = String(name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1].toUpperCase() : "FILE";
}

function createAiAttachmentId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `ai-file-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function aiFileStatusLabel(file = {}) {
  if (file.reading) return "读取中";
  if (file.error) return "读取失败";
  if (file.readable) return `可分析 · ${formatFileSize(file.size)}`;
  return `文件信息 · ${formatFileSize(file.size)}`;
}

function renderAiFileChips() {
  if (!els.aiFileChips) return;
  els.aiFileChips.innerHTML = "";
  const files = state.ai.files || [];
  els.aiFileChips.classList.toggle("hidden", !files.length);
  for (const [index, file] of files.entries()) {
    const item = document.createElement("div");
    item.className = `ai-file-chip${file.reading ? " loading" : ""}${file.error ? " error" : ""}`;
    item.innerHTML = `
      <span class="ai-file-type">${escapeHtml(fileExtension(file.name))}</span>
      <span class="ai-file-main">
        <strong>${escapeHtml(file.name || `文件 ${index + 1}`)}</strong>
        <small>${escapeHtml(aiFileStatusLabel(file))}</small>
      </span>
      <button type="button" title="移除文件" data-index="${index}">×</button>
    `;
    item.querySelector("button")?.addEventListener("click", () => {
      state.ai.files.splice(index, 1);
      renderAiFileChips();
      updateAiDocumentHint();
    });
    els.aiFileChips.appendChild(item);
  }
  updateAiDocumentHint();
}

function updateAiDocumentHint() {
  if (!els.aiDocumentHint) return;
  const files = state.ai.files || [];
  const remaining = Math.max(0, AI_FILE_LIMIT - files.length);
  els.aiDocumentHint.textContent = files.length
    ? `已上传 ${files.length} 个文件，还可上传 ${remaining} 个`
    : "文本类文件会读取内容；其他文件会附带文件信息";
}

async function readAiDocument(file) {
  const base = {
    name: file.name || "未命名文件",
    type: file.type || "",
    size: file.size || 0,
    readable: false,
    text: "",
    note: "",
    reading: true
  };
  try {
    const dataUrl = await fileToDataUrl(file);
    const output = await window.studio.readAiFile({
      name: base.name,
      type: base.type,
      size: base.size,
      dataUrl
    });
    return {
      ...base,
      ...output,
      reading: false,
      text: String(output?.text || "").slice(0, AI_FILE_TEXT_PER_FILE_LIMIT)
    };
  } catch (error) {
    return {
      ...base,
      reading: false,
      error: shortErrorMessage(error),
      note: shortErrorMessage(error)
    };
  }
}

async function addAiImages(files = []) {
  const imageFiles = Array.from(files || []).filter((file) => file?.type?.startsWith("image/"));
  const remaining = Math.max(0, AI_REFERENCE_IMAGE_LIMIT - state.ai.images.length);
  const accepted = imageFiles.slice(0, remaining);
  if (accepted.length < imageFiles.length) {
    toast(`顶级模型对话/生图最多保留 ${AI_REFERENCE_IMAGE_LIMIT} 张参考图。`, "error");
  }
  for (const file of accepted) {
    state.ai.images.push({
      name: file.name,
      dataUrl: await fileToDataUrl(file)
    });
  }
  renderAiThumbs();
  if (accepted.length) {
    if (els.aiStatusLine) els.aiStatusLine.textContent = `已添加 ${accepted.length} 张参考图`;
    toast(`已添加 ${accepted.length} 张参考图`);
  }
}

async function addAiDocuments(files = []) {
  const source = Array.from(files || []).filter((file) => file && !file.type?.startsWith("image/"));
  if (!source.length) return;
  const remaining = Math.max(0, AI_FILE_LIMIT - (state.ai.files || []).length);
  const accepted = source.slice(0, remaining).filter((file) => {
    if (file.size > AI_FILE_MAX_SIZE) {
      toast(`${file.name} 超过 ${formatFileSize(AI_FILE_MAX_SIZE)}，已跳过。`, "error");
      return false;
    }
    return true;
  });
  if (accepted.length < source.length) {
    toast(`顶级模型对话/生图最多保留 ${AI_FILE_LIMIT} 个文件。`, "error");
  }
  if (!accepted.length) return;
  const placeholders = accepted.map((file) => ({
    id: createAiAttachmentId(),
    name: file.name || "未命名文件",
    type: file.type || "",
    size: file.size || 0,
    reading: true
  }));
  state.ai.files.push(...placeholders);
  renderAiFileChips();
  if (els.aiStatusLine) els.aiStatusLine.textContent = "正在读取文件";
  const parsed = await Promise.all(accepted.map(async (file, index) => ({
    ...(await readAiDocument(file)),
    id: placeholders[index].id
  })));
  for (const file of parsed) {
    const targetIndex = state.ai.files.findIndex((item) => item.id === file.id);
    if (targetIndex >= 0) state.ai.files.splice(targetIndex, 1, file);
  }
  renderAiFileChips();
  const readableCount = parsed.filter((file) => file.readable).length;
  const infoOnlyCount = parsed.length - readableCount;
  if (els.aiStatusLine) {
    els.aiStatusLine.textContent = readableCount
      ? `已读取 ${readableCount} 个文件${infoOnlyCount ? `，${infoOnlyCount} 个仅附带文件信息` : ""}`
      : "文件已添加，但没有可读文本内容";
  }
  toast(readableCount ? `已读取 ${readableCount} 个文件` : "文件已添加，未提取到可读文本");
}

async function addAiAttachments(files = []) {
  const allFiles = Array.from(files || []);
  await addAiImages(allFiles);
  await addAiDocuments(allFiles);
}

async function handleAiPaste(event) {
  if (state.route !== "ai") return;
  const items = Array.from(event.clipboardData?.items || []);
  const files = items
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter(Boolean);
  if (!files.length) return;
  event.preventDefault();
  await addAiAttachments(files);
  els.aiMessageInput?.focus();
}

function buildAiFileContext() {
  const files = (state.ai.files || []).filter((file) => !file.reading);
  if (!files.length) return "";
  let used = 0;
  const sections = [];
  for (const file of files) {
    const meta = [
      `文件名：${file.name || "未命名文件"}`,
      `类型：${file.type || "未知"}`,
      `大小：${formatFileSize(file.size)}`
    ].join("；");
    const text = String(file.text || "").trim();
    const note = String(file.note || file.error || "").trim();
    const remaining = Math.max(0, AI_FILE_CONTEXT_LIMIT - used);
    if (!remaining) break;
    if (text) {
      const clipped = text.slice(0, Math.min(AI_FILE_TEXT_PER_FILE_LIMIT, remaining));
      used += clipped.length;
      sections.push(`【可读文件】${meta}\n内容：\n${clipped}${text.length > clipped.length ? "\n（内容过长，已截断）" : ""}`);
    } else {
      sections.push(`【文件信息】${meta}\n说明：${note || "没有可发送给模型的文本内容；请基于文件名和用户问题谨慎回答，不要假装已经读取文件正文。"}`);
    }
  }
  if (!sections.length) return "";
  return [
    "以下是用户上传给顶级模型对话/生图的附件资料。请优先基于可读文件内容回答；如果某个文件只有文件信息，请明确说明无法读取正文，不要编造文件内容。",
    sections.join("\n\n")
  ].join("\n\n");
}

function buildAiConversationContext() {
  const history = (state.ai.messages || [])
    .filter((item) => item.role === "user" || item.role === "assistant")
    .slice(-8)
    .map((item) => `${item.role === "user" ? "用户" : (item.modelName || "模型")}：${String(item.text || "").replace(/\s+/g, " ").slice(0, 900)}`)
    .filter((line) => !/：$/.test(line));
  return history.length ? `最近对话上下文：\n${history.join("\n")}` : "";
}

function aiAssistantModelName(mode = state.ai.mode || "chat", promptConfig = null) {
  if (mode === "image") return resolveAiImageModel() || "生图模型";
  const config = promptConfig || promptConfigForScope("ai");
  return config.promptModel || promptProviderLabel(config.promptProvider || "custom") || "模型";
}

function renderAiMessages() {
  if (!els.aiMessages) return;
  if (!state.ai.messages.length) {
    els.aiMessages.innerHTML = "";
    els.aiMessages.classList.add("ai-messages-empty");
    return;
  }
  els.aiMessages.classList.remove("ai-messages-empty");
  els.aiMessages.innerHTML = "";
  for (const message of state.ai.messages) {
    const item = document.createElement("article");
    item.className = `ai-message ai-message-${message.role}${message.pending ? " ai-message-pending" : ""}`;
    const images = (message.images || [])
      .map((url) => `<img src="${escapeHtml(url)}" alt="AI生成图">`)
      .join("");
    const fileChips = (message.files || [])
      .map((file) => `<span class="ai-message-file">${escapeHtml(file.name || "文件")}<small>${escapeHtml(file.readable ? "已读取" : "文件信息")}</small></span>`)
      .join("");
    const label = message.role === "assistant" ? (message.modelName || "模型") : "";
    item.innerHTML = `
      ${label ? `<strong>${escapeHtml(label)}</strong>` : ""}
      ${message.pending ? `<div class="ai-typing" aria-label="等待回复"><span></span><span></span><span></span></div>` : ""}
      ${!message.pending && message.text ? `<p>${escapeHtml(message.text)}</p>` : ""}
      ${fileChips ? `<div class="ai-message-files">${fileChips}</div>` : ""}
      ${images ? `<div class="ai-message-images">${images}</div>` : ""}
    `;
    item.querySelectorAll("img").forEach((img) => {
      img.addEventListener("click", () => openImageViewer(img.src, "顶级模型结果"));
    });
    els.aiMessages.appendChild(item);
  }
  els.aiMessages.scrollTop = els.aiMessages.scrollHeight;
}

function setAiMode(mode = "chat") {
  state.ai.mode = mode === "image" ? "image" : "chat";
  els.aiModeGroup?.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.value === state.ai.mode);
  });
  if (els.aiSendBtn) els.aiSendBtn.textContent = state.ai.mode === "image" ? "生成图片" : "发送";
}

async function sendAiWorkspaceMessage() {
  const message = els.aiMessageInput?.value.trim() || "";
  const pendingFiles = (state.ai.files || []).filter((file) => file.reading);
  if (pendingFiles.length) {
    toast("文件还在读取中，请稍等。", "error");
    return;
  }
  if (!message && !state.ai.images.length && !state.ai.files.length) {
    toast("请输入内容，或上传图片/文件。", "error");
    return;
  }
  const mode = state.ai.mode || "chat";
  if (mode === "image" && !message) {
    toast("生成图片模式需要输入明确的作图或修改要求。", "error");
    return;
  }
  if (mode === "image" && !message && state.ai.files.length && !state.ai.images.length) {
    toast("生成图片模式需要输入作图要求，文件分析请切换到对话模式。", "error");
    return;
  }
  const fileContext = buildAiFileContext();
  const conversationContext = mode === "chat" ? buildAiConversationContext() : "";
  const modelMessage = [conversationContext, fileContext, message].filter(Boolean).join("\n\n");
  const promptConfig = mode === "chat" ? promptConfigForScope("ai") : null;
  const modelName = aiAssistantModelName(mode, promptConfig);
  const pendingId = createAiAttachmentId();
  state.ai.messages.push({
    role: "user",
    text: message || (mode === "image" ? "按参考图生成/修改图片" : (state.ai.files.length ? "请分析上传文件" : "请分析参考图")),
    images: state.ai.images.map((image) => image.dataUrl),
    files: state.ai.files.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      readable: file.readable
    }))
  });
  state.ai.messages.push({
    id: pendingId,
    role: "assistant",
    modelName,
    pending: true
  });
  if (els.aiMessageInput) els.aiMessageInput.value = "";
  renderAiMessages();
  if (els.aiStatusLine) els.aiStatusLine.textContent = mode === "image" ? "正在生成图片" : "正在调用 AI";
  if (els.aiSendBtn) els.aiSendBtn.disabled = true;
  try {
    const images = await compactPromptImages(state.ai.images.map((image) => image.dataUrl), 6, 1600);
    if (mode === "image") {
      const output = await window.studio.aiGenerateImage({
        prompt: [fileContext, message].filter(Boolean).join("\n\n"),
        images,
        resolution: state.resolution,
        ratio: state.ratio,
        imageModelRoute: resolveAiImageModel()
      });
      const urls = (output.results || []).map((item) => item.url).filter(Boolean);
      const pending = state.ai.messages.find((item) => item.id === pendingId);
      if (pending) {
        pending.pending = false;
        pending.text = urls.length ? "图片已生成。" : "作图接口没有返回图片。";
        pending.images = urls;
      }
      if (els.aiStatusLine) els.aiStatusLine.textContent = urls.length ? "图片生成完成" : "图片生成失败";
    } else {
      if (!ensureVisionModelForImages("顶级模型对话", images, promptConfig)) {
        state.ai.messages = state.ai.messages.filter((item) => item.id !== pendingId);
        return;
      }
      const output = await window.studio.aiChat({
        message: modelMessage,
        images,
        promptConfig,
        requireVisionPromptModel: images.length > 0
      });
      const pending = state.ai.messages.find((item) => item.id === pendingId);
      if (pending) {
        pending.pending = false;
        pending.text = output.text || "模型没有返回文字。";
      }
      if (els.aiStatusLine) els.aiStatusLine.textContent = "AI 已回复";
    }
  } catch (error) {
    const pending = state.ai.messages.find((item) => item.id === pendingId);
    if (pending) {
      pending.pending = false;
      pending.text = `调用失败：${shortErrorMessage(error)}`;
    }
    if (els.aiStatusLine) els.aiStatusLine.textContent = "调用失败";
    showFailureModal(error, mode === "image" ? "顶级模型生图失败" : "顶级模型对话失败", sendAiWorkspaceMessage);
  } finally {
    if (els.aiSendBtn) els.aiSendBtn.disabled = false;
    renderAiMessages();
  }
}

function clearAiWorkspace() {
  state.ai.images = [];
  state.ai.files = [];
  state.ai.messages = [];
  if (els.aiMessageInput) els.aiMessageInput.value = "";
  renderAiThumbs();
  renderAiFileChips();
  renderAiMessages();
  if (els.aiStatusLine) els.aiStatusLine.textContent = "新对话已准备好";
}

function fillAiWorkspacePrompt(type = "") {
  if (!els.aiMessageInput) return;
  const presets = {
    analyze: {
      mode: "chat",
      text: "请分析我上传的产品图中是否存在变形、结构错误、材质失真、使用方式错误，并指出需要修改的位置。"
    },
    edit: {
      mode: "chat",
      text: "请把我上传的图片问题整理成一条简短、精准、适合作图模型执行的修图指令，只修改问题区域，保持产品结构、材质、数量和主体身份不变。"
    },
    usage: {
      mode: "chat",
      text: "请检查图片里的产品使用方式、接触关系、使用后状态是否正确，尤其不要把产品做坏、做断或改变真实功能。"
    },
    prompt: {
      mode: "chat",
      text: "请优化下面的作图提示词，让它更短、更准确，重点解决产品使用方式错误、展示状态错误、产品被做坏或做断的问题。"
    },
    ecommerce: {
      mode: "image",
      text: [
        "请根据我上传的产品参考图生成一张专业电商产品图片。",
        "要求：保持产品真实结构、颜色、材质、数量、比例和可见细节完全一致，不要重新设计产品，不要增加不存在的配件。",
        "画面：干净高级的商业摄影风格，产品为主体，构图清晰，有自然光影和真实材质质感，背景和道具只做衬托，不遮挡产品关键结构。",
        "用途：适合作为跨境电商详情页/商品展示图，画面看起来真实、清爽、可直接用于销售页面。",
        "禁止：文字水印、中文文字、虚假品牌、夸张特效、产品变形、错误使用方式、产品被切断或融合到其它物体。"
      ].join("\n")
    },
    image: {
      mode: "image",
      text: "请根据我上传的参考图生成或修改图片，只调整我描述的问题，保持产品结构、材质、数量和主体身份不变。"
    }
  };
  const preset = presets[type] || presets.analyze;
  setAiMode(preset.mode);
  els.aiMessageInput.value = preset.text;
  els.aiMessageInput.focus();
}

function syncAplusModuleCard(input) {
  const card = input?.closest(".aplus-module-card");
  if (card) card.classList.toggle("selected", Boolean(input.checked));
}

function syncAplusSelectAllButton() {
  const inputs = $$("[data-aplus-module]");
  const allSelected = inputs.length > 0 && inputs.every((input) => input.checked);
  if (els.aplusSelectAllModulesBtn) els.aplusSelectAllModulesBtn.textContent = allSelected ? "取消全选" : "全选";
}

function syncAplusModuleUi() {
  $$("[data-aplus-module]").forEach(syncAplusModuleCard);
  syncAplusSelectAllButton();
}

async function handleAplusProductImageDrop(event) {
  event.preventDefault();
  els.aplusDropzone?.classList.remove("dragging");
  await addFiles(extractImageFilesFromDataTransfer(event.dataTransfer), "aplus");
}

function hasProductInfoInput() {
  const packageInputs = buildPackageInputs();
  return Boolean(
    (els.productName?.value || "").trim()
    || (els.productInfo?.value || "").trim()
    || Object.values(packageInputs).some((value) => String(value || "").trim())
  );
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
  const partFunctions = chineseDisplayList(analysis.part_function_map_zh);
  const details = chineseDisplayList(analysis.detail_focus_areas_zh);
  const regional = analysis.regional_use_context || {};
  const factLines = [];
  if (chineseDisplayText(analysis.product_summary_zh)) factLines.push(`产品：${chineseDisplayText(analysis.product_summary_zh).slice(0, 140)}`);
  if (chineseDisplayText(analysis.unit_of_sale)) factLines.push(`购买单位：${chineseDisplayText(analysis.unit_of_sale).slice(0, 80)}`);
  if (details.length) factLines.push(`外观/材质：${details.slice(0, 5).join("；")}`);
  if (partFunctions.length) factLines.push(`结构功能：${partFunctions.slice(0, 5).join("；")}`);
  if (chineseDisplayText(regional.real_use_summary_zh)) factLines.push(`用途：${chineseDisplayText(regional.real_use_summary_zh).slice(0, 100)}`);
  if (chineseDisplayText(analysis.correct_use_method_zh)) factLines.push(`正确用法：${chineseDisplayText(analysis.correct_use_method_zh).slice(0, 120)}`);
  const lines = [
    ...factLines.slice(0, 6),
    "提示：这里只核对商品事实和正确使用方式，不要写完整作图提示词。"
  ].filter(Boolean);
  return lines.join("\n");
}

function shouldReplaceProductDescription() {
  const current = els.productInfo?.value.trim() || "";
  return !current || Boolean(state.autoFilledProductInfo && current === state.autoFilledProductInfo);
}

function syncEditableProductDescriptionFromAnalysis(analysis = {}) {
  state.autoFilledProductInfo = composeEditableProductDescription(analysis);
  if (els.productInfo && shouldReplaceProductDescription()) {
    els.productInfo.value = state.autoFilledProductInfo;
    updateProductInfoCharCount();
  }
  state.productFactsReviewPending = false;
  return Boolean(state.autoFilledProductInfo);
}

function updateProductInfoCharCount() {
  const nameTotal = els.productName?.value.length || 0;
  const infoTotal = els.productInfo?.value.length || 0;
  if (els.charCount) els.charCount.textContent = `${nameTotal}/200 · ${infoTotal}/1800`;
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
  els.bundleFields?.classList.toggle("hidden", state.productPackageMode !== "bundle");
  els.multipackFields?.classList.toggle("hidden", state.productPackageMode !== "multipack");
  updateProductInfoCharCount();
}

function markProductFactsEdited() {
  state.productFactsReviewPending = false;
  const changed = !state.lastAnalyzedProductFacts || currentProductFactsSignature() !== state.lastAnalyzedProductFacts;
  if (changed) {
    state.analysis = null;
    state.lastAnalyzedProductFacts = "";
    state.suitePlan = null;
    state.promptPlan = [];
    if (els.promptBox) els.promptBox.value = "";
    renderSuitePlan(null);
    renderPromptPlan([]);
    if (els.summaryBox) els.summaryBox.value = "";
    if (els.sellingPointsBox) els.sellingPointsBox.value = "";
    if (els.statusLine) els.statusLine.textContent = "商品信息已更新，生成时会直接使用当前填写内容";
  }
}

function buildPayload() {
  return {
    featureScope: "image",
    productInfo: buildProductInfoText(),
    productPackageMode: state.productPackageMode,
    packageInputs: buildPackageInputs(),
    images: state.images.slice(0, 6).map((image) => image.dataUrl),
    brand: { ...state.brand },
    resolution: state.resolution,
    ratio: state.ratio,
    imageModelRoute: resolveCurrentImageModel(),
    referenceStrategy: state.referenceStrategy,
    suiteMode: state.suiteMode,
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
  const nextRoute = ["image", "ai", "aplus", "title", "video"].includes(route) ? route : "image";
  state.route = nextRoute;
  localStorage.setItem(ACTIVE_ROUTE_STORAGE_KEY, nextRoute);

  els.sideNavItems.forEach((button) => {
    button.classList.toggle("active", button.dataset.route === nextRoute);
  });
  els.imagePage.classList.toggle("hidden", nextRoute !== "image");
  els.aiPage?.classList.toggle("hidden", nextRoute !== "ai");
  els.aplusPage?.classList.toggle("hidden", nextRoute !== "aplus");
  els.titlePage.classList.toggle("hidden", nextRoute !== "title");
  els.videoPage.classList.toggle("hidden", nextRoute !== "video");

  if (nextRoute === "title") {
    syncTitleInputsFromImage();
  } else if (nextRoute === "aplus") {
    syncAplusInputsFromImage();
  }
}

function syncAplusInputsFromImage() {
  if (els.aplusProductName) els.aplusProductName.value = state.aplus.productName || els.aplusProductName.value || "";
  if (els.aplusProductInfo) els.aplusProductInfo.value = state.aplus.productInfo || els.aplusProductInfo.value || "";
  renderAplusThumbs();
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
  cancelProgressHideTimer();
  els.progressBox.classList.remove("hidden");
  els.progressBox.classList.remove("progress-failed", "progress-success");
  els.progressBox.classList.toggle("ai-thinking", safe < 100);
  els.progressFill.style.width = `${safe}%`;
  els.progressNumber.textContent = `${Math.round(safe)}%`;
  if (text) els.progressText.textContent = text;
}

function activeResultsContainer(scope = generationResultScope()) {
  const key = normalizeResultScope(scope);
  if (key === "aplus") return els.aplusResults || els.results;
  return els.results;
}

function activeProgressScope(scope = generationResultScope()) {
  return normalizeResultScope(scope);
}

function scopedStatusLine(scope = activeProgressScope()) {
  if (scope === "aplus") return els.aplusStatusLine || els.statusLine;
  return els.statusLine;
}

function setActiveGenerationProgress(value, text, status = "active", scope = generationResultScope()) {
  scope = activeProgressScope(scope);
  if (scope === "image") {
    if (status === "failed") setProgressFailed(text);
    else if (status === "success") setProgressSuccess(text);
    else setProgress(value, text);
    return;
  }
  setScopedProgress(scope, value, text, status);
}

function setScopedProgress(scope, value, text, status = "active") {
  const map = scope === "aplus"
    ? {
      box: els.aplusProgressBox,
      text: els.aplusProgressText,
      number: els.aplusProgressNumber,
      fill: els.aplusProgressFill
    }
    : {
        box: els.progressBox,
        text: els.progressText,
        number: els.progressNumber,
        fill: els.progressFill
      };
  if (!map.box || !map.fill || !map.number || !map.text) return;
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  map.box.classList.remove("hidden", "progress-failed", "progress-success");
  if (status === "failed") {
    map.box.classList.add("progress-failed");
    map.fill.style.width = "100%";
    map.number.textContent = "失败";
  } else if (status === "success") {
    map.box.classList.add("progress-success");
    map.fill.style.width = "100%";
    map.number.textContent = "100%";
  } else {
    map.box.classList.toggle("ai-thinking", safe < 100);
    map.fill.style.width = `${safe}%`;
    map.number.textContent = `${Math.round(safe)}%`;
  }
  map.text.textContent = text || "生成中";
}

function setInlineAiStatus(scope = "image", text = "", status = "active") {
  const key = normalizeResultScope(scope);
  const target = key === "aplus" ? els.aplusAiInlineStatus : els.imageAiInlineStatus;
  if (!target) return;
  target.textContent = text || "";
  target.classList.toggle("hidden", !text);
  target.classList.remove("active", "success", "failed");
  if (text) target.classList.add(status === "failed" ? "failed" : status === "success" ? "success" : "active");
}

function workflowStepDefinitions() {
  return [
    { id: "analysis", label: "AI识别产品" },
    { id: "planning", label: "提交与规划任务" },
    { id: "prompts", label: "生成分类提示词" },
    { id: "submit", label: "提交作图任务" },
    { id: "render", label: "等待生图返回" },
    { id: "done", label: "展示结果" }
  ];
}

function workflowIndex(stepId) {
  return workflowStepDefinitions().findIndex((step) => step.id === stepId);
}

function resetWorkflowSteps(mode = "generate") {
  const disabled = mode === "analyze" ? new Set(["planning", "prompts", "submit", "render", "done"]) : new Set();
  state.workflowSteps = workflowStepDefinitions().map((step) => ({
    ...step,
    status: disabled.has(step.id) ? "disabled" : "pending",
    detail: ""
  }));
  renderWorkflowSteps();
}

function setWorkflowStep(stepId, status = "active", detail = "") {
  if (!els.workflowSteps) return;
  if (!state.workflowSteps?.length) resetWorkflowSteps("generate");
  const targetIndex = workflowIndex(stepId);
  state.workflowSteps = state.workflowSteps.map((step, index) => {
    if (step.status === "disabled") return step;
    if (index < targetIndex && ["pending", "active"].includes(step.status)) {
      return { ...step, status: "done", detail: step.detail || "" };
    }
    if (step.id === stepId) return { ...step, status, detail };
    return step;
  });
  renderWorkflowSteps();
}

function failWorkflowStep(stepId, detail = "") {
  setWorkflowStep(stepId, "failed", detail);
}

function completeWorkflow(detail = "") {
  state.workflowSteps = workflowStepDefinitions().map((step) => ({
    ...step,
    status: "done",
    detail: step.id === "done" ? detail : ""
  }));
  renderWorkflowSteps();
}

function renderWorkflowSteps() {
  if (!els.workflowSteps) return;
  const steps = state.workflowSteps?.length ? state.workflowSteps : workflowStepDefinitions().map((step) => ({
    ...step,
    status: "pending",
    detail: ""
  }));
  els.workflowSteps.classList.remove("hidden");
  els.workflowSteps.innerHTML = steps.map((step) => `
    <div class="workflow-step ${step.status}">
      <span class="workflow-dot"></span>
      <span class="workflow-label">${escapeHtml(step.label)}</span>
      ${step.detail ? `<small>${escapeHtml(step.detail)}</small>` : ""}
    </div>
  `).join("");
}

function cancelProgressHideTimer() {
  if (!progressHideTimer) return;
  window.clearTimeout(progressHideTimer);
  progressHideTimer = null;
}

function hideProgressLater(delay = 900) {
  cancelProgressHideTimer();
  progressHideTimer = window.setTimeout(() => {
    progressHideTimer = null;
    if (state.activeGenerationId) return;
    els.progressBox.classList.add("hidden");
  }, delay);
}

function markGenerationHeartbeat() {
  state.lastGenerationProgressAt = Date.now();
}

function stopGenerationWatchdog() {
  if (!generationWatchdogTimer) return;
  window.clearInterval(generationWatchdogTimer);
  generationWatchdogTimer = null;
}

function startGenerationWatchdog(generationId, scope = generationResultScope()) {
  const key = normalizeResultScope(scope);
  stopGenerationWatchdog();
  state.activeGenerationStartedAt = Date.now();
  state.lastGenerationProgressAt = state.activeGenerationStartedAt;
  generationWatchdogTimer = window.setInterval(() => {
    if (state.activeGenerationId !== generationId) {
      stopGenerationWatchdog();
      return;
    }
    const now = Date.now();
    const startedAt = state.activeGenerationStartedAt || now;
    const lastProgressAt = state.lastGenerationProgressAt || startedAt;
    const silentSeconds = Math.floor((now - lastProgressAt) / 1000);
    const totalSeconds = Math.floor((now - startedAt) / 1000);
    if (silentSeconds < 12) return;

    const active = state.workflowSteps?.find((step) => step.status === "active");
    const stepLabel = active?.label || "后台任务";
    const detail = !state.generationProgressReceived
      ? `正在提交后台任务，已等待 ${silentSeconds} 秒；若超过 15 秒会自动失败并显示真实原因`
      : silentSeconds >= 45
      ? `等待当前步骤返回 ${silentSeconds} 秒，后台会继续按超时规则处理`
      : `等待后台响应 ${silentSeconds} 秒`;
    if (key !== "image") {
      setActiveGenerationProgress(8, `${stepLabel}仍在执行，已等待 ${totalSeconds} 秒；${detail}`, "active", key);
      return;
    }
    if (active?.id) {
      setWorkflowStep(active.id, "active", detail);
    }
    setProgress(
      Number(els.progressNumber?.textContent?.replace("%", "")) || 2,
      `${stepLabel}仍在执行，已等待 ${totalSeconds} 秒；${detail}`
    );
  }, 3000);
}

function weightedGenerationProgress(progress = {}, scope = generationResultScope()) {
  const stage = progress.stage || "";
  const current = Math.max(0, Number(progress.current || 0));
  const total = Math.max(1, Number(progress.total || scopedLiveTotalCount(scope) || 1));
  if (stage === "accepted" || stage === "loading-config") return 2;
  if (stage === "validating" || stage === "planning-items") return 3;
  if (stage === "rewriting-prompts") return Math.min(25, 8 + (current / total) * 17);
  if (stage === "submitting") return 35;
  if (stage === "completed") return 90;
  return Number(progress.progress || 8);
}

function waitForGenerationFinish(generationId, timeoutMs = 30 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      delete state.generationFinishResolvers[generationId];
      reject(new Error("生成任务超过 30 分钟仍未结束，请检查提示词模型、作图模型或网络连接。"));
    }, timeoutMs);
    state.generationFinishResolvers[generationId] = {
      resolve: (value) => {
        window.clearTimeout(timer);
        delete state.generationFinishResolvers[generationId];
        resolve(value);
      },
      reject: (error) => {
        window.clearTimeout(timer);
        delete state.generationFinishResolvers[generationId];
        reject(error);
      }
    };
  });
}

function setProgressFailed(text = "任务失败") {
  cancelProgressHideTimer();
  els.progressBox.classList.remove("hidden", "ai-thinking", "progress-success");
  els.progressBox.classList.add("progress-failed");
  els.progressFill.style.width = "100%";
  els.progressNumber.textContent = "失败";
  els.progressText.textContent = text;
  const active = state.workflowSteps?.find((step) => step.status === "active");
  if (active) failWorkflowStep(active.id, text);
}

function setProgressSuccess(text = "任务完成") {
  cancelProgressHideTimer();
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
  els.sellingPointsBox.value = [
    ...chineseDisplayList(analysis.detail_focus_areas_zh).map((item) => `外观/材质：${item}`),
    ...chineseDisplayList(analysis.part_function_map_zh).map((item) => `结构功能：${item}`),
    chineseDisplayText(analysis.correct_use_method_zh) ? `正确用法：${chineseDisplayText(analysis.correct_use_method_zh)}` : ""
  ].filter(Boolean).join("\n");
  els.promptBox.value = analysis.final_prompt_en || "";

  const warning = Array.isArray(analysis.warnings) && analysis.warnings.length ? `；${analysis.warnings[0]}` : "";
  els.statusLine.textContent = `产品已自动识别，提示词已生成${warning}`;
  syncEditableProductDescriptionFromAnalysis(analysis);
  state.lastAnalyzedProductFacts = currentProductFactsSignature();
  state.productFactsReviewPending = false;
  els.statusLine.textContent = "产品已自动识别，套图生成会继续自动完成";
}

async function analyze() {
  const payload = buildPayload();
  if (!hasProductInfoInput() && payload.images.length === 0) {
    toast("请上传商品图或填写商品信息。", "error");
    return false;
  }
  if (!payload.images.length) {
    showMessageModal("AI帮写必须上传产品图，不能只用纯文本调用。", "缺少产品图", "error");
    return false;
  }
  payload.promptConfig = promptConfigForScope("image");
  if (!ensureVisionModelForImages("图片制作 AI帮写", payload.images, payload.promptConfig)) {
    return false;
  }
  payload.images = await compactPromptImages(payload.images, 4, 1024);
  payload.requireVisionPromptModel = payload.images.length > 0;

  setBusy(true, "正在自动识别产品并生成提示词");
  setInlineAiStatus("image", "AI正在读取产品图", "active");
  resetWorkflowSteps("analyze");
  setWorkflowStep("analysis", "active", "正在调用提示词/识图模型");
  setProgress(12, "AI分析产品中");
  try {
    const analysis = await window.studio.analyzePrompt(payload);
    showAnalysis(analysis);
    setInlineAiStatus("image", "AI帮写完成", "success");
    setWorkflowStep("analysis", "done", "识别完成");
    setProgressSuccess("识别完成");
    hideProgressLater(700);
    return true;
  } catch (error) {
    failWorkflowStep("analysis", shortErrorMessage(error));
    setInlineAiStatus("image", `AI帮写失败：${shortErrorMessage(error)}`, "failed");
    setProgressFailed(`自动识别失败：${shortErrorMessage(error)}`);
    showPromptFailureModal(error, "后台自动识别产品失败", analyze, "image");
    els.statusLine.textContent = "后台自动识别产品失败";
    return false;
  } finally {
    setBusy(false);
  }
}

async function analyzeAplusProduct() {
  const payload = buildAplusPayload();
  if (!payload.productInfo.trim() && payload.images.length === 0) {
    toast("请先上传 A+ 商品图或填写 A+ 商品信息。", "error");
    return false;
  }
  if (!payload.images.length) {
    showMessageModal("A+ AI帮写必须上传产品图，不能只用纯文本帮写。", "缺少产品图", "error");
    return false;
  }
  const promptConfig = promptConfigForScope("aplus");
  if (!ensureVisionModelForImages("A+ AI帮写", "aplus", promptConfig)) {
    return false;
  }
  payload.analysisMode = "aplus-write";
  payload.images = await compactPromptImages(payload.images, 4, 1024);
  payload.promptConfig = promptConfig;
  payload.requireVisionPromptModel = true;

  setBusy(true, "正在为 A+ 详情页分析商品");
  setInlineAiStatus("aplus", "AI正在读取A+产品图", "active");
  setScopedProgress("aplus", 12, "A+ AI帮写中");
  if (els.aplusStatusLine) els.aplusStatusLine.textContent = "A+ AI帮写中";
  try {
    const analysis = await window.studio.analyzePrompt(payload);
    setAnalysisForScope("aplus", analysis);
    const nextInfo = composeEditableProductDescription(analysis);
    if (els.aplusProductInfo && nextInfo) {
      els.aplusProductInfo.value = nextInfo;
      state.aplus.productInfo = els.aplusProductInfo.value;
    }
    if (els.aplusProductName) state.aplus.productName = els.aplusProductName.value;
    setInlineAiStatus("aplus", "AI帮写完成", "success");
    setScopedProgress("aplus", 100, "A+ AI帮写完成", "success");
    if (els.aplusStatusLine) els.aplusStatusLine.textContent = "AI帮写完成，可修改商品卖点&要求后生成 A+ 详情页";
    return true;
  } catch (error) {
    setInlineAiStatus("aplus", `AI帮写失败：${shortErrorMessage(error)}`, "failed");
    setScopedProgress("aplus", 100, `A+ AI帮写失败：${shortErrorMessage(error)}`, "failed");
    showPromptFailureModal(error, "A+ AI帮写失败", analyzeAplusProduct, "aplus");
    if (els.aplusStatusLine) els.aplusStatusLine.textContent = "A+ AI帮写失败";
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

function renderResults(results, scope = generationResultScope()) {
  const key = normalizeResultScope(scope);
  setScopedResults(key, results);
  const safeResults = scopedResults(key);
  const container = activeResultsContainer(key);
  if (!safeResults.length) {
    if (container) {
      container.className = "results empty";
      container.innerHTML = "";
    }
    selectResult(-1, key);
    return;
  }

  if (!container) return;
  container.className = "results";
  container.innerHTML = "";

  for (const [index, result] of safeResults.entries()) {
    const card = buildResultCard(result, index, key);
    container.appendChild(card);
  }
  selectResult(0, key);
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

function resetLiveResults(scope = generationResultScope()) {
  const key = normalizeResultScope(scope);
  setScopedResults(key, []);
  setScopedLiveCompletedCount(key, 0);
  setScopedLiveTotalCount(key, 0);
  resetScopedLiveProgress(key);
  setScopedSelectedIndex(key, -1);
  const container = activeResultsContainer(key);
  if (container) {
    container.className = "results empty tiger-workspace";
    container.innerHTML = "";
  }
  updateSelectedResultPanel(key);
}

function renderSuitePlan(plan = null, scope = "image") {
  const key = normalizeResultScope(scope);
  setScopedSuitePlan(key, null);
  if (key !== "image") return;
  if (els.styleMasterBox) {
    els.styleMasterBox.className = "style-master-box empty hidden";
    els.styleMasterBox.textContent = "";
  }
  if (els.suitePlanStatus) els.suitePlanStatus.textContent = "";
}

function formatPlanDisplayText(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  if (Array.isArray(value)) {
    const text = value.map((item) => formatPlanDisplayText(item, "")).filter(Boolean).join(" / ");
    return text || fallback;
  }
  if (typeof value === "object") {
    const text = Object.values(value).map((item) => formatPlanDisplayText(item, "")).filter(Boolean).join(" / ");
    return text || fallback;
  }
  const text = String(value).trim();
  return text && text !== "[object Object]" ? text : fallback;
}

function renderPromptPlan(items = [], scope = "image") {
  const key = normalizeResultScope(scope);
  setScopedPromptPlan(key, items);
  if (key !== "image") return;
  const promptItems = scopedPromptPlan(key);
  const list = els.promptPlanList;
  if (!list) return;
  if (!promptItems.length) {
    list.className = "prompt-plan-list empty";
    list.textContent = "";
    return;
  }

  list.className = "prompt-plan-list";
  list.innerHTML = "";
  for (const item of promptItems) {
    const row = document.createElement("article");
    row.className = "prompt-plan-item";
    const label = item.kind || "结果图";
    const order = Number(item.index || 0);
    const prompt = normalizePromptDisplayText(formatPlanDisplayText(item.prompt || item.localPrompt || "", ""));
    row.innerHTML = `
      <div class="prompt-plan-head">
        <strong>${order ? `${order}. ` : ""}${escapeHtml(label)}</strong>
        <small>${escapeHtml(item.promptSource || "local")}</small>
      </div>
      <p>${escapeHtml(prompt.slice(0, 260))}${prompt.length > 260 ? "..." : ""}</p>
    `;
    row.addEventListener("click", () => {
      if (order > 0 && scopedResults(key)[order - 1]) {
        selectResult(order - 1, key);
      }
      openPromptDrawer({
        kind: label,
        prompt,
        model: item.targetImageModel || ""
      });
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

function renderGeneratingPlaceholder(total = 0, concurrency = 1, scope = generationResultScope()) {
  const key = normalizeResultScope(scope);
  setScopedLiveTotalCount(key, total);
  const container = activeResultsContainer(key);
  if (!container) return;
  container.className = "results empty generating-results";
  container.innerHTML = `
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

function clearGeneratingPlaceholder(scope = generationResultScope()) {
  const container = activeResultsContainer(scope);
  if (!container || !container.classList.contains("generating-results")) return;
  container.className = "results";
  container.innerHTML = "";
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

function renderPendingResults(items, concurrency = 1, scope = generationResultScope()) {
  const key = normalizeResultScope(scope);
  const safeItems = Array.isArray(items) ? items : [];
  if (!safeItems.length) {
    renderGeneratingPlaceholder(0, concurrency, key);
    return;
  }
  setScopedLiveTotalCount(key, safeItems.length);
  const container = activeResultsContainer(key);
  if (!container) return;
  container.className = "results generating-results";
  container.innerHTML = "";
  for (const item of safeItems) {
    container.appendChild(createPendingResultCard(item));
  }
}

function updatePendingCard(progress, scope = generationResultScope()) {
  const container = activeResultsContainer(scope);
  const card = container?.querySelector(`[data-result-index="${progress.current}"]`);
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

function replaceResultCard(result, index, resultNumber, scope = generationResultScope()) {
  const key = normalizeResultScope(scope);
  clearGeneratingPlaceholder(key);
  const container = activeResultsContainer(key);
  if (!container) return;
  const existing = container.querySelector(`[data-result-index="${index}"]`);
  const card = buildResultCard(result, resultNumber, key);
  card.dataset.resultIndex = String(index);
  if (existing) {
    existing.replaceWith(card);
  } else {
    container.appendChild(card);
  }
  if (!container.querySelector(".result-card-pending")) {
    container.classList.remove("empty", "generating-results");
  }
}

function buildResultCard(result, index, scope = generationResultScope()) {
  const key = normalizeResultScope(scope);
  const card = document.createElement("article");
  card.className = `result-card${result.url ? "" : " result-card-status"}`;
  card.dataset.liveIndex = String(index);
  card.dataset.scope = key;
  const title = result.kind || "结果图";
  const statusText = result.status === "timeout"
    ? "超时"
    : result.status === "failed"
      ? "失败"
      : "";

  if (result.url) {
    const promptWarning = result.promptError || "";
    const promptMeta = promptWarning
      ? `<small class="result-prompt-note">${escapeHtml(promptWarning)}</small>`
      : "";
    card.innerHTML = `
      <img src="${result.url}" alt="">
      <div class="result-meta">${title}${result.model ? ` · ${result.model}` : ""}${result.imageSize ? ` · ${result.imageSize}` : ""}</div>
      ${promptMeta}
      <div class="result-actions">
        <button data-action="save" data-url="${result.url}">保存</button>
        <button data-action="open" data-url="${result.url}">打开</button>
        <button data-action="prompt" type="button">提示词</button>
      </div>
    `;
    bindResultCardActions(card, result, index, key);
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
    selectResult(index, key);
  });
  return card;
}

function appendResultCard(result, index, scope = generationResultScope()) {
  const key = normalizeResultScope(scope);
  if (!scopedResults(key).length) {
    const container = activeResultsContainer(key);
    if (container) {
      container.className = "results";
      container.innerHTML = "";
    }
  }

  clearGeneratingPlaceholder(key);
  activeResultsContainer(key)?.appendChild(buildResultCard(result, index, key));
}

function resultFailureBucket(result = {}) {
  const message = `${result.promptSource || ""} ${result.error || ""}`;
  if (/prompt-api-failed|提示词|分镜|分类/.test(message)) return "提示词生成失败";
  if (/timeout|超时/i.test(message)) return "作图超时";
  return "作图失败";
}

function ensureResultScopeVisible(scope = generationResultScope()) {
  const key = normalizeResultScope(scope);
  if (visibleResultScope() !== key) {
    setRoute(key);
  }
  state.activeGenerationView = key;
  return key;
}

function bindResultCardActions(card, result, index, scope = generationResultScope()) {
  const key = normalizeResultScope(scope);
  card.querySelector('[data-action="save"]')?.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
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

  card.querySelector('[data-action="open"]')?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    selectResult(index, key);
    openImageViewer(result.url, result.kind || "图片预览");
  });

  card.querySelector('[data-action="prompt"]')?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    selectResult(index, key);
    openPromptDrawer(result);
  });

  card.querySelector("img")?.addEventListener("dblclick", (event) => {
    event.preventDefault();
    event.stopPropagation();
    selectResult(index, key);
    openImageViewer(result.url, result.kind || "图片预览");
  });
}

function openPromptDrawer(result = currentSelectedResult()) {
  if (!els.promptDrawer || !els.promptDrawerText) return;
  if (els.promptDrawer.parentElement !== document.body) document.body.appendChild(els.promptDrawer);
  const prompt = result?.prompt || result?.finalPrompt || "";
  els.promptDrawerText.value = prompt || "这张图没有返回可查看的提示词。";
  if (els.promptDrawerMeta) {
    els.promptDrawerMeta.textContent = result
      ? `${result.kind || "结果图"}${result.model ? ` · ${result.model}` : ""}${result.imageSize ? ` · ${result.imageSize}` : ""}`
      : "";
  }
  els.promptDrawer.classList.remove("hidden");
}

function closePromptDrawer() {
  els.promptDrawer?.classList.add("hidden");
}

function currentSelectedResult(scope = "image") {
  const key = normalizeResultScope(scope);
  const index = scopedSelectedIndex(key);
  if (index < 0) return null;
  return scopedResults(key)[index] || null;
}

function updateSelectedResultPanel(scope = "image") {
  const key = normalizeResultScope(scope);
  const result = currentSelectedResult(key);
  const selectedIndex = scopedSelectedIndex(key);
  const container = activeResultsContainer(key) || document;
  Array.from(container.querySelectorAll(".result-card")).forEach((card) => {
    card.classList.toggle("selected", Number(card.dataset.liveIndex) === selectedIndex);
  });
  if (key !== "image") return;

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
  if (els.regenerateSelectedBtn) els.regenerateSelectedBtn.disabled = true;
}

function selectResult(index, scope = "image") {
  const key = normalizeResultScope(scope);
  const safeIndex = Number(index);
  if (!Number.isInteger(safeIndex) || safeIndex < 0 || safeIndex >= scopedResults(key).length) {
    setScopedSelectedIndex(key, -1);
  } else {
    setScopedSelectedIndex(key, safeIndex);
  }
  updateSelectedResultPanel(key);
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
    hideProgressLater(900);
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
    hideProgressLater(900);
  } catch (error) {
    setProgressFailed(`局部修复失败：${shortErrorMessage(error)}`);
    showFailureModal(error, "局部修复失败", repairSelectedResult);
  } finally {
    els.repairSelectedBtn.disabled = !currentSelectedResult()?.url;
    els.repairSelectedBtn.textContent = "按标记局部修复";
  }
}

function mountGlobalImageViewer() {
  if (!els.imageViewer || els.imageViewer.parentElement === document.body) return;
  document.body.appendChild(els.imageViewer);
}

function openImageViewer(url, title = "图片预览") {
  if (!url) return;
  mountGlobalImageViewer();
  currentViewerImage = { url, title };
  els.imageViewerTitle.textContent = title;
  els.imageViewerImg.src = url;
  els.imageViewer.classList.remove("hidden");
}

function closeImageViewer() {
  els.imageViewer.classList.add("hidden");
  els.imageViewerImg.src = "";
  currentViewerImage = null;
}

async function saveViewerImage() {
  if (!currentViewerImage?.url) {
    toast("当前没有可保存的图片。", "error");
    return;
  }
  try {
    const safeTitle = String(currentViewerImage.title || "ai-image")
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .slice(0, 60) || "ai-image";
    await saveImageUrl(currentViewerImage.url, `${safeTitle}-${Date.now()}.png`);
  } catch (error) {
    toast(error.message, "error");
  }
}

function validateFeatureGenerationPayload(payload, label) {
  if (!ensureSupportedImageGeneration(label)) return false;
  if (!payload.images.length) {
    showMessageModal("请先上传产品图。", "缺少产品图", "error");
    return false;
  }
  if (!payload.productInfo.trim()) {
    showMessageModal("请先填写商品名称或商品卖点&要求，也可以先点击 AI帮写。", "缺少商品资料", "error");
    return false;
  }
  if (!payload.imageKinds.length) {
    showMessageModal("请至少选择一个要生成的模块。", "缺少生成模块", "error");
    return false;
  }
  const scope = normalizeResultScope(payload.featureScope || "image");
  const model = payload.imageModelRoute || resolveImageModelForScope(scope);
  const resolution = payload.resolution || state.resolution;
  if (!supportsModelResolution(model, resolution)) {
    showMessageModal(`当前模型 ${model} 不支持 ${resolution}。请先切换模型或分辨率。`, "模型与分辨率不匹配", "error");
    return false;
  }
  return true;
}

async function compactGenerationPayload(payload = {}) {
  return {
    ...payload,
    images: await compactPromptImages(payload.images || [], 6, 1600),
    referenceImages: await compactPromptImages(payload.referenceImages || [], 20, 1400)
  };
}

function generationOutcomeSummary(results = [], expectedTotal = 0) {
  const safeResults = Array.isArray(results) ? results : [];
  const total = Math.max(Number(expectedTotal || 0), safeResults.length);
  const successCount = safeResults.filter((item) => item?.url).length;
  const failedResults = safeResults.filter((item) => !item?.url);
  const missingCount = Math.max(0, total - safeResults.length);
  const failureMap = failedResults.reduce((acc, item) => {
    const bucket = resultFailureBucket(item);
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {});
  if (missingCount) failureMap["未返回结果"] = (failureMap["未返回结果"] || 0) + missingCount;
  const failedCount = Object.values(failureMap).reduce((sum, count) => sum + count, 0);
  const failureSummary = Object.entries(failureMap)
    .map(([name, count]) => `${name} ${count} 张`)
    .join("；");
  return { total, successCount, failedCount, failureSummary };
}

async function submitFeatureGeneration(payload, view, label) {
  const scope = normalizeResultScope(view);
  state.activeGenerationView = scope;
  payload.featureScope = scope;
  payload.imageModelRoute = payload.imageModelRoute || resolveImageModelForScope(scope);
  if (!validateFeatureGenerationPayload(payload, label)) return;
  payload.promptConfig = {
    promptProvider: state.config?.promptProvider || "custom",
    promptBaseUrl: state.config?.promptBaseUrl || "",
    promptApiKey: state.config?.promptApiKey || "",
    promptModel: state.config?.promptModel || "",
    promptEndpoint: state.config?.promptEndpoint || "chat",
    promptProviderApiOptions: state.config?.promptProviderApiOptions || {},
    promptModelCapabilities: state.config?.promptModelCapabilities || {}
  };
  payload.promptConfig = promptConfigForScope(scope);
  const promptVisionInputs = [
    ...(payload.images || []),
    ...(payload.referenceImages || [])
  ].filter(Boolean);
  if (!ensureVisionModelForImages(`${label} AI提示词规划`, promptVisionInputs, payload.promptConfig)) return;
  payload.requireVisionPromptModel = promptVisionInputs.length > 0;

  const generationId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  rememberGenerationScope(generationId, scope);
  state.activeGenerationId = generationId;
  state.generationProgressReceived = false;
  startGenerationWatchdog(generationId, scope);
  markGenerationHeartbeat();
  setBusy(true, `正在生成${label}`);
  setActiveGenerationProgress(2, "正在压缩参考图并提交后台任务", "active", scope);
  setScopedLiveTotalCount(scope, payload.imageKinds.reduce((sum, item) => sum + Number(item.count || 0), 0));
  try {
    const outboundPayload = await compactGenerationPayload(payload);
    const accepted = await Promise.race([
      window.studio.generateImage({
        ...outboundPayload,
        generationId,
        analysis: analysisForScope(scope) || {},
        finalPrompt: scope === "image" ? (els.promptBox?.value.trim() || "") : "",
        negativePrompt: analysisForScope(scope)?.negative_prompt_en || "",
        rendererBuildId: RENDERER_BUILD_ID
      }),
      new Promise((_, reject) => window.setTimeout(() => reject(new Error("提交到后台超过 15 秒仍未响应，主进程可能卡住。请关闭软件后重新打开。")), 15000))
    ]);
    if (!accepted?.accepted) throw new Error("后台没有确认接收生成任务。");
    resetLiveResults(scope);
    const output = await waitForGenerationFinish(generationId);
    renderResults(output.results || [], scope);
    const expectedTotal = payload.imageKinds.reduce((sum, item) => sum + Number(item.count || 0), 0);
    const outcome = generationOutcomeSummary(output.results || [], expectedTotal);
    const statusLine = scopedStatusLine(scope);
    if (outcome.successCount === 0 && outcome.failedCount > 0) {
      const message = `${label}失败：${outcome.failureSummary || `${outcome.failedCount} 张图片失败或超时`}`;
      setActiveGenerationProgress(100, message, "failed", scope);
      if (statusLine) statusLine.textContent = message;
    } else {
      const message = `${label}完成：成功 ${outcome.successCount}/${outcome.total || outcome.successCount} 张${outcome.failedCount ? `，${outcome.failureSummary || `失败/超时 ${outcome.failedCount} 张`}` : ""}`;
      setActiveGenerationProgress(100, message, outcome.failedCount ? "active" : "success", scope);
      if (statusLine) statusLine.textContent = message;
    }
    await loadHistory();
  } catch (error) {
    setActiveGenerationProgress(100, `${label}失败：${shortErrorMessage(error)}`, "failed", scope);
    showFailureModal(error, `${label}失败`, () => submitFeatureGeneration(payload, view, label));
  } finally {
    stopGenerationWatchdog();
    state.activeGenerationId = null;
    setBusy(false);
  }
}

async function generateAplusPage() {
  const payload = buildAplusPayload();
  if (!selectedAplusModules().length) {
    showMessageModal("请至少选择一个 A+ 模块。", "缺少模块", "error");
    return;
  }
  await submitFeatureGeneration(payload, "aplus", "A+详情页");
}

async function generate() {
  state.activeGenerationView = "image";
  logClientEvent("renderer-generate-enter");
  if (!ensureSupportedImageGeneration("批量套图生成")) return;
  let payload = buildPayload();
  logClientEvent("renderer-generate-payload-built", {
    imageKinds: payload.imageKinds,
    resolution: payload.resolution,
    ratio: payload.ratio,
    imageModelRoute: payload.imageModelRoute,
    hasPrompt: Boolean(els.promptBox.value.trim())
  });
  if (!payload.imageKinds.length) {
    logClientEvent("renderer-generate-no-image-kind");
    toast("至少选择一种图片类型。", "error");
    return;
  }
  if (!hasProductInfoInput() && payload.images.length === 0) {
    toast("请先上传商品图或填写产品名称。", "error");
    return;
  }

  const currentFactsSignature = currentProductFactsSignature();
  const analysisSignatureMatches = state.lastAnalyzedProductFacts === currentFactsSignature;
  if (!analysisSignatureMatches) {
    state.analysis = null;
    state.lastAnalyzedProductFacts = "";
    state.productFactsReviewPending = false;
  }
  logClientEvent("renderer-generate-analysis-check", {
    requiresManualAnalysis: false,
    hasFreshAnalysis: Boolean(state.analysis && analysisSignatureMatches),
    hasPrompt: Boolean(els.promptBox.value.trim()),
    analysisSignatureMatches
  });

  const finalPrompt = els.promptBox.value.trim() || payload.productInfo.trim();
  const model = resolveCurrentImageModel();
  if (!supportsModelResolution(model, state.resolution)) {
    logClientEvent("renderer-generate-model-resolution-blocked", { model, resolution: state.resolution });
    showMessageModal(`当前模型 ${model} 不支持 ${state.resolution}。请在左侧切换模型或分辨率后再生成。`, "模型与分辨率不匹配", "error");
    return;
  }

  payload.promptConfig = promptConfigForScope("image");
  if (!ensureVisionModelForImages("图片制作 AI提示词规划", payload.images, payload.promptConfig)) return;
  payload.requireVisionPromptModel = (payload.images || []).length > 0;

  const generationId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  rememberGenerationScope(generationId, "image");
  logClientEvent("renderer-generate-click", { generationId, model });
  state.activeGenerationId = generationId;
  state.generationProgressReceived = false;
  startGenerationWatchdog(generationId);
  markGenerationHeartbeat();

  try {
    logClientEvent("renderer-before-submit-ui", {
      generationId,
      imageKindCount: payload.imageKinds.length
    });

  setBusy(true, "正在提交 Grsai 生成任务");
  cancelProgressHideTimer();
  resetWorkflowSteps("generate");
  setWorkflowStep("analysis", "done", "商品资料已确认");
  setWorkflowStep("planning", "active", "正在提交后台任务");
  setProgress(2, "正在提交后台任务");
  setScopedLiveTotalCount("image", payload.imageKinds.reduce((sum, item) => sum + Number(item.count || 0), 0));
  logClientEvent("renderer-ui-prepared-before-runtime-info", {
    generationId,
    liveTotalCount: scopedLiveTotalCount("image")
  });
    logClientEvent("renderer-before-runtime-info", { generationId });
    const runtimeInfo = await Promise.race([
      window.studio.getRuntimeInfo?.(),
      new Promise((_, reject) => window.setTimeout(() => reject(new Error("无法读取主进程运行版本。")), 3000))
    ]);
    logClientEvent("renderer-runtime-info-ok", {
      generationId,
      runtimeBuildId: runtimeInfo?.buildId,
      runtimeVersion: runtimeInfo?.version
    });
    if (!runtimeInfo?.buildId || !String(runtimeInfo.buildId).includes("bg-ipc-v2")) {
      throw new Error(`主进程版本不匹配：${runtimeInfo?.buildId || "未知"}。请完全关闭软件后重新打开最新版。`);
    }
    logClientEvent("renderer-before-generate-ipc", {
      generationId,
      imageKinds: payload.imageKinds,
      liveTotalCount: scopedLiveTotalCount("image")
    });
    const outboundPayload = await compactGenerationPayload(payload);
    const accepted = await Promise.race([
      window.studio.generateImage({
        ...outboundPayload,
        generationId,
        analysis: state.analysis || {},
        finalPrompt,
        negativePrompt: state.analysis?.negative_prompt_en || "",
        rendererBuildId: RENDERER_BUILD_ID
      }),
      new Promise((_, reject) => window.setTimeout(() => reject(new Error("提交到后台超过 15 秒仍未响应，主进程可能卡住。请关闭软件后重新打开。")), 15000))
    ]);
    logClientEvent("renderer-generate-ipc-returned", { generationId, accepted });
    if (!accepted?.accepted) {
      throw new Error("后台没有确认接收生成任务。");
    }
    markGenerationHeartbeat();
    state.generationProgressReceived = true;
    setWorkflowStep("planning", "active", "后台已接收任务");
    setProgress(2, "后台已接收生成任务，等待执行进度");
    runUiSafely("prepare-live-results-after-submit", () => {
      resetLiveResults("image");
      renderSuitePlan(null, "image");
      renderPromptPlan([], "image");
    });
    logClientEvent("renderer-wait-generation-finish", { generationId });
    const output = await waitForGenerationFinish(generationId);
    logClientEvent("renderer-generation-finish", {
      generationId,
      resultCount: output?.results?.length || 0,
      promptPlanCount: output?.promptPlan?.length || 0
    });
    runUiSafely("render-generation-plan", () => {
      renderSuitePlan(output.suitePlan || state.suitePlan, "image");
      renderPromptPlan(output.promptPlan || state.promptPlan, "image");
    });
    if (!scopedResults("image").length) {
      runUiSafely("render-final-results", () => renderResults(output.results || [], "image"));
    }
    await loadHistory();
    const successCount = (output.results || []).filter((item) => item.url).length;
    const failedCount = Math.max(0, (output.results || []).length - successCount);
    const failureSummary = Object.entries((output.results || [])
      .filter((item) => !item.url)
      .reduce((acc, item) => {
        const bucket = resultFailureBucket(item);
        acc[bucket] = (acc[bucket] || 0) + 1;
        return acc;
      }, {}))
      .map(([label, count]) => `${label} ${count} 张`)
      .join("；");
    if (successCount === 0 && failedCount > 0) {
      els.statusLine.textContent = `生成失败：${failureSummary || `${failedCount} 张图片失败或超时`}`;
      setProgressFailed(`生成失败：${failureSummary || `${failedCount} 张图片失败或超时`}`);
    } else {
      els.statusLine.textContent = `生成完成，成功 ${successCount} 张${failedCount ? `，${failureSummary || `失败/超时 ${failedCount} 张`}` : ""}`;
      completeWorkflow(failedCount ? `完成，${failedCount} 张异常` : "全部完成");
      setProgressSuccess(failedCount ? `生成完成：${failureSummary || `${failedCount} 张失败或超时`}` : "生成完成");
      hideProgressLater(900);
    }
  } catch (error) {
    logClientEvent("renderer-generation-error", {
      generationId,
      error: shortErrorMessage(error)
    });
    const active = state.workflowSteps?.find((step) => step.status === "active");
    if (active) failWorkflowStep(active.id, shortErrorMessage(error));
    setProgressFailed(`生成失败：${shortErrorMessage(error)}`);
    showFailureModal(error, "图片生成失败", generate);
    els.statusLine.textContent = "生成失败";
  } finally {
    stopGenerationWatchdog();
    state.activeGenerationId = null;
    state.activeGenerationStartedAt = 0;
    state.lastGenerationProgressAt = 0;
    state.generationProgressReceived = false;
    setBusy(false);
  }
}

function inferHistoryFeatureScope(item = {}) {
  if (item.featureScope) return normalizeResultScope(item.featureScope);
  const kindText = (item.imageKinds || [])
    .map((kind) => `${kind?.kind || ""} ${kind?.module || ""}`)
    .join(" ");
  if (/A\+|高级A\+/i.test(kindText)) return "aplus";
  return "image";
}

function renderHistory(items) {
  if (!els.historyList) return;
  els.historyList.innerHTML = "";
  const imageItems = (Array.isArray(items) ? items : []).filter((item) => inferHistoryFeatureScope(item) === "image");
  if (!imageItems.length) {
    els.historyList.innerHTML = '<div class="muted">暂无历史记录</div>';
    return;
  }

  for (const item of imageItems.slice(0, 8)) {
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
      state.analysis = null;
      state.lastAnalyzedProductFacts = "";
      state.productFactsReviewPending = false;
      els.promptBox.value = item.prompt || "";
      renderSuitePlan(item.suitePlan || null);
      renderPromptPlan(item.promptPlan || []);
      if (item.results?.length) {
        renderResults(item.results, "image");
        els.statusLine.textContent = "已载入历史记录";
      } else {
        els.results.className = "results empty";
        els.results.innerHTML = "";
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
  if (!els.recoverHistoryBtn) return;
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
  showOverlay(els.brandDrawer);
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
  $("#grsaiBaseUrl").value = config.grsaiBaseUrl || config.imageBaseUrl || (isPresetImageProvider && Object.prototype.hasOwnProperty.call(imagePreset, "baseUrl") ? imagePreset.baseUrl : "");
  $("#grsaiApiKey").value = getSavedImageApiKey(config.imageProvider || "grsai") || config.grsaiApiKey || "";
  $("#grsaiConcurrency").value = Math.max(1, Math.min(10, Number(config.grsaiConcurrency || 6)));
  if (els.updateManifestUrl) els.updateManifestUrl.value = config.updateManifestUrl || "https://raw.githubusercontent.com/hgh240627/product-image-studio/main/update.json";
  if (els.updateCheckOnStartup) els.updateCheckOnStartup.checked = config.updateCheckOnStartup !== false;
  setUpdateStatus("");
  syncPromptProviderUi();
  renderProviderList();
  const provider = state.selectedPromptProvider;
  setPromptModelOptions(getProviderModelOptions(provider), getLastPromptModel(provider) || config.promptModel || "", false);
  renderPromptModelList(provider);
  syncImageProviderUi();
  syncImageModelOptions(config.imageProvider || "grsai", config.grsai1kModel || config.image1kModel || "", config.grsai2kModel || config.image2kModel || "");
  showOverlay(els.settingsDrawer);
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
  $("#imageProviderType").value = preset.providerType || "custom";
  if (Object.prototype.hasOwnProperty.call(preset, "baseUrl")) $("#grsaiBaseUrl").value = preset.baseUrl || "";
  const savedRoute = getLastImageModel(provider, "route");
  state.imageModelRoute = normalizeImageModelRoute(savedRoute || "auto");
  state.ai.imageModelRoute = savedRoute || "";
  syncImageModelOptions(provider, getLastImageModel(provider, "1k"), getLastImageModel(provider, "2k"));
  $("#imageApiActionStatus").textContent = `已切换到 ${preset.label}。模型会优先使用你保存过的选择；需要恢复推荐配置时再点击“自动填充作图配置”。`;
  populateAiImageModelSelect();
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

function setSelectModelOptionsForElements(select, customInput, models, selectedModel = "") {
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

function getSelectedMainPromptModel() {
  const value = els.mainPromptModelSelect?.value || "";
  if (value === CUSTOM_MODEL_VALUE) {
    return els.mainPromptModelCustom?.value.trim() || "";
  }
  return value.trim();
}

function syncMainPromptModelCustomInput() {
  const isCustom = els.mainPromptModelSelect?.value === CUSTOM_MODEL_VALUE;
  els.mainPromptModelCustom?.classList.toggle("hidden", !isCustom);
  if (isCustom) {
    els.mainPromptModelCustom?.focus();
    return;
  }
  applyMainPromptModelSelection();
}

function renderMainPromptModelSelect(selectedModel = state.config?.promptModel || "") {
  if (!els.mainPromptModelSelect || !els.mainPromptModelCustom) return;
  const provider = promptConfigForScope("image").promptProvider || state.config?.promptProvider || currentSettingsProvider();
  const models = getProviderModelOptions(provider);
  setSelectModelOptions("#mainPromptModelSelect", "#mainPromptModelCustom", models, selectedModel || state.config?.promptModel || "");
}

function promptScopeControls(scope = "image") {
  const key = normalizePromptScope(scope);
  if (key === "aplus") {
    return {
      provider: els.aplusPromptProviderSelect,
      model: els.aplusPromptModelSelect,
      custom: els.aplusPromptModelCustom,
      test: els.aplusPromptModelTestBtn,
      label: els.aplusPlanningModelLabel
    };
  }
  if (key === "ai") {
    return {
      provider: els.aiPromptProviderSelect,
      model: els.aiPromptModelSelect,
      custom: els.aiPromptModelCustom,
      test: null,
      label: null
    };
  }
  return {
    provider: els.mainPromptProviderSelect,
    model: els.mainPromptModelSelect,
    custom: els.mainPromptModelCustom,
    test: els.mainPromptModelTestBtn,
    label: els.planningModelLabel
  };
}

function setPromptProviderOptionsForElement(select, selectedProvider = "") {
  if (!select) return;
  const selected = selectedProvider || state.config?.promptProvider || currentSettingsProvider();
  select.innerHTML = "";
  for (const provider of allPromptProviders()) {
    const option = document.createElement("option");
    option.value = provider;
    option.textContent = promptProviderLabel(provider);
    select.appendChild(option);
  }
  if (selected && !Array.from(select.options).some((option) => option.value === selected)) {
    const option = document.createElement("option");
    option.value = selected;
    option.textContent = promptProviderLabel(selected);
    select.appendChild(option);
  }
  if (selected) select.value = selected;
}

function selectedScopePromptModel(scope = "image") {
  const controls = promptScopeControls(scope);
  const value = controls.model?.value || "";
  if (value === CUSTOM_MODEL_VALUE) return controls.custom?.value.trim() || "";
  return value.trim();
}

function promptScopeConfigFromControls(scope = "image") {
  const key = normalizePromptScope(scope);
  const controls = promptScopeControls(key);
  const stored = promptScopeStoredConfig(key);
  const provider = controls.provider?.value || stored.promptProvider || state.config?.promptProvider || currentSettingsProvider();
  const preset = promptProviderPreset(provider);
  const promptModel = selectedScopePromptModel(key) || getLastPromptModel(provider) || preset.promptModel || "";
  return compactPromptScopeConfig({
    promptProvider: provider,
    promptBaseUrl: promptProviderBaseUrl(provider, stored),
    promptModel,
    promptEndpoint: promptProviderEndpoint(provider, stored)
  });
}

function renderPromptScopeLabel(scope = "image") {
  const controls = promptScopeControls(scope);
  if (!controls.label) return;
  const config = promptConfigForScope(scope);
  const icon = { src: iconPath(modelIconKey(config.promptModel, config.promptProvider)) };
  const provider = promptProviderLabel(config.promptProvider || "custom");
  controls.label.innerHTML = `<img class="model-icon model-icon-img" src="${escapeHtml(icon.src)}" alt=""><span>${escapeHtml(config.promptModel || "未选择模型")}</span><small>${escapeHtml(provider)}</small>`;
}

function renderPromptScopeControls(scope = "image") {
  const key = normalizePromptScope(scope);
  const controls = promptScopeControls(key);
  if (!controls.model || !controls.custom) return;
  const config = promptConfigForScope(key);
  setPromptProviderOptionsForElement(controls.provider, config.promptProvider);
  setSelectModelOptionsForElements(controls.model, controls.custom, getProviderModelOptions(config.promptProvider), config.promptModel);
  renderPromptScopeLabel(key);
}

function renderAllPromptScopeControls() {
  for (const scope of PROMPT_SCOPE_KEYS) renderPromptScopeControls(scope);
}

async function persistPromptScopeSelection(scope = "image") {
  const key = normalizePromptScope(scope);
  const nextScopeConfig = promptScopeConfigFromControls(key);
  const remembered = rememberPromptModelForProvider(nextScopeConfig.promptProvider, nextScopeConfig.promptModel);
  const promptScopeConfigs = setPromptScopeConfig(key, nextScopeConfig);
  state.config = await window.studio.saveConfig({
    ...state.config,
    ...remembered,
    promptScopeConfigs
  });
  renderPromptScopeControls(key);
  updateApiState();
}

async function handlePromptScopeProviderChange(scope = "image") {
  const key = normalizePromptScope(scope);
  const controls = promptScopeControls(key);
  const provider = controls.provider?.value || state.config?.promptProvider || currentSettingsProvider();
  const preset = promptProviderPreset(provider);
  const selected = getLastPromptModel(provider) || preset.promptModel || "";
  setSelectModelOptionsForElements(controls.model, controls.custom, getProviderModelOptions(provider), selected);
  await persistPromptScopeSelection(key);
}

function syncPromptScopeModelCustomInput(scope = "image") {
  const controls = promptScopeControls(scope);
  const isCustom = controls.model?.value === CUSTOM_MODEL_VALUE;
  controls.custom?.classList.toggle("hidden", !isCustom);
  if (isCustom) {
    controls.custom?.focus();
    return;
  }
  persistPromptScopeSelection(scope);
}

function bindPromptScopeModelEvents(scope = "image") {
  const key = normalizePromptScope(scope);
  const controls = promptScopeControls(key);
  controls.provider?.addEventListener("change", () => handlePromptScopeProviderChange(key));
  controls.model?.addEventListener("change", () => syncPromptScopeModelCustomInput(key));
  controls.custom?.addEventListener("blur", () => persistPromptScopeSelection(key));
  controls.custom?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      persistPromptScopeSelection(key);
    }
  });
  controls.test?.addEventListener("click", async () => {
    await persistPromptScopeSelection(key);
    await testPromptApiConnection({ scope: key, forceVisionProbe: true, source: key });
  });
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
  if (els.promptApiSettingsBtn) {
    els.promptApiSettingsBtn.classList.toggle("hidden", !isPromptRelayProvider(provider));
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
    if (provider === "doubao") {
      els.promptApiAddressPreview.textContent += "；火山方舟套餐/推理接入点请在模型名处填 ep-... 接入点 ID";
    }
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
    button.classList.toggle("custom-provider", Boolean(preset.custom));
    button.dataset.provider = provider;
    const enabled = promptProviderEnabled(provider);
    const initial = (preset.label || provider || "P").slice(0, 1).toUpperCase();
    const providerIcon = providerIconKey(provider);
    const icon = providerIcon ? providerIconPath(providerIcon) : "";
    button.innerHTML = `
      <span class="provider-row-icon">${icon ? `<img src="${escapeHtml(icon)}" alt="" onerror="this.classList.add('hidden');this.nextElementSibling.classList.remove('hidden')" />` : ""}<b class="${icon ? "hidden" : ""}">${escapeHtml(initial)}</b></span>
      <span class="provider-row-main">
        <strong>${escapeHtml(preset.label || provider)}</strong>
      </span>
      ${enabled ? '<span class="provider-on">ON</span>' : ""}
    `;
    button.addEventListener("click", () => selectPromptProvider(provider));
    button.addEventListener("contextmenu", (event) => openProviderContextMenu(event, provider));
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
  const baseInput = $("#promptBaseUrl");
  if (baseInput) baseInput.value = getPromptProviderDefaultBaseUrl(state.selectedPromptProvider);
  const endpointInput = $("#promptEndpoint");
  if (endpointInput) endpointInput.value = getPromptProviderDefaultEndpoint(state.selectedPromptProvider);
  const keyInput = $("#promptApiKey");
  if (keyInput) keyInput.value = getSavedPromptApiKey(state.selectedPromptProvider) || (state.config?.promptProvider === state.selectedPromptProvider ? state.config?.promptApiKey || "" : "");
  setPromptModelOptions(getProviderModelOptions(state.selectedPromptProvider), lastModel, false);
  renderProviderList();
  renderPromptModelList(state.selectedPromptProvider);
  syncPromptProviderUi();
  renderMainPromptModelSelect(state.config?.promptModel || lastModel);
}

function selectPromptModel(provider, model) {
  setPromptModelOptions(getProviderModelOptions(provider), model, false);
  rememberPromptModelForProvider(provider, model);
  renderPromptModelList(provider);
  syncPromptProviderUi();
  renderPlanningModelLabel();
}

function removePromptModel(provider, model) {
  const promptProviderModels = { ...getPromptProviderModels() };
  promptProviderModels[provider] = uniqueModelOptions((promptProviderModels[provider] || []).filter((item) => item !== model));
  state.config = { ...(state.config || {}), promptProviderModels };
  setPromptModelOptions(getProviderModelOptions(provider), getSelectedPromptModel(), false);
}

function addProviderModel(provider, model) {
  const modelName = String(model || "").trim();
  if (!modelName) return {};
  const promptProviderModels = { ...getPromptProviderModels() };
  promptProviderModels[provider] = uniqueModelOptions([modelName, ...(promptProviderModels[provider] || [])]).slice(0, 200);
  state.config = { ...(state.config || {}), promptProviderModels };
  return promptProviderModels;
}

function syncApiAdvancedControls(provider = currentSettingsProvider()) {
  const options = { ...apiOptionDefaultsForProvider(provider), ...(getPromptProviderApiOptions()[provider] || {}) };
  $$("#apiAdvancedModal [data-api-option]").forEach((input) => {
    input.checked = Boolean(options[input.dataset.apiOption]);
  });
}

function collectApiAdvancedOptions(provider = currentSettingsProvider()) {
  const current = { ...getPromptProviderApiOptions() };
  current[provider] = { ...apiOptionDefaultsForProvider(provider) };
  $$("#apiAdvancedModal [data-api-option]").forEach((input) => {
    current[provider][input.dataset.apiOption] = Boolean(input.checked);
  });
  state.config = { ...(state.config || {}), promptProviderApiOptions: current };
  return current;
}

function openApiAdvancedModal() {
  if (!isPromptRelayProvider(currentSettingsProvider())) return;
  syncApiAdvancedControls(currentSettingsProvider());
  showOverlay(els.apiAdvancedModal);
}

function closeApiAdvancedModal() {
  collectApiAdvancedOptions(currentSettingsProvider());
  hideOverlay(els.apiAdvancedModal);
}

function openProviderAddModal(provider = "") {
  const editingProvider = String(provider || "").trim();
  const preset = editingProvider ? promptProviderPreset(editingProvider) : null;
  if (els.providerAddModal) {
    els.providerAddModal.dataset.editingProvider = editingProvider;
  }
  if (els.providerAddTitle) els.providerAddTitle.textContent = editingProvider ? "编辑供应商" : "添加供应商";
  if (els.providerNameInput) els.providerNameInput.value = editingProvider ? (preset?.label || editingProvider) : "";
  if (els.providerTypeSelect) els.providerTypeSelect.value = editingProvider ? (preset?.type || "openai") : "openai";
  showOverlay(els.providerAddModal);
  els.providerNameInput?.focus();
}

async function confirmProviderAdd() {
  const originalProvider = els.providerAddModal?.dataset.editingProvider || "";
  const name = String(els.providerNameInput?.value || "").trim();
  if (!name) {
    toast("请先填写供应商名称。", "error");
    return;
  }
  const providerType = els.providerTypeSelect?.value || "openai";
  const nextProvider = originalProvider || normalizeProviderKey(name);
  const meta = { ...getPromptProviderMeta() };
  meta[nextProvider] = {
    ...(meta[nextProvider] || {}),
    name,
    type: providerType,
    promptEndpoint: providerTypeToEndpoint(providerType),
    category: "custom",
    custom: true
  };
  const providerModels = { ...getPromptProviderModels() };
  if (!providerModels[nextProvider]) providerModels[nextProvider] = [];
  const providerLastModels = { ...getPromptProviderLastModels() };
  const providerKeys = { ...getPromptProviderKeys() };
  const providerApiOptions = { ...getPromptProviderApiOptions() };
  const providerCapabilities = { ...getPromptModelCapabilitiesMap() };
  const isEditingActiveProvider = Boolean(originalProvider && state.config?.promptProvider === originalProvider);
  state.config = await window.studio.saveConfig({
    ...state.config,
    promptProvider: isEditingActiveProvider ? nextProvider : state.config?.promptProvider,
    promptEndpoint: isEditingActiveProvider ? providerTypeToEndpoint(providerType) : state.config?.promptEndpoint,
    promptProviderMeta: meta,
    promptProviderModels: providerModels,
    promptProviderLastModels: providerLastModels,
    promptProviderKeys: providerKeys,
    promptProviderApiOptions: providerApiOptions,
    promptModelCapabilities: providerCapabilities
  });
  const provider = nextProvider;
  state.selectedPromptProvider = provider;
  els.providerAddModal?.classList.add("hidden");
  if (els.providerAddModal) els.providerAddModal.dataset.editingProvider = "";
  renderProviderList();
  selectPromptProvider(provider);
}

function openProviderContextMenu(event, provider) {
  event.preventDefault();
  if (!els.providerContextMenu) return;
  selectPromptProvider(provider);
  els.providerContextMenu.dataset.provider = provider;
  const isCustom = Boolean(promptProviderPreset(provider).custom);
  els.providerContextMenu.querySelector('[data-provider-action="edit"]')?.toggleAttribute("disabled", !isCustom);
  els.providerContextMenu.querySelector('[data-provider-action="delete"]')?.toggleAttribute("disabled", !isCustom);
  els.providerContextMenu.classList.remove("hidden");
  const rect = els.providerContextMenu.getBoundingClientRect();
  const x = Math.min(event.clientX, window.innerWidth - rect.width - 12);
  const y = Math.min(event.clientY, window.innerHeight - rect.height - 12);
  els.providerContextMenu.style.left = `${Math.max(12, x)}px`;
  els.providerContextMenu.style.top = `${Math.max(12, y)}px`;
}

function closeProviderContextMenu() {
  els.providerContextMenu?.classList.add("hidden");
}

function openProviderNoteModal(provider) {
  if (!provider || !els.providerNoteModal) return;
  const preset = promptProviderPreset(provider);
  els.providerNoteModal.dataset.provider = provider;
  if (els.providerNoteTitle) {
    els.providerNoteTitle.textContent = `${preset.label || provider} 的本地备注，只保存在当前软件配置里。`;
  }
  if (els.providerNoteInput) {
    els.providerNoteInput.value = getPromptProviderNotes()[provider] || "";
  }
  showOverlay(els.providerNoteModal);
  els.providerNoteInput?.focus();
}

function closeProviderNoteModal() {
  if (els.providerNoteModal) els.providerNoteModal.dataset.provider = "";
  hideOverlay(els.providerNoteModal);
}

async function saveProviderNote() {
  const provider = els.providerNoteModal?.dataset.provider || "";
  if (!provider) return;
  const promptProviderNotes = { ...getPromptProviderNotes() };
  const note = String(els.providerNoteInput?.value || "").trim();
  if (note) {
    promptProviderNotes[provider] = note;
  } else {
    delete promptProviderNotes[provider];
  }
  state.config = await window.studio.saveConfig({
    ...state.config,
    promptProviderNotes
  });
  closeProviderNoteModal();
  renderProviderList();
  syncPromptProviderUi();
  toast("模型备注已保存");
}

async function deletePromptProvider(provider) {
  if (!provider || !promptProviderPreset(provider).custom) {
    showMessageModal("内置供应商不能删除，只能删除你手动添加的自定义供应商。", "无法删除供应商", "error");
    return;
  }
  const ok = window.confirm(`确定删除供应商「${promptProviderLabel(provider)}」吗？这会移除它的 API Key、模型列表和能力标记。`);
  if (!ok) return;
  const meta = { ...getPromptProviderMeta() };
  const providerModels = { ...getPromptProviderModels() };
  const providerLastModels = { ...getPromptProviderLastModels() };
  const providerKeys = { ...getPromptProviderKeys() };
  const providerApiOptions = { ...getPromptProviderApiOptions() };
  const providerCapabilities = { ...getPromptModelCapabilitiesMap() };
  const providerNotes = { ...getPromptProviderNotes() };
  delete meta[provider];
  delete providerModels[provider];
  delete providerLastModels[provider];
  delete providerKeys[provider];
  delete providerApiOptions[provider];
  delete providerCapabilities[provider];
  delete providerNotes[provider];
  const fallbackProvider = state.config?.promptProvider === provider ? "grsai-gemini" : state.config?.promptProvider;
  state.config = await window.studio.saveConfig({
    ...state.config,
    promptProvider: fallbackProvider,
    promptProviderMeta: meta,
    promptProviderModels: providerModels,
    promptProviderLastModels: providerLastModels,
    promptProviderKeys: providerKeys,
    promptProviderApiOptions: providerApiOptions,
    promptModelCapabilities: providerCapabilities,
    promptProviderNotes: providerNotes
  });
  state.selectedPromptProvider = fallbackProvider || "grsai-gemini";
  closeProviderContextMenu();
  renderProviderList();
  selectPromptProvider(state.selectedPromptProvider);
}

function handleProviderContextAction(action, provider) {
  closeProviderContextMenu();
  if (action === "edit") {
    if (!promptProviderPreset(provider).custom) {
      showMessageModal("内置供应商已经按官方接口预设好，不能改成其他类型。需要第三方中转或特殊地址时，请点击 + 添加一个自定义供应商。", "无法编辑内置供应商", "info");
      return;
    }
    openProviderAddModal(provider);
    return;
  }
  if (action === "delete") {
    deletePromptProvider(provider);
    return;
  }
  if (action === "note") {
    openProviderNoteModal(provider);
  }
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
  showOverlay(els.modelEditModal);
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
    promptModel: state.config?.promptModel === originalModel ? model : state.config?.promptModel,
    promptProviderModels,
    promptModelCapabilities
  });
  setPromptModelOptions(getProviderModelOptions(provider), model, false);
  els.modelEditModal?.classList.add("hidden");
  renderPromptModelList(provider);
  renderPlanningModelLabel();
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
    $("#promptBaseUrl").value = preset.promptBaseUrl || "";
    $("#promptEndpoint").value = preset.promptEndpoint || "chat";
    setPromptModelOptions(getProviderModelOptions(provider), getLastPromptModel(provider) || preset.promptModel || "", false);
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
  next.featureImageModelRoutes = {
    aplus: "auto",
    ...(next.featureImageModelRoutes && typeof next.featureImageModelRoutes === "object" ? next.featureImageModelRoutes : {})
  };
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
    imageBaseUrl: $("#grsaiBaseUrl").value.trim() || (isPresetProvider && Object.prototype.hasOwnProperty.call(preset, "baseUrl") ? preset.baseUrl : ""),
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

async function applyMainPromptModelSelection() {
  const provider = state.config?.promptProvider || currentSettingsProvider();
  const promptModel = getSelectedMainPromptModel();
  if (!promptModel) return;
  const remembered = rememberPromptModelForProvider(provider, promptModel);
  state.selectedPromptProvider = provider;
  state.config = await window.studio.saveConfig({
    ...state.config,
    promptProvider: provider,
    promptModel,
    ...remembered
  });
  if (provider === currentSettingsProvider()) {
    setPromptModelOptions(getProviderModelOptions(provider), promptModel, false);
    renderPromptModelList(provider);
  }
  updateApiState();
  renderPlanningModelLabel();
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
    promptScopeConfigs: getPromptScopeConfigs(),
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
    grsaiConcurrency: Math.max(1, Math.min(10, Number($("#grsaiConcurrency").value || 6))),
    updateManifestUrl: String(els.updateManifestUrl?.value || state.config?.updateManifestUrl || "https://raw.githubusercontent.com/hgh240627/product-image-studio/main/update.json").trim(),
    updateCheckOnStartup: els.updateCheckOnStartup ? els.updateCheckOnStartup.checked : true
  };

  state.config = await window.studio.saveConfig({ ...state.config, ...next });
  state.imageModelRoute = imageModelRoute;
  populateModelRouteSelect();
  populateAiImageModelSelect();
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
  populateAiImageModelSelect();
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
  populateAiImageModelSelect();
}

async function testPromptApiConnection(options = {}) {
  const scope = options.scope ? normalizePromptScope(options.scope) : "";
  const baseSettings = scope
    ? promptConfigWithApiKey(promptConfigForScope(scope))
    : options.useSavedConfig
    ? {
      promptProvider: state.config?.promptProvider || currentSettingsProvider(),
      promptBaseUrl: state.config?.promptBaseUrl || "",
      promptApiKey: state.config?.promptApiKey || getSavedPromptApiKey(state.config?.promptProvider || currentSettingsProvider()),
      promptModel: state.config?.promptModel || "",
      promptEndpoint: state.config?.promptEndpoint || "chat"
    }
    : collectPromptApiSettings();
  const chosenModel = options.modelOverride
    ? String(options.modelOverride).trim()
    : await openPromptTestModelDialog(baseSettings, {
      selectedModel: baseSettings.promptModel,
      forceVisionProbe: Boolean(options.forceVisionProbe)
    });
  if (!chosenModel) return;
  const settings = {
    ...baseSettings,
    promptModel: chosenModel,
    forceVisionProbe: Boolean(options.forceVisionProbe)
  };
  if (!settings.promptBaseUrl || !settings.promptApiKey || !settings.promptModel) {
    showMessageModal("请先填写 API 地址、API Key 和模型名，再检测连接。", "无法检测 API", "error");
    return;
  }

  const button = options.source === "main"
    ? els.mainPromptModelTestBtn
    : options.source === "aplus"
      ? els.aplusPromptModelTestBtn
      : $("#testPromptApiBtn");
  const status = scope === "aplus" ? els.aplusAiInlineStatus : $("#promptApiActionStatus");
  if (button) button.disabled = true;
  if (status) {
    status.textContent = `正在检测模型 ${settings.promptModel}，请稍后...`;
    status.classList?.remove?.("hidden", "success", "failed");
    status.classList?.add?.("active");
  }
  try {
    const result = await window.studio.testPromptApi(settings);
    const remembered = rememberPromptModelForProvider(settings.promptProvider, settings.promptModel);
    const promptModelCapabilities = setModelCapabilities(
      settings.promptProvider,
      settings.promptModel,
      result?.visionOk
        ? { ...modelCapabilities(settings.promptProvider, settings.promptModel), vision: true }
        : modelCapabilities(settings.promptProvider, settings.promptModel)
    );
    const nextPromptScopeConfigs = scope
      ? setPromptScopeConfig(scope, {
          promptProvider: settings.promptProvider,
          promptBaseUrl: settings.promptBaseUrl,
          promptModel: settings.promptModel,
          promptEndpoint: settings.promptEndpoint
        })
      : getPromptScopeConfigs();
    state.config = await window.studio.saveConfig({
      ...state.config,
      promptProvider: scope ? state.config?.promptProvider : settings.promptProvider,
      promptBaseUrl: scope ? state.config?.promptBaseUrl : settings.promptBaseUrl,
      promptApiKey: scope ? state.config?.promptApiKey : settings.promptApiKey,
      promptProviderKeys: setPromptApiKeyForProvider(settings.promptProvider, settings.promptApiKey),
      promptModel: scope ? state.config?.promptModel : settings.promptModel,
      promptEndpoint: scope ? state.config?.promptEndpoint : settings.promptEndpoint,
      promptProviderApiOptions: collectApiAdvancedOptions(settings.promptProvider),
      promptModelCapabilities,
      promptScopeConfigs: nextPromptScopeConfigs,
      ...remembered
    });
    const modelOptions = getProviderModelOptions(settings.promptProvider);
    if (!modelOptions.includes(settings.promptModel)) {
      addProviderModel(settings.promptProvider, settings.promptModel);
    }
    setPromptModelOptions(getProviderModelOptions(settings.promptProvider), settings.promptModel, false);
    if ($("#promptModel")) $("#promptModel").value = settings.promptModel;
    renderProviderList();
    renderPromptModelList(settings.promptProvider);
    updateApiState();
    renderPlanningModelLabel();
    const modelText = result?.model ? `\n当前测试模型：${result.model}` : "";
    const requestText = result?.requestUrl ? `\n本次检测请求地址：${result.requestUrl}` : "";
    const endpointText = result?.endpoint ? `\n接口类型：${result.endpoint}` : "";
    const noteText = result?.note ? `\n检测方式：${result.note}` : "";
    showMessageModal(`恭喜，API已成功连接，并已保存为当前提示词/识图模型。${modelText}${endpointText}${requestText}${noteText}`, "连接成功", "success");
    if (status) {
      status.textContent = result?.visionOk ? "连接检测成功，文本 JSON 和视觉输入都可用。" : "连接检测成功，文本 JSON 可用。";
      status.classList?.remove?.("active", "failed");
      status.classList?.add?.("success");
    }
  } catch (error) {
    const message = humanizeErrorMessage(error);
    showMessageModal(message || "API 检测失败，请检查配置。", "连接失败", "error");
    if (status) {
      status.textContent = "连接检测失败，请查看弹窗说明。";
      status.classList?.remove?.("active", "success");
      status.classList?.add?.("failed");
      status.classList?.remove?.("hidden");
    }
  } finally {
    if (button) button.disabled = false;
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
    const noteText = result?.note ? `\n\n说明：${result.note}` : "";
    showMessageModal(`已获取 ${models.length} 个模型。\n\n${shown}${models.length > 24 ? "\n..." : ""}${noteText}`, "模型列表", "success");
    if (status) status.textContent = result?.note ? `已获取 ${models.length} 个模型；请留意弹窗里的供应商说明。` : `已获取 ${models.length} 个模型，可直接在下拉框选择。`;
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
    const selectedRoute = normalizeImageModelRoute(settings.imageModelRoute || state.ai.imageModelRoute);
    const selectedAiRoute = selectedRoute !== "auto" ? selectedRoute : (state.ai.imageModelRoute && state.ai.imageModelRoute !== "auto" ? state.ai.imageModelRoute : selected1k);
    const imageProviderModels = {
      ...getImageProviderModels(),
      [provider]: models
    };
    const imageProviderLastModels = {
      ...getImageProviderLastModels(),
      [`${provider}:1k`]: selected1k,
      [`${provider}:2k`]: selected2k,
      [`${provider}:route`]: selectedAiRoute
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
    state.ai.imageModelRoute = selectedAiRoute;
    syncImageModelOptions(provider, selected1k, selected2k);
    populateAiImageModelSelect();
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
  window.addEventListener("error", (event) => {
    logClientEvent("renderer-window-error", {
      message: event.message || "",
      source: event.filename || "",
      line: event.lineno || 0,
      column: event.colno || 0
    });
  });
  window.addEventListener("unhandledrejection", (event) => {
    logClientEvent("renderer-unhandled-rejection", {
      reason: shortErrorMessage(event.reason || event)
    });
  });

  els.fileInput.addEventListener("change", (event) => addFiles(event.target.files));
  els.titleFileInput.addEventListener("change", (event) => addFiles(event.target.files));
  els.cutoutFileInput.addEventListener("change", (event) => handleCutoutImageFiles(event.target.files));
  els.aplusFileInput?.addEventListener("change", (event) => addFiles(event.target.files, "aplus"));

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

  for (const dropzone of [els.aplusDropzone].filter(Boolean)) {
    ["dragenter", "dragover"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        dropzone.classList.add("dragging");
      });
    });
    ["dragleave", "drop"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.remove("dragging");
      });
    });
  }

  els.aplusDropzone?.addEventListener("drop", handleAplusProductImageDrop);

  els.productName?.addEventListener("input", () => {
    updateProductInfoCharCount();
    markProductFactsEdited();
  });
  els.productInfo?.addEventListener("input", () => {
    updateProductInfoCharCount();
    markProductFactsEdited();
  });
  bindPackageModeTabs();
  syncProductModeUi();

  els.analyzeBtn?.addEventListener("click", analyze);
  els.generateBtn.addEventListener("click", generate);
  els.aplusAnalyzeBtn?.addEventListener("click", analyzeAplusProduct);
  els.aplusGenerateBtn?.addEventListener("click", generateAplusPage);
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

  els.aiModeGroup?.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => setAiMode(button.dataset.value));
  });
  els.aiImageModelSelect?.addEventListener("change", async () => {
    const isCustom = els.aiImageModelSelect.value === CUSTOM_MODEL_VALUE;
    els.aiImageModelCustom?.classList.toggle("hidden", !isCustom);
    if (isCustom) {
      els.aiImageModelCustom?.focus();
      return;
    }
    await persistAiImageModelSelection();
  });
  els.aiImageModelCustom?.addEventListener("blur", persistAiImageModelSelection);
  els.aiImageModelCustom?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    persistAiImageModelSelection();
  });
  els.aiFileInput?.addEventListener("change", async () => {
    await addAiImages(els.aiFileInput.files || []);
    els.aiFileInput.value = "";
  });
  els.aiDocumentInput?.addEventListener("change", async () => {
    await addAiDocuments(els.aiDocumentInput.files || []);
    els.aiDocumentInput.value = "";
  });
  els.aiDropzone?.addEventListener("dragover", (event) => {
    event.preventDefault();
    els.aiDropzone.classList.add("dragging");
  });
  els.aiDropzone?.addEventListener("dragleave", () => els.aiDropzone.classList.remove("dragging"));
  els.aiDropzone?.addEventListener("drop", async (event) => {
    event.preventDefault();
    els.aiDropzone.classList.remove("dragging");
    await addAiImages(event.dataTransfer?.files || []);
  });
  els.aiDocumentDropzone?.addEventListener("dragover", (event) => {
    event.preventDefault();
    els.aiDocumentDropzone.classList.add("dragging");
  });
  els.aiDocumentDropzone?.addEventListener("dragleave", () => els.aiDocumentDropzone.classList.remove("dragging"));
  els.aiDocumentDropzone?.addEventListener("drop", async (event) => {
    event.preventDefault();
    els.aiDocumentDropzone.classList.remove("dragging");
    await addAiDocuments(event.dataTransfer?.files || []);
  });
  els.aiSendBtn?.addEventListener("click", sendAiWorkspaceMessage);
  els.aiClearBtn?.addEventListener("click", clearAiWorkspace);
  els.aiNewChatBtn?.addEventListener("click", clearAiWorkspace);
  els.aiMessageInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
    event.preventDefault();
    if (!els.aiSendBtn?.disabled) sendAiWorkspaceMessage();
  });
  els.aiMessageInput?.addEventListener("paste", handleAiPaste);
  document.addEventListener("paste", (event) => {
    if (event.target === els.aiMessageInput) return;
    handleAiPaste(event);
  });
  $$(".ai-sidebar-nav [data-ai-preset]").forEach((button) => {
    button.addEventListener("click", () => fillAiWorkspacePrompt(button.dataset.aiPreset || ""));
  });
  $$(".ai-suggestion-row button").forEach((button) => {
    button.addEventListener("click", () => {
      const text = button.textContent.trim();
      if (/修改|修图/.test(text)) fillAiWorkspacePrompt("image");
      else if (/使用/.test(text)) fillAiWorkspacePrompt("usage");
      else fillAiWorkspacePrompt("analyze");
    });
  });

  [
    els.unitOfSaleInput,
    els.bundleComponentsInput,
    els.componentDifferencesInput,
    els.pcsCountInput,
    els.packArrangementInput,
    els.usageNotesInput
  ].forEach((input) => {
    input?.addEventListener("input", () => {
      markProductFactsEdited();
      updateProductInfoCharCount();
    });
  });

  els.aplusModuleGrid?.querySelectorAll("[data-aplus-module]").forEach((input) => {
    input.addEventListener("change", () => {
      syncAplusModuleCard(input);
      syncAplusSelectAllButton();
    });
  });
  els.aplusSelectAllModulesBtn?.addEventListener("click", () => {
    const inputs = $$("[data-aplus-module]");
    const shouldSelect = !inputs.every((input) => input.checked);
    inputs.forEach((input) => {
      input.checked = shouldSelect;
      syncAplusModuleCard(input);
    });
    syncAplusSelectAllButton();
  });

  els.aplusProductName?.addEventListener("input", () => { state.aplus.productName = els.aplusProductName.value; });
  els.aplusProductInfo?.addEventListener("input", () => { state.aplus.productInfo = els.aplusProductInfo.value; });
  els.aplusFormat?.addEventListener("change", () => { state.aplus.format = els.aplusFormat.value; });

  bindChoiceGroup("#resolutionGroup", "resolution");
  bindChoiceGroup("#ratioGroup", "ratio");

  $("#openBrandBtn").addEventListener("click", openBrandDrawer);
  $("#closeBrandBtn").addEventListener("click", () => els.brandDrawer.classList.add("hidden"));
  $("#saveBrandBtn").addEventListener("click", saveBrand);
  els.mainPromptProviderSelect?.addEventListener("change", () => handlePromptScopeProviderChange("image"));
  els.mainPromptModelSelect?.addEventListener("change", () => syncPromptScopeModelCustomInput("image"));
  els.mainPromptModelCustom?.addEventListener("blur", () => persistPromptScopeSelection("image"));
  els.mainPromptModelCustom?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      persistPromptScopeSelection("image");
    }
  });
  els.mainPromptModelTestBtn?.addEventListener("click", async () => {
    await persistPromptScopeSelection("image");
    await testPromptApiConnection({ scope: "image", forceVisionProbe: true, source: "main" });
  });
  bindPromptScopeModelEvents("aplus");
  bindPromptScopeModelEvents("ai");

  $("#openSettingsBtn").addEventListener("click", openSettingsDrawer);
  els.aiOpenSettingsBtn?.addEventListener("click", openSettingsDrawer);
  $("#closeSettingsBtn").addEventListener("click", () => els.settingsDrawer.classList.add("hidden"));
  $("#saveSettingsBtn").addEventListener("click", saveSettings);
  els.checkUpdateBtn?.addEventListener("click", () => checkForUpdates({ manual: true }));
  els.updateCloseX?.addEventListener("click", closeUpdateModal);
  els.updateLaterBtn?.addEventListener("click", remindUpdateLater);
  els.updateNotesBtn?.addEventListener("click", () => {
    openUpdateNotes().catch((error) => toast(shortErrorMessage(error), "error"));
  });
  els.updateDownloadBtn?.addEventListener("click", () => {
    openUpdateDownload().catch((error) => toast(shortErrorMessage(error), "error"));
  });
  els.updateModal?.addEventListener("click", (event) => {
    if (event.target === els.updateModal) closeUpdateModal();
  });
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
  els.addProviderBtn?.addEventListener("click", () => openProviderAddModal());
  els.providerContextMenu?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-provider-action]");
    if (!button) return;
    handleProviderContextAction(button.dataset.providerAction, els.providerContextMenu.dataset.provider);
  });
  document.addEventListener("click", (event) => {
    if (!els.providerContextMenu || els.providerContextMenu.classList.contains("hidden")) return;
    if (!els.providerContextMenu.contains(event.target)) closeProviderContextMenu();
  });
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
  els.providerNoteCloseX?.addEventListener("click", closeProviderNoteModal);
  els.providerNoteCancelBtn?.addEventListener("click", closeProviderNoteModal);
  els.providerNoteSaveBtn?.addEventListener("click", saveProviderNote);
  els.providerNoteModal?.addEventListener("click", (event) => {
    if (event.target === els.providerNoteModal) closeProviderNoteModal();
  });
  els.promptTestModelSelect?.addEventListener("change", syncPromptTestModelCustomInput);
  els.promptTestModelSearch?.addEventListener("input", filterPromptTestModels);
  els.promptTestStartBtn?.addEventListener("click", () => {
    const model = selectedPromptTestModel();
    if (!model) {
      toast("请先选择或填写要检测的模型。", "error");
      return;
    }
    closePromptTestModal(model);
  });
  els.promptTestCancelBtn?.addEventListener("click", () => closePromptTestModal(null));
  els.promptTestCloseX?.addEventListener("click", () => closePromptTestModal(null));
  els.promptTestModal?.addEventListener("click", (event) => {
    if (event.target === els.promptTestModal) closePromptTestModal(null);
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
  $("#modelRoute").addEventListener("change", async (event) => {
    state.imageModelRoute = normalizeImageModelRoute(event.currentTarget.value);
    state.config = await window.studio.saveConfig({
      ...state.config,
      imageModelRoute: state.imageModelRoute
    });
    syncImageModelRouteUi();
  });
  els.aplusImageModelRoute?.addEventListener("change", async (event) => {
    setFeatureImageModelRoute("aplus", event.currentTarget.value);
    state.config = await window.studio.saveConfig({
      ...state.config,
      featureImageModelRoutes: {
        ...getFeatureImageModelRoutes(),
        ...state.featureImageModelRoutes
      }
    });
    syncFeatureImageModelRouteUi("aplus");
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
  els.recoverHistoryBtn?.addEventListener("click", recoverHistoryFromCache);
  els.closePromptDrawerBtn?.addEventListener("click", closePromptDrawer);
  els.promptDrawer?.addEventListener("click", (event) => {
    if (event.target === els.promptDrawer) closePromptDrawer();
  });

  els.closeImageViewer.addEventListener("click", closeImageViewer);
  els.saveViewerImageBtn?.addEventListener("click", saveViewerImage);
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
    if (event.key === "Escape" && els.promptDrawer && !els.promptDrawer.classList.contains("hidden")) {
      closePromptDrawer();
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
    if (event.key === "Escape" && els.updateModal && !els.updateModal.classList.contains("hidden")) {
      closeUpdateModal();
    }
    if (event.key === "Escape" && els.imageTestModal && !els.imageTestModal.classList.contains("hidden")) {
      closeImageTestModal(null);
    }
    if (event.key === "Escape" && els.promptTestModal && !els.promptTestModal.classList.contains("hidden")) {
      closePromptTestModal(null);
    }
    if (event.key === "Escape" && els.providerContextMenu && !els.providerContextMenu.classList.contains("hidden")) {
      closeProviderContextMenu();
    }
    if (event.key === "Escape" && els.providerNoteModal && !els.providerNoteModal.classList.contains("hidden")) {
      closeProviderNoteModal();
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
    const scope = generationScopeFromEvent(batch);
    markGenerationHeartbeat();
    renderPendingResults(batch.items || [], batch.concurrency || 1, scope);
    if (scope === "image") setWorkflowStep("submit", "active", `${batch.total || 0} 张任务，并发 ${batch.concurrency || 1} 路`);
    const statusLine = scopedStatusLine(scope);
    if (statusLine) statusLine.textContent = `已提交 ${batch.total || 0} 张任务，并发 ${batch.concurrency || 1} 路生成`;
  });

  window.studio.onGenerationPlan?.((payload) => {
    if (payload.generationId && payload.generationId !== state.activeGenerationId) return;
    const scope = generationScopeFromEvent(payload);
    markGenerationHeartbeat();
    renderSuitePlan(payload.suitePlan || null, scope);
    renderPromptPlan(payload.promptPlan || [], scope);
  });

  window.studio.onGenerationProgress((progress) => {
    if (progress.generationId && progress.generationId !== state.activeGenerationId) return;
    const scope = generationScopeFromEvent(progress);
    state.generationProgressReceived = true;
    markGenerationHeartbeat();
    updatePendingCard(progress, scope);
    const weightedProgress = weightedGenerationProgress(progress, scope);
    const progressByIndex = scopedLiveProgressByIndex(scope);
    const totalCount = scopedLiveTotalCount(scope);
    if (progress.current && !["rewriting-prompts", "planning-items", "accepted", "loading-config", "validating"].includes(progress.stage || "")) {
      progressByIndex[progress.current] = {
        ...progress,
        progress: weightedProgress
      };
    }
    if (scope === "image") {
      if (progress.stage === "accepted") {
        setWorkflowStep("planning", "active", "Task received");
      } else if (progress.stage === "loading-config") {
        setWorkflowStep("planning", "active", "Loading API settings");
      } else if (progress.stage === "validating") {
        setWorkflowStep("planning", "active", "Validating models and request");
      } else if (progress.stage === "planning-items") {
        setWorkflowStep("planning", "active", "Preparing " + (progress.total || totalCount || 0) + " selected images");
      } else if (progress.stage === "rewriting-prompts") {
        setWorkflowStep("planning", "done", "Prompt plan ready");
        setWorkflowStep("prompts", "active", String(progress.current || 0) + "/" + String(progress.total || 0));
      } else if (progress.stage === "submitting") {
        setWorkflowStep("prompts", "done", "Category prompts generated");
        setWorkflowStep("submit", "active", (progress.kind || "Image") + " / " + (progress.model || ""));
      } else if (progress.stage === "completed") {
        setWorkflowStep("submit", "done", (progress.kind || "Image") + " returned");
        setWorkflowStep("render", "active", "Loading generated result");
      }
    }
    const label = progress.total
      ? progress.stage === "planning-items"
        ? "Preparing " + progress.total + " selected images and prompt request"
        : progress.stage === "rewriting-prompts"
        ? "Generating category prompts " + progress.current + "/" + progress.total
        : String(progress.current || 0) + "/" + progress.total + " / " + (progress.kind || "Image") + " / " + (progress.model || progress.status || "Generating")
      : progress.stage === "accepted"
      ? "Generation task received"
      : progress.stage === "loading-config"
      ? "Loading API settings"
      : progress.stage === "validating"
      ? "Validating request"
      : progress.stage || "Generating";
    if (progress.status === "failed" || progress.status === "timeout") {
      const message = `${progress.kind || "图片"}${progress.status === "timeout" ? "超时" : "失败"}：${shortErrorMessage(progress.error || progress.model || "")}`;
      if (scope === "image") failWorkflowStep(progress.stage === "rewriting-prompts" ? "prompts" : "render", shortErrorMessage(progress.error || progress.model || ""));
      setActiveGenerationProgress(100, message, "failed", scope);
      return;
    }
    const progressValues = Object.values(progressByIndex).map((item) => Number(item.progress || 0));
    const averageProgress = progress.stage === "rewriting-prompts"
      ? weightedProgress
      : progress.total && progressValues.length
      ? progressValues.reduce((sum, value) => sum + value, 0) / progress.total
      : weightedProgress;
    setActiveGenerationProgress(averageProgress, label, "active", scope);
  });

  window.studio.onGenerationResult((payload) => {
    if (payload.generationId && payload.generationId !== state.activeGenerationId) return;
    const scope = generationScopeFromEvent(payload);
    markGenerationHeartbeat();
    const results = payload.results || [];
    const completedCount = scopedLiveCompletedCount(scope) + 1;
    setScopedLiveCompletedCount(scope, completedCount);
    const total = payload.total || scopedLiveTotalCount(scope) || completedCount;
    setScopedLiveTotalCount(scope, total);
    const progressByIndex = scopedLiveProgressByIndex(scope);
    const liveResults = scopedResults(scope);
    if (payload.current) {
      if (scope === "image") setWorkflowStep("render", "done", `已完成 ${completedCount}/${total} 张`);
      progressByIndex[payload.current] = {
        ...(progressByIndex[payload.current] || {}),
        progress: 100
      };
      const progressValues = Object.values(progressByIndex).map((item) => Number(item.progress || 0));
      setActiveGenerationProgress(progressValues.reduce((sum, value) => sum + value, 0) / total, `已完成 ${completedCount}/${total} 张`, "active", scope);
    }
    results.forEach((result, offset) => {
      const shouldReplacePending = Boolean(payload.current) && offset === 0;
      const liveIndex = shouldReplacePending ? payload.current - 1 : liveResults.length;
      liveResults[liveIndex] = result;
      replaceResultCard(result, shouldReplacePending ? payload.current : liveIndex + 1, liveIndex, scope);
      if (scopedSelectedIndex(scope) < 0) selectResult(liveIndex, scope);
    });
    if (!results.length) {
      const fallback = {
        kind: payload.kind,
        status: payload.status || "failed",
        error: payload.error || "未返回图片结果"
      };
      const liveIndex = payload.current ? payload.current - 1 : liveResults.length;
      liveResults[liveIndex] = fallback;
      replaceResultCard(fallback, payload.current || liveIndex + 1, liveIndex, scope);
      if (scopedSelectedIndex(scope) < 0) selectResult(liveIndex, scope);
    }
    if (scope === "image") {
      if (completedCount >= total) {
        setWorkflowStep("done", "done", "结果已展示");
      } else {
        setWorkflowStep("render", "active", `等待剩余 ${Math.max(0, total - completedCount)} 张`);
      }
    }
    const statusLine = scopedStatusLine(scope);
    if (statusLine) statusLine.textContent = `已完成 ${completedCount}/${total} 张`;
  });

  window.studio.onGenerationDone?.((payload) => {
    const generationId = payload?.generationId;
    if (!generationId) return;
    logClientEvent("renderer-generation-done-event", {
      generationId,
      resultCount: payload?.results?.length || 0
    });
    const resolver = state.generationFinishResolvers[generationId];
    if (!resolver) return;
    payload.featureScope = generationScopeFromEvent(payload);
    resolver.resolve(payload);
  });

  window.studio.onGenerationFailed?.((payload) => {
    const generationId = payload?.generationId;
    if (!generationId) return;
    logClientEvent("renderer-generation-failed-event", {
      generationId,
      error: payload?.error || ""
    });
    const resolver = state.generationFinishResolvers[generationId];
    if (!resolver) return;
    resolver.reject(new Error(payload.error || "图片生成失败"));
  });
}

function selectedAplusModules() {
  return $$("[data-aplus-module]:checked").map((input) => input.dataset.aplusModule).filter(Boolean);
}

function aplusFormatToRatio(format = "970x600") {
  const value = String(format || "");
  if (value === "1464x600" || value === "970x600") return "16:9";
  if (value === "600x450") return "4:3";
  if (/^\d+:\d+$/.test(value)) return value;
  return "16:9";
}

function buildAplusProductInfo() {
  const name = els.aplusProductName?.value.trim() || "";
  const info = els.aplusProductInfo?.value.trim() || "";
  return [
    name ? `商品名称：${name}` : "",
    info ? `商品卖点&要求：${info}` : ""
  ].filter(Boolean).join("\n");
}

function buildAplusPayload() {
  const format = els.aplusFormat?.value || "970x600";
  const modules = selectedAplusModules();
  return {
    featureScope: "aplus",
    productInfo: buildAplusProductInfo(),
    productPackageMode: state.productPackageMode,
    images: state.aplus.images.slice(0, 6).map((image) => image.dataUrl),
    analysis: state.aplus.analysis || null,
    brand: {
      ...state.brand,
      platform: normalizeFeaturePlatform(els.aplusPlatform?.value || state.brand.platform),
      region: els.aplusRegion?.value || state.brand.region,
      language: els.aplusLanguage?.value || state.brand.language
    },
    resolution: state.resolution,
    ratio: aplusFormatToRatio(format),
    imageModelRoute: resolveImageModelForScope("aplus"),
    referenceStrategy: "detail",
    suiteMode: "aplus",
    imageKinds: modules.map((module) => ({ kind: `A+/${module}`, count: 1, module })),
    aPlusSize: format,
    aplusModules: modules
  };
}

async function init() {
  if (appInitialized) return;
  appInitialized = true;
  logClientEvent("renderer-init-start");
  bindEvents();
  logClientEvent("renderer-bind-events-done");
  state.config = ensurePromptScopeDefaults(ensureDefaultGrsaiGeminiConfig(await window.studio.getConfig()));
  logClientEvent("renderer-config-loaded", {
    promptProvider: state.config.promptProvider,
    imageProvider: state.config.imageProvider,
    imageModelRoute: state.config.imageModelRoute
  });
  state.selectedPromptProvider = state.config.promptProvider || "grsai-gemini";
  state.imageModelRoute = normalizeImageModelRoute(state.config.imageModelRoute);
  state.featureImageModelRoutes = {
    aplus: normalizeImageModelRoute(state.config.featureImageModelRoutes?.aplus || "auto")
  };
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
  syncSuiteModeUi();
  syncAplusModuleUi();
  renderAplusThumbs();
  mountGlobalImageViewer();
  setRoute(localStorage.getItem(ACTIVE_ROUTE_STORAGE_KEY) || "image");
  await loadHistory();
  scheduleStartupUpdateCheck();
  logClientEvent("renderer-init-done");
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
