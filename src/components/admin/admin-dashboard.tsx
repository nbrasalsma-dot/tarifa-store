"use client";

import { useState, useEffect } from "react";
import { AdminOrdersTab } from "./admin-orders-tab";
import { AdminUsersTab } from "./admin-users-tab"; // 👈 إضافة الملف الجديد هنا
import { AdsManager } from "./ads-manager"; // 👈 استدعاء واجهة الإعلانات
import { AgentInbox } from "@/components/chat/agent-inbox";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationBell } from "../layout/notification-bell";
import { pusherClient } from "@/lib/pusher";
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
    Store,
    UserPlus,
    MapPin, // أيقونة المحافظات الجديدة
    Megaphone, // أيقونة الإعلانات والواجهة
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
import { ProductFormDialog } from "@/components/shared/product-form-dialog";
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
    paymentMethod?: string;
    paymentDetails?: any;
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

interface Merchant {
    id: string;
    storeName: string;
    storeType: string;
    fullName: string;
    phone: string;
    email: string;
    address: string;
    identityCardImage: string;
    jeibWallet: string | null;
    kashWallet: string | null;
    jawaliWallet: string | null;
    transferInfo: string | null;
    isApproved: boolean;
    isActive: boolean;
    commissionAmount: number;
    totalSales: number;
    totalCommission: number;
    createdAt: string;
    user: {
        id: string;
        email: string;
        name: string;
        phone: string;
        isVerified: boolean;
        isActive: boolean;
        createdAt: string;
    };
}

// واجهة المحافظات الجديدة
interface Governorate {
    id: string;
    name: string;
    nameAr: string;
    deliveryFee: number;
    isActive: boolean;
    createdAt: string;
}

// دالة فك تشفير الروابط المحولة إلى HTML Entities
const decodeHtml = (html: string) => {
    if (typeof window === 'undefined') return html;
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
};

export function AdminDashboard({ user, onLogout, onViewStore }: AdminDashboardProps) {
    const [activeTab, setActiveTab] = useState("overview");
    const [stats, setStats] = useState<Stats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // Products state
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
    const [isSavingProduct, setIsSavingProduct] = useState(false);

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

    // Merchants state
    const [merchants, setMerchants] = useState<Merchant[]>([]);
    const [merchantStats, setMerchantStats] = useState({ total: 0, pending: 0, approved: 0 });
    const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
    const [isMerchantDialogOpen, setIsMerchantDialogOpen] = useState(false);
    const [merchantFilter, setMerchantFilter] = useState<"all" | "pending" | "approved">("all");

    // Governorates state (جديد)
    const [governorates, setGovernorates] = useState<Governorate[]>([]);
    const [govForm, setGovForm] = useState({
        name: "",
        nameAr: "",
        deliveryFee: "",
    });
    const [isSavingGov, setIsSavingGov] = useState(false);

    // Email test state
    const [testEmail, setTestEmail] = useState("");
    const [emailSending, setEmailSending] = useState(false);
    const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null);

    // Fetch dashboard data
    useEffect(() => {
        fetchStats();
        fetchCategories();
    }, []);
    // 👇 التحديث اللحظي: الاستماع لأي تغيير في قاعدة البيانات
    useEffect(() => {
        if (!pusherClient) return;

        // نستمع لنفس قناة الإشعارات الخاصة بالأدمن
        const channel = pusherClient.subscribe(`user-${user.id}`);

        channel.bind("new-notification", () => {
            // 1. تحديث الإحصائيات العلوية دائماً
            fetchStats();

            // 2. تحديث بيانات التبويب (Tab) المفتوح حالياً فقط لتخفيف الضغط على السيرفر
            if (activeTab === "orders") fetchOrders();
            if (activeTab === "products") fetchProducts();
            if (activeTab === "merchants") fetchMerchants(merchantFilter === "all" ? undefined : merchantFilter);
            if (activeTab === "users") fetchUsers();
        });

        return () => {
            pusherClient.unsubscribe(`user-${user.id}`);
        };
    }, [user.id, activeTab, merchantFilter]); // يتحدث تلقائياً حسب التبويب المفتوح

    const fetchStats = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch("/api/stats", {
                headers: token ? { "Authorization": `Bearer ${token}` } : {},
            });
            const data = await response.json();
            if (data.success) {
                setStats(data.stats);
            } else {
                console.error("Stats error:", data.error);
            }
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
            setCategories([
                { id: "perfumes", name: "Perfumes", nameAr: "عطور", slug: "perfumes" },
                { id: "makeup", name: "Makeup", nameAr: "مكياج", slug: "makeup" },
                { id: "accessories", name: "Accessories", nameAr: "أكسسوارات", slug: "accessories" },
                { id: "skincare", name: "Skincare", nameAr: "عناية", slug: "skincare" },
            ]);
        }
    };

    // Fetch merchants
    const fetchMerchants = async (status?: "pending" | "approved") => {
        try {
            const token = localStorage.getItem("token");
            const url = status
                ? `/api/admin/merchants?status=${status}`
                : "/api/admin/merchants";
            const response = await fetch(url, {
                headers: token ? { "Authorization": `Bearer ${token}` } : {},
            });
            const data = await response.json();
            setMerchants(data.merchants || []);
            setMerchantStats(data.stats || { total: 0, pending: 0, approved: 0 });
        } catch {
            console.error("Fetch merchants error:");
            setMerchants([]);
        }
    };

    // Fetch Governorates (جديد)
    const fetchGovernorates = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch("/api/governorates", {
                headers: token ? { "Authorization": `Bearer ${token}` } : {},
            });
            const data = await response.json();
            if (data.success) {
                setGovernorates(data.governorates);
            }
        } catch (error) {
            console.error("Fetch governorates error:", error);
        }
    };

    // Handle Add Governorate (جديد)
    const handleAddGovernorate = async () => {
        if (!govForm.name || !govForm.nameAr || !govForm.deliveryFee) {
            toast({
                title: "خطأ",
                description: "يرجى ملء جميع الحقول (الاسم بالإنجليزي، بالعربي، ورسوم التوصيل)",
                variant: "destructive",
            });
            return;
        }

        setIsSavingGov(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch("/api/governorates", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(govForm),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "تم",
                    description: "تم إضافة المحافظة بنجاح",
                });
                setGovForm({ name: "", nameAr: "", deliveryFee: "" });
                fetchGovernorates();
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
            setIsSavingGov(false);
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

    // Handle approve/reject merchant
    const handleMerchantApproval = async (merchantId: string, approved: boolean, commissionAmount?: number) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`/api/admin/merchants/${merchantId}/approve`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ approved, commissionAmount }),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "تم",
                    description: approved ? "تم تفعيل التاجر بنجاح" : "تم رفض التاجر",
                });
                fetchMerchants(merchantFilter === "all" ? undefined : merchantFilter);
            } else {
                toast({
                    title: "خطأ",
                    description: data.error || "حدث خطأ",
                    variant: "destructive",
                });
            }
        } catch {
            toast({
                title: "خطأ",
                description: "حدث خطأ في الاتصال",
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
        // تحميل المحافظات عند الدخول للتبويب (جديد)
        if (activeTab === "governorates" && governorates.length === 0) {
            fetchGovernorates();
        }
    }, [activeTab, users.length, orders.length, governorates.length]);

    // Load merchants when tab changes
    useEffect(() => {
        if (activeTab === "merchants") {
            fetchMerchants(merchantFilter === "all" ? undefined : merchantFilter);
        }
    }, [activeTab, merchantFilter]);

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

    // دالة تغيير رتبة المستخدم (أدمن، تاجر، مندوب، عميل)
    const handleUpdateRole = async (userId: string, newRole: string) => {
        if (!confirm(`هل أنت متأكد من تغيير رتبة هذا المستخدم إلى رتبة جديدة؟`)) return;

        try {
            const token = localStorage.getItem("token");
            const response = await fetch("/api/users", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ userId, role: newRole }),
            });

            if (response.ok) {
                toast({
                    title: "تم تحديث الرتبة",
                    description: "تم تغيير صلاحيات المستخدم بنجاح",
                });
                fetchUsers(); // تحديث القائمة فوراً
                fetchStats(); // تحديث الإحصائيات (لأن عدد المناديب أو التجار قد يتغير)
            } else {
                throw new Error("فشل التحديث");
            }
        } catch (error) {
            toast({
                title: "خطأ",
                description: "حدث خطأ أثناء محاولة تغيير الرتبة",
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

    // Open product dialog for new product
    const openNewProduct = () => {
        setSelectedProduct(null);
        setIsProductDialogOpen(true);
    };

    // Open product dialog for editing
    const openEditProduct = (product: Product) => {
        setSelectedProduct(product);
        setIsProductDialogOpen(true);
    };

    // Save product (يستقبل البيانات الجاهزة من النافذة الجديدة)
    const handleSaveProduct = async (productData: any) => {
        setIsSavingProduct(true);
        try {
            const url = "/api/products";
            const method = selectedProduct ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(productData),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "تم",
                    description: selectedProduct ? "تم تحديث المنتج" : "تم إضافة المنتج",
                });
                setIsProductDialogOpen(false);
                setSelectedProduct(null);
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
                            <NotificationBell userId={user.id} />
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
                        <TabsTrigger value="merchants" className="gap-2">
                            <Store className="h-4 w-4" />
                            التجار
                            {merchantStats.pending > 0 && (
                                <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 ml-1">
                                    {merchantStats.pending}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="governorates" className="gap-2">
                            <MapPin className="h-4 w-4" />
                            المحافظات
                        </TabsTrigger>
                        <TabsTrigger value="ads" className="gap-2 font-bold text-[var(--gold-dark)]">
                            <Megaphone className="h-4 w-4" />
                            الواجهة والإعلانات
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

                    <TabsContent value="users">
                        {/* 📥 استدعاء واجهة المستخدمين من الملف المنفصل لتقليل حجم الكود */}
                        <AdminUsersTab
                            users={users}
                            onRefresh={fetchUsers}
                            handleToggleUserStatus={handleToggleUserStatus}
                            handleUpdateRole={handleUpdateRole} // 👈 مررنا الدالة الشاملة الجديدة
                            formatDate={formatDate}
                        />
                    </TabsContent>س

                    <TabsContent value="orders">
                        <AdminOrdersTab
                            orders={orders}
                            onRefresh={fetchOrders}
                            onUpdateStatus={handleUpdateOrderStatus}
                            formatCurrency={formatCurrency}
                            formatDate={formatDate}
                            getStatusBadge={getStatusBadge}
                        />
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

                    {/* Governorates Tab (جديد بالكامل) */}
                    <TabsContent value="governorates">
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="h-5 w-5 text-[var(--gold)]" />
                                    إدارة المحافظات ورسوم التوصيل
                                </CardTitle>
                                <Button onClick={fetchGovernorates} variant="outline" size="sm">
                                    <RefreshCw className="h-4 w-4 ml-2" />
                                    تحديث
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Add Form */}
                                <div className="p-4 bg-gray-50 rounded-lg border overflow-x-auto">
                                    <h3 className="font-bold mb-3">إضافة محافظة جديدة</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>الاسم (إنجليزي) *</Label>
                                            <Input
                                                placeholder="e.g., Sana'a"
                                                value={govForm.name}
                                                onChange={(e) => setGovForm({ ...govForm, name: e.target.value })}
                                                dir="ltr"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>الاسم (عربي) *</Label>
                                            <Input
                                                placeholder="مثال: صنعاء"
                                                value={govForm.nameAr}
                                                onChange={(e) => setGovForm({ ...govForm, nameAr: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>رسوم التوصيل (ر.ي) *</Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    placeholder="0 للمجان"
                                                    value={govForm.deliveryFee}
                                                    onChange={(e) => setGovForm({ ...govForm, deliveryFee: e.target.value })}
                                                    className="pl-14"
                                                />
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">ر.ي</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <Button
                                            onClick={handleAddGovernorate}
                                            disabled={isSavingGov}
                                            className="bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
                                        >
                                            {isSavingGov ? <RefreshCw className="h-4 w-4 animate-spin ml-2" /> : <Plus className="h-4 w-4 ml-2" />}
                                            إضافة محافظة
                                        </Button>
                                    </div>
                                </div>

                                {/* List */}
                                {governorates.length === 0 ? (
                                    <div className="text-center py-12">
                                        <MapPin className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                                        <p className="text-[var(--muted-foreground)]">لا توجد محافظات مضافة حالياً</p>
                                        <p className="text-xs text-[var(--muted-foreground)] mt-2">قم بإضافة المحافظات لتحديد رسوم التوصيل</p>
                                    </div>
                                ) : (
                                    <div className="w-full overflow-x-auto rounded-lg border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="min-w-[150px]">المحافظة (عربي)</TableHead>
                                                    <TableHead className="min-w-[150px]">المحافظة (إنجليزي)</TableHead>
                                                    <TableHead className="min-w-[120px]">رسوم التوصيل</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {governorates.map((gov) => (
                                                    <TableRow key={gov.id}>
                                                        <TableCell className="font-medium">{gov.nameAr}</TableCell>
                                                        <TableCell dir="ltr" className="text-gray-500">{gov.name}</TableCell>
                                                        <TableCell>
                                                            {gov.deliveryFee === 0 ? (
                                                                <Badge className="bg-green-500">توصيل مجاني</Badge>
                                                            ) : (
                                                                <span className="font-bold text-[var(--gold-dark)]">
                                                                    {gov.deliveryFee.toLocaleString()} ر.ي
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    {/* Ads and Interface Tab (قسم الإعلانات الجديد) */}
                    <TabsContent value="ads">
                        <AdsManager />
                    </TabsContent>
                    {/* Messages Tab (Inbox) */}
                    <TabsContent value="messages">
                        {/* استدعاء صندوق الوارد الخاص بالإدارة */}
                        <AgentInbox agentId={user.id} />
                    </TabsContent>

                    {/* Merchants Tab */}
                    <TabsContent value="merchants">
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Store className="h-5 w-5 text-[var(--gold)]" />
                                    إدارة التجار
                                </CardTitle>
                                <div className="flex gap-2">
                                    <Button onClick={() => fetchMerchants(merchantFilter === "all" ? undefined : merchantFilter)} variant="outline" size="sm">
                                        <RefreshCw className="h-4 w-4 ml-2" />
                                        تحديث
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* Filter Buttons */}
                                <div className="flex gap-2 mb-4">
                                    <Button
                                        variant={merchantFilter === "all" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setMerchantFilter("all")}
                                        className={merchantFilter === "all" ? "bg-[var(--gold)] hover:bg-[var(--gold-dark)]" : ""}
                                    >
                                        الكل ({merchantStats.total})
                                    </Button>
                                    <Button
                                        variant={merchantFilter === "pending" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setMerchantFilter("pending")}
                                        className={merchantFilter === "pending" ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                                    >
                                        قيد الانتظار ({merchantStats.pending})
                                    </Button>
                                    <Button
                                        variant={merchantFilter === "approved" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setMerchantFilter("approved")}
                                        className={merchantFilter === "approved" ? "bg-green-500 hover:bg-green-600" : ""}
                                    >
                                        مفعّل ({merchantStats.approved})
                                    </Button>
                                </div>

                                {merchants.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Store className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                                        <p className="text-[var(--muted-foreground)]">لا يوجد تجار حالياً</p>
                                    </div>
                                ) : (
                                    <ScrollArea className="h-[500px]">
                                        <div className="w-full overflow-x-auto rounded-lg border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>اسم المحل</TableHead>
                                                        <TableHead>نوع المنتجات</TableHead>
                                                        <TableHead>اسم التاجر</TableHead>
                                                        <TableHead>الجوال</TableHead>
                                                        <TableHead>الحالة</TableHead>
                                                        <TableHead>تاريخ التسجيل</TableHead>
                                                        <TableHead>إجراءات</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {merchants.map((merchant) => (
                                                        <TableRow key={merchant.id}>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-10 h-10 rounded-full bg-[var(--gold)]/20 flex items-center justify-center">
                                                                        <Store className="h-5 w-5 text-[var(--gold)]" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-medium">{merchant.storeName}</p>
                                                                        <p className="text-xs text-[var(--muted-foreground)]">{merchant.email}</p>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>{merchant.storeType}</TableCell>
                                                            <TableCell>{merchant.fullName}</TableCell>
                                                            <TableCell dir="ltr">{merchant.phone}</TableCell>
                                                            <TableCell>
                                                                {merchant.isApproved ? (
                                                                    <Badge className="bg-green-500">مفعّل</Badge>
                                                                ) : (
                                                                    <Badge className="bg-yellow-500">قيد الانتظار</Badge>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>{formatDate(merchant.createdAt)}</TableCell>
                                                            <TableCell>
                                                                <div className="flex gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => {
                                                                            setSelectedMerchant(merchant);
                                                                            setIsMerchantDialogOpen(true);
                                                                        }}
                                                                    >
                                                                        <Eye className="h-4 w-4" />
                                                                    </Button>
                                                                    {!merchant.isApproved && (
                                                                        <>
                                                                            <Button
                                                                                size="sm"
                                                                                className="bg-green-500 hover:bg-green-600"
                                                                                onClick={() => handleMerchantApproval(merchant.id, true)}
                                                                            >
                                                                                <CheckCircle className="h-4 w-4" />
                                                                            </Button>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="destructive"
                                                                                onClick={() => handleMerchantApproval(merchant.id, false)}
                                                                            >
                                                                                <XCircle className="h-4 w-4" />
                                                                            </Button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </ScrollArea>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

           
            {/* Order Details Dialog */}
            <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex justify-between items-center border-b pb-2">
                            <span>تفاصيل الطلب #{selectedOrder?.id.slice(-8)}</span>
                            {getStatusBadge(selectedOrder?.status || "")}
                        </DialogTitle>
                        <DialogDescription className="sr-only">عرض تفاصيل الطلبية المحددة</DialogDescription>
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="space-y-5 text-sm text-gray-800 mt-2">

                            {/* بيانات العميل (مع دعم بيانات المستلم والموقع الجديدة) */}
                            <div className="space-y-2">
                                <p className="font-bold text-lg text-[var(--gold-dark)]">👤 بيانات العميل:</p>
                                <div className="pr-2 space-y-1 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    {(() => {
                                        let extraData: any = {};
                                        try {
                                            extraData = typeof selectedOrder.paymentDetails === 'string' ? JSON.parse(selectedOrder.paymentDetails) : (selectedOrder.paymentDetails || {});
                                        } catch (e) { }
                                        return (
                                            <>
                                                <p>• <span className="font-medium text-gray-700">صاحب الحساب:</span> {selectedOrder.customer.name}</p>
                                                {/* يظهر اسم المستلم فقط إذا كان هدية لشخص آخر */}
                                                {extraData.customerName && extraData.customerName !== selectedOrder.customer.name && (
                                                    <p className="text-blue-700 font-bold bg-blue-50 p-1.5 rounded mt-1 w-fit border border-blue-100">
                                                        🎁 اسم المستلم للطلب: {extraData.customerName}
                                                    </p>
                                                )}
                                                <p>• <span className="font-medium">الهاتف:</span> <span dir="ltr">{selectedOrder.customer.phone}</span></p>
                                                <p>• <span className="font-medium">العنوان:</span> {selectedOrder.customer.address}</p>
                                                <p className="mt-2 pt-2 border-t border-gray-200">
                                                    📍 <span className="font-medium">الموقع:</span> {extraData.locationLink ? <a href={extraData.locationLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-bold hover:text-blue-800">فتح في خرائط جوجل</a> : <span className="text-gray-400">لم يتم مشاركة الموقع</span>}
                                                </p>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* المنتجات المطلوبة (مع الصور) */}
                            <div className="space-y-2">
                                <p className="font-bold text-lg text-[var(--gold-dark)]">📦 المنتجات المطلوبة:</p>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                    {selectedOrder.items.map((item, index) => (
                                        <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex items-start gap-4">
                                            {/* صورة المنتج */}
                                            {(item.product as any)?.mainImage ? (
                                                <img
                                                    src={(item.product as any).mainImage}
                                                    alt={item.product?.nameAr || "صورة المنتج"}
                                                    className="w-16 h-16 rounded-md object-cover border border-gray-200 shadow-sm shrink-0"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 rounded-md bg-gray-200 flex items-center justify-center shrink-0 border border-gray-300">
                                                    <Package className="h-6 w-6 text-gray-400" />
                                                </div>
                                            )}

                                            {/* تفاصيل المنتج */}
                                            <div className="flex-1 space-y-1">
                                                <p className="font-bold text-base text-gray-900">• {item.product?.nameAr || "منتج غير متاح"}</p>
                                                <div className="text-gray-600 text-sm">
                                                    <p>🔹 <span className="font-medium">العدد:</span> {item.quantity}</p>
                                                    <p>💰 <span className="font-medium">السعر:</span> {item.price.toLocaleString()} ر.ي</p>
                                                    {(item as any).color && <p>🎨 <span className="font-medium">اللون:</span> {(item as any).color}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* الملخص المالي */}
                            <div className="space-y-2">
                                <p className="font-bold text-lg text-[var(--gold-dark)]">💰 الملخص المالي:</p>
                                <div className="pr-2 space-y-1 bg-green-50 p-3 rounded-lg border border-green-100">
                                    <p>• <span className="font-medium">قيمة المنتجات:</span> {(selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)).toLocaleString()} ر.ي</p>
                                    <p>• <span className="font-medium">رسوم التوصيل:</span> {(selectedOrder.totalAmount - selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)).toLocaleString()} ر.ي</p>
                                    <p className="text-base mt-2 border-t border-green-200 pt-2">• <span className="font-bold text-green-700">الإجمالي الكلي: {formatCurrency(selectedOrder.totalAmount)}</span></p>
                                </div>
                            </div>

                            {/* بيانات الدفع */}
                            <div className="space-y-2">
                                <p className="font-bold text-lg text-[var(--gold-dark)]">💳 بيانات الدفع:</p>
                                <div className="pr-2 bg-[var(--gold)]/10 p-3 rounded-lg border border-[var(--gold)]/20 space-y-2">
                                    <p>🔹 <span className="font-medium">طريقة الدفع:</span> {selectedOrder.paymentMethod === 'transfer' ? 'حوالة صرافة' : selectedOrder.paymentMethod === 'wallet' ? 'محفظة إلكترونية' : 'غير محدد'}</p>

                                    {selectedOrder.paymentDetails && (
                                        (() => {
                                            try {
                                                const details = typeof selectedOrder.paymentDetails === 'string'
                                                    ? JSON.parse(selectedOrder.paymentDetails)
                                                    : selectedOrder.paymentDetails;

                                                return (
                                                    <div className="space-y-2 pt-1 border-t border-[var(--gold)]/20 mt-2">
                                                        {details.transferNumber && (
                                                            <p>🔢 <span className="font-medium">رقم الحوالة:</span> <span className="font-bold text-blue-700">{details.transferNumber}</span></p>
                                                        )}
                                                        {details.wallet && (
                                                            <p>🏦 <span className="font-medium">المحفظة:</span> {details.wallet === 'jeib' ? 'جيب' : details.wallet === 'kash' ? 'كاش' : details.wallet === 'jawali' ? 'جوالي' : details.wallet}</p>
                                                        )}
                                                        {details.proofImage && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="w-full mt-2 bg-white border-[var(--gold)] text-[var(--gold-dark)] hover:bg-[var(--gold)] hover:text-white"
                                                                onClick={() => window.open(details.proofImage, '_blank')}
                                                            >
                                                                <Eye className="h-4 w-4 ml-2" />
                                                                فتح صورة الإثبات من السحابة
                                                            </Button>
                                                        )}
                                                    </div>
                                                );
                                            } catch (e) {
                                                return <p className="text-xs text-red-500">فشل في عرض بيانات الدفع التفصيلية</p>;
                                            }
                                        })()
                                    )}
                                </div>
                            </div>

                            {/* الملاحظات */}
                            <div className="pt-2 border-t">
                                <p className="text-gray-600">📝 <span className="font-medium">ملاحظات:</span> {(selectedOrder as any).notes || 'لا يوجد'}</p>
                            </div>

                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Product Form Dialog (النافذة الجديدة المستقلة) */}
            <ProductFormDialog
                isOpen={isProductDialogOpen}
                onClose={() => {
                    setIsProductDialogOpen(false);
                    setSelectedProduct(null);
                }}
                categories={categories}
                selectedProduct={selectedProduct}
                userId={user.id}
                isSaving={isSavingProduct}
                onSave={handleSaveProduct}
            />

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
                        {categoryForm.image && (
                            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                                <img
                                    src={categoryForm.image}
                                    alt="معاينة"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}

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

            {/* Merchant Details Dialog */}
            <Dialog open={isMerchantDialogOpen} onOpenChange={(open) => {
                setIsMerchantDialogOpen(open);
                if (!open) setSelectedMerchant(null);
            }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Store className="h-5 w-5 text-[var(--gold)]" />
                            تفاصيل التاجر
                        </DialogTitle>
                        <DialogDescription className="sr-only">عرض بيانات التاجر وطلب التسجيل الخاص به</DialogDescription>
                    </DialogHeader>
                    {selectedMerchant && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-[var(--gold)]/10 rounded-lg">
                                <div className="w-16 h-16 rounded-full bg-[var(--gold)]/20 flex items-center justify-center">
                                    <Store className="h-8 w-8 text-[var(--gold)]" />
                                </div>
                                <div className="text-center sm:text-right">
                                    <h3 className="text-xl font-bold">{selectedMerchant.storeName}</h3>
                                    <p className="text-[var(--muted-foreground)]">{selectedMerchant.storeType}</p>
                                </div>
                                <div className="sm:mr-auto">
                                    {selectedMerchant.isApproved ? (
                                        <Badge className="bg-green-500 text-lg px-4 py-1">مفعّل</Badge>
                                    ) : (
                                        <Badge className="bg-yellow-500 text-lg px-4 py-1">قيد الانتظار</Badge>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <h4 className="font-bold text-[var(--gold-dark)]">بيانات التاجر</h4>
                                    <div className="space-y-2 text-sm">
                                        <p><span className="font-medium">الاسم الكامل:</span> {selectedMerchant.fullName}</p>
                                        <p><span className="font-medium">البريد:</span> {selectedMerchant.email}</p>
                                        <p><span className="font-medium">الجوال:</span> <span dir="ltr">{selectedMerchant.phone}</span></p>
                                        <p><span className="font-medium">العنوان:</span> {selectedMerchant.address}</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="font-bold text-[var(--gold-dark)]">بيانات الدفع</h4>
                                    <div className="space-y-2 text-sm">
                                        {selectedMerchant.jeibWallet && <p><span className="font-medium">جيب:</span> {selectedMerchant.jeibWallet}</p>}
                                        {selectedMerchant.kashWallet && <p><span className="font-medium">كاش:</span> {selectedMerchant.kashWallet}</p>}
                                        {selectedMerchant.jawaliWallet && <p><span className="font-medium">جوالي:</span> {selectedMerchant.jawaliWallet}</p>}
                                        {selectedMerchant.transferInfo && <p><span className="font-medium">حوالة:</span> {selectedMerchant.transferInfo}</p>}
                                        {!selectedMerchant.jeibWallet && !selectedMerchant.kashWallet && !selectedMerchant.jawaliWallet && !selectedMerchant.transferInfo && (
                                            <p className="text-[var(--muted-foreground)]">لم يتم إضافة بيانات دفع</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-bold text-[var(--gold-dark)]">صورة البطاقة الشخصية</h4>
                                <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 border">
                                    <img
                                        src={decodeHtml(selectedMerchant.identityCardImage)}
                                        alt="صورة البطاقة"
                                        className="w-full h-full object-contain"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="absolute bottom-2 left-2 bg-white/90 hover:bg-white shadow-sm border-[var(--gold)] text-[var(--gold-dark)]"
                                        onClick={() => window.open(decodeHtml(selectedMerchant.identityCardImage), '_blank')}
                                    >
                                        <Eye className="h-4 w-4 ml-2" />
                                        فتح في تاب جديد
                                    </Button>
                                </div>
                            </div>

                            {!selectedMerchant.isApproved && (
                                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setIsMerchantDialogOpen(false)}
                                    >
                                        إلغاء
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        className="flex-1"
                                        onClick={() => {
                                            handleMerchantApproval(selectedMerchant.id, false);
                                            setIsMerchantDialogOpen(false);
                                        }}
                                    >
                                        <XCircle className="h-4 w-4 ml-2" />
                                        رفض
                                    </Button>
                                    <Button
                                        className="flex-1 bg-green-500 hover:bg-green-600"
                                        onClick={() => {
                                            handleMerchantApproval(selectedMerchant.id, true);
                                            setIsMerchantDialogOpen(false);
                                        }}
                                    >
                                        <CheckCircle className="h-4 w-4 ml-2" />
                                        موافقة
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}