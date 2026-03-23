/**
 * Agent Dashboard (المندوبة)
 * Allows agents to manage products, view orders, and chat with customers
 */

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShoppingBag,
  Package,
  MessageSquare,
  LogOut,
  ChevronLeft,
  Bell,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Star,
  Eye,
  CheckCircle,
  Clock,
  Image as ImageIcon,
  Save,
  Upload,
  Phone,
  User,
  MapPin,
  ArrowUpRight,
  DollarSign,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ChatWidget } from "@/components/chat/chat-widget";
import { uploadImage } from "@/lib/upload";

// WhatsApp number
const WHATSAPP_NUMBER = "967776080395";

interface AgentDashboardProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  onLogout: () => void;
  onViewStore?: () => void;
}

interface Product {
  id: string;
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  price: number;
  originalPrice?: number;
  mainImage: string;
  images: string;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  categoryId?: string;
  category?: { nameAr: string };
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
}

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  address: string;
  phone: string;
  governorate: string;
  paymentMethod: string;
  paymentDetails: string;
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string;
  };
  items: Array<{
    product: { nameAr: string; mainImage: string };
    quantity: number;
    price: number;
  }>;
}

export function AgentDashboard({ user, onLogout, onViewStore }: AgentDashboardProps) {
  const [activeTab, setActiveTab] = useState("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);

  // Product dialog state
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [productForm, setProductForm] = useState({
    name: "",
    nameAr: "",
    description: "",
    descriptionAr: "",
    price: "",
    originalPrice: "",
    mainImage: "",
    stock: "",
    categoryId: "",
    isFeatured: false,
    isActive: true,
  });

  // Stats
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    revenue: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch agent's products
      const productsRes = await fetch(`/api/products?agentId=${user.id}`);
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.products || []);
        setStats(prev => ({ ...prev, products: data.products?.length || 0 }));
      }

      // Fetch categories
      const categoriesRes = await fetch("/api/categories");
      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.categories || []);
      }

      // Fetch all orders (agents can see all orders)
      const ordersRes = await fetch("/api/orders");
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        const allOrders = data.orders || [];
        // Separate pending and completed orders
        setOrders(allOrders.filter((o: Order) => o.status !== "COMPLETED" && o.status !== "CANCELLED"));
        setCompletedOrders(allOrders.filter((o: Order) => o.status === "COMPLETED"));
        setStats(prev => ({ 
          ...prev, 
          orders: allOrders.filter((o: Order) => o.status !== "COMPLETED").length,
          revenue: allOrders.reduce((sum: number, o: Order) => sum + (o.status === "COMPLETED" ? o.totalAmount : 0), 0)
        }));
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetProductForm = () => {
    setProductForm({
      name: "",
      nameAr: "",
      description: "",
      descriptionAr: "",
      price: "",
      originalPrice: "",
      mainImage: "",
      stock: "",
      categoryId: "",
      isFeatured: false,
      isActive: true,
    });
    setSelectedProduct(null);
  };

  const openNewProduct = () => {
    resetProductForm();
    setIsProductDialogOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductForm({
      name: product.name,
      nameAr: product.nameAr,
      description: product.description || "",
      descriptionAr: product.descriptionAr || "",
      price: product.price.toString(),
      originalPrice: product.originalPrice?.toString() || "",
      mainImage: product.mainImage,
      stock: product.stock.toString(),
      categoryId: product.categoryId || "",
      isFeatured: product.isFeatured,
      isActive: product.isActive,
    });
    setIsProductDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.nameAr || !productForm.price || !productForm.mainImage) {
      toast({
        title: "خطأ",
        description: "يرجى ملء الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const url = "/api/products";
      const method = selectedProduct ? "PUT" : "POST";
      const body = selectedProduct
        ? { id: selectedProduct.id, ...productForm, agentId: user.id }
        : { ...productForm, agentId: user.id };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "تم",
          description: selectedProduct ? "تم تحديث المنتج" : "تم إضافة المنتج",
        });
        setIsProductDialogOpen(false);
        resetProductForm();
        fetchData();
      } else {
        toast({
          title: "خطأ",
          description: data.error || "حدث خطأ",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ في الاتصال",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;

    try {
      const response = await fetch(`/api/products?productId=${productId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "تم",
          description: "تم حذف المنتج",
        });
        fetchData();
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء الحذف",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString("ar-YE")} ر.ي`;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      PENDING: { label: "قيد الانتظار", className: "bg-yellow-500" },
      PROCESSING: { label: "قيد التجهيز", className: "bg-blue-500" },
      SHIPPED: { label: "تم الشحن", className: "bg-purple-500" },
      DELIVERED: { label: "تم التسليم", className: "bg-green-500" },
      COMPLETED: { label: "منجز", className: "bg-emerald-500" },
      CANCELLED: { label: "ملغي", className: "bg-red-500" },
    };
    const s = statusMap[status] || { label: status, className: "bg-gray-500" };
    return <Badge className={s.className}>{s.label}</Badge>;
  };

  // Update order status
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const response = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      if (response.ok) {
        toast({ title: "تم", description: "تم تحديث حالة الطلب" });
        fetchData();
      }
    } catch (error) {
      toast({ title: "خطأ", description: "حدث خطأ", variant: "destructive" });
    }
  };

  // Open WhatsApp
  const openWhatsApp = (phone: string, message?: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const url = message 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/${cleanPhone}`;
    window.open(url, '_blank');
  };

  // Format date
  const formatDate = (date: string) => new Date(date).toLocaleDateString("ar-SA");

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--muted)] to-background">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-lg border-b sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <img 
                src="/logo-transparent.jpg" 
                alt="تَرِفَة" 
                className="h-10 w-auto object-contain"
              />
              <Badge className="bg-purple-500">مندوبة</Badge>
            </div>

            <div className="flex items-center gap-4">
              {/* View Store Button */}
              {onViewStore && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onViewStore}
                  className="gap-2 border-[var(--gold)] text-[var(--gold-dark)] hover:bg-[var(--gold)] hover:text-white"
                >
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">المتجر</span>
                </Button>
              )}
              
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>

              <div className="flex items-center gap-2">
                <Avatar>
                  <AvatarFallback className="bg-purple-500 text-white">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">مندوبة</p>
                </div>
              </div>

              <Button variant="ghost" size="icon" onClick={onLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/80 backdrop-blur-sm border p-1 mb-6 flex-wrap h-auto">
            <TabsTrigger value="products" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              منتجاتي ({products.length})
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <Package className="h-4 w-4" />
              الطلبات
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              المحادثات
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card className="border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>منتجاتي ({products.length})</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={fetchData} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 ml-2" />
                    تحديث
                  </Button>
                  <Button onClick={openNewProduct} className="bg-[var(--gold)] hover:bg-[var(--gold-dark)]">
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة منتج
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <RefreshCw className="h-8 w-8 animate-spin text-[var(--gold)]" />
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-[var(--muted-foreground)] mb-4">لا توجد منتجات حالياً</p>
                    <Button onClick={openNewProduct} className="bg-[var(--gold)] hover:bg-[var(--gold-dark)]">
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة منتج جديد
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {products.map((product) => (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-white rounded-lg shadow-md overflow-hidden border"
                        >
                          <div className="relative aspect-square">
                            <img
                              src={product.mainImage}
                              alt={product.nameAr}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 right-2 flex flex-col gap-1">
                              {product.isFeatured && (
                                <Badge className="bg-[var(--gold)]">
                                  <Star className="h-3 w-3 ml-1" />
                                  مميز
                                </Badge>
                              )}
                              {!product.isActive && (
                                <Badge className="bg-gray-500">غير نشط</Badge>
                              )}
                            </div>
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold line-clamp-1">{product.nameAr}</h3>
                            <p className="text-sm text-gray-500">{product.category?.nameAr || "بدون تصنيف"}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="font-bold text-[var(--gold-dark)]">
                                {formatCurrency(product.price)}
                              </span>
                              <Badge variant="outline">المخزون: {product.stock}</Badge>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => openEditProduct(product)}
                              >
                                <Edit className="h-4 w-4 ml-1" />
                                تعديل
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteProduct(product.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="space-y-6">
              {/* Pending Orders */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>الطلبات ({orders.length})</CardTitle>
                  <Button onClick={fetchData} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 ml-2" />
                    تحديث
                  </Button>
                </CardHeader>
                <CardContent>
                  {orders.length === 0 ? (
                    <div className="text-center py-12 text-[var(--muted-foreground)]">
                      <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <p>لا توجد طلبات حالياً</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {orders.map((order) => (
                          <div key={order.id} className="p-4 bg-white rounded-lg shadow border">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-mono text-sm text-gray-500">#{order.id.slice(-8)}</p>
                                <p className="font-bold">{order.customer.name}</p>
                                <p className="text-sm text-gray-500">{order.customer.phone}</p>
                              </div>
                              {getStatusBadge(order.status)}
                            </div>
                            
                            <div className="text-sm text-gray-600 mb-3">
                              <p><MapPin className="h-3 w-3 inline ml-1" />{order.governorate || "غير محدد"} - {order.address}</p>
                              <p><DollarSign className="h-3 w-3 inline ml-1" />{formatCurrency(order.totalAmount)}</p>
                            </div>

                            {/* Order Items */}
                            <div className="border-t pt-3 mb-3">
                              <p className="text-xs text-gray-500 mb-2">المنتجات:</p>
                              <div className="flex flex-wrap gap-2">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded">
                                    <span>{item.product.nameAr}</span>
                                    <span className="text-gray-400">x{item.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Payment Info */}
                            {order.paymentMethod && (
                              <div className="text-xs bg-blue-50 p-2 rounded mb-3">
                                <p><strong>الدفع:</strong> {order.paymentMethod === "transfer" ? "حوالة" : "محفظة"}</p>
                                {order.paymentDetails && (
                                  <p className="text-gray-600">{order.paymentDetails}</p>
                                )}
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openWhatsApp(order.customer.phone, `مرحباً ${order.customer.name}، بخصوص طلبك #${order.id.slice(-8)}`)}
                              >
                                <Phone className="h-4 w-4 ml-1" />
                                واتساب
                              </Button>
                              
                              {order.status === "PENDING" && (
                                <Button
                                  size="sm"
                                  className="bg-blue-500 hover:bg-blue-600"
                                  onClick={() => handleUpdateOrderStatus(order.id, "PROCESSING")}
                                >
                                  بدء التجهيز
                                </Button>
                              )}
                              
                              {order.status === "PROCESSING" && (
                                <Button
                                  size="sm"
                                  className="bg-purple-500 hover:bg-purple-600"
                                  onClick={() => handleUpdateOrderStatus(order.id, "SHIPPED")}
                                >
                                  تم الشحن
                                </Button>
                              )}
                              
                              {order.status === "SHIPPED" && (
                                <Button
                                  size="sm"
                                  className="bg-green-500 hover:bg-green-600"
                                  onClick={() => handleUpdateOrderStatus(order.id, "COMPLETED")}
                                >
                                  تم التسليم
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Completed Orders */}
              {completedOrders.length > 0 && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-green-600">طلبات منجزة ({completedOrders.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {completedOrders.map((order) => (
                          <div key={order.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-mono text-sm text-gray-500">#{order.id.slice(-8)}</p>
                                <p className="font-medium">{order.customer.name}</p>
                              </div>
                              <div className="text-left">
                                <Badge className="bg-green-500">منجز</Badge>
                                <p className="font-bold text-green-700 mt-1">{formatCurrency(order.totalAmount)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>المحادثات مع العملاء</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-[var(--muted-foreground)]">
                  <MessageSquare className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <p>لا توجد محادثات حالياً</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct ? "تعديل المنتج" : "إضافة منتج جديد"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Image */}
            <div className="space-y-2">
              <Label>صورة المنتج *</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="رابط الصورة أو ارفع صورة"
                  value={productForm.mainImage}
                  onChange={(e) => setProductForm({ ...productForm, mainImage: e.target.value })}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        // Upload to cloud
                        const result = await uploadImage(file);
                        if (result.success && result.url) {
                          setProductForm({ ...productForm, mainImage: result.url });
                          toast({ title: "تم رفع الصورة", description: "تم حفظ الصورة في السحابة" });
                        } else {
                          toast({ title: "خطأ", description: result.error || "فشل رفع الصورة", variant: "destructive" });
                        }
                      }
                    };
                    input.click();
                  }}
                >
                  <Upload className="h-4 w-4 ml-1" />
                  رفع
                </Button>
              </div>
              {productForm.mainImage && (
                <div className="w-32 h-32 rounded-lg overflow-hidden border">
                  <img src={productForm.mainImage} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Names */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الاسم بالعربي *</Label>
                <Input
                  placeholder="عطر فاخر"
                  value={productForm.nameAr}
                  onChange={(e) => setProductForm({ ...productForm, nameAr: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>الاسم بالإنجليزي *</Label>
                <Input
                  placeholder="Luxury Perfume"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>التصنيف</Label>
              <Select
                value={productForm.categoryId}
                onValueChange={(value) => setProductForm({ ...productForm, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nameAr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>السعر (ر.ي) *</Label>
                <Input
                  type="number"
                  placeholder="45000"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>السعر الأصلي (ر.ي)</Label>
                <Input
                  type="number"
                  placeholder="55000"
                  value={productForm.originalPrice}
                  onChange={(e) => setProductForm({ ...productForm, originalPrice: e.target.value })}
                />
              </div>
            </div>

            {/* Stock */}
            <div className="space-y-2">
              <Label>المخزون</Label>
              <Input
                type="number"
                placeholder="10"
                value={productForm.stock}
                onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                placeholder="وصف المنتج..."
                value={productForm.descriptionAr}
                onChange={(e) => setProductForm({ ...productForm, descriptionAr: e.target.value })}
                rows={3}
              />
            </div>

            {/* Toggles */}
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={productForm.isActive}
                  onCheckedChange={(checked) => setProductForm({ ...productForm, isActive: checked })}
                />
                <Label>نشط</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={productForm.isFeatured}
                  onCheckedChange={(checked) => setProductForm({ ...productForm, isFeatured: checked })}
                />
                <Label>مميز</Label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSaveProduct}
                disabled={isSaving}
                className="flex-1 bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
              >
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4 ml-2" />
                    حفظ
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsProductDialogOpen(false)}
                className="flex-1"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Widget */}
      <ChatWidget
        userId={user.id}
        userName={user.name}
        userRole={user.role}
      />
    </div>
  );
}
