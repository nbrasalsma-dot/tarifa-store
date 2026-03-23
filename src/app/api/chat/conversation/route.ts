import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Get or create conversation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, productId } = body;

    // Find or create an active conversation
    let conversation = await db.conversation.findFirst({
      where: {
        customerId,
        status: "ACTIVE",
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 50,
        },
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!conversation) {
      // Find an available agent
      const agent = await db.user.findFirst({
        where: {
          role: "AGENT",
          isActive: true,
        },
      });

      if (!agent) {
        // Use admin as fallback
        const admin = await db.user.findFirst({
          where: { role: "ADMIN" },
        });

        if (!admin) {
          return NextResponse.json(
            { error: "No support agent available" },
            { status: 503 }
          );
        }

        conversation = await db.conversation.create({
          data: {
            customerId,
            agentId: admin.id,
            productId,
            status: "ACTIVE",
          },
          include: {
            messages: true,
            agent: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      } else {
        conversation = await db.conversation.create({
          data: {
            customerId,
            agentId: agent.id,
            productId,
            status: "ACTIVE",
          },
          include: {
            messages: true,
            agent: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      }
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}
