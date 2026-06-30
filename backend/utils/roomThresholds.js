const ThresholdProfile = require('../models/ThresholdProfile');

async function applyCustomThresholds(customProfile, customThresholds) {
  const cT = customThresholds;
  if (cT.pm10Warning !== undefined) customProfile.pm10.warning = cT.pm10Warning;
  if (cT.pm10Critical !== undefined) customProfile.pm10.critical = cT.pm10Critical;
  if (cT.pm25Warning !== undefined) customProfile.pm25.warning = cT.pm25Warning;
  if (cT.pm25Critical !== undefined) customProfile.pm25.critical = cT.pm25Critical;
  if (cT.tvocWarning !== undefined) customProfile.tvoc.warning = cT.tvocWarning;
  if (cT.tvocCritical !== undefined) customProfile.tvoc.critical = cT.tvocCritical;
  if (cT.tempWarningLow !== undefined) customProfile.temperature.warningLow = cT.tempWarningLow;
  if (cT.tempWarningHigh !== undefined) customProfile.temperature.warningHigh = cT.tempWarningHigh;
  if (cT.tempCriticalHigh !== undefined) customProfile.temperature.criticalHigh = cT.tempCriticalHigh;
  if (cT.humidityWarningLow !== undefined) customProfile.humidity.warningLow = cT.humidityWarningLow;
  if (cT.humidityWarningHigh !== undefined) customProfile.humidity.warningHigh = cT.humidityWarningHigh;
  await customProfile.save();
  return customProfile._id;
}

async function resolveThresholdProfile({ roomId, thresholdProfile, customThresholds }) {
  if (customThresholds) {
    const profileName = `Custom Room ${roomId}`;
    let customProfile = await ThresholdProfile.findOne({ name: profileName });
    if (!customProfile) {
      customProfile = new ThresholdProfile({ name: profileName });
    }
    return applyCustomThresholds(customProfile, customThresholds);
  }

  if (thresholdProfile) return thresholdProfile;

  let defaultProfile = await ThresholdProfile.findOne({ name: 'Default' });
  if (!defaultProfile) {
    defaultProfile = new ThresholdProfile({ name: 'Default' });
    await defaultProfile.save();
  }
  return defaultProfile._id;
}

module.exports = { resolveThresholdProfile };
