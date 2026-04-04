"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { NotificationBell } from "./notification-bell";
import {
  ShoppingCart,
  Heart,
  Menu,
  X,
  User,
  LogOut,
  Store,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/contexts/cart-context";
import { useWishlist } from "@/contexts/wishlist-context";

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
}

interface NavbarProps {
  user?: UserData | null;
  onOpenCart: () => void;
  onOpenAuth: () => void;
  onOpenWishlist?: () => void;
  onLogout?: () => void;
  onViewStore?: () => void;
  onViewDashboard?: () => void;
  viewMode?: 'dashboard' | 'store';
}

export function Navbar({
  user,
  onOpenCart,
  onOpenAuth,
  onOpenWishlist,
  onLogout,
  onViewStore,
  onViewDashboard,
  viewMode = 'store'
}: NavbarProps) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { state } = useCart();
  const { state: wishlistState } = useWishlist();

  // Get cart data safely
  const cartItemCount = state?.cart?.itemCount || 0;
  const wishlistItemCount = wishlistState?.itemCount || 0;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/", label: "الرئيسية" },
    { href: "/products", label: "المنتجات" },
    { href: "/categories", label: "الفئات" },
    { href: "/about", label: "عن المتجر" },
    { href: "/contact", label: "تواصل معنا" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  // Handle wishlist click
  const handleWishlistClick = () => {
    if (onOpenWishlist) {
      onOpenWishlist();
    } else {
      // Fallback: navigate to wishlist page
      window.location.href = "/wishlist";
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "bg-white/98 backdrop-blur-xl shadow-lg shadow-black/5"
          : "bg-white/90 backdrop-blur-md"
      }`}
    >
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-[#3D3021] via-[#4A3D2E] to-[#3D3021] text-white py-2 text-center text-sm">
        <div className="container mx-auto px-4 flex items-center justify-center gap-2">
          <Sparkles className="h-3 w-3 text-[#C9A962]" />
          <span className="text-white/90 font-medium tracking-wide">✨ تَرِفَة .. وجهتكِ الأولى للأناقة والجمال ✨</span>
          <Sparkles className="h-3 w-3 text-[#C9A962]" />
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Mobile Menu Button */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              {/* أضفنا hidden قبل md:hidden لكي يختفي تماماً في الجوال */}
              <Button variant="ghost" size="icon" className="hidden md:hidden hover:bg-[#FAF7F2] shrink-0">
                <Menu className="h-6 w-6 text-[#3D3021]" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-white border-l-0">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#FAF7F2]">
                  <img
                    src="/logo-transparent.jpg"
                    alt="تَرِفَة"
                    className="h-12 w-auto object-contain"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="hover:bg-[#FAF7F2]"
                  >
                    <X className="h-5 w-5 text-[#3D3021]" />
                  </Button>
                </div>

                <nav className="flex flex-col gap-1">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`text-lg font-semibold py-4 px-5 rounded-xl transition-all duration-300 ${
                        isActive(link.href)
                          ? "bg-gradient-to-r from-[#C9A962]/10 to-[#C9A962]/5 text-[#8B7355] border-r-4 border-[#C9A962]"
                          : "text-[#3D3021] hover:bg-[#FAF7F2] hover:text-[#8B7355]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                  
                  {/* Wishlist Link in Mobile Menu */}
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleWishlistClick();
                    }}
                    className="text-lg font-semibold py-4 px-5 rounded-xl transition-all duration-300 text-[#3D3021] hover:bg-[#FAF7F2] hover:text-[#8B7355] flex items-center justify-between"
                  >
                    <span>المفضلة</span>
                    {wishlistItemCount > 0 && (
                      <span className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm px-2 py-0.5 rounded-full">
                        {wishlistItemCount}
                      </span>
                    )}
                  </button>
                </nav>

                {/* Mobile Quick Actions */}
                <div className="flex gap-3 mt-6 px-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 py-6 rounded-xl border-[#C9A962] text-[#8B7355] hover:bg-[#FAF7F2]"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenCart();
                    }}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    <span>السلة</span>
                    {cartItemCount > 0 && (
                      <span className="bg-[#C9A962] text-white text-xs px-2 py-0.5 rounded-full">
                        {cartItemCount}
                      </span>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 py-6 rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleWishlistClick();
                    }}
                  >
                    <Heart className="h-5 w-5" />
                    <span>المفضلة</span>
                  </Button>
                </div>

                {/* Mobile User Section */}
                <div className="mt-auto pt-6 border-t border-[#FAF7F2]">
                  {user ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-[#FAF7F2] to-white rounded-xl">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C9A962] to-[#B8956E] flex items-center justify-center shrink-0">
                          <User className="h-6 w-6 text-white" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-bold text-[#3D3021] truncate">{user.name}</p>
                          <p className="text-sm text-[#8B7355] truncate">{user.email}</p>
                        </div>
                      </div>
                      {onViewStore && viewMode === 'dashboard' && (
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-3 py-6 rounded-xl border-[#C9A962] text-[#8B7355] hover:bg-[#FAF7F2]"
                          onClick={() => {
                            onViewStore();
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          <Store className="h-5 w-5" />
                          عرض المتجر
                        </Button>
                      )}
                      {onViewDashboard && viewMode === 'store' && (
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-3 py-6 rounded-xl border-[#C9A962] text-[#8B7355] hover:bg-[#FAF7F2]"
                          onClick={() => {
                            onViewDashboard();
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          <LayoutDashboard className="h-5 w-5" />
                          لوحة التحكم
                        </Button>
                      )}
                      {onLogout && (
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-3 text-rose-600 hover:text-rose-700 hover:bg-rose-50 py-6 rounded-xl"
                          onClick={() => {
                            onLogout();
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          <LogOut className="h-5 w-5" />
                          تسجيل الخروج
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button
                      className="w-full bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white py-7 rounded-xl text-lg"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenAuth();
                      }}
                    >
                      تسجيل الدخول
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <motion.img
              src="/logo-transparent.jpg"
              alt="تَرِفَة"
              className="h-10 md:h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              whileHover={{ scale: 1.05 }}
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`font-medium transition-all duration-300 relative py-2 text-base ${
                  isActive(link.href)
                    ? "text-[#8B7355]"
                    : "text-[#3D3021] hover:text-[#8B7355]"
                }`}
              >
                {link.label}
                {isActive(link.href) && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-[#C9A962] to-[#B8956E] rounded-full"
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
            {user && <NotificationBell userId={user.id} />}
            {/* Wishlist - Always visible */}
            <Button
              variant="ghost"
              size="icon"
              className="relative hover:bg-[#FAF7F2] rounded-full shrink-0 h-10 w-10 hidden md:flex"
              onClick={handleWishlistClick}
            >
              <Heart className="h-5 w-5 text-[#3D3021]" />
              {wishlistItemCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs rounded-full"
                >
                  {wishlistItemCount}
                </motion.span>
              )}
            </Button>

            {/* Cart - Always visible */}
            <Button
              variant="ghost"
              size="icon"
              className="relative hover:bg-[#FAF7F2] rounded-full shrink-0 h-10 w-10 hidden md:flex"
              onClick={onOpenCart}
            >
              <ShoppingCart className="h-5 w-5 text-[#3D3021]" />
              {cartItemCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-gradient-to-r from-[#C9A962] to-[#B8956E] text-white text-xs rounded-full"
                >
                  {cartItemCount}
                </motion.span>
              )}
            </Button>

            {/* User Menu - Desktop */}
            <div className="hidden md:flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-2">
                  {onViewStore && viewMode === 'dashboard' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onViewStore}
                      className="gap-2 hover:bg-[#FAF7F2] text-[#3D3021]"
                    >
                      <Store className="h-4 w-4" />
                      <span className="hidden xl:inline">المتجر</span>
                    </Button>
                  )}
                  {onViewDashboard && viewMode === 'store' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onViewDashboard}
                      className="gap-2 hover:bg-[#FAF7F2] text-[#3D3021]"
                    >
                      <User className="h-4 w-4" />
                      <span className="hidden xl:inline">حسابي</span>
                    </Button>
                  )}
                  {onLogout && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onLogout}
                      className="hover:bg-rose-50 text-rose-600 hover:text-rose-700"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white gap-2 px-4 sm:px-6"
                  onClick={onOpenAuth}
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">تسجيل الدخول</span>
                </Button>
              )}
            </div>

            {/* Mobile Login Button - only show if not logged in */}
            {!user && (
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:hidden hover:bg-[#FAF7F2] shrink-0 h-10 w-10"
                onClick={onOpenAuth}
              >
                <User className="h-5 w-5 text-[#3D3021]" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
