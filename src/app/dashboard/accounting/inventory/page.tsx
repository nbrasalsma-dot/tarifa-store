"use client";

import { useEffect, useState } from "react";
import { useAccounting } from "@/contexts/accounting-context";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InventoryFormDialog } from "@/components/accounting/inventory-form-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Package,
  Loader2,
  Search,
  Plus,
  AlertCircle,
  Edit,
  Trash2,
  Filter,
  Boxes,
  DollarSign,
  Layers,
  User,
  Tag,
  Hash,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

// أنواع البيانات
interface Product {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  costPrice: number | null;
  stock: number;
  sku: string | null;
  mainImage: string;
  descriptionAr: string | null;
  isActive: boolean;
  categoryId: string | null;
  supplierId: string | null;
  category: { id: string; name: string; nameAr: string } | null;
  supplier: { id: string; name: string; type: string } | null;
  merchant: { id: string; storeName: string } | null;
  agent: { id: string; name: string } | null;
}

interface InventoryStats {
  totalProducts: number;
  lowStockProducts: number;
  inventoryValue: number;
}

interface FilterOptions {
  categories: { id: string; nameAr: string }[];
  suppliers: { id: string; name: string; type: string }[];
}

export default function AccountingInventoryPage() {
  const {
    user,
    isLoading: userLoading,
    hasPermission,
    fetchWithAuth,
  } = useAccounting();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (selectedCategory && selectedCategory !== "all")
        params.append("categoryId", selectedCategory);
      if (selectedSupplier && selectedSupplier !== "all")
        params.append("supplierId", selectedSupplier);
      if (showLowStockOnly) params.append("lowStock", "true");

      const res = await fetchWithAuth(
        `/api/accounting/inventory?${params.toString()}`,
      );
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
        setStats(data.stats);
        setFilters(data.filters);
      }
    } catch (error) {
      console.error("فشل جلب المنتجات:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/");
      return;
    }
    if (!userLoading && !hasPermission("view_inventory")) {
      router.push("/");
      return;
    }
  }, [userLoading, user, hasPermission, router]);

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user, searchQuery, selectedCategory, selectedSupplier, showLowStockOnly]);

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (selectedCategory !== "all")
        params.append("categoryId", selectedCategory);
      if (selectedSupplier !== "all")
        params.append("supplierId", selectedSupplier);
      if (showLowStockOnly) params.append("lowStock", "true");

      const res = await fetchWithAuth(
        `/api/accounting/inventory?${params.toString()}`,
      );
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
        setStats(data.stats);
        setFilters(data.filters);
      }
    } catch (error) {
      console.error("فشل جلب بيانات المخازن:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-YE", {
      style: "currency",
      currency: "YER",
    }).format(amount);
  };

  const handleSearch = () => {
    fetchInventory();
  };

  if (userLoading || isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#C9A962]" />
      </div>
    );
  }

  if (!user) return null;
  const statCards = [
    {
      title: "عدد الأصناف",
      value: stats?.totalProducts || 0,
      icon: Boxes,
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "أصناف منخفضة",
      value: stats?.lowStockProducts || 0,
      icon: AlertCircle,
      color: "bg-orange-50 text-orange-600",
    },
    {
      title: "قيمة المخزون",
      value: formatCurrency(stats?.inventoryValue || 0),
      icon: DollarSign,
      color: "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6 p-1">
      {/* عنوان الصفحة */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#3D3021]">المخازن</h2>
          <p className="text-sm text-[#8B7355]">إدارة المخزون والمنتجات</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                className="bg-[#C9A962] hover:bg-[#B8956E] text-white"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4 ml-1" />
                إضافة صنف
              </Button>
            </DialogTrigger>
            <InventoryFormDialog
              open={addDialogOpen}
              onOpenChange={(open) => {
                setAddDialogOpen(open);
                if (!open) setSelectedProduct(null);
              }}
              product={selectedProduct}
              onSuccess={() => {
                fetchProducts();
                setSelectedProduct(null);
              }}
              fetchWithAuth={fetchWithAuth} // ← هذا السطر الجديد
            />
          </Dialog>
        </div>
      </div>

      {/* كروت الإحصائيات */}
      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map((stat, index) => (
          <Card key={index} className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#5D5D5D]">
                {stat.title}
              </CardTitle>
              <div className={cn("rounded-full p-2", stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#3D3021]">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* أدوات البحث والفلترة */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A69B8D]" />
                <Input
                  placeholder="بحث عن منتج..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pr-10 bg-[#FAF7F2] border-[#E8E0D8]"
                />
              </div>
            </div>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-[180px] bg-[#FAF7F2] border-[#E8E0D8]">
                <SelectValue placeholder="التصنيف" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع التصنيفات</SelectItem>
                {filters?.categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.nameAr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedSupplier}
              onValueChange={setSelectedSupplier}
            >
              <SelectTrigger className="w-[180px] bg-[#FAF7F2] border-[#E8E0D8]">
                <SelectValue placeholder="المورد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الموردين</SelectItem>
                {filters?.suppliers.map((sup) => (
                  <SelectItem key={sup.id} value={sup.id}>
                    {sup.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showLowStockOnly ? "default" : "outline"}
              className={cn(
                showLowStockOnly
                  ? "bg-orange-500 hover:bg-orange-600 text-white"
                  : "border-[#E8E0D8]",
              )}
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            >
              <AlertCircle className="h-4 w-4 ml-1" />
              منخفض فقط
            </Button>
            <Button
              variant="outline"
              className="border-[#E8E0D8]"
              onClick={handleSearch}
            >
              <Filter className="h-4 w-4 ml-1" />
              تطبيق
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* شبكة المنتجات */}
      <ScrollArea className="h-[calc(100vh-380px)]">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-[#A69B8D]">
              <Package className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg">لا توجد منتجات في المخزن</p>
              <p className="text-sm">قم بإضافة صنف جديد للبدء</p>
            </div>
          ) : (
            products.map((product) => (
              <Card
                key={product.id}
                className="group border-0 shadow-lg overflow-hidden hover:shadow-xl transition-all"
              >
                <div className="relative aspect-square bg-[#F5EFE6]">
                  <img
                    src={product.mainImage || "/placeholder.png"}
                    alt={product.nameAr}
                    className="h-full w-full object-cover"
                  />
                  {product.stock < 5 && (
                    <Badge className="absolute top-2 right-2 bg-orange-500 text-white">
                      منخفض
                    </Badge>
                  )}
                  {!product.isActive && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Badge className="bg-gray-500 text-white">غير نشط</Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="mb-2">
                    <h3 className="font-bold text-[#3D3021] line-clamp-1">
                      {product.nameAr}
                    </h3>
                    <p className="text-xs text-[#A69B8D] line-clamp-1">
                      {product.name}
                    </p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[#8B7355]">السعر:</span>
                      <span className="font-bold text-[#3D3021]">
                        {formatCurrency(product.price)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8B7355]">التكلفة:</span>
                      <span className="font-medium text-[#5D5D5D]">
                        {product.costPrice
                          ? formatCurrency(product.costPrice)
                          : "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8B7355]">المخزون:</span>
                      <span
                        className={cn(
                          "font-bold",
                          product.stock < 5
                            ? "text-orange-600"
                            : "text-emerald-600",
                        )}
                      >
                        {product.stock}
                      </span>
                    </div>
                    {product.supplier && (
                      <div className="flex items-center gap-1 text-xs text-[#8B7355]">
                        <User className="h-3 w-3" />
                        <span className="truncate">
                          {product.supplier.name}
                        </span>
                      </div>
                    )}
                    {product.category && (
                      <div className="flex items-center gap-1 text-xs text-[#8B7355]">
                        <Layers className="h-3 w-3" />
                        <span>{product.category.nameAr}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-[#8B7355] hover:text-[#C9A962]"
                      onClick={() => {
                        setSelectedProduct(product);
                        setAddDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-[#8B7355] hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
