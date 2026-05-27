const { ProxyAgent } = require("undici");
const { getConfig } = require("../main");

function trimSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function normalizeProxyUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  return `http://${text}`;
}

async function probe(url, proxyUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      dispatcher: proxyUrl ? new ProxyAgent(proxyUrl) : undefined,
      headers: {
        "User-Agent": "Mozilla/5.0 ProductImageStudio/1.0",
        Accept: "application/json,text/plain,*/*"
      }
    });
    const text = await response.text();
    return {
      url,
      elapsedMs: Date.now() - started,
      status: response.status,
      ok: response.ok,
      preview: text.slice(0, 160)
    };
  } catch (error) {
    return {
      url,
      elapsedMs: Date.now() - started,
      error: error?.message || String(error),
      cause: error?.cause ? String(error.cause) : ""
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const config = await getConfig();
  const cliProxy = process.argv.find((arg) => arg.startsWith("--proxy="))?.slice("--proxy=".length);
  const proxyUrl = normalizeProxyUrl(cliProxy || config.trendProxyUrl);
  const query = encodeURIComponent(process.argv.find((arg) => arg.startsWith("--q="))?.slice("--q=".length) || "splatter screen");
  const urls = [
    `https://trends.google.com/trends/api/autocomplete/${query}?hl=en-US&tz=480`,
    `https://suggestqueries.google.com/complete/search?client=firefox&hl=en-US&q=${query}`,
    "https://www.google.com/generate_204"
  ];

  console.log(JSON.stringify({
    proxy: proxyUrl || "direct",
    baseUrl: trimSlash(config.promptBaseUrl),
    model: config.promptModel
  }, null, 2));

  for (const url of urls) {
    console.log(JSON.stringify(await probe(url, proxyUrl), null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
