"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    Upload,
    X,
    Image as ImageIcon,
    Plus,
    Save,
    RefreshCw,
    Tag,
    Palette,
    Package,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { uploadImage } from "@/lib/upload";

// واجهة التصنيفات
interface Category {
    id: string;
    name: string;
    nameAr: string;
    slug: string;
    image?: string;
}

// واجهة المنتج (للتحديث)
interface Product {
    id: string;
    name: string;
    nameAr: string;
    description?: string;
    descriptionAr?: string;
    price: number;
    originalPrice?: number;
    mainImage: string;
    images?: string;
    stock: number;
    sku?: string;
    isActive: boolean;
    isFeatured: boolean;
    categoryId?: string;
    category?: Category;
    colors?: string;
    sizes?: string;
    videoUrl?: string;
    featuresAr?: string;
    usageAr?: string;
    ingredientsAr?: string;
    inStock?: boolean;
    estimatedDays?: number;
}

// Props التي ستستقبلها النافذة من أي لوحة تحكم
interface ProductFormDialogProps {
    isOpen: boolean;
    onClose: () => void;
    categories: Category[];
    selectedProduct?: Product | null;
    userId: string;
    isSaving?: boolean;
    onSave: (data: any) => Promise<void>;
}

export function ProductFormDialog({
    isOpen,
    onClose,
    categories,
    selectedProduct,
    userId,
    isSaving = false,
    onSave
}: ProductFormDialogProps) {

    // حالة النموذج
    const [form, setForm] = useState({
        name: "",
        nameAr: "",
        description: "",
        descriptionAr: "",
        price: "",
        originalPrice: "",
        mainImage: "",
        stock: "",
        categoryId: "",
        isFeatured: false,
        isActive: true,
        // الحقول الجديدة
        colors: "",
        images: "[]", // JSON array
        inStock: true,
        estimatedDays: "",
        sizes: "",
        videoUrl: "",
        featuresAr: "",
        usageAr: "",
        ingredientsAr: "",
    });

    // حالة رفع الصور المتعددة
    const [isUploadingImages, setIsUploadingImages] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // --- حالات الألوان ---
    const [selectedColors, setSelectedColors] = useState<any[]>([]);
    const [availableColors, setAvailableColors] = useState([
        { name: "أحمر", hex: "#ef4444" }, { name: "أزرق", hex: "#3b82f6" },
        { name: "أخضر", hex: "#22c55e" }, { name: "أسود", hex: "#000000" },
        { name: "أبيض", hex: "#ffffff" }, { name: "ذهبي", hex: "#eab308" },
        { name: "فضي", hex: "#94a3b8" }, { name: "وردي", hex: "#ec4899" },
        { name: "بنفسجي", hex: "#a855f7" }, { name: "بني", hex: "#8B4513" },
        { name: "رمادي", hex: "#6b7280" }, { name: "برتقالي", hex: "#f97316" }
    ]);
    const [newColorName, setNewColorName] = useState("");
    const [newColorHex, setNewColorHex] = useState("#000000");

    // --- حالات المقاسات ---
    const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
    const [availableSizes, setAvailableSizes] = useState(["S", "M", "L", "XL", "XXL", "30ml", "50ml", "100ml"]);
    const [newSizeInput, setNewSizeInput] = useState("");

    // 🧽 تفريغ الحقول للإضافة الجديدة أو تعبئتها للتعديل
    useEffect(() => {
        if (isOpen) {
            if (selectedProduct) {
                // 1. حالة التعديل: هنا ستظهر البيانات القديمة كما طلبت تماماً ولن تختفي
                setForm({
                    name: selectedProduct.name,
                    nameAr: selectedProduct.nameAr,
                    description: selectedProduct.description || "",
                    descriptionAr: selectedProduct.descriptionAr || "",
                    price: selectedProduct.price.toString(),
                    originalPrice: selectedProduct.originalPrice?.toString() || "",
                    mainImage: selectedProduct.mainImage,
                    stock: selectedProduct.stock.toString(),
                    categoryId: selectedProduct.categoryId || "",
                    isFeatured: selectedProduct.isFeatured,
                    isActive: selectedProduct.isActive,
                    colors: selectedProduct.colors || "",
                    images: selectedProduct.images || "[]",
                    inStock: selectedProduct.inStock ?? true,
                    estimatedDays: selectedProduct.estimatedDays?.toString() || "",
                    sizes: selectedProduct.sizes || "",
                    videoUrl: selectedProduct.videoUrl || "",
                    featuresAr: selectedProduct.featuresAr || "",
                    usageAr: selectedProduct.usageAr || "",
                    ingredientsAr: selectedProduct.ingredientsAr || "",
                });

                try {
                    const parsedColors = selectedProduct.colors ? JSON.parse(selectedProduct.colors) : [];
                    setSelectedColors(parsedColors);
                } catch { }

                try {
                    const parsedImages = selectedProduct.images ? JSON.parse(selectedProduct.images) : [];
                    if (parsedImages.length > 0) setImagePreview(parsedImages[0]);
                } catch { }

                // --- جلب المقاسات عند التعديل ---
                try {
                    const parsedSizes = selectedProduct.sizes ? JSON.parse(selectedProduct.sizes) : [];
                    setSelectedSizes(parsedSizes);
                } catch {
                    setSelectedSizes(selectedProduct.sizes ? [selectedProduct.sizes] : []);
                }
            } else {
                // 2. حالة الإضافة الجديدة: هنا فقط سيتم تفريغ النافذة لتكون نظيفة
                setForm({
                    name: "",
                    nameAr: "",
                    description: "",
                    descriptionAr: "",
                    price: "",
                    originalPrice: "",
                    mainImage: "",
                    stock: "",
                    categoryId: "",
                    isFeatured: false,
                    isActive: true,
                    colors: "",
                    images: "[]",
                    inStock: true,
                    estimatedDays: "",
                    sizes: "",
                    videoUrl: "",
                    featuresAr: "",
                    usageAr: "",
                    ingredientsAr: "",
                });
                setImagePreview(null);
                setSelectedColors([]);
                setSelectedSizes([]);
                setNewColorName("");
                setNewSizeInput("");
            }
        }
    }, [isOpen, selectedProduct]);

    // --- دوال الألوان الذكية ---
    const handleAddNewColor = () => {
        if (newColorName.trim()) {
            const newColor = { name: newColorName.trim(), hex: newColorHex };
            setAvailableColors([...availableColors, newColor]); // إضافته للقائمة

            // تحديده تلقائياً
            const updatedColors = [...selectedColors, newColor];
            setSelectedColors(updatedColors);
            setForm({ ...form, colors: JSON.stringify(updatedColors) });

            setNewColorName(""); // تصفير الحقل
        }
    };

    // --- دوال المقاسات الذكية ---
    const toggleSize = (size: string) => {
        let updated;
        if (selectedSizes.includes(size)) {
            updated = selectedSizes.filter(s => s !== size);
        } else {
            updated = [...selectedSizes, size];
        }
        setSelectedSizes(updated);
        setForm({ ...form, sizes: JSON.stringify(updated) });
    };

    const handleAddNewSize = () => {
        if (newSizeInput.trim() && !availableSizes.includes(newSizeInput.trim())) {
            const size = newSizeInput.trim();
            setAvailableSizes([...availableSizes, size]); // إضافته للقائمة

            // تحديده تلقائياً
            const updatedSizes = [...selectedSizes, size];
            setSelectedSizes(updatedSizes);
            setForm({ ...form, sizes: JSON.stringify(updatedSizes) });

            setNewSizeInput(""); // تصفير الحقل
        }
    };

    // ⚡ رفع صور متعددة للسحابة مع تنظيم المجلدات تلقائياً
    const handleMultipleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!form.categoryId) {
            toast({
                title: "تنبيه",
                description: "يجب اختيار التصنيف أولاً لضمان تنظيم ملفاتك",
                variant: "destructive"
            });
            return;
        }

        const files = e.target.files;
        if (!files || files.length === 0) return;

        // 1. تحديد مسار المجلد بناءً على التصنيف المختار
        const selectedCategory = categories.find(c => c.id === form.categoryId);
        // إذا لم يختر تصنيف، يضعها في المجلد العام للمنتجات، وإذا اختار يضعها في مجلد باسم التصنيف (مثل /products/watches)
        const folderPath = selectedCategory
            ? `/products/${selectedCategory.slug || selectedCategory.name}`
            : "/products/general";

        setIsUploadingImages(true);
        let currentImages: string[] = [];

        try {
            currentImages = form.images ? JSON.parse(form.images) : [];
        } catch { }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.size > 5 * 1024 * 1024) {
                toast({ title: "تنبيه", description: `الصورة ${file.name} أكبر من 5 ميجا`, variant: "destructive" });
                continue;
            }

            try {
                // 2. تمرير مسار المجلد الجديد لدالة الرفع 🚀
                const result = await uploadImage(file, folderPath);

                if (result.success && result.url) {
                    currentImages.push(result.url);
                } else {
                    toast({ title: "خطأ", description: `فشل رفع ${file.name}`, variant: "destructive" });
                }
            } catch {
                toast({ title: "خطأ", description: `حدث خطأ أثناء رفع ${file.name}`, variant: "destructive" });
            }
        }

        setForm({ ...form, images: JSON.stringify(currentImages), mainImage: currentImages[0] || form.mainImage });
        if (currentImages.length > 0) setImagePreview(currentImages[0]);

        setIsUploadingImages(false);
        e.target.value = "";
        toast({ title: "تم التحديث", description: `تم تنظيم الصور في مجلد: ${folderPath}` });
    };

    const removeImage = (indexToRemove: number) => {
        try {
            let currentImages: string[] = form.images ? JSON.parse(form.images) : [];
            currentImages = currentImages.filter((_, index) => index !== indexToRemove);
            setForm({ ...form, images: JSON.stringify(currentImages) });
            setImagePreview(currentImages[0] || null);
        } catch { }
    };

    // حفظ المنتج
    const handleSave = async () => {
        if (!form.name || !form.nameAr || !form.price || !form.mainImage) {
            toast({ title: "خطأ", description: "يرجى ملء الحقول المطلوبة", variant: "destructive" });
            return;
        }

        const bodyToSave = {
            ...form,
            price: parseFloat(form.price),
            originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : null,
            stock: parseInt(form.stock) || 0,
            estimatedDays: form.estimatedDays ? parseInt(form.estimatedDays) : null,
            agentId: userId,
        };

        if (selectedProduct) {
            bodyToSave.id = selectedProduct.id;
        }

        await onSave(bodyToSave);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-x-auto overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5 text-[var(--gold)]" />
                        {selectedProduct ? "تعديل المنتج" : "إضافة منتج جديد"}
                    </DialogTitle>
                    <DialogDescription className="sr-only">نموذج إضافة أو تعديل المنتج</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* معاينة الصورة الرئيسية */}
                    {imagePreview && (
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                            <img src={imagePreview} alt="معاينة" className="w-full h-full object-cover" />
                        </div>
                    )}

                    {/* 1. رفع صور متعددة (ميزة جديدة) */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" />
                            صور المنتج (يمكنك رفع عدة صور) *
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="رابط الصورة الرئيسية"
                                value={form.mainImage}
                                onChange={(e) => {
                                    setForm({ ...form, mainImage: e.target.value });
                                    setImagePreview(e.target.value);
                                }}
                                className="flex-1"
                            />
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                id="multi-image-upload"
                                className="hidden"
                                onChange={handleMultipleImagesUpload}
                                disabled={isUploadingImages}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    if (!form.categoryId) {
                                        toast({
                                            title: "تنبيه",
                                            description: "يرجى اختيار التصنيف أولاً لضمان تنظيم صورك في المجلد الصحيح",
                                            variant: "destructive"
                                        });
                                        return;
                                    }
                                    document.getElementById('multi-image-upload')?.click();
                                }}
                                disabled={isUploadingImages || !form.categoryId} // 👈 تعطيل الزر إذا لم يتم اختيار تصنيف
                                className={`whitespace-nowrap ${!form.categoryId ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                {isUploadingImages ? <RefreshCw className="h-4 w-4 animate-spin ml-2" /> : <Upload className="h-4 w-4 ml-2" />}
                                رفع مجموعة
                            </Button>
                        </div>

                        {/* معاينة الصور المرفوعة */}
                        {form.images && JSON.parse(form.images).length > 1 && (
                            <div className="flex gap-2 flex-wrap p-2 bg-gray-50 rounded-lg border">
                                {JSON.parse(form.images).map((img: string, index: number) => (
                                    <div key={index} className="relative w-16 h-16 rounded-md overflow-hidden border-2 border-gray-200 group">
                                        <img src={img} alt={`صورة ${index + 1}`} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-md w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {!form.categoryId && (
                            <p className="text-[10px] text-red-500 font-bold mt-1 animate-pulse flex items-center gap-1">
                                ⚠️ اختر التصنيف أولاً لتفعيل خاصية الرفع السحابي المنظم
                            </p>
                        )}
                        <p className="text-xs text-gray-500">أدخل رابط الصورة الرئيسية أو ارفع مجموعة صور من جهازك</p>
                    </div>

                    {/* 2. الأسماء */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>اسم المنتج (عربي) *</Label>
                            <Input placeholder="عطر الليل الذهبي" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>اسم المنتج (إنجليزي) *</Label>
                            <Input placeholder="Golden Night Perfume" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </div>
                    </div>

                    {/* 3. الأوصاف */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>الوصف (عربي)</Label>
                            <Textarea placeholder="وصف المنتج..." value={form.descriptionAr} onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} rows={3} />
                        </div>
                        <div className="space-y-2">
                            <Label>الوصف (إنجليزي)</Label>
                            <Textarea placeholder="Product description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                        </div>
                    </div>

                    {/* 4. الأسعار */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>السعر (ر.ي) *</Label>
                            <Input type="number" placeholder="299" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>السعر الأصلي (قبل الخصم)</Label>
                            <Input type="number" placeholder="450" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} />
                        </div>
                    </div>

                    {/* 5. الألوان المتوفرة (نظام ذكي مع تمرير) */}
                    <div className="space-y-3 border-t pt-4 mt-2 overflow-hidden w-full">
                        <Label className="flex items-center gap-2">
                            <Palette className="h-4 w-4 text-purple-500" />
                            الألوان المتوفرة (اختر من القائمة أو أضف لوناً جديداً)
                        </Label>

                        {/* قائمة الألوان (مع تمرير أفقي فقط داخل هذا المربع) */}
                        <div className="flex gap-4 overflow-x-auto pb-4 pt-2 px-2 bg-gray-50 rounded-xl border border-gray-100 shadow-inner w-full custom-scrollbar" style={{ scrollbarWidth: 'thin' }}>
                            {availableColors.map((colorObj) => {
                                const isSelected = selectedColors.some(c =>
                                    typeof c === 'string' ? c === colorObj.name : c.name === colorObj.name
                                );
                                return (
                                    <button
                                        key={colorObj.name}
                                        type="button"
                                        onClick={() => {
                                            let newColors;
                                            if (isSelected) {
                                                newColors = selectedColors.filter(c =>
                                                    typeof c === 'string' ? c !== colorObj.name : c.name !== colorObj.name
                                                );
                                            } else {
                                                newColors = [...selectedColors, colorObj];
                                            }
                                            setSelectedColors(newColors);
                                            setForm({ ...form, colors: JSON.stringify(newColors) });
                                        }}
                                        className={`flex-shrink-0 group relative flex flex-col items-center gap-1 transition-all duration-300 ${isSelected ? 'scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'}`}
                                    >
                                        <div
                                            className={`w-9 h-9 rounded-full border-2 shadow-sm flex items-center justify-center transition-all ${isSelected ? 'border-purple-600 ring-4 ring-purple-200' : 'border-gray-300'}`}
                                            style={{ backgroundColor: colorObj.hex }}
                                        >
                                            {isSelected && (
                                                <span className={`text-sm font-bold ${['أبيض', 'فضي', 'ذهبي'].includes(colorObj.name) ? 'text-black' : 'text-white'}`}>
                                                    ✓
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-[11px] font-medium ${isSelected ? 'text-purple-700' : 'text-gray-600'}`}>
                                            {colorObj.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* إضافة لون جديد */}
                        <div className="flex gap-2 items-center bg-purple-50 p-2 rounded-lg border border-purple-100 w-full">
                            <Input
                                placeholder="اسم اللون (عنابي)"
                                value={newColorName}
                                onChange={(e) => setNewColorName(e.target.value)}
                                className="h-8 text-xs flex-1"
                            />
                            <input
                                type="color"
                                value={newColorHex}
                                onChange={(e) => setNewColorHex(e.target.value)}
                                className="w-8 h-8 rounded cursor-pointer border-0 p-0 flex-shrink-0"
                            />
                            <Button type="button" onClick={handleAddNewColor} size="sm" variant="secondary" className="h-8 whitespace-nowrap text-xs flex-shrink-0">
                                <Plus className="h-3 w-3 ml-1" /> إضافة لون
                            </Button>
                        </div>
                    </div>

                    {/* --- 🌟 المقاسات ورابط الفيديو --- */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t pt-4 mt-4">
                        {/* نظام المقاسات الذكي */}
                        <div className="space-y-3 overflow-hidden">
                            <Label className="flex items-center gap-2">
                                <span className="text-blue-500">📏</span> المقاسات / الأحجام
                            </Label>

                            {/* قائمة المقاسات (تمرير أفقي) */}
                            <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
                                {availableSizes.map((size) => {
                                    const isSelected = selectedSizes.includes(size);
                                    return (
                                        <Badge
                                            key={size}
                                            variant={isSelected ? "default" : "outline"}
                                            className={`flex-shrink-0 cursor-pointer px-3 py-1.5 transition-all ${isSelected ? 'bg-blue-600 hover:bg-blue-700 scale-105' : 'hover:bg-blue-50 hover:text-blue-600'}`}
                                            onClick={() => toggleSize(size)}
                                        >
                                            {size}
                                            {isSelected && <span className="mr-1 text-white text-[10px]">✓</span>}
                                        </Badge>
                                    );
                                })}
                            </div>

                            {/* إضافة مقاس جديد */}
                            <div className="flex gap-2">
                                <Input
                                    placeholder="مقاس جديد (مثال: 3XL)"
                                    value={newSizeInput}
                                    onChange={(e) => setNewSizeInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddNewSize(); }}
                                    className="h-8 text-xs flex-1"
                                />
                                <Button type="button" onClick={handleAddNewSize} size="sm" variant="outline" className="h-8 flex-shrink-0 whitespace-nowrap text-xs border-blue-200 text-blue-700 hover:bg-blue-50">
                                    <Plus className="h-3 w-3" /> إضافة مقاس
                                </Button>
                            </div>
                        </div>

                        {/* رابط الفيديو */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <span className="text-pink-500">📷</span> رابط ريلز / فيديو
                            </Label>
                            <Input
                                placeholder="https://instagram.com/reel/..."
                                value={form.videoUrl}
                                onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                                className="bg-gray-50"
                            />
                            <p className="text-[10px] text-gray-500 mt-1">اختياري: يظهر في صفحة المنتج لزيادة التفاعل</p>
                        </div>
                    </div>

                    {/* 3. المحتوى الفخم (تفاصيل المنتج) */}
                    <div className="space-y-4 border-t pt-4 mt-4 mb-4">
                        <Label className="text-md font-bold text-[var(--gold)] flex items-center gap-2">
                            ✨ المحتوى الفخم (تفاصيل المنتج)
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs">المميزات</Label>
                                <Textarea
                                    placeholder="اكتب مميزات المنتج..."
                                    value={form.featuresAr}
                                    onChange={(e) => setForm({ ...form, featuresAr: e.target.value })}
                                    rows={2}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">طريقة الاستخدام</Label>
                                <Textarea
                                    placeholder="كيف يستخدم؟..."
                                    value={form.usageAr}
                                    onChange={(e) => setForm({ ...form, usageAr: e.target.value })}
                                    rows={2}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">المكونات</Label>
                                <Textarea
                                    placeholder="مما يتكون المنتج؟..."
                                    value={form.ingredientsAr}
                                    onChange={(e) => setForm({ ...form, ingredientsAr: e.target.value })}
                                    rows={2}
                                />
                            </div>
                        </div>
                    </div>
                    {/* 6. المخزون والتصنيف */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>المخزون</Label>
                            <Input type="number" placeholder="10" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>التصنيف</Label>
                            <Select value={form.categoryId} onValueChange={(value) => setForm({ ...form, categoryId: value })}>
                                <SelectTrigger><SelectValue placeholder="اختر التصنيف" /></SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (<SelectItem key={cat.id} value={cat.id}>{cat.nameAr}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 7. حالة التوفر في المخزن (ميزة جديدة) */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-blue-500" />
                                حالة التوفر
                            </Label>
                            <Select
                                value={form.inStock ? "available" : "preorder"}
                                onValueChange={(value) => {
                                    const isAvailable = value === "available";
                                    setForm({
                                        ...form,
                                        inStock: isAvailable,
                                        estimatedDays: isAvailable ? "" : "14" // قيمة افتراضية 14 يوم إذا سيتم طلبه
                                    });
                                }}
                            >
                                <SelectTrigger className={form.inStock ? "border-green-300" : "border-orange-300"}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="available">متوفر في المخزن</SelectItem>
                                    <SelectItem value="preorder">سيتم طلبه عند الطلب</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* رسالة تنبيه مدة التوصيل تظهر إذا كان سيتم طلبه */}
                    {!form.inStock && (
                        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <p className="text-sm text-orange-700">
                                ?? بما أن المنتج سيتم طلبه، يرجى تحديد المدة المتوقعة للتوصيل بالأيام:
                            </p>
                            <Input
                                type="number"
                                placeholder="مثال: 14"
                                value={form.estimatedDays}
                                onChange={(e) => setForm({ ...form, estimatedDays: e.target.value })}
                                className="mt-2 max-w-[200px]"
                            />
                            <p className="text-xs text-orange-500 mt-1">سيظهر للعميل: "التوصيل من أسبوع إلى 3 أسابيع"</p>
                        </div>
                    )}

                    {/* التبديلات */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Switch checked={form.isFeatured} onCheckedChange={(checked) => setForm({ ...form, isFeatured: checked })} />
                                <Label className="cursor-pointer">منتج مميز</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
                                <Label className="cursor-pointer">نشط</Label>
                            </div>
                        </div>
                    </div>

                    {/* أزرار الحفظ */}
                    <div className="flex gap-3 pt-4">
                        <Button variant="outline" className="flex-1" onClick={onClose}>إلغاء</Button>
                        <Button
                            className="flex-1 bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
                            onClick={handleSave}
                            disabled={isSaving || isUploadingImages}
                        >
                            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin ml-2" /> : <Save className="h-4 w-4 ml-2" />}
                            {selectedProduct ? "حفظ التغييرات" : "إضافة المنتج"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
