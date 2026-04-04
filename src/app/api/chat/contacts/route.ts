import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. محاولة قراءة التوكن (إن وجد)
    const authHeader = request.headers.get('authorization');
    let userId = null;
    let currentUserRole = "GUEST"; // افتراضياً هو زائر

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const verification = verifyToken(token);
      if (verification.valid) {
        userId = verification.payload?.userId;
        currentUserRole = verification.payload?.role || "GUEST";
      }
    }

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get("search")?.trim();

    // 2. بناء شرط البحث الأساسي (الموظفون يظهرون للكل دائماً)
    let whereClause: any = {
      role: { in: ["ADMIN", "AGENT", "MERCHANT"] },
      isActive: true,
    };

    // إذا كان هناك مستخدم مسجل، لا يظهر نفسه في القائمة
    if (userId) {
      whereClause.id = { not: userId };
    }

    // 3. إذا كان المستخدم موظفاً (إدارة/مندوب/تاجر) وقام بالبحث، نفتح له البحث في العملاء
    if (searchQuery && ["ADMIN", "AGENT", "MERCHANT"].includes(currentUserRole)) {
      whereClause = {
        OR: [
          {
            name: { contains: searchQuery, mode: 'insensitive' },
            role: { in: ["ADMIN", "AGENT", "MERCHANT"] }
          },
          {
            name: { contains: searchQuery, mode: 'insensitive' },
            role: "CUSTOMER"
          }
        ],
        isActive: true,
        id: userId ? { not: userId } : undefined
      };
    }

    const contacts = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
      },
      orderBy: { name: "asc" },
      take: searchQuery ? 20 : 50,
    });

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error("Contacts API Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}