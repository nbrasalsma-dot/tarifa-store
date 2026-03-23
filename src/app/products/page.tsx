"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  Heart,
  Star,
  Plus,
  Minus,
  Check,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuthModals } from "@/components/auth/auth-modals";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AgentDashboard } from "@/components/agent/agent-dashboard";
import { CustomerDashboard } from "@/components/customer/customer-dashboard";
import { CartPanel } from "@/components/cart/cart-panel";
import { CheckoutDialog } from "@/components/checkout/checkout-dialog";
import { ChatWidget } from "@/components/chat/chat-widget";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useCart } from "@/contexts/cart-context";
import { useWishlist } from "@/contexts/wishlist-context";
import { toast } from "@/hooks/use-toast";

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
}

interface Product {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  originalPrice?: number;
  mainImage: string;
  stock: number;
  isFeatured: boolean;
  categoryId?: string;
  category?: { nameAr: string };
}

interface Category {
  id: string;
  name: string;
  nameAr: string;
}

// WhatsApp number
const WHATSAPP_NUMBER = "967776080395";

export default function ProductsPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'dashboard' | 'store'>('dashboard');

  const { state: cartState, addItem: addToCart, isInCart, getItemQuantity, updateQuantity, removeItem, clearCart } = useCart();
  const { isInWishlist, toggleItem: toggleWishlist } = useWishlist();

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/categories"),
        ]);

        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(data.products || []);
        }

        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          setCategories(data.categories || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setViewMode('dashboard');
    window.location.reload();
  };

  const openWhatsApp = (message?: string) => {
    const url = message
      ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
      : `https://wa.me/${WHATSAPP_NUMBER}`;
    window.open(url, '_blank');
  };

  // Filter products
  let filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === "all" || product.categoryId === selectedCategory;
    const matchesSearch = product.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Sort products
  if (sortBy === "price-low") {
    filteredProducts = [...filteredProducts].sort((a, b) => a.price - b.price);
  } else if (sortBy === "price-high") {
    filteredProducts = [...filteredProducts].sort((a, b) => b.price - a.price);
  } else if (sortBy === "name") {
    filteredProducts = [...filteredProducts].sort((a, b) => a.nameAr.localeCompare(b.nameAr, "ar"));
  }

  // Show dashboards for logged users
  if (user && viewMode === 'dashboard') {
    if (user.role === "ADMIN") {
      return <AdminDashboard user={user} onLogout={handleLogout} />;
    }
    if (user.role === "AGENT") {
      return <AgentDashboard user={user} onLogout={handleLogout} />;
    }
    if (user.role === "CUSTOMER") {
      return (
        <>
          <CustomerDashboard
            user={user}
            onLogout={handleLogout}
            onViewStore={() => setViewMode('store')}
          />
          <ChatWidget userId={user.id} userName={user.name} userRole={user.role} />
        </>
      );
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <Navbar
        user={user}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onViewDashboard={() => setViewMode('dashboard')}
        onViewStore={() => setViewMode('store')}
        viewMode={viewMode}
      />

      {/* Auth Modals */}
      <AuthModals isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} defaultTab="login" />

      {/* Cart Panel */}
      <CartPanel
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        user={user}
        onCheckout={() => {
          if (!user) {
            setIsCartOpen(false);
            setIsAuthOpen(true);
          } else {
            setIsCartOpen(false);
            setIsCheckoutOpen(true);
          }
        }}
      />

      {/* Checkout Dialog */}
      <CheckoutDialog
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartState.items}
        userId={user?.id || ""}
        onSuccess={(orderId) => {
          setLastOrderId(orderId);
          clearCart();
        }}
      />

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                <img src={selectedProduct.mainImage} alt={selectedProduct.nameAr} className="w-full h-full object-cover" />
                {selectedProduct.originalPrice && selectedProduct.originalPrice > selectedProduct.price && (
                  <Badge className="absolute top-4 right-4 bg-[var(--rose)] text-white">
                    خصم {Math.round((1 - selectedProduct.price / selectedProduct.originalPrice) * 100)}%
                  </Badge>
                )}
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-sm text-gray-500">{selectedProduct.category?.nameAr || "بدون تصنيف"}</p>
                  <h2 className="text-2xl font-bold">{selectedProduct.nameAr}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-[var(--gold-dark)]">
                    {selectedProduct.price.toLocaleString()} ر.ي
                  </span>
                  {selectedProduct.originalPrice && selectedProduct.originalPrice > selectedProduct.price && (
                    <span className="text-xl text-gray-400 line-through">
                      {selectedProduct.originalPrice.toLocaleString()} ر.ي
                    </span>
                  )}
                </div>
                <p className="text-sm">{selectedProduct.stock > 0 ? `متوفر (${selectedProduct.stock} قطعة)` : "غير متوفر"}</p>

                {isInCart(selectedProduct.id) && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">الكمية:</span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => updateQuantity(selectedProduct.id, getItemQuantity(selectedProduct.id) - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-bold">{getItemQuantity(selectedProduct.id)}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => updateQuantity(selectedProduct.id, getItemQuantity(selectedProduct.id) + 1)}
                        disabled={getItemQuantity(selectedProduct.id) >= selectedProduct.stock}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <Button
                    size="lg"
                    className="bg-[var(--gold)] hover:bg-[var(--gold-dark)] text-white"
                    disabled={selectedProduct.stock === 0}
                    onClick={() => {
                      if (!isInCart(selectedProduct.id)) {
                        addToCart({
                          productId: selectedProduct.id,
                          name: selectedProduct.name,
                          nameAr: selectedProduct.nameAr,
                          price: selectedProduct.price,
                          originalPrice: selectedProduct.originalPrice,
                          image: selectedProduct.mainImage,
                          quantity: 1,
                          stock: selectedProduct.stock,
                        });
                        toast({ title: "تمت الإضافة", description: "تم إضافة المنتج للسلة" });
                      }
                    }}
                  >
                    {isInCart(selectedProduct.id) ? (
                      <>
                        <Check className="h-5 w-5 ml-2" />
                        في السلة
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-5 w-5 ml-2" />
                        أضف للسلة
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => openWhatsApp(`استفسار عن منتج: ${selectedProduct.nameAr}`)}
                  >
                    <MessageCircle className="h-4 w-4 ml-2" />
                    استفسار عبر واتساب
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="flex-1 pt-20 md:pt-24 pb-8">
        <div className="container mx-auto px-4">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">جميع المنتجات</h1>
            <p className="text-gray-500">اكتشفي مجموعتنا المتنوعة من المنتجات الفاخرة</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="ابحثي عن منتجات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="التصنيف" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع التصنيفات</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.nameAr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="الترتيب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">الأحدث</SelectItem>
                <SelectItem value="price-low">السعر: من الأقل</SelectItem>
                <SelectItem value="price-high">السعر: من الأعلى</SelectItem>
                <SelectItem value="name">الاسم</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Products Grid */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-12 h-12 border-4 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">لا توجد منتجات</p>
              <Button className="mt-4" onClick={() => { setSelectedCategory("all"); setSearchQuery(""); }}>
                إعادة ضبط الفلاتر
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group cursor-pointer"
                  onClick={() => setSelectedProduct(product)}
                >
                  <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={product.mainImage}
                        alt={product.nameAr}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                        {product.isFeatured && (
                          <Badge className="bg-[var(--gold)] text-white">
                            <Star className="h-3 w-3 ml-1" />
                            مميز
                          </Badge>
                        )}
                        {product.originalPrice && product.originalPrice > product.price && (
                          <Badge className="bg-[var(--rose)] text-white">
                            -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                          </Badge>
                        )}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
                            onClick={(e) => {
                              e.stopPropagation();
                              openWhatsApp(`استفسار عن منتج: ${product.nameAr}`);
                            }}
                          >
                            <MessageCircle className="h-4 w-4 ml-1" />
                            استفسار
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="bg-white/90 hover:bg-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleWishlist({
                                productId: product.id,
                                name: product.name,
                                nameAr: product.nameAr,
                                price: product.price,
                                originalPrice: product.originalPrice,
                                image: product.mainImage,
                              });
                            }}
                          >
                            <Heart className={`h-4 w-4 ${isInWishlist(product.id) ? 'fill-[var(--rose)] text-[var(--rose)]' : ''}`} />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <p className="text-xs text-gray-500 mb-1">{product.category?.nameAr || "بدون تصنيف"}</p>
                      <h3 className="font-semibold text-sm md:text-base mb-2 line-clamp-2">{product.nameAr}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-[var(--gold-dark)]">
                          {product.price.toLocaleString()} ر.ي
                        </span>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-sm text-gray-400 line-through">
                            {product.originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
