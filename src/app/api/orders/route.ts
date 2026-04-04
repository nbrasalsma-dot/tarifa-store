import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { pusherServer } from "@/lib/pusher";
import { sendNotificationToAdmins, sendNotificationToUser } from "@/lib/notifications";

// Validation schemas
const createOrderSchema = z.object({
  customerId: z.string().min(1, "معرف العميل مطلوب"),
  customerName: z.string().optional(),
  locationLink: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(1).max(100),
    price: z.number().min(0),
    color: z.string().nullable().optional(),
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
  paymentDetails: z.any().optional(),
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
                sku: true, // 👈 تم إضافة جلب كود المنتج
                merchant: {
                  select: { storeName: true } // 👈 تم إضافة جلب اسم متجر التاجر
                },
                agent: {
                  select: { name: true } // 👈 تم إضافة جلب اسم المندوب
                }
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
        color: item.color,
      });
    }

    // تجميع بيانات المستلم والموقع داخل حقل الدفع
    const enrichedPaymentDetails = {
      ...(validatedData.paymentDetails || {}),
      customerName: validatedData.customerName,
      locationLink: validatedData.locationLink
    };

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
          paymentDetails: JSON.stringify(enrichedPaymentDetails),
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
      
    // 1. إشعار لكل المدراء بوجود طلب جديد
    await sendNotificationToAdmins({
      type: "ORDER_NEW",
      title: "طلب جديد! 🛍️",
      message: `تم استلام طلب جديد بقيمة ${totalAmount.toLocaleString()} ر.ي من العميل: ${customer.name}`,
      data: { orderId: order.id }
    });

    // 2. إشعار للعميل لتأكيد استلام الطلب
    await sendNotificationToUser({
      userId: customer.id,
      type: "ORDER_NEW",
      title: "تم استلام طلبك بنجاح 🎉",
      message: `رقم طلبك هو #${order.id.slice(-8)}. جاري مراجعته وتجهيزه، شكراً لتسوقك من تَرِفَة.`,
      data: { orderId: order.id }
    });

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

// Update order status & Claiming Logic with Advanced Notifications
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const validatedData = updateOrderSchema.parse(body);

        const updateData: any = {};
        if (validatedData.status) updateData.status = validatedData.status;
        if (validatedData.agentId) updateData.agentId = validatedData.agentId;
        if (validatedData.paymentDetails) {
            updateData.paymentDetails = JSON.stringify(validatedData.paymentDetails);
        }

        // تحديث الطلب وجلب كافة البيانات المتعلقة بالمنتجات والتجار والمندوبين
        const order = await db.order.update({
            where: { id: validatedData.orderId },
            data: updateData,
            include: {
                customer: true,
                agent: true,
                items: {
                    include: {
                        product: {
                            include: {
                                merchant: { include: { user: true } },
                                agent: true, // المندوب الذي أضاف المنتج
                            }
                        }
                    }
                }
            },
        });

        const orderCode = order.id.slice(-8);
        const orderDetails = `📦 طلب #${orderCode}\n💰 المبلغ: ${order.totalAmount} ر.ي\n📍 العنوان: ${order.governorate} - ${order.address}\n📞 هاتف: ${order.phone}`;
        const statusAr = {
            PENDING: "قيد الانتظار",
            PROCESSING: "قيد التجهيز",
            SHIPPED: "تم الشحن",
            DELIVERED: "تم التسليم",
            COMPLETED: "منجز",
            CANCELLED: "ملغي"
        }[order.status] || order.status;

        // --- 1. إشعار للإدارة (تفصيلي جداً) ---
        await sendNotificationToAdmins({
            type: "ORDER_CLAIMED",
            title: "تحديث حالة طلبية 📢",
            message: `قام المندوب [${order.agent?.name || "الإدارة"}] بتغيير حالة الطلبية #${orderCode} إلى (${statusAr}).\n${orderDetails}`,
            data: { orderId: order.id }
        });

        // --- 2. إشعارات لأصحاب المنتجات (تجار أو مناديب) ---
        const ownersNotified = new Set(); // لمنع تكرار الإشعار لنفس الشخص في نفس الطلب

        for (const item of order.items) {
            const product = item.product;
            const owner = product.merchant?.user || product.agent; // التاجر أو المندوب صاحب المنتج

            if (owner && !ownersNotified.has(owner.id)) {
                await sendNotificationToUser({
                    userId: owner.id,
                    type: "ORDER_CLAIMED",
                    title: "تحديث على منتجاتك 🔔",
                    message: `قام [${order.agent?.name || "الإدارة"}] باستلام/تحديث طلبيتك #${orderCode}.\nالحالة: ${statusAr}\nالمنتج: ${product.nameAr}\n${orderDetails}`,
                    data: { orderId: order.id }
                });
                ownersNotified.add(owner.id);
            }
        }

        // --- 3. إشعار للعميل (الشفافية والدردشة) ---
        if (validatedData.status === "PROCESSING") {
            const claimerName = order.agent?.name || "الإدارة";
            await sendNotificationToUser({
                userId: order.customerId,
                type: "ORDER_CONFIRMED",
                title: "بدأ تجهيز طلبك 🚀",
                message: `المندوب [${claimerName}] استلم طلبك #${orderCode} وهو الآن قيد التجهيز.\nيمكنك التواصل معه مباشرة عبر الدردشة للاستفسار.`,
                data: { orderId: order.id, agentId: order.agentId }
            });
        } else if (validatedData.status) {
            // إشعارات الحالات الأخرى للعميل
            const messages: any = {
                SHIPPED: "طلبك في الطريق إليك الآن! 🚚",
                DELIVERED: "تم تسليم الطلب بنجاح. نتمنى أن ينال إعجابك! ✅",
                CANCELLED: "عذراً، تم إلغاء طلبك. يرجى مراجعة الإدارة. ⚠️"
            };
            if (messages[validatedData.status]) {
                await sendNotificationToUser({
                    userId: order.customerId,
                    type: "ORDER_NEW",
                    title: "تحديث حالة الطلب",
                    message: `${messages[validatedData.status]}\nكود الطلب: #${orderCode}`,
                    data: { orderId: order.id }
                });
            }
        }

        return NextResponse.json({ success: true, order, message: "تم تحديث الطلب وإرسال الإشعارات" });
    } catch (error) {
        console.error("Update order error:", error);
        return NextResponse.json({ error: "حدث خطأ أثناء تحديث الطلب" }, { status: 500 });
    }
}