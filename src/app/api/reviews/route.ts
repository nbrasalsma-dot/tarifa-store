import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";

// 1. جلب التعليقات (للزوار والجميع)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get("productId");

        if (!productId) {
            return NextResponse.json({ error: "معرف المنتج مطلوب" }, { status: 400 });
        }

        const reviews = await db.review.findMany({
            where: { productId, isActive: true },
            include: {
                user: { select: { name: true } }
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json({ reviews });
    } catch (error) {
        return NextResponse.json({ error: "فشل جلب التعليقات" }, { status: 500 });
    }
}

// 2. إضافة تقييم وإرسال إشعارات مفصلة
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { productId, userId, rating, comment } = body;

        const review = await db.review.create({
            data: {
                productId,
                userId,
                rating: parseInt(rating),
                comment,
            },
            include: {
                user: { select: { name: true } },
                product: { select: { id: true, nameAr: true, merchantId: true, agentId: true } }
            }
        });

        // جلب الإدارة
        const admins = await db.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });

        // نص الإشعار الاحترافي الذي سيظهر في السجل
        const notificationMessage = `قيم (${review.user.name}) منتج [${review.product.nameAr}] بـ ${rating} نجوم: "${comment || 'بدون تعليق'}"`;

        const notifications = [];

        // إشعارات الإدارة
        admins.forEach(admin => {
            notifications.push({
                userId: admin.id,
                type: 'NEW_RATING',
                title: '⭐ تقييم جديد للمراجعة',
                message: notificationMessage,
                data: JSON.stringify({ productId: review.product.id, reviewId: review.id })
            });
        });

        // إشعار صاحب المنتج (تاجر)
        if (review.product.merchantId) {
            const merchant = await db.merchant.findUnique({ where: { id: review.product.merchantId }, select: { userId: true } });
            if (merchant) {
                notifications.push({
                    userId: merchant.userId,
                    type: 'NEW_RATING',
                    title: '🎉 تقييم جديد لمنتجك',
                    message: notificationMessage,
                    data: JSON.stringify({ productId: review.product.id, reviewId: review.id })
                });
            }
        }

        if (notifications.length > 0) {
            await db.notification.createMany({ data: notifications });
        }

        return NextResponse.json({ success: true, review });
    } catch (error) {
        console.error("POST Review Error:", error);
        return NextResponse.json({ error: "فشل العملية" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const { reviewId } = body;

        // جلب المستخدم من التوكن مباشرة للأمان (بدل إرسال الـ ID في الرابط)
        const user = await verifyAuth(request);

        if (!reviewId || !user) {
            return NextResponse.json({ error: "بيانات غير مكتملة أو غير مصرح لك" }, { status: 401 });
        }

        const review = await db.review.findUnique({
            where: { id: reviewId },
            include: { product: true }
        });

        if (!review) return NextResponse.json({ error: "التقييم غير موجود" }, { status: 404 });

        // التحقق من الصلاحيات
        const isAdmin = user.role === 'ADMIN';
        const isOwnerMerchant = user.role === 'MERCHANT' && review.product.merchantId === user.merchant?.id;

        if (isAdmin || isOwnerMerchant) {
            await db.review.delete({ where: { id: reviewId } });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "لا تملك صلاحية الحذف" }, { status: 403 });
    } catch (error) {
        console.error("🔥 سبب الخطأ 500 هو:", error); // هذا السطر بيكشف لنا المشكلة الحقيقية
        return NextResponse.json({ error: "فشل في السيرفر" }, { status: 500 });
    }
}