const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("studio", {
  getConfig: () => ipcRenderer.invoke("config:get"),
  getRuntimeInfo: () => ipcRenderer.invoke("runtime:info"),
  logClientEvent: (payload) => ipcRenderer.invoke("runtime:clientLog", payload),
  checkUpdate: (payload) => ipcRenderer.invoke("update:check", payload),
  openUpdateUrl: (url) => ipcRenderer.invoke("update:openUrl", url),
  saveConfig: (config) => ipcRenderer.invoke("config:save", config),
  getHistory: () => ipcRenderer.invoke("history:get"),
  recoverHistoryFromCache: () => ipcRenderer.invoke("history:recoverFromCache"),
  testPromptApi: (config) => ipcRenderer.invoke("prompt:testConnection", config),
  listPromptModels: (config) => ipcRenderer.invoke("prompt:listModels", config),
  testImageApi: (config) => ipcRenderer.invoke("image:testConnection", config),
  listImageModels: (config) => ipcRenderer.invoke("image:listModels", config),
  analyzePrompt: (payload) => ipcRenderer.invoke("prompt:analyze", payload),
  readAiFile: (payload) => ipcRenderer.invoke("ai:file:read", payload),
  aiChat: (payload) => ipcRenderer.invoke("ai:chat", payload),
  aiGenerateImage: (payload) => ipcRenderer.invoke("ai:image", payload),
  optimizeTitle: (payload) => ipcRenderer.invoke("title:optimize", payload),
  generateImage: (payload) => ipcRenderer.invoke("image:generate", payload),
  regenerateImage: (payload) => ipcRenderer.invoke("image:regenerate", payload),
  repairImage: (payload) => ipcRenderer.invoke("image:repair", payload),
  generateWhiteBackground: (payload) => ipcRenderer.invoke("image:whiteBackground", payload),
  saveImage: (payload) => ipcRenderer.invoke("image:saveFromUrl", payload),
  openExternal: (url) => ipcRenderer.invoke("external:open", url),
  onGenerationProgress: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("generation:progress", listener);
    return () => ipcRenderer.removeListener("generation:progress", listener);
  },
  onGenerationBatch: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("generation:batch", listener);
    return () => ipcRenderer.removeListener("generation:batch", listener);
  },
  onGenerationPlan: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("generation:plan", listener);
    return () => ipcRenderer.removeListener("generation:plan", listener);
  },
  onGenerationResult: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("generation:result", listener);
    return () => ipcRenderer.removeListener("generation:result", listener);
  },
  onGenerationDone: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("generation:done", listener);
    return () => ipcRenderer.removeListener("generation:done", listener);
  },
  onGenerationFailed: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("generation:failed", listener);
    return () => ipcRenderer.removeListener("generation:failed", listener);
  }
});
