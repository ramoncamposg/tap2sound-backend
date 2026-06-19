import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";

const prisma = new PrismaClient();

export const autoPair = async (req: AuthRequest, res: Response) => {
  try {
    const { nfcUid, btMac, name } = req.body;
    const userId = req.userId;

    if (!nfcUid || !btMac || !userId) {
      res
        .status(400)
        .json({
          error: "nfcUid, btMac, and authentication are required",
        });
      return;
    }

    // Validar formato de MAC address
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(btMac)) {
      res.status(400).json({ error: "Invalid Bluetooth MAC address format" });
      return;
    }

    // Normalizar MAC (convertir a mayúsculas y usar : como separador)
    const normalizedMac = btMac.toUpperCase().replace(/-/g, ":");

    // El tag DEBE estar pre-registrado por el admin (lista blanca).
    let speaker = await prisma.speaker.findUnique({
      where: { nfcUid },
    });

    if (!speaker) {
      res.status(403).json({
        error:
          "Esta etiqueta NFC no está autorizada. Usa un altavoz oficial.",
      });
      return;
    }

    if (speaker.btMac == null) {
      // Primer emparejamiento de un tag pre-registrado: fijar la MAC.
      // Comprobar que esa MAC no pertenezca ya a otra etiqueta.
      const macOwner = await prisma.speaker.findUnique({
        where: { btMac: normalizedMac },
      });
      if (macOwner && macOwner.id !== speaker.id) {
        res.status(400).json({
          error: "Ese altavoz Bluetooth ya está vinculado a otra etiqueta.",
        });
        return;
      }
      speaker = await prisma.speaker.update({
        where: { id: speaker.id },
        // Guardar tambien el nombre BT del altavoz (el que se ve al elegirlo
        // en los ajustes de Bluetooth del telefono), si la app lo envio.
        data: { btMac: normalizedMac, ...(name ? { name } : {}) },
      });
    } else if (speaker.btMac !== normalizedMac) {
      // Ya emparejado con otra MAC: conflicto.
      res.status(400).json({
        error: "Esta etiqueta ya está vinculada a otro altavoz.",
      });
      return;
    }

    // Vincular speaker al usuario (crear relación)
    const existingLink = await prisma.userSpeaker.findUnique({
      where: { userId_speakerId: { userId, speakerId: speaker.id } },
    });

    if (!existingLink) {
      await prisma.userSpeaker.create({
        data: { userId, speakerId: speaker.id },
      });
    }

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
    console.error("Auto-pair error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const tagStatus = async (req: AuthRequest, res: Response) => {
  try {
    const nfcUid = req.params.nfcUid;
    if (!nfcUid) {
      res.status(400).json({ error: "nfcUid required" });
      return;
    }
    const speaker = await prisma.speaker.findUnique({ where: { nfcUid } });
    res.json({ registered: speaker != null, paired: speaker?.btMac != null });
  } catch (error) {
    console.error("tagStatus error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getSpeakers = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userSpeakers = await prisma.userSpeaker.findMany({
      where: { userId },
      include: { speaker: true },
    });

    const speakers = userSpeakers.map((us) => ({
      id: us.speaker.id,
      nfcUid: us.speaker.nfcUid,
      btMac: us.speaker.btMac,
      name: us.speaker.name,
    }));

    res.json({ speakers });
  } catch (error) {
    console.error("Get speakers error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const renameSpeaker = async (req: AuthRequest, res: Response) => {
  try {
    const { speakerId, name } = req.body;
    const userId = req.userId;

    if (!speakerId || !name || !userId) {
      res.status(400).json({ error: "speakerId, name, and auth required" });
      return;
    }

    // Verificar que el usuario es propietario de este speaker
    const ownership = await prisma.userSpeaker.findUnique({
      where: { userId_speakerId: { userId, speakerId } },
    });

    if (!ownership) {
      res.status(403).json({ error: "Not authorized to rename this speaker" });
      return;
    }

    const updatedSpeaker = await prisma.speaker.update({
      where: { id: speakerId },
      data: { name },
    });

    res.json({
      success: true,
      speaker: {
        id: updatedSpeaker.id,
        nfcUid: updatedSpeaker.nfcUid,
        btMac: updatedSpeaker.btMac,
        name: updatedSpeaker.name,
      },
    });
  } catch (error) {
    console.error("Rename speaker error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
