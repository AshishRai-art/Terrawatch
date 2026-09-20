const { app, BrowserWindow, ipcMain } = require("electron/main");
const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });

const assistantInstruction = `You are TERRAWATCH AI, an assistant for an environmental and mine monitoring research prototype. Explain sensor data clearly and concisely. Separate communication or sensor faults from geological risk. Never claim to certify safety, predict collapse, or replace trained personnel. Use the supplied current readings only, and say when evidence is insufficient.`;
const assistantModels = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.6-flash"];

async function requestGemini(model, apiKey, question, context) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: assistantInstruction }] },
      contents: [{ role: "user", parts: [{ text: `Question: ${question}\n\nCurrent TERRAWATCH readings:\n${JSON.stringify(context, null, 2)}` }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1200 }
    })
  });
  const payload = await response.json();
  if (!response.ok) return { ok: false, status: response.status, error: payload.error?.message || `Gemini request failed with HTTP ${response.status}.` };
  const answer = payload.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("").trim();
  if (!answer) return { ok: false, status: 502, error: `Gemini returned no text (finish reason: ${payload.candidates?.[0]?.finishReason || "unknown"}).` };
  return { ok: true, answer };
}

ipcMain.handle("ask-gemini", async (_event, { question, context }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: "GEMINI_API_KEY is not configured in .env." };
  if (!question || typeof question !== "string") return { ok: false, error: "Enter a question for the assistant." };

  try {
    let lastError = "Gemini did not return an answer.";
    for (const model of assistantModels) {
      const result = await requestGemini(model, apiKey, question, context);
      if (result.ok) return result;
      lastError = `${model}: ${result.error}`;
      if (result.status === 400 || result.status === 401 || result.status === 403) break;
    }
    return { ok: false, error: lastError };
  } catch (error) {
    return { ok: false, error: `AI connection failed: ${error.message}` };
  }
});

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.resolve(__dirname, "preload.js")
    }
  });

  window.webContents.on("preload-error", (_event, preloadPath, error) => {
    console.error(`TERRAWATCH preload failed: ${preloadPath}`, error);
  });
  window.webContents.on("did-finish-load", () => {
    window.webContents.executeJavaScript("typeof window.terrawatchAI").then(type => console.log(`TERRAWATCH AI bridge: ${type}`));
  });
  window.loadFile(path.join(__dirname, "index.html"));

  window.once("ready-to-show", () => {
    window.show();
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});