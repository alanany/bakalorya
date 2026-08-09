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
exports.Session = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const Course_1 = require("./Course");
let Session = class Session {
    id;
    title;
    description;
    teacher;
    course;
    scheduledAt;
    duration; // in minutes
    status;
    createdAt;
    updatedAt;
};
exports.Session = Session;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Session.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Session.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { nullable: true }),
    __metadata("design:type", String)
], Session.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { eager: true, onDelete: "CASCADE" }),
    __metadata("design:type", User_1.User)
], Session.prototype, "teacher", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Course_1.Course, { eager: true, nullable: true, onDelete: "CASCADE" }),
    __metadata("design:type", Course_1.Course)
], Session.prototype, "course", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], Session.prototype, "scheduledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 60 }),
    __metadata("design:type", Number)
], Session.prototype, "duration", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: "scheduled" }),
    __metadata("design:type", String)
], Session.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Session.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Session.prototype, "updatedAt", void 0);
exports.Session = Session = __decorate([
    (0, typeorm_1.Entity)()
], Session);
