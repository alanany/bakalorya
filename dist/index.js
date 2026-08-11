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
        const uploadsDir = path_1.default.join(__dirname, "../public/uploads");
        if (!fs_1.default.existsSync(uploadsDir)) {
            fs_1.default.mkdirSync(uploadsDir, { recursive: true });
        }
        // Initialize TypeORM DataSource
        await data_source_1.AppDataSource.initialize();
        console.log("Data Source has been initialized!");
        const app = (0, express_1.default)();
        // Configure Middlewares
        app.use((0, cors_1.default)());
        app.use(express_1.default.json());
        app.use(express_1.default.urlencoded({ extended: true }));
        // Mount API Routes
        app.use("/api", routes_1.default);
        // Serve Frontend Static Files
        app.use(express_1.default.static(path_1.default.join(__dirname, "../public")));
        // Fallback route to serve index.html for SPA router support
        app.get("*", (req, res) => {
            res.sendFile(path_1.default.join(__dirname, "../public/index.html"));
        });
        app.listen(PORT, () => {
            console.log(`Server is running at http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error("Error during Data Source initialization:", error);
        process.exit(1);
    }
}
startServer();
