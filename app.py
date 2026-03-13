from flask import Flask, render_template, jsonify
import pandas as pd
import numpy as np
from collections import defaultdict

app = Flask(__name__)

# Load & process dataset

df = pd.read_csv("dataset.csv")
df["timestamp"] = pd.to_datetime(df["timestamp"])


def get_aqi_level(aqi):
    if aqi <= 50:   return "Good",           "#16a34a"
    if aqi <= 100:  return "Moderate",       "#d97706"
    if aqi <= 150:  return "Sensitive",      "#ea580c"
    if aqi <= 200:  return "Unhealthy",      "#dc2626"
    if aqi <= 300:  return "Very Unhealthy", "#9333ea"
    return                  "Hazardous",     "#7c3aed"


def ml_predict_source(row):
    """Rule-based ML simulation: classify pollution source from pollutant ratios."""
    pm_ratio = row["pm25"] / max(row["pm10"], 1)
    no2_co   = row["no2"]  / max(row["co"],   1)

    if row["so2"] > 40:
        return "industrial",      0.94
    if pm_ratio > 0.65 and row["pm25"] > 130:
        return "biomass_burning", 0.91
    if no2_co > 25:
        return "vehicular",       0.88
    if row["pm10"] > 200 and pm_ratio < 0.55:
        return "construction",    0.87
    return "mixed", 0.78


def get_health_advisory(aqi):
    if aqi <= 100:
        return "Low",        "✅", "Air quality acceptable. Outdoor activities are safe."
    if aqi <= 150:
        return "Moderate",   "⚠️", "Sensitive groups should limit prolonged outdoor exertion."
    if aqi <= 200:
        return "High",       "🚨", "Everyone may be affected. Wear N95 mask outdoors."
    if aqi <= 300:
        return "Very High",  "🔴", "Avoid outdoor activity. Keep windows closed."
    return "Hazardous", "☠️",  "Emergency health risk. Stay indoors. Seek medical help if needed."


POLICIES = {
    "construction":    [
        "Mandate water-spraying on all active sites twice daily",
        "Enforce mandatory dust barriers & tarpaulin covers",
        "Restrict dry demolition during 8AM–6PM",
        "Deploy mobile AQI monitors near construction zones",
    ],
    "biomass_burning": [
        "Launch community awareness drives in affected wards",
        "Distribute free LPG connections to 500 households",
        "Deploy rapid-response enforcement teams",
        "Issue burning ban in extreme pollution zones",
    ],
    "vehicular":       [
        "Implement odd-even vehicle rotation on main roads",
        "Set up no-idling zones near schools & hospitals",
        "Fast-track EV charging station deployment",
        "Increase public transit frequency by 40%",
    ],
    "industrial":      [
        "Issue compliance notices to flagged industrial units",
        "Deploy stack emission monitoring at source",
        "Suspend night-shift operations pending audit",
        "Coordinate with DM office for emergency inspection",
    ],
    "mixed":           [
        "Activate ward-level pollution task force",
        "Coordinate multi-agency rapid response",
        "Issue combined public health advisory",
        "Request satellite imagery analysis from ISRO",
    ],
}


# Routes

@app.route("/")
def index():
    return render_template("dashboard.html")


@app.route("/api/wards")
def api_wards():
    """Return latest reading per ward with ML predictions."""
    latest = df.sort_values("timestamp").groupby("ward_id").last().reset_index()
    wards  = []

    for _, row in latest.iterrows():
        source, confidence = ml_predict_source(row)
        label, color       = get_aqi_level(row["aqi"])
        risk, icon, advice = get_health_advisory(row["aqi"])

        wards.append({
            "ward_id":    int(row["ward_id"]),
            "ward_name":  row["ward_name"],
            "aqi":        int(row["aqi"]),
            "aqi_label":  label,
            "aqi_color":  color,
            "pm25":       float(row["pm25"]),
            "pm10":       float(row["pm10"]),
            "no2":        float(row["no2"]),
            "co":         float(row["co"]),
            "so2":        float(row["so2"]),
            "o3":         float(row["o3"]),
            "source":     source,
            "confidence": round(confidence * 100, 1),
            "trend":      row["trend"],
            "population": int(row["population"]),
            "lat":        float(row["lat"]),
            "lng":        float(row["lng"]),
            "health_risk":   risk,
            "health_icon":   icon,
            "health_advice": advice,
            "policies":   POLICIES[source],
        })

    wards.sort(key=lambda x: x["aqi"], reverse=True)
    return jsonify(wards)


@app.route("/api/summary")
def api_summary():
    """City-wide summary stats."""
    latest = df.sort_values("timestamp").groupby("ward_id").last().reset_index()
    avg_aqi      = round(latest["aqi"].mean())
    critical     = int((latest["aqi"] > 300).sum())
    improving    = int((latest["trend"] == "falling").sum())
    at_risk_pop  = int(latest[latest["aqi"] > 200]["population"].sum())

    return jsonify({
        "avg_aqi":     avg_aqi,
        "critical":    critical,
        "improving":   improving,
        "at_risk_pop": at_risk_pop,
        "total_wards": len(latest),
    })


@app.route("/api/trend/<int:ward_id>")
def api_trend(ward_id):
    """24h AQI trend for a specific ward."""
    ward_df = df[df["ward_id"] == ward_id].sort_values("timestamp")
    return jsonify({
        "labels": ward_df["timestamp"].dt.strftime("%H:%M").tolist(),
        "values": ward_df["aqi"].tolist(),
    })


@app.route("/api/sources")
def api_sources():
    """ML source distribution across all wards."""
    latest = df.sort_values("timestamp").groupby("ward_id").last().reset_index()
    counts = latest["source"].value_counts().to_dict()
    return jsonify(counts)


if __name__ == "__main__":
    app.run(debug=True)


