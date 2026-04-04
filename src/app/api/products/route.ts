import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { sendNotificationToAdmins } from "@/lib/notifications";
import { deleteImageFromImageKit } from "@/lib/upload";


// Get all products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const agentId = searchParams.get("agentId");
    const isFeatured = searchParams.get("isFeatured");
    const all = searchParams.get("all");

    // If "all=true", show all products including inactive ones (for admin)
    const where: Record<string, unknown> = all === "true" ? {} : { isActive: true };

    if (categoryId) where.categoryId = categoryId;
    if (agentId) where.agentId = agentId;
    if (isFeatured === "true") where.isFeatured = true;

    const products = await db.product.findMany({
      where,
      include: {
        category: true,
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Get products error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب المنتجات" },
      { status: 500 }
    );
  }
}

// Create product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      nameAr,
      description,
      descriptionAr,
      price,
      originalPrice,
      mainImage,
      images,
      stock,
      categoryId,
      agentId,
      isFeatured,
      colors,
      sizes,
      videoUrl,
      featuresAr,
      usageAr,
      ingredientsAr,
      inStock,
      estimatedDays,
    } = body;

    const product = await db.product.create({
      data: {
        name,
        nameAr,
        description,
        descriptionAr,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        mainImage,
        images: images || JSON.stringify([mainImage]),
        stock: parseInt(stock) || 0,
        categoryId,
        agentId,
        isFeatured: isFeatured || false,
        colors: typeof colors === 'object' ? JSON.stringify(colors) : colors, // <-- أضفنا هذا السطر لحفظها في القاعدة
        sizes: typeof sizes === 'object' ? JSON.stringify(sizes) : sizes,
        videoUrl,
        featuresAr,
        usageAr,
        ingredientsAr,
        inStock: inStock !== undefined ? inStock : true,
        estimatedDays: estimatedDays ? parseInt(estimatedDays) : null,
      },
    });
    // 1. إشعار الإدارة بوجود منتج جديد
    await sendNotificationToAdmins({
      type: "SYSTEM",
      title: "منتج جديد تمت إضافته 🏷️",
      message: `تم إضافة منتج جديد بعنوان: ${product.nameAr}، يرجى مراجعته.`,
      data: { productId: product.id }
    });

    // 2. تحديث الواجهة الرئيسية للزوار صامتاً
    if (pusherServer) {
      await pusherServer.trigger("tarfah-public-channel", "public-update", {});
    }

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء المنتج" },
      { status: 500 }
    );
  }
}

// Update product
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    const product = await db.product.update({
      where: { id },
      data: {
        ...data,
        price: data.price ? parseFloat(data.price) : undefined,
        originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : null,
        stock: data.stock ? parseInt(data.stock) : undefined,
        colors: typeof data.colors === 'object' ? JSON.stringify(data.colors) : data.colors,
        sizes: typeof data.sizes === 'object' ? JSON.stringify(data.sizes) : data.sizes,
      },
    });

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث المنتج" },
      { status: 500 }
    );
  }
}

// Delete product
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { error: "معرف المنتج مطلوب" },
        { status: 400 }
      );
    }
      // 1. جلب بيانات المنتج للحصول على روابط الصور قبل الحذف
    const productData = await db.product.findUnique({
      where: { id: productId },
      select: { mainImage: true, images: true }
    });

    if (productData) {
      // 2. حذف الصورة الأساسية من السحابة
      if (productData.mainImage) {
        await deleteImageFromImageKit(productData.mainImage);
      }

      // 3. حذف صور المعرض (Gallery) من السحابة
      if (productData.images) {
        try {
          const additionalImages = JSON.parse(productData.images);
          if (Array.isArray(additionalImages)) {
            for (const imgUrl of additionalImages) {
              // تجنب تكرار حذف الصورة الأساسية إذا كانت موجودة في المصفوفة
              if (imgUrl !== productData.mainImage) {
                await deleteImageFromImageKit(imgUrl);
              }
            }
          }
        } catch (e) {
          console.error("Error parsing/deleting gallery images:", e);
        }
      }
    }

    try {
      // محاولة الحذف النهائي من قاعدة البيانات
      await db.product.delete({
        where: { id: productId },
      });
    } catch (error: any) {
      // P2003 هو كود الخطأ الذي يعني وجود طلبات مبيعات مرتبطة بالمنتج
      if (error.code === 'P2003') {
        // في هذه الحالة، نكتفي بإخفاء المنتج فقط للحفاظ على سجل المبيعات
        await db.product.update({
          where: { id: productId },
          data: { isActive: false },
        });
      } else {
        // إذا كان الخطأ شيئاً آخر غير المبيعات، أظهره في السيرفر
        throw error;
      }
    }
    // تحديث الواجهة الرئيسية للزوار صامتاً
    if (pusherServer) {
      await pusherServer.trigger("tarfah-public-channel", "public-update", {});
    }

    return NextResponse.json({ success: true, message: "تم حذف المنتج وصوره نهائياً" });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء حذف المنتج" },
      { status: 500 }
    );
  }
}
