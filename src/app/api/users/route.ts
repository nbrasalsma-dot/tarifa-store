import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  userId: z.string(),
  name: z.string().min(2).optional(),
  phone: z.string().min(6).optional(),
  address: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
  role: z.enum(["ADMIN", "AGENT", "CUSTOMER"]).optional(),
});

// Get all users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    const where: Record<string, string> = {};
    if (role) where.role = role;

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        role: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            products: true,
            orders: true,
            messages: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب المستخدمين" },
      { status: 500 }
    );
  }
}

// Update user
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = updateSchema.parse(body);

    const { userId, ...data } = validated;

    const user = await db.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        role: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث المستخدم" },
      { status: 500 }
    );
  }
}
