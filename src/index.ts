import "reflect-metadata";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { AppDataSource, initAppDataSource } from "./data-source";
import router from "./routes";

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Ensure uploads directory exists (supports persistent UPLOADS_DIR environment variable)
    const uploadsDir = process.env.UPLOADS_DIR 
      ? path.resolve(process.env.UPLOADS_DIR) 
      : path.resolve(process.cwd(), "public/uploads");

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const app = express();

    // 1. Security Headers (Clickjacking, MIME Sniffing, XSS protection, server fingerprint removal)
    const { securityHeaders } = await import("./middleware/securityHeaders");
    app.use(securityHeaders);

    // 2. Configure CORS
    app.use(cors({
      origin: true, // Allow request origin in dev & prod
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Timezone", "Idempotency-Key", "X-Idempotency-Key"]
    }));

    // 3. Payload limits (Safe 2MB for standard JSON to prevent JSON-bomb DoS attacks)
    app.use(express.json({ limit: "2mb" }));
    app.use(express.urlencoded({ extended: true, limit: "2mb" }));

    // 4. Global API Rate Limiter (Protects against DoS and scraping)
    const { apiRateLimiter } = await import("./middleware/rateLimiter");
    app.use("/api", apiRateLimiter);

    // Mount API Routes
    app.use("/api", router);

    // Serve Uploads and Static Frontend Files
    app.use("/uploads", express.static(uploadsDir));
    app.use("/public/uploads", express.static(uploadsDir));
    app.use(express.static(path.resolve(process.cwd(), "public")));

    // Dedicated SEO Crawlers Endpoints
    app.get("/robots.txt", (req, res) => {
      res.type("text/plain").sendFile(path.resolve(process.cwd(), "public/robots.txt"));
    });

    app.get("/sitemap.xml", (req, res) => {
      res.type("application/xml").sendFile(path.resolve(process.cwd(), "public/sitemap.xml"));
    });

    // Fallback route to serve index.html for SPA router support
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(process.cwd(), "public/index.html"));
    });

    // Start HTTP listener immediately so server NEVER returns 503 Service Unavailable
    app.listen(PORT, async () => {
      console.log(`🚀 Server is running at http://localhost:${PORT}`);
      try {
        await initAppDataSource();
        console.log("Data Source has been initialized!");
        // Seed Egyptian curriculum (Grades and Subjects) if not present
        const { CurriculumController } = await import("./controller/CurriculumController");
        await CurriculumController.seedEgyptianCurriculum();
      } catch (error: any) {
        console.error("Error during Data Source initialization:", error.message || error);
      }
    });
  } catch (error) {
    console.error("Fatal startup error:", error);
  }
}

startServer();
