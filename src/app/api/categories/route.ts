import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Get all categories
export async function GET() {
  try {
    const categories = await db.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: {
        nameAr: "asc",
      },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Get categories error:", error);
    
    // Return default categories if database error
    return NextResponse.json({
      categories: [
        { id: "perfumes", name: "Perfumes", nameAr: "عطور", slug: "perfumes", _count: { products: 0 } },
        { id: "makeup", name: "Makeup", nameAr: "مكياج", slug: "makeup", _count: { products: 0 } },
        { id: "accessories", name: "Accessories", nameAr: "أكسسوارات", slug: "accessories", _count: { products: 0 } },
        { id: "skincare", name: "Skincare", nameAr: "عناية", slug: "skincare", _count: { products: 0 } },
      ],
    });
  }
}

// Create category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, nameAr, slug, image } = body;

    const category = await db.category.create({
      data: {
        name,
        nameAr,
        slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
        image,
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error("Create category error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء التصنيف" },
      { status: 500 }
    );
  }
}

// Update category
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    const category = await db.category.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error("Update category error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث التصنيف" },
      { status: 500 }
    );
  }
}

// Delete category
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");

    if (!categoryId) {
      return NextResponse.json(
        { error: "معرف التصنيف مطلوب" },
        { status: 400 }
      );
    }

    await db.category.delete({
      where: { id: categoryId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete category error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء حذف التصنيف" },
      { status: 500 }
    );
  }
}
