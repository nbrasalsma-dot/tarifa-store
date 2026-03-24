import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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
      },
    });

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

// Delete product (permanent delete from database)
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

    // First delete any order items that reference this product
    await db.orderItem.deleteMany({
      where: { productId },
    });

    // Then delete the product permanently
    await db.product.delete({
      where: { id: productId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء حذف المنتج" },
      { status: 500 }
    );
  }
}
