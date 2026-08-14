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
import { SubscriptionPlan } from "./entity/SubscriptionPlan";
import { Subscription } from "./entity/Subscription";
import { SessionCreditLedger } from "./entity/SessionCreditLedger";
import { TeacherAvailability } from "./entity/TeacherAvailability";
import { SessionAttendance } from "./entity/SessionAttendance";
import { TeacherEarning } from "./entity/TeacherEarning";
import { Payment } from "./entity/Payment";
import { AuditLog } from "./entity/AuditLog";

export const allEntities = [
  User, Course, Lesson, Enrollment, Session,
  Assignment, AssignmentSubmission, Resource, Test,
  TestQuestion, TestAttempt, Blog, Category, TeacherApplication,
  QuestionAnswer, Notification, Review, SubscriptionPlan, Subscription,
  SessionCreditLedger, TeacherAvailability, SessionAttendance,
  TeacherEarning, Payment, AuditLog
];

const dbType = (process.env.DB_TYPE || "sqlite").toLowerCase() as "mysql" | "sqlite" | "postgres";

function createOptions(type: "mysql" | "sqlite" | "postgres"): DataSourceOptions {
  if (type === "mysql" || type === "postgres") {
    return {
      type: type,
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || (type === "postgres" ? "5432" : "3306"), 10),
      username: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "bakalorya_platform_db",
      synchronize: true,
      logging: false,
      entities: allEntities,
    };
  }
  return {
    type: "sqlite",
    database: process.env.DB_NAME && process.env.DB_NAME.endsWith(".sqlite") ? process.env.DB_NAME : "bakalorya_db",
    synchronize: true,
    logging: false,
    entities: allEntities,
  };
}

export let AppDataSource = new DataSource(createOptions(dbType));

export async function initAppDataSource(): Promise<DataSource> {
  try {
    await AppDataSource.initialize();
    console.log(`Data Source (${dbType}) has been initialized!`);
    return AppDataSource;
  } catch (err: any) {
    if (dbType !== "sqlite") {
      console.warn(`Failed to connect to ${dbType} (${err.message || err}). Falling back to SQLite...`);
      AppDataSource = new DataSource(createOptions("sqlite"));
      await AppDataSource.initialize();
      console.log("Fallback SQLite Data Source initialized successfully!");
      return AppDataSource;
    }
    throw err;
  }
}

