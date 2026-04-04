import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// 1. جلب جميع الإعلانات الترويجية لعرضها
export async function GET() {
    try {
        const ads = await db.advertisement.findMany({
            orderBy: { createdAt: 'desc' } // الأحدث يظهر أولاً
        });
        return NextResponse.json({ advertisements: ads });
    } catch (error) {
        console.error("Error fetching advertisements:", error);
        return NextResponse.json({ error: "حدث خطأ أثناء جلب الإعلانات" }, { status: 500 });
    }
}

// 2. إضافة إعلان ترويجي جديد
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const ad = await db.advertisement.create({
            data: {
                title: body.title || "",
                titleAr: body.titleAr || "",
                description: body.description,
                descriptionAr: body.descriptionAr,
                price: body.price ? parseFloat(body.price) : null, // 👈 الحقل الجديد (السعر)
                image: body.image,
                link: body.link,
                ctaAr: body.ctaAr,                                 // 👈 الحقل الجديد (نص الزر)
                isActive: body.isActive ?? true,
            }
        });

        return NextResponse.json({ success: true, advertisement: ad, message: "تم إضافة الإعلان بنجاح" });
    } catch (error) {
        console.error("Error creating advertisement:", error);
        return NextResponse.json({ error: "حدث خطأ أثناء إضافة الإعلان" }, { status: 500 });
    }
}

// 3. حذف إعلان نهائياً
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "معرف الإعلان مطلوب" }, { status: 400 });
        }

        await db.advertisement.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: "تم حذف الإعلان بنجاح" });
    } catch (error) {
        console.error("Error deleting advertisement:", error);
        return NextResponse.json({ error: "حدث خطأ أثناء حذف الإعلان" }, { status: 500 });
    }
}