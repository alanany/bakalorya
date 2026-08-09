import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
import dotenv from "dotenv";
dotenv.config();

import { User } from "./entity/User";
import { Course } from "./entity/Course";
import { Lesson } from "./entity/Lesson";
import { Enrollment } from "./entity/Enrollment";
import { Session } from "./entity/Session";
import { Assignment } from "./entity/Assignment";
import { AssignmentSubmission } from "./entity/AssignmentSubmission";
import { Resource } from "./entity/Resource";
import { Test } from "./entity/Test";
import { TestQuestion } from "./entity/TestQuestion";
import { TestAttempt } from "./entity/TestAttempt";
import { Blog } from "./entity/Blog";
import { Category } from "./entity/Category";
import { TeacherApplication } from "./entity/TeacherApplication";
import { QuestionAnswer } from "./entity/QuestionAnswer";
import { Notification } from "./entity/Notification";
import { Review } from "./entity/Review";

const dbType = (process.env.DB_TYPE || "sqlite").toLowerCase() as "mysql" | "sqlite" | "postgres";

let options: DataSourceOptions;

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
    entities: [
      User, Course, Lesson, Enrollment, Session,
      Assignment, AssignmentSubmission, Resource, Test,
      TestQuestion, TestAttempt, Blog, Category, TeacherApplication,
      QuestionAnswer, Notification, Review
    ],
  };
} else {
  options = {
    type: "sqlite",
    database: process.env.DB_NAME || "database.sqlite",
    synchronize: true,
    logging: false,
    entities: [
      User, Course, Lesson, Enrollment, Session,
      Assignment, AssignmentSubmission, Resource, Test,
      TestQuestion, TestAttempt, Blog, Category, TeacherApplication,
      QuestionAnswer, Notification, Review
    ],
  };
}

export const AppDataSource = new DataSource(options);
