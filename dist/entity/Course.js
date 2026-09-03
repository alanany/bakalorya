"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Course = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const Lesson_1 = require("./Lesson");
const Enrollment_1 = require("./Enrollment");
const Grade_1 = require("./Grade");
const Subject_1 = require("./Subject");
const CourseGroup_1 = require("./CourseGroup");
let Course = class Course {
    id;
    title;
    description;
    category;
    image;
    degree;
    meetingLink;
    status;
    price;
    isFree;
    currency;
    paymentDetails;
    grade;
    subject;
    approvedBy;
    approvedAt;
    rejectionReason;
    teacher;
    unitsOrder;
    lessons;
    groups;
    enrollments;
    createdAt;
    updatedAt;
};
exports.Course = Course;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Course.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Course.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)("text"),
    __metadata("design:type", String)
], Course.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Course.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Course.prototype, "image", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Course.prototype, "degree", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Course.prototype, "meetingLink", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: "PUBLISHED" }) // Default for legacy courses; new submitted courses use PENDING_REVIEW
    ,
    __metadata("design:type", String)
], Course.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", default: 0 }),
    __metadata("design:type", Number)
], Course.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Course.prototype, "isFree", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, default: "EGP" }),
    __metadata("design:type", String)
], Course.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Course.prototype, "paymentDetails", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Grade_1.Grade, grade => grade.courses, { nullable: true, eager: true, onDelete: "SET NULL" }),
    __metadata("design:type", Object)
], Course.prototype, "grade", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Subject_1.Subject, subject => subject.courses, { nullable: true, eager: true, onDelete: "SET NULL" }),
    __metadata("design:type", Object)
], Course.prototype, "subject", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true, onDelete: "SET NULL" }),
    __metadata("design:type", User_1.User)
], Course.prototype, "approvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], Course.prototype, "approvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Course.prototype, "rejectionReason", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true, eager: true, onDelete: "SET NULL" }),
    __metadata("design:type", Object)
], Course.prototype, "teacher", void 0);
__decorate([
    (0, typeorm_1.Column)("simple-json", { nullable: true }),
    __metadata("design:type", Array)
], Course.prototype, "unitsOrder", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Lesson_1.Lesson, lesson => lesson.course, { cascade: true }),
    __metadata("design:type", Array)
], Course.prototype, "lessons", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => CourseGroup_1.CourseGroup, group => group.course, { cascade: true }),
    __metadata("design:type", Array)
], Course.prototype, "groups", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Enrollment_1.Enrollment, enrollment => enrollment.course, { cascade: true }),
    __metadata("design:type", Array)
], Course.prototype, "enrollments", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Course.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Course.prototype, "updatedAt", void 0);
exports.Course = Course = __decorate([
    (0, typeorm_1.Entity)()
], Course);
