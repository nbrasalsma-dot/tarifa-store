import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/security";

// جلب جميع المحافظات (متاح للجميع لكي تظهر للعملاء في صفحة الدفع)
export async function GET(request: NextRequest) {
  try {
    // حذفنا قفل "الأدمن" من هنا لكي يستطيع العميل رؤية القائمة
    const governorates = await db.governorate.findMany({
      where: { isActive: true }, // ميزة إضافية: نجلب المحافظات النشطة فقط
      orderBy: { nameAr: "asc" },
    });

    return NextResponse.json({ success: true, governorates });
  } catch (error) {
    console.error("Fetch governorates error:", error);
    return NextResponse.json({ error: "حدث خطأ في السيرفر" }, { status: 500 });
  }
}

// إضافة محافظة جديدة (للإدارة فقط)
export async function POST(request: NextRequest) {
  try {
    // ✅ التعديل الجراحي: استخراج التوكن واستخدام verifyToken بدلاً من الدالة غير الموجودة
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const verification = verifyToken(token);

    // التحقق من أن التوكن صالح وأن المستخدم يحمل رتبة ADMIN
    if (
      !verification.valid ||
      !verification.payload ||
      verification.payload.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 403 });
    }

    const body = await request.json();
    const { name, nameAr, deliveryFee } = body;

    if (!name || !nameAr || deliveryFee === undefined || deliveryFee === null) {
      return NextResponse.json(
        {
          error:
            "يرجى ملء جميع الحقول (الاسم بالإنجليزي، بالعربي، ورسوم التوصيل)",
        },
        { status: 400 },
      );
    }

    // التحقق مما إذا كانت المحافظة موجودة مسبقاً
    const exists = await db.governorate.findFirst({
      where: {
        OR: [{ name }, { nameAr }],
      },
    });

    if (exists) {
      return NextResponse.json(
        { error: "هذه المحافظة موجودة مسبقاً" },
        { status: 400 },
      );
    }

    const governorate = await db.governorate.create({
      data: {
        name,
        nameAr,
        deliveryFee: parseFloat(deliveryFee),
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, governorate });
  } catch (error) {
    console.error("Create governorate error:", error);
    return NextResponse.json({ error: "حدث خطأ في السيرفر" }, { status: 500 });
  }
}
