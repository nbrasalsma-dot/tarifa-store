import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { sendNotificationToUser } from "@/lib/notifications";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/accounting/orders/[id]/confirm-payment
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    // فقط ADMIN يمكنه تأكيد أو رفض الدفع
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "غير مصرح لك بهذا الإجراء" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { confirm } = body; // true = تأكيد, false = رفض

    if (typeof confirm !== "boolean") {
      return NextResponse.json(
        { error: "يجب تحديد confirm (true/false)" },
        { status: 400 },
      );
    }

    // جلب الطلب مع تفاصيله
    const order = await db.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: {
              include: {
                merchant: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    if (order.paymentStatus !== "PENDING") {
      return NextResponse.json(
        { error: "لا يمكن تغيير حالة الدفع الحالية" },
        { status: 400 },
      );
    }

    const newPaymentStatus = confirm ? "CONFIRMED" : "REJECTED";

    // تنفيذ التحديث داخل transaction
    const updatedOrder = await db.$transaction(async (tx) => {
      // 1. تحديث حالة الدفع
      const updated = await tx.order.update({
        where: { id },
        data: {
          paymentStatus: newPaymentStatus,
          paymentConfirmedBy: user.id,
          paymentConfirmedAt: new Date(),
        },
        include: {
          customer: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // 2. إذا تم تأكيد الدفع: تسجيل حركة مالية (إيراد) وتحديث مبيعات التاجر
      if (confirm) {
        // تسجيل الحركة المالية في جدول Transaction
        await tx.transaction.create({
          data: {
            referenceNumber: order.id.slice(-8),
            type: "SALE",
            amount: order.totalAmount,
            description: `بيع منتجات - طلب #${order.id.slice(-8)}`,
            orderId: order.id,
          },
        });

        // تحديث مبيعات التاجر (إذا كان الطلب يحتوي على منتجات لتجار)
        for (const item of order.items) {
          const product = item.product;
          if (product.merchantId) {
            const merchant = await tx.merchant.findUnique({
              where: { id: product.merchantId },
            });
            if (merchant) {
              const itemTotal = item.price * item.quantity;
              const commission = itemTotal * (merchant.commissionAmount / 100);
              await tx.merchant.update({
                where: { id: merchant.id },
                data: {
                  totalSales: { increment: itemTotal },
                  totalCommission: { increment: commission },
                },
              });
            }
          }
        }

        // إشعار للعميل بتأكيد الدفع
        await sendNotificationToUser({
          userId: order.customerId,
          type: "PAYMENT_CONFIRMED",
          title: "تم تأكيد الدفع ✅",
          message: `تم تأكيد استلام دفعتك للطلب #${order.id.slice(-8)}. جاري تجهيز طلبك.`,
          data: { orderId: order.id },
        });
      } else {
        // في حالة الرفض: إشعار للعميل
        await sendNotificationToUser({
          userId: order.customerId,
          type: "PAYMENT_REJECTED",
          title: "تنبيه بخصوص الدفع ⚠️",
          message: `عذراً، تم رفض إثبات الدفع للطلب #${order.id.slice(-8)}. يرجى التواصل مع الإدارة.`,
          data: { orderId: order.id },
        });
      }

      return updated;
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: confirm ? "تم تأكيد الدفع بنجاح" : "تم رفض الدفع",
    });
  } catch (error) {
    console.error("Confirm payment error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث حالة الدفع" },
      { status: 500 },
    );
  }
}
