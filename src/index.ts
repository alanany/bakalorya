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
    const uploadsDir = path.join(__dirname, "../public/uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const app = express();

    // Configure Middlewares
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Mount API Routes
    app.use("/api", router);

    // Serve Frontend Static Files
    app.use(express.static(path.join(__dirname, "../public")));

    // Fallback route to serve index.html for SPA router support
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "../public/index.html"));
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
