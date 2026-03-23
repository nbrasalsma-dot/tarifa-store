"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  ShoppingCart, 
  Heart, 
  Search, 
  Menu, 
  X, 
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
  Loader2,
  Plus,
  Minus,
  Check,
  Home,
  Store,
  Settings
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { AuthModals } from "@/components/auth/auth-modals";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AgentDashboard } from "@/components/agent/agent-dashboard";
import { CustomerDashboard } from "@/components/customer/customer-dashboard";
import { CartPanel } from "@/components/cart/cart-panel";
import { CheckoutDialog } from "@/components/checkout/checkout-dialog";
import { ChatWidget } from "@/components/chat/chat-widget";
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

// لا نستخدم فئات افتراضية - نجلبها من قاعدة البيانات

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
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // View mode: 'dashboard' or 'store' for logged in users
  const [viewMode, setViewMode] = useState<'dashboard' | 'store'>('dashboard');

  // Products and categories state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Cart and Wishlist
  const { state: cartState, addItem: addToCart, isInCart, getItemQuantity, updateQuantity, removeItem, clearCart } = useCart();
  const { state: wishlistState, isInWishlist, toggleItem: toggleWishlist } = useWishlist();
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
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  useEffect(() => {
    // Check if user is logged in - use setTimeout to avoid synchronous setState
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
        // جلب المنتجات المميزة فقط للصفحة الرئيسية
        const productsRes = await fetch("/api/products?isFeatured=true");
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData.products || []);
        }

        // جلب الفئات من قاعدة البيانات
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

  // Open WhatsApp
  const openWhatsApp = (message?: string) => {
    const url = message 
      ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
      : `https://wa.me/${WHATSAPP_NUMBER}`;
    window.open(url, '_blank');
  };

  // Show loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[var(--gold)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--muted-foreground)]">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // For logged in users - show dashboard or store based on viewMode
  if (user) {
    // If user wants to see the store
    if (viewMode === 'store') {
      return (
        <div className="min-h-screen flex flex-col bg-background">
          {/* Header with back to dashboard button */}
          <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-lg">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between h-16 md:h-20">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                  <img 
                    src="/logo-transparent.jpg" 
                    alt="تَرِفَة" 
                    className="h-10 md:h-12 w-auto object-contain"
                  />
                </Link>

                {/* Navigation */}
                <nav className="hidden md:flex items-center gap-6">
                  <Link href="/" className="font-medium hover:text-[var(--gold)] transition-colors">الرئيسية</Link>
                  <Link href="/products" className="font-medium hover:text-[var(--gold)] transition-colors">المنتجات</Link>
                  <Link href="/categories" className="font-medium hover:text-[var(--gold)] transition-colors">الفئات</Link>
                  <Link href="/about" className="font-medium hover:text-[var(--gold)] transition-colors">عن المتجر</Link>
                  <Link href="/contact" className="font-medium hover:text-[var(--gold)] transition-colors">تواصلي معنا</Link>
                </nav>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  {/* Cart */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative"
                    onClick={() => setIsCartOpen(true)}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {cartState.itemCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-[var(--gold)]">
                        {cartState.itemCount}
                      </Badge>
                    )}
                  </Button>

                  {/* Wishlist */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative"
                  >
                    <Heart className="h-5 w-5" />
                    {wishlistState.itemCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-[var(--rose)]">
                        {wishlistState.itemCount}
                      </Badge>
                    )}
                  </Button>

                  {/* User Menu */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode('dashboard')}
                      className="gap-2"
                    >
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">حسابي</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Cart Panel */}
          <CartPanel
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            items={cartState.items}
            updateQuantity={updateQuantity}
            removeItem={removeItem}
            clearCart={clearCart}
            onCheckout={() => {
              setIsCartOpen(false);
              setIsCheckoutOpen(true);
            }}
          />

          {/* Checkout Dialog */}
          <CheckoutDialog
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
            items={cartState.items}
            userId={user.id}
            onSuccess={(orderId) => {
              setLastOrderId(orderId);
              clearCart();
            }}
          />

          {/* Main Content - Store View */}
          <main className="flex-1 pt-20">
            {/* Hero Section */}
            <section className="relative h-[85vh] md:h-screen overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7 }}
                  className="absolute inset-0"
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${heroSlides[currentSlide].image})` }}
                  >
                    <div className="absolute inset-0 bg-black/40" />
                  </div>

                  <div className="relative h-full flex items-center justify-center text-center text-white px-4">
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.7 }}
                      className="max-w-3xl"
                    >
                      <motion.p
                        className="text-[var(--gold-light)] text-lg md:text-2xl mb-2"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        {heroSlides[currentSlide].subtitle}
                      </motion.p>
                      <motion.h1
                        className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                      >
                        {heroSlides[currentSlide].title}
                      </motion.h1>
                      <motion.p
                        className="text-lg md:text-xl text-gray-200 mb-8"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9 }}
                      >
                        {heroSlides[currentSlide].description}
                      </motion.p>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.1 }}
                      >
                        <Link href="/products">
                          <Button
                            size="lg"
                            className="bg-gradient-to-r from-[var(--gold-light)] to-[var(--gold)] hover:from-[var(--gold)] hover:to-[var(--gold-dark)] text-white px-8 py-6 text-lg rounded-full shadow-2xl hover:shadow-[var(--gold)]/25 transition-all duration-300"
                          >
                            {heroSlides[currentSlide].cta}
                            <ChevronLeft className="mr-2 h-5 w-5" />
                          </Button>
                        </Link>
                      </motion.div>
                    </motion.div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Slide Navigation */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
                {heroSlides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === currentSlide 
                        ? "bg-[var(--gold)] w-8" 
                        : "bg-white/50 hover:bg-white"
                    }`}
                  />
                ))}
              </div>

              {/* Arrow Navigation */}
              <button
                onClick={prevSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm p-3 rounded-full text-white transition-all"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm p-3 rounded-full text-white transition-all"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            </section>

            {/* Categories Section */}
            <section className="py-16 md:py-24 bg-gradient-to-b from-background to-[var(--muted)]">
              <div className="container mx-auto px-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center mb-12"
                >
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    تصفحي الفئات
                  </h2>
                  <p className="text-[var(--muted-foreground)] max-w-2xl mx-auto">
                    اكتشفي مجموعتنا المتنوعة من المنتجات الفاخرة
                  </p>
                </motion.div>

                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  whileInView="animate"
                  viewport={{ once: true }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
                >
                  {categories.map((category) => (
                    <Link key={category.id} href={`/products?category=${category.id}`}>
                      <motion.div
                        variants={fadeInUp}
                        whileHover={{ scale: 1.02, y: -5 }}
                        className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer shadow-lg"
                      >
                        <img
                          src={category.image || `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400`}
                          alt={category.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                          <h3 className="text-white text-lg md:text-xl font-bold mb-1">{category.nameAr || category.name}</h3>
                          <p className="text-white/70 text-sm">{category._count?.products || 0} منتج</p>
                        </div>
                        <div className="absolute inset-0 border-4 border-[var(--gold)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                      </motion.div>
                    </Link>
                  ))}
                </motion.div>
              </div>
            </section>

            {/* Products Section */}
            <section className="py-16 md:py-24 bg-background">
              <div className="container mx-auto px-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center mb-12"
                >
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    المنتجات المميزة
                  </h2>
                  <p className="text-[var(--muted-foreground)] max-w-2xl mx-auto">
                    اكتشفي أبرز منتجاتنا المختارة بعناية
                  </p>
                </motion.div>

                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  whileInView="animate"
                  viewport={{ once: true }}
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
                >
                  {isLoadingProducts ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <Card key={i} className="overflow-hidden border-0 shadow-lg">
                        <div className="aspect-square bg-gray-200 animate-pulse" />
                        <CardContent className="p-4 space-y-2">
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3" />
                          <div className="h-4 bg-gray-200 rounded animate-pulse" />
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
                        </CardContent>
                      </Card>
                    ))
                  ) : products.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <p className="text-[var(--muted-foreground)]">لا توجد منتجات حالياً</p>
                    </div>
                  ) : (
                    products.map((product) => (
                      <motion.div
                        key={product.id}
                        variants={fadeInUp}
                        whileHover={{ y: -10 }}
                        className="group cursor-pointer"
                        onClick={() => setSelectedProduct(product)}
                      >
                        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                          <div className="relative aspect-square overflow-hidden">
                            <img
                              src={product.mainImage}
                              alt={product.nameAr}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute top-2 right-2 flex flex-col gap-1">
                              {product.isFeatured && (
                                <Badge className="bg-[var(--gold)] text-white">مميز</Badge>
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
                            <p className="text-xs text-[var(--muted-foreground)] mb-1">
                              {product.category?.nameAr || "بدون تصنيف"}
                            </p>
                            <h3 className="font-semibold text-sm md:text-base mb-2 line-clamp-2">{product.nameAr}</h3>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-[var(--gold-dark)]">
                                {product.price.toLocaleString()} ر.ي
                              </span>
                              {product.originalPrice && product.originalPrice > product.price && (
                                <span className="text-sm text-[var(--muted-foreground)] line-through">
                                  {product.originalPrice.toLocaleString()} ر.ي
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </motion.div>

                <div className="text-center mt-12">
                  <Link href="/products">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-[var(--gold)] text-[var(--gold-dark)] hover:bg-[var(--gold)] hover:text-white px-8"
                    >
                      عرض جميع المنتجات
                      <ChevronLeft className="mr-2 h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </section>

            {/* Features Section */}
            <section className="py-16 md:py-24 bg-gradient-to-b from-[var(--muted)] to-background">
              <div className="container mx-auto px-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center mb-12"
                >
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    لماذا تَرِفَة؟
                  </h2>
                  <p className="text-[var(--muted-foreground)] max-w-2xl mx-auto">
                    نقدم لكِ تجربة تسوق فريدة ومميزة
                  </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    {
                      icon: "✨",
                      title: "منتجات أصلية",
                      description: "جميع منتجاتنا أصلية 100% مع ضمان الجودة"
                    },
                    {
                      icon: "🚚",
                      title: "توصيل سريع",
                      description: "توصيل لجميع محافظات الجمهورية اليمنية"
                    },
                    {
                      icon: "💬",
                      title: "دعم متواصل",
                      description: "فريق خدمة عملاء متاح للرد على استفساراتك"
                    }
                  ].map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.2 }}
                      className="text-center p-8 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-shadow"
                    >
                      <div className="text-5xl mb-4">{feature.icon}</div>
                      <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                      <p className="text-[var(--muted-foreground)]">{feature.description}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          </main>

          {/* Footer */}
          <footer className="bg-[#1A1A1A] text-white py-16">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                <div className="md:col-span-1">
                  <img 
                    src="/logo-transparent.jpg" 
                    alt="تَرِفَة" 
                    className="h-16 w-auto object-contain mb-4"
                  />
                  <p className="text-gray-400 mb-6">
                    وجهتك الأولى للأكسسوارات وأدوات التجميل والعطور الفاخرة في اليمن
                  </p>
                  <div className="flex gap-4">
                    <a href="https://www.instagram.com/tarifa.store.ye?utm_source=qr&igsh=aXYxczJtcGVoM3lp" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 hover:bg-[var(--gold)] flex items-center justify-center transition-colors">
                      <Instagram className="h-5 w-5" />
                    </a>
                    <a href="#" className="w-10 h-10 rounded-full bg-white/10 hover:bg-[var(--gold)] flex items-center justify-center transition-colors">
                      <Twitter className="h-5 w-5" />
                    </a>
                    <a href="#" className="w-10 h-10 rounded-full bg-white/10 hover:bg-[var(--gold)] flex items-center justify-center transition-colors">
                      <Facebook className="h-5 w-5" />
                    </a>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-4">روابط سريعة</h3>
                  <ul className="space-y-2 text-gray-400">
                    <li><Link href="/" className="hover:text-[var(--gold)] transition-colors">الرئيسية</Link></li>
                    <li><Link href="/products" className="hover:text-[var(--gold)] transition-colors">المنتجات</Link></li>
                    <li><Link href="/categories" className="hover:text-[var(--gold)] transition-colors">الفئات</Link></li>
                    <li><Link href="/about" className="hover:text-[var(--gold)] transition-colors">عن المتجر</Link></li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-4">خدمة العملاء</h3>
                  <ul className="space-y-2 text-gray-400">
                    <li><Link href="/contact" className="hover:text-[var(--gold)] transition-colors">تواصلي معنا</Link></li>
                    <li><span className="hover:text-[var(--gold)] transition-colors cursor-pointer">خدمات التوصيل</span></li>
                    <li><span className="hover:text-[var(--gold)] transition-colors cursor-pointer">الأسئلة الشائعة</span></li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-4">تواصلي معنا</h3>
                  <ul className="space-y-3 text-gray-400">
                    <li className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--gold)] transition-colors">
                        +967 776 080 395
                      </a>
                    </li>
                    <li className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>tarifa.store.ye@gmail.com</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>صنعاء، الجمهورية اليمنية</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
                <p>© 2026 تَرِفَة. جميع الحقوق محفوظة.</p>
              </div>
            </div>
          </footer>

          {/* Product Detail Dialog */}
          <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              {selectedProduct && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={selectedProduct.mainImage}
                      alt={selectedProduct.nameAr}
                      className="w-full h-full object-cover"
                    />
                    {selectedProduct.originalPrice && selectedProduct.originalPrice > selectedProduct.price && (
                      <Badge className="absolute top-4 right-4 bg-[var(--rose)] text-white text-lg px-3 py-1">
                        خصم {Math.round((1 - selectedProduct.price / selectedProduct.originalPrice) * 100)}%
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="text-sm text-[var(--muted-foreground)] mb-1">
                        {selectedProduct.category?.nameAr || "بدون تصنيف"}
                      </p>
                      <h2 className="text-2xl font-bold">{selectedProduct.nameAr}</h2>
                      <p className="text-sm text-gray-500">{selectedProduct.name}</p>
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

                    {selectedProduct.descriptionAr && (
                      <p className="text-gray-600 leading-relaxed">
                        {selectedProduct.descriptionAr}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${selectedProduct.stock > 0 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      <span className="text-sm">
                        {selectedProduct.stock > 0 ? `متوفر (${selectedProduct.stock} قطعة)` : "غير متوفر حالياً"}
                      </span>
                    </div>

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

                    <div className="flex flex-col gap-3 mt-4">
                      <Button
                        size="lg"
                        className="bg-gradient-to-r from-[var(--gold-light)] to-[var(--gold)] hover:from-[var(--gold)] hover:to-[var(--gold-dark)] text-white"
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
                          className={`flex-1 ${isInWishlist(selectedProduct.id) ? 'border-[var(--rose)] text-[var(--rose)]' : 'border-[var(--gold)] text-[var(--gold-dark)]'}`}
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
                          <Heart className={`h-4 w-4 ml-2 ${isInWishlist(selectedProduct.id) ? 'fill-[var(--rose)]' : ''}`} />
                          {isInWishlist(selectedProduct.id) ? 'في المفضلة' : 'أضف للمفضلة'}
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => openWhatsApp(`استفسار عن منتج: ${selectedProduct.nameAr} - السعر: ${selectedProduct.price} ر.ي`)}
                        >
                          <MessageCircle className="h-4 w-4 ml-2" />
                          استفسار
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Floating WhatsApp Button */}
          <button
            onClick={() => openWhatsApp()}
            className="fixed bottom-6 left-6 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg z-50 transition-all hover:scale-110"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </button>
        </div>
      );
    }

    // Show dashboard based on role
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
          <ChatWidget 
            userId={user.id} 
            userName={user.name} 
            userRole={user.role} 
          />
        </>
      );
    }
  }

  // Show regular store for non-logged in users
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? "bg-white/95 backdrop-blur-md shadow-lg" 
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <nav className="flex flex-col gap-4 mt-8">
                  <Link href="/" className="text-lg font-semibold hover:text-[var(--gold)] transition-colors">الرئيسية</Link>
                  <Link href="/products" className="text-lg font-semibold hover:text-[var(--gold)] transition-colors">المنتجات</Link>
                  <Link href="/categories" className="text-lg font-semibold hover:text-[var(--gold)] transition-colors">الفئات</Link>
                  <Link href="/about" className="text-lg font-semibold hover:text-[var(--gold)] transition-colors">عن المتجر</Link>
                  <Link href="/contact" className="text-lg font-semibold hover:text-[var(--gold)] transition-colors">تواصلي معنا</Link>
                  <hr className="my-4" />
                  <Button 
                    onClick={() => openAuth("login")}
                    className="w-full bg-gradient-to-r from-[var(--gold-light)] to-[var(--gold)] hover:from-[var(--gold)] hover:to-[var(--gold-dark)] text-white"
                  >
                    تسجيل الدخول
                  </Button>
                  <Button 
                    onClick={() => openAuth("register")}
                    variant="outline"
                    className="w-full border-[var(--gold)] text-[var(--gold-dark)]"
                  >
                    إنشاء حساب
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="relative"
              >
                <img 
                  src="/logo-transparent.jpg" 
                  alt="تَرِفَة" 
                  className="h-10 md:h-12 w-auto object-contain"
                />
              </motion.div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/" className="font-medium hover:text-[var(--gold)] transition-colors">الرئيسية</Link>
              <Link href="/products" className="font-medium hover:text-[var(--gold)] transition-colors">المنتجات</Link>
              <Link href="/categories" className="font-medium hover:text-[var(--gold)] transition-colors">الفئات</Link>
              <Link href="/about" className="font-medium hover:text-[var(--gold)] transition-colors">عن المتجر</Link>
              <Link href="/contact" className="font-medium hover:text-[var(--gold)] transition-colors">تواصلي معنا</Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Search */}
              <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Search className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                  <div className="flex gap-2">
                    <Input
                      placeholder="ابحثي عن منتجات..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1"
                    />
                    <Link href={`/products?search=${encodeURIComponent(searchQuery)}`}>
                      <Button className="bg-[var(--gold)] hover:bg-[var(--gold-dark)]">
                        <Search className="h-5 w-5" />
                      </Button>
                    </Link>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Wishlist */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative"
                onClick={() => toast({ title: "قائمة الأمنيات", description: "سجلي دخولك لرؤية قائمة أمنياتك" })}
              >
                <Heart className="h-5 w-5" />
              </Button>

              {/* Cart */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative"
                onClick={() => setIsCartOpen(true)}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartState.itemCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-[var(--gold)]">
                    {cartState.itemCount}
                  </Badge>
                )}
              </Button>

              {/* User */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="hidden md:flex"
                onClick={() => openAuth("login")}
              >
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Auth Modals */}
      <AuthModals 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        defaultTab={authTab}
      />

      {/* Cart Panel */}
      <CartPanel
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartState.items}
        updateQuantity={updateQuantity}
        removeItem={removeItem}
        clearCart={clearCart}
        onCheckout={() => {
          setIsCartOpen(false);
          toast({ title: "تسجيل الدخول مطلوب", description: "يجب تسجيل الدخول لإتمام الطلب" });
          openAuth("login");
        }}
      />

      {/* Hero Section */}
      <section className="relative h-[85vh] md:h-screen overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="absolute inset-0"
          >
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${heroSlides[currentSlide].image})` }}
            >
              <div className="absolute inset-0 bg-black/40" />
            </div>

            {/* Content */}
            <div className="relative h-full flex items-center justify-center text-center text-white px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.7 }}
                className="max-w-3xl"
              >
                <motion.p
                  className="text-[var(--gold-light)] text-lg md:text-2xl mb-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  {heroSlides[currentSlide].subtitle}
                </motion.p>
                <motion.h1
                  className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  {heroSlides[currentSlide].title}
                </motion.h1>
                <motion.p
                  className="text-lg md:text-xl text-gray-200 mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                >
                  {heroSlides[currentSlide].description}
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 }}
                >
                  <Link href="/products">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-[var(--gold-light)] to-[var(--gold)] hover:from-[var(--gold)] hover:to-[var(--gold-dark)] text-white px-8 py-6 text-lg rounded-full shadow-2xl hover:shadow-[var(--gold)]/25 transition-all duration-300"
                    >
                      {heroSlides[currentSlide].cta}
                      <ChevronLeft className="mr-2 h-5 w-5" />
                    </Button>
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Slide Navigation */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? "bg-[var(--gold)] w-8" 
                  : "bg-white/50 hover:bg-white"
              }`}
            />
          ))}
        </div>

        {/* Arrow Navigation */}
        <button
          onClick={prevSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm p-3 rounded-full text-white transition-all"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm p-3 rounded-full text-white transition-all"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      </section>

      {/* Categories Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-background to-[var(--muted)]">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              تصفحي الفئات
            </h2>
            <p className="text-[var(--muted-foreground)] max-w-2xl mx-auto">
              اكتشفي مجموعتنا المتنوعة من المنتجات الفاخرة
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
          >
            {categories.map((category) => (
              <Link key={category.id} href={`/products?category=${category.id}`}>
                <motion.div
                  variants={fadeInUp}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer shadow-lg"
                >
                  <img
                    src={category.image || `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400`}
                    alt={category.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                    <h3 className="text-white text-lg md:text-xl font-bold mb-1">{category.nameAr || category.name}</h3>
                    <p className="text-white/70 text-sm">{category._count?.products || 0} منتج</p>
                  </div>
                  <div className="absolute inset-0 border-4 border-[var(--gold)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                </motion.div>
              </Link>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              منتجاتنا
            </h2>
            <p className="text-[var(--muted-foreground)] max-w-2xl mx-auto">
              اكتشفي أحدث المنتجات وأكثرها مبيعاً
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
          >
            {isLoadingProducts ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="overflow-hidden border-0 shadow-lg">
                  <div className="aspect-square bg-gray-200 animate-pulse" />
                  <CardContent className="p-4 space-y-2">
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
                  </CardContent>
                </Card>
              ))
            ) : products.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-[var(--muted-foreground)]">لا توجد منتجات حالياً</p>
              </div>
            ) : (
              products.slice(0, 8).map((product) => (
                <motion.div
                  key={product.id}
                  variants={fadeInUp}
                  whileHover={{ y: -10 }}
                  className="group cursor-pointer"
                  onClick={() => setSelectedProduct(product)}
                >
                  <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={product.mainImage}
                        alt={product.nameAr}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      {/* Badges */}
                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                        {product.isFeatured && (
                          <Badge className="bg-[var(--gold)] text-white">مميز</Badge>
                        )}
                        {product.originalPrice && product.originalPrice > product.price && (
                          <Badge className="bg-[var(--rose)] text-white">
                            -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                          </Badge>
                        )}
                      </div>
                      {/* Quick Actions */}
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
                          <Button size="sm" variant="ghost" className="bg-white/90 hover:bg-white">
                            <Heart className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <p className="text-xs text-[var(--muted-foreground)] mb-1">
                        {product.category?.nameAr || "بدون تصنيف"}
                      </p>
                      <h3 className="font-semibold text-sm md:text-base mb-2 line-clamp-2">{product.nameAr}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-[var(--gold-dark)]">
                          {product.price.toLocaleString()} ر.ي
                        </span>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-sm text-[var(--muted-foreground)] line-through">
                            {product.originalPrice.toLocaleString()} ر.ي
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </motion.div>

          <div className="text-center mt-12">
            <Link href="/products">
              <Button
                size="lg"
                variant="outline"
                className="border-[var(--gold)] text-[var(--gold-dark)] hover:bg-[var(--gold)] hover:text-white px-8"
              >
                عرض جميع المنتجات
                <ChevronLeft className="mr-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-[var(--muted)] to-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              لماذا تَرِفَة؟
            </h2>
            <p className="text-[var(--muted-foreground)] max-w-2xl mx-auto">
              نقدم لكِ تجربة تسوق فريدة ومميزة
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "✨",
                title: "منتجات أصلية",
                description: "جميع منتجاتنا أصلية 100% مع ضمان الجودة"
              },
              {
                icon: "🚚",
                title: "توصيل سريع",
                description: "توصيل لجميع محافظات الجمهورية اليمنية"
              },
              {
                icon: "💬",
                title: "دعم متواصل",
                description: "فريق خدمة عملاء متاح للرد على استفساراتك"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="text-center p-8 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-[var(--muted-foreground)]">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section for Non-logged Users */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)]">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center text-white"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              انضمي إلينا اليوم
            </h2>
            <p className="text-white/80 max-w-xl mx-auto mb-8">
              سجلي حسابك الآن واستمتعي بتجربة تسوق مميزة وعروض حصرية
            </p>
            <Button
              size="lg"
              onClick={() => openAuth("register")}
              className="bg-white text-[var(--gold-dark)] hover:bg-white/90 px-8 py-6 text-lg rounded-full"
            >
              إنشاء حساب جديد
              <ChevronLeft className="mr-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 md:py-24 bg-[var(--muted)]">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              اشتركي في نشرتنا البريدية
            </h2>
            <p className="text-[var(--muted-foreground)] max-w-xl mx-auto mb-8">
              احصلي على آخر العروض والمنتجات الجديدة مباشرة في بريدك
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                placeholder="أدخلي بريدك الإلكتروني"
                className="border-[var(--gold)]/30 focus:border-[var(--gold)] flex-1"
              />
              <Button className="bg-[var(--gold)] hover:bg-[var(--gold-dark)] text-white">
                اشتراك
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1A1A1A] text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            {/* Logo & Description */}
            <div className="md:col-span-1">
              <img 
                src="/logo-transparent.jpg" 
                alt="تَرِفَة" 
                className="h-16 w-auto object-contain mb-4"
              />
              <p className="text-gray-400 mb-6">
                وجهتك الأولى للأكسسوارات وأدوات التجميل والعطور الفاخرة في اليمن
              </p>
              <div className="flex gap-4">
                <a href="https://www.instagram.com/tarifa.store.ye" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 hover:bg-[var(--gold)] flex items-center justify-center transition-colors">
                  <Instagram className="h-5 w-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/10 hover:bg-[var(--gold)] flex items-center justify-center transition-colors">
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/10 hover:bg-[var(--gold)] flex items-center justify-center transition-colors">
                  <Facebook className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-bold mb-4">روابط سريعة</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/" className="hover:text-[var(--gold)] transition-colors">الرئيسية</Link></li>
                <li><Link href="/products" className="hover:text-[var(--gold)] transition-colors">المنتجات</Link></li>
                <li><Link href="/categories" className="hover:text-[var(--gold)] transition-colors">الفئات</Link></li>
                <li><Link href="/about" className="hover:text-[var(--gold)] transition-colors">عن المتجر</Link></li>
              </ul>
            </div>

            {/* Customer Service */}
            <div>
              <h3 className="text-lg font-bold mb-4">خدمة العملاء</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/contact" className="hover:text-[var(--gold)] transition-colors">تواصلي معنا</Link></li>
                <li><span className="hover:text-[var(--gold)] transition-colors cursor-pointer">خدمات التوصيل</span></li>
                <li><span className="hover:text-[var(--gold)] transition-colors cursor-pointer">الأسئلة الشائعة</span></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-lg font-bold mb-4">تواصلي معنا</h3>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--gold)] transition-colors">
                    +967 776 080 395
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>info@tarifa.com</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>صنعاء، الجمهورية اليمنية</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>© 2026 تَرِفَة. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Product Image */}
              <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={selectedProduct.mainImage}
                  alt={selectedProduct.nameAr}
                  className="w-full h-full object-cover"
                />
                {selectedProduct.originalPrice && selectedProduct.originalPrice > selectedProduct.price && (
                  <Badge className="absolute top-4 right-4 bg-[var(--rose)] text-white text-lg px-3 py-1">
                    خصم {Math.round((1 - selectedProduct.price / selectedProduct.originalPrice) * 100)}%
                  </Badge>
                )}
              </div>

              {/* Product Info */}
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-sm text-[var(--muted-foreground)] mb-1">
                    {selectedProduct.category?.nameAr || "بدون تصنيف"}
                  </p>
                  <h2 className="text-2xl font-bold">{selectedProduct.nameAr}</h2>
                  <p className="text-sm text-gray-500">{selectedProduct.name}</p>
                </div>

                {/* Price */}
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

                {/* Description */}
                {selectedProduct.descriptionAr && (
                  <p className="text-gray-600 leading-relaxed">
                    {selectedProduct.descriptionAr}
                  </p>
                )}

                {/* Stock */}
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${selectedProduct.stock > 0 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-sm">
                    {selectedProduct.stock > 0 ? `متوفر (${selectedProduct.stock} قطعة)` : "غير متوفر حالياً"}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 mt-4">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-[var(--gold-light)] to-[var(--gold)] hover:from-[var(--gold)] hover:to-[var(--gold-dark)] text-white"
                    onClick={() => {
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
                    }}
                  >
                    <ShoppingCart className="h-5 w-5 ml-2" />
                    أضف للسلة
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => openWhatsApp(`استفسار عن منتج: ${selectedProduct.nameAr} - السعر: ${selectedProduct.price} ر.ي`)}
                  >
                    <MessageCircle className="h-4 w-4 ml-2" />
                    استفسار عبر الواتساب
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating WhatsApp Button */}
      <button
        onClick={() => openWhatsApp()}
        className="fixed bottom-6 left-6 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg z-50 transition-all hover:scale-110"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </button>
    </div>
  );
}
