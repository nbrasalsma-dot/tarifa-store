"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Plus, Edit, Trash2, Tag } from "lucide-react";

interface Category {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  image?: string;
}

interface CategoriesTabProps {
  categories: Category[];
  onRefresh: () => void;
  onNewCategory: () => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
}

export function CategoriesTab({
  categories,
  onRefresh,
  onNewCategory,
  onEditCategory,
  onDeleteCategory,
}: CategoriesTabProps) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between px-4 md:px-6">
        <CardTitle>إدارة التصنيفات ({categories.length})</CardTitle>
        <div className="flex gap-2">
          <Button onClick={onRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
          <Button
            onClick={onNewCategory}
            className="bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
          >
            <Plus className="h-4 w-4 ml-2" />
            إضافة تصنيف
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-[var(--muted-foreground)] mb-4">
              لا توجد تصنيفات حالياً
            </p>
            <Button
              onClick={onNewCategory}
              className="bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
            >
              <Plus className="h-4 w-4 ml-2" />
              إضافة تصنيف جديد
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100"
                >
                  <div className="relative aspect-video">
                    {category.image ? (
                      <img
                        src={category.image}
                        alt={category.nameAr}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[var(--gold-light)] to-[var(--gold)] flex items-center justify-center">
                        <Tag className="h-12 w-12 text-white" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 p-0"
                        onClick={() => onEditCategory(category)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 w-8 p-0"
                        onClick={() => onDeleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg">{category.nameAr}</h3>
                    <p className="text-sm text-gray-500">{category.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                      Slug: {category.slug}
                    </p>
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
