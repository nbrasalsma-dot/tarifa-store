import type { Metadata } from "next";
import { Tajawal, Amiri } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { CartProvider } from "@/contexts/cart-context";
import { WishlistProvider } from "@/contexts/wishlist-context";

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700", "800", "900"],
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "تَرِفَة | متجر الأناقة والجمال",
  description: "متجر تَرِفَة - وجهتك الأولى للأكسسوارات وأدوات التجميل والعطور الفاخرة في اليمن",
  keywords: ["ترفة", "متجر", "أكسسوارات", "تجميل", "عطور", "مكياج", "نسائي", "يمن", "فاخر"],
  authors: [{ name: "تَرِفَة" }],
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/favicon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "تَرِفَة | متجر الأناقة والجمال",
    description: "وجهتك الأولى للأكسسوارات وأدوات التجميل والعطور الفاخرة",
    type: "website",
    images: ["/logo-transparent.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${tajawal.variable} ${amiri.variable} font-sans antialiased bg-background text-foreground`}
      >
        <CartProvider>
          <WishlistProvider>
            {children}
          </WishlistProvider>
        </CartProvider>
        <Toaster />
      </body>
    </html>
  );
}
