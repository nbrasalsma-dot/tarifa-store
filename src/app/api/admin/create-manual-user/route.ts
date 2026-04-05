import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { verifyAuth, hashPassword } from "@/lib/auth";
import { revalidatePath } from "next/cache";
export async function POST(req: Request) {
  try {
    // 1. التحقق من صلاحية الأدمن باستخدام دالة المشروع
    const currentUser = await verifyAuth(req);
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "غير مصرح لك بهذا الإجراء" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const {
      fullName,
      email,
      phone,
      password,
      role,
      storeName,
      storeType,
      address,
    } = body;

    // 2. التأكد من عدم وجود المستخدم مسبقاً
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "البريد أو الهاتف مستخدم مسبقاً" },
        { status: 400 },
      );
    }

    // 2. تشفير كلمة المرور باستخدام دالة التشفير الأصلية للمتجر
    const hashedPassword = await hashPassword(password.trim());

    // 4. إنشاء المستخدم في قاعدة البيانات
    const user = await prisma.user.create({
      data: {
        name: fullName,
        email,
        phone,
        password: hashedPassword,
        role: role || "CUSTOMER",
        address: address || null,
        isVerified: true, // تفعيل تلقائي للأدمن
        isActive: true, // نشط فوراً
        // إذا كان تاجر، ننشئ له ملف التاجر فوراً
        ...(role === "MERCHANT"
          ? {
              merchant: {
                create: {
                  storeName,
                  storeType: storeType || "عام",
                  fullName,
                  phone,
                  email,
                  address: address || "غير محدد",
                  isApproved: true, // موافقة فورية
                  identityCardImage: "manual-admin-creation",
                  isActive: true,
                },
              },
            }
          : {}),
      },
    });

    // مسح الكاش وتحديث صفحة سجل المستخدمين فوراً
    revalidatePath("/admin/users"); // 👈 ملاحظة: إذا كان رابط صفحة المستخدمين في لوحة الإدارة مختلف، غير كلمة /admin/users إلى الرابط الصحيح عندك

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error: any) {
    console.error("CREATE_USER_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ في السيرفر" },
      { status: 500 },
    );
  }
}
