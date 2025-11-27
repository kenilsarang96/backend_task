import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Organization from "../models/Organization.js";
import User from "../models/User.js";
import { orgCollectionName } from "../utils/slugify.js";
import { ensureCollectionExists, copyCollectionData } from "../utils/orgCollection.js";


export async function createOrg(req, res) {
  try {
    const { organization_name, email, password } = req.body || {};
    if (!organization_name || !email || !password) {
      return res.status(400).json({ message: "organization_name, email, password are required" });
    }

    const existing = await Organization.findOne({ name: organization_name });
    if (existing) {
      return res.status(409).json({ message: "Organization name already exists" });
    }

    const collectionName = orgCollectionName(organization_name);
    if (!collectionName) {
      return res.status(400).json({ message: "Invalid organization_name" });
    }

    const existingCollection = await mongoose.connection.db
      .listCollections({ name: collectionName })
      .toArray();
    if (existingCollection.length > 0) {
      return res.status(409).json({ message: "Organization collection already exists" });
    }

    await ensureCollectionExists(collectionName);

    const passwordHash = await bcrypt.hash(password, 10);

    const orgDoc = new Organization({
      name: organization_name,
      collectionName,
      adminUser: new mongoose.Types.ObjectId(), // temp id; will be replaced
    });

    const adminUser = new User({
      _id: orgDoc.adminUser,
      email,
      passwordHash,
      org: orgDoc._id,
      role: "admin",
    });

    await orgDoc.save();
    await adminUser.save();

    return res.status(201).json({
      message: "Organization created",
      data: {
        id: orgDoc._id,
        name: orgDoc.name,
        collectionName: orgDoc.collectionName,
        adminUser: { id: adminUser._id, email: adminUser.email },
        createdAt: orgDoc.createdAt,
      },
    });
  } catch (err) {
    console.error("createOrg error", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getOrgByName(req, res) {
  try {
    const organization_name = req.body.organization_name;
    if (!organization_name) {
      return res.status(400).json({ message: "organization_name is required" });
    }

    const orgDoc = await Organization.findOne({ name: organization_name }).populate("adminUser", "email role");
    if (!orgDoc) {
      return res.status(404).json({ message: "Organization not found" });
    }

    return res.status(200).json({
      data: {
        id: orgDoc._id,
        name: orgDoc.name,
        collectionName: orgDoc.collectionName,
        adminUser: orgDoc.adminUser,
        db: orgDoc.connectionDetails,
        createdAt: orgDoc.createdAt,
        updatedAt: orgDoc.updatedAt,
      },
    });
  } catch (err) {
    console.error("getOrgByName error", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateOrg(req, res) {
  try {
    const { organization_name, email, password, new_organization_name } = req.body || {};
    if (!organization_name) {
      return res.status(400).json({ message: "organization_name is required" });
    }

    const orgDoc = await Organization.findOne({ name: organization_name });
    if (!orgDoc) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Update admin credentials if provided
    if (email || password) {
      const admin = await User.findById(orgDoc.adminUser);
      if (!admin) {
        return res.status(500).json({ message: "Admin user missing for organization" });
      }
      if (email) admin.email = email;
      if (password) admin.passwordHash = await bcrypt.hash(password, 10);
      await admin.save();
    }

    // Handle org rename + collection migration if new_organization_name provided
    if (new_organization_name && new_organization_name !== orgDoc.name) {
      const exists = await Organization.findOne({ name: new_organization_name });
      if (exists) {
        return res.status(409).json({ message: "New organization name already exists" });
      }
      const newCollectionName = orgCollectionName(new_organization_name);
      if (!newCollectionName) {
        return res.status(400).json({ message: "Invalid new_organization_name" });
      }

      if (newCollectionName !== orgDoc.collectionName) {
        const targetColl = await mongoose.connection.db
          .listCollections({ name: newCollectionName })
          .toArray();
        if (targetColl.length > 0) {
          return res.status(409).json({ message: "Target collection already exists" });
        }

        await ensureCollectionExists(newCollectionName);
        await copyCollectionData(orgDoc.collectionName, newCollectionName);

        orgDoc.collectionName = newCollectionName;
      }
      orgDoc.name = new_organization_name;

      await orgDoc.save();
    }

    const fresh = await Organization.findById(orgDoc._id).populate("adminUser", "email role");

    return res.status(200).json({
      message: "Organization updated",
      data: {
        id: fresh._id,
        name: fresh.name,
        collectionName: fresh.collectionName,
        adminUser: fresh.adminUser,
        db: fresh.connectionDetails,
        createdAt: fresh.createdAt,
        updatedAt: fresh.updatedAt,
      },
    });
  } catch (err) {
    console.error("updateOrg error", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteOrg(req, res) {
  try {
    const organization_name = req.body.organization_name;
    if (!organization_name) {
      return res.status(400).json({ message: "organization_name is required" });
    }

    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admin can delete organization" });
    }

    const orgDoc = await Organization.findOne({ name: organization_name });
    if (!orgDoc) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Ensure the authenticated user is the admin of this org
    if (orgDoc.adminUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not authorized to delete this organization" });
    }

    const collectionName = orgDoc.collectionName;
    try {
      await mongoose.connection.db.dropCollection(collectionName);
    } catch (dropErr) {
      console.warn(`Collection ${collectionName} drop warning:`, dropErr.message);
    }

    await User.deleteMany({ org: orgDoc._id });

    await Organization.deleteOne({ _id: orgDoc._id });

    return res.status(200).json({
      message: "Organization deleted successfully",
      data: { name: organization_name },
    });
  } catch (err) {
    console.error("deleteOrg error", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
