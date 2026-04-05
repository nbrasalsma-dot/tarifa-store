import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        // 1. التحقق الآمن من هوية المستخدم الذي فتح صندوق الوارد
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const verification = verifyToken(token);
        if (!verification.valid) {
            return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 });
        }

        const userId = verification.payload?.userId;
        const userRole = verification.payload?.role;

        if (!userId) {
            return NextResponse.json({ error: "معرف المستخدم غير صالح" }, { status: 400 });
        }

        // ✅ الخطوة الرابعة: تسجيل معلومات المستخدم للتأكد
        console.log("📝 [Inbox API] - userId:", userId);
        console.log("📝 [Inbox API] - userRole:", userRole);

        // 2. بناء شرط البحث بناءً على رتبة المستخدم (هنا يكمن السحر)
        let whereClause: any = {};

        if (userRole === "ADMIN") {
            // الإدارة ترى جميع المحادثات في المتجر (رقابة كاملة)
            whereClause = {};
            console.log("📝 [Inbox API] - ADMIN mode: fetching ALL conversations");
        } else if (userRole === "AGENT" || userRole === "MERCHANT") {
            // المندوب أو التاجر يرى المحادثات التي هو الوكيل فيها فقط
            whereClause = {
                agentId: userId
            };
            console.log("📝 [Inbox API] - AGENT/MERCHANT mode: fetching conversations where agentId =", userId);
        } else {
            // العميل يرى المحادثات التي هو العميل فيها فقط
            whereClause = {
                customerId: userId
            };
            console.log("📝 [Inbox API] - CUSTOMER mode: fetching conversations where customerId =", userId);
        }

        // 3. جلب المحادثات مع بيانات الطرفين (العميل والموظف)
        const conversations = await db.conversation.findMany({
            where: whereClause,
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                    }
                },
                agent: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                    }
                },
                // جلب آخر رسالة فقط لعرضها كنبذة في القائمة
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                }
            },
            orderBy: { updatedAt: "desc" }, // الترتيب حسب الأحدث
        });

        // ✅ الخطوة الرابعة: تسجيل عدد المحادثات التي تم العثور عليها
        console.log("📝 [Inbox API] - Found conversations count:", conversations.length);

        // تسجيل أول محادثة للتأكد من البيانات
        if (conversations.length > 0) {
            console.log("📝 [Inbox API] - First conversation - ID:", conversations[0].id);
            console.log("📝 [Inbox API] - First conversation - customerId:", conversations[0].customerId);
            console.log("📝 [Inbox API] - First conversation - agentId:", conversations[0].agentId);
            console.log("📝 [Inbox API] - First conversation - customer name:", conversations[0].customer?.name);
            console.log("📝 [Inbox API] - First conversation - agent name:", conversations[0].agent?.name);
        }

        return NextResponse.json({ conversations });
    } catch (error) {
        console.error("❌ [Inbox API] Error fetching inbox:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}