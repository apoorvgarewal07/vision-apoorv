# VISION-PHM: Flight Deck & Fleet Prognostics Frontend

Aerospace-grade operator dashboard for the **VISION-PHM Engine**, visualizing zero-leakage turbofan prognostics, Mondrian conformal safety bounds, thermodynamic gas-path metrics, and Clopper-Pearson fleet maintenance simulations.

---

## Architecture & Features

- **Live Stream Receiver (SSE):** Connects to `GET /api/v1/stream/replay/{subset}` with speed controls (0.5x, 1x, 2x, 5x, 20x).
- **Prognostic Safety Deck:**
  - Real-time Point RUL with 57-dim causal feature inference.
  - Mondrian 90% and 95% Conformal Lower Bounds ($LB_{90}, LB_{95}$).
  - Monotonic physical Health Index progress dial ($0\% - 100\%$).
  - Airworthiness operational status (`NORMAL`, `WARNING`, `CRITICAL`, `ERROR`).
- **Dynamic Degradation Trajectory Chart:** Real-time canvas rendering plotting predicted Point RUL, the 90% conformal lower band, and the 15-cycle critical maintenance trigger line.
- **Gas-Path Thermodynamics:** Live tracking of $T_{30}/T_{24}$ and $Ps_{30}/P_{30}$ ratios and deltas.
- **Sensor Attribution Breakdown:** Real-time percentage attribution bar chart for critical channels.
- **Policy Lab & Scenario Simulator:** Interactive slider interface testing thresholds against exact Clopper-Pearson binomial upper bounds ($\le 5\%$) calling `POST /api/v1/evaluate/scenario`.

---

## Running the Frontend

### Option A: Served Directly by the Backend (Zero Setup)
When the FastAPI backend is running on `http://localhost:8000`, the frontend is served at:
- **`http://localhost:8000/app`** (or `http://localhost:8000/`)

### Option B: Standalone with Vite
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### Option C: Simple Static Server
```bash
cd frontend
python -m http.server 3000
```
Open `http://localhost:3000` in your browser.

