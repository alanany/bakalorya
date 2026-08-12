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
exports.Enrollment = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const Course_1 = require("./Course");
const Payment_1 = require("./Payment");
let Enrollment = class Enrollment {
    id;
    student;
    course;
    progress; // 0 to 100
    status;
    completedLessons; // List of completed lesson IDs
    payment; // Linked payment/receipt for this enrollment
    createdAt;
    updatedAt;
};
exports.Enrollment = Enrollment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Enrollment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { eager: true, onDelete: "CASCADE" }),
    __metadata("design:type", User_1.User)
], Enrollment.prototype, "student", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Course_1.Course, { eager: true, onDelete: "CASCADE" }),
    __metadata("design:type", Course_1.Course)
], Enrollment.prototype, "course", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Enrollment.prototype, "progress", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: "pending" }),
    __metadata("design:type", String)
], Enrollment.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)("simple-json", { nullable: true }),
    __metadata("design:type", Array)
], Enrollment.prototype, "completedLessons", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => Payment_1.Payment, { nullable: true, eager: false, onDelete: "SET NULL" }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", Payment_1.Payment)
], Enrollment.prototype, "payment", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Enrollment.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Enrollment.prototype, "updatedAt", void 0);
exports.Enrollment = Enrollment = __decorate([
    (0, typeorm_1.Entity)()
], Enrollment);
