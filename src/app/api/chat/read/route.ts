import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/security";

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const verification = verifyToken(token);
        if (!verification.valid) {
            return NextResponse.json({ error: 'جلسة منتهية' }, { status: 401 });
        }

        const { messageId, conversationId } = await request.json();

        await db.message.update({
            where: { id: messageId },
            data: { isRead: true }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error marking message as read:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}