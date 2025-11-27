import { Router } from "express";
import { createOrg, getOrgByName, updateOrg, deleteOrg } from "../controllers/org.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.post("/create", createOrg);
router.get("/get", getOrgByName);
router.put("/update", updateOrg);
router.delete("/delete", authenticate, deleteOrg);

export default router;
