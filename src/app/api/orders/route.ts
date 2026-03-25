import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

// Validation schemas
const createOrderSchema = z.object({
  customerId: z.string().min(1, "معرف العميل مطلوب"),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(1).max(100),
    price: z.number().min(0),
  })).min(1, "يجب إضافة منتج واحد على الأقل"),
  notes: z.string().max(500).optional(),
  address: z.string().min(2, "العنوان قصير جداً").max(200),
  phone: z.string().min(6, "رقم الهاتف غير صحيح").max(20),
  governorate: z.string().optional(),
  totalAmount: z.number().min(0).optional(),
  paymentMethod: z.enum(["transfer", "wallet"]).optional(),
  paymentDetails: z.object({
    transferNumber: z.string().optional(),
    wallet: z.enum(["jeib", "kash", "jawali"]).optional(),
    proofImage: z.string().optional(),
  }).optional(),
});

const updateOrderSchema = z.object({
  orderId: z.string(),
  status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED"]).optional(),
  agentId: z.string().optional(),
});

// Get all orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");
    const agentId = searchParams.get("agentId");

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (agentId) where.agentId = agentId;

    const orders = await db.order.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                nameAr: true,
                mainImage: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Get orders error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب الطلبات" },
      { status: 500 }
    );
  }
}

// Create order (secure)
export async function POST(request: NextRequest) {
  try {
      const body = await request.json();
      console.log("البيانات التي وصلت للسيرفر هي:", JSON.stringify(body, null, 2));
    
    // Validate input
    const validatedData = createOrderSchema.parse(body);
    
    // Verify customer exists
    const customer = await db.user.findUnique({
      where: { id: validatedData.customerId },
    });
    
    if (!customer) {
      return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
    }

    // Verify all products and calculate total
    let totalAmount = 0;
    const orderItems = [];
    
    for (const item of validatedData.items) {
      const product = await db.product.findUnique({
        where: { id: item.productId },
      });
      
      if (!product) {
        return NextResponse.json({ 
          error: `المنتج غير موجود: ${item.productId}` 
        }, { status: 404 });
      }
      
      if (!product.isActive) {
        return NextResponse.json({ 
          error: `المنتج غير متوفر: ${product.nameAr}` 
        }, { status: 400 });
      }
      
      if (product.stock < item.quantity) {
        return NextResponse.json({ 
          error: `الكمية المطلوبة غير متوفرة من: ${product.nameAr}` 
        }, { status: 400 });
      }
      
      // Use product price from database (security)
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
      
      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
      });
    }

    // Create order with transaction
    const order = await db.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          customerId: validatedData.customerId,
          totalAmount: validatedData.totalAmount || totalAmount,
          notes: validatedData.notes,
          address: validatedData.address,
          phone: validatedData.phone,
          governorate: validatedData.governorate,
          paymentMethod: validatedData.paymentMethod || null,
          paymentDetails: validatedData.paymentDetails ? JSON.stringify(validatedData.paymentDetails) : null,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  nameAr: true,
                  mainImage: true,
                },
              },
            },
          },
        },
      });

      // Update product stock
      for (const item of orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      return newOrder;
    }, {
      maxWait: 5000,
      timeout: 20000,
    });


    // Log security event
    console.log(`[ORDER] Created: ${order.id} by customer: ${validatedData.customerId} - Total: ${totalAmount}`);

    return NextResponse.json({ 
      success: true, 
      order,
      message: "تم إنشاء الطلب بنجاح"
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors?.[0]?.message || "خطأ في البيانات المرسلة" },
        { status: 400 }
      );
    }
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: "تعذر الاتصال بقاعدة البيانات حالياً، يرجى المحاولة مرة أخرى" },
      { status: 500 }
    );
  }
}

// Update order status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = updateOrderSchema.parse(body);

    const order = await db.order.update({
      where: { id: validatedData.orderId },
      data: {
        status: validatedData.status,
        agentId: validatedData.agentId,
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Log security event
    console.log(`[ORDER] Updated: ${validatedData.orderId} - Status: ${validatedData.status}`);

    return NextResponse.json({ 
      success: true, 
      order,
      message: "تم تحديث الطلب"
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Update order error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث الطلب" },
      { status: 500 }
    );
  }
}
