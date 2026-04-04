import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import jwt from "jsonwebtoken";
export const dynamic = "force-dynamic";

// GET - جلب إعدادات التاجر
export async function GET(request: NextRequest) {
    try {
        // التحقق من التوكن
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { success: false, error: "غير مصرح" },
                { status: 401 }
            );
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as {
            userId: string;
            role: string;
        };

        // التحقق من أن المستخدم تاجر
        if (decoded.role !== "MERCHANT") {
            return NextResponse.json(
                { success: false, error: "هذه الميزة للتاجر فقط" },
                { status: 403 }
            );
        }

        // جلب بيانات التاجر
        const merchant = await db.merchant.findFirst({
            where: { userId: decoded.userId },
            select: {
                id: true,
                storeName: true,
                storeType: true,
                fullName: true,
                phone: true,
                email: true,
                address: true,
                jeibWallet: true,
                kashWallet: true,
                jawaliWallet: true,
                transferInfo: true,
                commissionAmount: true,
                isApproved: true,
                isActive: true,
            },
        });

        if (!merchant) {
            return NextResponse.json(
                { success: false, error: "لم يتم العثور على بيانات التاجر" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            settings: merchant,
        });
    } catch (error) {
        console.error("Merchant settings error:", error);
        return NextResponse.json(
            { success: false, error: "حدث خطأ في الخادم" },
            { status: 500 }
        );
    }
}

// PUT - تحديث إعدادات التاجر
export async function PUT(request: NextRequest) {
    try {
        // التحقق من التوكن
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { success: false, error: "غير مصرح" },
                { status: 401 }
            );
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as {
            userId: string;
            role: string;
        };

        // التحقق من أن المستخدم تاجر
        if (decoded.role !== "MERCHANT") {
            return NextResponse.json(
                { success: false, error: "هذه الميزة للتاجر فقط" },
                { status: 403 }
            );
        }

        // جلب البيانات من الطلب
        const body = await request.json();
        const {
            storeName,
            storeType,
            fullName,
            phone,
            email,
            address,
            jeibWallet,
            kashWallet,
            jawaliWallet,
            transferInfo,
        } = body;

        // التحقق من وجود التاجر
        const existingMerchant = await db.merchant.findFirst({
            where: { userId: decoded.userId },
        });

        if (!existingMerchant) {
            return NextResponse.json(
                { success: false, error: "لم يتم العثور على بيانات التاجر" },
                { status: 404 }
            );
        }

        // تحديث الإعدادات
        const updatedMerchant = await db.merchant.update({
            where: { id: existingMerchant.id },
            data: {
                storeName,
                storeType,
                fullName,
                phone,
                email,
                address,
                jeibWallet,
                kashWallet,
                jawaliWallet,
                transferInfo,
            },
            select: {
                id: true,
                storeName: true,
                storeType: true,
                fullName: true,
                phone: true,
                email: true,
                address: true,
                jeibWallet: true,
                kashWallet: true,
                jawaliWallet: true,
                transferInfo: true,
                commissionAmount: true,
                isApproved: true,
                isActive: true,
            },
        });

        return NextResponse.json({
            success: true,
            settings: updatedMerchant,
            message: "تم حفظ الإعدادات بنجاح",
        });
    } catch (error) {
        console.error("Update settings error:", error);
        return NextResponse.json(
            { success: false, error: "حدث خطأ في الخادم" },
            { status: 500 }
        );
    }
}