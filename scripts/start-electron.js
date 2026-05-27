const { spawn } = require("node:child_process");
const electronBinary = require("electron");

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBinary, ["."], {
  cwd: process.cwd(),
  env,
  detached: false,
  stdio: "inherit"
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
