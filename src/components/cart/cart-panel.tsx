/**
 * Shopping Cart Slide-out Panel
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
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-[var(--gold)]" />
            سلة التسوق
            <Badge className="bg-[var(--gold)]">{state.cart.itemCount}</Badge>
          </SheetTitle>
        </SheetHeader>

        {state.cart.items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Package className="h-16 w-16 text-gray-300 mb-4" />
            <p className="text-lg font-medium mb-2">السلة فارغة</p>
            <p className="text-sm text-gray-500 mb-4">
              أضف منتجات للسلة للمتابعة
            </p>
            <Button onClick={onClose} className="bg-[var(--gold)] hover:bg-[var(--gold-dark)]">
              تصفح المنتجات
            </Button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              <AnimatePresence mode="popLayout">
                {state.cart.items.map((item) => (
                  <motion.div
                    key={item.productId}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    {/* Image */}
                    <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0">
                      <img
                        src={item.image}
                        alt={item.nameAr}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-1">{item.nameAr}</h4>
                      <p className="text-xs text-gray-500 mb-1">{item.name}</p>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-[var(--gold-dark)]">
                          {item.price.toLocaleString()} ر.ي
                        </span>
                        {item.originalPrice && item.originalPrice > item.price && (
                          <span className="text-xs text-gray-400 line-through">
                            {item.originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 mr-auto text-red-500 hover:text-red-600"
                          onClick={() => removeItem(item.productId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Item Total */}
                    <div className="text-left">
                      <p className="font-bold">
                        {(item.price * item.quantity).toLocaleString()} ر.ي
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Promo Code */}
            <div className="py-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="كود الخصم"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  disabled={promoApplied}
                />
                <Button
                  variant="outline"
                  onClick={handleApplyPromo}
                  disabled={promoApplied || !promoCode}
                >
                  <Tag className="h-4 w-4" />
                </Button>
              </div>
              {promoApplied && (
                <p className="text-sm text-green-600 mt-2">✓ خصم 10% مطبق</p>
              )}
            </div>

            {/* Summary */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span>المجموع الفرعي</span>
                <span>{state.cart.total.toLocaleString()} ر.ي</span>
              </div>
              
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>الخصم</span>
                  <span>-{discount.toLocaleString()} ر.ي</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between font-bold text-lg">
                <span>المجموع</span>
                <span className="text-[var(--gold-dark)]">
                  {finalTotal.toLocaleString()} ر.ي
                </span>
              </div>

              {/* Features */}
              <div className="flex items-center justify-center gap-4 text-xs text-gray-500 py-2">
                <div className="flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  <span>توصيل سريع</span>
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  <span>دفع آمن</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Button
                  className="w-full bg-gradient-to-r from-[var(--gold-light)] to-[var(--gold)] hover:from-[var(--gold)] hover:to-[var(--gold-dark)]"
                  size="lg"
                  onClick={onCheckout}
                >
                  إتمام الطلب
                </Button>

                <Button
                  variant="ghost"
                  className="w-full text-red-500 hover:text-red-600"
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
