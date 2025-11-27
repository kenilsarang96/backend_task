import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true},
    passwordHash: { type: String, required: true },
    org: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    role: { type: String, enum: ["admin", "member"], default: "admin" },
  },
  { timestamps: true }
);


export default mongoose.model("User", UserSchema);

