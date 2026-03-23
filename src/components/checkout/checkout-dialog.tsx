/**
 * Checkout Dialog with Payment Options
 * Supports: Bank transfers, Mobile wallets (Jeib, Kash, Jawali)
 */

"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Banknote,
  Wallet,
  Phone,
  User,
  Upload,
  CheckCircle,
  Loader2,
  MessageCircle,
  ArrowRight,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { uploadImage } from "@/lib/upload";

// Payment recipient info
const PAYMENT_INFO = {
  name: "محمد ابراهيم يحيى عبدالله الديلمي",
  phone: "+967776668662",
};

const WHATSAPP_NUMBER = "967776080395";

interface CheckoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: Array<{
    productId: string;
    name: string;
    nameAr: string;
    price: number;
    quantity: number;
    image: string;
  }>;
  userId: string;
  onSuccess: (orderId: string) => void;
}

export function CheckoutDialog({
  isOpen,
  onClose,
  items,
  userId,
  onSuccess,
}: CheckoutDialogProps) {
  const [step, setStep] = useState<"payment" | "details" | "success">("payment");
  const [paymentMethod, setPaymentMethod] = useState<"transfer" | "wallet" | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<"jeib" | "kash" | "jawali" | null>(null);
  const [transferNumber, setTransferNumber] = useState("");
  const [paymentProof, setPaymentProof] = useState("");
  const [notes, setNotes] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [orderId, setOrderId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadImage(file);
      if (result.success && result.url) {
        setPaymentProof(result.url);
        toast({
          title: "تم رفع الصورة",
          description: "تم الحفظ في السحابة بنجاح",
        });
      } else {
        throw new Error(result.error || "فشل رفع الصورة");
      }
    } catch {
      toast({
        title: "خطأ",
        description: "فشل رفع الصورة",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (!phone || !address) {
      toast({ title: "خطأ", description: "يرجى ملء العنوان ورقم الهاتف", variant: "destructive" });
      return;
    }

    if (!paymentMethod) {
      toast({ title: "خطأ", description: "يرجى اختيار طريقة الدفع", variant: "destructive" });
      return;
    }

    if (paymentMethod === "transfer" && !transferNumber) {
      toast({ title: "خطأ", description: "يرجى إدخال رقم الحوالة", variant: "destructive" });
      return;
    }

    if (paymentMethod === "wallet" && !paymentProof) {
      toast({ title: "خطأ", description: "يرجى رفع صورة إثبات التحويل", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: userId,
          items: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
          totalAmount: total,
          address,
          phone,
          governorate,
          notes: notes || undefined,
          paymentMethod,
          paymentDetails: paymentMethod === "transfer" 
            ? { transferNumber }
            : { wallet: selectedWallet, proofImage: paymentProof },
        }),
      });

      const data = await response.json();

      if (response.ok && data.order) {
        setOrderId(data.order.id);
        setStep("success");
        onSuccess(data.order.id);
        toast({ title: "تم", description: "تم إنشاء الطلب بنجاح" });
      } else {
        throw new Error(data.error || "حدث خطأ");
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء إنشاء الطلب",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const openWhatsApp = () => {
    const productsList = items.map(item => `• ${item.nameAr} (${item.quantity} قطعة)`).join('\n');
    const paymentInfo = paymentMethod === "transfer"
      ? `رقم الحوالة: ${transferNumber}`
      : `تم الدفع عبر ${selectedWallet === 'jeib' ? 'محفظة جيب' : selectedWallet === 'kash' ? 'كاش' : 'جوالي'}`;

    const message = `مرحباً، أنا أريد طلب المنتجات التالية:

${productsList}

رقم الطلب: #${orderId.slice(-8)}
المجموع: ${total.toLocaleString()} ر.ي

${paymentInfo}

${notes ? `ملاحظات: ${notes}` : ''}`;

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const resetState = () => {
    setStep("payment");
    setPaymentMethod(null);
    setSelectedWallet(null);
    setTransferNumber("");
    setPaymentProof("");
    setNotes("");
    setOrderId("");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-center">
            {step === "payment" && "اختيار طريقة الدفع"}
            {step === "details" && "تفاصيل الطلب"}
            {step === "success" && "تم الطلب بنجاح ✓"}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === "payment" && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 mt-4"
            >
              {/* Payment Methods */}
              <div className="space-y-3">
                <Button
                  variant={paymentMethod === "transfer" ? "default" : "outline"}
                  className={`w-full h-auto py-4 justify-start ${paymentMethod === "transfer" ? "bg-[var(--gold)]" : ""}`}
                  onClick={() => setPaymentMethod("transfer")}
                >
                  <div className="flex items-center gap-3">
                    <Banknote className="h-6 w-6" />
                    <div className="text-right">
                      <p className="font-bold">حوالة</p>
                      <p className="text-xs opacity-70">تحويل عبر مكاتب الصرافة</p>
                    </div>
                  </div>
                </Button>

                <Button
                  variant={paymentMethod === "wallet" ? "default" : "outline"}
                  className={`w-full h-auto py-4 justify-start ${paymentMethod === "wallet" ? "bg-[var(--gold)]" : ""}`}
                  onClick={() => setPaymentMethod("wallet")}
                >
                  <div className="flex items-center gap-3">
                    <Wallet className="h-6 w-6" />
                    <div className="text-right">
                      <p className="font-bold">محافظ وبنوك</p>
                      <p className="text-xs opacity-70">جيب، كاش، جوالي</p>
                    </div>
                  </div>
                </Button>
              </div>

              {/* Transfer Details */}
              {paymentMethod === "transfer" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-4 bg-gray-50 rounded-lg space-y-3"
                >
                  <p className="text-sm font-medium text-gray-600">أرسل الحوالة إلى:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-[var(--gold)]" />
                      <span className="font-bold">{PAYMENT_INFO.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-[var(--gold)]" />
                      <span className="font-bold" dir="ltr">{PAYMENT_INFO.phone}</span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Label>رقم الحوالة *</Label>
                    <Input
                      placeholder="أدخلي رقم الحوالة"
                      value={transferNumber}
                      onChange={(e) => setTransferNumber(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </motion.div>
              )}

              {/* Wallet Details */}
              {paymentMethod === "wallet" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-3"
                >
                  <p className="text-sm font-medium">اختر المحفظة:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "jeib", name: "جيب", color: "bg-purple-500" },
                      { id: "kash", name: "كاش", color: "bg-blue-500" },
                      { id: "jawali", name: "جوالي", color: "bg-green-500" },
                    ].map((wallet) => (
                      <Button
                        key={wallet.id}
                        variant={selectedWallet === wallet.id ? "default" : "outline"}
                        className={`h-auto py-3 ${selectedWallet === wallet.id ? wallet.color + " text-white" : ""}`}
                        onClick={() => setSelectedWallet(wallet.id as "jeib" | "kash" | "jawali")}
                      >
                        {wallet.name}
                      </Button>
                    ))}
                  </div>

                  {selectedWallet && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 bg-gray-50 rounded-lg space-y-3"
                    >
                      <p className="text-sm font-medium text-gray-600">أرسل المبلغ إلى:</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-[var(--gold)]" />
                          <span className="font-bold">{PAYMENT_INFO.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-[var(--gold)]" />
                          <span className="font-bold" dir="ltr">{PAYMENT_INFO.phone}</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <Label>صورة إثبات التحويل *</Label>
                        <input
                          type="file"
                          accept="image/*"
                          ref={fileInputRef}
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <Button
                          variant="outline"
                          className="w-full mt-1"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin ml-2" />
                          ) : (
                            <Upload className="h-4 w-4 ml-2" />
                          )}
                          {paymentProof ? "تغيير الصورة" : "رفع صورة التحويل"}
                        </Button>
                        {paymentProof && (
                          <div className="mt-2">
                            <img src={paymentProof} alt="إثبات الدفع" className="w-full h-32 object-cover rounded-lg" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Notes */}
              <div>
                <Label>ملاحظات (اختياري)</Label>
                <Input
                  placeholder="أي ملاحظات إضافية..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Continue Button */}
              <Button
                className="w-full bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
                size="lg"
                onClick={() => setStep("details")}
                disabled={!paymentMethod || (paymentMethod === "wallet" && !paymentProof)}
              >
                متابعة
                <ArrowRight className="h-4 w-4 mr-2" />
              </Button>
            </motion.div>
          )}

          {step === "details" && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 mt-4"
            >
              {/* Shipping Details */}
              <div className="space-y-3">
                <div>
                  <Label>رقم الهاتف *</Label>
                  <Input
                    placeholder="+967XXXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1"
                    dir="ltr"
                  />
                </div>

                <div>
                  <Label>المحافظة</Label>
                  <Input
                    placeholder="صنعاء، عدن، تعز..."
                    value={governorate}
                    onChange={(e) => setGovernorate(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>العنوان التفصيلي *</Label>
                  <Input
                    placeholder="المدينة، الحي، الشارع، قرب..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Order Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-bold mb-2">ملخص الطلب</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>المنتجات ({items.length})</span>
                    <span>{total.toLocaleString()} ر.ي</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>المجموع</span>
                    <span className="text-[var(--gold-dark)]">{total.toLocaleString()} ر.ي</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Summary */}
              <div className="p-3 bg-[var(--gold)]/10 rounded-lg text-sm">
                <p className="font-medium">طريقة الدفع:</p>
                <p>
                  {paymentMethod === "transfer" 
                    ? `حوالة - رقم: ${transferNumber}`
                    : `${selectedWallet === 'jeib' ? 'جيب' : selectedWallet === 'kash' ? 'كاش' : 'جوالي'} - تم إرفاق صورة`}
                </p>
              </div>

              {/* Submit Button */}
              <Button
                className="w-full bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
                size="lg"
                onClick={handleSubmitOrder}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "تأكيد الطلب"
                )}
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setStep("payment")}
              >
                العودة
              </Button>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6 space-y-4"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>

              <div>
                <p className="text-lg font-bold">تم إنشاء طلبك بنجاح!</p>
                <p className="text-sm text-gray-500 mt-1">
                  رقم الطلب: <span className="font-mono font-bold">#{orderId.slice(-8)}</span>
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg text-right">
                <p className="text-sm font-medium mb-2">المنتجات المطلوبة:</p>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.productId} className="flex items-center gap-2">
                      <img src={item.image} alt={item.nameAr} className="w-10 h-10 rounded object-cover" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.nameAr}</p>
                        <p className="text-xs text-gray-500">{item.quantity} قطعة</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
                onClick={openWhatsApp}
              >
                <MessageCircle className="h-5 w-5 ml-2" />
                إرسال الطلب للواتساب
              </Button>

              <p className="text-xs text-gray-500">
                سيتم التواصل معك قريباً لتأكيد الطلب
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
