const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET;

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Store jti and expiration for revocation check
    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.tokenJti = decoded.jti;
    req.tokenExp = decoded.exp;
    // Check if token has been revoked
    const { isTokenRevoked } = require("../middleware/jwtSession");
    const revoked = await isTokenRevoked(decoded.jti);
    if (revoked) {
      return res.status(401).json({ message: "Token has been revoked" });
    }
    // Check if user still exists and is active
    const user = await User.findById(req.userId);
    if (!user || !user.is_active) {
      return res
        .status(401)
        .json({ message: "User account inactive or deleted" });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    const userRole = (req.userRole || "").trim().toUpperCase();
    const allowedRoles = roles.map((r) => r.toUpperCase());

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "Requires higher privileges" });
    }
    next();
  };
};

module.exports = { verifyToken, requireRole, JWT_SECRET };
