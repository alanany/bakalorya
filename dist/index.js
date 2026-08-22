"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const data_source_1 = require("./data-source");
const routes_1 = __importDefault(require("./routes"));
const PORT = process.env.PORT || 3000;
async function startServer() {
    try {
        // Ensure uploads directory exists
        const uploadsDir = path_1.default.resolve(process.cwd(), "public/uploads");
        if (!fs_1.default.existsSync(uploadsDir)) {
            fs_1.default.mkdirSync(uploadsDir, { recursive: true });
        }
        const app = (0, express_1.default)();
        // Configure Middlewares
        app.use((0, cors_1.default)());
        app.use(express_1.default.json({ limit: "50mb" }));
        app.use(express_1.default.urlencoded({ extended: true, limit: "50mb" }));
        // Mount API Routes
        app.use("/api", routes_1.default);
        // Serve Uploads and Static Frontend Files
        app.use("/uploads", express_1.default.static(uploadsDir));
        app.use(express_1.default.static(path_1.default.resolve(process.cwd(), "public")));
        // Fallback route to serve index.html for SPA router support
        app.get("*", (req, res) => {
            res.sendFile(path_1.default.resolve(process.cwd(), "public/index.html"));
        });
        // Start HTTP listener immediately so server NEVER returns 503 Service Unavailable
        app.listen(PORT, async () => {
            console.log(`🚀 Server is running at http://localhost:${PORT}`);
            try {
                await (0, data_source_1.initAppDataSource)();
                console.log("Data Source has been initialized!");
            }
            catch (error) {
                console.error("Error during Data Source initialization:", error.message || error);
            }
        });
    }
    catch (error) {
        console.error("Fatal startup error:", error);
    }
}
startServer();
