"use client";

import { useEffect, useState } from "react";
import { useAccounting } from "@/contexts/accounting-context";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  UserCog,
  Loader2,
  User,
  Mail,
  Phone,
  Calendar,
  Package,
  ShoppingBag,
  Store,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Key,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  permissions: string[];
  createdAt: string;
  merchant?: {
    id: string;
    storeName: string;
    commissionAmount: number;
    totalSales: number;
  } | null;
  stats: {
    productsCount: number;
    ordersCount: number;
    totalSales: number;
  };
}

export default function AccountingEmployeesPage() {
  const {
    user,
    isLoading: userLoading,
    hasPermission,
    fetchWithAuth,
  } = useAccounting();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/");
      return;
    }
    if (!userLoading && !hasPermission("view_employees")) {
      router.push("/");
      return;
    }
  }, [userLoading, user, hasPermission, router]);

  useEffect(() => {
    fetchEmployees();
  }, [user]);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const res = await fetchWithAuth("/api/accounting/employees");
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.users);
      }
    } catch (error) {
      console.error("فشل جلب الموظفين:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAccess = async (employee: Employee) => {
    const hasAccess = employee.permissions.includes("view_dashboard");
    const action = hasAccess ? "سحب" : "منح";
    if (
      !confirm(
        `هل أنت متأكد من ${action} صلاحية النظام المحاسبي لـ ${employee.name}؟`,
      )
    )
      return;

    setUpdatingId(employee.id);
    try {
      const res = await fetchWithAuth("/api/accounting/employees", {
        method: "PUT",
        body: JSON.stringify({
          userId: employee.id,
          grantAccountingAccess: !hasAccess,
        }),
      });
      if (res.ok) {
        toast({
          title: "تم",
          description: `${action} الصلاحية بنجاح`,
        });
        fetchEmployees();
        setDetailsOpen(false);
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
      setUpdatingId(null);
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

  const getRoleBadge = (role: string) => {
    const map: Record<string, { label: string; color: string }> = {
      ADMIN: { label: "إدارة", color: "bg-red-500" },
      AGENT: { label: "مندوب", color: "bg-blue-500" },
      MERCHANT: { label: "تاجر", color: "bg-green-500" },
    };
    const config = map[role] || { label: role, color: "bg-gray-500" };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const filteredEmployees = employees.filter((e) => {
    if (activeTab === "admins") return e.role === "ADMIN";
    if (activeTab === "agents") return e.role === "AGENT";
    if (activeTab === "merchants") return e.role === "MERCHANT";
    if (activeTab === "accounting")
      return e.permissions.includes("view_dashboard");
    return true;
  });

  const counts = {
    all: employees.length,
    admins: employees.filter((e) => e.role === "ADMIN").length,
    agents: employees.filter((e) => e.role === "AGENT").length,
    merchants: employees.filter((e) => e.role === "MERCHANT").length,
    accounting: employees.filter((e) =>
      e.permissions.includes("view_dashboard"),
    ).length,
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
            الموظفين والصلاحيات
          </h2>
          <p className="text-sm text-[#8B7355]">
            إدارة حسابات الموظفين وصلاحيات النظام المحاسبي
          </p>
        </div>
        <UserCog className="h-8 w-8 text-[#C9A962]" />
      </div>

      {/* تبويبات الفلترة */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-[#F5EFE6]">
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-[#C9A962] data-[state=active]:text-white"
          >
            الكل ({counts.all})
          </TabsTrigger>
          <TabsTrigger
            value="admins"
            className="data-[state=active]:bg-[#C9A962] data-[state=active]:text-white"
          >
            الإدارة ({counts.admins})
          </TabsTrigger>
          <TabsTrigger
            value="agents"
            className="data-[state=active]:bg-[#C9A962] data-[state=active]:text-white"
          >
            المناديب ({counts.agents})
          </TabsTrigger>
          <TabsTrigger
            value="merchants"
            className="data-[state=active]:bg-[#C9A962] data-[state=active]:text-white"
          >
            التجار ({counts.merchants})
          </TabsTrigger>
          <TabsTrigger
            value="accounting"
            className="data-[state=active]:bg-[#C9A962] data-[state=active]:text-white"
          >
            <ShieldCheck className="h-3 w-3 ml-1" />
            مصرح لهم ({counts.accounting})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <ScrollArea className="h-[calc(100vh-250px)]">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEmployees.map((emp) => {
                const hasAccountingAccess =
                  emp.permissions.includes("view_dashboard");
                return (
                  <Card
                    key={emp.id}
                    className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden"
                    onClick={() => {
                      setSelectedEmployee(emp);
                      setDetailsOpen(true);
                    }}
                  >
                    <div className="p-4 bg-gradient-to-r from-[#3D3021] to-[#2A2116] text-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                            <User className="h-5 w-5 text-[#C9A962]" />
                          </div>
                          <div>
                            <h3 className="font-bold">{emp.name}</h3>
                            <p className="text-xs text-white/70">{emp.email}</p>
                          </div>
                        </div>
                        {getRoleBadge(emp.role)}
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#8B7355]">
                            الحالة:
                          </span>
                          <Badge
                            className={
                              emp.isActive ? "bg-green-500" : "bg-gray-500"
                            }
                          >
                            {emp.isActive ? "نشط" : "معطل"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#8B7355]">
                            النظام المحاسبي:
                          </span>
                          {hasAccountingAccess ? (
                            <Badge className="bg-[#C9A962]">
                              <ShieldCheck className="h-3 w-3 ml-1" /> مصرح
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[#A69B8D]">
                              <ShieldAlert className="h-3 w-3 ml-1" /> غير مصرح
                            </Badge>
                          )}
                        </div>
                        {emp.role === "MERCHANT" && emp.merchant && (
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-sm text-[#8B7355]">
                              المبيعات:
                            </span>
                            <span className="font-bold">
                              {formatCurrency(emp.stats.totalSales)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#8B7355]">تاريخ التسجيل:</span>
                          <span>{formatDate(emp.createdAt)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* نافذة تفاصيل الموظف */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-[#C9A962]" />
              تفاصيل الموظف
            </DialogTitle>
            <DialogDescription>
              {selectedEmployee?.name} - {selectedEmployee?.role}
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-[#C9A962]" />
                  <span className="text-[#8B7355]">الاسم:</span>
                  <span className="font-medium">{selectedEmployee.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#C9A962]" />
                  <span className="text-[#8B7355]">البريد:</span>
                  <span>{selectedEmployee.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[#C9A962]" />
                  <span className="text-[#8B7355]">الهاتف:</span>
                  <span>{selectedEmployee.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#C9A962]" />
                  <span className="text-[#8B7355]">تاريخ التسجيل:</span>
                  <span>{formatDate(selectedEmployee.createdAt)}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 p-4 bg-[#FAF7F2] rounded-lg">
                <div className="text-center">
                  <Package className="h-5 w-5 mx-auto text-[#C9A962]" />
                  <p className="text-2xl font-bold">
                    {selectedEmployee.stats.productsCount}
                  </p>
                  <p className="text-xs text-[#8B7355]">منتج مضاف</p>
                </div>
                <div className="text-center">
                  <ShoppingBag className="h-5 w-5 mx-auto text-[#C9A962]" />
                  <p className="text-2xl font-bold">
                    {selectedEmployee.stats.ordersCount}
                  </p>
                  <p className="text-xs text-[#8B7355]">طلب مندوب</p>
                </div>
                <div className="text-center">
                  <Store className="h-5 w-5 mx-auto text-[#C9A962]" />
                  <p className="text-2xl font-bold">
                    {formatCurrency(selectedEmployee.stats.totalSales)}
                  </p>
                  <p className="text-xs text-[#8B7355]">إجمالي المبيعات</p>
                </div>
              </div>

              {selectedEmployee.role === "MERCHANT" &&
                selectedEmployee.merchant && (
                  <div className="p-4 bg-[#FAF7F2] rounded-lg">
                    <h4 className="font-bold mb-2">معلومات التاجر</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-[#8B7355]">اسم المتجر:</span>{" "}
                        {selectedEmployee.merchant.storeName}
                      </div>
                      <div>
                        <span className="text-[#8B7355]">نسبة العمولة:</span>{" "}
                        {selectedEmployee.merchant.commissionAmount}%
                      </div>
                    </div>
                  </div>
                )}

              <div className="p-4 bg-[#FAF7F2] rounded-lg">
                <h4 className="font-bold mb-3 flex items-center gap-2">
                  <Key className="h-4 w-4 text-[#C9A962]" />
                  صلاحية النظام المحاسبي
                </h4>
                {selectedEmployee.permissions.includes("view_dashboard") ? (
                  <div className="space-y-2">
                    <Badge className="bg-green-500">
                      <ShieldCheck className="h-3 w-3 ml-1" /> مصرح له بدخول
                      النظام المحاسبي
                    </Badge>
                    <p className="text-sm text-[#5D5D5D]">
                      يمتلك هذا المستخدم كامل الصلاحيات المحاسبية.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="mt-2"
                      onClick={() => handleToggleAccess(selectedEmployee)}
                      disabled={updatingId === selectedEmployee.id}
                    >
                      {updatingId === selectedEmployee.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldAlert className="h-4 w-4 ml-1" />
                      )}
                      سحب الصلاحية
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Badge variant="outline" className="text-[#A69B8D]">
                      <ShieldAlert className="h-3 w-3 ml-1" /> غير مصرح له
                    </Badge>
                    <p className="text-sm text-[#5D5D5D]">
                      منح هذا المستخدم صلاحية دخول النظام المحاسبي سيظهر له
                      أيقونة المحاسبة في لوحة تحكمه.
                    </p>
                    <Button
                      className="mt-2 bg-[#C9A962] hover:bg-[#B8956E]"
                      size="sm"
                      onClick={() => handleToggleAccess(selectedEmployee)}
                      disabled={updatingId === selectedEmployee.id}
                    >
                      {updatingId === selectedEmployee.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Shield className="h-4 w-4 ml-1" />
                      )}
                      ترقية لدخول النظام المحاسبي
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
