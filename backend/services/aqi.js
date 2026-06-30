// AQI Evaluation Engine based on PM2.5
// EPA Breakpoints for PM2.5 (ug/m3)
const breakpoints = [
  { cLow: 0.0, cHigh: 12.0, iLow: 0, iHigh: 50, category: "GOOD" },
  { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100, category: "MODERATE" },
  {
    cLow: 35.5,
    cHigh: 55.4,
    iLow: 101,
    iHigh: 150,
    category: "UNHEALTHY_FOR_SENSITIVE",
  },
  { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200, category: "UNHEALTHY" },
  {
    cLow: 150.5,
    cHigh: 250.4,
    iLow: 201,
    iHigh: 300,
    category: "VERY_UNHEALTHY",
  },
  { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500, category: "HAZARDOUS" },
];

function calculateAQI(pm25) {
  if (pm25 == null || isNaN(pm25)) return { aqi: 0, status: "GOOD" };
  // Round to 1 decimal to match EPA breakpoint table precision (closes 12.0–12.1 gap)
  const c = Math.round(pm25 * 10) / 10;
  let bp = breakpoints.find((b) => c >= b.cLow && c <= b.cHigh);

  if (!bp) {
    if (c > 500.4) return { aqi: 500, status: "HAZARDOUS" };
    if (c < 0) return { aqi: 0, status: "GOOD" };
    return { aqi: 0, status: "GOOD" };
  }

  const aqi =
    ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (c - bp.cLow) + bp.iLow;

  return {
    aqi: Math.round(aqi),
    status: bp.category,
  };
}

/**
 * Predicts the trend based on historical PM2.5 readings.
 * @param {Array} history - Array of recent SensorReading objects (sorted by timestamp descending)
 */
function predictTrend(history) {
  if (!history || history.length < 3)
    return { trend: "STABLE", change: 0, prediction: null };

  // Calculate rate of change over the last 5 readings
  const recent = history.slice(0, 5);
  const values = recent
    .map((r) => r.pm25)
    .filter((v) => v != null && !isNaN(v));
  if (values.length < 2)
    return { trend: "STABLE", change: 0, prediction: null };

  // Simple delta
  const first = values[values.length - 1];
  const last = values[0];
  const delta = last - first;
  const rate = delta / (values.length - 1);

  let trend = "STABLE";
  if (rate > 0.5) trend = "RISING";
  else if (rate < -0.5) trend = "FALLING";

  // Predicted value in 30 minutes (assuming 1 reading per 5 seconds)
  // 30 mins = 1800 seconds = 360 readings
  const prediction = calculateAQI(Math.max(0, last + rate * 10)); // Just predict next few cycles for stability

  return {
    trend,
    rate: rate.toFixed(2),
    predictedAqi: prediction.aqi,
    predictedStatus: prediction.status,
  };
}

module.exports = { calculateAQI, predictTrend };
