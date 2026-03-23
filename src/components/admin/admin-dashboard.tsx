"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  ShoppingBag,
  Package,
  DollarSign,
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  Bell,
  Search,
  TrendingUp,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  Mail,
  Send,
  Image as ImageIcon,
  Star,
  Tag,
  Save,
  Home,
  FolderOpen,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
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
import { uploadImage } from "@/lib/upload";

interface AdminDashboardProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  onLogout: () => void;
  onViewStore?: () => void;
}

interface Stats {
  users: {
    total: number;
    customers: number;
    agents: number;
  };
  products: number;
  orders: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
  };
  revenue: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string | null;
  role: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  _count: {
    products: number;
    orders: number;
    messages: number;
  };
}

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  items: Array<{
    product: {
      name: string;
      nameAr: string;
    };
    quantity: number;
    price: number;
  }>;
}

interface Category {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  image?: string;
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
  sku?: string;
  isActive: boolean;
  isFeatured: boolean;
  categoryId?: string;
  category?: Category;
  createdAt: string;
}

export function AdminDashboard({ user, onLogout, onViewStore }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Product form state
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

  // Categories management state
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    nameAr: "",
    slug: "",
    image: "",
  });

  // Email test state
  const [testEmail, setTestEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch dashboard data
  useEffect(() => {
    fetchStats();
    fetchCategories();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/stats");
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error("Fetch stats error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/users", {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Fetch users error:", error);
      setUsers([]);
    }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/orders", {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error("Fetch orders error:", error);
      setOrders([]);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Fetch categories error:", error);
      // If categories don't exist, use default ones
      setCategories([
        { id: "perfumes", name: "Perfumes", nameAr: "عطور", slug: "perfumes" },
        { id: "makeup", name: "Makeup", nameAr: "مكياج", slug: "makeup" },
        { id: "accessories", name: "Accessories", nameAr: "أكسسوارات", slug: "accessories" },
        { id: "skincare", name: "Skincare", nameAr: "عناية", slug: "skincare" },
      ]);
    }
  };

  // Category management functions
  const openNewCategory = () => {
    setSelectedCategory(null);
    setCategoryForm({
      name: "",
      nameAr: "",
      slug: "",
      image: "",
    });
    setIsCategoryDialogOpen(true);
  };

  const openEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setCategoryForm({
      name: category.name,
      nameAr: category.nameAr,
      slug: category.slug,
      image: category.image || "",
    });
    setIsCategoryDialogOpen(true);
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: "",
      nameAr: "",
      slug: "",
      image: "",
    });
    setSelectedCategory(null);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name || !categoryForm.nameAr) {
      toast({
        title: "خطأ",
        description: "يرجى ملء اسم التصنيف بالعربي والإنجليزي",
        variant: "destructive",
      });
      return;
    }

    setIsSavingCategory(true);
    try {
      const url = "/api/categories";
      const method = selectedCategory ? "PUT" : "POST";
      const body = selectedCategory
        ? { id: selectedCategory.id, ...categoryForm }
        : categoryForm;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "تم",
          description: selectedCategory ? "تم تحديث التصنيف" : "تم إضافة التصنيف",
        });
        setIsCategoryDialogOpen(false);
        resetCategoryForm();
        fetchCategories();
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
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا التصنيف؟")) return;

    try {
      const response = await fetch(`/api/categories?categoryId=${categoryId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "تم",
          description: "تم حذف التصنيف",
        });
        fetchCategories();
      } else {
        toast({
          title: "خطأ",
          description: data.error || "حدث خطأ أثناء الحذف",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء الحذف",
        variant: "destructive",
      });
    }
  };

  // Fetch products
  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products?all=true");
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error("Fetch products error:", error);
    }
  };

  // Load products when products tab is active
  useEffect(() => {
    if (activeTab === "products" && products.length === 0) {
      fetchProducts();
    }
  }, [activeTab, products.length]);

  // Load users/orders when tab changes
  useEffect(() => {
    if (activeTab === "users" && users.length === 0) {
      fetchUsers();
    }
    if (activeTab === "orders" && orders.length === 0) {
      fetchOrders();
    }
  }, [activeTab, users.length, orders.length]);

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId, isActive }),
      });

      if (response.ok) {
        toast({
          title: "تم",
          description: isActive ? "تم تفعيل المستخدم" : "تم تعطيل المستخدم",
        });
        fetchUsers();
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث المستخدم",
        variant: "destructive",
      });
    }
  };

  // Upgrade user to agent role
  const handleUpgradeToAgent = async (userId: string) => {
    if (!confirm("هل أنت متأكد من ترقية هذا المستخدم إلى مندوبة؟")) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId, role: "AGENT" }),
      });

      if (response.ok) {
        toast({
          title: "تم الترقية",
          description: "تم ترقية المستخدم إلى مندوبة بنجاح",
        });
        fetchUsers();
        fetchStats();
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء ترقية المستخدم",
        variant: "destructive",
      });
    }
  };

  // Downgrade agent to customer
  const handleDowngradeToCustomer = async (userId: string) => {
    if (!confirm("هل أنت متأكد من إلغاء صلاحية المندوبة؟")) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId, role: "CUSTOMER" }),
      });

      if (response.ok) {
        toast({
          title: "تم",
          description: "تم إلغاء صلاحية المندوبة",
        });
        fetchUsers();
        fetchStats();
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث المستخدم",
        variant: "destructive",
      });
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/orders", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ orderId, status }),
      });

      if (response.ok) {
        toast({
          title: "تم",
          description: "تم تحديث حالة الطلب",
        });
        fetchOrders();
        fetchStats();
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث الطلب",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      PENDING: { label: "قيد الانتظار", className: "bg-yellow-500" },
      PROCESSING: { label: "قيد التجهيز", className: "bg-blue-500" },
      SHIPPED: { label: "تم الشحن", className: "bg-purple-500" },
      DELIVERED: { label: "تم التسليم", className: "bg-green-500" },
      CANCELLED: { label: "ملغي", className: "bg-red-500" },
    };
    const s = statusMap[status] || { label: status, className: "bg-gray-500" };
    return <Badge className={s.className}>{s.label}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; className: string }> = {
      ADMIN: { label: "الإدارة", className: "bg-[var(--gold)]" },
      AGENT: { label: "مندوبة", className: "bg-purple-500" },
      CUSTOMER: { label: "عميلة", className: "bg-[var(--rose)]" },
    };
    const r = roleMap[role] || { label: role, className: "bg-gray-500" };
    return <Badge className={r.className}>{r.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString("ar-YE")} ر.ي`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Test email function
  const handleTestEmail = async () => {
    if (!testEmail) {
      setEmailResult({ success: false, message: "يرجى إدخال البريد الإلكتروني" });
      return;
    }

    setEmailSending(true);
    setEmailResult(null);

    try {
      const response = await fetch("/api/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
      });

      const data = await response.json();

      if (data.success) {
        setEmailResult({
          success: true,
          message: `✅ تم الإرسال بنجاح! تحقق من البريد الوارد (أو السبام).\nمعرف الرسالة: ${data.messageId}`
        });
      } else {
        setEmailResult({
          success: false,
          message: `❌ فشل الإرسال: ${data.message || data.error}`
        });
      }
    } catch (error) {
      setEmailResult({
        success: false,
        message: "❌ حدث خطأ في الاتصال"
      });
    } finally {
      setEmailSending(false);
    }
  };

  // Reset product form
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

  // Open product dialog for new product
  const openNewProduct = () => {
    resetProductForm();
    setIsProductDialogOpen(true);
  };

  // Open product dialog for editing
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

  // Save product (create or update)
  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.nameAr || !productForm.price || !productForm.mainImage) {
      toast({
        title: "خطأ",
        description: "يرجى ملء الحقول المطلوبة: الاسم، الاسم بالعربي، السعر، والصورة",
        variant: "destructive",
      });
      return;
    }

    setIsSavingProduct(true);

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
        fetchProducts();
        fetchStats();
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
      setIsSavingProduct(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;

    try {
      const response = await fetch(`/api/products?productId=${productId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "تم",
          description: "تم حذف المنتج",
        });
        fetchProducts();
        fetchStats();
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء الحذف",
        variant: "destructive",
      });
    }
  };

  // Toggle product featured status
  const handleToggleFeatured = async (product: Product) => {
    try {
      const response = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: product.id,
          isFeatured: !product.isFeatured,
        }),
      });

      if (response.ok) {
        toast({
          title: "تم",
          description: product.isFeatured ? "تم إزالة المنتج من المميزة" : "تم إضافة المنتج للمميزة",
        });
        fetchProducts();
      }
    } catch (error) {
      console.error("Toggle featured error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--muted)] to-background">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-lg border-b border-[var(--border)] sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <img 
                src="/logo-transparent.jpg" 
                alt="تَرِفَة" 
                className="h-10 w-auto object-contain"
              />
              <Badge className="bg-[var(--gold)]">لوحة الإدارة</Badge>
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
                  <AvatarFallback className="bg-[var(--gold)] text-white">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">الإدارة</p>
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
          <TabsList className="bg-white/80 backdrop-blur-sm border border-[var(--border)] p-1 mb-6 flex-wrap h-auto">
            <TabsTrigger value="overview" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              المستخدمين
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <Package className="h-4 w-4" />
              الطلبات
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              المنتجات
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <Tag className="h-4 w-4" />
              التصنيفات
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              المحادثات
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-[var(--gold)]" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-[var(--muted-foreground)]">إجمالي المستخدمين</p>
                            <p className="text-3xl font-bold mt-1">{stats?.users.total || 0}</p>
                            <p className="text-xs text-[var(--muted-foreground)] mt-1">
                              {stats?.users.customers} عميلة · {stats?.users.agents} مندوبة
                            </p>
                          </div>
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <Users className="h-6 w-6 text-blue-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-[var(--muted-foreground)]">المنتجات</p>
                            <p className="text-3xl font-bold mt-1">{stats?.products || 0}</p>
                            <p className="text-xs text-green-600 mt-1">نشط</p>
                          </div>
                          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                            <ShoppingBag className="h-6 w-6 text-purple-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-[var(--muted-foreground)]">الطلبات</p>
                            <p className="text-3xl font-bold mt-1">{stats?.orders.total || 0}</p>
                            <p className="text-xs text-yellow-600 mt-1">
                              {stats?.orders.pending} قيد الانتظار
                            </p>
                          </div>
                          <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                            <Package className="h-6 w-6 text-yellow-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-[var(--muted-foreground)]">الإيرادات</p>
                            <p className="text-3xl font-bold mt-1">{formatCurrency(stats?.revenue || 0)}</p>
                            <p className="text-xs text-green-600 mt-1">إجمالي</p>
                          </div>
                          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                            <DollarSign className="h-6 w-6 text-green-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Order Status Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-4 flex items-center gap-4">
                      <Clock className="h-8 w-8 text-yellow-500" />
                      <div>
                        <p className="text-sm text-[var(--muted-foreground)]">قيد الانتظار</p>
                        <p className="text-2xl font-bold">{stats?.orders.pending || 0}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-4 flex items-center gap-4">
                      <RefreshCw className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="text-sm text-[var(--muted-foreground)]">قيد التجهيز</p>
                        <p className="text-2xl font-bold">{stats?.orders.processing || 0}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-4 flex items-center gap-4">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="text-sm text-[var(--muted-foreground)]">تم التسليم</p>
                        <p className="text-2xl font-bold">{stats?.orders.completed || 0}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-4 flex items-center gap-4">
                      <UserCheck className="h-8 w-8 text-purple-500" />
                      <div>
                        <p className="text-sm text-[var(--muted-foreground)]">المندوبات</p>
                        <p className="text-2xl font-bold">{stats?.users.agents || 0}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>إجراءات سريعة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex-col gap-2"
                        onClick={() => setActiveTab("users")}
                      >
                        <Users className="h-6 w-6" />
                        <span>إدارة المستخدمين</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex-col gap-2"
                        onClick={() => setActiveTab("orders")}
                      >
                        <Package className="h-6 w-6" />
                        <span>إدارة الطلبات</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex-col gap-2"
                        onClick={() => setActiveTab("products")}
                      >
                        <ShoppingBag className="h-6 w-6" />
                        <span>إدارة المنتجات</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex-col gap-2"
                        onClick={() => setActiveTab("messages")}
                      >
                        <MessageSquare className="h-6 w-6" />
                        <span>المحادثات</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Email Test Section */}
                <Card className="border-0 shadow-lg border-2 border-[var(--gold)]/20">
                  <CardHeader className="bg-gradient-to-r from-[var(--gold-light)]/10 to-[var(--gold)]/10">
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-[var(--gold)]" />
                      اختبار نظام البريد الإلكتروني
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Input
                          type="email"
                          placeholder="أدخل البريد الإلكتروني للاختبار"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          onClick={handleTestEmail}
                          disabled={emailSending}
                          className="bg-[var(--gold)] hover:bg-[var(--gold-dark)] min-w-[120px]"
                        >
                          {emailSending ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-4 w-4 ml-2" />
                              إرسال اختبار
                            </>
                          )}
                        </Button>
                      </div>

                      {emailResult && (
                        <div className={`p-4 rounded-lg ${emailResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                          <p className={`whitespace-pre-line ${emailResult.success ? 'text-green-700' : 'text-red-700'}`}>
                            {emailResult.message}
                          </p>
                        </div>
                      )}

                      <div className="text-sm text-[var(--muted-foreground)] bg-yellow-50 p-3 rounded-lg">
                        <p className="font-medium text-yellow-800 mb-1">⚠️ ملاحظة مهمة:</p>
                        <ul className="text-yellow-700 space-y-1 list-disc list-inside">
                          <li>البريد المرسل: nbrasalsma@gmail.com</li>
                          <li>إذا لم تصل الرسالة، تحقق من مجلد السبام (Spam)</li>
                          <li>تأكد من أن البريد المرسل موثق في Brevo</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>إدارة المستخدمين</CardTitle>
                <Button onClick={fetchUsers} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 ml-2" />
                  تحديث
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المستخدم</TableHead>
                        <TableHead>البريد الإلكتروني</TableHead>
                        <TableHead>رقم الجوال</TableHead>
                        <TableHead>الدور</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>تاريخ التسجيل</TableHead>
                        <TableHead>إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar>
                                <AvatarFallback className="bg-[var(--gold)] text-white">
                                  {u.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{u.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>{u.phone}</TableCell>
                          <TableCell>{getRoleBadge(u.role)}</TableCell>
                          <TableCell>
                            {u.isVerified ? (
                              <Badge className="bg-green-500">موثق</Badge>
                            ) : (
                              <Badge className="bg-gray-400">غير موثق</Badge>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(u.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedUser(u)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {/* Role Upgrade/Downgrade Buttons */}
                              {u.role === "CUSTOMER" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-purple-600 border-purple-300 hover:bg-purple-50"
                                  onClick={() => handleUpgradeToAgent(u.id)}
                                  title="ترقية إلى مندوبة"
                                >
                                  <UserCheck className="h-4 w-4" />
                                </Button>
                              )}
                              {u.role === "AGENT" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                  onClick={() => handleDowngradeToCustomer(u.id)}
                                  title="إلغاء صلاحية المندوبة"
                                >
                                  <UserCheck className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant={u.isActive ? "destructive" : "default"}
                                onClick={() => handleToggleUserStatus(u.id, !u.isActive)}
                              >
                                {u.isActive ? (
                                  <XCircle className="h-4 w-4" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card className="border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>إدارة الطلبات</CardTitle>
                <Button onClick={fetchOrders} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 ml-2" />
                  تحديث
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم الطلب</TableHead>
                        <TableHead>العميلة</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono">
                            #{order.id.slice(-6)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{order.customer.name}</p>
                              <p className="text-xs text-[var(--muted-foreground)]">
                                {order.customer.phone}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                          <TableCell>{formatDate(order.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedOrder(order)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {order.status === "PENDING" && (
                                <Button
                                  size="sm"
                                  className="bg-blue-500 hover:bg-blue-600"
                                  onClick={() => handleUpdateOrderStatus(order.id, "PROCESSING")}
                                >
                                  تجهيز
                                </Button>
                              )}
                              {order.status === "PROCESSING" && (
                                <Button
                                  size="sm"
                                  className="bg-green-500 hover:bg-green-600"
                                  onClick={() => handleUpdateOrderStatus(order.id, "DELIVERED")}
                                >
                                  تسليم
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card className="border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>إدارة المنتجات ({products.length})</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={fetchProducts} variant="outline" size="sm">
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
                {products.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-[var(--muted-foreground)] mb-4">لا توجد منتجات حالياً</p>
                    <Button onClick={openNewProduct} className="bg-[var(--gold)] hover:bg-[var(--gold-dark)]">
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة منتج جديد
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {products.map((product) => (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100"
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
                              {product.originalPrice && product.originalPrice > product.price && (
                                <Badge className="bg-[var(--rose)]">
                                  -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                                </Badge>
                              )}
                            </div>
                            <div className="absolute top-2 left-2 flex gap-1">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 w-8 p-0"
                                onClick={() => handleToggleFeatured(product)}
                              >
                                <Star className={`h-4 w-4 ${product.isFeatured ? "fill-[var(--gold)] text-[var(--gold)]" : ""}`} />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 w-8 p-0"
                                onClick={() => openEditProduct(product)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 w-8 p-0"
                                onClick={() => handleDeleteProduct(product.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="p-3">
                            <p className="text-xs text-[var(--muted-foreground)] mb-1">
                              {product.category?.nameAr || "بدون تصنيف"}
                            </p>
                            <h3 className="font-semibold text-sm line-clamp-1">{product.nameAr}</h3>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[var(--gold-dark)]">
                                  {product.price.toLocaleString()} ر.ي
                                </span>
                                {product.originalPrice && product.originalPrice > product.price && (
                                  <span className="text-xs text-gray-400 line-through">
                                    {product.originalPrice.toLocaleString()}
                                  </span>
                                )}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                المخزون: {product.stock}
                              </Badge>
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

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card className="border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>إدارة التصنيفات ({categories.length})</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={fetchCategories} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 ml-2" />
                    تحديث
                  </Button>
                  <Button onClick={openNewCategory} className="bg-[var(--gold)] hover:bg-[var(--gold-dark)]">
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة تصنيف
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {categories.length === 0 ? (
                  <div className="text-center py-12">
                    <Tag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-[var(--muted-foreground)] mb-4">لا توجد تصنيفات حالياً</p>
                    <Button onClick={openNewCategory} className="bg-[var(--gold)] hover:bg-[var(--gold-dark)]">
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة تصنيف جديد
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categories.map((category) => (
                        <motion.div
                          key={category.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100"
                        >
                          <div className="relative aspect-video">
                            {category.image ? (
                              <img
                                src={category.image}
                                alt={category.nameAr}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-[var(--gold-light)] to-[var(--gold)] flex items-center justify-center">
                                <Tag className="h-12 w-12 text-white" />
                              </div>
                            )}
                            <div className="absolute top-2 left-2 flex gap-1">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 w-8 p-0"
                                onClick={() => openEditCategory(category)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 w-8 p-0"
                                onClick={() => handleDeleteCategory(category.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="p-4">
                            <h3 className="font-bold text-lg">{category.nameAr}</h3>
                            <p className="text-sm text-gray-500">{category.name}</p>
                            <p className="text-xs text-[var(--muted-foreground)] mt-1">
                              Slug: {category.slug}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>المحادثات</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-[var(--muted-foreground)] py-12">
                  سيتم إضافة المحادثات الفورية قريباً...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* User Details Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تفاصيل المستخدم</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-[var(--gold)] text-white text-xl">
                    {selectedUser.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-lg">{selectedUser.name}</p>
                  {getRoleBadge(selectedUser.role)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">البريد:</span>
                  <span>{selectedUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">الجوال:</span>
                  <span>{selectedUser.phone}</span>
                </div>
                {selectedUser.address && (
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">العنوان:</span>
                    <span>{selectedUser.address}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">التسجيل:</span>
                  <span>{formatDate(selectedUser.createdAt)}</span>
                </div>
                <hr />
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">الطلبات:</span>
                  <span>{selectedUser._count.orders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">المنتجات:</span>
                  <span>{selectedUser._count.products}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب #{selectedOrder?.id.slice(-6)}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">الحالة:</span>
                {getStatusBadge(selectedOrder.status)}
              </div>

              <div className="space-y-2 p-4 bg-[var(--muted)] rounded-lg">
                <p className="font-medium">بيانات العميلة</p>
                <div className="text-sm space-y-1">
                  <p>الاسم: {selectedOrder.customer.name}</p>
                  <p>البريد: {selectedOrder.customer.email}</p>
                  <p>الجوال: {selectedOrder.customer.phone}</p>
                  <p>العنوان: {selectedOrder.customer.address}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-medium">المنتجات</p>
                {selectedOrder.items.map((item, index) => (
                  <div key={index} className="flex justify-between p-2 bg-[var(--muted)] rounded">
                    <span>{item.product.nameAr}</span>
                    <span>x{item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between font-bold text-lg">
                <span>المجموع:</span>
                <span>{formatCurrency(selectedOrder.totalAmount)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Product Form Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={(open) => {
        setIsProductDialogOpen(open);
        if (!open) resetProductForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-[var(--gold)]" />
              {selectedProduct ? "تعديل المنتج" : "إضافة منتج جديد"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Image Preview */}
            {productForm.mainImage && (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={productForm.mainImage}
                  alt="معاينة"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Image URL */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                صورة المنتج *
              </Label>
              
              {/* Image Upload from Device */}
              <div className="flex gap-2">
                <Input
                  placeholder="رابط الصورة أو ارفع من جهازك"
                  value={productForm.mainImage}
                  onChange={(e) => setProductForm({ ...productForm, mainImage: e.target.value })}
                  className="flex-1"
                />
                <input
                  type="file"
                  accept="image/*"
                  id="admin-image-upload"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      toast({ title: "جاري رفع الصورة...", description: "يرجى الانتظار" });
                      try {
                        const result = await uploadImage(file);
                        if (result.success && result.url) {
                          setProductForm({ ...productForm, mainImage: result.url });
                          toast({ title: "تم الرفع", description: "تم حفظ الصورة في السحابة بنجاح" });
                        } else {
                          toast({ title: "خطأ", description: result.error || "فشل رفع الصورة", variant: "destructive" });
                        }
                      } catch (error) {
                        toast({ title: "خطأ", description: "فشل رفع الصورة", variant: "destructive" });
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('admin-image-upload')?.click()}
                >
                  <Upload className="h-4 w-4 ml-2" />
                  رفع
                </Button>
              </div>
              
              <p className="text-xs text-gray-500">
                أدخلي رابط صورة أو ارفعي صورة من جهازك (يتم حفظها في السحابة)
              </p>
            </div>

            {/* Names */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اسم المنتج (عربي) *</Label>
                <Input
                  placeholder="عطر الليل الذهبي"
                  value={productForm.nameAr}
                  onChange={(e) => setProductForm({ ...productForm, nameAr: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>اسم المنتج (إنجليزي) *</Label>
                <Input
                  placeholder="Golden Night Perfume"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                />
              </div>
            </div>

            {/* Descriptions */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الوصف (عربي)</Label>
                <Textarea
                  placeholder="وصف المنتج بالعربية..."
                  value={productForm.descriptionAr}
                  onChange={(e) => setProductForm({ ...productForm, descriptionAr: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>الوصف (إنجليزي)</Label>
                <Textarea
                  placeholder="Product description in English..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>السعر (ر.ي) *</Label>
                <Input
                  type="number"
                  placeholder="299"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>السعر الأصلي (قبل الخصم)</Label>
                <Input
                  type="number"
                  placeholder="450"
                  value={productForm.originalPrice}
                  onChange={(e) => setProductForm({ ...productForm, originalPrice: e.target.value })}
                />
              </div>
            </div>

            {/* Stock & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المخزون</Label>
                <Input
                  type="number"
                  placeholder="10"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                />
              </div>
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
            </div>

            {/* Toggles */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={productForm.isFeatured}
                    onCheckedChange={(checked) => setProductForm({ ...productForm, isFeatured: checked })}
                  />
                  <Label className="cursor-pointer">منتج مميز</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={productForm.isActive}
                    onCheckedChange={(checked) => setProductForm({ ...productForm, isActive: checked })}
                  />
                  <Label className="cursor-pointer">نشط</Label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsProductDialogOpen(false);
                  resetProductForm();
                }}
              >
                إلغاء
              </Button>
              <Button
                className="flex-1 bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
                onClick={handleSaveProduct}
                disabled={isSavingProduct}
              >
                {isSavingProduct ? (
                  <RefreshCw className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Save className="h-4 w-4 ml-2" />
                )}
                {selectedProduct ? "حفظ التغييرات" : "إضافة المنتج"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => {
        setIsCategoryDialogOpen(open);
        if (!open) resetCategoryForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-[var(--gold)]" />
              {selectedCategory ? "تعديل التصنيف" : "إضافة تصنيف جديد"}
            </DialogTitle>
            <DialogDescription>
              {selectedCategory ? "قم بتعديل بيانات التصنيف" : "أضف تصنيفاً جديداً للمنتجات"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Image Preview */}
            {categoryForm.image && (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={categoryForm.image}
                  alt="معاينة"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Image URL */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                صورة التصنيف
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="رابط الصورة أو ارفع من جهازك"
                  value={categoryForm.image}
                  onChange={(e) => setCategoryForm({ ...categoryForm, image: e.target.value })}
                  className="flex-1"
                />
                <input
                  type="file"
                  accept="image/*"
                  id="category-image-upload"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      toast({ title: "جاري رفع الصورة...", description: "يرجى الانتظار" });
                      try {
                        const result = await uploadImage(file);
                        if (result.success && result.url) {
                          setCategoryForm({ ...categoryForm, image: result.url });
                          toast({ title: "تم الرفع", description: "تم حفظ الصورة في السحابة بنجاح" });
                        } else {
                          toast({ title: "خطأ", description: result.error || "فشل رفع الصورة", variant: "destructive" });
                        }
                      } catch (error) {
                        toast({ title: "خطأ", description: "فشل رفع الصورة", variant: "destructive" });
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('category-image-upload')?.click()}
                >
                  <Upload className="h-4 w-4 ml-2" />
                  رفع
                </Button>
              </div>
            </div>

            {/* Names */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اسم التصنيف (عربي) *</Label>
                <Input
                  placeholder="عطور"
                  value={categoryForm.nameAr}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCategoryForm({ 
                      ...categoryForm, 
                      nameAr: value,
                      slug: value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '')
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>اسم التصنيف (إنجليزي) *</Label>
                <Input
                  placeholder="Perfumes"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                />
              </div>
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label>الرابط (Slug)</Label>
              <Input
                placeholder="perfumes"
                value={categoryForm.slug}
                onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                dir="ltr"
              />
              <p className="text-xs text-gray-500">
                سيستخدم في رابط الصفحة: /category/{categoryForm.slug || '...'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsCategoryDialogOpen(false);
                  resetCategoryForm();
                }}
              >
                إلغاء
              </Button>
              <Button
                className="flex-1 bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
                onClick={handleSaveCategory}
                disabled={isSavingCategory}
              >
                {isSavingCategory ? (
                  <RefreshCw className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Save className="h-4 w-4 ml-2" />
                )}
                {selectedCategory ? "حفظ التغييرات" : "إضافة التصنيف"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
