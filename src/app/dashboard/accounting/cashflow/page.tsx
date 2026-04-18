"use client";

import { useEffect, useState } from "react";
import { useAccounting } from "@/contexts/accounting-context";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // ✅ استيراد Button
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  ShoppingCart,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  User,
  FileText, // ✅ استيراد أيقونة FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast"; // ✅ استيراد toast

interface Transaction {
  id: string;
  referenceNumber: string | null;
  type: string;
  amount: number;
  description: string | null;
  createdAt: string;
  supplier: {
    name: string;
    type: string;
  } | null;
  order: {
    id: string;
  } | null;
}

interface CashflowStats {
  currentBalance: number;
  totalIncome: number;
  totalExpenses: number;
  totalReturns: number;
  totalPurchases: number;
  totalTransactions: number;
}

export default function AccountingCashflowPage() {
  const {
    user,
    isLoading: userLoading,
    hasPermission,
    fetchWithAuth,
  } = useAccounting();
  const router = useRouter();
  const [stats, setStats] = useState<CashflowStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/");
      return;
    }
    if (!userLoading && !hasPermission("view_cashflow")) {
      router.push("/");
      return;
    }
  }, [userLoading, user, hasPermission, router]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await fetchWithAuth("/api/accounting/cashflow");
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setTransactions(data.transactions);
        }
      } catch (error) {
        console.error("فشل جلب بيانات الصندوق:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, fetchWithAuth]);

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
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (date: string) => {
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

  const filteredTransactions =
    activeTab === "all"
      ? transactions
      : activeTab === "income"
        ? transactions.filter((t) => t.amount > 0)
        : transactions.filter((t) => t.amount < 0);

  const statCards = [
    {
      title: "الرصيد الحالي",
      value: formatCurrency(stats?.currentBalance || 0),
      icon: Wallet,
      color: "bg-gradient-to-br from-[#C9A962] to-[#B8956E] text-white",
      subtext: "المبلغ المتاح في الصندوق",
    },
    {
      title: "إجمالي الإيرادات",
      value: formatCurrency(stats?.totalIncome || 0),
      icon: TrendingUp,
      color: "bg-emerald-50 text-emerald-600",
      subtext: "المبيعات + التحصيلات",
    },
    {
      title: "إجمالي المصروفات",
      value: formatCurrency(stats?.totalExpenses || 0),
      icon: TrendingDown,
      color: "bg-rose-50 text-rose-600",
      subtext: "المشتريات + المصروفات",
    },
    {
      title: "المرتجعات",
      value: formatCurrency(stats?.totalReturns || 0),
      icon: RotateCcw,
      color: "bg-orange-50 text-orange-600",
      subtext: "إجمالي المرتجعات",
    },
    {
      title: "المشتريات",
      value: formatCurrency(stats?.totalPurchases || 0),
      icon: ShoppingCart,
      color: "bg-purple-50 text-purple-600",
      subtext: "المشتريات والتوريدات",
    },
  ];

  return (
    <div className="space-y-6 p-1">
      {/* عنوان الصفحة مع زر تصدير Excel */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#3D3021]">الصندوق</h2>
          <p className="text-sm text-[#8B7355]">
            إدارة ومتابعة التدفقات النقدية
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-[#C9A962] text-[#C9A962] hover:bg-[#C9A962] hover:text-white"
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
                `/api/accounting/cashflow/statement?token=${encodeURIComponent(token)}`,
                "_blank",
              );
            }}
          >
            <FileText className="h-4 w-4 ml-1" />
            تصدير Excel
          </Button>
          <Wallet className="h-8 w-8 text-[#C9A962]" />
        </div>
      </div>

      {/* كروت الإحصائيات */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
              <div className="text-xl font-bold text-[#3D3021]">
                {stat.value}
              </div>
              <p className="text-xs text-[#A69B8D] mt-1">{stat.subtext}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* سجل الحركات المالية */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#3D3021] flex items-center gap-2">
            سجل العمليات المالية
            <Badge variant="outline">
              {stats?.totalTransactions || 0} عملية
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 bg-[#F5EFE6]">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-[#C9A962] data-[state=active]:text-white"
              >
                الكل
              </TabsTrigger>
              <TabsTrigger
                value="income"
                className="data-[state=active]:bg-[#C9A962] data-[state=active]:text-white"
              >
                الإيرادات
              </TabsTrigger>
              <TabsTrigger
                value="expense"
                className="data-[state=active]:bg-[#C9A962] data-[state=active]:text-white"
              >
                المصروفات
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {filteredTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-[#A69B8D]">
                      <Wallet className="h-12 w-12 mb-3 opacity-50" />
                      <p>لا توجد حركات مالية حالياً</p>
                    </div>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between rounded-lg border border-[#E8E0D8] p-3 transition-all hover:bg-[#FAF7F2]"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "rounded-full p-2",
                              transaction.amount > 0
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-rose-50 text-rose-600",
                            )}
                          >
                            {transaction.amount > 0 ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-[#3D3021]">
                                {transaction.description ||
                                  getTypeLabel(transaction.type)}
                              </p>
                              {transaction.referenceNumber && (
                                <span className="font-mono text-xs text-[#A69B8D]">
                                  #{transaction.referenceNumber}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <Badge
                                className={cn(
                                  "text-xs",
                                  getTypeColor(transaction.type),
                                )}
                              >
                                {getTypeLabel(transaction.type)}
                              </Badge>
                              {transaction.supplier && (
                                <div className="flex items-center gap-1 text-xs text-[#8B7355]">
                                  <User className="h-3 w-3" />
                                  <span>{transaction.supplier.name}</span>
                                </div>
                              )}
                              {transaction.order && (
                                <span className="text-xs text-[#8B7355]">
                                  طلب #{transaction.order.id.slice(-8)}
                                </span>
                              )}
                              <div className="flex items-center gap-1 text-xs text-[#A69B8D]">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {formatDateTime(transaction.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div
                          className={cn(
                            "font-bold text-lg",
                            transaction.amount > 0
                              ? "text-emerald-600"
                              : "text-rose-600",
                          )}
                        >
                          {transaction.amount > 0 ? "+" : "-"}
                          {formatCurrency(Math.abs(transaction.amount))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
