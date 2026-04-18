"use client";

import { Menu, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAccounting } from "@/contexts/accounting-context";
import { useRouter } from "next/navigation";

interface AccountingHeaderProps {
  onMenuClick?: () => void;
  title?: string;
}

export function AccountingHeader({
  onMenuClick,
  title,
}: AccountingHeaderProps) {
  const { user, setUser } = useAccounting();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#E8E0D8] bg-white/95 px-4 shadow-sm backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-4">
        {/* زر القائمة الجانبية للجوال */}
        <Button
          variant="ghost"
          size="icon"
          className="text-[#5D5D5D] hover:bg-[#F5EFE6] hover:text-[#3D3021] lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* عنوان الصفحة */}
        <h1 className="text-lg font-bold text-[#3D3021] md:text-xl">
          {title || "النظام المحاسبي"}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {/* معلومات المستخدم والقائمة المنسدلة */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-[#5D5D5D] hover:bg-[#F5EFE6] hover:text-[#3D3021]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-[#C9A962] to-[#B8956E] text-white">
                  <User className="h-4 w-4" />
                </div>
                <span className="hidden text-sm font-medium md:inline-block">
                  {user.name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-xs text-[#8B7355]">{user.email}</span>
                  <span className="mt-1 inline-block w-fit rounded-full bg-[#C9A962]/20 px-2 py-0.5 text-xs text-[#C9A962]">
                    {user.role}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={handleLogout}
              >
                <LogOut className="ml-2 h-4 w-4" />
                <span>تسجيل الخروج</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
