const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_SECRET, verifyToken, requireRole } = require("../middleware/auth");
const { recordAudit } = require("../services/audit");
const { validate } = require("../middleware/validation");
const { authLimiter } = require("../middleware/rateLimit");

// Get current user info
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password_hash");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch user", message: error.message });
  }
});

// Update current user info
router.put("/me", verifyToken, async (req, res) => {
  try {
    const { username, email } = req.body;

    // Check if new username is already taken by someone else
    if (username) {
      const existing = await User.findOne({
        username,
        _id: { $ne: req.userId },
      });
      if (existing)
        return res.status(400).json({ error: "Username already taken" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { $set: { username, email } },
      { new: true, runValidators: true },
    ).select("-password_hash");

    if (!updatedUser) return res.status(404).json({ error: "User not found" });

    // Issue a new token since username/email changed
    const token = jwt.sign(
      {
        id: updatedUser._id,
        role: updatedUser.role,
        username: updatedUser.username,
        email: updatedUser.email || "",
        jti: require("crypto").randomUUID(),
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({ user: updatedUser, token });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to update profile", message: error.message });
  }
});

// Update password
router.put("/me/password", verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch)
      return res.status(401).json({ error: "Incorrect current password" });

    user.password_hash = newPassword;
    await user.save(); // pre-save hook handles hashing

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to update password", message: error.message });
  }
});

// Logout
router.post("/logout", verifyToken, async (req, res) => {
  try {
    await recordAudit(req.userId, "LOGOUT", { ip: req.ip });
    // Revoke JWT token
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      const decoded = require("jsonwebtoken").decode(token);
      if (decoded && decoded.jti) {
        const { revokeToken } = require("../middleware/jwtSession");
        // Set TTL based on token exp (seconds from now)
        const ttl = decoded.exp
          ? Math.max(decoded.exp - Math.floor(Date.now() / 1000), 0)
          : 24 * 60 * 60;
        await revokeToken(decoded.jti, ttl);
      }
    }
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ error: "Logout failed", message: error.message });
  }
});

// Forgot password – send reset token
router.post(
  "/forgot-password",
  validate("forgotPassword"),
  async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email: email.toLowerCase() });
      // Always respond with generic message
      if (!user) {
        return res.json({
          message: "If the email exists, a reset link has been sent.",
        });
      }
      const crypto = require("crypto");
      const token = crypto.randomBytes(32).toString("hex");
      user.resetPasswordToken = token;
      user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1h
      await user.save();
      // In production send email. Here we just log the URL.
      console.log(
        `Password reset URL: http://localhost:5173/forgot-password?token=${token}`,
      );
      const response = {
        message: "If the email exists, a reset link has been sent.",
      };
      if (process.env.NODE_ENV !== "production") {
        response.resetToken = token;
      }
      res.json(response);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error processing request", error: err.message });
    }
  },
);

// Reset password using token
router.post("/reset-password", validate("resetPassword"), async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }
    user.password_hash = password; // pre‑save hook will hash
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ message: "Password has been reset successfully." });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error resetting password", error: err.message });
  }
});

// Duplicate routes removed

// Register a new user (Only ADMIN can register new staff)
router.post(
  "/register",
  verifyToken,
  requireRole(["ADMIN"]),
  validate("userCreate"),
  async (req, res) => {
    try {
      const { username, password, role, email } = req.body;

      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = new User({
        username,
        password_hash: password, // Pre-save hook hashes it
        role,
        email,
      });

      await user.save();

      await recordAudit(req.userId, "REGISTER_USER", { username, role, email });

      res
        .status(201)
        .json({ message: "User registered successfully", userId: user._id });
    } catch (error) {
      res.status(500).json({ message: "Error registering user" });
    }
  },
);

// Initial Setup (Unprotected - allows creating the first ADMIN if none exist)
router.post("/setup", validate("setup"), async (req, res) => {
  try {
    const count = await User.countDocuments();
    if (count > 0) {
      return res.status(403).json({ message: "Setup already complete" });
    }

    const { username, password, email } = req.body;
    const admin = new User({
      username,
      password_hash: password,
      role: "ADMIN",
      email,
    });

    await admin.save();
    res.status(201).json({ message: "First ADMIN created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error creating admin" });
  }
});

// Login
router.post("/login", authLimiter, validate("login"), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email (case-insensitive)
    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user || !user.is_active) {
      // Intentionally not logging userId on failure to prevent enumeration via audit logs,
      // but we log the attempt for security tracking if we had a system user.
      // For now, just return 401.
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await recordAudit(user._id, "LOGIN_FAILED", { ip: req.ip });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        username: user.username,
        email: user.email || "",
        jti: require("crypto").randomUUID(),
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    await recordAudit(user._id, "LOGIN_SUCCESS", { ip: req.ip });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email || "",
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error during login" });
  }
});

module.exports = router;
