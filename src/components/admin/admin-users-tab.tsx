"use client";

import { useState, useEffect } from "react";
import {
    Users,
    Search,
    RefreshCw,
    Eye,
    UserCheck,
    CheckCircle,
    XCircle,
    Mail,
    Phone,
    MapPin,
    UserPlus,
    Store,        // 👈 تأكدنا إنها موجودة هنا
    ShieldCheck   // 👈 موجودة هنا مرة واحدة فقط
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface User {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string | null;
    role: string;
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
    _count: {
        products: number;
        orders: number;
        messages: number;
    };
}

interface AdminUsersTabProps {
    users: User[];
    onRefresh: () => void;
    handleToggleUserStatus: (userId: string, isActive: boolean) => void;
    handleUpdateRole: (userId: string, newRole: string) => void; // 👈 الدالة الجديدة الشاملة
    formatDate: (date: string) => string;
}
// دالة مساعدة لتوليد بريد إلكتروني آلي من الأسماء العربية
const generateAutoEmail = (fullName: string, storeName?: string) => {
    // مصفوفة بسيطة لتحويل أهم الحروف العربية لنظيرتها الإنجليزية (Transliteration)
    const charMap: { [key: string]: string } = {
        'أ': 'a', 'إ': 'i', 'آ': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh',
        'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't',
        'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
        'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a', 'ة': 'h', 'ؤ': 'u', 'ئ': 'y'
    };

    const cleanText = (text: string) => {
        return text
            .split('')
            .map(char => charMap[char] || char) // تحويل الحروف المعرفة
            .join('')
            .toLowerCase()
            .replace(/\s+/g, '') // إزالة المسافات
            .replace(/[^a-z0-9]/g, ''); // إزالة أي رموز غريبة
    };

    const namePart = cleanText(fullName.split(' ')[0]); // أول اسم فقط
    const storePart = storeName ? cleanText(storeName) : "";

    // توليد البريد: اسم التاجر + اسم المحل (أو رقم عشوائي لو المحل مش موجود)
    const suffix = storePart || Math.floor(Math.random() * 1000);
    return `${namePart}.${suffix}@tarfah.app`; // نطاق خاص بمتجر ترفة
};
export function AdminUsersTab({
    users,
    onRefresh,
    handleToggleUserStatus,
    handleUpdateRole, // 👈 أضفنا الدالة الجديدة هنا
    formatDate
}: AdminUsersTabProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const { toast } = useToast();
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    // حالات التحكم في نوافذ إنشاء الحسابات الجديدة
    const [isAddMerchantOpen, setIsAddMerchantOpen] = useState(false);
    const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false); // حالة التحميل أثناء الإنشاء

    // حالة سجل الحسابات المولدة (سنستخدمها لاحقاً)
    const [isGeneratedLogsOpen, setIsGeneratedLogsOpen] = useState(false);
    const [generatedAccounts, setGeneratedAccounts] = useState<Array<{name: string, email: string, role: string, password: string}>>([]);
    // بيانات نموذج التاجر الجديد
    const [merchantForm, setMerchantForm] = useState({
        fullName: "",
        storeName: "",
        storeType: "",
        phone: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    // بيانات نموذج العميل/المندوب الجديد
    const [customerForm, setCustomerForm] = useState({
        fullName: "",
        phone: "",
        email: "",
        address: "",
        password: "",
        confirmPassword: ""
    });

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone.includes(searchTerm)
    );

    const getRoleBadge = (role: string) => {
        const roleMap: Record<string, { label: string; className: string }> = {
            ADMIN: { label: "الإدارة", className: "bg-[var(--gold)]" },
            AGENT: { label: "مندوبة", className: "bg-purple-500" },
            CUSTOMER: { label: "عميلة", className: "bg-[var(--rose)]" },
        };
        const r = roleMap[role] || { label: role, className: "bg-gray-500" };
        return <Badge className={r.className}>{r.label}</Badge>;
    };
    // دالة إنشاء حساب التاجر وإرساله للسيرفر
    const handleSaveMerchant = async () => {
        // 1. التحقق من البيانات الأساسية
        if (!merchantForm.fullName || !merchantForm.storeName || !merchantForm.phone || !merchantForm.password) {
            toast({ title: "خطأ", description: "يرجى ملء جميع الحقول الإجبارية", variant: "destructive" });
            return;
        }

        // 2. التحقق من تطابق كلمة المرور
        if (merchantForm.password !== merchantForm.confirmPassword) {
            toast({ title: "خطأ", description: "كلمات المرور غير متطابقة", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch("/api/admin/create-manual-user", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    ...merchantForm,
                    role: "MERCHANT", // تحديد الرتبة كتاجر
                    isVerified: true, // تفعيل تلقائي
                    isActive: true    // نشط فوراً
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast({ title: "تم بنجاح", description: "تم إنشاء حساب التاجر وتفعيله فوراً" });
                setIsAddMerchantOpen(false); // إغلاق النافذة
                setMerchantForm({ fullName: "", storeName: "", storeType: "", phone: "", email: "", password: "", confirmPassword: "" });
                setGeneratedAccounts(prev => [{ name: merchantForm.fullName, email: merchantForm.email, role: "MERCHANT", password: merchantForm.password }, ...prev]);
                onRefresh(); // تحديث قائمة المستخدمين لرؤية التاجر الجديد
            } else {
                throw new Error(data.error || "فشل إنشاء الحساب");
            }
        } catch (error: any) {
            toast({ title: "فشل الإنشاء", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    // دالة إنشاء حساب عميل أو مندوب
    const handleSaveCustomer = async (targetRole: "CUSTOMER" | "AGENT") => {
        // 1. التحقق من البيانات
        if (!customerForm.fullName || !customerForm.phone || !customerForm.password) {
            toast({ title: "خطأ", description: "يرجى ملء الحقول الأساسية (الاسم، الهاتف، كلمة المرور)", variant: "destructive" });
            return;
        }

        if (customerForm.password !== customerForm.confirmPassword) {
            toast({ title: "خطأ", description: "كلمات المرور غير متطابقة", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch("/api/admin/create-manual-user", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    ...customerForm,
                    role: targetRole, // نرسل الرتبة المختارة (عميل أو مندوب)
                    isVerified: true,
                    isActive: true
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "تم الإنشاء",
                    description: `تم إنشاء حساب ${targetRole === "AGENT" ? "مندوبة" : "عميلة"} بنجاح`
                });
                setIsAddCustomerOpen(false);
                setCustomerForm({ fullName: "", phone: "", email: "", address: "", password: "", confirmPassword: "" });
                setGeneratedAccounts(prev => [{ name: customerForm.fullName, email: customerForm.email, role: targetRole, password: customerForm.password }, ...prev]);
                onRefresh();
            } else {
                throw new Error(data.error || "فشل إنشاء الحساب");
            }
        } catch (error: any) {
            toast({ title: "خطأ في النظام", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    const handleResetManualPassword = async (email: string) => {
        // 1. توليد كلمة مرور عشوائية جديدة من 8 أرقام وحروف
        const newPassword = Math.random().toString(36).slice(-8);

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            // 2. إرسال طلب للسيرفر لتحديث الباسورد في قاعدة البيانات
            const response = await fetch("/api/admin/reset-manual-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ email, newPassword }),
            });

            const data = await response.json();

            if (data.success) {
                // 3. تحديث السجل (الذاكرة) بكلمة المرور الجديدة عشان تظهر في الجدول فوراً
                setGeneratedAccounts(prev => prev.map(acc =>
                    acc.email === email ? { ...acc, password: newPassword } : acc
                ));
                // 1. نسخ الباسورد الجديد للحافظة فوراً بدون تدخلك
                navigator.clipboard.writeText(newPassword);

                // 2. إظهار تنبيه "صامل" ما يختفي إلا بضغطك على موافق
                alert(`✅ تم تغيير الباسورد بنجاح!\n\nالباسورد الجديد هو: ${newPassword}\n\n(ملاحظة: تم نسخ الباسورد تلقائياً، يمكنك لصقه الآن لأي شخص)`);

                toast({ title: "تم النسخ", description: "الباسورد الجديد في الحافظة الآن" });
                /*
                toast({
                    title: "تم تغيير كلمة المرور",
                    description: `كلمة المرور الجديدة هي: ${newPassword}`,
                });*/
            } else {
                throw new Error(data.error || "فشل تحديث كلمة المرور");
            }
        } catch (error: any) {
            toast({ title: "خطأ", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Card className="border-0 shadow-lg">
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Users className="h-6 w-6 text-[var(--gold)]" />
                        <CardTitle>إدارة مستخدمي النظام</CardTitle>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* زر إنشاء حساب تاجر */}
                        <Button
                            onClick={() => setIsAddMerchantOpen(true)}
                            className="bg-[var(--gold)] hover:bg-[var(--gold-dark)] text-white shadow-sm gap-2"
                        >
                            <Store className="h-4 w-4" />
                            <span>إنشاء حساب تاجر</span>
                        </Button>

                        {/* زر إنشاء حساب عميل/مندوب */}
                        <Button
                            onClick={() => setIsAddCustomerOpen(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm gap-2"
                        >
                            <UserPlus className="h-4 w-4" />
                            <span>إنشاء عميل/مندوب</span>
                        </Button>

                        {/* زر سجل الحسابات المولدة (أيقونة الأرشيف) */}
                        <Button
                            variant="outline"
                            onClick={() => setIsGeneratedLogsOpen(true)}
                            title="سجل الحسابات التي تم توليدها"
                            className="border-gray-200"
                        >
                            <RefreshCw className="h-4 w-4 text-blue-600" />
                        </Button>

                        {/* زر التحديث الأصلي */}
                        <Button onClick={onRefresh} variant="outline" size="sm" className="gap-2">
                            <RefreshCw className="h-4 w-4" />
                            تحديث
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 mb-4 relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="بحث عن مستخدم..."
                            className="pr-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="w-full overflow-x-auto h-[600px] overflow-y-auto rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>المستخدم</TableHead>
                                    <TableHead>البريد الإلكتروني</TableHead>
                                    <TableHead>رقم الجوال</TableHead>
                                    <TableHead>الدور</TableHead>
                                    <TableHead>الحالة</TableHead>
                                    <TableHead>تاريخ التسجيل</TableHead>
                                    <TableHead>إجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((u) => (
                                    <TableRow key={u.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Avatar>
                                                    <AvatarFallback className="bg-[var(--gold)] text-white">
                                                        {u.name.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{u.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{u.email}</TableCell>
                                        <TableCell>{u.phone}</TableCell>
                                        <TableCell>{getRoleBadge(u.role)}</TableCell>
                                        <TableCell>
                                            {u.isVerified ? (
                                                <Badge className="bg-green-500">موثق</Badge>
                                            ) : (
                                                <Badge className="bg-gray-400">غير موثق</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>{formatDate(u.createdAt)}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2 flex-wrap">
                                                <Button size="sm" variant="ghost" onClick={() => setSelectedUser(u)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                {/* زر إعادة تعيين الباسورد لأي مستخدم في النظام */}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    title="إعادة تعيين كلمة المرور"
                                                    className="text-orange-600 border-orange-200 hover:bg-orange-50 h-8 w-8 p-0"
                                                    onClick={() => {
                                                        if (confirm(`هل أنت متأكد من إعادة تعيين باسورد ${u.name}؟`)) {
                                                            handleResetManualPassword(u.email);
                                                        }
                                                    }}
                                                >
                                                    <RefreshCw className="h-4 w-4" />
                                                </Button>
                                                {u.role === "CUSTOMER" && (
                                                    <Button size="sm" variant="outline" className="text-purple-600 border-purple-300 hover:bg-purple-50" onClick={() => handleUpgradeToAgent(u.id)}>
                                                        <UserPlus className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {u.role === "AGENT" && (
                                                    <Button size="sm" variant="outline" className="text-orange-600 border-orange-300 hover:bg-orange-50" onClick={() => handleDowngradeToCustomer(u.id)}>
                                                        <UserCheck className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button size="sm" variant={u.isActive ? "destructive" : "default"} onClick={() => handleToggleUserStatus(u.id, !u.isActive)}>
                                                    {u.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>تفاصيل المستخدم</DialogTitle>
                        <DialogDescription className="sr-only">عرض بيانات المستخدم المحدد</DialogDescription>
                    </DialogHeader>
                    {selectedUser && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <Avatar className="w-16 h-16">
                                    <AvatarFallback className="bg-[var(--gold)] text-white text-xl">
                                        {selectedUser.name.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-bold text-lg">{selectedUser.name}</p>
                                    {getRoleBadge(selectedUser.role)}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-[var(--muted-foreground)]">البريد:</span>
                                    <span>{selectedUser.email}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[var(--muted-foreground)]">الجوال:</span>
                                    <span>{selectedUser.phone}</span>
                                </div>
                                {selectedUser.address && (
                                    <div className="flex justify-between">
                                        <span className="text-[var(--muted-foreground)]">العنوان:</span>
                                        <span>{selectedUser.address}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-[var(--muted-foreground)]">التسجيل:</span>
                                    <span>{formatDate(selectedUser.createdAt)}</span>
                                </div>
                                <hr />
                                <div className="flex justify-between">
                                    <span className="text-[var(--muted-foreground)]">الطلبات:</span>
                                    <span>{selectedUser._count.orders}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[var(--muted-foreground)]">المنتجات:</span>
                                    <span>{selectedUser._count.products}</span>
                                </div>
                            </div>

                            {/* --- أضف الكود هنا (تحت العدادات مباشرة) --- */}
                            <div className="pt-4 border-t space-y-3">
                                <p className="text-xs font-black text-gray-800 flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-purple-600" /> إدارة صلاحيات ورتبة المستخدم:
                                </p>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <Select
                                            defaultValue={selectedUser.role}
                                            onValueChange={(value) => handleUpdateRole(selectedUser.id, value)}
                                        >
                                            <SelectTrigger className="w-full h-11 border-gray-200 focus:ring-purple-500">
                                                <SelectValue placeholder="اختر الرتبة..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="CUSTOMER">عميلة (زبون عادي)</SelectItem>
                                                <SelectItem value="AGENT">مندوبة (توصيل/تسويق)</SelectItem>
                                                <SelectItem value="MERCHANT">تاجر (صاحب متجر)</SelectItem>
                                                <SelectItem value="ADMIN">مدير (صلاحيات كاملة)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Badge variant="outline" className="h-11 px-3 bg-purple-50 text-purple-700 border-purple-200">
                                        الرتبة الحالية
                                    </Badge>
                                </div>
                                <p className="text-[10px] text-gray-400 italic">
                                    * ملاحظة: تغيير الرتبة يمنح المستخدم صلاحيات فورية لدخول لوحات التحكم الخاصة بكل دور.
                                </p>
                            </div>
                         

                        </div>
                    )}
                </DialogContent>

            </Dialog>
            {/* 📋 نافذة سجل الحسابات المولدة آلياً */}
            <Dialog open={isGeneratedLogsOpen} onOpenChange={setIsGeneratedLogsOpen}>
                <DialogContent className="max-w-3xl rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-6 bg-gray-800 text-white">
                        <DialogTitle className="text-xl font-black flex items-center gap-2">
                            <RefreshCw className="h-6 w-6 text-blue-400" /> سجل الحسابات المولدة (إدارة ترفة)
                        </DialogTitle>
                        <DialogDescription className="text-gray-300">
                            هنا تجد قائمة بجميع الحسابات التي أنشأتها يدوياً للعملاء والتجار والمناديب
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-0 max-h-[60vh] overflow-y-auto">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead className="font-bold">الاسم</TableHead>
                                    <TableHead className="font-bold">البريد المولد</TableHead>
                                    <TableHead className="font-bold">الدور</TableHead>
                                    <TableHead className="text-left font-bold">إجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {generatedAccounts.length > 0 ? (
                                    generatedAccounts.map((acc, index) => (
                                        <TableRow key={index} className="hover:bg-gray-50">
                                            <TableCell className="font-bold text-gray-700">{acc.name}</TableCell>
                                            <TableCell className="font-mono text-xs text-blue-600">{acc.email}</TableCell>
                                            <TableCell>{getRoleBadge(acc.role)}</TableCell>
                                            <TableCell className="text-left">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-xs h-8 gap-1 border-green-200 text-green-700"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`البريد: ${acc.email}\nكلمة المرور: ${acc.password}`);
                                                        toast({ title: "تم النسخ", description: "تم نسخ بيانات الدخول للحافظة" });
                                                    }}
                                                >
                                                    نسخ البيانات 📋
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-xs h-8 gap-1 border-orange-200 text-orange-700 mr-2"
                                                    onClick={() => handleResetManualPassword(acc.email)}
                                                >
                                                    تغيير الباسورد 🔑
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-10 text-gray-400 italic">
                                            لا يوجد حسابات مولدة حالياً.. ابدأ بإنشاء أول حساب!
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="p-4 bg-gray-50 border-t flex justify-end">
                        <Button
                            variant="secondary"
                            onClick={() => setIsGeneratedLogsOpen(false)}
                        >
                            إغلاق السجل
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
            {/* 👥 نافذة إنشاء حساب عميل أو مندوب جديد */}
            <Dialog open={isAddCustomerOpen} onOpenChange={isAddCustomerOpen ? () => setIsAddCustomerOpen(false) : undefined}>
                <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-6 bg-gradient-to-r from-purple-700 to-purple-500 text-white">
                        <DialogTitle className="text-2xl font-black flex items-center gap-2">
                            <UserPlus className="h-6 w-6" /> إنشاء حساب جديد (عميل / مندوب)
                        </DialogTitle>
                        <DialogDescription className="text-white/80 font-medium">
                            أدخل بيانات المستخدم ليتم توليد بريد إلكتروني رسمي له فوراً
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold">الاسم الكامل *</Label>
                            <Input
                                placeholder="مثال: سارة محمد الأحمد"
                                value={customerForm.fullName}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const newEmail = generateAutoEmail(val); // توليد آلي بالاسم فقط
                                    setCustomerForm({ ...customerForm, fullName: val, email: newEmail });
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold">رقم الهاتف *</Label>
                                <Input
                                    placeholder="+967..."
                                    dir="ltr"
                                    value={customerForm.phone}
                                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-purple-600">البريد المولد ⚡</Label>
                                <Input
                                    className="bg-purple-50 border-purple-200 font-mono text-xs"
                                    readOnly
                                    dir="ltr"
                                    value={customerForm.email}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold">العنوان التفصيلي (اختياري)</Label>
                            <Input
                                placeholder="المدينة، الحي، اسم الشارع"
                                value={customerForm.address}
                                onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold">كلمة المرور *</Label>
                                <Input
                                    type="password"
                                    placeholder="********"
                                    value={customerForm.password}
                                    onChange={(e) => setCustomerForm({ ...customerForm, password: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold">تأكيد كلمة المرور *</Label>
                                <Input
                                    type="password"
                                    placeholder="********"
                                    value={customerForm.confirmPassword}
                                    onChange={(e) => setCustomerForm({ ...customerForm, confirmPassword: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 border-t flex flex-col sm:flex-row gap-3">
                        <Button
                            variant="outline"
                            type="button"
                            onClick={() => setIsAddCustomerOpen(false)}
                            className="flex-1"
                        >
                            إلغاء
                        </Button>
                        {/* زر الحفظ كعميلة - باللون الأزرق */}
                        <Button
                            type="button"
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md"
                            onClick={() => handleSaveCustomer("CUSTOMER")}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin ml-2" /> : "إنشاء كعميلة ✅"}
                        </Button>
                        {/* زر الحفظ كمندوبة - باللون البنفسجي */}
                        <Button
                            type="button"
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md"
                            onClick={() => handleSaveCustomer("AGENT")}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin ml-2" /> : "إنشاء كمندوبة 🚀"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
            {/* 🏪 نافذة إنشاء حساب تاجر جديد */}
            <Dialog open={isAddMerchantOpen} onOpenChange={setIsAddMerchantOpen}>
                <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-6 bg-gradient-to-r from-[var(--gold-dark)] to-[var(--gold)] text-white">
                        <DialogTitle className="text-2xl font-black flex items-center gap-2">
                            <Store className="h-6 w-6" /> تسجيل تاجر جديد (إدارة)
                        </DialogTitle>
                        <DialogDescription className="text-white/80 font-medium">
                            سيتم إنشاء الحساب وتفعيله فوراً بدون كود تحقق
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold">اسم المحل *</Label>
                                    <Input
                                    placeholder="مثال: عطور مكة"
                                    value={merchantForm.storeName}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const newEmail = generateAutoEmail(merchantForm.fullName, val);
                                        setMerchantForm({ ...merchantForm, storeName: val, email: newEmail });
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold">نوع المنتجات *</Label>
                                <Input
                                    placeholder="ملابس، عطور، إلخ"
                                    value={merchantForm.storeType}
                                    onChange={(e) => setMerchantForm({ ...merchantForm, storeType: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold">الاسم الكامل للتاجر *</Label>
                            <Input
                                placeholder="الاسم الرباعي"
                                value={merchantForm.fullName}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const newEmail = generateAutoEmail(val, merchantForm.storeName);
                                    setMerchantForm({ ...merchantForm, fullName: val, email: newEmail });
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold">رقم الهاتف *</Label>
                                <Input
                                    placeholder="+967..."
                                    dir="ltr"
                                    value={merchantForm.phone}
                                    onChange={(e) => setMerchantForm({ ...merchantForm, phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-blue-600">البريد الإلكتروني (توليد آلي) ⚡</Label>
                                <Input
                                    className="bg-blue-50 border-blue-200 font-mono text-xs"
                                    readOnly
                                    dir="ltr"
                                    value={merchantForm.email}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold">كلمة المرور *</Label>
                                <Input
                                    type="password"
                                    placeholder="********"
                                    value={merchantForm.password}
                                    onChange={(e) => setMerchantForm({ ...merchantForm, password: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold">تأكيد كلمة المرور *</Label>
                                <Input
                                    type="password"
                                    placeholder="********"
                                    value={merchantForm.confirmPassword}
                                    onChange={(e) => setMerchantForm({ ...merchantForm, confirmPassword: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 border-t flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => setIsAddMerchantOpen(false)}
                        >
                            إلغاء
                        </Button>
                        <Button
                            className="flex-1 bg-[var(--gold)] hover:bg-[var(--gold-dark)] text-white font-bold shadow-lg"
                            onClick={handleSaveMerchant}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <RefreshCw className="h-4 w-4 animate-spin ml-2" />
                            ) : (
                                "توليد الحساب والدخول 🚀"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}