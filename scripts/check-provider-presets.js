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
  anthropic: ["https://api.anthropic.com/v1", "anthropic", "claude-sonnet-4-5"],
  azure: ["", "chat", ""],
  qwen: ["https://dashscope.aliyuncs.com/compatible-mode/v1", "chat", "qwen3-vl-plus"],
  deepseek: ["https://api.deepseek.com", "chat", "deepseek-chat"],
  doubao: ["https://ark.cn-beijing.volces.com/api/v3", "auto", "doubao-seed-2-0-lite-260215"],
  moonshot: ["https://api.moonshot.cn/v1", "chat", "kimi-k2-0711-preview"],
  zhipu: ["https://open.bigmodel.cn/api/paas/v4", "chat", "glm-5.1"],
  baichuan: ["https://api.baichuan-ai.com/v1", "chat", "Baichuan4"],
  minimax: ["https://api.minimax.chat/v1", "chat", "MiniMax-M1"],
  hunyuan: ["https://api.hunyuan.cloud.tencent.com/v1", "chat", "hunyuan-turbos-latest"],
  qianfan: ["https://qianfan.baidubce.com/v2", "chat", "ernie-4.5-turbo-vl"],
  xiaomi: ["https://api.xiaomimimo.com/v1", "chat", "mimo-v2.5-pro"],
  groq: ["https://api.groq.com/openai/v1", "chat", "llama-3.3-70b-versatile"],
  together: ["https://api.together.xyz/v1", "chat", "meta-llama/Llama-3.3-70B-Instruct-Turbo"],
  fireworks: ["https://api.fireworks.ai/inference/v1", "chat", "accounts/fireworks/models/llama-v3p3-70b-instruct"],
  openrouter: ["https://openrouter.ai/api/v1", "chat", "openai/gpt-4o-mini"],
  siliconflow: ["https://api.siliconflow.cn/v1", "chat", "Qwen/Qwen2.5-VL-72B-Instruct"],
  aihubmix: ["https://aihubmix.com/v1", "chat", "gpt-4o-mini"],
  "302ai": ["https://api.302.ai/v1", "chat", "gpt-4o-mini"],
  ollama: ["http://127.0.0.1:11434/v1", "chat", "llama3.2-vision"],
  "lm-studio": ["http://127.0.0.1:1234/v1", "chat", "local-model"],
  "new-api": ["", "chat", ""],
  cherryin: ["", "chat", ""]
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
  if (model && (!Array.isArray(preset.models) || !preset.models.includes(model))) {
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

if (!/const PROMPT_API_TIMEOUT_MS = 3 \* 60 \* 1000/.test(mainSource)) {
  errors.push("Prompt/vision API timeout must stay at least 3 minutes for slower relay responses.");
}

if (!/validatePromptApiJsonProbe/.test(mainSource) || !/promptApiVisionTestMessages/.test(mainSource)) {
  errors.push("提示词 API 检测没有验证 JSON 返回和视觉探针，可能再次出现检测成功但实战失败。");
}

if (!/mode: "single-call-no-fallback"/.test(mainSource)
  || !/rewriteCategoryPromptChunk\(config, promptItems, imageModel\)/.test(mainSource)
  || !/提示词模型没有返回第/.test(mainSource)
  || !/本次未调用作图 API/.test(mainSource)
  || !/promptSource: "prompt-api-single-call"/.test(mainSource)
  || !/skipGeneration: false/.test(mainSource)) {
  errors.push("分类提示词规划必须一次调用返回全部提示词，失败时停止且不得使用本地兜底。");
}

if (!/function isVolcenginePromptProvider/.test(mainSource)
  || !/function isVolcenginePromptTextModel/.test(mainSource)
  || !/ep-\.\.\. 接入点 ID/.test(source)
  || !/volcengineModelListNote/.test(mainSource)
  || !/function promptAutoEndpointCandidates/.test(mainSource)
  || !/\["chat", callChatApi\][\s\S]*\["responses", callResponsesApi\]/.test(mainSource)) {
  errors.push("火山方舟/豆包没有按 Model ID、ep 接入点和模型列表过滤逻辑单独处理。");
}

if (!/\(\^|\[\/:_\\-\\s\]\)\(\?:gpt\|chatgpt\)/.test(source) || !/return "openai";/.test(source) || !/if \(\/gemini\|imagen\|google\/\.test\(modelText\)\) return "gemini";/.test(source)) {
  errors.push("模型列表图标没有按模型官方家族映射，gpt/gemini 等模型可能显示成错误图标。");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Provider preset checks passed for ${Object.keys(expected).length} built-in providers.`);
