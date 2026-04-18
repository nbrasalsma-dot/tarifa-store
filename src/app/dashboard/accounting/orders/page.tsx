"use client";

import { useEffect, useState } from "react";
import { useAccounting } from "@/contexts/accounting-context";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingBag,
  Loader2,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  User,
  MapPin,
  Phone,
  CreditCard,
  Store,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OrderDetailsDialog } from "./components/order-details-dialog";

// أنواع البيانات
interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  color?: string | null;
  product: {
    id: string;
    name: string;
    nameAr: string;
    mainImage: string;
    price: number;
    sku?: string | null;
    colors?: string | null;
    sizes?: string | null;
    merchant?: {
      storeName: string;
      user: { name: string; phone: string };
    } | null;
    agent?: { name: string } | null;
  };
}

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  deliveryFee: number;
  paymentMethod: string | null;
  paymentStatus: string;
  paymentDetails: string | null;
  notes: string | null;
  address: string | null;
  phone: string | null;
  governorate: string | null;
  locationUrl: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string | null;
  };
  agent?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  items: OrderItem[];
  governorateRel?: {
    id: string;
    name: string;
    nameAr: string;
  } | null;
}

export default function AccountingOrdersPage() {
  const {
    user,
    isLoading: userLoading,
    hasPermission,
    fetchWithAuth,
  } = useAccounting();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/");
      return;
    }
    if (!userLoading && !hasPermission("view_orders")) {
      router.push("/");
      return;
    }
  }, [userLoading, user, hasPermission, router]);

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const res = await fetchWithAuth("/api/accounting/orders");
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders);
        }
      } catch (error) {
        console.error("فشل جلب الطلبات:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchOrders();
    }
  }, [user]);

  if (userLoading || isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#C9A962]" />
      </div>
    );
  }

  if (!user) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-YE", {
      style: "currency",
      currency: "YER",
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ar-YE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; color: string; icon: any }
    > = {
      PENDING: {
        label: "قيد الانتظار",
        color: "bg-yellow-100 text-yellow-700",
        icon: Clock,
      },
      PROCESSING: {
        label: "قيد التجهيز",
        color: "bg-blue-100 text-blue-700",
        icon: Package,
      },
      SHIPPED: {
        label: "تم الشحن",
        color: "bg-purple-100 text-purple-700",
        icon: Truck,
      },
      DELIVERED: {
        label: "تم التسليم",
        color: "bg-emerald-100 text-emerald-700",
        icon: CheckCircle,
      },
      COMPLETED: {
        label: "مكتمل",
        color: "bg-green-100 text-green-700",
        icon: CheckCircle,
      },
      CANCELLED: {
        label: "ملغي",
        color: "bg-rose-100 text-rose-700",
        icon: XCircle,
      },
    };
    const config = statusMap[status] || {
      label: status,
      color: "bg-gray-100",
      icon: Clock,
    };
    const Icon = config.icon;
    return (
      <Badge className={cn("gap-1", config.color)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const config: Record<string, { label: string; color: string }> = {
      PENDING: { label: "معلق", color: "bg-orange-100 text-orange-700" },
      CONFIRMED: { label: "مؤكد", color: "bg-green-100 text-green-700" },
      REJECTED: { label: "مرفوض", color: "bg-rose-100 text-rose-700" },
    };
    const { label, color } = config[status] || {
      label: status,
      color: "bg-gray-100",
    };
    return <Badge className={color}>{label}</Badge>;
  };

  const filteredOrders =
    activeTab === "all"
      ? orders
      : orders.filter((o) => o.paymentStatus === activeTab.toUpperCase());

  const pendingCount = orders.filter(
    (o) => o.paymentStatus === "PENDING",
  ).length;
  const confirmedCount = orders.filter(
    (o) => o.paymentStatus === "CONFIRMED",
  ).length;

  return (
    <div className="space-y-6 p-1">
      {/* عنوان الصفحة */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#3D3021]">
            سجل عمليات وطلبات البيع
          </h2>
          <p className="text-sm text-[#8B7355]">عرض وإدارة جميع طلبات المتجر</p>
        </div>
        <ShoppingBag className="h-8 w-8 text-[#C9A962]" />
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="border-[#C9A962] text-[#C9A962] hover:bg-[#C9A962] hover:text-white"
          onClick={() => router.push("/dashboard/accounting/pos")}
        >
          <ShoppingCart className="h-4 w-4 ml-1" />
          بيع خارج المتجر
        </Button>
      </div>

      {/* تبويبات الفلترة */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-[#F5EFE6]">
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-[#C9A962] data-[state=active]:text-white"
          >
            الكل ({orders.length})
          </TabsTrigger>
          <TabsTrigger
            value="pending"
            className="data-[state=active]:bg-[#C9A962] data-[state=active]:text-white"
          >
            معلقة ({pendingCount})
          </TabsTrigger>
          <TabsTrigger
            value="confirmed"
            className="data-[state=active]:bg-[#C9A962] data-[state=active]:text-white"
          >
            مؤكدة ({confirmedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <ScrollArea className="h-[calc(100vh-250px)]">
            <div className="space-y-3">
              {filteredOrders.length === 0 ? (
                <Card className="border-0 shadow-lg">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <ShoppingBag className="h-12 w-12 text-[#A69B8D] mb-4" />
                    <p className="text-[#5D5D5D]">لا توجد طلبات حالياً</p>
                  </CardContent>
                </Card>
              ) : (
                filteredOrders.map((order) => (
                  <Card
                    key={order.id}
                    className="border-0 shadow-lg transition-all hover:shadow-xl cursor-pointer"
                    onClick={() => {
                      setSelectedOrder(order);
                      setDetailsOpen(true);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3">
                        {/* الصف الأول: رقم الطلب والحالة والتاريخ */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-[#3D3021]">
                              #{order.id.slice(-8).toUpperCase()}
                            </span>
                            {getStatusBadge(order.status)}
                            {getPaymentStatusBadge(order.paymentStatus)}
                          </div>
                          <span className="text-xs text-[#A69B8D]">
                            {formatDate(order.createdAt)}
                          </span>
                        </div>

                        {/* الصف الثاني: العميل والموقع */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-[#5D5D5D]">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4 text-[#C9A962]" />
                            <span>{order.customer.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4 text-[#C9A962]" />
                            <span>{order.customer.phone}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-[#C9A962]" />
                            <span>
                              {order.governorateRel?.nameAr ||
                                order.governorate}
                            </span>
                          </div>
                        </div>

                        {/* الصف الثالث: المنتجات وطريقة الدفع والمبلغ */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-[#C9A962]" />
                            <span className="text-sm">
                              {order.items.length}{" "}
                              {order.items.length === 1 ? "منتج" : "منتجات"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 text-sm">
                              <CreditCard className="h-4 w-4 text-[#C9A962]" />
                              <span>
                                {order.paymentMethod === "transfer"
                                  ? "حوالة"
                                  : "محفظة"}
                              </span>
                            </div>
                            <span className="text-lg font-bold text-[#3D3021]">
                              {formatCurrency(order.totalAmount)}
                            </span>
                          </div>
                        </div>

                        {/* عرض سريع للمنتج الأول مع صورته */}
                        {order.items[0] && (
                          <div className="flex items-center gap-3 border-t border-[#E8E0D8] pt-3">
                            <div className="h-12 w-12 overflow-hidden rounded-lg border border-[#E8E0D8]">
                              <img
                                src={order.items[0].product.mainImage}
                                alt={order.items[0].product.nameAr}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-[#3D3021]">
                                {order.items[0].product.nameAr}
                              </p>
                              <p className="text-xs text-[#A69B8D]">
                                الكمية: {order.items[0].quantity} ×{" "}
                                {formatCurrency(order.items[0].price)}
                              </p>
                            </div>
                            <Store className="h-4 w-4 text-[#C9A962]" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* نافذة التفاصيل */}
      <OrderDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        order={selectedOrder}
      />
    </div>
  );
}
