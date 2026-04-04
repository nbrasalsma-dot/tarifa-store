import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// 1. جلب جميع البنرات لعرضها في المتجر أو لوحة التحكم
export async function GET() {
    try {
        const banners = await db.heroBanner.findMany({
            orderBy: { order: 'asc' } // ترتيبها حسب الرقم الذي ستحدده أنت
        });
        return NextResponse.json({ banners });
    } catch (error) {
        console.error("Error fetching banners:", error);
        return NextResponse.json({ error: "حدث خطأ أثناء جلب البنرات" }, { status: 500 });
    }
}

// 2. إضافة بنر جديد من لوحة التحكم
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const banner = await db.heroBanner.create({
            data: {
                title: body.title || "",
                titleAr: body.titleAr || "",
                subtitleAr: body.subtitleAr, // 👈 الحقل الجديد
                description: body.description,
                descriptionAr: body.descriptionAr,
                image: body.image,
                link: body.link,
                ctaAr: body.ctaAr,           // 👈 الحقل الجديد (نص الزر)
                order: parseInt(body.order) || 0,
                isActive: body.isActive ?? true,
            }
        });

        return NextResponse.json({ success: true, banner, message: "تم إضافة البنر بنجاح" });
    } catch (error) {
        console.error("Error creating banner:", error);
        return NextResponse.json({ error: "حدث خطأ أثناء إضافة البنر" }, { status: 500 });
    }
}

// 3. حذف بنر نهائياً
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "معرف البنر مطلوب" }, { status: 400 });
        }

        await db.heroBanner.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: "تم حذف البنر بنجاح" });
    } catch (error) {
        console.error("Error deleting banner:", error);
        return NextResponse.json({ error: "حدث خطأ أثناء حذف البنر" }, { status: 500 });
    }
}