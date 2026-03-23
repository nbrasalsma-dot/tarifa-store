"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Heart, MessageCircle } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CartPanel } from "@/components/cart/cart-panel";
import { CheckoutDialog } from "@/components/checkout/checkout-dialog";
import { AuthModals } from "@/components/auth/auth-modals";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useCart } from "@/contexts/cart-context";
import { useWishlist } from "@/contexts/wishlist-context";
import { toast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  image?: string;
  _count?: { products: number };
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
}

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
}

// WhatsApp number
const WHATSAPP_NUMBER = "967776080395";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'dashboard' | 'store'>('store');

  const { state: cartState, addItem: addToCart, isInCart, getItemQuantity, updateQuantity, removeItem, clearCart } = useCart();
  const { isInWishlist, toggleItem: toggleWishlist } = useWishlist();

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [categoriesRes, productsRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/products"),
        ]);

        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          setCategories(data.categories || []);
        }

        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(data.products || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.categoryId === selectedCategory)
    : products;

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
        onSuccess={() => {
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
                  <ShoppingCart className="h-5 w-5 ml-2" />
                  {isInCart(selectedProduct.id) ? "في السلة" : "أضف للسلة"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="flex-1 pt-20 md:pt-24 pb-8">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold mb-4">التصنيفات</h1>
            <p className="text-gray-500">تصفحي منتجاتنا حسب التصنيف</p>
          </motion.div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-12 h-12 border-4 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Category Filter */}
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  className={selectedCategory === null ? "bg-[var(--gold)] hover:bg-[var(--gold-dark)]" : ""}
                  onClick={() => setSelectedCategory(null)}
                >
                  الكل
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    className={selectedCategory === category.id ? "bg-[var(--gold)] hover:bg-[var(--gold-dark)]" : ""}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.nameAr}
                  </Button>
                ))}
              </div>

              {/* Categories Grid */}
              {!selectedCategory && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
                  {categories.map((category, index) => (
                    <motion.div
                      key={category.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -5 }}
                      className="cursor-pointer"
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow">
                        <div className="relative aspect-square">
                          <img
                            src={category.image || `https://images.unsplash.com/photo-1541643600914-78b084683601?w=400`}
                            alt={category.nameAr}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                            <h3 className="text-lg font-bold">{category.nameAr}</h3>
                            <p className="text-sm text-white/70">
                              {category._count?.products || 0} منتج
                            </p>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Products by Category */}
              {selectedCategory && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">
                      {categories.find((c) => c.id === selectedCategory)?.nameAr || "المنتجات"}
                    </h2>
                    <Button variant="ghost" onClick={() => setSelectedCategory(null)}>
                      عرض الكل
                    </Button>
                  </div>

                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">لا توجد منتجات في هذا التصنيف</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {filteredProducts.map((product) => (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ y: -5 }}
                          className="cursor-pointer"
                          onClick={() => setSelectedProduct(product)}
                        >
                          <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow">
                            <div className="relative aspect-square">
                              <img
                                src={product.mainImage}
                                alt={product.nameAr}
                                className="w-full h-full object-cover"
                              />
                              {product.originalPrice && product.originalPrice > product.price && (
                                <Badge className="absolute top-2 right-2 bg-[var(--rose)]">
                                  -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                                </Badge>
                              )}
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
                              <h3 className="font-semibold text-sm mb-2 line-clamp-2">{product.nameAr}</h3>
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
              )}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
