"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  ChevronLeft,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuthModals } from "@/components/auth/auth-modals";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CheckoutDialog } from "@/components/checkout/checkout-dialog";
import { useCart } from "@/contexts/cart-context";
import Link from "next/link";

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
}

export default function CartPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'dashboard' | 'store'>('store');

  const {
    state: cartState,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  useEffect(() => {
    requestAnimationFrame(() => {
      setMounted(true);
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setViewMode('dashboard');
    window.location.reload();
  };

  const handleCheckout = () => {
    if (!user) {
      setIsAuthOpen(true);
    } else {
      setIsCheckoutOpen(true);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const items = cartState?.items || [];
  const itemCount = cartState?.itemCount || 0;
  const total = cartState?.total || 0;
  const discount = cartState?.discount || 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <Navbar
        user={user}
        onOpenCart={() => {}}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onViewDashboard={() => setViewMode('dashboard')}
        onViewStore={() => setViewMode('store')}
        viewMode={viewMode}
      />

      {/* Auth Modals */}
      <AuthModals isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} defaultTab="login" />

      {/* Checkout Dialog */}
      <CheckoutDialog
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={items}
        userId={user?.id || ""}
        onSuccess={() => {
          clearCart();
        }}
      />

      {/* Main Content */}
      <main className="flex-1 pt-20 md:pt-24 pb-8">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-2 mb-6">
            <ShoppingCart className="h-6 w-6 text-[var(--gold)]" />
            <h1 className="text-2xl font-bold">سلة التسوق</h1>
            {itemCount > 0 && (
              <Badge className="bg-[var(--gold)]">{itemCount}</Badge>
            )}
          </div>

          {items.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingCart className="h-20 w-20 mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold mb-2">السلة فارغة</h2>
              <p className="text-gray-500 mb-6">لم يتم أضافة أي منتجات للسلة بعد</p>
              <Link href="/products">
                <Button className="bg-[var(--gold)] hover:bg-[var(--gold-dark)]">
                  تصفح المنتجات
                  <ChevronLeft className="mr-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {items.map((item) => (
                  <motion.div
                    key={item.productId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <img
                            src={item.image}
                            alt={item.nameAr}
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold">{item.nameAr}</h3>
                            <p className="text-sm text-gray-500">{item.name}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="font-bold text-[var(--gold-dark)]">
                                {item.price.toLocaleString()} ر.ي
                              </span>
                              {item.originalPrice && item.originalPrice > item.price && (
                                <span className="text-sm text-gray-400 line-through">
                                  {item.originalPrice.toLocaleString()} ر.ي
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600"
                              onClick={() => removeItem(item.productId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-8 text-center font-bold">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                disabled={item.quantity >= item.stock}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}

                <Button
                  variant="ghost"
                  className="text-red-500 hover:text-red-600"
                  onClick={clearCart}
                >
                  <Trash2 className="h-4 w-4 ml-2" />
                  إفراغ السلة
                </Button>
              </div>

              {/* Order Summary */}
              <div>
                <Card className="sticky top-24">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg mb-4">ملخص الطلب</h3>

                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-500">المنتجات ({itemCount})</span>
                        <span>{total.toLocaleString()} ر.ي</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>الخصم</span>
                          <span>-{discount.toLocaleString()} ر.ي</span>
                        </div>
                      )}
                      <div className="flex justify-between text-gray-500">
                        <span>التوصيل</span>
                        <span>سيُحدد لاحقاً</span>
                      </div>
                    </div>

                    <div className="border-t pt-4 mb-6">
                      <div className="flex justify-between font-bold text-lg">
                        <span>المجموع</span>
                        <span className="text-[var(--gold-dark)]">
                          {(total - discount).toLocaleString()} ر.ي
                        </span>
                      </div>
                    </div>

                    <Button
                      className="w-full bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
                      size="lg"
                      onClick={handleCheckout}
                    >
                      {!user ? "سجل الدخول للمتابعة" : "إتمام الشراء"}
                      <ArrowRight className="mr-2 h-4 w-4" />
                    </Button>

                    <Link href="/products">
                      <Button variant="ghost" className="w-full mt-2">
                        متابعة التسوق
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
