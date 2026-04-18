import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import {
  sendNotificationToAdmins,
  sendNotificationToUser,
} from "@/lib/notifications";
import { z } from "zod";

// Validation schema for updating product
const updateProductSchema = z.object({
  name: z.string().min(1, "اسم المنتج مطلوب").optional(),
  nameAr: z.string().min(1, "الاسم العربي مطلوب").optional(),
  price: z.number().min(0, "السعر يجب أن يكون أكبر من أو يساوي 0").optional(),
  costPrice: z
    .number()
    .min(0, "سعر التكلفة يجب أن يكون أكبر من أو يساوي 0")
    .optional()
    .nullable(),
  stock: z.number().min(0, "الكمية يجب أن تكون أكبر من أو يساوي 0").optional(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  mainImage: z
    .string()
    .url("رابط الصورة الرئيسية غير صالح")
    .optional()
    .nullable(),
  descriptionAr: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  lowStockAlert: z.number().min(0).optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/accounting/inventory/[id] - تحديث منتج
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    // جلب المستخدم مع صلاحياته
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { permissions: true, role: true },
    });

    // التحقق من صلاحية manage_inventory
    let hasManageInventory = user.role === "ADMIN";
    if (!hasManageInventory && dbUser?.permissions) {
      try {
        const permissions = JSON.parse(dbUser.permissions);
        hasManageInventory = permissions.includes("manage_inventory");
      } catch (e) {}
    }

    if (!hasManageInventory) {
      return NextResponse.json(
        { error: "غير مصرح لك بإدارة المخزون" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateProductSchema.parse(body);

    // التحقق من وجود المنتج
    const existingProduct = await db.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "المنتج غير موجود" }, { status: 404 });
    }

    // التحقق من التصنيف إذا تم إرساله
    if (validated.categoryId) {
      const category = await db.category.findUnique({
        where: { id: validated.categoryId },
      });
      if (!category) {
        return NextResponse.json(
          { error: "التصنيف غير موجود" },
          { status: 400 },
        );
      }
    }

    // التحقق من المورد إذا تم إرساله
    if (validated.supplierId) {
      const supplier = await db.supplier.findUnique({
        where: { id: validated.supplierId },
      });
      if (!supplier) {
        return NextResponse.json(
          { error: "المورد غير موجود" },
          { status: 400 },
        );
      }
    }

    // تحديث المنتج
    const updatedProduct = await db.product.update({
      where: { id },
      data: {
        ...(validated.name && { name: validated.name }),
        ...(validated.nameAr && { nameAr: validated.nameAr }),
        ...(validated.price !== undefined && { price: validated.price }),
        ...(validated.costPrice !== undefined && {
          costPrice: validated.costPrice,
        }),
        ...(validated.stock !== undefined && { stock: validated.stock }),
        ...(validated.sku !== undefined && { sku: validated.sku }),
        ...(validated.categoryId !== undefined && {
          categoryId: validated.categoryId,
        }),
        ...(validated.supplierId !== undefined && {
          supplierId: validated.supplierId,
        }),
        ...(validated.mainImage !== undefined && {
          mainImage: validated.mainImage,
        }),
        ...(validated.descriptionAr !== undefined && {
          descriptionAr: validated.descriptionAr,
        }),
        ...(validated.isActive !== undefined && {
          isActive: validated.isActive,
        }),
      },
      include: {
        category: { select: { nameAr: true } },
        supplier: { select: { name: true } },
      },
    });

    // إرسال إشعار للإدارة
    await sendNotificationToAdmins({
      type: "SYSTEM",
      title: "✏️ تحديث منتج في المخازن",
      message: `تم تحديث المنتج "${updatedProduct.nameAr}" بواسطة ${user.name}`,
      data: { productId: updatedProduct.id },
    });

    // إرسال إشعار للمورد إذا تم تحديده
    if (updatedProduct.supplierId) {
      const supplier = await db.supplier.findUnique({
        where: { id: updatedProduct.supplierId },
        select: { userId: true, name: true },
      });
      if (supplier?.userId) {
        await sendNotificationToUser({
          userId: supplier.userId,
          type: "SYSTEM",
          title: "✏️ تحديث منتج مرتبط بك",
          message: `تم تحديث بيانات المنتج "${updatedProduct.nameAr}" المرتبط بك كمورد.`,
          data: { productId: updatedProduct.id },
        });
      }
    }

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 },
      );
    }
    console.error("Update product error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث المنتج" },
      { status: 500 },
    );
  }
}
