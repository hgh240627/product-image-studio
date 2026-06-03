const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "renderer", "app.js"), "utf8");
const cssSource = fs.readFileSync(path.join(root, "renderer", "styles.css"), "utf8");

function functionBody(name) {
  const start = appSource.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `Missing function ${name}`);
  const signatureClose = appSource.indexOf(")", start);
  const open = appSource.indexOf("{", signatureClose);
  let depth = 0;
  for (let index = open; index < appSource.length; index += 1) {
    const char = appSource[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return appSource.slice(open + 1, index);
  }
  throw new Error(`Could not parse function ${name}`);
}

[
  "showMessageModal",
  "showUpdateModal",
  "openPromptTestModelDialog",
  "openImageTestModelDialog",
  "openApiAdvancedModal",
  "openProviderAddModal",
  "openProviderNoteModal",
  "openModelEditModal",
  "openSettingsDrawer"
].forEach((name) => {
  assert.match(functionBody(name), /showOverlay\(/, `${name} must use showOverlay so it stays above settings.`);
});

assert.match(functionBody("toast"), /ensureBodyOverlay\(els\.toast\)/, "toast must be promoted to body.");
assert.match(appSource, /function ensureBodyOverlay/, "Missing ensureBodyOverlay helper.");
assert.match(cssSource, /\.drawer\s*\{[\s\S]*?z-index:\s*520;/, "Drawer z-index changed unexpectedly.");
assert.match(cssSource, /\.modal\s*\{[\s\S]*?z-index:\s*820;/, "Modal z-index must stay above drawers.");
assert.match(cssSource, /\.toast\s*\{[\s\S]*?z-index:\s*920;/, "Toast z-index must stay above modals.");

console.log("Overlay layering checks passed.");
