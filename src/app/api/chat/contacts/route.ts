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

        // ✅ الخطوة الخامسة: تسجيل معلومات المستخدم
        console.log("📝 [Contacts API] - userId:", userId);
        console.log("📝 [Contacts API] - currentUserRole:", currentUserRole);

        const { searchParams } = new URL(request.url);
        const searchQuery = searchParams.get("search")?.trim();

        // 2. بناء شرط البحث الأساسي (الموظفون يظهرون للكل دائماً)
        let whereClause: any = {
            role: { in: ["ADMIN", "AGENT", "MERCHANT"] },
            isActive: true,
        };

        // ✅ الخطوة الخامسة: تسجيل الأدوار المطلوبة
        console.log("📝 [Contacts API] - Base whereClause roles:", ["ADMIN", "AGENT", "MERCHANT"]);

        // إذا كان هناك مستخدم مسجل، لا يظهر نفسه في القائمة
        if (userId) {
            whereClause.id = { not: userId };
            console.log("📝 [Contacts API] - Excluding self (userId:", userId, ")");
        }

        // 3. إذا كان المستخدم موظفاً (إدارة/مندوب/تاجر) وقام بالبحث، نفتح له البحث في العملاء
        if (searchQuery && ["ADMIN", "AGENT", "MERCHANT"].includes(currentUserRole)) {
            console.log("📝 [Contacts API] - Search mode enabled for role:", currentUserRole);
            console.log("📝 [Contacts API] - Search query:", searchQuery);

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

        // ✅ الخطوة الخامسة: تسجيل عدد جهات الاتصال التي تم العثور عليها
        console.log("📝 [Contacts API] - Found contacts count:", contacts.length);

        // ✅ الخطوة الخامسة: تسجيل الأدوار الموجودة في النتائج
        const rolesFound = contacts.map(c => c.role);
        const uniqueRoles = [...new Set(rolesFound)];
        console.log("📝 [Contacts API] - Roles found in results:", uniqueRoles);

        // ✅ الخطوة الخامسة: تسجيل أسماء وأدوار أول 5 جهات اتصال للتأكد
        if (contacts.length > 0) {
            console.log("📝 [Contacts API] - Sample contacts (first 5):");
            contacts.slice(0, 5).forEach((contact, index) => {
                console.log(`  ${index + 1}. ${contact.name} (${contact.role})`);
            });
        }

        return NextResponse.json({ contacts });
    } catch (error) {
        console.error("❌ [Contacts API] Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}