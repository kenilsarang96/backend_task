import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { signToken } from "../utils/jwt.js";

export async function adminLogin(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email }).populate("org", "name collectionName _id");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      orgId: user.org._id.toString(),
      orgName: user.org.name,
      role: user.role,
    });

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      organization: {
        id: user.org._id,
        name: user.org.name,
        collectionName: user.org.collectionName,
      },
    });
  } catch (err) {
    console.error("adminLogin error", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
