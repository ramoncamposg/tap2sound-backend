import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";
import authRoutes from "./routes/auth.js";
import speakerRoutes from "./routes/speakers.js";
import adminRoutes from "./routes/admin.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/auth", authRoutes);
app.use("/speakers", speakerRoutes);
app.use("/admin/api", adminRoutes);

// Panel de administración (HTML servido desde el mismo servicio)
app.get("/admin", (req, res) => {
  try {
    const html = readFileSync(join(process.cwd(), "src", "admin.html"), "utf-8");
    res.type("html").send(html);
  } catch (err) {
    res.status(500).send("Admin panel not found");
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`✅ Tap2Sound Backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});
