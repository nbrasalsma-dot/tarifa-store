"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const productFormSchema = z.object({
  name: z.string().min(1, "اسم المنتج مطلوب"),
  nameAr: z.string().min(1, "الاسم العربي مطلوب"),
  price: z.coerce.number().min(0, "السعر يجب أن يكون أكبر من أو يساوي 0"),
  costPrice: z.coerce
    .number()
    .min(0, "سعر التكلفة يجب أن يكون أكبر من أو يساوي 0")
    .optional()
    .nullable(),
  stock: z.coerce.number().min(0, "الكمية يجب أن تكون أكبر من أو يساوي 0"),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  mainImage: z.string().url("رابط الصورة غير صالح").optional().nullable(),
  descriptionAr: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  lowStockAlert: z.coerce.number().min(0).optional().nullable(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface Category {
  id: string;
  nameAr: string;
}

interface Supplier {
  id: string;
  name: string;
  type: string;
}

interface InventoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: any; // للتعديل لاحقاً
  onSuccess?: () => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

export function InventoryFormDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
  fetchWithAuth,
}: InventoryFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [imageUploading, setImageUploading] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      nameAr: "",
      price: 0,
      costPrice: null,
      stock: 0,
      sku: "",
      barcode: "",
      categoryId: null,
      supplierId: null,
      mainImage: "",
      descriptionAr: "",
      isActive: true,
      lowStockAlert: 5,
    },
  });

  // جلب التصنيفات والموردين
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await fetch("/api/accounting/inventory");
        if (res.ok) {
          const data = await res.json();
          setCategories(data.filters.categories);
          setSuppliers(data.filters.suppliers);
        }
      } catch (error) {
        console.error("فشل جلب الفلاتر:", error);
      }
    };
    if (open) {
      fetchFilters();
    }
  }, [open]);

  // تعبئة البيانات في حالة التعديل
  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name || "",
        nameAr: product.nameAr || "",
        price: product.price || 0,
        costPrice: product.costPrice || null,
        stock: product.stock || 0,
        sku: product.sku || "",
        barcode: product.barcode || "",
        categoryId: product.categoryId || null,
        supplierId: product.supplierId || null,
        mainImage: product.mainImage || "",
        descriptionAr: product.descriptionAr || "",
        isActive: product.isActive ?? true,
        lowStockAlert: product.lowStockAlert || 5,
      });
    } else {
      form.reset({
        name: "",
        nameAr: "",
        price: 0,
        costPrice: null,
        stock: 0,
        sku: "",
        barcode: "",
        categoryId: null,
        supplierId: null,
        mainImage: "",
        descriptionAr: "",
        isActive: true,
        lowStockAlert: 5,
      });
    }
  }, [product, form]);

  const onSubmit = async (data: ProductFormValues) => {
    setIsLoading(true);
    try {
      const url = product
        ? `/api/accounting/inventory/${product.id}`
        : "/api/accounting/inventory";
      const method = product ? "PUT" : "POST";

      const res = await fetchWithAuth(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast({
          title: product ? "تم التعديل" : "تمت الإضافة",
          description: product
            ? "تم تحديث المنتج بنجاح"
            : "تم إضافة المنتج بنجاح",
        });
        onOpenChange(false);
        onSuccess?.();
      } else {
        const error = await res.json();
        toast({
          title: "خطأ",
          description: error.error || "حدث خطأ ما",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل الاتصال بالخادم",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto p-0"
        dir="rtl"
      >
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-xl font-bold text-[#3D3021]">
            {product ? "تعديل صنف" : "إضافة صنف جديد"}
          </DialogTitle>
          <DialogDescription className="text-right">
            أدخل بيانات المنتج المراد {product ? "تعديله" : "إضافته"} إلى المخزن
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col h-full"
          >
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="nameAr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم المنتج (عربي) *</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: عطر فاخر" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم المنتج (إنجليزي) *</FormLabel>
                      <FormControl>
                        <Input placeholder="Luxury Perfume" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>سعر البيع (ريال) *</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="costPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>سعر التكلفة (ريال)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : null,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الكمية *</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lowStockAlert"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تنبيه عند كمية</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          value={field.value ?? 5}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رمز SKU</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="SKU-001"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الباركود</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123456789"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>التصنيف</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر التصنيف" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">بدون تصنيف</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.nameAr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المورد المعتمد</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المورد" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">بدون مورد</SelectItem>
                          {suppliers.map((sup) => (
                            <SelectItem key={sup.id} value={sup.id}>
                              {sup.name} (
                              {sup.type === "MERCHANT" ? "تاجر" : "مندوب"})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="mainImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رابط الصورة الرئيسية</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://example.com/image.jpg"
                          {...field}
                          value={field.value ?? ""}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={imageUploading}
                        >
                          <Upload className="h-4 w-4 ml-1" />
                          رفع
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                    {field.value && (
                      <div className="mt-2 h-20 w-20 overflow-hidden rounded-lg border">
                        <img
                          src={field.value}
                          alt="معاينة"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="descriptionAr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الوصف</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="وصف المنتج..."
                        className="min-h-[80px]"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>المنتج نشط</FormLabel>
                      <p className="text-sm text-[#A69B8D]">
                        يظهر المنتج في المتجر
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="p-4 border-t flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                className="bg-[#C9A962] hover:bg-[#B8956E] text-white"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="h-4 w-4 ml-1 animate-spin" />}
                {product ? "حفظ التعديلات" : "إضافة المنتج"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
