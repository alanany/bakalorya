import "reflect-metadata";
import { initAppDataSource, AppDataSource } from "./data-source";
import { User } from "./entity/User";
import * as bcrypt from "bcryptjs";

async function resetAdmin() {
  try {
    console.log("🔄 Connecting to database...");
    const ds = await initAppDataSource();

    const userRepository = ds.getRepository(User);

    const email = process.argv[2] || "admin@bakalorya.com";
    const password = process.argv[3] || "admin123";
    const name = "مشرف انطلق";

    const passwordHash = await bcrypt.hash(password, 10);

    let admin = await userRepository.findOne({
      where: [{ role: "admin" }, { email: email }]
    });

    if (admin) {
      admin.email = email;
      admin.password = passwordHash;
      admin.role = "admin";
      admin.name = admin.name || name;
      await userRepository.save(admin);
      console.log("\n✅ [SUCCESS] Admin account password has been updated successfully!");
    } else {
      admin = userRepository.create({
        name,
        email,
        password: passwordHash,
        role: "admin",
        avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Admin"
      });
      await userRepository.save(admin);
      console.log("\n✅ [SUCCESS] New Admin account has been created successfully!");
    }

    console.log("==========================================");
    console.log("🔑 ADMIN LOGIN CREDENTIALS:");
    console.log(`📧 Email:    ${email}`);
    console.log(`🔒 Password: ${password}`);
    console.log("==========================================\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error resetting admin:", error);
    process.exit(1);
  }
}

resetAdmin();
