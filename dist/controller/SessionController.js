"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionController = void 0;
const data_source_1 = require("../data-source");
const Session_1 = require("../entity/Session");
const User_1 = require("../entity/User");
class SessionController {
    static async getAll(req, res) {
        try {
            const sessionRepository = data_source_1.AppDataSource.getRepository(Session_1.Session);
            const sessions = await sessionRepository.find({
                order: { scheduledAt: "ASC" }
            });
            return res.status(200).json(sessions);
        }
        catch (err) {
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    static async create(req, res) {
        const { title, description, scheduledAt, duration } = req.body;
        if (!title || !scheduledAt) {
            return res.status(400).json({ error: "Missing title or scheduledAt date." });
        }
        try {
            const sessionRepository = data_source_1.AppDataSource.getRepository(Session_1.Session);
            const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
            const teacher = await userRepository.findOneBy({ id: req.user.id });
            if (!teacher) {
                return res.status(404).json({ error: "Teacher profile not found." });
            }
            const session = new Session_1.Session();
            session.title = title;
            session.description = description;
            session.teacher = teacher;
            session.scheduledAt = new Date(scheduledAt);
            session.duration = duration || 60;
            session.status = "scheduled";
            await sessionRepository.save(session);
            return res.status(201).json(session);
        }
        catch (err) {
            return res.status(500).json({ error: "Internal server error." });
        }
    }
    static async updateStatus(req, res) {
        const { id } = req.params;
        const { status } = req.body;
        if (!["scheduled", "live", "completed"].includes(status)) {
            return res.status(400).json({ error: "Invalid status value." });
        }
        try {
            const sessionRepository = data_source_1.AppDataSource.getRepository(Session_1.Session);
            const session = await sessionRepository.findOne({
                where: { id },
                relations: ["teacher"]
            });
            if (!session) {
                return res.status(404).json({ error: "Session not found." });
            }
            if (session.teacher.id !== req.user.id && req.user.role !== "admin") {
                return res.status(403).json({ error: "Forbidden. You are not the teacher of this session." });
            }
            session.status = status;
            await sessionRepository.save(session);
            return res.status(200).json(session);
        }
        catch (err) {
            return res.status(500).json({ error: "Internal server error." });
        }
    }
}
exports.SessionController = SessionController;
