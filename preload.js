const electron = require("electron");

electron.contextBridge.exposeInMainWorld("terrawatchAI", {
  ask: (question, context) => electron.ipcRenderer.invoke("ask-gemini", { question, context })
});
