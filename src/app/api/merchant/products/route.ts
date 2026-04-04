import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import jwt from "jsonwebtoken";
export const dynamic = "force-dynamic";
import { deleteImageFromImageKit } from "@/lib/upload";

// GET - جلب منتجات التاجر
export async function GET(request: NextRequest) {
    try {
        // التحقق من التوكن
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { success: false, error: "غير مصرح" },
                { status: 401 }
            );
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as {
            userId: string;
            role: string;
        };

        // التحقق من أن المستخدم تاجر
        if (decoded.role !== "MERCHANT") {
            return NextResponse.json(
                { success: false, error: "هذه الميزة للتاجر فقط" },
                { status: 403 }
            );
        }

        // جلب بيانات التاجر
        const merchant = await db.merchant.findFirst({
            where: { userId: decoded.userId },
        });

        if (!merchant) {
            return NextResponse.json(
                { success: false, error: "لم يتم العثور على بيانات التاجر" },
                { status: 404 }
            );
        }

        // جلب منتجات التاجر
        const products = await db.product.findMany({
            where: { merchantId: merchant.id },
            include: {
                category: {
                    select: { id: true, name: true, nameAr: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({
            success: true,
            products,
        });
    } catch (error) {
        console.error("Merchant products error:", error);
        return NextResponse.json(
            { success: false, error: "حدث خطأ في الخادم" },
            { status: 500 }
        );
    }
}

// POST - إضافة منتج جديد
export async function POST(request: NextRequest) {
    try {
        // التحقق من التوكن
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { success: false, error: "غير مصرح" },
                { status: 401 }
            );
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as {
            userId: string;
            role: string;
        };

        // التحقق من أن المستخدم تاجر
        if (decoded.role !== "MERCHANT") {
            return NextResponse.json(
                { success: false, error: "هذه الميزة للتاجر فقط" },
                { status: 403 }
            );
        }

        // جلب بيانات التاجر
        const merchant = await db.merchant.findFirst({
            where: { userId: decoded.userId },
        });

        if (!merchant) {
            return NextResponse.json(
                { success: false, error: "لم يتم العثور على بيانات التاجر" },
                { status: 404 }
            );
        }

        // التحقق من موافقة الإدارة
        if (!merchant.isApproved) {
            return NextResponse.json(
                { success: false, error: "لم يتم تفعيل حسابك بعد" },
                { status: 403 }
            );
        }

        // جلب البيانات من الطلب
        const body = await request.json();
        const {
            name,
            nameAr,
            description,
            descriptionAr,
            price,
            originalPrice,
            images,
            mainImage,
            stock,
            sku,
            colors,
            inStock,
            estimatedDays,
            categoryId,
        } = body;

        // التحقق من البيانات المطلوبة
        if (!name || !nameAr || !price || !mainImage) {
            return NextResponse.json(
                { success: false, error: "يرجى ملء جميع الحقول المطلوبة" },
                { status: 400 }
            );
        }

        // إنشاء المنتج
        const product = await db.product.create({
            data: {
                name,
                nameAr,
                description,
                descriptionAr,
                price: parseFloat(price),
                originalPrice: originalPrice ? parseFloat(originalPrice) : null,
                images: images || "[]",
                mainImage,
                stock: stock ? parseInt(stock) : 0,
                sku,
                colors,
                inStock: inStock !== undefined ? inStock : true,
                estimatedDays: estimatedDays ? parseInt(estimatedDays) : null,
                categoryId,
                agentId: decoded.userId, // التاجر هو نفسه المندوب
                merchantId: merchant.id,
            },
        });

        return NextResponse.json({
            success: true,
            product,
            message: "تم إضافة المنتج بنجاح",
        });
    } catch (error) {
        console.error("Create product error:", error);
        return NextResponse.json(
            { success: false, error: "حدث خطأ في الخادم" },
            { status: 500 }
        );
    }
}

// PUT - تحديث منتج
export async function PUT(request: NextRequest) {
    try {
        // التحقق من التوكن
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { success: false, error: "غير مصرح" },
                { status: 401 }
            );
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as {
            userId: string;
            role: string;
        };

        // التحقق من أن المستخدم تاجر
        if (decoded.role !== "MERCHANT") {
            return NextResponse.json(
                { success: false, error: "هذه الميزة للتاجر فقط" },
                { status: 403 }
            );
        }

        // جلب بيانات التاجر
        const merchant = await db.merchant.findFirst({
            where: { userId: decoded.userId },
        });

        if (!merchant) {
            return NextResponse.json(
                { success: false, error: "لم يتم العثور على بيانات التاجر" },
                { status: 404 }
            );
        }

        // جلب البيانات من الطلب
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: "معرف المنتج مطلوب" },
                { status: 400 }
            );
        }

        // التحقق من أن المنتج يتبع للتاجر
        const existingProduct = await db.product.findFirst({
            where: { id, merchantId: merchant.id },
        });

        if (!existingProduct) {
            return NextResponse.json(
                { success: false, error: "المنتج غير موجود" },
                { status: 404 }
            );
        }

        // تحديث المنتج
        const updatedProduct = await db.product.update({
            where: { id },
            data: {
                name: updateData.name,
                nameAr: updateData.nameAr,
                description: updateData.description,
                descriptionAr: updateData.descriptionAr,
                price: updateData.price ? parseFloat(updateData.price) : undefined,
                originalPrice: updateData.originalPrice ? parseFloat(updateData.originalPrice) : null,
                images: updateData.images,
                mainImage: updateData.mainImage,
                stock: updateData.stock ? parseInt(updateData.stock) : undefined,
                sku: updateData.sku,
                colors: updateData.colors,
                inStock: updateData.inStock,
                estimatedDays: updateData.estimatedDays ? parseInt(updateData.estimatedDays) : null,
                categoryId: updateData.categoryId,
                isActive: updateData.isActive,
                isFeatured: updateData.isFeatured,
            },
        });

        return NextResponse.json({
            success: true,
            product: updatedProduct,
            message: "تم تحديث المنتج بنجاح",
        });
    } catch (error) {
        console.error("Update product error:", error);
        return NextResponse.json(
            { success: false, error: "حدث خطأ في الخادم" },
            { status: 500 }
        );
    }
}

// DELETE - حذف منتج نهائياً من قاعدة البيانات ومن السحاب (ImageKit)
export async function DELETE(request: NextRequest) {
    try {
        // 1. التحقق من التوكن (Authorization)
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { success: false, error: "غير مصرح" },
                { status: 401 }
            );
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as {
            userId: string;
            role: string;
        };

        // 2. التحقق من أن المستخدم تاجر (MERCHANT)
        if (decoded.role !== "MERCHANT") {
            return NextResponse.json(
                { success: false, error: "هذه الميزة للتاجر فقط" },
                { status: 403 }
            );
        }

        // 3. جلب بيانات التاجر من قاعدة البيانات
        const merchant = await db.merchant.findFirst({
            where: { userId: decoded.userId },
        });

        if (!merchant) {
            return NextResponse.json(
                { success: false, error: "لم يتم العثور على بيانات التاجر" },
                { status: 404 }
            );
        }

        // 4. جلب معرف المنتج من روابط الطلب (URL Params)
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get("id");

        if (!productId) {
            return NextResponse.json(
                { success: false, error: "معرف المنتج مطلوب" },
                { status: 400 }
            );
        }

        // 5. التحقق من وجود المنتج ومن ملكية التاجر له (لضمان الأمان)
        const existingProduct = await db.product.findFirst({
            where: {
                id: productId,
                merchantId: merchant.id
            },
            select: {
                id: true,
                mainImage: true,
                images: true
            }
        });

        if (!existingProduct) {
            return NextResponse.json(
                { success: false, error: "المنتج غير موجود أو لا تملك صلاحية حذفه" },
                { status: 404 }
            );
        }

        // 6. حذف الصور من سحابة ImageKit (بما أننا تأكدنا من ملكية المنتج)

        // أ - حذف الصورة الأساسية
        if (existingProduct.mainImage) {
            await deleteImageFromImageKit(existingProduct.mainImage);
        }

        // ب - حذف صور المعرض (Gallery)
        if (existingProduct.images) {
            try {
                // تحويل النصوص المخزنة إلى مصفوفة صور
                const additionalImages = JSON.parse(existingProduct.images);
                if (Array.isArray(additionalImages)) {
                    for (const imgUrl of additionalImages) {
                        // نتأكد من عدم تكرار حذف الصورة الأساسية إذا كانت موجودة في المصفوفة
                        if (imgUrl !== existingProduct.mainImage) {
                            await deleteImageFromImageKit(imgUrl);
                        }
                    }
                }
            } catch (e) {
                console.error("Error deleting gallery images from cloud:", e);
            }
        }

        try {
            // محاولة الحذف النهائي للسجل من قاعدة البيانات
            await db.product.delete({
                where: { id: productId },
            });
        } catch (error: any) {
            // P2003 تعني أن المنتج مرتبط بطلبات شراء ولا يمكن حذفه نهائياً
            if (error.code === 'P2003') {
                // بدلاً من الحذف، نقوم فقط بإخفاء المنتج من المتجر
                await db.product.update({
                    where: { id: productId },
                    data: { isActive: false },
                });
            } else {
                // إذا كان الخطأ شيئاً آخر، نطلبه من السيرفر إظهاره
                throw error;
            }
        }

        // 8. تحديث الواجهة اللحظية للمتجر (Pusher) لكي يختفي المنتج فوراً عند الزوار
        try {
            const { pusherServer } = await import("@/lib/pusher");
            if (pusherServer) {
                await pusherServer.trigger("tarfah-public-channel", "public-update", {});
            }
        } catch (pusherError) {
            console.error("Pusher update error:", pusherError);
        }

        // 9. إرسال استجابة النجاح
        return NextResponse.json({
            success: true,
            message: "تمت عملية الحذف بنجاح (تم مسح الصور وإخفاء المنتج نهائياً من المتجر)",
        });

    } catch (error) {
        console.error("Delete product error:", error);
        return NextResponse.json(
            { success: false, error: "حدث خطأ في الخادم أثناء عملية الحذف" },
            { status: 500 }
        );
    }
}