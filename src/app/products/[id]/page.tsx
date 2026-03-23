"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  Heart,
  ChevronLeft,
  ChevronRight,
  Share2,
  MessageCircle,
  Star,
  Truck,
  Shield,
  RotateCcw,
  Loader2,
  User,
  LogOut,
  Plus,
  Minus,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/cart-context";
import { useWishlist } from "@/contexts/wishlist-context";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  price: number;
  originalPrice?: number;
  mainImage: string;
  images: string;
  stock: number;
  sku?: string;
  isFeatured: boolean;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
    nameAr: string;
  };
}

interface RelatedProduct {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  originalPrice?: number;
  mainImage: string;
  stock: number;
  isFeatured: boolean;
  category?: {
    nameAr: string;
  };
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [user, setUser] = useState<{ id: string; name: string; role: string } | null>(null);

  const { addItem: addToCart, isInCart, getItemQuantity, updateQuantity } = useCart();
  const { isInWishlist, toggleItem: toggleWishlist } = useWishlist();

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    setIsLoading(true);
    try {
      // Fetch all products and find the one we need
      const response = await fetch("/api/products");
      const data = await response.json();
      const allProducts = data.products || [];

      const foundProduct = allProducts.find((p: Product) => p.id === productId);
      if (foundProduct) {
        setProduct(foundProduct);
        // Get related products from same category
        const related = allProducts
          .filter(
            (p: Product) => p.categoryId === foundProduct.categoryId && p.id !== foundProduct.id
          )
          .slice(0, 4);
        setRelatedProducts(related);
      }
    } catch (error) {
      console.error("Error fetching product:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return `${price.toLocaleString()} ر.ي`;
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= (product?.stock || 1)) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    addToCart({
      productId: product.id,
      name: product.name,
      nameAr: product.nameAr,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.mainImage,
      quantity: quantity,
      stock: product.stock,
    });
    toast({
      title: "تمت الإضافة",
      description: `تم إضافة ${quantity} من المنتج للسلة`,
    });
  };

  const handleToggleWishlist = () => {
    if (!product) return;
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
      description: isInWishlist(product.id)
        ? "تم إزالة المنتج من المفضلة"
        : "تم إضافة المنتج للمفضلة",
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    router.push("/");
  };

  // Parse images
  const productImages = product?.images
    ? typeof product.images === "string"
      ? JSON.parse(product.images)
      : product.images
    : product?.mainImage
      ? [product.mainImage]
      : [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-[var(--gold)]" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <p className="text-2xl mb-4">المنتج غير موجود</p>
        <Link href="/products">
          <Button className="bg-[var(--gold)] hover:bg-[var(--gold-dark)]">
            العودة للمنتجات
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--muted)] to-background">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-lg border-b sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/">
                <img src="/logo.png" alt="تَرِفَة" className="h-10 w-auto object-contain" />
              </Link>
            </div>

            <nav className="hidden md:flex items-center gap-6">
              <Link href="/" className="font-medium hover:text-[var(--gold)] transition-colors">
                الرئيسية
              </Link>
              <Link href="/products" className="font-medium hover:text-[var(--gold)] transition-colors">
                المنتجات
              </Link>
              <Link href="/cart" className="font-medium hover:text-[var(--gold)] transition-colors">
                السلة
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <span className="hidden md:block text-sm font-medium">{user.name}</span>
                  <Button variant="ghost" size="icon" onClick={handleLogout}>
                    <LogOut className="h-5 w-5" />
                  </Button>
                </>
              ) : (
                <Link href="/">
                  <Button className="bg-[var(--gold)] hover:bg-[var(--gold-dark)]">
                    تسجيل الدخول
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <Link href="/" className="hover:text-[var(--gold)]">
            الرئيسية
          </Link>
          <ChevronLeft className="h-4 w-4" />
          <Link href="/products" className="hover:text-[var(--gold)]">
            المنتجات
          </Link>
          <ChevronLeft className="h-4 w-4" />
          <span className="text-[var(--gold)]">{product.nameAr}</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {/* Main Image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white shadow-lg">
              <img
                src={productImages[selectedImage] || product.mainImage}
                alt={product.nameAr}
                className="w-full h-full object-cover"
              />
              {/* Badges */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                {product.isFeatured && (
                  <Badge className="bg-[var(--gold)] text-white text-sm px-3 py-1">
                    <Star className="h-4 w-4 ml-1" />
                    مميز
                  </Badge>
                )}
                {product.originalPrice && product.originalPrice > product.price && (
                  <Badge className="bg-[var(--rose)] text-white text-sm px-3 py-1">
                    خصم {Math.round((1 - product.price / product.originalPrice) * 100)}%
                  </Badge>
                )}
              </div>
              {/* Stock Badge */}
              {product.stock === 0 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Badge className="bg-red-500 text-white text-xl px-6 py-2">
                    نفذت الكمية
                  </Badge>
                </div>
              )}
            </div>

            {/* Thumbnail Images */}
            {productImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {productImages.map((img: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                      selectedImage === index
                        ? "border-[var(--gold)] shadow-lg"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt={`${product.nameAr} - ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Product Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Category */}
            {product.category && (
              <Link
                href={`/category/${product.category.id}`}
                className="inline-block text-sm text-[var(--gold)] hover:underline"
              >
                {product.category.nameAr}
              </Link>
            )}

            {/* Title */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{product.nameAr}</h1>
              <p className="text-gray-500">{product.name}</p>
            </div>

            {/* Price */}
            <div className="flex items-center gap-4">
              <span className="text-4xl font-bold text-[var(--gold-dark)]">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-2xl text-gray-400 line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${product.stock > 0 ? "bg-green-500" : "bg-red-500"}`}
              ></span>
              <span className={`font-medium ${product.stock > 0 ? "text-green-600" : "text-red-600"}`}>
                {product.stock > 0 ? `متوفر (${product.stock} قطعة)` : "غير متوفر حالياً"}
              </span>
            </div>

            <Separator />

            {/* Description */}
            {product.descriptionAr && (
              <div>
                <h3 className="font-bold mb-2">الوصف</h3>
                <p className="text-gray-600 leading-relaxed">{product.descriptionAr}</p>
              </div>
            )}

            {/* Quantity Selector */}
            {product.stock > 0 && (
              <div className="flex items-center gap-4">
                <span className="font-medium">الكمية:</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 p-0"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-bold text-lg">{quantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 p-0"
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= product.stock}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <Separator />

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-[var(--gold-light)] to-[var(--gold)] hover:from-[var(--gold)] hover:to-[var(--gold-dark)] text-white text-lg py-6"
                disabled={product.stock === 0}
                onClick={handleAddToCart}
              >
                <ShoppingCart className="h-5 w-5 ml-2" />
                {isInCart(product.id) ? "تحديث السلة" : "أضف للسلة"}
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className={`py-5 ${isInWishlist(product.id) ? "border-[var(--rose)] text-[var(--rose)]" : "border-[var(--gold)]"}`}
                  onClick={handleToggleWishlist}
                >
                  <Heart
                    className={`h-5 w-5 ml-2 ${isInWishlist(product.id) ? "fill-[var(--rose)]" : ""}`}
                  />
                  {isInWishlist(product.id) ? "في المفضلة" : "أضف للمفضلة"}
                </Button>
                <Button variant="outline" size="lg" className="py-5">
                  <Share2 className="h-5 w-5 ml-2" />
                  مشاركة
                </Button>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="text-center p-4 bg-white rounded-lg shadow">
                <Truck className="h-8 w-8 mx-auto text-[var(--gold)] mb-2" />
                <p className="text-sm font-medium">توصيل سريع</p>
                <p className="text-xs text-gray-500">لجميع المحافظات</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow">
                <Shield className="h-8 w-8 mx-auto text-[var(--gold)] mb-2" />
                <p className="text-sm font-medium">منتجات أصلية</p>
                <p className="text-xs text-gray-500">ضمان الجودة</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow">
                <RotateCcw className="h-8 w-8 mx-auto text-[var(--gold)] mb-2" />
                <p className="text-sm font-medium">استبدال سهل</p>
                <p className="text-xs text-gray-500">خلال 7 أيام</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold mb-6">منتجات مشابهة</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((item) => (
                <Link key={item.id} href={`/products/${item.id}`}>
                  <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={item.mainImage}
                        alt={item.nameAr}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                      />
                      {item.isFeatured && (
                        <Badge className="absolute top-2 right-2 bg-[var(--gold)] text-white">
                          مميز
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {item.category?.nameAr}
                      </p>
                      <h3 className="font-semibold text-sm line-clamp-1">{item.nameAr}</h3>
                      <p className="font-bold text-[var(--gold-dark)]">{formatPrice(item.price)}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#1A1A1A] text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <img src="/logo.png" alt="تَرِفَة" className="h-12 w-auto mx-auto mb-4 object-contain" />
          <p className="text-gray-400">© {new Date().getFullYear()} تَرِفَة. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}
