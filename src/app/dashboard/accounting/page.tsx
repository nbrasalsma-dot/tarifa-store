"use client";

import { useEffect, useState } from "react";
import { useAccounting } from "@/contexts/accounting-context";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardStats {
  totalSales: number;
  totalProfit: number;
  totalExpenses: number;
  totalLoss: number;
  totalProducts: number;
  lowStockProducts: number;
  totalSuppliers: number;
  inventoryValue: number;
}

interface RecentTransaction {
  id: string;
  type: string;
  description: string;
  amount: number;
  date: string;
  supplier?: string;
  orderId?: string;
}

export default function AccountingDashboardPage() {
  const {
    user,
    isLoading: userLoading,
    hasPermission,
    fetchWithAuth,
  } = useAccounting();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<
    RecentTransaction[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/");
      return;
    }
    if (!userLoading && !hasPermission("view_dashboard")) {
      router.push("/");
      return;
    }
  }, [userLoading, user, hasPermission, router]);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const res = await fetchWithAuth("/api/accounting/dashboard-stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setRecentTransactions(data.recentTransactions || []);
        }
      } catch (error) {
        console.error("فشل جلب الإحصائيات:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchStats();
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
      month: "short",
      day: "numeric",
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

  const statCards = [
    {
      title: "إجمالي المبيعات",
      value: formatCurrency(stats?.totalSales || 0),
      icon: DollarSign,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "صافي الأرباح",
      value: formatCurrency(stats?.totalProfit || 0),
      icon: TrendingUp,
      color: "bg-green-50 text-green-600",
    },
    {
      title: "المصروفات",
      value: formatCurrency(stats?.totalExpenses || 0),
      icon: TrendingDown,
      color: "bg-amber-50 text-amber-600",
    },
    {
      title: "الخسائر",
      value: formatCurrency(stats?.totalLoss || 0),
      icon: AlertCircle,
      color: "bg-rose-50 text-rose-600",
    },
  ];

  const inventoryCards = [
    {
      title: "المنتجات المعروضة",
      value: stats?.totalProducts || 0,
      icon: Package,
      color: "bg-blue-50 text-blue-600",
      subtitle: "صنف في المخازن",
      link: "/dashboard/accounting/inventory",
    },
    {
      title: "التجار والموردين",
      value: stats?.totalSuppliers || 0,
      icon: Users,
      color: "bg-purple-50 text-purple-600",
      subtitle: "مورد نشط",
      link: "/dashboard/accounting/suppliers",
    },
    {
      title: "تنبيهات المخزون",
      value: stats?.lowStockProducts || 0,
      icon: AlertCircle,
      color: "bg-orange-50 text-orange-600",
      subtitle: "منتج منخفض",
      link: "/dashboard/accounting/inventory",
    },
    {
      title: "قيمة المخزون",
      value: formatCurrency(stats?.inventoryValue || 0),
      icon: Wallet,
      color: "bg-indigo-50 text-indigo-600",
      subtitle: "تكلفة المخزون الحالي",
      link: "/dashboard/accounting/inventory",
    },
  ];

  return (
    <div className="space-y-6 p-1">
      {/* عنوان الصفحة */}
      <div>
        <h2 className="text-2xl font-bold text-[#3D3021]">لوحة التحكم</h2>
        <p className="text-sm text-[#8B7355]">
          نظرة عامة على أداء المتجر المالي
        </p>
      </div>

      {/* كروت الإحصائيات الرئيسية */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card
            key={index}
            className="border-0 shadow-lg transition-all hover:shadow-xl cursor-pointer"
          >
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

      {/* كروت المخزون والموردين */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {inventoryCards.map((card, index) => (
          <Card
            key={index}
            className="border-0 shadow-lg transition-all hover:shadow-xl cursor-pointer"
            onClick={() => router.push(card.link)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#5D5D5D]">
                {card.title}
              </CardTitle>
              <div className={cn("rounded-full p-2", card.color)}>
                <card.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#3D3021]">
                {card.value}
              </div>
              <p className="text-xs text-[#A69B8D]">{card.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* سجل آخر العمليات المالية */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#3D3021] flex items-center gap-2">
            <Wallet className="h-5 w-5 text-[#C9A962]" />
            آخر العمليات المالية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {recentTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-[#A69B8D]">
                  <Wallet className="h-10 w-10 mb-2 opacity-50" />
                  <p className="text-sm">لا توجد عمليات مالية حديثة</p>
                </div>
              ) : (
                recentTransactions.map((transaction) => (
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
                        <p className="font-medium text-[#3D3021]">
                          {transaction.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {getTypeLabel(transaction.type)}
                          </Badge>
                          {transaction.supplier && (
                            <span className="text-xs text-[#8B7355]">
                              {transaction.supplier}
                            </span>
                          )}
                          <span className="text-xs text-[#A69B8D]">
                            {formatDate(transaction.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "font-bold",
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
        </CardContent>
      </Card>
    </div>
  );
}
