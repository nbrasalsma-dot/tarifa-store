import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    // 1. التحقق من هوية المستخدم وصلاحية الإدارة
    const user = await verifyAuth(req);

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    // 2. جلب الإحصائيات بشكل متسلسل (واحد تلو الآخر) لتجنب خنق الاتصال البطيء
    
    // إحصائيات المستخدمين
    const totalUsers = await db.user.count();
    const totalCustomers = await db.user.count({ where: { role: "CUSTOMER" } });
    const totalAgents = await db.user.count({ where: { role: "AGENT" } });
    
    // إحصائيات المنتجات
    const totalProducts = await db.product.count({ where: { isActive: true } });
    
    // إحصائيات الطلبات
    const totalOrders = await db.order.count();
    const pendingOrders = await db.order.count({ where: { status: "PENDING" } });
    const processingOrders = await db.order.count({ where: { status: "PROCESSING" } });
    const completedOrders = await db.order.count({ where: { status: "DELIVERED" } });

    // حساب إجمالي الإيرادات من الطلبات التي تم تسليمها فقط
    const totalRevenueAggr = await db.order.aggregate({
      _sum: {
        totalAmount: true,
      },
      where: {
        status: "DELIVERED",
      },
    });
    const totalRevenue = totalRevenueAggr._sum.totalAmount || 0;

    // جلب آخر 5 طلبات
    const recentOrders = await db.order.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        customer: {
          select: { name: true, email: true },
        },
      },
    });

    // جلب آخر 5 مستخدمين مسجلين
    const recentUsers = await db.user.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // 3. إرسال النتيجة النهائية بتنسيق منظم
    return NextResponse.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          customers: totalCustomers,
          agents: totalAgents,
        },
        products: totalProducts,
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          processing: processingOrders,
          completed: completedOrders,
        },
        revenue: totalRevenue,
      },
      recentOrders,
      recentUsers,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء جلب الإحصائيات" },
      { status: 500 }
    );
  }
}