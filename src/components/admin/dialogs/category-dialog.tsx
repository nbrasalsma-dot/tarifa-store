"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { uploadImage } from "@/lib/upload";
import { ImageIcon, Tag, RefreshCw, Save, Upload } from "lucide-react";

interface Category {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  image?: string;
}

interface CategoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categoryForm: {
    name: string;
    nameAr: string;
    slug: string;
    image: string;
  };
  setCategoryForm: React.Dispatch<
    React.SetStateAction<{
      name: string;
      nameAr: string;
      slug: string;
      image: string;
    }>
  >;
  selectedCategory: Category | null;
  isSaving: boolean;
  onSave: () => Promise<void>;
  onReset: () => void;
}

export function CategoryDialog({
  isOpen,
  onOpenChange,
  categoryForm,
  setCategoryForm,
  selectedCategory,
  isSaving,
  onSave,
  onReset,
}: CategoryDialogProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) onReset();
      }}
    >
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-[var(--gold)]" />
            {selectedCategory ? "تعديل التصنيف" : "إضافة تصنيف جديد"}
          </DialogTitle>
          <DialogDescription>
            {selectedCategory
              ? "قم بتعديل بيانات التصنيف"
              : "أضف تصنيفاً جديداً للمنتجات"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {categoryForm.image && (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
              <img
                src={categoryForm.image}
                alt="معاينة"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              صورة التصنيف
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="رابط الصورة أو ارفع من جهازك"
                value={categoryForm.image}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, image: e.target.value })
                }
                className="flex-1"
              />
              <input
                type="file"
                accept="image/*"
                id="category-image-upload"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    toast({
                      title: "جاري رفع الصورة...",
                      description: "يرجى الانتظار",
                    });
                    try {
                      const result = await uploadImage(file);
                      if (result.success && result.url) {
                        setCategoryForm({
                          ...categoryForm,
                          image: result.url,
                        });
                        toast({
                          title: "تم الرفع",
                          description: "تم حفظ الصورة في السحابة بنجاح",
                        });
                      } else {
                        toast({
                          title: "خطأ",
                          description: result.error || "فشل رفع الصورة",
                          variant: "destructive",
                        });
                      }
                    } catch (error) {
                      toast({
                        title: "خطأ",
                        description: "فشل رفع الصورة",
                        variant: "destructive",
                      });
                    }
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  document.getElementById("category-image-upload")?.click()
                }
              >
                <Upload className="h-4 w-4 ml-2" />
                رفع
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>اسم التصنيف (عربي) *</Label>
              <Input
                placeholder="عطور"
                value={categoryForm.nameAr}
                onChange={(e) => {
                  const value = e.target.value;
                  setCategoryForm({
                    ...categoryForm,
                    nameAr: value,
                    slug: value
                      .toLowerCase()
                      .replace(/\s+/g, "-")
                      .replace(/[^\w\-]+/g, ""),
                  });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>اسم التصنيف (إنجليزي) *</Label>
              <Input
                placeholder="Perfumes"
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, name: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>الرابط (Slug)</Label>
            <Input
              placeholder="perfumes"
              value={categoryForm.slug}
              onChange={(e) =>
                setCategoryForm({ ...categoryForm, slug: e.target.value })
              }
              dir="ltr"
            />
            <p className="text-xs text-gray-500">
              سيستخدم في رابط الصفحة: /category/{categoryForm.slug || "..."}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                onOpenChange(false);
                onReset();
              }}
            >
              إلغاء
            </Button>
            <Button
              className="flex-1 bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Save className="h-4 w-4 ml-2" />
              )}
              {selectedCategory ? "حفظ التغييرات" : "إضافة التصنيف"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
