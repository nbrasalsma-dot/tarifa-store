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
  RotateCcw,
  Loader2,
  Plus,
  Package,
  FileText,
  Calendar,
  DollarSign,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface ReturnItem {
  id: string;
  product: { nameAr: string; mainImage: string; sku: string | null };
  quantity: number;
  reason: string | null;
  refundAmount: number;
  orderId?: string;
  createdAt: string;
}

interface Product {
  id: string;
  nameAr: string;
  price: number;
  mainImage: string;
}

export default function AccountingReturnsPage() {
  const {
    user,
    isLoading: userLoading,
    hasPermission,
    fetchWithAuth,
  } = useAccounting();
  const router = useRouter();
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    orderId: "",
    productId: "",
    quantity: 1,
    reason: "",
    refundAmount: "",
  });

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/");
      return;
    }
    if (!userLoading && !hasPermission("view_returns")) {
      router.push("/");
      return;
    }
  }, [userLoading, user, hasPermission, router]);

  useEffect(() => {
    fetchReturns();
    fetchProducts();
  }, []);

  const fetchReturns = async () => {
    setIsLoading(true);
    try {
      const res = await fetchWithAuth("/api/accounting/returns");
      if (res.ok) {
        const data = await res.json();
        setReturns(data.returns);
      }
    } catch (error) {
      console.error("فشل جلب المرتجعات:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetchWithAuth("/api/accounting/inventory");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
      }
    } catch (error) {
      console.error("فشل جلب المنتجات:", error);
    }
  };

  const handleAddReturn = async () => {
    if (!formData.productId) {
      toast({
        title: "خطأ",
        description: "يجب اختيار منتج",
        variant: "destructive",
      });
      return;
    }
    if (!formData.reason) {
      toast({
        title: "خطأ",
        description: "سبب المرتجع مطلوب",
        variant: "destructive",
      });
      return;
    }
    if (!formData.refundAmount || parseFloat(formData.refundAmount) <= 0) {
      toast({
        title: "خطأ",
        description: "مبلغ الاسترداد غير صحيح",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth("/api/accounting/returns", {
        method: "POST",
        body: JSON.stringify({
          orderId: formData.orderId || undefined,
          productId: formData.productId,
          quantity: formData.quantity,
          reason: formData.reason,
          refundAmount: parseFloat(formData.refundAmount),
        }),
      });
      if (res.ok) {
        toast({ title: "تم", description: "تم تسجيل المرتجع بنجاح" });
        setAddDialogOpen(false);
        setFormData({
          orderId: "",
          productId: "",
          quantity: 1,
          reason: "",
          refundAmount: "",
        });
        fetchReturns();
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
    });
  };

  const filteredReturns = returns.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.product.nameAr.toLowerCase().includes(q) ||
      r.orderId?.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q)
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
          <h2 className="text-2xl font-bold text-[#3D3021]">المرتجعات</h2>
          <p className="text-sm text-[#8B7355]">
            سجل مرتجعات المنتجات واسترداد المبالغ
          </p>
        </div>
        <Button
          className="bg-[#C9A962] hover:bg-[#B8956E]"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4 ml-1" /> مرتجع جديد
        </Button>
      </div>

      {/* بحث */}
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A69B8D]" />
        <Input
          placeholder="بحث برقم الطلب أو المنتج..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10 bg-[#FAF7F2]"
        />
      </div>

      {/* سجل المرتجعات */}
      <ScrollArea className="h-[calc(100vh-250px)]">
        <div className="space-y-3">
          {filteredReturns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#A69B8D]">
              <RotateCcw className="h-12 w-12 mb-3 opacity-50" />
              <p>لا توجد مرتجعات حالياً</p>
            </div>
          ) : (
            filteredReturns.map((item) => (
              <Card
                key={item.id}
                className="border-0 shadow-lg overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row">
                  <div className="w-full sm:w-24 h-24 bg-[#F5EFE6] flex-shrink-0">
                    <img
                      src={item.product.mainImage || "/placeholder.png"}
                      alt={item.product.nameAr}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="flex-1 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-[#3D3021]">
                          {item.product.nameAr}
                        </h3>
                        {item.product.sku && (
                          <p className="text-xs text-[#A69B8D]">
                            SKU: {item.product.sku}
                          </p>
                        )}
                      </div>
                      <Badge className="bg-orange-500">مرتجع</Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
                      <div>
                        <span className="text-[#8B7355]">الكمية:</span>{" "}
                        {item.quantity}
                      </div>
                      <div>
                        <span className="text-[#8B7355]">المبلغ المسترد:</span>{" "}
                        {formatCurrency(item.refundAmount)}
                      </div>
                      <div>
                        <span className="text-[#8B7355]">التاريخ:</span>{" "}
                        {formatDate(item.createdAt)}
                      </div>
                      {item.orderId && (
                        <div>
                          <span className="text-[#8B7355]">رقم الطلب:</span> #
                          {item.orderId.slice(-8)}
                        </div>
                      )}
                    </div>
                    {item.reason && (
                      <p className="mt-2 text-sm text-[#5D5D5D] bg-[#FAF7F2] p-2 rounded">
                        <span className="font-medium">السبب:</span>{" "}
                        {item.reason}
                      </p>
                    )}
                  </CardContent>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* نافذة مرتجع جديد */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-[#C9A962]" />
              إضافة مرتجع
            </DialogTitle>
            <DialogDescription>أدخل بيانات المنتج المرتجع</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>رقم الطلب (اختياري)</Label>
              <Input
                placeholder="مثال: #ABC123"
                value={formData.orderId}
                onChange={(e) =>
                  setFormData({ ...formData, orderId: e.target.value })
                }
              />
            </div>
            <div>
              <Label>المنتج *</Label>
              <Select
                value={formData.productId}
                onValueChange={(v) =>
                  setFormData({ ...formData, productId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المنتج المرتجع" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nameAr} - {formatCurrency(p.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>الكمية *</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div>
                <Label>مبلغ الاسترداد (ر.ي) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.refundAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, refundAmount: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>سبب المرتجع *</Label>
              <Textarea
                placeholder="مثال: تالف / خطأ في الطلب..."
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
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
              onClick={handleAddReturn}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 ml-1" />
              )}
              تسجيل المرتجع
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
