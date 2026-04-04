import type { Metadata, Viewport } from "next";
import { Tajawal, Amiri } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { CartProvider } from "@/contexts/cart-context";
import { WishlistProvider } from "@/contexts/wishlist-context";
import { PusherListener } from "@/components/shared/pusher-listener";

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

export const viewport: Viewport = {
    themeColor: "#3D3021", // لون الشريط العلوي ليناسب فخامة ترفة
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false, // يمنع التكبير بالأصابع ليعطي شعور التطبيق الحقيقي
    viewportFit: "cover", // يجعل المحتوى يملأ الشاشة بالكامل حتى خلف النتوء (Notch)
};

export const metadata: Metadata = {
  title: "تَرِفَة | متجر الأناقة والجمال",
  description: "متجر تَرِفَة - وجهتك الأولى للأكسسوارات وأدوات التجميل والعطور الفاخرة في اليمن",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "تَرِفَة",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
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
            <PusherListener />
            {children}
          </WishlistProvider>
        </CartProvider>
        <Toaster />
      </body>
    </html>
  );
}
