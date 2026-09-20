# TERRAWATCH — classic desktop prototype

This folder is an exact recovery of the original TERRAWATCH interface from your existing `TERRAWATCH.AppImage`. It has the original screens, design, simulated mine layout, demonstration sequence, charts, alerts, assistant demo, reports, and settings.

It intentionally has **no login** and **no Gemini API**. Sensor readings remain clearly labeled as prototype data.

## Real map and FastAPI sensor data

The Map and Dashboard screens now use Leaflet with OpenStreetMap tiles. On startup, the app requests sensor data from `http://127.0.0.1:8000/sensors`. The endpoint may return either an array or an object containing `sensors`, `nodes`, or `data`.

Each sensor should include `id` (or `node_id`), `latitude`/`lat`, `longitude`/`lng`/`lon`, and `status`. Optional fields such as `location`, `zone`, and `apci` are shown in the marker popup. FastAPI must allow CORS from the Electron renderer, for example with `CORSMiddleware`. If the backend is unavailable, the map keeps using the labeled local prototype data.

## Run in VS Code

Open this folder in VS Code, then run each command separately in the terminal:

```bash
npm install
npm start
```

TERRAWATCH opens as a desktop Electron application.

On launch, sign in with one of the local prototype accounts:

- `admin` / `admin123` — System Administrator
- `operator` / `operator123` — Arjun Kumar, Safety Operator

Use the sign-out icon beside the operator identity to return to the login screen. This is demo authentication only and is not a production identity system.

## Live AI assistant

The AI Assistant uses Gemini through the Electron main process. Keep the local `.env` file beside `main.js` with:

```env
GEMINI_API_KEY=your_gemini_key
```

Ask a question from the Dashboard assistant or the AI Assistant page. Current sensor readings, alerts, thresholds, and communication state are sent as context. The API key is not exposed to the renderer. If Gemini is unavailable, the prototype shows a connection notice and keeps the local demo response available.
