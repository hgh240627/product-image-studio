const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../renderer/app.js"), "utf8");
const mainSource = fs.readFileSync(path.resolve(__dirname, "../main.js"), "utf8");
const start = source.indexOf("const API_PROVIDER_PRESETS = ");
const end = source.indexOf("const IMAGE_PROVIDER_PRESETS = ", start);

if (start < 0 || end < 0) {
  throw new Error("没有找到 API_PROVIDER_PRESETS 配置。");
}

const snippet = `${source.slice(start, end)}\nAPI_PROVIDER_PRESETS;`;
const presets = vm.runInNewContext(snippet, {});
const expected = {
  "grsai-gemini": ["https://grsai.dakka.com.cn/v1", "chat", "gemini-3.1-pro"],
  zyapi: ["https://zyapi.tuluo.top:8888/v1", "chat", "gpt-5.4"],
  "openai-response": ["https://api.openai.com/v1", "responses", "gpt-4.1"],
  openai: ["https://api.openai.com/v1", "chat", "gpt-4.1"],
  gemini: ["https://generativelanguage.googleapis.com/v1beta", "gemini", "gemini-2.5-pro"],
  anthropic: ["https://api.anthropic.com/v1", "anthropic", "claude-3-5-sonnet-latest"],
  qwen: ["https://dashscope.aliyuncs.com/compatible-mode/v1", "chat", "qwen3-vl-plus"],
  deepseek: ["https://api.deepseek.com", "chat", "deepseek-chat"],
  doubao: ["https://ark.cn-beijing.volces.com/api/v3", "chat", "doubao-seed-1-6-vision-250615"],
  zhipu: ["https://open.bigmodel.cn/api/paas/v4", "chat", "glm-5.1"],
  xiaomi: ["https://api.xiaomimimo.com/v1", "chat", "mimo-v2.5-pro"]
};

const errors = [];
for (const [provider, [baseUrl, endpoint, model]] of Object.entries(expected)) {
  const preset = presets[provider];
  if (!preset) {
    errors.push(`${provider}: 缺少供应商预设`);
    continue;
  }
  if (preset.promptBaseUrl !== baseUrl) errors.push(`${provider}: API 地址应为 ${baseUrl}，实际为 ${preset.promptBaseUrl}`);
  if (preset.promptEndpoint !== endpoint) errors.push(`${provider}: 接口类型应为 ${endpoint}，实际为 ${preset.promptEndpoint}`);
  if (preset.promptModel !== model) errors.push(`${provider}: 默认模型应为 ${model}，实际为 ${preset.promptModel}`);
  if (!Array.isArray(preset.models) || !preset.models.includes(model)) {
    errors.push(`${provider}: 模型列表未包含默认模型 ${model}`);
  }
}

if (presets.custom?.promptBaseUrl !== "" || presets.custom?.promptEndpoint !== "chat") {
  errors.push("custom: 自定义供应商应保留空地址和 chat 默认接口。");
}

if (!/setPromptModelOptions\(getProviderModelOptions\(provider\), preset\.promptModel \|\| getLastPromptModel\(provider\)/.test(source)) {
  errors.push("切换内置供应商时没有优先使用官方默认模型。");
}

if (!/promptBaseUrl: \$\("#promptBaseUrl"\)\.value\.trim\(\) \|\| preset\.promptBaseUrl/.test(source)) {
  errors.push("保存/检测提示词供应商时没有优先使用当前表单 API 地址并回退预设地址。");
}

if (!/promptEndpoint: \$\("#promptEndpoint"\)\.value \|\| preset\.promptEndpoint/.test(source)) {
  errors.push("保存/检测提示词供应商时没有使用当前表单接口类型，zyapi 等中转站无法手动切换 chat/responses/auto。");
}

if (!/const PROMPT_PROVIDER_PRESETS = /.test(mainSource) || !/function normalizePromptProviderConfig/.test(mainSource)) {
  errors.push("主进程缺少提示词供应商预设归一化，旧配置可能继续残留错误地址。");
}

if (!/const promptSettings = normalizePromptProviderConfig\(config \|\| {}\)/.test(mainSource)) {
  errors.push("主进程保存配置时没有统一归一化提示词供应商配置。");
}

if (!/appendPromptRequestDebug\(error, config, url, "responses"/.test(mainSource) || !/appendPromptRequestDebug\(error, config, url, "chat"/.test(mainSource)) {
  errors.push("提示词 API 调用失败时没有附带实际请求地址和模型信息。");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Provider preset checks passed for ${Object.keys(expected).length} built-in providers.`);
