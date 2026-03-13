## What it does

- 📍 Tracks AQI across **8 Delhi wards** in real-time
- 🔍 Detects pollution source — vehicular, industrial, biomass, construction
- 🏛️ Auto-generates **4 policy recommendations** per ward
- 🧑‍⚕️ Provides **6-tier health advisory** for citizens
- 📈 Interactive charts — 24h trend, source distribution, monthly history

---

## Tech Stack

| Layer | Tools |
|---|---|
| Backend | Python, Flask, Pandas, NumPy |
| Frontend | HTML, CSS Grid, JavaScript, Chart.js |
| Dataset | OpenAQ Delhi PM2.5 — 10,000 readings (2016–2017) |

---

## Quick Start

```bash
https://github.com/Divyanshu18-code/Hyper-Local_AQI.git
cd aqi-dashboard
pip install -r requirements.txt
python aap.py
# open http://localhost:5000
```

---

## Project Structure

```
pollution-dashboard/
├── app.py                 # Flask backend + source detection logic
├── delhi_pm25_aqi.csv     # Real OpenAQ sensor dataset
├── templates/
│   └── dashboard.html     # Jinja2 template
└── static/
    ├── style.css          # Responsive layout
    └── chart.js           # Charts + API calls
```

---

## API Routes

| Endpoint | Description |
|---|---|
| `GET /api/wards` | Live AQI for all 8 wards |
| `GET /api/summary` | City-wide stats |
| `GET /api/trend/<ward_id>` | 24h AQI trend |
| `GET /api/sources` | Source distribution |
| `GET /api/monthly` | Monthly PM2.5 averages |

---

## Dataset

Real PM2.5 readings from [OpenAQ](https://openaq.org) — Delhi sensor, Feb 2016 to Apr 2017.  
PM2.5 range: **6.0 – 997.5 µg/m³** · AQI computed using **India NAQI formula**.

---

Built for **India Innovates 2026** · Team VAYU
