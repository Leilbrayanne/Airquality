const express = require("express");
const Alert = require("../models/Alert");
const { verifyToken, requireRole } = require("../middleware/auth");
const { recordAudit } = require("../services/audit");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.get(
  "/",
  verifyToken,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;
    const total = await Alert.countDocuments();
    const alerts = await Alert.find()
      .populate("room")
      .sort({ triggeredAt: -1 })
      .skip(skip)
      .limit(limit);
    res.json({ data: alerts, page, limit, total });
  }),
);

router.patch(
  "/:id/acknowledge",
  verifyToken,
  asyncHandler(async (req, res) => {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ error: "Alert not found" });

    if (alert.status !== "ACKNOWLEDGED") {
      alert.status = "ACKNOWLEDGED";
      alert.acknowledgedBy = req.userId;
      alert.acknowledgedAt = new Date();
      await alert.save();
      await recordAudit(req.userId, "ACKNOWLEDGE_ALERT", {
        alertId: alert._id,
      });
    }

    res.json(alert);
  }),
);

router.delete(
  "/:id",
  verifyToken,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    const deleted = await Alert.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Alert not found" });
    res.json({ message: "Alert deleted successfully" });
  }),
);

module.exports = router;
