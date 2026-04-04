import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import jwt from "jsonwebtoken";
export const dynamic = "force-dynamic";

// GET - جلب طلبات منتجات التاجر
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

        // جلب عناصر الطلبات التي تحتوي على منتجات التاجر
        const orderItems = await db.orderItem.findMany({
            where: {
                productId: { in: productIds },
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        nameAr: true,
                        mainImage: true,
                        price: true,
                    },
                },
                order: {
                    include: {
                        customer: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                phone: true,
                            },
                        },
                        governorateRel: {
                            select: {
                                id: true,
                                name: true,
                                nameAr: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        // تجميع الطلبات
        const ordersMap = new Map();

        orderItems.forEach((item) => {
            const orderId = item.orderId;
            if (!ordersMap.has(orderId)) {
                ordersMap.set(orderId, {
                    id: orderId,
                    status: item.order.status,
                    totalAmount: item.order.totalAmount,
                    deliveryFee: item.order.deliveryFee,
                    paymentMethod: item.order.paymentMethod,
                    paymentStatus: item.order.paymentStatus,
                    paymentDetails: item.order.paymentDetails,
                    notes: item.order.notes,
                    address: item.order.address,
                    phone: item.order.phone,
                    governorate: item.order.governorate,
                    locationUrl: item.order.locationUrl,
                    createdAt: item.order.createdAt,
                    customer: item.order.customer,
                    governorateRel: item.order.governorateRel,
                    items: [],
                });
            }
            ordersMap.get(orderId).items.push({
                id: item.id,
                productId: item.productId,
                // هنا السر: وضعنا بيانات المنتج داخل كائن product لكي تظهر الصور والأسماء
                product: {
                    nameAr: item.product.nameAr,
                    mainImage: item.product.mainImage,
                },
                quantity: item.quantity,
                price: item.price,
                color: item.color, // حفظ اللون المختار
            });
        });

        const orders = Array.from(ordersMap.values());

        return NextResponse.json({
            success: true,
            orders,
        });
    } catch (error) {
        console.error("Merchant orders error:", error);
        return NextResponse.json(
            { success: false, error: "حدث خطأ في الخادم" },
            { status: 500 }
        );
    }
}