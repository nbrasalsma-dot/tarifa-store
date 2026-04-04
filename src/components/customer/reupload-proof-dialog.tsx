"use client";

import { useState, useRef } from "react";
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
import {
    Upload,
    Loader2,
    ImageIcon,
    CheckCircle,
    AlertCircle,
    Send,
    X
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { uploadImage } from "@/lib/upload";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReuploadProofDialogProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
    onSuccess: () => void;
}

export function ReuploadProofDialog({
    isOpen,
    onClose,
    order,
    onSuccess,
}: ReuploadProofDialogProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newProofImage, setNewProofImage] = useState("");
    const [newTransferNumber, setNewTransferNumber] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!order) return null;

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            // ⚡ تحديد مسار المجلد: إثباتات الدفع / رقم العميل المرتبط بالطلب
            const userId = order.customerId || order.userId;
            const folderPath = `/Payment_Proofs/User_${userId}`;

            const result = await uploadImage(file, folderPath);
            if (result.success && result.url) {
                setNewProofImage(result.url);
                toast({ title: "تم الرفع", description: "تم حفظ الصورة في السحابة ?" });
            } else {
                throw new Error("فشل الرفع");
            }
        } catch (error) {
            toast({ title: "خطأ", description: "فشل رفع الصورة، حاول مرة أخرى", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async () => {
        if (!newProofImage && !newTransferNumber) {
            toast({ title: "تنبيه", description: "يرجى إرفاق إثبات جديد (صورة أو رقم حوالة)", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            // تحديث الطلب ببيانات الدفع الجديدة وإعادته لحالة PENDING
            const response = await fetch(`/api/orders`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orderId: order.id,
                    status: "PENDING", // إعادة الطلب للمراجعة
                    paymentDetails: {
                        ...order.paymentDetails,
                        proofImage: newProofImage || order.paymentDetails?.proofImage,
                        transferNumber: newTransferNumber || order.paymentDetails?.transferNumber,
                        reuploadedAt: new Date().toISOString(),
                    }
                }),
            });

            if (response.ok) {
                toast({ title: "تم بنجاح", description: "تم إرسال الإثبات الجديد للإدارة" });
                onSuccess();
                onClose();
            } else {
                throw new Error("فشل التحديث");
            }
        } catch (error) {
            toast({ title: "خطأ", description: "حدث خطأ أثناء إرسال البيانات", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-none rounded-2xl shadow-2xl bg-white">
                <DialogHeader className="p-4 bg-gradient-to-r from-red-500 to-red-600 text-white">
                    <DialogTitle className="flex items-center gap-2 text-lg font-black">
                        <AlertCircle className="h-5 w-5" /> تصحيح إثبات الدفع
                    </DialogTitle>
                    <DialogDescription className="text-red-100 text-xs font-medium">
                        للطلب رقم: #{order.id.slice(-8)}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[80vh] w-full">
                    <div className="p-6 space-y-6">
                        {/* تنبيه تعليمي */}
                        <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-3 items-start">
                            <div className="bg-amber-100 p-1.5 rounded-full">
                                <AlertCircle className="h-4 w-4 text-amber-700" />
                            </div>
                            <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                                يرجى التأكد من أن صورة الحوالة الجديدة واضحة جداً وتظهر كامل البيانات (المبلغ، التاريخ، واسم المستلم) لتفادي رفض الطلب مرة أخرى.
                            </p>
                        </div>

                        {/* رقم الحوالة */}
                        <div className="space-y-2">
                            <Label className="text-sm font-black text-gray-700">رقم الحوالة الجديد (إن وجد)</Label>
                            <Input
                                placeholder="أدخل رقم الحوالة الصحيح هنا..."
                                value={newTransferNumber}
                                onChange={(e) => setNewTransferNumber(e.target.value)}
                                className="h-11 border-gray-200 focus:border-red-500 transition-all"
                            />
                        </div>

                        {/* رفع الصورة */}
                        <div className="space-y-2">
                            <Label className="text-sm font-black text-gray-700">صورة الإثبات الجديدة *</Label>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                            />

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`
                                    border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300
                                    ${newProofImage ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-red-400 hover:bg-red-50'}
                                `}
                            >
                                {isUploading ? (
                                    <Loader2 className="h-10 w-10 animate-spin text-red-500" />
                                ) : newProofImage ? (
                                    <>
                                        <div className="relative w-full h-32 mb-2">
                                            <img src={newProofImage} className="w-full h-full object-contain rounded-lg" alt="new proof" />
                                            <div className="absolute top-0 right-0 bg-green-500 text-white rounded-full p-1 shadow-lg">
                                                <CheckCircle className="h-4 w-4" />
                                            </div>
                                        </div>
                                        <p className="text-xs text-green-700 font-bold">تم اختيار صورة الحوالة بنجاح</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="bg-red-100 p-3 rounded-full mb-3 text-red-600">
                                            <Upload className="h-6 w-6" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-600">اضغط لرفع صورة الحوالة</p>
                                        <p className="text-[10px] text-gray-400 mt-1">تنسيقات JPG, PNG (حد أقصى 5MB)</p>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* أزرار الأكشن */}
                        <div className="flex gap-3 pt-2">
                            <Button
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white h-12 font-black shadow-lg shadow-red-200"
                                onClick={handleSubmit}
                                disabled={isSubmitting || isUploading}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        <Send className="h-4 w-4 ml-2" /> إرسال للمراجعة
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                className="h-12 border-gray-200 text-gray-500"
                                onClick={onClose}
                            >
                                إلغاء
                            </Button>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}