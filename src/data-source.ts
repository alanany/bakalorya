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

export function getDataSourceOptions(): DataSourceOptions {
  dotenv.config();
  const rawType = (process.env.DB_TYPE || "").trim().toLowerCase();
  
  // Default to mysql if DB_USER is configured or DB_TYPE is mysql
  const type: "mysql" | "sqlite" | "postgres" = (rawType === "mysql" || rawType === "postgres") ? rawType : (rawType === "sqlite" ? "sqlite" : "mysql");

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

export let AppDataSource = new DataSource(getDataSourceOptions());

export async function initAppDataSource(): Promise<DataSource> {
  dotenv.config();
  const options = getDataSourceOptions();
  AppDataSource = new DataSource(options);

  try {
    await AppDataSource.initialize();
    const activeType = options.type.toUpperCase();
    if (activeType === "SQLITE") {
      console.warn(`⚠️ WARNING: Connected to SQLITE (local file "bakalorya_db")! Data will NOT save to Hostinger MySQL. To fix, ensure DB_TYPE=mysql is set in .env on the server.`);
    } else {
      console.log(`✅ Data Source (${activeType}) connected successfully to MySQL database "${process.env.DB_NAME}" on ${process.env.DB_HOST}!`);
    }
    return AppDataSource;
  } catch (err: any) {
    console.error(`❌ MYSQL CONNECTION FAILURE: Failed to connect to MySQL (Host: ${process.env.DB_HOST}, User: ${process.env.DB_USER}, DB: ${process.env.DB_NAME}): ${err.message || err}`);
    if (process.env.NODE_ENV !== "production") {
      console.warn(`⚠️ Local Dev Fallback: Falling back to SQLite temporary database...`);
      AppDataSource = new DataSource({
        type: "sqlite",
        database: "bakalorya_db",
        synchronize: true,
        logging: false,
        entities: allEntities,
      });
      await AppDataSource.initialize();
      console.log("Fallback SQLite Data Source initialized successfully!");
      return AppDataSource;
    }
    throw err;
  }
}

