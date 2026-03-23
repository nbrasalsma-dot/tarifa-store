import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Get dashboard stats
export async function GET(request: NextRequest) {
  try {
    // Get counts
    const [
      totalUsers,
      totalCustomers,
      totalAgents,
      totalProducts,
      totalOrders,
      pendingOrders,
      processingOrders,
      completedOrders,
      totalRevenue,
      recentOrders,
      recentUsers,
    ] = await Promise.all([
      // Total users
      db.user.count(),
      // Total customers
      db.user.count({ where: { role: "CUSTOMER" } }),
      // Total agents
      db.user.count({ where: { role: "AGENT" } }),
      // Total products
      db.product.count({ where: { isActive: true } }),
      // Total orders
      db.order.count(),
      // Pending orders
      db.order.count({ where: { status: "PENDING" } }),
      // Processing orders
      db.order.count({ where: { status: "PROCESSING" } }),
      // Completed orders
      db.order.count({ where: { status: "DELIVERED" } }),
      // Total revenue
      db.order.aggregate({
        where: { status: "DELIVERED" },
        _sum: { totalAmount: true },
      }),
      // Recent orders
      db.order.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: { name: true, email: true },
          },
        },
      }),
      // Recent users
      db.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
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
        revenue: totalRevenue._sum.totalAmount || 0,
      },
      recentOrders,
      recentUsers,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب الإحصائيات" },
      { status: 500 }
    );
  }
}
