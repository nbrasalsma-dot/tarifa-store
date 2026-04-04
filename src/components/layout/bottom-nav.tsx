"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid, ShoppingCart, Heart, User } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { useWishlist } from "@/contexts/wishlist-context";
import { motion } from "framer-motion";

export function BottomNav({ onOpenCart, onOpenAuth, user }: any) {
    const pathname = usePathname();
    const { state: cartState } = useCart();
    const { state: wishlistState } = useWishlist();

    const cartCount = cartState?.cart?.itemCount || 0;

    const navItems = [
        { icon: Home, label: "الرئيسية", href: "/" },
        { icon: Grid, label: "الأقسام", href: "/categories" },
        { icon: ShoppingCart, label: "السلة", onClick: onOpenCart, isCart: true },
        { icon: Heart, label: "المفضلة", href: "/wishlist" },
        { icon: User, label: "حسابي", href: "/dashboard", isUser: true },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
            {/* خلفية زجاجية فخمة مع انحناء علوي بسيط */}
            <div className="bg-white/95 backdrop-blur-lg border-t border-gray-100 px-2 pb-safe-area-inset-bottom">
                <div className="flex justify-around items-center h-16">
                    {navItems.map((item, index) => {
                        const Icon = item.icon;
                        const active = pathname === item.href;

                        const content = (
                            <div className="flex flex-col items-center justify-center relative w-full h-full">
                                {item.isCart && cartCount > 0 && (
                                    <span className="absolute top-1 right-1/2 translate-x-3 bg-[#C9A962] text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full border border-white shadow-sm">
                                        {cartCount}
                                    </span>
                                )}
                                <Icon
                                    className={`h-5 w-5 mb-1 transition-colors ${active ? "text-[#8B7355]" : "text-gray-400"
                                        }`}
                                />
                                <span
                                    className={`text-[10px] font-medium transition-colors ${active ? "text-[#8B7355]" : "text-gray-400"
                                        }`}
                                >
                                    {item.label}
                                </span>
                                {active && (
                                    <motion.div
                                        layoutId="bottomTab"
                                        className="absolute -top-3 w-8 h-1 bg-[#C9A962] rounded-full"
                                    />
                                )}
                            </div>
                        );

                        if (item.onClick) {
                            return (
                                <button key={index} onClick={item.onClick} className="flex-1 h-full">
                                    {content}
                                </button>
                            );
                        }

                        // إذا لم يكن هناك مستخدم وضغط على "حسابي"، نفتح نافذة تسجيل الدخول
                        const href = item.isUser && !user ? "#" : item.href;
                        const onClick = item.isUser && !user ? onOpenAuth : undefined;

                        return (
                            <Link key={index} href={href} onClick={onClick} className="flex-1 h-full">
                                {content}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}