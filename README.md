# VISION-PHM: Decision-First Turbofan Prognostics & Health Management Engine

Production-grade implementation of the **VISION-PHM Architecture Blueprint**, structured with cleanly separated **Backend** and **Frontend** services:

```
ai manthan/
├── backend/                  # FastAPI REST API, C-MAPSS Engines, & Mathematical Layer
│   ├── artifacts/            # Serialized trained models & conformal tables
│   ├── cmapss/               # NASA C-MAPSS turbofan dataset splits
│   ├── tests/                # Automated verification test suite (pytest)
│   ├── config.py             # Feature specifications & constants
│   ├── conditioning.py       # Zero-leakage normalizer & 57-dim causal features
│   ├── physics.py            # Physics-aware health index & gas-path deltas
│   ├── conformal.py          # Mondrian split-conformal calibration engine
│   ├── decision.py           # Clopper-Pearson risk control & policy evaluator
│   ├── trust.py              # Ledoit-Wolf Mahalanobis OOD & stuck sensor safety gates
│   ├── pipeline.py           # Training pipeline & GroupKFold calibration
│   ├── server.py             # FastAPI REST & SSE streaming server
│   └── run_server.py         # Standalone Uvicorn launcher
│
├── frontend/                 # Aerospace Operator Flight Deck Dashboard
│   ├── index.html            # Flight deck UI layout
│   ├── style.css             # High-craft dark design system & tokens
│   ├── app.js                # SSE stream consumer & dynamic canvas charts
│   ├── package.json          # Optional Vite dev server configuration
│   └── README.md             # Frontend documentation
│
└── README.md                 # Project root documentation
```

---

## Quickstart

### 1. Launch Backend (and automatically serve Frontend)
```bash
cd backend
python run_server.py
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser:
- 🌐 **Operator Dashboard:** `http://localhost:8000/` (or `http://localhost:8000/app`)
- 📖 **Interactive Swagger UI:** `http://localhost:8000/docs`
- 📡 **Live SSE Replay Stream:** `http://localhost:8000/api/v1/stream/replay/FD001`

### 2. Run Verification Test Suite
```bash
cd backend
python -m pytest tests/test_verification.py -v
```

### 3. Optional: Run Frontend with Vite Dev Server
```bash
cd frontend
npm install
npm run dev
```

---

## 1. System Architecture & Layered Responsibilities

| Layer | Component Name | Functionality & Algorithmic Scope | Core Dependencies |
| :--- | :--- | :--- | :--- |
| **Layer 0** | **Ingestion & Contracts** | Pydantic v2 telemetry validation, channel masking for missing vibration/oil channels, telemetry streaming generator. | `FastAPI`, `Pydantic` |
| **Layer 1** | **Conditioning & Leakage Gate** | Train-only KMeans regime clustering ($k=6$ for FD002/FD004), per-regime z-score normalization, causal trailing windows ($5/10/30$). | `scikit-learn`, `NumPy`, `pandas` |
| **Layer 2** | **Physics-Aware Health Index** | Monotonic degradation projection, thermodynamic gas-path deltas ($T_{30}/T_{24}$, $Ps_{30}/P_{30}$), per-sensor attribution. | `NumPy`, `SciPy` |
| **Layer 3** | **Prognostic Inference Core** | HistGradientBoosting / LightGBM regressor with asymmetric penalty loss training; RUL capped at 125 cycles. | `scikit-learn`, `LightGBM` |
| **Layer 4** | **Mondrian Conformal Calibration** | Regime $\times$ predicted-RUL partition buckets; finite-sample 90% and 95% conformal bounds; coverage guarantees. | `SciPy`, Conformal |
| **Layer 5** | **Maintenance Orchestration** | Clopper-Pearson risk-controlled trigger ($P(\text{fail}) \le 5\%$), 3-cycle persistence filter, 15-cycle logistics lead buffer, fleet allocation. | `SciPy` (Beta) |
| **Cross-Cutting**| **Trust & Safety Envelope** | Ledoit-Wolf Mahalanobis OOD detection (99th train percentile), stuck/spike sensor safety gates, automated abstention. | `scikit-learn` (`LedoitWolf`) |

---

## 2. Empirical Validation Results (C-MAPSS Benchmarks)

Per-regime sensor normalization eliminates **2.38 cycles** of RMSE on FD002 and **3.32 cycles** on FD004 (exceeding the $\ge 2.0$ cycles requirement in Section 11):

| Dataset Subset | Operating Regimes | Fault Modes | Global Normalization RMSE | Per-Regime Normalization RMSE | Paired $\Delta$ RMSE (Gain) | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FD001** | 1 (Sea Level) | HPC Degradation | 14.03 | 14.03 | Baseline | **PASSED** |
| **FD002** | 6 Regimes | HPC Degradation | 16.22 | 13.83 | **-2.38** (Gain $\ge 2.0$) | **PASSED** |
| **FD003** | 1 (Sea Level) | HPC + Fan Degradation | 13.52 | 13.52 | Baseline | **PASSED** |
| **FD004** | 6 Regimes | HPC + Fan Degradation | 18.64 | 15.32 | **-3.32** (Gain $\ge 2.0$) | **PASSED** |

---

## 3. Production REST & SSE API Endpoints

The service runs on FastAPI (`http://localhost:8000`).

### `GET /api/v1/health`
Health readiness check.
- **Response**: `{"status": "ready", "version": "1.0.0"}`

### `GET /api/v1/subsets`
List available trained fleet subsets.
- **Response**: `{"available": ["FD001", "FD002", "FD003", "FD004"]}`

### `POST /api/v1/predict/point`
Infers point RUL, 90% & 95% Mondrian lower bounds, thermodynamic gas-path metrics, and sensor attributions.
- **Request Body**:
  ```json
  {
    "unit": 1,
    "cycle": 15,
    "operational_settings": [0.0, 0.0, 100.0],
    "sensor_readings": {
      "s2": [642.1, ...],
      "s3": [1580.2, ...],
      ...
    },
    "subset": "FD001"
  }
  ```
- **Response Body**:
  ```json
  {
    "unit": 1,
    "cycle": 15,
    "point_rul": 125.0,
    "lower_bound_90": 116.87,
    "lower_bound_95": 106.0,
    "health_index": 1.0,
    "status": "NORMAL",
    "abstain": false,
    "reasons": [],
    "thermodynamics": {
      "T30_T24_ratio": 2.47,
      "Ps30_P30_ratio": 0.23,
      "T30_T24_delta": 942.31,
      "Ps30_P30_delta": -1833.85
    },
    "attributions": {
      "s2": 3.2,
      "s3": 8.25,
      ...
    }
  }
  ```

### `POST /api/v1/evaluate/scenario`
Evaluates fleet maintenance schedules under Clopper-Pearson exact binomial risk control.
- **Request Body**:
  ```json
  {
    "subset": "FD004",
    "threshold": 20.0,
    "lead": 15,
    "persist": 3
  }
  ```
- **Response**:
  ```json
  {
    "subset": "FD004",
    "threshold": 20.0,
    "lead": 15,
    "persist": 3,
    "total_units": 249,
    "failed_units": 8,
    "failure_rate": 0.0321,
    "mean_waste": 16.12,
    "clopper_pearson_upper_90": 0.0517
  }
  ```

### `GET /api/v1/stream/replay/{subset}?speed_ms=500&loop=false&unit=1`
Server-Sent Events (SSE) live replay stream yielding `telemetry` events at specified tick speeds.

### `POST /api/v1/trust/validate`
Evaluates stuck sensor detection, corruptions, and Ledoit-Wolf Mahalanobis OOD distance.

---

## 4. Verification Test Suite Matrix

To run the verification test suite:

```bash
python -m pytest tests/test_verification.py -v -s
```

### Test Suite Results:
1. `test_causality_no_leakage()`: **PASSED** (Perturbing cycle $t+k$ produces zero delta on cycle $t$ features and inference).
2. `test_regime_normalization_gain()`: **PASSED** (RMSE drops by 2.38 cycles on FD002 and 3.32 cycles on FD004 when clustering is active).
3. `test_clopper_pearson_coverage()`: **PASSED** (Exact Clopper-Pearson beta inversion bounds failure rates to $\le 0.05$).
4. `test_sse_replay_stream_integrity()`: **PASSED** (Strict cycle monotonicity, ordering, and schema compliance across replayed test streams).
5. `test_trust_envelope_abstention()`: **PASSED** (Stuck sensors and OOD vectors trigger immediate automated abstention and ERROR status).

---

## 5. Quickstart & Server Launch

To launch the FastAPI server:

```bash
python run_server.py
```

Swagger UI documentation will be available at: `http://localhost:8000/docs`.

