import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";

const prisma = new PrismaClient();

const MAC_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

/**
 * Pre-registra una etiqueta NFC (lista blanca). El admin la llama al
 * preparar cada tag. Sin MAC: se rellenará cuando un usuario empareje.
 * Idempotente: si la etiqueta ya estaba registrada, devuelve éxito.
 */
export const registerTag = async (req: AuthRequest, res: Response) => {
  try {
    const { nfcUid, name } = req.body;
    if (!nfcUid) {
      res.status(400).json({ error: "nfcUid is required" });
      return;
    }

    const existing = await prisma.speaker.findUnique({ where: { nfcUid } });
    if (existing) {
      res.json({
        success: true,
        alreadyRegistered: true,
        speaker: {
          id: existing.id,
          nfcUid: existing.nfcUid,
          btMac: existing.btMac,
          name: existing.name,
        },
      });
      return;
    }

    const speaker = await prisma.speaker.create({
      data: {
        nfcUid,
        btMac: null,
        name: name || `Altavoz ${nfcUid.substring(0, 8)}`,
      },
    });

    res.json({
      success: true,
      alreadyRegistered: false,
      speaker: {
        id: speaker.id,
        nfcUid: speaker.nfcUid,
        btMac: speaker.btMac,
        name: speaker.name,
      },
    });
  } catch (error) {
    console.error("Register tag error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Lista todas las asociaciones: por cada altavoz (NFC + MAC),
 * los emails de los usuarios que lo tienen vinculado.
 * Esta es la vista clave para diagnosticar problemas.
 */
export const listAssociations = async (req: AuthRequest, res: Response) => {
  try {
    const speakers = await prisma.speaker.findMany({
      include: { users: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    });

    const associations = speakers.map((s) => ({
      speakerId: s.id,
      nfcUid: s.nfcUid,
      btMac: s.btMac,
      name: s.name,
      createdAt: s.createdAt,
      users: s.users.map((us) => ({
        userId: us.user.id,
        email: us.user.email,
        linkedAt: us.createdAt,
      })),
    }));

    res.json({ associations, total: associations.length });
  } catch (error) {
    console.error("List associations error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Corrige la MAC de un altavoz (p. ej. si se sustituyó el hardware
 * pero se conserva el mismo tag NFC).
 */
export const updateSpeakerMac = async (req: AuthRequest, res: Response) => {
  try {
    const { speakerId, btMac } = req.body;
    if (!speakerId || !btMac) {
      res.status(400).json({ error: "speakerId and btMac are required" });
      return;
    }
    if (!MAC_REGEX.test(btMac)) {
      res.status(400).json({ error: "Invalid Bluetooth MAC address format" });
      return;
    }
    const normalizedMac = btMac.toUpperCase().replace(/-/g, ":");

    // Evitar colisión con otro altavoz que ya use esa MAC
    const clash = await prisma.speaker.findUnique({
      where: { btMac: normalizedMac },
    });
    if (clash && clash.id !== speakerId) {
      res.status(400).json({ error: "That MAC is already used by another speaker" });
      return;
    }

    const updated = await prisma.speaker.update({
      where: { id: speakerId },
      data: { btMac: normalizedMac },
    });
    res.json({ success: true, speaker: updated });
  } catch (error) {
    console.error("Update speaker MAC error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Resetea un tag: borra todas las vinculaciones de usuarios y limpia la
 * MAC, PERO mantiene el tag en la lista blanca (nfc_uid sigue autorizado).
 * El tag vuelve a estado "registrado pero sin emparejar" y puede volver
 * a emparejarse limpio. Ideal cuando un usuario pide resetear por email.
 */
export const resetTag = async (req: AuthRequest, res: Response) => {
  try {
    const { speakerId } = req.body;
    if (!speakerId) {
      res.status(400).json({ error: "speakerId is required" });
      return;
    }
    // Quitar todas las vinculaciones de usuarios
    await prisma.userSpeaker.deleteMany({ where: { speakerId } });
    // Limpiar la MAC, conservando el tag autorizado
    const speaker = await prisma.speaker.update({
      where: { id: speakerId },
      data: { btMac: null },
    });
    res.json({
      success: true,
      speaker: {
        id: speaker.id,
        nfcUid: speaker.nfcUid,
        btMac: speaker.btMac,
        name: speaker.name,
      },
    });
  } catch (error) {
    console.error("Reset tag error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Elimina un altavoz por completo. Por la regla onDelete: Cascade,
 * desaparecen también todas sus vinculaciones. Útil para "resetear"
 * un NFC+MAC problemático y dejar que se vuelva a auto-emparejar.
 */
export const deleteSpeaker = async (req: AuthRequest, res: Response) => {
  try {
    const { speakerId } = req.body;
    if (!speakerId) {
      res.status(400).json({ error: "speakerId is required" });
      return;
    }
    await prisma.speaker.delete({ where: { id: speakerId } });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete speaker error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Desvincula un único usuario de un altavoz (sin borrar el altavoz).
 */
export const unlinkUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, speakerId } = req.body;
    if (!userId || !speakerId) {
      res.status(400).json({ error: "userId and speakerId are required" });
      return;
    }
    await prisma.userSpeaker.delete({
      where: { userId_speakerId: { userId, speakerId } },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Unlink user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
