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
  const type: "mysql" | "sqlite" | "postgres" = (rawType === "mysql" || rawType === "postgres") ? rawType : (rawType === "sqlite" ? "sqlite" : "mysql");

  const clean = (val?: string) => (val || "").trim().replace(/^["']|["']$/g, "");

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
      console.warn(`⚠️ WARNING: Connected to SQLITE (local file "bakalorya_db"). Data is saved locally, not to Hostinger MySQL. Ensure DB_TYPE=mysql and MySQL credentials are correct in .env.`);
    } else {
      console.log(`✅ Data Source (${activeType}) connected successfully to MySQL database "${process.env.DB_NAME}" on ${process.env.DB_HOST}!`);
    }
    return AppDataSource;
  } catch (err: any) {
    console.error(`❌ MYSQL CONNECTION FAILURE: Failed to connect to MySQL (Host: ${process.env.DB_HOST}, User: ${process.env.DB_USER}, DB: ${process.env.DB_NAME}): ${err.message || err}`);
    console.warn(`⚠️ Safe Fallback: Initializing SQLite temporary database to keep site ONLINE (503 Prevention)...`);
    try {
      AppDataSource = new DataSource({
        type: "sqlite",
        database: "bakalorya_db",
        synchronize: true,
        logging: false,
        entities: allEntities,
      });
      await AppDataSource.initialize();
      console.log("Fallback SQLite Data Source initialized successfully. Site remains online!");
      return AppDataSource;
    } catch (fallbackErr: any) {
      console.error("Critical: SQLite fallback also failed:", fallbackErr);
      throw err;
    }
  }
}

