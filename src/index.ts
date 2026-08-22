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
    // Ensure uploads directory exists
    const uploadsDir = path.resolve(process.cwd(), "public/uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const app = express();

    // Configure Middlewares
    app.use(cors());
    app.use(express.json({ limit: "50mb" }));
    app.use(express.urlencoded({ extended: true, limit: "50mb" }));

    // Mount API Routes
    app.use("/api", router);

    // Serve Uploads and Static Frontend Files
    app.use("/uploads", express.static(uploadsDir));
    app.use(express.static(path.resolve(process.cwd(), "public")));

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
      } catch (error: any) {
        console.error("Error during Data Source initialization:", error.message || error);
      }
    });
  } catch (error) {
    console.error("Fatal startup error:", error);
  }
}

startServer();
