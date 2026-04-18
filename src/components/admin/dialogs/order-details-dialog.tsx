"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Package, Eye } from "lucide-react";

interface OrderItem {
  product: {
    name: string;
    nameAr: string;
    mainImage?: string;
  };
  quantity: number;
  price: number;
  color?: string;
}

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  items: OrderItem[];
  paymentMethod?: string;
  paymentDetails?: any;
  notes?: string;
}

interface OrderDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  getStatusBadge: (status: string) => JSX.Element;
  formatCurrency: (amount: number) => string;
}

export function OrderDetailsDialog({
  isOpen,
  onOpenChange,
  order,
  getStatusBadge,
  formatCurrency,
}: OrderDetailsDialogProps) {
  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center border-b pb-2">
            <span>تفاصيل الطلب #{order.id.slice(-8)}</span>
            {getStatusBadge(order.status)}
          </DialogTitle>
          <DialogDescription className="sr-only">
            عرض تفاصيل الطلبية المحددة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-sm text-gray-800 mt-2">
          {/* بيانات العميل */}
          <div className="space-y-2">
            <p className="font-bold text-lg text-[var(--gold-dark)]">
              👤 بيانات العميل:
            </p>
            <div className="pr-2 space-y-1 bg-gray-50 p-3 rounded-lg border border-gray-100">
              {(() => {
                let extraData: any = {};
                try {
                  extraData =
                    typeof order.paymentDetails === "string"
                      ? JSON.parse(order.paymentDetails)
                      : order.paymentDetails || {};
                } catch (e) {}
                return (
                  <>
                    <p>
                      •{" "}
                      <span className="font-medium text-gray-700">
                        صاحب الحساب:
                      </span>{" "}
                      {order.customer.name}
                    </p>
                    {extraData.customerName &&
                      extraData.customerName !== order.customer.name && (
                        <p className="text-blue-700 font-bold bg-blue-50 p-1.5 rounded mt-1 w-fit border border-blue-100">
                          🎁 اسم المستلم للطلب: {extraData.customerName}
                        </p>
                      )}
                    <p>
                      • <span className="font-medium">الهاتف:</span>{" "}
                      <span dir="ltr">{order.customer.phone}</span>
                    </p>
                    <p>
                      • <span className="font-medium">العنوان:</span>{" "}
                      {order.customer.address}
                    </p>
                    <p className="mt-2 pt-2 border-t border-gray-200">
                      📍 <span className="font-medium">الموقع:</span>{" "}
                      {extraData.locationLink ? (
                        <a
                          href={extraData.locationLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline font-bold hover:text-blue-800"
                        >
                          فتح في خرائط جوجل
                        </a>
                      ) : (
                        <span className="text-gray-400">
                          لم يتم مشاركة الموقع
                        </span>
                      )}
                    </p>
                  </>
                );
              })()}
            </div>
          </div>

          {/* المنتجات المطلوبة */}
          <div className="space-y-2">
            <p className="font-bold text-lg text-[var(--gold-dark)]">
              📦 المنتجات المطلوبة:
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {order.items.map((item, index) => (
                <div
                  key={index}
                  className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex items-start gap-4"
                >
                  {item.product?.mainImage ? (
                    <img
                      src={item.product.mainImage}
                      alt={item.product.nameAr}
                      className="w-16 h-16 rounded-md object-cover border border-gray-200 shadow-sm shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-md bg-gray-200 flex items-center justify-center shrink-0 border border-gray-300">
                      <Package className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    <p className="font-bold text-base text-gray-900">
                      • {item.product?.nameAr || "منتج غير متاح"}
                    </p>
                    <div className="text-gray-600 text-sm">
                      <p>
                        🔹 <span className="font-medium">العدد:</span>{" "}
                        {item.quantity}
                      </p>
                      <p>
                        💰 <span className="font-medium">السعر:</span>{" "}
                        {item.price.toLocaleString()} ر.ي
                      </p>
                      {item.color && (
                        <p>
                          🎨 <span className="font-medium">اللون:</span>{" "}
                          {item.color}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* الملخص المالي */}
          <div className="space-y-2">
            <p className="font-bold text-lg text-[var(--gold-dark)]">
              💰 الملخص المالي:
            </p>
            <div className="pr-2 space-y-1 bg-green-50 p-3 rounded-lg border border-green-100">
              <p>
                • <span className="font-medium">قيمة المنتجات:</span>{" "}
                {order.items
                  .reduce((sum, item) => sum + item.price * item.quantity, 0)
                  .toLocaleString()}{" "}
                ر.ي
              </p>
              <p>
                • <span className="font-medium">رسوم التوصيل:</span>{" "}
                {(
                  order.totalAmount -
                  order.items.reduce(
                    (sum, item) => sum + item.price * item.quantity,
                    0,
                  )
                ).toLocaleString()}{" "}
                ر.ي
              </p>
              <p className="text-base mt-2 border-t border-green-200 pt-2">
                •{" "}
                <span className="font-bold text-green-700">
                  الإجمالي الكلي: {formatCurrency(order.totalAmount)}
                </span>
              </p>
            </div>
          </div>

          {/* بيانات الدفع */}
          <div className="space-y-2">
            <p className="font-bold text-lg text-[var(--gold-dark)]">
              💳 بيانات الدفع:
            </p>
            <div className="pr-2 bg-[var(--gold)]/10 p-3 rounded-lg border border-[var(--gold)]/20 space-y-2">
              <p>
                🔹 <span className="font-medium">طريقة الدفع:</span>{" "}
                {order.paymentMethod === "transfer"
                  ? "حوالة صرافة"
                  : order.paymentMethod === "wallet"
                    ? "محفظة إلكترونية"
                    : "غير محدد"}
              </p>

              {order.paymentDetails &&
                (() => {
                  try {
                    const details =
                      typeof order.paymentDetails === "string"
                        ? JSON.parse(order.paymentDetails)
                        : order.paymentDetails;

                    return (
                      <div className="space-y-2 pt-1 border-t border-[var(--gold)]/20 mt-2">
                        {details.transferNumber && (
                          <p>
                            🔢 <span className="font-medium">رقم الحوالة:</span>{" "}
                            <span className="font-bold text-blue-700">
                              {details.transferNumber}
                            </span>
                          </p>
                        )}
                        {details.wallet && (
                          <p>
                            🏦 <span className="font-medium">المحفظة:</span>{" "}
                            {details.wallet === "jeib"
                              ? "جيب"
                              : details.wallet === "kash"
                                ? "كاش"
                                : details.wallet === "jawali"
                                  ? "جوالي"
                                  : details.wallet}
                          </p>
                        )}
                        {details.proofImage && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2 bg-white border-[var(--gold)] text-[var(--gold-dark)] hover:bg-[var(--gold)] hover:text-white"
                            onClick={() =>
                              window.open(details.proofImage, "_blank")
                            }
                          >
                            <Eye className="h-4 w-4 ml-2" />
                            فتح صورة الإثبات من السحابة
                          </Button>
                        )}
                      </div>
                    );
                  } catch (e) {
                    return (
                      <p className="text-xs text-red-500">
                        فشل في عرض بيانات الدفع التفصيلية
                      </p>
                    );
                  }
                })()}
            </div>
          </div>

          {/* الملاحظات */}
          <div className="pt-2 border-t">
            <p className="text-gray-600">
              📝 <span className="font-medium">ملاحظات:</span>{" "}
              {order.notes || "لا يوجد"}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
