const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("studio", {
  getConfig: () => ipcRenderer.invoke("config:get"),
  saveConfig: (config) => ipcRenderer.invoke("config:save", config),
  getHistory: () => ipcRenderer.invoke("history:get"),
  recoverHistoryFromCache: () => ipcRenderer.invoke("history:recoverFromCache"),
  testPromptApi: (config) => ipcRenderer.invoke("prompt:testConnection", config),
  listPromptModels: (config) => ipcRenderer.invoke("prompt:listModels", config),
  testImageApi: (config) => ipcRenderer.invoke("image:testConnection", config),
  listImageModels: (config) => ipcRenderer.invoke("image:listModels", config),
  analyzePrompt: (payload) => ipcRenderer.invoke("prompt:analyze", payload),
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
  }
});
