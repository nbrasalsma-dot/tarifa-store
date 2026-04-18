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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Loader2,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  FileText,
  Calendar,
  User,
  Search,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  referenceNumber: string | null;
  type: string;
  amount: number;
  description: string | null;
  createdAt: string;
  supplier: { id: string; name: string; type: string } | null;
  order: { id: string } | null;
}

interface JournalStats {
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  net: number;
}

interface Supplier {
  id: string;
  name: string;
  type: string;
}

export default function AccountingJournalPage() {
  const {
    user,
    isLoading: userLoading,
    hasPermission,
    fetchWithAuth,
  } = useAccounting();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<JournalStats | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    referenceNumber: "",
    type: "SALE" as Transaction["type"],
    amount: "",
    description: "",
    supplierId: "",
  });

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/");
      return;
    }
    if (!userLoading && !hasPermission("view_journal")) {
      router.push("/");
      return;
    }
  }, [userLoading, user, hasPermission, router]);

  useEffect(() => {
    fetchData();
    fetchSuppliers();
  }, [filterType]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const url =
        filterType === "all"
          ? "/api/accounting/journal"
          : `/api/accounting/journal?type=${filterType}`;
      const res = await fetchWithAuth(url);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("فشل جلب القيود:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetchWithAuth("/api/accounting/suppliers");
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data.suppliers || []);
      }
    } catch (error) {
      console.error("فشل جلب الموردين:", error);
    }
  };

  const handleAddEntry = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: "خطأ",
        description: "المبلغ يجب أن يكون أكبر من صفر",
        variant: "destructive",
      });
      return;
    }
    if (!formData.description) {
      toast({
        title: "خطأ",
        description: "البيان مطلوب",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth("/api/accounting/journal", {
        method: "POST",
        body: JSON.stringify({
          referenceNumber: formData.referenceNumber || undefined,
          type: formData.type,
          amount: parseFloat(formData.amount),
          description: formData.description,
          supplierId: formData.supplierId || null,
        }),
      });
      if (res.ok) {
        toast({ title: "تم", description: "تم إضافة القيد بنجاح" });
        setAddDialogOpen(false);
        setFormData({
          referenceNumber: "",
          type: "SALE",
          amount: "",
          description: "",
          supplierId: "",
        });
        fetchData();
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-YE", {
      style: "currency",
      currency: "YER",
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ar-YE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      SALE: "مبيعات",
      COLLECTION: "تحصيل",
      PURCHASE: "مشتريات",
      SUPPLY: "توريد",
      RETURN: "مرتجعات",
      OPERATING_EXPENSE: "مصروف تشغيلي",
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      SALE: "bg-emerald-100 text-emerald-700",
      COLLECTION: "bg-blue-100 text-blue-700",
      PURCHASE: "bg-amber-100 text-amber-700",
      SUPPLY: "bg-purple-100 text-purple-700",
      RETURN: "bg-orange-100 text-orange-700",
      OPERATING_EXPENSE: "bg-rose-100 text-rose-700",
    };
    return colors[type] || "bg-gray-100 text-gray-700";
  };

  const filteredTransactions = transactions.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.description?.toLowerCase().includes(q) ||
      t.referenceNumber?.toLowerCase().includes(q) ||
      t.supplier?.name.toLowerCase().includes(q)
    );
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
          <h2 className="text-2xl font-bold text-[#3D3021]">القيود اليومية</h2>
          <p className="text-sm text-[#8B7355]">
            إدارة القيود المحاسبية والحركات المالية
          </p>
        </div>
        <Button
          className="bg-[#C9A962] hover:bg-[#B8956E]"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4 ml-1" /> قيد جديد
        </Button>
      </div>

      {/* كروت الإحصائيات */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#5D5D5D]">المبيعات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(stats?.totalSales || 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#5D5D5D]">المشتريات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(stats?.totalPurchases || 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#5D5D5D]">المصروفات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {formatCurrency(stats?.totalExpenses || 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#5D5D5D]">الصافي</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                (stats?.net || 0) >= 0 ? "text-emerald-600" : "text-rose-600",
              )}
            >
              {formatCurrency(stats?.net || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* فلترة وبحث */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px] bg-[#FAF7F2]">
            <SelectValue placeholder="نوع القيد" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأنواع</SelectItem>
            <SelectItem value="SALE">مبيعات</SelectItem>
            <SelectItem value="COLLECTION">تحصيل</SelectItem>
            <SelectItem value="PURCHASE">مشتريات</SelectItem>
            <SelectItem value="SUPPLY">توريد</SelectItem>
            <SelectItem value="RETURN">مرتجعات</SelectItem>
            <SelectItem value="OPERATING_EXPENSE">مصروفات تشغيلية</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A69B8D]" />
          <Input
            placeholder="بحث برقم المرجع أو البيان أو المورد..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 bg-[#FAF7F2]"
          />
        </div>
      </div>

      {/* سجل القيود */}
      <ScrollArea className="h-[calc(100vh-350px)]">
        <div className="space-y-2">
          {filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#A69B8D]">
              <BookOpen className="h-12 w-12 mb-3 opacity-50" />
              <p>لا توجد قيود حالياً</p>
            </div>
          ) : (
            filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg border border-[#E8E0D8] p-4 transition-all hover:bg-[#FAF7F2]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "rounded-full p-2",
                      tx.amount > 0
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-rose-50 text-rose-600",
                    )}
                  >
                    {tx.amount > 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[#3D3021]">
                        {tx.description}
                      </p>
                      {tx.referenceNumber && (
                        <span className="font-mono text-xs text-[#A69B8D]">
                          #{tx.referenceNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <Badge className={cn("text-xs", getTypeColor(tx.type))}>
                        {getTypeLabel(tx.type)}
                      </Badge>
                      {tx.supplier && (
                        <div className="flex items-center gap-1 text-xs text-[#8B7355]">
                          <User className="h-3 w-3" />
                          <span>{tx.supplier.name}</span>
                        </div>
                      )}
                      {tx.order && (
                        <span className="text-xs text-[#8B7355]">
                          طلب #{tx.order.id.slice(-8)}
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-xs text-[#A69B8D]">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(tx.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className={cn(
                    "font-bold text-lg",
                    tx.amount > 0 ? "text-emerald-600" : "text-rose-600",
                  )}
                >
                  {tx.amount > 0 ? "+" : "-"}
                  {formatCurrency(Math.abs(tx.amount))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* نافذة قيد جديد */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#C9A962]" />
              قيد جديد
            </DialogTitle>
            <DialogDescription>أدخل بيانات القيد المحاسبي</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>رقم المرجع (اختياري)</Label>
                <Input
                  placeholder="مثال: INV-001"
                  value={formData.referenceNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      referenceNumber: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>نوع العملية *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) =>
                    setFormData({ ...formData, type: v as Transaction["type"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SALE">مبيعات</SelectItem>
                    <SelectItem value="COLLECTION">تحصيل</SelectItem>
                    <SelectItem value="PURCHASE">مشتريات</SelectItem>
                    <SelectItem value="SUPPLY">توريد</SelectItem>
                    <SelectItem value="RETURN">مرتجعات</SelectItem>
                    <SelectItem value="OPERATING_EXPENSE">
                      مصروفات تشغيلية
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>المبلغ (ر.ي) *</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
              />
            </div>
            <div>
              <Label>البيان / الوصف *</Label>
              <Textarea
                placeholder="شرح مختصر للقيد..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div>
              <Label>المورد / التاجر</Label>
              <Select
                value={formData.supplierId}
                onValueChange={(v) =>
                  setFormData({ ...formData, supplierId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر مورداً (اختياري)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون مورد</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.type === "MERCHANT" ? "تاجر" : "مندوب"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              className="bg-[#C9A962] hover:bg-[#B8956E]"
              onClick={handleAddEntry}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 ml-1" />
              )}
              حفظ القيد
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
