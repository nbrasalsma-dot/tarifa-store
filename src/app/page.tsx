"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  Heart,
  ChevronLeft,
  ChevronRight,
  Star,
  MessageCircle,
  User,
  Phone,
  Mail,
  MapPin,
  Instagram,
  Twitter,
  Facebook,
  LogOut,
  Plus,
  Minus,
  Check,
  Store,
  Sparkles,
  Gift,
  Truck,
  Shield,
  ArrowLeft,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import Link from "next/link";
import { toast } from "@/hooks/use-toast";

// Types
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
  description?: string;
  descriptionAr?: string;
  price: number;
  originalPrice?: number;
  mainImage: string;
  stock: number;
  isFeatured: boolean;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
    nameAr: string;
  };
}

interface Category {
  id: string;
  name: string;
  nameAr: string;
  image?: string;
  _count?: { products: number };
}

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

// WhatsApp number
const WHATSAPP_NUMBER = "967776080395";

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'dashboard' | 'store'>('dashboard');

  // Products and categories state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Cart and Wishlist
  const { state: cartState, addItem: addToCart, isInCart, getItemQuantity, updateQuantity, clearCart } = useCart();
  const { isInWishlist, toggleItem: toggleWishlist } = useWishlist();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  // Hero slides
  const heroSlides = [
    {
      title: "اكتشفي عالم الأناقة",
      subtitle: "تَرِفَة",
      description: "وجهتك الأولى للعطور والمكياج والأكسسوارات الفاخرة",
      image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200",
      cta: "تسوقي الآن",
    },
    {
      title: "عطور من كل العالم",
      subtitle: "رحلة حسية",
      description: "أرقى العطور الفرنسية والعالمية بأسعار حصرية",
      image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200",
      cta: "اكتشفي المزيد",
    },
    {
      title: "مكياج احترافي",
      subtitle: "جمالك أولويتنا",
      description: "منتجات مكياج عالمية بألوان تناسب كل بشرة",
      image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1200",
      cta: "تصفحي المجموعة",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const timeout = setTimeout(() => {
        setUser(JSON.parse(savedUser));
        setIsLoading(false);
      }, 0);
      return () => clearTimeout(timeout);
    }
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  // Fetch featured products and categories
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingProducts(true);
      try {
        const productsRes = await fetch("/api/products?isFeatured=true");
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData.products || []);
        }

        const categoriesRes = await fetch("/api/categories");
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData.categories || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchData();
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setViewMode('dashboard');
    window.location.reload();
  };

  const openAuth = (tab: "login" | "register") => {
    setAuthTab(tab);
    setIsAuthOpen(true);
  };

  const openWhatsApp = (message?: string) => {
    const url = message
      ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
      : `https://wa.me/${WHATSAPP_NUMBER}`;
    window.open(url, '_blank');
  };

  // Show loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FAF7F2] to-[#F5EFE6]">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 mx-auto mb-6"
          >
            <Sparkles className="w-full h-full text-[#C9A962]" />
          </motion.div>
          <h2 className="text-2xl font-bold text-[#8B7355] mb-2">تَرِفَة</h2>
          <p className="text-[#A69B8D]">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // For logged in users - show dashboard or store based on viewMode
  if (user && viewMode === 'dashboard') {
    if (user.role === "ADMIN") {
      return <AdminDashboard user={user} onLogout={handleLogout} onViewStore={() => setViewMode('store')} />;
    }
    if (user.role === "AGENT") {
      return <AgentDashboard user={user} onLogout={handleLogout} onViewStore={() => setViewMode('store')} />;
    }
    if (user.role === "CUSTOMER") {
      return (
        <>
          <CustomerDashboard user={user} onLogout={handleLogout} onViewStore={() => setViewMode('store')} />
          <ChatWidget userId={user.id} userName={user.name} userRole={user.role} />
        </>
      );
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#FAF7F2] to-[#F5EFE6]">
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
      <AuthModals isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} defaultTab={authTab} />

      {/* Cart Panel */}
      <CartPanel
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        user={user}
        onCheckout={() => {
          if (!user) {
            setIsCartOpen(false);
            setIsAuthOpen(true);
            setAuthTab("login");
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
        items={cartState.cart.items}
        userId={user?.id || ""}
        onSuccess={(orderId) => {
          setLastOrderId(orderId);
          clearCart();
        }}
      />

      {/* Main Content */}
      <main className="flex-1 pt-16 md:pt-20">
        {/* Hero Section */}
        <section className="relative h-[90vh] md:h-screen overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0"
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${heroSlides[currentSlide].image})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
              </div>

              <div className="relative h-full flex items-center justify-center text-center text-white px-4">
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                  className="max-w-4xl"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="inline-block mb-4"
                  >
                    <Sparkles className="h-8 w-8 text-[#C9A962]" />
                  </motion.div>

                  <motion.p
                    className="text-[#C9A962] text-xl md:text-3xl mb-3 font-light tracking-widest"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    {heroSlides[currentSlide].subtitle}
                  </motion.p>

                  <motion.h1
                    className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    {heroSlides[currentSlide].title}
                  </motion.h1>

                  <motion.p
                    className="text-lg md:text-xl text-gray-200 mb-10 max-w-2xl mx-auto"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                  >
                    {heroSlides[currentSlide].description}
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center"
                  >
                    <Link href="/products">
                      <Button
                        size="lg"
                        className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white px-10 py-7 text-lg rounded-full shadow-2xl hover:shadow-[#C9A962]/30 transition-all duration-300 group"
                      >
                        {heroSlides[currentSlide].cta}
                        <ArrowLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-2 border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white hover:text-[#8B7355] px-8 py-7 text-lg rounded-full transition-all duration-300"
                      onClick={() => openWhatsApp()}
                    >
                      <MessageCircle className="h-5 w-5 ml-2" />
                      تواصلي معنا
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Slide Navigation */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all duration-500 ${
                  index === currentSlide
                    ? "bg-[#C9A962] w-12"
                    : "bg-white/30 hover:bg-white/50 w-2"
                }`}
              />
            ))}
          </div>

          {/* Arrow Navigation */}
          <button
            onClick={prevSlide}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-[#C9A962]/80 backdrop-blur-sm p-4 rounded-full text-white transition-all duration-300 group"
          >
            <ChevronRight className="h-6 w-6 group-hover:scale-110 transition-transform" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-[#C9A962]/80 backdrop-blur-sm p-4 rounded-full text-white transition-all duration-300 group"
          >
            <ChevronLeft className="h-6 w-6 group-hover:scale-110 transition-transform" />
          </button>

          {/* Scroll Indicator */}
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/50"
          >
            <ChevronLeft className="h-6 w-6 rotate-90" />
          </motion.div>
        </section>

        {/* Categories Section */}
        <section className="py-20 md:py-28 bg-white">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span className="text-[#C9A962] text-sm tracking-[0.3em] uppercase mb-4 block">استكشفي</span>
              <h2 className="text-4xl md:text-5xl font-bold text-[#3D3021] mb-4">
                تصفحي الفئات
              </h2>
              <p className="text-[#8B7355] max-w-xl mx-auto text-lg">
                اكتشفي مجموعتنا المتنوعة من المنتجات الفاخرة المختارة بعناية
              </p>
            </motion.div>

            {categories.length > 0 ? (
              <motion.div
                variants={staggerContainer}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8"
              >
                {categories.map((category, index) => (
                  <Link key={category.id} href={`/products?category=${category.id}`}>
                    <motion.div
                      variants={fadeInUp}
                      whileHover={{ y: -10, scale: 1.02 }}
                      className="group relative aspect-[3/4] rounded-3xl overflow-hidden cursor-pointer shadow-xl hover:shadow-2xl transition-shadow duration-500"
                    >
                      <img
                        src={category.image || `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400`}
                        alt={category.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#3D3021]/90 via-[#3D3021]/30 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <h3 className="text-xl md:text-2xl font-bold mb-1">{category.nameAr || category.name}</h3>
                        <p className="text-white/70 text-sm flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          {category._count?.products || 0} منتج
                        </p>
                      </div>
                      <div className="absolute inset-0 border-2 border-[#C9A962] opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
                    </motion.div>
                  </Link>
                ))}
              </motion.div>
            ) : (
              <div className="text-center py-12">
                <p className="text-[#8B7355]">لا توجد فئات حالياً</p>
              </div>
            )}
          </div>
        </section>

        {/* Products Section */}
        <section className="py-20 md:py-28 bg-gradient-to-b from-[#FAF7F2] to-white">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span className="text-[#C9A962] text-sm tracking-[0.3em] uppercase mb-4 block">مميزة</span>
              <h2 className="text-4xl md:text-5xl font-bold text-[#3D3021] mb-4">
                المنتجات المميزة
              </h2>
              <p className="text-[#8B7355] max-w-xl mx-auto text-lg">
                اكتشفي أبرز منتجاتنا المختارة بعناية فائقة
              </p>
            </motion.div>

            {isLoadingProducts ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden border-0 shadow-lg">
                    <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" />
                    <CardContent className="p-4 space-y-3">
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3" />
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <Sparkles className="h-16 w-16 mx-auto text-[#C9A962]/50 mb-4" />
                <p className="text-[#8B7355] text-lg">لا توجد منتجات مميزة حالياً</p>
              </div>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8"
              >
                {products.map((product, index) => (
                  <motion.div
                    key={product.id}
                    variants={fadeInUp}
                    whileHover={{ y: -10 }}
                    className="group cursor-pointer"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <Card className="overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white rounded-2xl">
                      <div className="relative aspect-square overflow-hidden">
                        <img
                          src={product.mainImage}
                          alt={product.nameAr}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute top-3 right-3 flex flex-col gap-2">
                          {product.isFeatured && (
                            <Badge className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] text-white border-0 px-3 py-1 rounded-full">
                              <Star className="h-3 w-3 ml-1" />
                              مميز
                            </Badge>
                          )}
                          {product.originalPrice && product.originalPrice > product.price && (
                            <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white border-0 px-3 py-1 rounded-full">
                              -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                            </Badge>
                          )}
                        </div>

                        {/* Quick Actions */}
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white rounded-full"
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
                              className="bg-white/90 hover:bg-white rounded-full"
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
                                toast({
                                  title: isInWishlist(product.id) ? "تمت الإزالة" : "تمت الإضافة",
                                  description: isInWishlist(product.id) ? "تم إزالة المنتج من المفضلة" : "تم إضافة المنتج للمفضلة",
                                });
                              }}
                            >
                              <Heart className={`h-4 w-4 ${isInWishlist(product.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-5">
                        <p className="text-xs text-[#C9A962] font-medium mb-2 uppercase tracking-wider">
                          {product.category?.nameAr || "بدون تصنيف"}
                        </p>
                        <h3 className="font-semibold text-[#3D3021] text-base mb-3 line-clamp-2 min-h-[48px]">
                          {product.nameAr}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-[#8B7355]">
                            {product.price.toLocaleString()} ر.ي
                          </span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="text-sm text-[#A69B8D] line-through">
                              {product.originalPrice.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}

            <div className="text-center mt-16">
              <Link href="/products">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-[#C9A962] text-[#8B7355] hover:bg-[#C9A962] hover:text-white px-12 py-7 text-lg rounded-full transition-all duration-300 group"
                >
                  عرض جميع المنتجات
                  <ArrowLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 md:py-28 bg-gradient-to-b from-[#3D3021] to-[#2A2318] text-white">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span className="text-[#C9A962] text-sm tracking-[0.3em] uppercase mb-4 block">لماذا نحن</span>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                لماذا تَرِفَة؟
              </h2>
              <p className="text-white/60 max-w-xl mx-auto text-lg">
                نقدم لكِ تجربة تسوق فريدة ومميزة
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: Sparkles,
                  title: "منتجات أصلية 100%",
                  description: "جميع منتجاتنا أصلية مع ضمان الجودة والأصالة"
                },
                {
                  icon: Truck,
                  title: "توصيل لجميع المحافظات",
                  description: "توصيل سريع وآمن لجميع محافظات الجمهورية اليمنية"
                },
                {
                  icon: Shield,
                  title: "دفع آمن وموثوق",
                  description: "طرق دفع متعددة وآمنة تناسب الجميع"
                }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                  className="text-center p-10 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-[#C9A962]/50 transition-all duration-300 group"
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#C9A962] to-[#B8956E] flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-white/60">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-[#C9A962] via-[#B8956E] to-[#C9A962]">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Gift className="h-12 w-12 text-white mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                انضمي إلى عائلة تَرِفَة
              </h2>
              <p className="text-white/80 max-w-xl mx-auto mb-8 text-lg">
                سجلي الآن واحصلي على خصم 10% على أول طلب لكِ
              </p>
              <Button
                size="lg"
                className="bg-white text-[#8B7355] hover:bg-[#FAF7F2] px-12 py-7 text-lg rounded-full shadow-xl transition-all duration-300"
                onClick={() => {
                  setAuthTab("register");
                  setIsAuthOpen(true);
                }}
              >
                إنشاء حساب جديد
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl">
          {selectedProduct && (
            <div className="grid md:grid-cols-2 gap-8 p-4">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#FAF7F2]">
                <img
                  src={selectedProduct.mainImage}
                  alt={selectedProduct.nameAr}
                  className="w-full h-full object-cover"
                />
                {selectedProduct.originalPrice && selectedProduct.originalPrice > selectedProduct.price && (
                  <Badge className="absolute top-4 right-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-lg px-4 py-2 rounded-full">
                    خصم {Math.round((1 - selectedProduct.price / selectedProduct.originalPrice) * 100)}%
                  </Badge>
                )}
              </div>

              <div className="flex flex-col gap-5">
                <div>
                  <p className="text-sm text-[#C9A962] font-medium mb-2 uppercase tracking-wider">
                    {selectedProduct.category?.nameAr || "بدون تصنيف"}
                  </p>
                  <h2 className="text-3xl font-bold text-[#3D3021]">{selectedProduct.nameAr}</h2>
                  <p className="text-sm text-[#8B7355] mt-1">{selectedProduct.name}</p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-4xl font-bold text-[#8B7355]">
                    {selectedProduct.price.toLocaleString()} ر.ي
                  </span>
                  {selectedProduct.originalPrice && selectedProduct.originalPrice > selectedProduct.price && (
                    <span className="text-xl text-[#A69B8D] line-through">
                      {selectedProduct.originalPrice.toLocaleString()} ر.ي
                    </span>
                  )}
                </div>

                {selectedProduct.descriptionAr && (
                  <p className="text-[#5D5D5D] leading-relaxed">
                    {selectedProduct.descriptionAr}
                  </p>
                )}

                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${selectedProduct.stock > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  <span className="text-[#5D5D5D]">
                    {selectedProduct.stock > 0 ? `متوفر (${selectedProduct.stock} قطعة)` : "غير متوفر حالياً"}
                  </span>
                </div>

                {isInCart(selectedProduct.id) && (
                  <div className="flex items-center gap-4 p-4 bg-[#FAF7F2] rounded-xl">
                    <span className="font-medium text-[#3D3021]">الكمية:</span>
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 w-10 p-0 rounded-full border-[#C9A962]"
                        onClick={() => updateQuantity(selectedProduct.id, getItemQuantity(selectedProduct.id) - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-10 text-center font-bold text-lg">{getItemQuantity(selectedProduct.id)}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 w-10 p-0 rounded-full border-[#C9A962]"
                        onClick={() => updateQuantity(selectedProduct.id, getItemQuantity(selectedProduct.id) + 1)}
                        disabled={getItemQuantity(selectedProduct.id) >= selectedProduct.stock}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-4 mt-4">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white py-7 rounded-full text-lg"
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
                        toast({
                          title: "تمت الإضافة",
                          description: "تم إضافة المنتج للسلة",
                        });
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

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className={`flex-1 py-6 rounded-full ${isInWishlist(selectedProduct.id) ? 'border-rose-400 text-rose-500 hover:bg-rose-50' : 'border-[#C9A962] text-[#8B7355] hover:bg-[#FAF7F2]'}`}
                      onClick={() => {
                        toggleWishlist({
                          productId: selectedProduct.id,
                          name: selectedProduct.name,
                          nameAr: selectedProduct.nameAr,
                          price: selectedProduct.price,
                          originalPrice: selectedProduct.originalPrice,
                          image: selectedProduct.mainImage,
                        });
                        toast({
                          title: isInWishlist(selectedProduct.id) ? "تمت الإزالة" : "تمت الإضافة",
                          description: isInWishlist(selectedProduct.id) ? "تم إزالة المنتج من المفضلة" : "تم إضافة المنتج للمفضلة",
                        });
                      }}
                    >
                      <Heart className={`h-5 w-5 ml-2 ${isInWishlist(selectedProduct.id) ? 'fill-rose-500' : ''}`} />
                      {isInWishlist(selectedProduct.id) ? 'في المفضلة' : 'أضف للمفضلة'}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 py-6 rounded-full border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10"
                      onClick={() => openWhatsApp(`استفسار عن منتج: ${selectedProduct.nameAr} - السعر: ${selectedProduct.price} ر.ي`)}
                    >
                      <MessageCircle className="h-5 w-5 ml-2" />
                      استفسار واتساب
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <Footer />

      {/* Chat Widget for logged in users */}
      {user && (
        <ChatWidget userId={user.id} userName={user.name} userRole={user.role} />
      )}
    </div>
  );
}
