/**
 * Shopping Cart Slide-out Panel
 * Luxury Design for Tarifa Store
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Package,
  Tag,
  Truck,
  Shield,
  Sparkles,
  ArrowLeft,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/cart-context";

interface CartPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user?: { id: string; name: string; email: string; phone: string } | null;
  onCheckout: () => void;
}

export function CartPanel({
  isOpen,
  onClose,
  user,
  onCheckout,
}: CartPanelProps) {
  const { state, removeItem, updateQuantity, clearCart } = useCart();
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(productId);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const handleApplyPromo = () => {
    if (promoCode.toLowerCase() === "tarifa10") {
      setPromoApplied(true);
    }
  };

  const discount = promoApplied ? state.cart.total * 0.1 : state.cart.discount;
  const finalTotal = state.cart.total - discount;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col bg-gradient-to-b from-[#FAF7F2] to-white border-l-0">
        <SheetHeader className="pb-4 border-b border-[#E8E0D8]">
          <SheetTitle className="flex items-center gap-3 text-[#3D3021]">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C9A962] to-[#B8956E] flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            سلة التسوق
            <Badge className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] text-white border-0 rounded-full px-3">
              {state.cart.itemCount}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        {state.cart.items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FAF7F2] to-[#F5EFE6] flex items-center justify-center mb-6"
            >
              <Package className="h-12 w-12 text-[#C9A962]" />
            </motion.div>
            <h3 className="text-xl font-bold text-[#3D3021] mb-2">السلة فارغة</h3>
            <p className="text-[#8B7355] mb-6">
              أضيف منتجات للسلة للمتابعة
            </p>
            <Button
              onClick={onClose}
              className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white rounded-full px-8"
            >
              تصفح المنتجات
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {state.cart.items.map((item) => (
                  <motion.div
                    key={item.productId}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm border border-[#E8E0D8] hover:shadow-md transition-shadow"
                  >
                    {/* Image */}
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-[#FAF7F2]">
                      <img
                        src={item.image}
                        alt={item.nameAr}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-[#3D3021] line-clamp-1">{item.nameAr}</h4>
                      {item.color && (
                        <p className="text-xs text-[#C9A962] font-medium mb-1">اللون: {item.color}</p>
                      )}
                      <p className="text-xs text-[#8B7355] mb-2">{item.name}</p>

                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-bold text-[#8B7355]">
                          {item.price.toLocaleString()} ر.ي
                        </span>
                        {item.originalPrice && item.originalPrice > item.price && (
                          <span className="text-xs text-[#A69B8D] line-through">
                            {item.originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 bg-[#FAF7F2] rounded-full p-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 rounded-full hover:bg-white"
                            onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-bold text-[#3D3021]">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 rounded-full hover:bg-white"
                            onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                            disabled={item.quantity >= item.stock}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-full"
                          onClick={() => removeItem(item.productId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Promo Code */}
            <div className="py-4 border-t border-[#E8E0D8]">
              <div className="flex gap-2">
                <Input
                  placeholder="كود الخصم"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  disabled={promoApplied}
                  className="border-[#E8E0D8] focus:border-[#C9A962] rounded-xl"
                />
                <Button
                  variant="outline"
                  onClick={handleApplyPromo}
                  disabled={promoApplied || !promoCode}
                  className="border-[#C9A962] text-[#8B7355] hover:bg-[#FAF7F2] rounded-xl"
                >
                  <Tag className="h-4 w-4" />
                </Button>
              </div>
              {promoApplied && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-emerald-600 mt-2 flex items-center gap-1"
                >
                  <Sparkles className="h-4 w-4" />
                  خصم 10% مطبق
                </motion.p>
              )}
            </div>

            {/* Summary */}
            <div className="border-t border-[#E8E0D8] pt-4 space-y-3">
              <div className="flex justify-between text-sm text-[#5D5D5D]">
                <span>المجموع الفرعي</span>
                <span>{state.cart.total.toLocaleString()} ر.ي</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>الخصم</span>
                  <span>-{discount.toLocaleString()} ر.ي</span>
                </div>
              )}

              <Separator className="bg-[#E8E0D8]" />

              <div className="flex justify-between font-bold text-lg text-[#3D3021]">
                <span>المجموع</span>
                <span className="text-[#8B7355]">{finalTotal.toLocaleString()} ر.ي</span>
              </div>

              {/* Features */}
              <div className="flex items-center justify-center gap-6 text-xs text-[#8B7355] py-2">
                <div className="flex items-center gap-1">
                  <Truck className="h-4 w-4 text-[#C9A962]" />
                  <span>توصيل سريع</span>
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="h-4 w-4 text-[#C9A962]" />
                  <span>دفع آمن</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Button
                  className="w-full bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white py-7 rounded-xl text-lg"
                  onClick={onCheckout}
                >
                  {!user ? (
                    <>
                      <LogIn className="h-5 w-5 ml-2" />
                      سجل الدخول للمتابعة
                    </>
                  ) : (
                    <>
                      إتمام الطلب
                      <ArrowLeft className="h-5 w-5 mr-2" />
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  className="w-full text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                  onClick={clearCart}
                >
                  <Trash2 className="h-4 w-4 ml-2" />
                  إفراغ السلة
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
