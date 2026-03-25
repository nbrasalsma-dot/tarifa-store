import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const updatedUser = await db.user.updateMany({
            where: { email: 'nbrask711@gmail.com' },
            data: {
                role: 'ADMIN',
                isVerified: true
            }
        });

        if (updatedUser.count > 0) {
            return NextResponse.json({
                status: "success",
                message: "Account promoted to ADMIN successfully"
            });
        } else {
            return NextResponse.json({
                status: "error",
                message: "User not found"
            });
        }
    } catch (error: any) {
        return NextResponse.json({
            status: "error",
            message: error.message
        }, { status: 500 });
    }
}