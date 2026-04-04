import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { verifyToken } from "@/lib/security";
import { sendNotificationToUser } from "@/lib/notifications"; // 👈 استدعاء نظام الإشعارات الرسمي

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. التفتيش الأمني (التحقق من الهوية)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "غير مصرح: يرجى تسجيل الدخول" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const verification = verifyToken(token);
    if (!verification.valid || !verification.payload) {
      return NextResponse.json({ error: "جلسة منتهية، سجل دخولك" }, { status: 401 });
    }

    const authenticatedUserId = verification.payload.userId;
    const body = await request.json();
    const { productId, agentId } = body;

    // 2. البحث عن محادثة قائمة أو إنشاؤها
    let conversation = await db.conversation.findFirst({
      where: {
        customerId: authenticatedUserId,
        agentId: agentId || undefined,
        status: "ACTIVE",
      },
      include: {
        messages: { orderBy: { createdAt: "asc" }, take: 20 },
        agent: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } }
      },
    });

    // إذا كانت محادثة جديدة تماماً
    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          customerId: authenticatedUserId,
          agentId: agentId,
          status: "ACTIVE",
        },
        include: {
          messages: true,
          agent: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } }
        },
      });

      // 🔔 إشعار "محادثة جديدة" للموظف (يعمل في الخلفية لسرعة الرد)
      const targetNotifyId = agentId || "ADMIN";
      sendNotificationToUser({
        userId: targetNotifyId,
        type: "NEW_MESSAGE",
        title: "محادثة جديدة 💬",
        message: `العميل ${conversation.customer.name} بدأ محادثة معك الآن`,
        data: { conversationId: conversation.id }
      }).catch(console.error);

      // تنبيه Pusher للإدارة
      pusherServer.trigger("admin-notifications", "new-conversation", {
        conversationId: conversation.id,
        customerName: conversation.customer.name,
      }).catch(console.error);
    }

    // 3. معالجة الاستفسار عن المنتج (الرسالة الآلية)
    if (productId) {
      const product = await db.product.findUnique({ where: { id: productId } });
      
      if (product) {
        // فحص لمنع تكرار إرسال نفس المنتج في كل مرة يفتح فيها الشات
        const lastMsg = await db.message.findFirst({
          where: { conversationId: conversation.id },
          orderBy: { createdAt: 'desc' }
        });

        if (!lastMsg || !lastMsg.content.includes(product.nameAr)) {
          const autoMessage = await db.message.create({
            data: {
              conversationId: conversation.id,
              senderId: authenticatedUserId,
              content: `استفسار بخصوص المنتج: ${product.nameAr}`,
              productImage: product.mainImage,
            },
            include: {
              sender: { select: { id: true, name: true, role: true } }
            }
          });

          // تحديث الواجهة فوراً عبر Pusher
          pusherServer.trigger(conversation.id, "new-message", autoMessage).catch(console.error);
          
          // 🔔 إرسال إشعار للموظف يخبره عن المنتج المستهدف
          const targetNotifyId = agentId || "ADMIN";
          sendNotificationToUser({
            userId: targetNotifyId,
            type: "NEW_MESSAGE",
            title: `استفسار عن: ${product.nameAr}`,
            message: `العميل ${conversation.customer.name} يستفسر عن منتجك`,
            data: { conversationId: conversation.id, productId }
          }).catch(console.error);
          
          conversation.messages.push(autoMessage as any);
        }
      }
    }

    // 4. الرد النهائي الفوري
    return NextResponse.json({ conversation });

  } catch (error) {
    console.error("Conversation API Error:", error);
    return NextResponse.json({ error: "حدث خطأ في السيرفر" }, { status: 500 });
  }
}