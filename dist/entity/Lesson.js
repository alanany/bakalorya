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
exports.Lesson = void 0;
const typeorm_1 = require("typeorm");
const Course_1 = require("./Course");
let Lesson = class Lesson {
    id;
    title;
    description;
    videoUrl;
    duration;
    chapter;
    order;
    photo;
    notes;
    resourceUrl;
    resourceTitle;
    questions;
    objectives; // Learning objectives for this specific lesson
    course;
    createdAt;
    updatedAt;
};
exports.Lesson = Lesson;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Lesson.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Lesson.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { nullable: true }),
    __metadata("design:type", String)
], Lesson.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Lesson.prototype, "videoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: "0:00" }),
    __metadata("design:type", String)
], Lesson.prototype, "duration", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: "General" }),
    __metadata("design:type", String)
], Lesson.prototype, "chapter", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Lesson.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { nullable: true }),
    __metadata("design:type", String)
], Lesson.prototype, "photo", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { nullable: true }),
    __metadata("design:type", String)
], Lesson.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { nullable: true }),
    __metadata("design:type", String)
], Lesson.prototype, "resourceUrl", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { nullable: true }),
    __metadata("design:type", String)
], Lesson.prototype, "resourceTitle", void 0);
__decorate([
    (0, typeorm_1.Column)("simple-json", { nullable: true }),
    __metadata("design:type", Array)
], Lesson.prototype, "questions", void 0);
__decorate([
    (0, typeorm_1.Column)("simple-json", { nullable: true }),
    __metadata("design:type", Array)
], Lesson.prototype, "objectives", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Course_1.Course, { onDelete: "CASCADE" }),
    __metadata("design:type", Course_1.Course)
], Lesson.prototype, "course", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Lesson.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Lesson.prototype, "updatedAt", void 0);
exports.Lesson = Lesson = __decorate([
    (0, typeorm_1.Entity)()
], Lesson);
