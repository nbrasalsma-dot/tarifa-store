"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Heart, ChevronLeft, User, LogOut, Loader2 } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { useWishlist } from "@/contexts/wishlist-context";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Product {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  originalPrice?: number;
  mainImage: string;
  stock: number;
  isFeatured: boolean;
  category?: { nameAr: string };
}

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.slug as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);

  const { addItem: addToCart, isInCart } = useCart();
  const { isInWishlist, toggleItem: toggleWishlist } = useWishlist();

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    fetchProducts();
  }, [categoryId]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/products?categoryId=${categoryId}`);
      const data = await response.json();
      setProducts(data.products || []);
      
      // Get category name from first product or from categories
      if (data.products?.length > 0 && data.products[0].category) {
        setCategoryName(data.products[0].category.nameAr);
      } else {
        // Try to fetch category name from categories API
        const catResponse = await fetch("/api/categories");
        const catData = await catResponse.json();
        const cat = catData.categories?.find((c: { id: string }) => c.id === categoryId);
        if (cat) {
          setCategoryName(cat.nameAr);
        }
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    router.push("/");
  };

  const formatPrice = (price: number) => `${price.toLocaleString()} ر.ي`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--muted)] to-background">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-lg border-b sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/">
              <img src="/logo.png" alt="تَرِفَة" className="h-10 w-auto object-contain" />
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/" className="font-medium hover:text-[var(--gold)]">الرئيسية</Link>
              <Link href="/products" className="font-medium hover:text-[var(--gold)]">المنتجات</Link>
              <Link href="/category" className="font-medium text-[var(--gold)]">الفئات</Link>
            </nav>
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <span className="text-sm font-medium">{user.name}</span>
                  <Button variant="ghost" size="icon" onClick={handleLogout}>
                    <LogOut className="h-5 w-5" />
                  </Button>
                </>
              ) : (
                <Link href="/">
                  <Button className="bg-[var(--gold)] hover:bg-[var(--gold-dark)]">تسجيل الدخول</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <Link href="/" className="hover:text-[var(--gold)]">الرئيسية</Link>
          <ChevronLeft className="h-4 w-4" />
          <Link href="/category" className="hover:text-[var(--gold)]">الفئات</Link>
          <ChevronLeft className="h-4 w-4" />
          <span className="text-[var(--gold)]">{categoryName || "فئة"}</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{categoryName || "منتجات الفئة"}</h1>
          <p className="text-[var(--muted-foreground)]">{products.length} منتج</p>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--gold)]" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-[var(--muted-foreground)] mb-4">لا توجد منتجات في هذه الفئة</p>
            <Link href="/products">
              <Button className="bg-[var(--gold)] hover:bg-[var(--gold-dark)]">تصفحي جميع المنتجات</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
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
                        <Badge className="bg-[var(--gold)] text-white">مميز</Badge>
                      )}
                      {product.originalPrice && product.originalPrice > product.price && (
                        <Badge className="bg-[var(--rose)] text-white">
                          -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm md:text-base mb-2 line-clamp-2">{product.nameAr}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-[var(--gold-dark)]">{formatPrice(product.price)}</span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-sm text-[var(--muted-foreground)] line-through">
                          {formatPrice(product.originalPrice)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                <img src={selectedProduct.mainImage} alt={selectedProduct.nameAr} className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col gap-4">
                <h2 className="text-2xl font-bold">{selectedProduct.nameAr}</h2>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-[var(--gold-dark)]">{formatPrice(selectedProduct.price)}</span>
                </div>
                <div className="flex flex-col gap-3 mt-4">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-[var(--gold-light)] to-[var(--gold)] text-white"
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
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className={`flex-1 ${isInWishlist(selectedProduct.id) ? "border-[var(--rose)] text-[var(--rose)]" : ""}`}
                      onClick={() => {
                        toggleWishlist({
                          productId: selectedProduct.id,
                          name: selectedProduct.name,
                          nameAr: selectedProduct.nameAr,
                          price: selectedProduct.price,
                          originalPrice: selectedProduct.originalPrice,
                          image: selectedProduct.mainImage,
                        });
                        toast({ title: isInWishlist(selectedProduct.id) ? "تمت الإزالة" : "تمت الإضافة" });
                      }}
                    >
                      <Heart className={`h-4 w-4 ml-2 ${isInWishlist(selectedProduct.id) ? "fill-[var(--rose)]" : ""}`} />
                      المفضلة
                    </Button>
                    <Link href={`/products/${selectedProduct.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">التفاصيل</Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
