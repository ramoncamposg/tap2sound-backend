import { Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "./auth.js";

const prisma = new PrismaClient();

/**
 * Debe usarse DESPUÉS de authMiddleware. Comprueba que el usuario
 * autenticado tiene el flag isAdmin en la base de datos.
 */
export const adminMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || !user.isAdmin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
