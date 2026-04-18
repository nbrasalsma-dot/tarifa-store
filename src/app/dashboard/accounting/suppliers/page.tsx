"use client";

import { useEffect, useState } from "react";
import { useAccounting } from "@/contexts/accounting-context";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Users,
  TrendingUp,
  DollarSign,
  Percent,
  Loader2,
  Plus,
  Edit,
  FileText,
  Store,
  Package,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface SupplierProduct {
  id: string;
  nameAr: string;
  price: number;
  costPrice: number | null;
  stock: number;
  mainImage: string;
}

interface Supplier {
  id: string;
  name: string;
  type: string;
  commission: number | null;
  contactInfo: string | null;
  notes: string | null;
  userId: string | null;
  user: {
    id: string;
    email: string;
    phone: string;
    role: string;
  } | null;
  suppliedProducts: SupplierProduct[];
  stats: {
    totalSales: number;
    totalQuantity: number;
    commission: number;
    netAmount: number;
  };
}

interface SuppliersStats {
  totalSuppliers: number;
  totalCommission: number;
  highestCommission: number;
  avgCommission: number;
}

export default function AccountingSuppliersPage() {
  const {
    user,
    isLoading: userLoading,
    hasPermission,
    fetchWithAuth,
  } = useAccounting();
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stats, setStats] = useState<SuppliersStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [commissionDialogOpen, setCommissionDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );
  const [newCommission, setNewCommission] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    contactInfo: "",
    notes: "",
    commission: "",
  });

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/");
      return;
    }
    if (!userLoading && !hasPermission("view_suppliers")) {
      router.push("/");
      return;
    }
  }, [userLoading, user, hasPermission, router]);

  useEffect(() => {
    fetchSuppliers();
  }, [user]);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const res = await fetchWithAuth("/api/accounting/suppliers");
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data.suppliers);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("فشل جلب الموردين:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSupplier = async () => {
    if (!formData.name) {
      toast({
        title: "خطأ",
        description: "اسم المورد مطلوب",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await fetchWithAuth("/api/accounting/suppliers", {
        method: "POST",
        body: JSON.stringify({
          name: formData.name,
          contactInfo: formData.contactInfo,
          notes: formData.notes,
          commission: formData.commission
            ? parseFloat(formData.commission)
            : null,
        }),
      });
      if (res.ok) {
        toast({ title: "تم", description: "تم إضافة المورد بنجاح" });
        setAddDialogOpen(false);
        setFormData({ name: "", contactInfo: "", notes: "", commission: "" });
        fetchSuppliers();
      } else {
        const error = await res.json();
        toast({
          title: "خطأ",
          description: error.error,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "خطأ",
        description: "فشل الاتصال",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCommission = async () => {
    if (!selectedSupplier) return;
    try {
      const res = await fetchWithAuth(
        `/api/accounting/suppliers/${selectedSupplier.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ commission: parseFloat(newCommission) }),
        },
      );
      if (res.ok) {
        toast({ title: "تم", description: "تم تحديث نسبة العمولة" });
        setCommissionDialogOpen(false);
        fetchSuppliers();
      }
    } catch {
      toast({
        title: "خطأ",
        description: "فشل التحديث",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-YE", {
      style: "currency",
      currency: "YER",
    }).format(amount);
  };

  const filteredSuppliers = suppliers.filter((s) => {
    if (activeTab === "merchants" && s.type !== "MERCHANT") return false;
    if (activeTab === "agents" && s.type !== "AGENT") return false;
    if (
      searchQuery &&
      !s.name.includes(searchQuery) &&
      !s.contactInfo?.includes(searchQuery)
    )
      return false;
    return true;
  });

  if (userLoading || isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#C9A962]" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#3D3021]">
            التجار والموردين
          </h2>
          <p className="text-sm text-[#8B7355]">إدارة الموردين وعمولاتهم</p>
        </div>
        <Button
          className="bg-[#C9A962] hover:bg-[#B8956E]"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4 ml-1" /> إضافة مورد
        </Button>
      </div>

      {/* كروت الإحصائيات */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#5D5D5D]">
              عدد الموردين
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#3D3021]">
              {stats?.totalSuppliers || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#5D5D5D]">
              إجمالي العمولات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#3D3021]">
              {formatCurrency(stats?.totalCommission || 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#5D5D5D]">أعلى عمولة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#3D3021]">
              {stats?.highestCommission || 0}%
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#5D5D5D]">
              متوسط العمولة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#3D3021]">
              {stats?.avgCommission.toFixed(1) || 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* فلترة وبحث */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
          <TabsList className="bg-[#F5EFE6]">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="merchants">تجار</TabsTrigger>
            <TabsTrigger value="agents">مناديب</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          placeholder="بحث عن مورد..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-64 bg-[#FAF7F2]"
        />
      </div>

      {/* بطاقات الموردين */}
      <ScrollArea className="h-[calc(100vh-350px)]">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSuppliers.map((supplier) => (
            <Card
              key={supplier.id}
              className="border-0 shadow-lg overflow-hidden"
            >
              <div className="p-4 bg-gradient-to-r from-[#3D3021] to-[#2A2116] text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-[#C9A962]" />
                    <h3 className="font-bold">{supplier.name}</h3>
                  </div>
                  <Badge
                    className={
                      supplier.type === "MERCHANT"
                        ? "bg-blue-500"
                        : "bg-purple-500"
                    }
                  >
                    {supplier.type === "MERCHANT" ? "تاجر" : "مندوب"}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-[#8B7355]">المنتجات</p>
                    <p className="font-bold">
                      {supplier.suppliedProducts.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#8B7355]">المبيعات</p>
                    <p className="font-bold">
                      {formatCurrency(supplier.stats.totalSales)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#8B7355]">العمولة</p>
                    <p className="font-bold">{supplier.commission || 0}%</p>
                  </div>
                  <div>
                    <p className="text-[#8B7355]">الصافي</p>
                    <p className="font-bold">
                      {formatCurrency(supplier.stats.netAmount)}
                    </p>
                  </div>
                </div>
                {supplier.contactInfo && (
                  <div className="flex items-center gap-2 text-sm text-[#5D5D5D]">
                    <Phone className="h-3 w-3" />
                    <span>{supplier.contactInfo}</span>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedSupplier(supplier);
                      setNewCommission(supplier.commission?.toString() || "0");
                      setCommissionDialogOpen(true);
                    }}
                  >
                    <Percent className="h-3 w-3 ml-1" /> تعديل العمولة
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      const token = localStorage.getItem("token");
                      if (!token) {
                        toast({
                          title: "خطأ",
                          description: "يجب تسجيل الدخول أولاً",
                          variant: "destructive",
                        });
                        return;
                      }
                      window.open(
                        `/api/accounting/suppliers/${supplier.id}/statement?token=${encodeURIComponent(token)}`,
                        "_blank",
                      );
                    }}
                  >
                    <FileText className="h-3 w-3 ml-1" /> كشف حساب
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* نافذة إضافة مورد */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة مورد جديد</DialogTitle>
            <DialogDescription>
              أدخل بيانات المورد المراد إضافته
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم المورد *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="مثال: شركة الأناقة"
              />
            </div>
            <div>
              <Label>معلومات الاتصال</Label>
              <Input
                value={formData.contactInfo}
                onChange={(e) =>
                  setFormData({ ...formData, contactInfo: e.target.value })
                }
                placeholder="هاتف / بريد"
              />
            </div>
            <div>
              <Label>نسبة العمولة (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.commission}
                onChange={(e) =>
                  setFormData({ ...formData, commission: e.target.value })
                }
              />
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              className="bg-[#C9A962] hover:bg-[#B8956E]"
              onClick={handleAddSupplier}
            >
              إضافة
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* نافذة تعديل العمولة */}
      <Dialog
        open={commissionDialogOpen}
        onOpenChange={setCommissionDialogOpen}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل نسبة العمولة</DialogTitle>
            <DialogDescription>{selectedSupplier?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>نسبة العمولة (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={newCommission}
                onChange={(e) => setNewCommission(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setCommissionDialogOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              className="bg-[#C9A962] hover:bg-[#B8956E]"
              onClick={handleUpdateCommission}
            >
              حفظ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
