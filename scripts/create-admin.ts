/**
 * Script to create or reset admin account
 * Run with: bun run scripts/create-admin.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

async function createOrResetAdmin() {
  try {
    // Check if admin exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    // Generate secure random password
    const randomPassword = crypto.randomBytes(16).toString("base64").slice(0, 20);
    const hashedPassword = await bcrypt.hash(randomPassword, 12);

    if (existingAdmin) {
      // Reset password
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          password: hashedPassword,
          isVerified: true,
          isActive: true,
        },
      });

      console.log("\n✅ تم إعادة تعيين كلمة مرور حساب الإدارة بنجاح!\n");
      console.log("=".repeat(50));
      console.log("📧 البريد الإلكتروني:", existingAdmin.email);
      console.log("🔑 كلمة المرور الجديدة:", randomPassword);
      console.log("=".repeat(50));
      console.log("\n⚠️  احفظ هذه البيانات في مكان آمن - لن تظهر مرة أخرى!\n");
    } else {
      // Create new admin
      const admin = await prisma.user.create({
        data: {
          name: "Admin",
          email: "admin@tarifa.com",
          password: hashedPassword,
          phone: "0500000000",
          role: "ADMIN",
          isVerified: true,
          isActive: true,
        },
      });

      console.log("\n✅ تم إنشاء حساب الإدارة بنجاح!\n");
      console.log("=".repeat(50));
      console.log("📧 البريد الإلكتروني:", admin.email);
      console.log("🔑 كلمة المرور:", randomPassword);
      console.log("=".repeat(50));
      console.log("\n⚠️  احفظ هذه البيانات في مكان آمن - لن تظهر مرة أخرى!\n");
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createOrResetAdmin();
