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

        // 2. بناء شرط البحث بناءً على رتبة المستخدم (هنا يكمن السحر)
        let whereClause: any = {};

        if (userRole === "ADMIN") {
            // الإدارة ترى جميع المحادثات في المتجر (رقابة كاملة)
            whereClause = {};
        } else {
            // الموظفون (والعملاء) يرون المحادثات التي يكونون طرفاً فيها فقط
            whereClause = {
                OR: [
                    { agentId: userId },     // إذا كان هو الموظف الذي يرد
                    { customerId: userId }   // إذا كان هو من بدأ المحادثة
                ]
            };
        }

        // 3. جلب المحادثات مع بيانات الطرفين (العميل والموظف) لكي تعرف الإدارة من يكلم من
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

        return NextResponse.json({ conversations });
    } catch (error) {
        console.error("Error fetching inbox:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}