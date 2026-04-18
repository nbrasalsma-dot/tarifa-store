"use client";

import { useEffect, useState } from "react";
import { useAccounting } from "@/contexts/accounting-context";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, TrendingUp, FileText, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface TrialBalanceItem {
  accountName: string;
  debit: number;
  credit: number;
}

interface IncomeStatementItem {
  category: string;
  amount: number;
  type: "revenue" | "expense";
}

export default function AccountingReportsPage() {
  const {
    user,
    isLoading: userLoading,
    hasPermission,
    fetchWithAuth,
  } = useAccounting();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("trial-balance");
  const [isLoading, setIsLoading] = useState(true);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceItem[]>([]);
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementItem[]>(
    [],
  );
  const [netIncome, setNetIncome] = useState(0);

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
    if (user) {
      fetchReportData();
    }
  }, [user, activeTab]);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === "trial-balance") {
        const res = await fetchWithAuth("/api/accounting/journal");
        if (res.ok) {
          const data = await res.json();
          const transactions = data.transactions || [];

          const accountMap = new Map<
            string,
            { debit: number; credit: number }
          >();

          transactions.forEach((tx: any) => {
            const accountName = getAccountName(tx.type);
            const current = accountMap.get(accountName) || {
              debit: 0,
              credit: 0,
            };

            if (tx.amount > 0) {
              current.debit += tx.amount;
            } else {
              current.credit += Math.abs(tx.amount);
            }
            accountMap.set(accountName, current);
          });

          const items: TrialBalanceItem[] = Array.from(
            accountMap.entries(),
          ).map(([name, values]) => ({
            accountName: name,
            debit: values.debit,
            credit: values.credit,
          }));

          const totalDeb = items.reduce((sum, item) => sum + item.debit, 0);
          const totalCred = items.reduce((sum, item) => sum + item.credit, 0);

          setTrialBalance(items);
          setTotalDebit(totalDeb);
          setTotalCredit(totalCred);
        }
      } else {
        const res = await fetchWithAuth("/api/accounting/journal");
        if (res.ok) {
          const data = await res.json();
          const transactions = data.transactions || [];

          const revenueMap = new Map<string, number>();
          const expenseMap = new Map<string, number>();

          transactions.forEach((tx: any) => {
            const amount = Math.abs(tx.amount);
            if (tx.type === "SALE") {
              const current = revenueMap.get("المبيعات") || 0;
              revenueMap.set("المبيعات", current + amount);
            } else if (tx.type === "OPERATING_EXPENSE") {
              const current = expenseMap.get("مصروفات تشغيلية") || 0;
              expenseMap.set("مصروفات تشغيلية", current + amount);
            } else if (tx.type === "PURCHASE" || tx.type === "SUPPLY") {
              const current = expenseMap.get("المشتريات والتوريدات") || 0;
              expenseMap.set("المشتريات والتوريدات", current + amount);
            }
          });

          const items: IncomeStatementItem[] = [
            ...Array.from(revenueMap.entries()).map(([cat, amt]) => ({
              category: cat,
              amount: amt,
              type: "revenue" as const,
            })),
            ...Array.from(expenseMap.entries()).map(([cat, amt]) => ({
              category: cat,
              amount: amt,
              type: "expense" as const,
            })),
          ];

          const totalRevenue = items
            .filter((i) => i.type === "revenue")
            .reduce((s, i) => s + i.amount, 0);
          const totalExpense = items
            .filter((i) => i.type === "expense")
            .reduce((s, i) => s + i.amount, 0);

          setIncomeStatement(items);
          setNetIncome(totalRevenue - totalExpense);
        }
      }
    } catch (error) {
      console.error("فشل جلب بيانات التقارير:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAccountName = (type: string): string => {
    const names: Record<string, string> = {
      SALE: "المبيعات",
      COLLECTION: "التحصيلات",
      PURCHASE: "المشتريات",
      SUPPLY: "التوريدات",
      RETURN: "المرتجعات",
      OPERATING_EXPENSE: "المصروفات التشغيلية",
    };
    return names[type] || type;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-YE", {
      style: "currency",
      currency: "YER",
    }).format(amount);
  };

  const handleExport = (type: "trial-balance" | "income") => {
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
      `/api/accounting/reports/export?type=${type}&token=${encodeURIComponent(token)}`,
      "_blank",
    );
  };

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
            التقارير المالية
          </h2>
          <p className="text-sm text-[#8B7355]">ميزان المراجعة وقائمة الدخل</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "trial-balance" && (
            <Button
              variant="outline"
              size="sm"
              className="border-[#C9A962] text-[#C9A962] hover:bg-[#C9A962] hover:text-white"
              onClick={() => handleExport("trial-balance")}
            >
              <FileText className="h-4 w-4 ml-1" />
              تصدير Excel
            </Button>
          )}
          {activeTab === "income" && (
            <Button
              variant="outline"
              size="sm"
              className="border-[#C9A962] text-[#C9A962] hover:bg-[#C9A962] hover:text-white"
              onClick={() => handleExport("income")}
            >
              <FileText className="h-4 w-4 ml-1" />
              تصدير Excel
            </Button>
          )}
          <BarChart3 className="h-8 w-8 text-[#C9A962]" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-[#F5EFE6] p-1 rounded-full">
          <TabsTrigger
            value="trial-balance"
            className="rounded-full data-[state=active]:bg-[#C9A962] data-[state=active]:text-white"
          >
            <FileText className="h-4 w-4 ml-2" />
            ميزان المراجعة
          </TabsTrigger>
          <TabsTrigger
            value="income"
            className="rounded-full data-[state=active]:bg-[#C9A962] data-[state=active]:text-white"
          >
            <TrendingUp className="h-4 w-4 ml-2" />
            قائمة الدخل
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trial-balance" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-[#3D3021]">
                ميزان المراجعة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-[#F5EFE6] z-10">
                    <tr className="border-b border-[#E8E0D8]">
                      <th className="text-right py-3 px-4 font-bold text-[#3D3021]">
                        اسم الحساب
                      </th>
                      <th className="text-right py-3 px-4 font-bold text-[#3D3021]">
                        مدين
                      </th>
                      <th className="text-right py-3 px-4 font-bold text-[#3D3021]">
                        دائن
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {trialBalance.map((item, index) => (
                      <tr
                        key={index}
                        className="border-b border-[#E8E0D8] hover:bg-[#FAF7F2] transition-colors"
                      >
                        <td className="py-3 px-4 font-medium text-[#3D3021]">
                          {item.accountName}
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-700">
                          {item.debit > 0 ? formatCurrency(item.debit) : "-"}
                        </td>
                        <td className="py-3 px-4 font-mono text-rose-700">
                          {item.credit > 0 ? formatCurrency(item.credit) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#FAF7F2] font-bold">
                    <tr>
                      <td className="py-3 px-4 text-[#3D3021]">الإجمالي</td>
                      <td className="py-3 px-4 font-mono text-emerald-700">
                        {formatCurrency(totalDebit)}
                      </td>
                      <td className="py-3 px-4 font-mono text-rose-700">
                        {formatCurrency(totalCredit)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </ScrollArea>
              <Separator className="my-4" />
              <div className="flex items-center justify-center gap-2">
                <Badge
                  className={cn(
                    "text-sm py-1.5 px-4",
                    totalDebit === totalCredit
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700",
                  )}
                >
                  {totalDebit === totalCredit
                    ? "✅ الميزان متوازن"
                    : "❌ الميزان غير متوازن"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-[#3D3021]">
                قائمة الدخل
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-[#F5EFE6] z-10">
                    <tr className="border-b border-[#E8E0D8]">
                      <th className="text-right py-3 px-4 font-bold text-[#3D3021]">
                        البيان
                      </th>
                      <th className="text-right py-3 px-4 font-bold text-[#3D3021]">
                        المبلغ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeStatement
                      .filter((i) => i.type === "revenue")
                      .map((item, idx) => (
                        <tr
                          key={`rev-${idx}`}
                          className="border-b border-[#E8E0D8]"
                        >
                          <td className="py-3 px-4 font-medium text-[#3D3021]">
                            {item.category}
                          </td>
                          <td className="py-3 px-4 font-mono text-emerald-700">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                    <tr className="bg-[#FAF7F2] font-bold">
                      <td className="py-3 px-4">إجمالي الإيرادات</td>
                      <td className="py-3 px-4 font-mono text-emerald-700">
                        {formatCurrency(
                          incomeStatement
                            .filter((i) => i.type === "revenue")
                            .reduce((s, i) => s + i.amount, 0),
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="py-2"></td>
                    </tr>
                    {incomeStatement
                      .filter((i) => i.type === "expense")
                      .map((item, idx) => (
                        <tr
                          key={`exp-${idx}`}
                          className="border-b border-[#E8E0D8]"
                        >
                          <td className="py-3 px-4 font-medium text-[#3D3021]">
                            {item.category}
                          </td>
                          <td className="py-3 px-4 font-mono text-rose-700">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                    <tr className="bg-[#FAF7F2] font-bold">
                      <td className="py-3 px-4">إجمالي المصروفات</td>
                      <td className="py-3 px-4 font-mono text-rose-700">
                        {formatCurrency(
                          incomeStatement
                            .filter((i) => i.type === "expense")
                            .reduce((s, i) => s + i.amount, 0),
                        )}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-[#F5EFE6]">
                    <tr className="border-t-2 border-[#C9A962]">
                      <td className="py-4 px-4 text-lg font-bold text-[#3D3021]">
                        صافي الربح / الخسارة
                      </td>
                      <td
                        className={cn(
                          "py-4 px-4 text-lg font-bold font-mono",
                          netIncome >= 0 ? "text-emerald-700" : "text-rose-700",
                        )}
                      >
                        {formatCurrency(netIncome)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
