"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
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
const allEntities = [
    User_1.User, Course_1.Course, Lesson_1.Lesson, Enrollment_1.Enrollment, Session_1.Session,
    Assignment_1.Assignment, AssignmentSubmission_1.AssignmentSubmission, Resource_1.Resource, Test_1.Test,
    TestQuestion_1.TestQuestion, TestAttempt_1.TestAttempt, Blog_1.Blog, Category_1.Category, TeacherApplication_1.TeacherApplication,
    QuestionAnswer_1.QuestionAnswer, Notification_1.Notification, Review_1.Review, SubscriptionPlan_1.SubscriptionPlan, Subscription_1.Subscription,
    SessionCreditLedger_1.SessionCreditLedger, TeacherAvailability_1.TeacherAvailability, SessionAttendance_1.SessionAttendance,
    TeacherEarning_1.TeacherEarning, Payment_1.Payment, AuditLog_1.AuditLog
];
const dbType = (process.env.DB_TYPE || "sqlite").toLowerCase();
let options;
if (dbType === "mysql" || dbType === "postgres") {
    options = {
        type: dbType,
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || (dbType === "postgres" ? "5432" : "3306"), 10),
        username: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "bakalorya_db",
        synchronize: true,
        logging: false,
        entities: allEntities,
    };
}
else {
    options = {
        type: "sqlite",
        database: process.env.DB_NAME || "database.sqlite",
        synchronize: true,
        logging: false,
        entities: allEntities,
    };
}
exports.AppDataSource = new typeorm_1.DataSource(options);
