import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import jwt from "jsonwebtoken";
export const dynamic = "force-dynamic"; // 👈 هذا السطر يمنع الكاش تماماً

// GET - جلب إحصائيات التاجر
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
            select: { id: true },
        });

        const productIds = products.map((p) => p.id);

        // جلب الطلبات التي تحتوي على منتجات التاجر
        const orderItems = await db.orderItem.findMany({
            where: {
                productId: { in: productIds },
            },
            include: {
                order: {
                    include: {
                        customer: {
                            select: { name: true, email: true, phone: true },
                        },
                    },
                },
                product: {
                    select: { name: true, nameAr: true },
                },
            },
        });

        // حساب الإحصائيات
        const totalProducts = products.length;
        const uniqueOrders = new Set(orderItems.map((item) => item.orderId));
        const totalOrders = uniqueOrders.size;

        // حساب إجمالي المبيعات
        const totalSales = orderItems.reduce((sum, item) => {
            return sum + item.price * item.quantity;
        }, 0);

        // حساب العمولة
        const commissionRate = merchant.commissionAmount / 100;
        const totalCommission = totalSales * commissionRate;
        const netProfit = totalSales - totalCommission;

        // الطلبات قيد الانتظار
        const pendingOrders = orderItems.filter(
            (item) => item.order.status === "PENDING"
        ).length;

        const stats = {
            totalProducts,
            totalOrders,
            totalSales,
            totalCommission,
            netProfit,
            pendingOrders,
        };

        return NextResponse.json({
            success: true,
            stats,
        });
    } catch (error) {
        console.error("Merchant stats error:", error);
        return NextResponse.json(
            { success: false, error: "حدث خطأ في الخادم" },
            { status: 500 }
        );
    }
}