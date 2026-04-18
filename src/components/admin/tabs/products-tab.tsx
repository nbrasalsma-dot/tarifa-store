"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Plus, Edit, Trash2, Star, ShoppingBag } from "lucide-react";

interface Category {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  image?: string;
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
  images: string;
  stock: number;
  sku?: string;
  isActive: boolean;
  isFeatured: boolean;
  categoryId?: string;
  category?: Category;
  createdAt: string;
}

interface ProductsTabProps {
  products: Product[];
  onRefresh: () => void;
  onNewProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onToggleFeatured: (product: Product) => void;
}

export function ProductsTab({
  products,
  onRefresh,
  onNewProduct,
  onEditProduct,
  onDeleteProduct,
  onToggleFeatured,
}: ProductsTabProps) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between px-4 md:px-6">
        <CardTitle>إدارة المنتجات ({products.length})</CardTitle>
        <div className="flex gap-2">
          <Button onClick={onRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
          <Button
            onClick={onNewProduct}
            className="bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
          >
            <Plus className="h-4 w-4 ml-2" />
            إضافة منتج
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-[var(--muted-foreground)] mb-4">
              لا توجد منتجات حالياً
            </p>
            <Button
              onClick={onNewProduct}
              className="bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
            >
              <Plus className="h-4 w-4 ml-2" />
              إضافة منتج جديد
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100"
                >
                  <div className="relative aspect-square">
                    <img
                      src={product.mainImage}
                      alt={product.nameAr}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      {product.isFeatured && (
                        <Badge className="bg-[var(--gold)]">
                          <Star className="h-3 w-3 ml-1" />
                          مميز
                        </Badge>
                      )}
                      {!product.isActive && (
                        <Badge className="bg-gray-500">غير نشط</Badge>
                      )}
                      {product.originalPrice &&
                        product.originalPrice > product.price && (
                          <Badge className="bg-[var(--rose)]">
                            -
                            {Math.round(
                              (1 - product.price / product.originalPrice) * 100,
                            )}
                            %
                          </Badge>
                        )}
                    </div>
                    <div className="absolute top-2 left-2 flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 p-0"
                        onClick={() => onToggleFeatured(product)}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            product.isFeatured
                              ? "fill-[var(--gold)] text-[var(--gold)]"
                              : ""
                          }`}
                        />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 p-0"
                        onClick={() => onEditProduct(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 w-8 p-0"
                        onClick={() => onDeleteProduct(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-[var(--muted-foreground)] mb-1">
                      {product.category?.nameAr || "بدون تصنيف"}
                    </p>
                    <h3 className="font-semibold text-sm line-clamp-1">
                      {product.nameAr}
                    </h3>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--gold-dark)]">
                          {product.price.toLocaleString()} ر.ي
                        </span>
                        {product.originalPrice &&
                          product.originalPrice > product.price && (
                            <span className="text-xs text-gray-400 line-through">
                              {product.originalPrice.toLocaleString()}
                            </span>
                          )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        المخزون: {product.stock}
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
