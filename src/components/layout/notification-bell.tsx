"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Trash2, ExternalLink } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { pusherClient } from "@/lib/pusher";

export function NotificationBell({ userId }: { userId: string }) {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const router = useRouter();

    // دالة حذف التقييم مباشرة من سجل الإشعارات
    const handleDeleteReview = async (e: React.MouseEvent, reviewId: string, notificationId: string) => {
        e.stopPropagation(); // يمنع فتح صفحة المنتج عند الضغط على زر الحذف

        if (!confirm("هل أنت متأكد من حذف هذا التقييم؟ سيختفي من الموقع نهائياً.")) return;

        try {
            const token = localStorage.getItem("token");
            // نرسل طلب الحذف للـ API اللي جهزناه (بمعرف التقييم ومعرف المستخدم الحالي)
            const res = await fetch(`/api/reviews`, {
                method: 'DELETE',
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ reviewId }) // إرسال المعرف داخل الـ Body
            });

            if (res.ok) {
                toast({ title: "تم الحذف", description: "تمت إزالة التقييم المسيء بنجاح." });

                // تحديث القائمة فوراً لحذف الإشعار من القائمة أمامك
                setNotifications(prev => prev.filter(n => n.id !== notificationId));
            } else {
                const err = await res.json();
                toast({ title: "خطأ", description: err.error, variant: "destructive" });
            }
        } catch (err) {
            toast({ title: "خطأ", description: "تعذر الاتصال بالسيرفر", variant: "destructive" });
        }
    };

    // 1. وظيفة لجلب الإشعارات القديمة من Supabase (عبر الـ API الذي أنشأته أنت)
    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const res = await fetch("/api/notifications", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setNotifications(data);
                setUnreadCount(data.filter((n: any) => !n.isRead).length);
            }
        } catch (error) {
            console.error("فشل في جلب الإشعارات");
        }
    };

    useEffect(() => {
        fetchNotifications();

        // 2. الربط اللحظي (Pusher): الاستماع لأي إشعار جديد يصل الآن
        if (!pusherClient) return;

        const channel = pusherClient.subscribe(`user-${userId}`);
        channel.bind("new-notification", (data: any) => {
            // نضع الإشعار الجديد في أول القائمة ونزيد العداد
            setNotifications((prev) => [data, ...prev]);
            setUnreadCount((prev) => prev + 1);

            // إظهار الإشعار المنبثق
            toast({
                title: data.title,
                description: data.message,
                duration: 5000,
            });
        });

        return () => {
            pusherClient.unsubscribe(`user-${userId}`);
        };
    }, [userId]);

    return (
        <DropdownMenu onOpenChange={async (open) => {
            if (open && unreadCount > 0) {
                setUnreadCount(0);
                const token = localStorage.getItem("token");
                if (token) {
                    await fetch("/api/notifications", {
                        method: "PATCH",
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                }
            }
        }}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative hover:bg-[#FAF7F2] rounded-full h-10 w-10">
                    <Bell className="h-5 w-5 text-[#3D3021]" />

                    {/* الدائرة الحمراء الصغيرة للرقم */}
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-[10px] rounded-full border-2 border-white shadow-sm font-bold">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-80 bg-white shadow-2xl border-t-4 border-[#C9A962] rounded-xl z-[60]">
                <DropdownMenuLabel className="text-right font-bold text-[#3D3021] py-3">الإشعارات</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <div className="max-h-[350px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-400">لا توجد إشعارات حالياً</div>
                    ) : (
                        notifications.map((n, i) => {
                            // فك تشفير البيانات (productId و reviewId) التي أرسلها السيرفر
                            const extraData = n.data ? JSON.parse(n.data) : {};

                            return (
                                <DropdownMenuItem 
                                    key={i} 
                                    // عند الضغط على الإشعار، يتم نقلك لصفحة المنتج فوراً
                                    onClick={() => extraData.productId && router.push(`/products/${extraData.productId}`)}
                                    className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-[#FAF7F2] transition-colors cursor-pointer group"
                                >
                                    <div className="flex flex-col items-start text-right flex-1 ml-2">
                                        <div className="flex items-center gap-1">
                                            <span className="font-bold text-sm text-[#3D3021]">{n.title}</span>
                                            {extraData.productId && <ExternalLink className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                        </div>
                                        <span className="text-xs text-gray-500 mt-1 leading-relaxed">{n.message}</span>
                                    </div>

                                    {/* زر الحذف الأحمر: يظهر فقط إذا كان نوع الإشعار "تقييم جديد" ولديه معرف تقييم */}
                                    {n.type === 'NEW_RATING' && extraData.reviewId && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-full flex-shrink-0 transition-all ml-2"
                                            onClick={(e) => handleDeleteReview(e, extraData.reviewId, n.id)}
                                            title="حذف التقييم نهائياً"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </DropdownMenuItem>
                            );
                        })
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}