import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  autoPair,
  getSpeakers,
  renameSpeaker,
  tagStatus,
} from "../controllers/speakers.js";

const router = Router();

// POST /speakers/auto-pair - Core endpoint: NFC UID + BT MAC -> Register/Link
router.post("/auto-pair", authMiddleware, autoPair);
router.get("/tag-status/:nfcUid", authMiddleware, tagStatus);

// GET /speakers - Get all speakers for user
router.get("/", authMiddleware, getSpeakers);

// PUT /speakers/rename - Rename a speaker
router.put("/rename", authMiddleware, renameSpeaker);

export default router;
