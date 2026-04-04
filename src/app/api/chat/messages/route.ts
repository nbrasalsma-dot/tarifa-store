import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { sendNotificationToUser } from "@/lib/notifications";
import { verifyToken } from "@/lib/security";

export const dynamic = "force-dynamic";

// --- 1. إرسال رسالة جديدة (آمنة تماماً) ---
export async function POST(request: NextRequest) {
    try {
        // التحقق من الهوية عبر التوكن
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'غير مصرح: يرجى تسجيل الدخول' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const verification = verifyToken(token);

        if (!verification.valid || !verification.payload) {
            return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 });
        }

        // الهوية الحقيقية المستخرجة من التوكن
        const authenticatedUserId = verification.payload.userId;

        const body = await request.json();
        const { conversationId, content, productImage } = body;

        if (!conversationId || !content) {
            return NextResponse.json({ error: "بيانات الرسالة ناقصة" }, { status: 400 });
        }

        // إنشاء الرسالة باستخدام الـ ID الموثق من التوكن
        const message = await db.message.create({
            data: {
                conversationId,
                senderId: authenticatedUserId, // حماية: نستخدم المعرف الموثق
                content,
                productImage,
            },
            include: {
                sender: {
                    select: { id: true, name: true, role: true }
                }
            }
        });

        // تحديث المحادثة وجلب أطرافها للإشعارات
        const conversation = await db.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
            include: {
                customer: { select: { id: true, name: true } },
                agent: { select: { id: true, name: true } }
            }
        });

        // تفعيل اللحظية عبر Pusher
        await pusherServer.trigger(conversationId, "new-message", message);

        // تحديد المستلم لإرسال إشعار
        const recipientId = authenticatedUserId === conversation.customerId
            ? (conversation.agentId || "ADMIN") 
            : conversation.customerId;

        if (recipientId !== "ADMIN") {
            await sendNotificationToUser({
                userId: recipientId,
                type: "NEW_MESSAGE",
                title: `رسالة جديدة من ${message.sender.name}`,
                message: content.length > 50 ? content.substring(0, 50) + "..." : content,
                data: { conversationId, senderId: authenticatedUserId }
            });
        }

        return NextResponse.json({ success: true, message });
    } catch (error) {
        console.error("Error saving message:", error);
        return NextResponse.json({ error: "فشل في إرسال الرسالة" }, { status: 500 });
    }
}

// --- 2. جلب رسائل المحادثة (آمنة) ---
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const conversationId = searchParams.get("conversationId");

        if (!conversationId) {
            return NextResponse.json({ error: "رقم المحادثة مطلوب" }, { status: 400 });
        }

        // حماية إضافية: التحقق من أن المستخدم طرف في هذه المحادثة (اختياري ولكن فخم)
        const authHeader = request.headers.get('authorization');
        if (authHeader) {
            const token = authHeader.substring(7);
            const verification = verifyToken(token);
            
            if (verification.valid && verification.payload) {
                const userId = verification.payload.userId;
                const userRole = verification.payload.role;

                // إذا لم يكن أدمن، نتأكد أنه طرف في المحادثة
                if (userRole !== "ADMIN") {
                    const conv = await db.conversation.findUnique({
                        where: { id: conversationId }
                    });
                    if (conv && conv.customerId !== userId && conv.agentId !== userId) {
                        return NextResponse.json({ error: "غير مصرح لك برؤية هذه الرسائل" }, { status: 403 });
                    }
                }
            }
        }

        const messages = await db.message.findMany({
            where: { conversationId },
            include: {
                sender: {
                    select: { id: true, name: true, role: true }
                }
            },
            orderBy: { createdAt: "asc" },
            take: 100,
        });

        return NextResponse.json({ messages });
    } catch (error) {
        console.error("Error fetching messages:", error);
        return NextResponse.json({ error: "فشل في جلب الرسائل" }, { status: 500 });
    }
}