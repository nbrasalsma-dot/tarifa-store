"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

// أنواع البيانات الأساسية
export type AccountingPermission =
  | "view_dashboard"
  | "view_journal"
  | "create_journal"
  | "view_orders"
  | "manage_orders"
  | "view_cashflow"
  | "manage_cashflow"
  | "view_inventory"
  | "manage_inventory"
  | "view_suppliers"
  | "manage_suppliers"
  | "view_returns"
  | "manage_returns"
  | "view_employees"
  | "manage_employees";

interface AccountingUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: AccountingPermission[];
}

interface AccountingContextType {
  user: AccountingUser | null;
  isLoading: boolean;
  hasPermission: (permission: AccountingPermission) => boolean;
  setUser: (user: AccountingUser | null) => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const AccountingContext = createContext<AccountingContextType | undefined>(
  undefined,
);

export function AccountingProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountingUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // دالة مساعدة لإرسال طلبات API مع التوكن تلقائياً
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  };

  useEffect(() => {
    // جلب بيانات المستخدم من localStorage أو API
    const fetchUser = async () => {
      try {
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);

          // 1. تحديد الصلاحيات الحقيقية للمستخدم
          let permissions: AccountingPermission[] = [];

          // إذا كان المستخدم ADMIN، نعطيه كل الصلاحيات افتراضياً (احتياط)
          const allPermissions: AccountingPermission[] = [
            "view_dashboard",
            "view_journal",
            "create_journal",
            "view_orders",
            "manage_orders",
            "view_cashflow",
            "manage_cashflow",
            "view_inventory",
            "manage_inventory",
            "view_suppliers",
            "manage_suppliers",
            "view_returns",
            "manage_returns",
            "view_employees",
            "manage_employees",
          ];

          try {
            if (parsedUser.permissions) {
              // إذا كانت الصلاحيات مخزنة كنص JSON، نحولها إلى مصفوفة
              if (typeof parsedUser.permissions === "string") {
                permissions = JSON.parse(parsedUser.permissions);
              } else {
                // إذا كانت بالفعل مصفوفة، نستخدمها مباشرة
                permissions = parsedUser.permissions;
              }
            } else if (parsedUser.role === "ADMIN") {
              // إذا لم تكن هناك صلاحيات مخزنة وكان المستخدم ADMIN، نعطيه كل الصلاحيات
              permissions = allPermissions;
            }
          } catch (e) {
            console.error("فشل قراءة الصلاحيات:", e);
            if (parsedUser.role === "ADMIN") {
              permissions = allPermissions;
            }
          }

          setUser({
            id: parsedUser.id,
            name: parsedUser.name,
            email: parsedUser.email,
            role: parsedUser.role,
            permissions,
          });
        }
      } catch (error) {
        console.error("فشل تحميل بيانات المستخدم:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const hasPermission = (permission: AccountingPermission): boolean => {
    if (!user) return false;
    return user.permissions.includes(permission);
  };

  return (
    <AccountingContext.Provider
      value={{ user, isLoading, hasPermission, setUser, fetchWithAuth }}
    >
      {children}
    </AccountingContext.Provider>
  );
}

export function useAccounting() {
  const context = useContext(AccountingContext);
  if (context === undefined) {
    throw new Error("useAccounting must be used within an AccountingProvider");
  }
  return context;
}
