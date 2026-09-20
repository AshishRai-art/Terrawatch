/* TERRAWATCH — interactive research prototype. All readings are simulated. */
const $ = (q, el = document) => el.querySelector(q);
const $$ = (q, el = document) => [...el.querySelectorAll(q)];

const demoAccounts = {
  admin: { password: "admin123", name: "System Administrator", role: "Administrator", initials: "SA" },
  operator: { password: "operator123", name: "Arjun Kumar", role: "Safety Operator", initials: "AK" }
};
let authenticatedUser = null;

const navGroups = [
  ["OVERVIEW", [["Dashboard", "◫"], ["Map", "⌖"], ["Digital Twin", "◇"]]],
  ["MONITORING", [["Nodes", "◉"], ["Sensors", "⌁"], ["Analytics", "⌁"], ["APCI", "◌"], ["AI Assistant", "✦"]]],
  ["OPERATIONS", [["Alerts", "!"], ["Incidents", "▣"], ["Remote Inspection", "◒"], ["Robot", "◒"], ["History", "◷"]]],
  ["SYSTEM", [["System Health", "♥"], ["Communication", "⌁"], ["Power", "ϟ"], ["Maintenance", "⚒"]]],
  ["REFERENCE", [["Reports", "▤"], ["Settings", "⚙"]]]
];

const statusMeta = {
  NORMAL: { class: "normal", color: "#21d69b", icon: "●" },
  WATCH: { class: "watch", color: "#ffca63", icon: "●" },
  WARNING: { class: "warning", color: "#ff8b47", icon: "▲" },
  HIGH: { class: "high", color: "#ff5265", icon: "▲" },
  OFFLINE: { class: "offline", color: "#64717a", icon: "●" }
};

const initialNodes = [
  { id:"N01", location:"North Ridge", zone:"Zone A", status:"NORMAL", apci:12, tilt:0.18, crack:1.2, settlement:2.1, moisture:18, vibration:0.09, battery:92, rssi:-83, snr:8.2, health:"Healthy", sync:"8 sec ago", pos:[22,28], lat:28.5072, lng:77.0941, trend:"stable" },
  { id:"N02", location:"East Drift", zone:"Zone B", status:"NORMAL", apci:16, tilt:0.21, crack:1.4, settlement:2.4, moisture:20, vibration:0.11, battery:87, rssi:-91, snr:6.4, health:"Healthy", sync:"6 sec ago", pos:[69,30], lat:28.5051, lng:77.1108, trend:"stable" },
  { id:"N03", location:"West Chamber", zone:"Zone C", status:"WARNING", apci:58, tilt:0.86, crack:4.8, settlement:8.7, moisture:43, vibration:0.38, battery:76, rssi:-88, snr:5.7, health:"Healthy", sync:"4 sec ago", pos:[35,66], lat:28.4974, lng:77.0973, trend:"rising" },
  { id:"N04", location:"Ventilation Shaft", zone:"Zone D", status:"WATCH", apci:34, tilt:0.42, crack:2.3, settlement:3.9, moisture:31, vibration:0.15, battery:65, rssi:-102, snr:2.8, health:"Healthy", sync:"11 sec ago", pos:[75,62], lat:28.4986, lng:77.1137, trend:"rising" },
  { id:"N05", location:"South Stope", zone:"Zone E", status:"NORMAL", apci:14, tilt:0.17, crack:1.1, settlement:1.9, moisture:19, vibration:0.08, battery:48, rssi:-98, snr:4.1, health:"Fault: crack meter", sync:"5 sec ago", pos:[56,82], lat:28.4902, lng:77.1056, trend:"flatline" },
  { id:"N06", location:"Lower Gallery", zone:"Zone F", status:"OFFLINE", apci:0, tilt:null, crack:null, settlement:null, moisture:null, vibration:null, battery:61, rssi:null, snr:null, health:"Communication gap", sync:"24 min ago", pos:[16,83], lat:28.4896, lng:77.0919, trend:"offline" },
  { id:"N07", location:"Main Entry", zone:"Zone G", status:"NORMAL", apci:9, tilt:0.12, crack:0.9, settlement:1.5, moisture:16, vibration:0.07, battery:96, rssi:-78, snr:10.8, health:"Healthy", sync:"9 sec ago", pos:[88,49], lat:28.5013, lng:77.1192, trend:"stable" }
];

const state = {
  page: "Dashboard", nodes: structuredClone(initialNodes), selectedNode: "N03", selectedZone: "Zone C",
  scenario: "Multi-sensor convergence", demoStage: 0, running: false, robot: "STANDBY", robotLength: 0,
  incident: { id:"INC-2409", state:"INVESTIGATING", acknowledged:true, created:"14:32:18", target:"West Chamber / Zone C" },
  syncSeconds: 10, lastSyncAt: Date.now(), dark: true, simulation: true, thresholds: [19,44,69], alerts: [], chat: [], charts: {}, filters: { node:"N03", range:"Last 6 hours" }
};

const baseAlerts = () => [
  {type:"warning", title:"Potential ground-instability event", detail:"N03 • multi-sensor convergence • human verification required", time:"now"},
  {type:"watch", title:"Elevated moisture trend", detail:"N04 • Zone D • monitoring priority increased", time:"3m"},
  {type:"fault", title:"Sensor fault — verify sensor", detail:"N05 crack meter reports a flatline pattern", time:"8m"},
  {type:"offline", title:"Communication gap", detail:"N06 has not reported in 24 minutes", time:"24m"}
];
state.alerts = baseAlerts();

const API_BASE = window.TERRAWATCH_API_URL || "http://127.0.0.1:8000";
const apiState = { connected: false };

function normalizeBackendNode(raw, index) {
  const current = state.nodes.find(node => node.id === (raw.id || raw.node_id)) || initialNodes[index % initialNodes.length];
  return { ...current, ...raw, id: raw.id || raw.node_id || current.id, location: raw.location || raw.name || current.location, zone: raw.zone || current.zone, status: String(raw.status || raw.risk_level || current.status).toUpperCase(), lat: Number(raw.lat ?? raw.latitude ?? current.lat), lng: Number(raw.lng ?? raw.lon ?? raw.longitude ?? current.lng), pos: current.pos };
}

async function loadBackendSensors() {
  try {
    const response = await fetch(`${API_BASE}/sensors`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const sensors = Array.isArray(payload) ? payload : payload.sensors || payload.nodes || payload.data || [];
    if (!sensors.length) throw new Error("No sensor records returned");
    state.nodes = sensors.map(normalizeBackendNode);
    apiState.connected = true;
    render();
  } catch (error) {
    console.info("TERRAWATCH backend unavailable; using local prototype sensor data.", error.message);
  }
}

function navTemplate() {
  return navGroups.map(([group, items]) => `<div class="nav-group">${group}</div>${items.map(([name, icon]) => `<button class="nav-item ${state.page===name?"active":""}" data-nav="${name}" aria-label="Open ${name} page" aria-current="${state.page===name ? "page" : "false"}"><span class="nav-icon" aria-hidden="true">${icon}</span>${name}</button>`).join("")}`).join("");
}
function setAuthenticatedUser(username) {
  authenticatedUser = { username, ...demoAccounts[username] };
  $("#operatorName").textContent = authenticatedUser.name;
  $("#operatorRole").textContent = authenticatedUser.role;
  $("#operatorAvatar").textContent = authenticatedUser.initials;
}
function resetLoginSubmitState() {
  const submit = $("#loginSubmit");
  if (!submit) return;
  submit.disabled = false;
  submit.classList.remove("loading");
  $(".login-submit span:first-child", submit).textContent = "Sign in";
}
function showApplication() {
  $("#loginScreen").classList.add("is-hidden");
  $("#appShell").classList.remove("is-hidden");
  render();
  loadBackendSensors();
}
function signOut() {
  authenticatedUser = null;
  $("#appShell").classList.add("is-hidden");
  $("#loginScreen").classList.remove("is-hidden");
  $("#loginForm").reset();
  $("#loginError").textContent = "";
  resetLoginSubmitState();
  $("#username").focus();
  toast("Signed out", "The monitoring console is locked.");
}
function handleLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const username = $("#username").value.trim().toLowerCase();
  const password = $("#password").value;
  const error = $("#loginError");
  const submit = $("#loginSubmit");
  error.textContent = "";
  if (!username || !password) {
    error.textContent = "Enter both username and password to continue.";
    if (!username) $("#username").focus(); else $("#password").focus();
    return;
  }
  submit.disabled = true;
  submit.classList.add("loading");
  $(".login-submit span:first-child", submit).textContent = "Authenticating";
  window.setTimeout(() => {
    const account = demoAccounts[username];
    if (!account || account.password !== password) {
      error.textContent = "Invalid demo credentials. Check the account hint and try again.";
      resetLoginSubmitState();
      $("#password").select();
      return;
    }
    setAuthenticatedUser(username);
    showApplication();
  }, 600);
}
function setPage(page) {
  state.page = page;
  $("#nav").innerHTML = navTemplate();
  $("#pageEyebrow").textContent = page === "Dashboard" ? "COMMAND CENTER" : page.toUpperCase();
  $("#pageTitle").textContent = page === "Dashboard" ? "Mine overview" : page;
  $(".sidebar").classList.remove("open");
  render();
}
function statusBadge(status) { return `<span class="status-badge ${statusMeta[status]?.class || ""}">${statusMeta[status]?.icon || "●"} ${status}</span>`; }
function n(id) { return state.nodes.find(x => x.id === id); }
function val(v, suffix="") { return v === null || v === undefined ? "—" : `${typeof v === "number" ? (Number.isInteger(v) ? v : v.toFixed(v < 2 ? 2 : 1)) : v}${suffix}`; }
function riskFrom(score) { return score <= state.thresholds[0] ? "NORMAL" : score <= state.thresholds[1] ? "WATCH" : score <= state.thresholds[2] ? "WARNING" : "HIGH"; }
function kpi(label, value, sub, kind="", id="") { return `<article class="kpi"${id?` id="${id}"`:""}><div class="label">${label}</div><div class="value ${kind}">${value}</div><div class="delta ${kind}">${sub}</div></article>`; }
function formatClock(seconds) { return `00:${String(Math.max(0, seconds)).padStart(2, "0")}`; }
function pageHead(title, description, actions="") { return `<div class="page-head"><div><h2>${title}</h2><p>${description}</p></div><div class="page-actions">${actions}</div></div>`; }
function panel(title, subtitle, inner, tools="", cls="") { return `<section class="panel ${cls}"><div class="panel-head"><div><h2>${title}</h2>${subtitle?`<p>${subtitle}</p>`:""}</div>${tools?`<div class="panel-tools">${tools}</div>`:""}</div>${inner}</section>`; }
function trendArrow(node) { return node.trend === "rising" ? `<span class="up">↗</span>` : node.trend === "flatline" ? `<span class="severity-watch">━</span>` : "↔"; }
function miniLine(points, color="#21d69b", fill=true) {
  const w=260,h=80, pad=4, min=Math.min(...points), max=Math.max(...points), span=max-min||1;
  const pts = points.map((p,i)=>`${pad+i*(w-pad*2)/(points.length-1)},${h-pad-(p-min)/span*(h-pad*2)}`).join(" ");
  const area = `${pad},${h-pad} ${pts} ${w-pad},${h-pad}`;
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="grad${color.replace('#','')}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".27"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="M4 20H256M4 50H256" stroke="#40515a" stroke-width=".6" opacity=".55" stroke-dasharray="3 4"/><polygon points="${area}" fill="url(#grad${color.replace('#','')})"/><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.1" vector-effect="non-scaling-stroke"/></svg>`;
}
function multiLine() {
  const series=[{p:[18,20,21,25,26,28,33,38,45,49,58,63],c:"#ff8b47"},{p:[14,15,15,17,18,22,25,31,35,39,45,47],c:"#35bce8"},{p:[13,13,14,15,17,19,20,24,27,31,34,39],c:"#21d69b"}];
  const w=500,h=180,pad=14;
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path d="M${pad} 35H${w-pad}M${pad} 80H${w-pad}M${pad} 125H${w-pad}M${pad} 166H${w-pad}" stroke="#3a4d55" stroke-width=".7" stroke-dasharray="3 4"/>${series.map(s=>{const pts=s.p.map((v,i)=>`${pad+i*(w-pad*2)/(s.p.length-1)},${h-pad-(v/70)*(h-pad*2)}`).join(' ');return `<polyline points="${pts}" fill="none" stroke="${s.c}" stroke-width="2.2" vector-effect="non-scaling-stroke"/>`}).join('')}<text x="13" y="17" fill="#7b8e96" font-size="8">70</text><text x="13" y="165" fill="#7b8e96" font-size="8">0</text><text x="360" y="175" fill="#7b8e96" font-size="8">Observation window →</text></svg>`;
}
function mineMap({twin=false}={}) {
  return `<div class="map-canvas leaflet-map ${twin?"twin-map":""}" data-map-id="${twin?"twin":"operations"}" aria-label="OpenStreetMap sensor map"></div>`;
}

function initLeafletMaps() {
  if (!window.L) return;
  $$('.leaflet-map:not([data-ready])').forEach(container => {
    const map = L.map(container, { zoomControl: true, attributionControl: false }).setView([28.5005, 77.103], 14);
    L.control.attribution({ prefix: false }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors' }).addTo(map);
    state.nodes.forEach(node => {
      const color = statusMeta[node.status]?.color || statusMeta.NORMAL.color;
      const icon = L.divIcon({ className: `sensor-marker marker-${statusMeta[node.status]?.class || "normal"}`, html: `<span style="background:${color}"></span><b>${node.id}</b>`, iconSize: [54, 30], iconAnchor: [10, 15] });
      L.marker([node.lat, node.lng], { icon }).addTo(map).bindPopup(`<strong>${node.id} · ${node.location}</strong><br>${node.zone} · <b style="color:${color}">${node.status}</b><br>APCI ${node.apci ?? "—"}<br><small>Source: ${apiState.connected ? "FastAPI backend" : "local prototype fallback"}</small>`);
    });
    container.dataset.ready = "true";
    setTimeout(() => map.invalidateSize(), 0);
  });
}
function reading(label, value, unit, node) { return `<div class="reading"><label>${label}</label><b>${val(value,unit)} ${trendArrow(node)}</b></div>`; }
function nodeCard(node) { return `<article class="panel node-card ${node.status.toLowerCase()}"><div class="node-card-top"><div><h3>${node.id}</h3><p>${node.location} · ${node.zone}</p></div>${statusBadge(node.status)}</div><div class="sensor-readings">${reading("TILT",node.tilt,"°",node)}${reading("CRACK",node.crack," mm",node)}${reading("SETTLEMENT",node.settlement," mm",node)}${reading("MOISTURE",node.moisture,"%",node)}${reading("VIBRATION",node.vibration," g",node)}<div class="reading"><label>APCI</label><b class="severity-${statusMeta[node.status].class}">${node.apci||"—"} / 100</b></div></div><div class="node-footer"><span>BAT ${node.battery}%</span><span>${node.rssi?`${node.rssi} dBm`:'NO LINK'}</span><button class="row-action" data-node="${node.id}">DETAILS →</button></div></article>`; }
function renderDashboard() {
  const online = state.nodes.filter(x=>x.status!=="OFFLINE").length, warning=state.nodes.filter(x=>x.status==="WARNING").length, high=state.nodes.filter(x=>x.status==="HIGH").length, watch=state.nodes.filter(x=>x.status==="WATCH").length, faults=state.nodes.filter(x=>x.health.includes("Fault")).length;
  const kpis = `<div class="kpi-grid">${kpi("Total nodes",state.nodes.length,"1 gateway · 7 zones")}${kpi("Online",online,`${state.nodes.length-online} offline`,"good")}${kpi("Watch",watch,"Requires review","warn")}${kpi("Warning",warning,"N03 · Zone C","high")}${kpi("High risk",high,high?"Immediate verification":"No active high events",high?"high":"good")}${kpi("Sensor faults",faults,"Separate from ground risk","warn")}${kpi("Last sync",formatClock(10-state.syncSeconds),`next refresh in ${formatClock(state.syncSeconds)}`,"good","syncKpi")}</div>`;
  const map = panel("Live mine map", "7 nodes · risk and communications overlay", mineMap(), `<button class="small-btn active">Risk</button><button class="small-btn">Coverage</button><button class="small-btn" data-nav="Map">Expand</button>`, "map-panel");
  const alerts = panel("Priority queue", "geological, sensor and communication signals are separated", `<div class="alert-list">${state.alerts.slice(0,4).map(a=>`<div class="alert ${a.type}"><span class="alert-icon">${a.type==="warning"?"▲":a.type==="fault"?"⚠":"●"}</span><div><b>${a.title}</b><small>${a.detail}</small></div><time>${a.time}</time></div>`).join("")}</div>`, `<button class="small-btn" data-nav="Alerts">All alerts</button>`);
  const ai = panel("TERRAWATCH AI assistant", "AI-assisted prototype analysis — demonstration data", `<div class="ai-summary"><span class="ai-tag">N03 · OBSERVATION WINDOW</span><p>Crack displacement, tilt and settlement are moving above the local baseline in a related period.</p><div class="ai-evidence"><span class="evidence">CRACK +3.6 mm</span><span class="evidence">TILT ↗</span><span class="evidence">APCI 58</span></div></div><form class="chat-mini" id="miniChat"><input placeholder="Ask about Zone C or N03…" aria-label="Ask the AI assistant"/><button class="small-btn">ASK</button></form>`);
  const trend = panel("N03 multi-sensor trend", "Current window · relative change from local baseline", `<div class="chart-legend"><span><i class="line-key" style="background:#ff8b47"></i>Crack deviation</span><span><i class="line-key" style="background:#35bce8"></i>Tilt deviation</span><span><i class="line-key"></i>Settlement rate</span></div><div class="chart-wrap">${multiLine()}</div>`, `<button class="small-btn" data-nav="Analytics">Analysis</button>`);
  const comm = panel("Communication health", "LoRa gateway / node link quality", `<div class="metrics"><div class="metric-row"><span>N01 North</span><div class="metric-bar"><i style="width:86%"></i></div><span>-83</span></div><div class="metric-row"><span>N03 West</span><div class="metric-bar"><i style="width:73%"></i></div><span>-88</span></div><div class="metric-row warning"><span>N04 Vent</span><div class="metric-bar"><i style="width:44%"></i></div><span>-102</span></div><div class="metric-row high"><span>N06 Lower</span><div class="metric-bar"><i style="width:5%"></i></div><span>—</span></div></div>`, `<button class="small-btn" data-nav="Communication">Details</button>`);
  const health = panel("Edge health", "Power and local logging continue independently", `<div class="health-grid"><div class="health-item"><span class="mini-label">NODE BATTERY</span><b>81.1%</b><small>● Fleet nominal</small></div><div class="health-item"><span class="mini-label">SD LOGGING</span><b>6 / 7</b><small>● Online nodes</small></div><div class="health-item low"><span class="mini-label">LOW POWER</span><b>N05 · 48%</b><small>◐ Monitor</small></div><div class="health-item"><span class="mini-label">GATEWAY</span><b>Healthy</b><small>● 99.9% uptime</small></div></div>`, `<button class="small-btn" data-nav="System Health">Health</button>`);
  return `<div class="dashboard-grid">${kpis}${map}<div class="right-stack">${alerts}${ai}</div><div class="bottom-grid">${trend}${comm}${health}</div></div>`;
}
function renderNodes(type="nodes") {
  const isSensors = type === "sensors";
  return `${pageHead(isSensors?"Sensor observability":"Node fleet", isSensors?"Individual sensor channels, calibration status and quality checks.":"Distributed edge nodes retain local analysis and logging during link interruptions.", `<button class="secondary" data-action="sync">↻ Sync now</button><button class="primary" data-action="export-nodes">⇩ Export CSV</button>`)}<div class="tabs"><button class="active">All nodes</button><button>Attention required</button><button>Offline</button><button>Faults</button></div>${isSensors ? renderSensorsTable() : `<div class="card-grid">${state.nodes.map(nodeCard).join("")}</div>`}`;
}
function renderSensorsTable() {
  const rows = state.nodes.flatMap(node => ["Tilt / MPU6050","Crack displacement","Settlement / JSN-SR04T","Soil moisture","Vibration / SW-420"].map((sensor,i)=>{const fault=node.id==="N05"&&i===1; const offline=node.status==="OFFLINE";return `<tr><td><b>${node.id}</b><br><small>${node.zone}</small></td><td>${sensor}</td><td>${offline?"No recent reading":fault?"Repeated identical values":"Within expected range"}</td><td>${fault?statusBadge("WATCH"):offline?statusBadge("OFFLINE"):statusBadge("NORMAL")}</td><td>${fault?"Flatline pattern":offline?"Last seen 24m ago":"Calibrated · verified"}</td><td><button class="row-action" data-node="${node.id}">VIEW →</button></td></tr>`}).join("")).join("");
  return panel("Sensor channels", "Live demonstration data — each channel is site-calibrated", `<div class="table-wrap"><table class="data-table"><thead><tr><th>NODE / ZONE</th><th>SENSOR</th><th>OBSERVATION</th><th>HEALTH</th><th>QUALITY SIGNAL</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`);
}
function renderMap() {
  const selected=n(state.selectedNode);
  return `${pageHead("Interactive mine map", "Prototype risk visualization. Node status, tunnel geometry and radio coverage are illustrative.", `<button class="secondary" data-action="layer">◈ Risk layer</button><button class="secondary" data-action="layer">⌁ Coverage</button><button class="primary" data-nav="Remote Inspection">Open inspection</button>`)}<div class="twin-layout">${panel("Mine operations layer", "Click a node for a human-verification briefing", mineMap(), "", "map-panel")}<div class="right-stack">${nodeDetailPanel(selected)}${panel("Map layers", "", `<div class="health-grid"><div class="health-item"><span class="mini-label">RISK HEATMAP</span><b>Active</b><small>● APCI + anomaly</small></div><div class="health-item"><span class="mini-label">LORA COVERAGE</span><b>Active</b><small>● Link quality</small></div><div class="health-item"><span class="mini-label">HISTORICAL RISK</span><b>24 h</b><small>● Context only</small></div><div class="health-item"><span class="mini-label">ROBOT ROUTE</span><b>R1</b><small>● Proposed</small></div></div>`)} </div></div>`;
}
function nodeDetailPanel(node) {
  if (!node) return "";
  const analysis = node.id==="N03" ? "Several independently monitored parameters are changing above their site baseline. This increases monitoring priority; it is not a collapse confirmation." : node.status === "OFFLINE" ? "A communication interruption is being tracked separately from geotechnical risk. The node should continue local logging and alerting if powered." : "No multi-sensor abnormal pattern is currently indicated in this demonstration window.";
  return panel(`${node.id} verification briefing`, `${node.location} · ${node.zone}`, `<div class="zone-card"><b>${statusMeta[node.status].icon} ${node.status} · APCI ${node.apci || "—"}</b><h3>${node.status==="WARNING"?"Elevated monitoring priority":"Current condition summary"}</h3><p>${analysis}</p><div class="ai-evidence"><span class="evidence">TILT ${val(node.tilt,"°")}</span><span class="evidence">CRACK ${val(node.crack," mm")}</span><span class="evidence">RSSI ${val(node.rssi," dBm")}</span></div></div>`, `<button class="small-btn" data-node="${node.id}">Node details</button>`);
}
function renderAnalytics() {
  const filter=`<select class="select" id="analyticNode">${state.nodes.map(x=>`<option ${x.id===state.filters.node?"selected":""}>${x.id}</option>`).join("")}</select><select class="select" id="analyticRange"><option>Last 6 hours</option><option>Last 24 hours</option><option>Last 7 days</option></select>`;
  const primary=panel("Sensor deviation against baseline", "Simulated N03 observation history · local baseline zeroed", `<div class="chart-legend"><span><i class="line-key" style="background:#ff8b47"></i>Crack</span><span><i class="line-key" style="background:#35bce8"></i>Tilt</span><span><i class="line-key"></i>Settlement</span></div><div class="chart-wrap">${multiLine()}</div>`, filter);
  const anom=panel("AI anomaly timeline", "Interpretations are a demonstration; no scientific confidence values are implied.", `<div class="timeline"><div class="timeline-item"><b>Baseline-consistent period</b><small>12:00 · N03 signals within local expected variation</small></div><div class="timeline-item"><b>Crack movement trend observed</b><small>13:07 · gradual deviation persisted across three readings</small></div><div class="timeline-item high"><b>Multi-sensor abnormal pattern</b><small>14:32 · crack + tilt + settlement changing together</small></div></div>`);
  const apci = panel("APCI evolution", "Adaptive Precursor Convergence Index · current N03 score", `<div class="chart-wrap">${miniLine([12,14,16,18,21,24,29,34,39,46,51,n("N03").apci],"#ff8b47")}</div><div class="chart-legend"><span>Normal 0–${state.thresholds[0]}</span><span>Watch ${state.thresholds[0]+1}–${state.thresholds[1]}</span><span>Warning ${state.thresholds[1]+1}–${state.thresholds[2]}</span></div>`);
  const comparison=panel("Multi-node comparison", "APCI in current observation window", `<div class="metrics">${state.nodes.filter(x=>x.status!=="OFFLINE").map(x=>`<div class="metric-row ${statusMeta[x.status].class}"><span>${x.id} ${x.location.split(" ")[0]}</span><div class="metric-bar"><i style="width:${x.apci}%"></i></div><span>${x.apci}</span></div>`).join("")}</div>`);
  return `${pageHead("Advanced analytics", "Explore time-series behaviour, multi-node comparisons and explainable anomaly context.", `<button class="secondary" data-action="export-report">⇩ Export chart data</button>`)}<div class="analytics-grid">${primary}${anom}${apci}${comparison}</div>`;
}
function renderAPCI() {
  const node=n("N03"), comps=[ ["Baseline deviation",78,"high"], ["Rate of change",64,"warn"], ["Persistence",51,"warn"], ["Cross-sensor convergence",83,"high"], ["Data quality",90,""] ];
  const dial= `<div class="score-dial"><svg viewBox="0 0 220 130"><path d="M25 110 A85 85 0 0 1 195 110" fill="none" stroke="#24363d" stroke-width="15" stroke-linecap="round"/><path d="M25 110 A85 85 0 0 1 195 110" fill="none" stroke="#ff8b47" stroke-width="15" stroke-linecap="round" pathLength="100" stroke-dasharray="58 100"/></svg><div class="score-center"><strong>${node.apci}</strong><span>WARNING</span></div></div>`;
  return `${pageHead("APCI analysis", "Adaptive Precursor Convergence Index — proposed research framework requiring field validation.", `<button class="secondary" data-action="open-config">Configure bands</button><button class="primary" data-nav="AI Assistant">View AI context</button>`)}<div class="apci-layout">${panel("Current risk assessment", "N03 · West Chamber · deterministic / interpretable", dial+`<div class="explain-box"><b class="severity-warning">WHY 58?</b><br>Convergence increases because crack displacement, tilt and settlement are all deviating within the related observation window.</div>`)}${panel("Contributing factors", "Values show relative contribution in the demo model", `<div class="component-list">${comps.map(([name,v,kind])=>`<div class="component ${kind}"><span>${name}</span><i><span style="width:${v}%"></span></i><b>${v}</b></div>`).join("")}</div>`)}${panel("Risk band configuration", "Administrator-editable prototype settings", `<div class="thresholds"><div class="threshold-row"><label>NORMAL</label><span>0 —</span><input class="form-control threshold-input" data-index="0" value="${state.thresholds[0]}" /></div><div class="threshold-row"><label>WATCH</label><span>${state.thresholds[0]+1} —</span><input class="form-control threshold-input" data-index="1" value="${state.thresholds[1]}" /></div><div class="threshold-row"><label>WARNING</label><span>${state.thresholds[1]+1} —</span><input class="form-control threshold-input" data-index="2" value="${state.thresholds[2]}" /></div><div class="threshold-row"><label>HIGH</label><span>${state.thresholds[2]+1} —</span><span>100</span></div><button class="secondary" style="margin-top:9px" data-action="save-thresholds">Save configuration</button></div>`)}${panel("APCI vs AI", "Two complementary layers; human review remains the final decision point", `<div class="health-grid"><div class="health-item"><span class="mini-label">APCI SCORE</span><b class="severity-warning">58 · WARNING</b><small>Deterministic scoring</small></div><div class="health-item"><span class="mini-label">AI STATUS</span><b>Pattern detected</b><small>Adaptive analysis</small></div></div><div class="explain-box">APCI makes the contributing signals explicit. The AI layer adds trend, correlation and sensor-health context. Neither autonomously decides field action.</div>`)} </div>`;
}
function chatAnswer(query) {
  const q=query.toLowerCase(); const node=n("N03");
  if(q.includes("offline")||q.includes("n06")) return `<strong>COMMUNICATION OBSERVATION · N06</strong>N06 last reported 24 minutes ago. This is classified as a communication gap, not a ground-instability event. <br><br><b>Evidence:</b> no packets, RSSI unavailable; last battery reading 61%.<br><b>Recommended verification:</b> check gateway path and node power; local SD logging should be assessed when access is safe.`;
  if(q.includes("fault")||q.includes("sensor health")||q.includes("n05")) return `<strong>SENSOR HEALTH · N05</strong>The crack meter has a repeated-identical-value pattern. This is marked <b>SENSOR FAULT — VERIFY SENSOR</b>, and does not increase mine risk by itself.<br><br><b>Recommended verification:</b> inspect sensor mounting, ADC wiring and site calibration.`;
  if(q.includes("compare")) return `<strong>NODE COMPARISON · N01 vs N03</strong>N01 is baseline-consistent (APCI 12). N03 is at APCI ${node.apci} because crack, tilt and settlement are changing together over the observation window.<br><br><b>Recommended verification:</b> prioritize N03 / Zone C; retain N01 as a nearby context reference.`;
  if(q.includes("zone")||q.includes("n03")||q.includes("happening")||q.includes("why")||q.includes("risk")) return `<strong>OBSERVATION · N03 / ZONE C</strong>Crack displacement has increased from its local baseline, while tilt and settlement show related upward deviation.<br><br><b>Evidence:</b> crack ${node.crack.toFixed(1)} mm, tilt ${node.tilt.toFixed(2)}°, settlement ${node.settlement.toFixed(1)} mm; APCI ${node.apci} (${node.status}).<br><b>Risk interpretation:</b> multi-sensor abnormal pattern detected in simulated data — not a confirmed incident.<br><b>Recommended verification:</b> conduct human review and inspect Zone C per mine safety procedures.`;
  return `<strong>SYSTEM SUMMARY</strong>The demo currently prioritizes N03 / West Chamber for field verification. N05 has a sensor health issue and N06 has a separate communication gap. Ask about a zone, a node, faults, or comparisons.`;
}
function escapeHTML(value) { return String(value).replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[character])); }
function assistantContext() {
  return {
    timestamp: new Date().toISOString(),
    selectedNode: state.selectedNode,
    thresholds: state.thresholds,
    alerts: state.alerts,
    nodes: state.nodes.map(({ id, location, zone, status, apci, tilt, crack, settlement, moisture, vibration, battery, rssi, snr, health, sync }) => ({ id, location, zone, status, apci, tilt, crack, settlement, moisture, vibration, battery, rssi, snr, health, sync }))
  };
}
async function askLiveAssistant(query) {
  if (!window.terrawatchAI?.ask) return { ok: false, error: "The secure AI bridge is unavailable." };
  return window.terrawatchAI.ask(query, assistantContext());
}
function renderAI() {
  const messages= state.chat.length?state.chat:[{role:"ai",text:chatAnswer("what is happening in zone c")}];
  const matrixLabels=["Tilt","Crack","Settle.","Moist.","Vib."]; const combinations=[["—","✓","✓","—","✓"],["✓","—","✓","✓","—"],["✓","✓","—","✓","✓"],["—","✓","✓","—","—"],["✓","—","✓","—","—"]];
  const matrix=`<div class="matrix"><div class="matrix-grid"><div class="blank"></div>${matrixLabels.map(x=>`<div class="head">${x}</div>`).join("")}${matrixLabels.map((name,i)=>`<div class="head">${name}</div>${combinations[i].map(x=>`<div class="${x==='✓'?'yes':'no'}">${x}</div>`).join("")}`).join("")}</div></div>`;
  return `${pageHead("TERRAWATCH AI Assistant", "Explainable analysis based on simulated system data. This assistant supports, but never replaces, trained human decision-making.", `<button class="secondary" data-action="clear-chat">Clear conversation</button><button class="primary" data-action="ask-suggested">Ask system summary</button>`)}<div class="ai-layout">${panel("Analysis conversation", "Available data: nodes, trends, APCI, health, communication and incident status", `<div class="chat-log" id="chatLog">${messages.map(m=>`<div class="message ${m.role}">${m.role==="ai"?m.text:m.text}</div>`).join("")}</div><form class="chat-input" id="chatForm"><input id="chatQuestion" placeholder="Ask: Why did N03 increase? Are there sensor faults?"/><button class="primary">Send</button></form>`, "", "chat-panel")}<div class="right-stack">${panel("Sensor convergence matrix", "Relationships among abnormal measurements in the current observation window", matrix)}${panel("Transparency record", "Supporting information presented with each AI insight", `<div class="health-grid"><div class="health-item"><span class="mini-label">DATA SOURCE</span><b>Simulated</b><small>● Demo mode</small></div><div class="health-item"><span class="mini-label">BASELINE</span><b>Site-specific</b><small>● Required</small></div><div class="health-item"><span class="mini-label">APCI CONTEXT</span><b>58 · Warning</b><small>● Explainable</small></div><div class="health-item"><span class="mini-label">DECISION OWNER</span><b>Human operator</b><small>● Required</small></div></div>`)}${panel("Suggested questions", "", `<div class="alert-list"><button class="alert" data-question="What is happening in Zone C?"><span class="alert-icon">→</span><div><b>What is happening in Zone C?</b><small>Review evidence and action</small></div></button><button class="alert" data-question="Are there any sensor faults?"><span class="alert-icon">→</span><div><b>Are there any sensor faults?</b><small>Separate equipment from risk</small></div></button><button class="alert" data-question="Compare N01 and N03."><span class="alert-icon">→</span><div><b>Compare N01 and N03.</b><small>Find the outlier node</small></div></button></div>`)} </div></div>`;
}
function renderAlerts() {
  const rows = state.alerts.map((a,i)=>`<tr><td><span class="severity-${a.type==='fault'||a.type==='watch'?'watch':a.type==='warning'?'warning':'normal'}">${a.type==='warning'?"▲":a.type==='fault'?"⚠":"●"}</span> ${a.title}</td><td>${a.detail.split(" • ")[0]}</td><td>${a.type==='fault'?"Sensor health":a.type==='offline'?"Communication":a.type==='watch'?"Environmental":"Ground anomaly"}</td><td>${a.time}</td><td>${i===0?statusBadge("WARNING"):a.type==='offline'?statusBadge("OFFLINE"):statusBadge("WATCH")}</td><td><button class="row-action" data-action="ack-alert" data-alert="${i}">${i===0?"ACKNOWLEDGE":"REVIEW"} →</button></td></tr>`).join("");
  return `${pageHead("Alerts & escalation", "Signals are separated by domain so that infrastructure and sensor faults are not mistaken for geological events.", `<button class="secondary" data-action="mark-read">Mark reviewed</button><button class="primary" data-nav="Incidents">Open incident</button>`)}${panel("Active alert queue", `${state.alerts.length} active alerts · simulation mode`, `<div class="table-wrap"><table class="data-table"><thead><tr><th>ALERT</th><th>ASSET</th><th>DOMAIN</th><th>AGE</th><th>SEVERITY</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`)}<div style="height:16px"></div>${panel("Alert policy", "Prototype escalation guidance", `<div class="health-grid"><div class="health-item"><span class="mini-label">GROUND ANOMALY</span><b>Verify before action</b><small>Human review gate</small></div><div class="health-item"><span class="mini-label">SENSOR FAULT</span><b>Maintenance workflow</b><small>Not an incident</small></div><div class="health-item"><span class="mini-label">COMMS ISSUE</span><b>Offline-first logging</b><small>Node remains active</small></div><div class="health-item"><span class="mini-label">LOW BATTERY</span><b>Power maintenance</b><small>Separate priority</small></div></div>`)}`;
}
function renderIncidents() {
  const inc=state.incident;
  return `${pageHead("Incident management", "Potential events require evidence review, inspection and a human-led resolution. This record is a simulated demonstration.", `<button class="secondary" data-action="incident-note">+ Add operator note</button><button class="primary" data-nav="Remote Inspection">Deploy inspection</button>`)}<div class="incident-grid">${panel(`${inc.id} · Potential ground-instability event`, `Created ${inc.created} · ${inc.target}`, `<div class="zone-card"><b>STATE · ${inc.state}</b><h3>Human verification in progress</h3><p>Multiple sensor channels at N03 are changing above local baseline in the same observation period. This is an early-warning risk assessment, not a collapse confirmation.</p><div class="ai-evidence"><span class="evidence">APCI ${n("N03").apci}</span><span class="evidence">CRACK +3.6 mm</span><span class="evidence">TILT CHANGE</span><span class="evidence">AI PATTERN</span></div></div><div class="health-grid"><div class="health-item"><span class="mini-label">INSPECTION</span><b>${state.robot==="DEPLOYED"?"Robot deployed":"Requested"}</b><small>● Remote route R1</small></div><div class="health-item"><span class="mini-label">OPERATOR</span><b>Arjun Kumar</b><small>● Assigned</small></div><div class="health-item"><span class="mini-label">DATA QUALITY</span><b>Good</b><small>● N03 healthy</small></div><div class="health-item"><span class="mini-label">DECISION</span><b>Pending</b><small>● Human only</small></div></div>`, `<button class="small-btn" data-action="incident-state">Advance state</button>`)}${panel("Evidence timeline", "A traceable sequence of observation and response", `<div class="timeline"><div class="timeline-item"><b>Baseline review complete</b><small>13:40 · N03 local calibration profile loaded</small></div><div class="timeline-item"><b>AI trend observation generated</b><small>14:12 · crack displacement persistence noted</small></div><div class="timeline-item high"><b>APCI warning threshold reached</b><small>14:32 · multi-sensor convergence contribution increased</small></div><div class="timeline-item"><b>Operator acknowledged</b><small>14:34 · inspection route requested</small></div></div>`)}${panel("Action record", "", `<div class="table-wrap"><table class="data-table"><thead><tr><th>TIME</th><th>ACTION</th><th>ACTOR</th></tr></thead><tbody><tr><td>14:34</td><td>Event acknowledged</td><td>Arjun Kumar</td></tr><tr><td>14:35</td><td>Remote inspection requested</td><td>Arjun Kumar</td></tr><tr><td>14:36</td><td>Route R1 selected</td><td>System / human confirmed</td></tr></tbody></table></div>`)}${panel("Resolution gate", "", `<div class="empty"><div class="empty-icon">◎</div><h3>Awaiting inspection evidence</h3><p>Only an authorized human operator can mark this investigation resolved after appropriate verification.</p></div>`)}</div>`;
}
function robotPanel({full=false}={}) {
  const deployed = state.robot === "DEPLOYED" || state.robot === "PAUSED";
  const feed = `<div class="robot-feed"><div class="cave"></div><div class="feed-grid"></div>${deployed?`<div class="robot-tip"></div>`:""}<div class="feed-overlay"><span class="rec">● ${deployed?"LIVE SIMULATION":"CAMERA STANDBY"}</span><span class="feed-time">14:4${state.robotLength%10}:2${state.robotLength%8}</span><div class="coordinates">ROUTE: R1 / WEST CHAMBER<br>DEPTH: ${state.robotLength.toFixed(1)} m<br>LINK: ${deployed?"GOOD · -74 dBm":"NOT DEPLOYED"}</div></div></div>`;
  const controls = `<div class="robot-controls"><button class="${state.robot==="DEPLOYED"?"secondary":"primary"}" data-robot="start">▶ Start</button><button class="secondary" data-robot="pause">Ⅱ Pause</button><button class="secondary" data-robot="return">↶ Return</button><button class="ghost" data-robot="stop">■ Stop</button></div>`;
  const telem = `<div class="robot-telemetry"><div class="health-item"><span class="mini-label">DEPLOYMENT</span><b>${state.robotLength.toFixed(1)} m</b><small>● ${state.robot}</small></div><div class="health-item"><span class="mini-label">BATTERY</span><b>84%</b><small>● Nominal</small></div><div class="health-item"><span class="mini-label">TIP TEMP.</span><b>23.4 °C</b><small>● Available</small></div><div class="health-item"><span class="mini-label">ENVIRONMENT</span><b>Monitored</b><small>● Demo data</small></div></div>`;
  return panel("PROTOTYPE REMOTE INSPECTION INTERFACE", "Soft-growing vine robot · remote inspection, not autonomous rescue", feed+controls+telem);
}
function renderRemoteInspection() {
  return `${pageHead("Remote inspection", "A simulated soft-growing robot interface for observing hard-to-reach areas after trained-personnel review.", `<button class="secondary" data-nav="Incidents">View incident</button><button class="primary" data-robot="start">▶ Start deployment</button>`)}<div class="robot-layout">${robotPanel()}${panel("Mission plan", "Inspection request linked to INC-2409", `<div class="route-map"><div class="route-path"></div><span class="route-start">ENTRY A</span><span class="route-target">TARGET: WEST CHAMBER</span></div><div class="timeline"><div class="timeline-item"><b>Human verification request</b><small>Authorized by safety operator</small></div><div class="timeline-item"><b>Route R1 selected</b><small>Simulated confined access route</small></div><div class="timeline-item ${state.robot==="DEPLOYED"?"high":""}"><b>${state.robot==="DEPLOYED"?"Live inspection underway":"Awaiting deployment"}</b><small>Camera and telemetry remain operator-supervised</small></div></div>`, `<button class="small-btn" data-action="route">Change route</button>`)}${panel("Inspection safety boundary", "", `<div class="explain-box">The robot is a proposed inspection concept. Its imagery and telemetry inform human decisions; it does not certify conditions or replace established rescue procedures.</div>`)}</div></div>`;
}
function renderHistory() { return `${pageHead("History & audit trail", "Sensor data, analysis outputs and operator actions are represented as simulated, tamper-evident prototype records.", `<button class="secondary" data-action="export-report">⇩ Export log</button>`)}${panel("Recent activity", "Latest 12 events", `<div class="table-wrap"><table class="data-table"><thead><tr><th>TIMESTAMP</th><th>EVENT</th><th>ASSET</th><th>TYPE</th><th>ACTOR</th></tr></thead><tbody><tr><td>14:36:11</td><td>Inspection route R1 selected</td><td>INC-2409</td><td>Operator action</td><td>Arjun Kumar</td></tr><tr><td>14:34:20</td><td>Potential event acknowledged</td><td>N03</td><td>Incident</td><td>Arjun Kumar</td></tr><tr><td>14:32:18</td><td>APCI threshold entered WARNING</td><td>N03</td><td>Risk assessment</td><td>Edge + backend demo</td></tr><tr><td>14:28:42</td><td>Crack meter flatline classified</td><td>N05</td><td>Sensor health</td><td>AI prototype</td></tr><tr><td>14:12:03</td><td>Communication gap observed</td><td>N06</td><td>Communication</td><td>Gateway</td></tr></tbody></table></div>`)}`; }
function renderHealthPage(kind) {
  const communication = kind === "Communication", power = kind === "Power";
  const title=communication?"LoRa communication monitoring":power?"Power monitoring":"System health";
  const desc=communication?"Weak communication is distinct from geological risk. Nodes are designed to continue local monitoring, logging and alerts.":power?"Power condition is monitored separately so a low battery cannot be mistaken for a ground-instability signal.":"Fleet-level edge, gateway, storage, sensor and data-quality indicators.";
  const cards = communication ? [["GATEWAY UPLINK","Healthy","99.9% availability","#21d69b",99],["NODE PACKET DELIVERY","94.2%","Last 24 h simulated","#21d69b",94],["WEAK LINKS","N04","RSSI -102 dBm","#ffca63",44],["COMMUNICATION GAP","N06","Last packet 24 min ago","#ff5265",7]] : power ? [["FLEET BATTERY","81.1%","Solar charging nominal","#21d69b",81],["LOWEST NODE","N05 · 48%","Check next maintenance window","#ffca63",48],["SOLAR STATUS","6 / 7","Daytime charge detected","#21d69b",86],["LOCAL ALERT RESERVE","Healthy","Edge alerts continue offline","#21d69b",92]] : [["EDGE NODES","6 / 7","N06 communication gap","#21d69b",86],["SENSOR CHANNELS","34 / 35","N05 crack meter fault","#ffca63",94],["SD LOGGING","6 / 7","Local buffering enabled","#21d69b",86],["DATA FRESHNESS","Good","Last sync 00:04 ago","#21d69b",96]];
  return `${pageHead(title,desc,`<button class="secondary" data-action="sync">↻ Refresh metrics</button><button class="primary" data-action="export-report">⇩ Export ${communication?"link":"health"} report</button>`)}<div class="system-grid">${cards.map(([label,value,detail,color,width])=>panel(label,"",`<div class="system-gauge"><div class="gauge-value" style="color:${color}">${value}</div><div class="progress ${color==="#ffca63"?"warning":""}"><i style="width:${width}%;background:${color}"></i></div><p>${detail}</p></div>`)).join("")}</div><div style="height:16px"></div>${panel(communication?"Node link register":power?"Node power register":"Node health register", "Live demo snapshot", `<div class="table-wrap"><table class="data-table"><thead><tr><th>NODE</th><th>STATUS</th><th>${communication?"RSSI / SNR":power?"BATTERY / SOLAR":"SENSOR HEALTH"}</th><th>LOCAL RESILIENCE</th><th>LAST RECEIVED</th></tr></thead><tbody>${state.nodes.map(x=>`<tr><td><b>${x.id}</b> · ${x.location}</td><td>${statusBadge(x.status)}</td><td>${communication?(x.rssi?`${x.rssi} dBm / ${x.snr} dB`:"No link"):power?`${x.battery}% / ${x.id==="N06"?"Unknown":"Charging"}`:x.health}</td><td>${x.status==="OFFLINE"?"Expected local logging":"Edge active"}</td><td>${x.sync}</td></tr>`).join("")}</tbody></table></div>`)}`;
}
function renderMaintenance() { return `${pageHead("Maintenance", "Calibration, power and communications maintenance are planned separately from risk assessment.", `<button class="secondary" data-action="maintenance">+ Schedule task</button><button class="primary" data-action="export-report">⇩ Export schedule</button>`)}${panel("Maintenance register", "Site-specific calibration and hardware checks", `<div class="table-wrap"><table class="data-table"><thead><tr><th>NODE / SENSOR</th><th>CONDITION</th><th>LAST CALIBRATION</th><th>NEXT ACTION</th><th>PRIORITY</th><th></th></tr></thead><tbody><tr><td>N05 · Crack meter</td><td>Flatline pattern</td><td>2026-08-10</td><td>Verify mounting & ADC</td><td>${statusBadge("WATCH")}</td><td><button class="row-action" data-action="maintenance">SCHEDULE →</button></td></tr><tr><td>N04 · Solar / battery</td><td>48% battery reserve</td><td>2026-08-19</td><td>Inspect panel / cable</td><td>${statusBadge("WATCH")}</td><td><button class="row-action" data-action="maintenance">SCHEDULE →</button></td></tr><tr><td>N01 · Tilt / MPU6050</td><td>Healthy</td><td>2026-09-01</td><td>Routine calibration</td><td>${statusBadge("NORMAL")}</td><td><button class="row-action" data-action="maintenance">VIEW →</button></td></tr><tr><td>N06 · LoRa link</td><td>Communication gap</td><td>2026-08-29</td><td>Check path and power</td><td>${statusBadge("WATCH")}</td><td><button class="row-action" data-action="maintenance">SCHEDULE →</button></td></tr></tbody></table></div>`)}<div style="height:16px"></div>${panel("Maintenance notes", "", `<div class="empty"><div class="empty-icon">⚒</div><h3>Maintenance notes are ready to capture</h3><p>Use scheduled tasks to attach observations, calibration outcomes and evidence to each hardware asset.</p><button class="secondary" data-action="maintenance">Add maintenance note</button></div>`)}`; }
function renderTwin() { return `${pageHead("Digital mine twin", "Simplified spatial representation of tunnels, zones, assets, risk context and proposed inspection paths.", `<button class="secondary" data-action="layer">Toggle historical risk</button><button class="primary" data-nav="Map">Open map controls</button>`)}<div class="twin-layout">${panel("Spatial operations model", "Illustrative mine geometry — not a surveyed plan", mineMap({twin:true}), "", "map-panel")}<div class="right-stack">${panel(`${state.selectedZone} context`, "Selected spatial zone", `<div class="zone-card"><b>ZONE RISK · ${statusBadge(n(state.selectedNode).status)}</b><h3>West Chamber</h3><p>N03 indicates a multi-sensor abnormal pattern in the demo data. Proposed route R1 provides a remote inspection view after human verification.</p><div class="ai-evidence"><span class="evidence">NODE N03</span><span class="evidence">APCI ${n("N03").apci}</span><span class="evidence">R1 TARGET</span></div></div>`)}${panel("Twin layers", "", `<div class="metrics"><div class="metric-row"><span>Risk surface</span><div class="metric-bar"><i style="width:77%"></i></div><span>ON</span></div><div class="metric-row"><span>Sensor assets</span><div class="metric-bar"><i style="width:100%"></i></div><span>7</span></div><div class="metric-row"><span>Gateway mesh</span><div class="metric-bar"><i style="width:78%"></i></div><span>1</span></div><div class="metric-row warning"><span>Robot R1</span><div class="metric-bar"><i style="width:55%"></i></div><span>PLAN</span></div></div>`)}${panel("Model boundary", "", `<div class="explain-box">This digital twin is a prototype representation for visualizing simulated data. Engineering survey data, operational rules and validated sensor calibration are required for deployment.</div>`)}</div></div>`; }
function renderReports() { return `${pageHead("Reports", "Generate a prototype export summarizing readings, APCI context, alerts and human-verification status.", `<button class="secondary" data-action="export-csv">⇩ CSV data</button><button class="primary" data-action="export-report">Generate report</button>`)}<div class="card-grid">${[["Daily monitoring report","Fleet condition, trends, alerts and APCI snapshot","Daily"],["Incident report","INC-2409 evidence, actions and inspection status","Incident"],["Sensor health report","Calibration state, quality signals and maintenance tasks","Sensor health"],["Communication report","Link history, packet trends and offline-first status","Communication"],["Zone report","Risk visualization and selected-zone observations","Zone"],["AI analysis report","Explainable observations and supporting data","AI transparency"]].map(([t,d,type])=>`<article class="panel reference-card"><span class="ref-type">${type.toUpperCase()}</span><h3>${t}</h3><p>${d}</p><button class="secondary" data-action="export-report">Generate →</button></article>`).join("")}</div>`; }
function renderHowItWorks() { const steps=[["SENSE","Distributed tilt, crack, settlement, moisture and vibration nodes capture site behaviour."],["FILTER","The ESP32 validates readings and limits short-lived noise."],["LEARN BASELINE","Each sensor is compared to its site-specific normal profile."],["ANALYSE","Rates, persistence and relationships across sensors are assessed."],["APCI + AI","Interpretable score plus adaptive trend, health and correlation context."],["ASSESS RISK","A prototype early-warning assessment — not a collapse guarantee."],["ALERT","Local LED/buzzer and dashboard alerts continue during communications loss."],["VERIFY","Trained personnel interpret and verify signals under mine safety procedures."],["INSPECT","A proposed soft-growing robot supports remote visual inspection."],["RESPOND","Human-approved actions are recorded in the operational incident workflow."]]; return `${pageHead("How TERRAWATCH works", "From distributed sensing to human-verified inspection — the system is designed as an assistive research prototype.")}<div class="flow">${steps.map(([t,d])=>`<div class="flow-step"><b>${t}</b><p>${d}</p></div>`).join("")}</div><div style="height:15px"></div>${panel("Offline-first safety concept", "Nodes continue local protection during network loss", `<div class="health-grid"><div class="health-item"><span class="mini-label">NODE</span><b>Continues measuring</b><small>● Sensor readout</small></div><div class="health-item"><span class="mini-label">EDGE</span><b>Continues assessment</b><small>● Local APCI</small></div><div class="health-item"><span class="mini-label">SD CARD</span><b>Continues logging</b><small>● Store & sync later</small></div><div class="health-item"><span class="mini-label">ALERT</span><b>Continues indication</b><small>● LED / buzzer</small></div></div>`)}`; }
function renderResearch() { const refs=[["ESP32 platform","ESTABLISHED RESEARCH","Microcontroller documentation and edge processing ecosystem.","https://docs.espressif.com/"],["LoRa / SX1278","ESTABLISHED RESEARCH","Long-range low-power radio technology; underground performance depends on geometry and environment.","https://www.semtech.com/products/wireless-rf/lora-connect/sx1278"],["Mine IoT monitoring","ESTABLISHED RESEARCH","Distributed sensing and wireless monitoring research informs system architecture.","https://www.cdc.gov/niosh/mining/"],["Soft-growing vine robots","ESTABLISHED RESEARCH","Everting robots are an active research area for navigating constrained environments.","https://www.robotics.princeton.edu/"],["APCI framework","TERRAWATCH PROPOSAL","Adaptive Precursor Convergence Index is a proposed interpretable framework requiring field validation.","#"],["TERRAWATCH integration","PROPOSED INTEGRATION","Combines edge monitoring, APCI, AI-assisted analysis and remote inspection in one prototype.","#"]]; return `${pageHead("Research & references", "Established sources are distinguished from TERRAWATCH’s proposed integration and analysis framework.")}<div class="research-grid">${refs.map(([t,type,d,link])=>`<article class="panel reference-card"><span class="ref-type">${type}</span><h3>${t}</h3><p>${d}</p><a href="${link}" target="_blank" rel="noreferrer">View reference ↗</a></article>`).join("")}</div>`; }
function renderLimitations() { const limits=[["Calibration and baseline","Sensor calibration and site-specific baseline learning are required; no universal threshold is implied."],["AI evidence","AI requires representative data and produces assistive observations, not guarantees or validated predictive accuracy."],["Communications","LoRa performance depends on mine geometry, antenna placement, materials and environmental conditions."],["Hardware resilience","Sensors, power systems and links can fail. A fault is not automatically a geological event."],["Robot engineering","A soft-growing robot would require detailed engineering, field testing, operational procedures and safety validation."],["Deployment governance","Mine deployment requires suitable certification, regulatory compliance, safety procedures and trained human oversight."]]; return `${pageHead("Limitations & safety boundary", "Scientific honesty is built into this prototype: the system supports risk assessment and verification, not autonomous critical decisions.")}<div class="limits-grid">${limits.map(([t,d])=>`<article class="panel limit"><h3>${t}</h3><p>${d}</p></article>`).join("")}</div><div style="height:16px"></div>${panel("Human-in-the-loop safety", "", `<div class="flow">${[["SENSORS","observe"],["AI / APCI","assist"],["ALERT","inform"],["HUMAN REVIEW","verify"],["FIELD ACTION","authorize"]].map(([a,b])=>`<div class="flow-step"><b>${a}</b><p>${b}</p></div>`).join("")}</div>`)}`; }
function renderSettings() { return `${pageHead("Settings", "Prototype configuration controls. Production deployment would require governed configuration management and validation.", `<button class="secondary" data-action="restore">Restore demo defaults</button><button class="primary" data-action="save-settings">Save changes</button>`)}<div class="settings-layout">${panel("Simulation control", "Demo data is intentionally labeled and does not represent field conditions", `<div class="setting-row"><div><b>Simulation mode</b><small>Enable gradual scenario-based telemetry updates</small></div><button class="toggle ${state.simulation?"on":""}" data-toggle="simulation"></button></div><div class="setting-row"><div><b>Demo scenario</b><small>Applied to N03 when the sequence runs</small></div><select class="select" id="scenarioSelect">${["Normal","Rising crack","Increasing tilt","Increasing settlement","Moisture increase","Abnormal vibration","Multi-sensor convergence","Sensor failure","Node offline","LoRa communication failure","Battery low","Potential ground-instability event"].map(x=>`<option ${x===state.scenario?"selected":""}>${x}</option>`).join("")}</select></div><div class="setting-row"><div><b>Refresh interval</b><small>Presentation prototype target refresh</small></div><select class="select"><option>10 seconds</option><option>30 seconds</option><option>60 seconds</option></select></div>`)}${panel("Risk & alert configuration", "APCI bands and routing are administrator-controlled", `<div class="setting-row"><div><b>APCI band thresholds</b><small>Currently 0–${state.thresholds[0]}, ${state.thresholds[0]+1}–${state.thresholds[1]}, ${state.thresholds[1]+1}–${state.thresholds[2]}, ${state.thresholds[2]+1}–100</small></div><button class="secondary" data-nav="APCI">Configure</button></div><div class="setting-row"><div><b>Local buzzer / RGB alert</b><small>Conceptual node-level immediate indication</small></div><button class="toggle on"></button></div><div class="setting-row"><div><b>Stale data warning</b><small>Surface receipt gaps to operator</small></div><button class="toggle on"></button></div>`)}${panel("Access & audit", "Demonstration security — not production hardened", `<div class="setting-row"><div><b>Current role</b><small>Operators can acknowledge and inspect; administrators configure system rules.</small></div><select class="select"><option>Operator</option><option>Admin</option><option>Viewer</option></select></div><div class="setting-row"><div><b>Audit log</b><small>Record simulated operator actions and state changes</small></div><button class="toggle on"></button></div>`)}${panel("Display", "", `<div class="setting-row"><div><b>Theme</b><small>Command center display preference</small></div><button class="secondary" data-action="theme">Toggle theme</button></div><div class="setting-row"><div><b>Map risk heatmap</b><small>Prototype spatial risk layer</small></div><button class="toggle on"></button></div>`)} </div>`; }
function render() {
  const pages={"Dashboard":renderDashboard,"Map":renderMap,"Nodes":()=>renderNodes(),"Sensors":()=>renderNodes("sensors"),"Analytics":renderAnalytics,"APCI":renderAPCI,"AI Assistant":renderAI,"Alerts":renderAlerts,"Incidents":renderIncidents,"Remote Inspection":renderRemoteInspection,"Robot":renderRemoteInspection,"History":renderHistory,"System Health":()=>renderHealthPage("Health"),"Communication":()=>renderHealthPage("Communication"),"Power":()=>renderHealthPage("Power"),"Maintenance":renderMaintenance,"Digital Twin":renderTwin,"Reports":renderReports,"Settings":renderSettings};
  $("#content").innerHTML=(pages[state.page]||renderDashboard)();
  bindRenderedActions();
  initLeafletMaps();
}
function bindRenderedActions() {
  $$('#content [data-nav]').forEach(el=>el.addEventListener('click',()=>setPage(el.dataset.nav)));
  $$('[data-node]').forEach(el=>el.addEventListener('click',()=>{state.selectedNode=el.dataset.node;state.selectedZone=n(state.selectedNode).zone; if(state.page==="Nodes"||state.page==="Sensors") openNodeModal(n(state.selectedNode)); else render();}));
  $$('[data-question]').forEach(el=>el.addEventListener('click',()=>sendChat(el.dataset.question)));
  $$('[data-action]').forEach(el=>el.addEventListener('click',()=>handleAction(el.dataset.action,el)));
  $$('[data-robot]').forEach(el=>el.addEventListener('click',()=>robotAction(el.dataset.robot)));
  $$(".threshold-input").forEach(el=>el.addEventListener("change",()=>state.thresholds[+el.dataset.index]=Math.max(0,Math.min(99,+el.value||0))));
  $("#miniChat")?.addEventListener("submit",e=>{e.preventDefault(); const q=$("input",e.currentTarget).value.trim(); if(q){setPage("AI Assistant");sendChat(q);}});
  $("#chatForm")?.addEventListener("submit",e=>{e.preventDefault();const q=$("#chatQuestion").value.trim();if(q)sendChat(q);});
  $("#analyticNode")?.addEventListener("change",e=>{state.filters.node=e.target.value; toast("Analytics context changed",`Now viewing ${e.target.value} simulated observation data.`);});
  $("#scenarioSelect")?.addEventListener("change",e=>{state.scenario=e.target.value; toast("Scenario selected",`${state.scenario} will be used when the demo runs.`);});
  $$("[data-toggle]").forEach(el=>el.addEventListener("click",()=>{state.simulation=!state.simulation;el.classList.toggle("on",state.simulation);toast("Simulation mode",state.simulation?"Live demo telemetry is enabled.":"Telemetry is paused.");}));
  $$(".toggle:not([data-toggle])").forEach(el=>el.addEventListener("click",()=>{el.classList.toggle("on");toast("Prototype setting updated",el.classList.contains("on")?"This display setting is enabled for the current session.":"This display setting is disabled for the current session.");}));
}
async function sendChat(q){
  state.chat.push({role:"user",text:q},{role:"ai",text:"<span class=\"assistant-loading\">Querying live TERRAWATCH AI...</span>"});
  render();
  const result=await askLiveAssistant(q);
  const answer=result.ok?`<strong>LIVE AI · GEMINI</strong><br>${escapeHTML(result.answer).replace(/\n/g,"<br>")}`:`<strong>AI CONNECTION NOTICE</strong><br>${escapeHTML(result.error)}<br><br>${chatAnswer(q)}`;
  const lastMessage=state.chat[state.chat.length-1];
  if(lastMessage?.role==="ai") lastMessage.text=answer;
  render();
  setTimeout(()=>{const log=$("#chatLog"); if(log)log.scrollTop=log.scrollHeight;},0);
}
function handleAction(action, el) {
  if(action==="sync"){completeSync();}
  if(action==="export-nodes"||action==="export-csv") downloadCSV();
  if(action==="export-report") exportReport();
  if(action==="open-config") setPage("Settings");
  if(action==="save-thresholds"){toast("APCI bands saved",`Normal ≤ ${state.thresholds[0]}, Watch ≤ ${state.thresholds[1]}, Warning ≤ ${state.thresholds[2]}.`);render();}
  if(action==="clear-chat"){state.chat=[];toast("Conversation cleared","The assistant remains available for system questions.");render();}
  if(action==="ask-suggested")sendChat("Give me a system summary.");
  if(action==="ack-alert"){toast("Alert acknowledged","The operator action has been added to the prototype audit record.");el.textContent="ACKNOWLEDGED";}
  if(action==="mark-read")toast("Alerts marked reviewed","Unresolved alerts remain visible in the queue.");
  if(action==="incident-note")openModal("Add operator note","A note entry form would associate a verified observation with INC-2409. This prototype records the action without altering geotechnical assessment.","Add demonstration note");
  if(action==="incident-state"){state.incident.state=state.incident.state==="INVESTIGATING"?"RESOLVED":"INVESTIGATING";toast("Incident state updated",`INC-2409 is now ${state.incident.state}. Human approval remains required.`);render();}
  if(action==="route")toast("Route selector opened","Route R1 remains the recommended simulated access path.");
  if(action==="layer")toast("Map layer updated","This is a visualization layer only; sensor interpretation is unchanged.");
  if(action==="maintenance")openModal("Maintenance task","A planned maintenance task will be linked to the selected asset in the prototype register.","Schedule task");
  if(action==="restore"){Object.assign(state,{nodes:structuredClone(initialNodes),scenario:"Multi-sensor convergence",demoStage:0});state.alerts=baseAlerts();toast("Demo defaults restored","Telemetry and alert states have been reset.");render();}
  if(action==="save-settings")toast("Settings saved","Prototype preferences have been applied to this session.");
  if(action==="theme"){toggleTheme();}
}
function robotAction(action){
  if(action==="start"){state.robot="DEPLOYED"; if(!state.robotLength)state.robotLength=2.4; toast("Inspection deployment started","R1 camera and simulated telemetry are now active.");}
  if(action==="pause"){state.robot="PAUSED";toast("Robot paused","Operator retains control of the proposed inspection interface.");}
  if(action==="return"){state.robot="RETURNING";toast("Return initiated","The simulated robot is retracing route R1.");}
  if(action==="stop"){state.robot="EMERGENCY STOP";toast("Emergency stop activated","The simulation has been stopped; human verification remains required.","high");}
  render();
}
function openNodeModal(node){ const observations=node.status==="OFFLINE"?"No current values are available because of a communication gap. Assess local logging and power when access is safe.":`${node.id} currently has APCI ${node.apci} (${node.status}). Tilt ${val(node.tilt,"°")}, crack ${val(node.crack," mm")}, settlement ${val(node.settlement," mm")}, moisture ${val(node.moisture,"%")}.`;openModal(`${node.id} · ${node.location}`,observations,"Open map briefing"); }
function openModal(title, text, action="Close") { $("#modal").classList.add("open"); $("#modal").innerHTML=`<div class="modal-box"><h2>${title}</h2><p>${text}</p><div class="modal-actions"><button class="ghost" data-close>Cancel</button><button class="primary" data-close>${action}</button></div></div>`;$$('[data-close]',$("#modal")).forEach(x=>x.addEventListener('click',()=>$("#modal").classList.remove("open"))); }
function toast(title, text, type="") { const el=document.createElement("div");el.className=`toast ${type}`;el.innerHTML=`<b>${title}</b>${text}`;$("#toasts").append(el);setTimeout(()=>el.remove(),4200); }
function randomStep(value, amount, minimum=0) { return Math.max(minimum, value + (Math.random() * 2 - 1) * amount); }
function refreshSensorValues() {
  state.nodes.forEach(node => {
    if (node.status === "OFFLINE") return;
    node.tilt = Number(randomStep(node.tilt ?? 0.2, 0.04).toFixed(2));
    node.crack = Number(randomStep(node.crack ?? 1, 0.18).toFixed(1));
    node.settlement = Number(randomStep(node.settlement ?? 2, 0.3).toFixed(1));
    node.moisture = Math.round(randomStep(node.moisture ?? 20, 2));
    node.vibration = Number(randomStep(node.vibration ?? 0.1, 0.025).toFixed(2));
    node.battery = Math.max(1, Math.round(randomStep(node.battery ?? 80, 1)));
    node.apci = Math.min(100, Math.max(0, Math.round(node.tilt * 18 + node.crack * 5 + node.settlement * 2 + node.moisture * 0.35 + node.vibration * 20)));
    node.status = riskFrom(node.apci);
    node.sync = "just now";
  });
  state.lastSyncAt = Date.now();
}
function completeSync() {
  if (state.simulation) refreshSensorValues();
  state.syncSeconds = 10;
  if (state.page !== "AI Assistant") render();
}
function updateSyncDisplay() {
  const elapsed = 10 - state.syncSeconds;
  const syncText = state.syncSeconds === 0 ? "SYNCING..." : `SYNCED · NEXT ${String(state.syncSeconds).padStart(2, "0")}s`;
  const syncEl = $("#syncText");
  if (syncEl) syncEl.textContent = syncText;
  const syncKpi = $("#syncKpi");
  if (syncKpi) {
    $(".value", syncKpi).textContent = formatClock(elapsed);
    $(".delta", syncKpi).textContent = `next refresh in ${formatClock(state.syncSeconds)}`;
  }
}
function downloadCSV(){const h=["node_id","timestamp","latitude","longitude","tilt","crack","settlement","moisture","vibration","battery","rssi","snr","sensor_health","apci","risk_level"];const body=state.nodes.map((x,i)=>[x.id,"2026-09-14T14:36:00Z",`28.5${i}`,`77.1${i}`,x.tilt,x.crack,x.settlement,x.moisture,x.vibration,x.battery,x.rssi,x.snr,`\"${x.health}\"`,x.apci,x.status].join(","));download("terrawatch-demo-readings.csv",[h.join(","),...body].join("\n"),"text/csv");toast("CSV exported","Simulated node packet data has been downloaded.");}
function exportReport(){
  if(state.simulation){refreshSensorValues();state.syncSeconds=10;}
  const generatedAt=new Date();
  const reportId=`TW-${generatedAt.getTime().toString(36).toUpperCase()}`;
  const priority=n("N03");
  const win=window.open("","_blank");
  if(!win){toast("Report blocked","Allow pop-ups to generate a printable report.","high");return;}
  const rows=state.nodes.map(x=>`<tr><td>${x.id}</td><td>${x.location}</td><td>${x.zone}</td><td>${x.apci ?? "—"}</td><td>${x.status}</td><td>${x.tilt ?? "—"}</td><td>${x.crack ?? "—"}</td><td>${x.settlement ?? "—"}</td><td>${x.moisture ?? "—"}</td><td>${x.battery}%</td><td>${x.sync}</td></tr>`).join("");
  win.document.write(`<!doctype html><title>${reportId} · TERRAWATCH report</title><style>body{font:14px Arial;color:#152523;max-width:1100px;margin:45px auto}h1{margin:0 0 5px}.tag{color:#087e58;font-size:11px;font-weight:bold;letter-spacing:.08em}.meta{color:#526662;font-size:12px;margin:0 0 24px}.warning{color:#be5521}table{border-collapse:collapse;width:100%;margin-top:18px;font-size:12px}th,td{border-bottom:1px solid #ccd8d5;text-align:left;padding:8px;white-space:nowrap}th{background:#edf5f2;color:#28564d}small{color:#526662}.snapshot{padding:14px;background:#f3f8f6;border-left:4px solid #ff8b47;margin:18px 0}</style><p class="tag">TERRAWATCH · AI-ASSISTED PROTOTYPE ANALYSIS · LIVE SNAPSHOT</p><h1>Monitoring summary</h1><p class="meta">Report ${reportId} · Generated ${generatedAt.toLocaleString()} · ${state.nodes.length} nodes · Sync ${formatClock(10-state.syncSeconds)} ago</p><div class="snapshot"><b class="warning">Current priority: ${priority.id} / ${priority.location} — APCI ${priority.apci}, ${priority.status}</b><br><small>Generated from the current in-memory telemetry snapshot. This research prototype requires field validation and human verification.</small></div><h2>Current node readings</h2><table><tr><th>Node</th><th>Location</th><th>Zone</th><th>APCI</th><th>Risk</th><th>Tilt</th><th>Crack mm</th><th>Settlement mm</th><th>Moisture %</th><th>Battery</th><th>Last sync</th></tr>${rows}</table><h2>Recommended verification</h2><p>Review the highest-priority node with trained personnel. Verify sensor health independently, investigate communication gaps, and follow relevant mine safety procedures. This report does not certify site safety or confirm a collapse event.</p>`);
  win.document.close();
  win.focus();
  win.print();
  toast("Report generated",`${reportId} contains a fresh telemetry snapshot.`);
}
function download(name, content, type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);}
function toggleTheme(){
  state.dark=!state.dark;
  document.body.classList.toggle("light",!state.dark);
  const themeButton=$("#themeBtn");
  const nextTheme=state.dark?"light":"night";
  if(themeButton){themeButton.title=`Switch to ${nextTheme} mode`;themeButton.setAttribute("aria-label",`Switch to ${nextTheme} mode`);themeButton.textContent=state.dark?"☼":"◐";}
  toast("Display theme",state.dark?"Night mode selected.":"Light mode selected.");
}
function runDemo(){
  if(state.running){state.running=false;$("#scenarioBtn").textContent="▶ Run demo sequence";toast("Demo sequence paused","Current simulated readings have been retained.");return;}
  state.running=true;state.demoStage=0;$("#scenarioBtn").textContent="Ⅱ Pause sequence";toast("Demo sequence running","N03 will progress gradually from normal through warning and potential event state.");
  state.nodes=structuredClone(initialNodes);const node=n("N03");node.status="NORMAL";node.apci=14;node.crack=1.4;node.tilt=.22;node.settlement=2.3;node.moisture=20;node.vibration=.1;
  setPage("Dashboard");
}
function tickDemo(){
  if(state.syncSeconds <= 0) completeSync();
  else state.syncSeconds--;
  updateSyncDisplay();
  if(state.running && state.simulation){
    const node=n("N03"); state.demoStage++;
    const scenario=state.scenario;
    const scale=scenario==="Normal"?0:scenario==="Potential ground-instability event"?2.3:scenario==="Multi-sensor convergence"?1.55:1;
    if(state.demoStage<=4){node.crack+=.22*scale;node.apci=Math.min(40,Math.round(node.apci+4*scale));node.status=riskFrom(node.apci);if(state.demoStage===2)toast("Trend observation","N03 crack displacement is gradually rising above baseline.");}
    else if(state.demoStage<=8){node.tilt+=.055*scale;node.settlement+=.42*scale;node.moisture+=1.1*scale;node.apci=Math.min(69,Math.round(node.apci+4.5*scale));node.status=riskFrom(node.apci);if(state.demoStage===5)toast("Multi-sensor pattern","N03 tilt and settlement now show a related abnormal trend.","high");}
    else {node.vibration+=.04*scale;node.apci=Math.min(92,Math.round(node.apci+5.5*scale));node.status=riskFrom(node.apci);if(node.status==="HIGH"&&!state.alerts.some(x=>x.title.includes("HIGH PRIORITY"))){state.alerts.unshift({type:"warning",title:"HIGH PRIORITY — verification required",detail:"N03 • APCI high in simulated convergence scenario",time:"now"});toast("Potential event escalated","N03 has entered HIGH in the demonstration. This is not a collapse confirmation.","high");}if(state.demoStage>=13){state.running=false;$("#scenarioBtn").textContent="▶ Run demo sequence";toast("Demo sequence complete","Open Remote Inspection to continue the human-led workflow.");}}
    if([2,5,9,13].includes(state.demoStage) && state.page !== "AI Assistant") render();
  }
  if((state.robot==="DEPLOYED"||state.robot==="RETURNING") && state.simulation){state.robotLength=state.robot==="DEPLOYED"?Math.min(14,state.robotLength+.18):Math.max(0,state.robotLength-.25);if(state.robotLength===0&&state.robot==="RETURNING"){state.robot="STANDBY";toast("Robot returned","Route R1 simulation is complete.");}if(state.page==="Remote Inspection"||state.page==="Robot")render();}
}

$("#nav").innerHTML=navTemplate();
$("#nav").addEventListener("click",e=>{const btn=e.target.closest("[data-nav]");if(btn)setPage(btn.dataset.nav);});
$("#menuBtn").addEventListener("click",()=>$(".sidebar").classList.toggle("open"));
$("#themeBtn").addEventListener("click",toggleTheme);
$("#scenarioBtn").addEventListener("click",runDemo);
$("#bannerClose").addEventListener("click",()=>$(".safety-banner").remove());
$("#loginForm").addEventListener("submit",handleLogin);
$("#passwordToggle").addEventListener("click",()=>{
  const password=$("#password");
  const visible=password.type==="text";
  password.type=visible?"password":"text";
  $("#passwordToggle").textContent=visible?"SHOW":"HIDE";
  $("#passwordToggle").setAttribute("aria-label",visible?"Show password":"Hide password");
});
$$('[data-demo-user]').forEach(button=>button.addEventListener("click",()=>{
  $("#username").value=button.dataset.demoUser;
  $("#password").value=button.dataset.demoPassword;
  $("#loginError").textContent="";
  $("#password").focus();
}));
$("#logoutBtn").addEventListener("click",signOut);
setInterval(tickDemo,1000);
$("#username").focus();
