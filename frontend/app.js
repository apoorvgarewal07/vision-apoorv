/**
 * VISION-PHM: Frontend Dashboard Controller
 * Connects to FastAPI backend REST & SSE endpoints.
 */

// Configuration & State
const API_BASE = window.location.origin.includes(":8000") 
  ? window.location.origin 
  : "http://localhost:8000";

let eventSource = null;
let isStreaming = false;
let currentSubset = "FD002";
let currentUnit = 1;
let currentSpeed = 500;

// Trajectory history for live canvas chart
const historyData = {
  cycles: [],
  pointRUL: [],
  lowerBound90: []
};

// DOM Elements
const subsetSelect = document.getElementById("subset-select");
const unitSelect = document.getElementById("unit-select");
const speedSelect = document.getElementById("speed-select");
const streamToggleBtn = document.getElementById("stream-toggle-btn");
const streamBtnText = document.getElementById("stream-btn-text");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");

// KPI Elements
const cycleBadge = document.getElementById("cycle-badge");
const pointRulEl = document.getElementById("point-rul");
const lb90El = document.getElementById("lb90");
const lb95El = document.getElementById("lb95");
const bandWidthEl = document.getElementById("band-width");
const healthIndexEl = document.getElementById("health-index");
const healthBarEl = document.getElementById("health-bar");
const statusBadgeEl = document.getElementById("status-badge");
const statusRecEl = document.getElementById("status-recommendation");
const alertBanner = document.getElementById("alert-banner");
const alertMessage = document.getElementById("alert-message");

// Gas-path & Attribution Elements
const thermoTRatio = document.getElementById("thermo-t-ratio");
const thermoPRatio = document.getElementById("thermo-p-ratio");
const thermoTDelta = document.getElementById("thermo-t-delta");
const thermoPDelta = document.getElementById("thermo-p-delta");
const attributionList = document.getElementById("attribution-list");
const telemetryFeed = document.getElementById("telemetry-feed");

// Policy Lab Elements
const thresholdSlider = document.getElementById("threshold-slider");
const thresholdVal = document.getElementById("threshold-val");
const leadSlider = document.getElementById("lead-slider");
const leadVal = document.getElementById("lead-val");
const persistSlider = document.getElementById("persist-slider");
const persistVal = document.getElementById("persist-val");
const evalPolicyBtn = document.getElementById("eval-policy-btn");
const resFailRate = document.getElementById("res-fail-rate");
const resCpUb = document.getElementById("res-cp-ub");
const resWaste = document.getElementById("res-waste");
const resUnits = document.getElementById("res-units");
const resFailedUnits = document.getElementById("res-failed-units");

// Canvas chart
const canvas = document.getElementById("trajectory-chart");
const ctx = canvas.getContext("2d");

// Resize canvas to match display size
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  drawChart();
}
window.addEventListener("resize", resizeCanvas);

// Render Trajectory Chart
function drawChart() {
  const width = canvas.getBoundingClientRect().width;
  const height = canvas.getBoundingClientRect().height;
  ctx.clearRect(0, 0, width, height);

  const padLeft = 45;
  const padBottom = 30;
  const padTop = 20;
  const padRight = 20;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Background grid lines
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1;
  const yTicks = [0, 30, 60, 90, 125];
  ctx.fillStyle = "#64748b";
  ctx.font = "10px ui-monospace, monospace";
  ctx.textAlign = "right";

  yTicks.forEach(val => {
    const y = padTop + chartH - (val / 125) * chartH;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();
    ctx.fillText(val.toString(), padLeft - 8, y + 3);
  });

  // Critical trigger threshold line at 15
  const critY = padTop + chartH - (15 / 125) * chartH;
  ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(padLeft, critY);
  ctx.lineTo(width - padRight, critY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#ef4444";
  ctx.fillText("Trigger (15)", width - padRight, critY - 6);

  if (historyData.cycles.length < 2) return;

  const maxCycles = Math.max(50, historyData.cycles[historyData.cycles.length - 1]);
  const minCycle = historyData.cycles[0];
  const cycleSpan = Math.max(1, maxCycles - minCycle);

  // Helper coordinate mapper
  const getX = (c) => padLeft + ((c - minCycle) / cycleSpan) * chartW;
  const getY = (val) => padTop + chartH - (Math.min(125, Math.max(0, val)) / 125) * chartH;

  // 1. Shaded Conformal Uncertainty Band (between Point RUL and 90% LB)
  ctx.fillStyle = "rgba(14, 165, 233, 0.12)";
  ctx.beginPath();
  ctx.moveTo(getX(historyData.cycles[0]), getY(historyData.pointRUL[0]));
  for (let i = 1; i < historyData.cycles.length; i++) {
    ctx.lineTo(getX(historyData.cycles[i]), getY(historyData.pointRUL[i]));
  }
  for (let i = historyData.cycles.length - 1; i >= 0; i--) {
    ctx.lineTo(getX(historyData.cycles[i]), getY(historyData.lowerBound90[i]));
  }
  ctx.closePath();
  ctx.fill();

  // 2. 90% Conformal Lower Bound Line
  ctx.strokeStyle = "#10b981";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(getX(historyData.cycles[0]), getY(historyData.lowerBound90[0]));
  for (let i = 1; i < historyData.cycles.length; i++) {
    ctx.lineTo(getX(historyData.cycles[i]), getY(historyData.lowerBound90[i]));
  }
  ctx.stroke();

  // 3. Point RUL Line
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(getX(historyData.cycles[0]), getY(historyData.pointRUL[0]));
  for (let i = 1; i < historyData.cycles.length; i++) {
    ctx.lineTo(getX(historyData.cycles[i]), getY(historyData.pointRUL[i]));
  }
  ctx.stroke();

  // Latest cycle marker
  const lastIdx = historyData.cycles.length - 1;
  const latestX = getX(historyData.cycles[lastIdx]);
  const latestY = getY(historyData.pointRUL[lastIdx]);
  ctx.fillStyle = "#38bdf8";
  ctx.beginPath();
  ctx.arc(latestX, latestY, 4, 0, Math.PI * 2);
  ctx.fill();
}

// Update UI with incoming telemetry cycle tick
function handleCycleTick(data) {
  // Update state
  historyData.cycles.push(data.cycle);
  historyData.pointRUL.push(data.point_rul);
  historyData.lowerBound90.push(data.lower_bound_90);

  // Keep sliding window of 80 cycles max
  if (historyData.cycles.length > 80) {
    historyData.cycles.shift();
    historyData.pointRUL.shift();
    historyData.lowerBound90.shift();
  }

  // Update KPIs
  cycleBadge.innerText = `Cycle ${data.cycle}`;
  pointRulEl.innerText = data.point_rul.toFixed(1);
  lb90El.innerText = data.lower_bound_90.toFixed(1);
  lb95El.innerText = data.lower_bound_95.toFixed(1);
  
  const width = Math.max(0, data.point_rul - data.lower_bound_90);
  bandWidthEl.innerText = `${width.toFixed(1)} c`;

  const hiPct = Math.round(data.health_index * 100);
  healthIndexEl.innerText = hiPct;
  healthBarEl.style.width = `${hiPct}%`;
  healthBarEl.style.background = hiPct > 50 ? "var(--normal)" : (hiPct > 25 ? "var(--warning)" : "var(--critical)");

  // Status Badge
  statusBadgeEl.innerText = data.status;
  statusBadgeEl.className = "kpi-badge " + 
    (data.status === "NORMAL" ? "badge-normal" : 
    (data.status === "WARNING" ? "badge-warning" : "badge-critical"));

  if (data.status === "NORMAL") {
    statusRecEl.innerText = "Airworthy • Normal flight degradation";
  } else if (data.status === "WARNING") {
    statusRecEl.innerText = "Schedule maintenance within 15 flight cycles";
  } else if (data.status === "CRITICAL") {
    statusRecEl.innerText = "Critical airworthiness risk • Immediate removal required";
  } else {
    statusRecEl.innerText = "Abstained • Sensor fault or OOD operating state";
  }

  // Alert Banner for Abstentions / Safety Envelope flags
  if (data.abstain) {
    alertBanner.classList.remove("hidden");
    alertMessage.innerText = `Safety Envelope Warning: Abstaining due to sensor anomaly or excessive uncertainty (width > 60c).`;
  } else {
    alertBanner.classList.add("hidden");
  }

  // Thermodynamics
  if (data.thermodynamics) {
    thermoTRatio.innerText = data.thermodynamics.T30_T24_ratio ? data.thermodynamics.T30_T24_ratio.toFixed(3) : "--";
    thermoPRatio.innerText = data.thermodynamics.Ps30_P30_ratio ? data.thermodynamics.Ps30_P30_ratio.toFixed(3) : "--";
    thermoTDelta.innerText = data.thermodynamics.T30_T24_delta ? `${data.thermodynamics.T30_T24_delta.toFixed(1)}` : "--";
    thermoPDelta.innerText = data.thermodynamics.Ps30_P30_delta ? `${data.thermodynamics.Ps30_P30_delta.toFixed(1)}` : "--";
  }

  // Sensor Attributions
  if (data.attributions) {
    const sortedAttributions = Object.entries(data.attributions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // top 5 contributors

    attributionList.innerHTML = sortedAttributions.map(([sensor, pct]) => `
      <div class="attribution-item">
        <div class="attribution-header">
          <span class="attribution-name">Sensor ${sensor.toUpperCase()}</span>
          <span class="attribution-pct">${pct.toFixed(1)}%</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${Math.min(100, pct * 2.5)}%;"></div>
        </div>
      </div>
    `).join("");
  }

  // Append to raw telemetry feed
  const tickMsg = `[t=${data.cycle.toString().padStart(3, ' ')}] Point: ${data.point_rul.toFixed(1)} | 90% LB: ${data.lower_bound_90.toFixed(1)} | HI: ${hiPct}% | Status: ${data.status}`;
  telemetryFeed.innerHTML = tickMsg + "<br/>" + telemetryFeed.innerHTML;

  // Redraw trajectory chart
  drawChart();
}

// Start SSE Stream
function startStreaming() {
  stopStreaming();
  
  currentSubset = subsetSelect.value;
  currentUnit = unitSelect.value;
  currentSpeed = speedSelect.value;

  historyData.cycles = [];
  historyData.pointRUL = [];
  historyData.lowerBound90 = [];

  const url = `${API_BASE}/api/v1/stream/replay/${currentSubset}?speed_ms=${currentSpeed}&unit=${currentUnit}&loop=true`;
  eventSource = new EventSource(url);

  statusDot.classList.add("active");
  statusText.innerText = "Receiving Telemetry";
  streamBtnText.innerText = "Pause Telemetry";
  streamToggleBtn.classList.remove("btn-primary");
  streamToggleBtn.classList.add("btn-secondary");
  isStreaming = true;

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleCycleTick(data);
    } catch (err) {
      console.error("Failed to parse cycle tick:", err);
    }
  };

  eventSource.onerror = (err) => {
    console.warn("SSE connection interrupted:", err);
    statusText.innerText = "Reconnecting...";
  };
}

// Stop SSE Stream
function stopStreaming() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  statusDot.classList.remove("active");
  statusText.innerText = "Standby";
  streamBtnText.innerText = "Start Telemetry";
  streamToggleBtn.classList.remove("btn-secondary");
  streamToggleBtn.classList.add("btn-primary");
  isStreaming = false;
}

// Stream Toggle Button Listener
streamToggleBtn.addEventListener("click", () => {
  if (isStreaming) {
    stopStreaming();
  } else {
    startStreaming();
  }
});

// Subset & Unit Change Listener
subsetSelect.addEventListener("change", () => {
  if (isStreaming) startStreaming();
});
unitSelect.addEventListener("change", () => {
  if (isStreaming) startStreaming();
});
speedSelect.addEventListener("change", () => {
  if (isStreaming) startStreaming();
});

// Policy Lab Interactive Sliders
thresholdSlider.addEventListener("input", (e) => {
  thresholdVal.innerText = `${parseFloat(e.target.value).toFixed(1)} cycles`;
});
leadSlider.addEventListener("input", (e) => {
  leadVal.innerText = `${e.target.value} cycles`;
});
persistSlider.addEventListener("input", (e) => {
  persistVal.innerText = `${e.target.value} cycles`;
});

// Run Policy Lab Simulation
async function evaluatePolicy() {
  evalPolicyBtn.disabled = true;
  evalPolicyBtn.innerText = "Evaluating Fleet...";

  try {
    const payload = {
      subset: subsetSelect.value,
      threshold: parseFloat(thresholdSlider.value),
      lead: parseInt(leadSlider.value, 10),
      persist: parseInt(persistSlider.value, 10)
    };

    const res = await fetch(`${API_BASE}/api/v1/evaluate/scenario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    resFailRate.innerText = `${(data.failure_rate * 100).toFixed(2)}%`;
    resFailRate.style.color = data.failure_rate <= 0.05 ? "var(--normal)" : "var(--critical)";

    resCpUb.innerText = `${(data.clopper_pearson_upper_90 * 100).toFixed(2)}%`;
    resCpUb.style.color = data.clopper_pearson_upper_90 <= 0.05 ? "var(--accent)" : "var(--warning)";

    resWaste.innerText = `${data.mean_waste.toFixed(1)} c`;
    resUnits.innerText = `${data.total_units} units`;
    resFailedUnits.innerText = `${data.failed_units} fleet failures`;
  } catch (err) {
    console.error("Policy evaluation failed:", err);
    alert("Policy evaluation failed. Ensure backend server is running.");
  } finally {
    evalPolicyBtn.disabled = false;
    evalPolicyBtn.innerText = "Run Policy Simulation";
  }
}
evalPolicyBtn.addEventListener("click", evaluatePolicy);

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  resizeCanvas();
  // Run initial baseline scenario evaluation
  evaluatePolicy();
});

