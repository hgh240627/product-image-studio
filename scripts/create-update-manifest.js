const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const DEFAULT_SUMMARY = "\u6b64\u7248\u672c\u5305\u542b\u6700\u65b0\u4fee\u590d\u548c\u4f18\u5316\u3002";
const DEFAULT_NOTE = "\u8bf7\u67e5\u770b GitHub Release \u9875\u9762\u4e86\u89e3\u66f4\u65b0\u5185\u5bb9\u3002";

function readPackage() {
  const packagePath = path.join(__dirname, "..", "package.json");
  return JSON.parse(fs.readFileSync(packagePath, "utf8"));
}

function readArg(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return process.argv[index + 1] || "";
  return "";
}

function readRepeatedArg(name) {
  const values = [];
  const prefix = `--${name}=`;
  for (let index = 0; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    if (arg.startsWith(prefix)) values.push(arg.slice(prefix.length));
    if (arg === `--${name}` && process.argv[index + 1]) values.push(process.argv[index + 1]);
  }
  return values;
}

function normalizeRepo(value = "") {
  const text = String(value).trim();
  if (!text) return "";
  const httpsMatch = text.match(/github\.com[/:]([^/\s]+)\/([^/\s]+?)(?:\.git)?(?:[/?#].*)?$/i);
  if (httpsMatch) return `${httpsMatch[1]}/${httpsMatch[2]}`;
  const plainMatch = text.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (plainMatch) return text.replace(/\.git$/i, "");
  return "";
}

function repoFromGitRemote() {
  try {
    const remote = execSync("git remote get-url origin", {
      cwd: path.join(__dirname, ".."),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    return normalizeRepo(remote);
  } catch {
    return "";
  }
}

function splitNotes(value = "") {
  return String(value)
    .split(/\r?\n|\|/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function main() {
  const pkg = readPackage();
  const version = String(readArg("version") || pkg.version || "").replace(/^v/i, "").trim();
  const repo = normalizeRepo(readArg("repo") || process.env.GITHUB_REPOSITORY || repoFromGitRemote());
  const outFile = path.resolve(path.join(__dirname, ".."), readArg("out") || "update.json");
  const summary = String(readArg("summary") || process.env.UPDATE_SUMMARY || DEFAULT_SUMMARY).trim();
  const envNotes = splitNotes(process.env.UPDATE_NOTES || "");
  const notes = [
    ...readRepeatedArg("note"),
    ...envNotes
  ].map((item) => String(item || "").trim()).filter(Boolean);

  if (!version) {
    throw new Error("Missing package version.");
  }
  if (!repo) {
    throw new Error("Missing GitHub repo. Pass --repo owner/name or set git remote origin.");
  }

  const tag = `v${version}`;
  const artifactName = `product-image-studio-${version}-Windows-x64.exe`;
  const manifest = {
    latestVersion: version,
    title: tag,
    summary,
    downloadUrl: `https://github.com/${repo}/releases/download/${tag}/${artifactName}`,
    releaseNotesUrl: `https://github.com/${repo}/releases/tag/${tag}`,
    publishedAt: new Date().toISOString().slice(0, 10),
    notes: notes.length ? notes : [DEFAULT_NOTE]
  };

  fs.writeFileSync(outFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Wrote ${path.relative(process.cwd(), outFile)} for ${repo}@${tag}`);
  console.log(`Manifest URL: https://raw.githubusercontent.com/${repo}/main/update.json`);
}

main();
