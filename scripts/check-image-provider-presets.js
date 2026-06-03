const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const rendererSource = fs.readFileSync(path.resolve(__dirname, "../renderer/app.js"), "utf8");
const mainSource = fs.readFileSync(path.resolve(__dirname, "../main.js"), "utf8");

function readObject(source, startMarker, endMarker, context = {}) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) {
    throw new Error(`没有找到 ${startMarker} 配置。`);
  }
  return vm.runInNewContext(`${source.slice(start, end)}\n${startMarker.match(/const\s+(\w+)/)[1]};`, context);
}

const rendererPresets = readObject(
  rendererSource,
  "const IMAGE_PROVIDER_PRESETS = ",
  "function normalizePlatformKey",
  { GRSAI_IMAGE_MODELS: ["gpt-image-2", "gpt-image-2-vip", "nano-banana-fast", "nano-banana"] }
);

const mainPresets = readObject(
  mainSource,
  "const IMAGE_PROVIDER_PRESETS = ",
  "const RATIO_SIZES = ",
  {}
);

const expected = {
  grsai: ["grsai", "https://grsai.dakka.com.cn", "gpt-image-2", "gpt-image-2-vip"],
  openai: ["openai-images", "https://api.openai.com/v1", "gpt-image-1", "gpt-image-1"],
  qwen: ["custom", "https://dashscope.aliyuncs.com/api/v1", "wanx2.1-t2i-turbo", "wanx2.1-t2i-plus"],
  doubao: ["custom", "https://ark.cn-beijing.volces.com/api/v3", "doubao-seedream-3-0-t2i-250415", "doubao-seedream-3-0-t2i-250415"],
  stability: ["custom", "https://api.stability.ai", "stable-image-core", "stable-image-ultra"],
  replicate: ["custom", "https://api.replicate.com/v1", "black-forest-labs/flux-schnell", "black-forest-labs/flux-1.1-pro"],
  kling: ["custom", "https://api.klingai.com", "kling-image", "kling-image"],
  gemini: ["gemini", "https://generativelanguage.googleapis.com/v1beta", "gemini-3.1-flash-image-preview", "gemini-3-pro-image-preview"],
  bfl: ["bfl", "https://api.bfl.ai/v1", "flux-2-pro-preview", "flux-2-max"]
};

const errors = [];

for (const [provider, [providerType, baseUrl, model1k, model2k]] of Object.entries(expected)) {
  for (const [label, presets] of [["renderer", rendererPresets], ["main", mainPresets]]) {
    const preset = presets[provider];
    if (!preset) {
      errors.push(`${label}:${provider}: 缺少作图供应商预设`);
      continue;
    }
    if (preset.providerType !== providerType) errors.push(`${label}:${provider}: 适配类型应为 ${providerType}，实际为 ${preset.providerType}`);
    if (preset.baseUrl !== baseUrl) errors.push(`${label}:${provider}: API 地址应为 ${baseUrl}，实际为 ${preset.baseUrl}`);
    if (preset.model1k !== model1k) errors.push(`${label}:${provider}: 普通模型应为 ${model1k}，实际为 ${preset.model1k}`);
    if (preset.model2k !== model2k) errors.push(`${label}:${provider}: 高级模型应为 ${model2k}，实际为 ${preset.model2k}`);
  }
}

if (!/handleImageProviderChange\(event\.currentTarget\.value\)/.test(rendererSource)) {
  errors.push("作图供应商 change 事件没有调用 handleImageProviderChange。");
}

if (!/imageProviderType: isPresetProvider && preset\.providerType \? preset\.providerType/.test(rendererSource)) {
  errors.push("前端保存/检测内置作图供应商时没有强制使用预设适配类型。");
}

if (!/imageBaseUrl: \$\("#grsaiBaseUrl"\)\.value\.trim\(\) \|\| \(isPresetProvider && Object\.prototype\.hasOwnProperty\.call\(preset, "baseUrl"\) \? preset\.baseUrl/.test(rendererSource)) {
  errors.push("前端保存/检测作图供应商时没有优先使用当前表单 API 地址并回退预设地址。");
}

if (!rendererSource.includes('$("#imageProviderType").value = isPresetImageProvider ? imagePreset.providerType')) {
  errors.push("打开设置页时没有按当前内置作图供应商刷新适配类型。");
}

if (!rendererSource.includes('$("#grsaiBaseUrl").value = config.grsaiBaseUrl || config.imageBaseUrl || (isPresetImageProvider && Object.prototype.hasOwnProperty.call(imagePreset, "baseUrl") ? imagePreset.baseUrl : "")')) {
  errors.push("打开设置页时没有优先恢复已保存的作图 API 地址并回退预设地址。");
}

if (!/function normalizeImageProviderConfig/.test(mainSource) || !/const imageSettings = normalizeImageProviderConfig\(config \|\| {}\)/.test(mainSource)) {
  errors.push("主进程保存配置时没有统一归一化作图供应商预设。");
}

if (!/return requestGrsaiRealImageTest\(safeConfig\)/.test(mainSource)) {
  errors.push("Grsai 检测连接没有发起真实图片生成测试。");
}

if (!/openImageTestModelDialog\(settings\)/.test(rendererSource)) {
  errors.push("前端检测作图 API 前没有弹出模型选择。");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Image provider preset checks passed for ${Object.keys(expected).length} built-in providers.`);
