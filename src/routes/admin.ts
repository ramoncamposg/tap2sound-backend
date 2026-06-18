import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { adminMiddleware } from "../middleware/admin.js";
import {
  listAssociations,
  updateSpeakerMac,
  deleteSpeaker,
  unlinkUser,
  registerTag,
  resetTag,
} from "../controllers/admin.js";

const router = Router();

// Todas las rutas requieren autenticación + permisos de admin
router.post("/register-tag", authMiddleware, adminMiddleware, registerTag);
router.get("/associations", authMiddleware, adminMiddleware, listAssociations);
router.put("/speaker-mac", authMiddleware, adminMiddleware, updateSpeakerMac);
router.post("/reset-tag", authMiddleware, adminMiddleware, resetTag);
router.delete("/speaker", authMiddleware, adminMiddleware, deleteSpeaker);
router.delete("/unlink", authMiddleware, adminMiddleware, unlinkUser);

export default router;
