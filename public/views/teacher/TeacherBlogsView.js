import { showToast } from "../../app.js";

export default class TeacherBlogsView {
  constructor(container) {
    this.container = container;
  }

  async render() {
    showToast("إدارة ونشر مقالات المدونة أصبحت مخصصة لإدارة المنصة حصراً.", "info");
    window.location.hash = "#teacher-portal";
  }
}
