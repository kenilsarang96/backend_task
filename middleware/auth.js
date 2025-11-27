import { verifyToken } from "../utils/jwt.js";
import User from "../models/User.js";

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing or invalid authorization header" });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const user = await User.findById(decoded.userId).populate("org", "name collectionName");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    req.userId = user._id.toString();
    req.orgId = user.org._id.toString();
    req.orgName = user.org.name;

    next();
  } catch (err) {
    console.error("authenticate error", err);
    return res.status(401).json({ message: "Authentication failed" });
  }
}
