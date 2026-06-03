const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const electronBinary = require("electron");
const packageJson = require("../package.json");

const appName = packageJson.productName || packageJson.name || "product-image-studio";
const userDataDir = path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), appName);

function appendRuntimeLog(message, details = {}) {
  try {
    fs.mkdirSync(userDataDir, { recursive: true });
    fs.appendFileSync(
      path.join(userDataDir, "runtime.log"),
      `${JSON.stringify({ at: new Date().toISOString(), message, ...details })}\n`,
      "utf8"
    );
  } catch {
    // Startup diagnostics must never block the app from opening.
  }
}

function clearElectronCache() {
  const targets = [
    "Cache",
    "Code Cache",
    "GPUCache",
    "DawnGraphiteCache",
    "DawnWebGPUCache",
    "blob_storage",
    "Session Storage",
    "Service Worker"
  ];
  let cleared = 0;
  const failed = [];
  for (const name of targets) {
    const target = path.join(userDataDir, name);
    try {
      if (fs.existsSync(target)) {
        fs.rmSync(target, { recursive: true, force: true });
        cleared += 1;
      }
    } catch (error) {
      failed.push(`${name}: ${error.message || error}`);
    }
  }
  appendRuntimeLog("launcher-cache-clear", {
    version: packageJson.version,
    cleared,
    failed: failed.slice(0, 5)
  });
}

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

clearElectronCache();
appendRuntimeLog("launcher-start", {
  version: packageJson.version,
  cwd: process.cwd()
});

const child = spawn(electronBinary, ["."], {
  cwd: process.cwd(),
  env,
  detached: false,
  stdio: "inherit"
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
