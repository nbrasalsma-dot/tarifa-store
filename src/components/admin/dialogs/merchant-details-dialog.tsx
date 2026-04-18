"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, XCircle, CheckCircle, Store } from "lucide-react";

interface Merchant {
  id: string;
  storeName: string;
  storeType: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  identityCardImage: string;
  jeibWallet: string | null;
  kashWallet: string | null;
  jawaliWallet: string | null;
  transferInfo: string | null;
  isApproved: boolean;
  isActive: boolean;
  commissionAmount: number;
  totalSales: number;
  totalCommission: number;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    phone: string;
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
  };
}

interface MerchantDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  merchant: Merchant | null;
  onApproval: (merchantId: string, approved: boolean) => void;
  formatDate: (date: string) => string;
  decodeHtml: (html: string) => string;
}

export function MerchantDetailsDialog({
  isOpen,
  onOpenChange,
  merchant,
  onApproval,
  formatDate,
  decodeHtml,
}: MerchantDetailsDialogProps) {
  if (!merchant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-[var(--gold)]" />
            تفاصيل التاجر
          </DialogTitle>
          <DialogDescription className="sr-only">
            عرض بيانات التاجر وطلب التسجيل الخاص به
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-[var(--gold)]/10 rounded-lg">
            <div className="w-16 h-16 rounded-full bg-[var(--gold)]/20 flex items-center justify-center">
              <Store className="h-8 w-8 text-[var(--gold)]" />
            </div>
            <div className="text-center sm:text-right">
              <h3 className="text-xl font-bold">{merchant.storeName}</h3>
              <p className="text-[var(--muted-foreground)]">
                {merchant.storeType}
              </p>
            </div>
            <div className="sm:mr-auto">
              {merchant.isApproved ? (
                <Badge className="bg-green-500 text-lg px-4 py-1">مفعّل</Badge>
              ) : (
                <Badge className="bg-yellow-500 text-lg px-4 py-1">
                  قيد الانتظار
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-bold text-[var(--gold-dark)]">
                بيانات التاجر
              </h4>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">الاسم الكامل:</span>{" "}
                  {merchant.fullName}
                </p>
                <p>
                  <span className="font-medium">البريد:</span> {merchant.email}
                </p>
                <p>
                  <span className="font-medium">الجوال:</span>{" "}
                  <span dir="ltr">{merchant.phone}</span>
                </p>
                <p>
                  <span className="font-medium">العنوان:</span>{" "}
                  {merchant.address}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-bold text-[var(--gold-dark)]">
                بيانات الدفع
              </h4>
              <div className="space-y-2 text-sm">
                {merchant.jeibWallet && (
                  <p>
                    <span className="font-medium">جيب:</span>{" "}
                    {merchant.jeibWallet}
                  </p>
                )}
                {merchant.kashWallet && (
                  <p>
                    <span className="font-medium">كاش:</span>{" "}
                    {merchant.kashWallet}
                  </p>
                )}
                {merchant.jawaliWallet && (
                  <p>
                    <span className="font-medium">جوالي:</span>{" "}
                    {merchant.jawaliWallet}
                  </p>
                )}
                {merchant.transferInfo && (
                  <p>
                    <span className="font-medium">حوالة:</span>{" "}
                    {merchant.transferInfo}
                  </p>
                )}
                {!merchant.jeibWallet &&
                  !merchant.kashWallet &&
                  !merchant.jawaliWallet &&
                  !merchant.transferInfo && (
                    <p className="text-[var(--muted-foreground)]">
                      لم يتم إضافة بيانات دفع
                    </p>
                  )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-[var(--gold-dark)]">
              صورة البطاقة الشخصية
            </h4>
            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 border">
              <img
                src={decodeHtml(merchant.identityCardImage)}
                alt="صورة البطاقة"
                className="w-full h-full object-contain"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="absolute bottom-2 left-2 bg-white/90 hover:bg-white shadow-sm border-[var(--gold)] text-[var(--gold-dark)]"
                onClick={() =>
                  window.open(decodeHtml(merchant.identityCardImage), "_blank")
                }
              >
                <Eye className="h-4 w-4 ml-2" />
                فتح في تاب جديد
              </Button>
            </div>
          </div>

          {!merchant.isApproved && (
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                إلغاء
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => onApproval(merchant.id, false)}
              >
                <XCircle className="h-4 w-4 ml-2" />
                رفض
              </Button>
              <Button
                className="flex-1 bg-green-500 hover:bg-green-600"
                onClick={() => onApproval(merchant.id, true)}
              >
                <CheckCircle className="h-4 w-4 ml-2" />
                موافقة
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
