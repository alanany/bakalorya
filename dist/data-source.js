"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const User_1 = require("./entity/User");
const Course_1 = require("./entity/Course");
const Lesson_1 = require("./entity/Lesson");
const Enrollment_1 = require("./entity/Enrollment");
const Session_1 = require("./entity/Session");
exports.AppDataSource = new typeorm_1.DataSource({
    type: "sqlite",
    database: "database.sqlite",
    synchronize: true,
    logging: false,
    entities: [User_1.User, Course_1.Course, Lesson_1.Lesson, Enrollment_1.Enrollment, Session_1.Session],
    migrations: [],
    subscribers: [],
});
