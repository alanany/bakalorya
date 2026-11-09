"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = exports.allEntities = void 0;
exports.getDataSourceOptions = getDataSourceOptions;
exports.initAppDataSource = initAppDataSource;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const dotenv = __importStar(require("dotenv"));
// Load .env once at module level — do NOT call dotenv.config() again elsewhere
dotenv.config();
const User_1 = require("./entity/User");
const Course_1 = require("./entity/Course");
const Lesson_1 = require("./entity/Lesson");
const Enrollment_1 = require("./entity/Enrollment");
const Session_1 = require("./entity/Session");
const Assignment_1 = require("./entity/Assignment");
const AssignmentSubmission_1 = require("./entity/AssignmentSubmission");
const Resource_1 = require("./entity/Resource");
const Test_1 = require("./entity/Test");
const TestQuestion_1 = require("./entity/TestQuestion");
const TestAttempt_1 = require("./entity/TestAttempt");
const Blog_1 = require("./entity/Blog");
const Category_1 = require("./entity/Category");
const TeacherApplication_1 = require("./entity/TeacherApplication");
const QuestionAnswer_1 = require("./entity/QuestionAnswer");
const Notification_1 = require("./entity/Notification");
const Review_1 = require("./entity/Review");
const SubscriptionPlan_1 = require("./entity/SubscriptionPlan");
const Subscription_1 = require("./entity/Subscription");
const SessionCreditLedger_1 = require("./entity/SessionCreditLedger");
const TeacherAvailability_1 = require("./entity/TeacherAvailability");
const SessionAttendance_1 = require("./entity/SessionAttendance");
const TeacherEarning_1 = require("./entity/TeacherEarning");
const Payment_1 = require("./entity/Payment");
const AuditLog_1 = require("./entity/AuditLog");
const PlatformSetting_1 = require("./entity/PlatformSetting");
const Grade_1 = require("./entity/Grade");
const Subject_1 = require("./entity/Subject");
const CourseGroup_1 = require("./entity/CourseGroup");
const ParentStudentLink_1 = require("./entity/ParentStudentLink");
const MarketingCampaign_1 = require("./entity/MarketingCampaign");
const ClassPackage_1 = require("./entity/ClassPackage");
exports.allEntities = [
    User_1.User, Course_1.Course, Lesson_1.Lesson, Enrollment_1.Enrollment, Session_1.Session,
    Assignment_1.Assignment, AssignmentSubmission_1.AssignmentSubmission, Resource_1.Resource, Test_1.Test,
    TestQuestion_1.TestQuestion, TestAttempt_1.TestAttempt, Blog_1.Blog, Category_1.Category, TeacherApplication_1.TeacherApplication,
    QuestionAnswer_1.QuestionAnswer, Notification_1.Notification, Review_1.Review, SubscriptionPlan_1.SubscriptionPlan, Subscription_1.Subscription,
    SessionCreditLedger_1.SessionCreditLedger, TeacherAvailability_1.TeacherAvailability, SessionAttendance_1.SessionAttendance,
    TeacherEarning_1.TeacherEarning, Payment_1.Payment, AuditLog_1.AuditLog, PlatformSetting_1.PlatformSetting,
    Grade_1.Grade, Subject_1.Subject, CourseGroup_1.CourseGroup, ParentStudentLink_1.ParentStudentLink, MarketingCampaign_1.MarketingCampaign,
    ClassPackage_1.ClassPackage
];
function getDataSourceOptions() {
    const rawType = (process.env.DB_TYPE || "").trim().toLowerCase();
    const type = (rawType === "mysql" || rawType === "postgres") ? rawType : (rawType === "sqlite" ? "sqlite" : "mysql");
    const clean = (val) => (val || "").trim().replace(/^["']|["']$/g, "");
    if (type === "mysql" || type === "postgres") {
        const host = clean(process.env.DB_HOST) || "localhost";
        return {
            type: type,
            host: host,
            port: parseInt(clean(process.env.DB_PORT) || (type === "postgres" ? "5432" : "3306"), 10),
            username: clean(process.env.DB_USER) || "root",
            password: clean(process.env.DB_PASSWORD) || "",
            database: clean(process.env.DB_NAME) || "bakalorya_platform_db",
            synchronize: true,
            logging: false,
            entities: exports.allEntities,
        };
    }
    return {
        type: "sqlite",
        database: process.env.DB_NAME && process.env.DB_NAME.endsWith(".sqlite") ? process.env.DB_NAME : "bakalorya_db",
        synchronize: true,
        logging: false,
        entities: exports.allEntities,
    };
}
exports.AppDataSource = new typeorm_1.DataSource(getDataSourceOptions());
async function initAppDataSource() {
    const options = getDataSourceOptions();
    exports.AppDataSource = new typeorm_1.DataSource(options);
    try {
        await exports.AppDataSource.initialize();
        const activeType = options.type.toUpperCase();
        if (activeType === "SQLITE") {
            console.warn(`⚠️ WARNING: Connected to SQLITE (local file "bakalorya_db"). Data is saved locally, not to Hostinger MySQL. Ensure DB_TYPE=mysql and MySQL credentials are correct in .env.`);
        }
        else {
            console.log(`✅ Data Source (${activeType}) connected successfully to MySQL database "${process.env.DB_NAME}" on ${process.env.DB_HOST}!`);
        }
        return exports.AppDataSource;
    }
    catch (err) {
        console.error(`❌ DB connection failed — Host: ${process.env.DB_HOST}, DB: ${process.env.DB_NAME}`, err.message);
        console.warn(`⚠️ Safe Fallback: Initializing SQLite temporary database to keep site ONLINE (503 Prevention)...`);
        try {
            exports.AppDataSource = new typeorm_1.DataSource({
                type: "sqlite",
                database: "bakalorya_db",
                synchronize: true,
                logging: false,
                entities: exports.allEntities,
            });
            await exports.AppDataSource.initialize();
            console.log("Fallback SQLite Data Source initialized successfully. Site remains online!");
            return exports.AppDataSource;
        }
        catch (fallbackErr) {
            console.error("Critical: SQLite fallback also failed:", fallbackErr);
            throw err;
        }
    }
}
