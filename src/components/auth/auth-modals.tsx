"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Mail, 
  Lock, 
  User, 
  Phone, 
  MapPin, 
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AuthModalsProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}

// Password strength checker
function checkPasswordStrength(password: string): {
  score: number;
  checks: { label: string; passed: boolean }[];
} {
  return {
    score: [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*(),.?":{}|<>]/.test(password),
    ].filter(Boolean).length,
    checks: [
      { label: "8 أحرف على الأقل", passed: password.length >= 8 },
      { label: "حرف كبير (A-Z)", passed: /[A-Z]/.test(password) },
      { label: "حرف صغير (a-z)", passed: /[a-z]/.test(password) },
      { label: "رقم (0-9)", passed: /\d/.test(password) },
    ],
  };
}

export function AuthModals({ isOpen, onClose, defaultTab = "login" }: AuthModalsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [step, setStep] = useState<"form" | "verify">("form");
  const [userId, setUserId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""]);

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string>("");

  // Login form state
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  // Register form state
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    address: "",
  });

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStep, setResetStep] = useState<"email" | "verify" | "success">("email");
  const [resetUserId, setResetUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Clear errors when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setValidationErrors([]);
    setServerError("");
  };

  // Validate register form locally
  const validateRegisterForm = (): boolean => {
    const errors: string[] = [];

    if (!registerData.name || registerData.name.length < 2) {
      errors.push("الاسم يجب أن يكون حرفين على الأقل");
    }

    if (!registerData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerData.email)) {
      errors.push("البريد الإلكتروني غير صحيح");
    }

    const strength = checkPasswordStrength(registerData.password);
    if (strength.score < 4) {
      errors.push("كلمة المرور ضعيفة: يجب أن تحتوي على 8 أحرف، حرف كبير، حرف صغير، ورقم");
    }

    if (registerData.password !== registerData.confirmPassword) {
      errors.push("كلمات المرور غير متطابقة");
    }

    if (!registerData.phone || registerData.phone.length < 6) {
      errors.push("رقم الهاتف غير صحيح");
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Handle login
  const handleLogin = async () => {
    setServerError("");
    
    if (!loginData.email || !loginData.password) {
      setServerError("يرجى ملء جميع الحقول");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.needsVerification) {
          setUserId(data.userId);
          setStep("verify");
          toast({
            title: "تنبيه",
            description: "يرجى التحقق من بريدك الإلكتروني أولاً",
          });
        } else {
          setServerError(data.error || "حدث خطأ");
        }
        return;
      }

      toast({
        title: "مرحباً بك",
        description: "تم تسجيل الدخول بنجاح",
      });
      
      // Store user and token in localStorage
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      
      // Close dialog and reload with a small delay to ensure localStorage is saved
      onClose();
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      setServerError("حدث خطأ في الاتصال");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle register
  const handleRegister = async () => {
    setServerError("");
    setValidationErrors([]);

    // Local validation
    if (!validateRegisterForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerData.name,
          email: registerData.email,
          password: registerData.password,
          phone: registerData.phone,
          address: registerData.address,
          role: "CUSTOMER",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setServerError(data.error || "حدث خطأ أثناء إنشاء الحساب");
        
        // Show additional details if available
        if (data.details && Array.isArray(data.details)) {
          setValidationErrors(data.details);
        }
        return;
      }

      setUserId(data.userId);
      setStep("verify");
      toast({
        title: "تم إنشاء الحساب",
        description: "يرجى إدخال كود التحقق المرسل لبريدك",
      });

      // For testing - show the code
      if (data.verificationCode) {
        console.log("Verification Code:", data.verificationCode);
      }
    } catch (error) {
      setServerError("حدث خطأ في الاتصال");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle verification
  const handleVerify = async () => {
    const code = verificationCode.join("");
    if (code.length !== 6) {
      setServerError("يرجى إدخال الكود كاملاً");
      return;
    }

    setIsLoading(true);
    setServerError("");
    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          code,
          type: "EMAIL_VERIFICATION",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setServerError(data.error || "الكود غير صحيح");
        return;
      }

      toast({
        title: "تم التحقق",
        description: "تم التحقق من بريدك الإلكتروني بنجاح",
      });

      onClose();
      setStep("form");
      setActiveTab("login");
    } catch (error) {
      setServerError("حدث خطأ في الاتصال");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend code
  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/verify", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, type: "EMAIL_VERIFICATION" }),
      });

      const data = await response.json();

      if (!response.ok) {
        setServerError(data.error || "حدث خطأ");
        return;
      }

      toast({
        title: "تم الإرسال",
        description: "تم إرسال كود جديد لبريدك",
      });

      if (data.verificationCode) {
        console.log("New Verification Code:", data.verificationCode);
      }
    } catch (error) {
      setServerError("حدث خطأ في الاتصال");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = async () => {
    if (!resetEmail) {
      setServerError("يرجى إدخال البريد الإلكتروني");
      return;
    }

    setIsLoading(true);
    setServerError("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await response.json();

      if (data.userId) {
        setResetUserId(data.userId);
      }

      setResetStep("verify");
      toast({
        title: "تم الإرسال",
        description: data.message,
      });

      if (data.verificationCode) {
        console.log("Reset Code:", data.verificationCode);
      }
    } catch (error) {
      setServerError("حدث خطأ");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle reset password
  const handleResetPassword = async () => {
    const code = verificationCode.join("");
    if (code.length !== 6 || !newPassword) {
      setServerError("يرجى ملء جميع الحقول");
      return;
    }

    setIsLoading(true);
    setServerError("");
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: resetUserId,
          code,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setServerError(data.error || "حدث خطأ");
        return;
      }

      setResetStep("success");
      toast({
        title: "تم",
        description: "تم إعادة تعيين كلمة المرور بنجاح",
      });
    } catch (error) {
      setServerError("حدث خطأ");
    } finally {
      setIsLoading(false);
    }
  };

  // OTP Input handler
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newOtp = [...verificationCode];
    newOtp[index] = value;
    setVerificationCode(newOtp);

    // Auto focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  // Reset state on close
  const handleClose = () => {
    setStep("form");
    setVerificationCode(["", "", "", "", "", ""]);
    setShowForgotPassword(false);
    setResetStep("email");
    setValidationErrors([]);
    setServerError("");
    onClose();
  };

  // Password strength indicator
  const passwordStrength = checkPasswordStrength(registerData.password);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-lg border-[var(--gold)]/20 max-h-[90vh] overflow-y-auto">
        <AnimatePresence mode="wait">
          {showForgotPassword ? (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <DialogHeader>
                <DialogTitle className="text-xl text-center">
                  استعادة كلمة المرور
                </DialogTitle>
                <DialogDescription className="text-center">
                  {resetStep === "email" && "أدخلي بريدك الإلكتروني لاستعادة كلمة المرور"}
                  {resetStep === "verify" && "أدخلي الكود المرسل لبريدك وكلمة المرور الجديدة"}
                  {resetStep === "success" && "تم إعادة تعيين كلمة المرور بنجاح"}
                </DialogDescription>
              </DialogHeader>

              {/* Error Alert */}
              {serverError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              <div className="mt-4 space-y-4">
                {resetStep === "email" && (
                  <>
                    <div className="space-y-2">
                      <Label>البريد الإلكتروني</Label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                          type="email"
                          placeholder="example@email.com"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className="pr-10"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleForgotPassword}
                      disabled={isLoading}
                      className="w-full bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
                    >
                      {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "إرسال"}
                    </Button>
                  </>
                )}

                {resetStep === "verify" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-center block">كود التحقق</Label>
                      <div className="flex gap-2 justify-center" dir="ltr">
                        {verificationCode.map((digit, index) => (
                          <Input
                            key={index}
                            id={`otp-${index}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(index, e.target.value)}
                            className="w-12 h-12 text-center text-xl font-bold border-[var(--gold)]/30 focus:border-[var(--gold)]"
                          />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>كلمة المرور الجديدة</Label>
                      <div className="relative">
                        <Lock className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                          type="password"
                          placeholder="••••••••"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="pr-10"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleResetPassword}
                      disabled={isLoading}
                      className="w-full bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
                    >
                      {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "تأكيد"}
                    </Button>
                  </>
                )}

                {resetStep === "success" && (
                  <div className="text-center py-6">
                    <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    <p className="text-gray-600">يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة</p>
                    <Button
                      onClick={() => {
                        setShowForgotPassword(false);
                        setResetStep("email");
                      }}
                      className="mt-4 bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
                    >
                      تسجيل الدخول
                    </Button>
                  </div>
                )}

                {resetStep !== "success" && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetStep("email");
                      setServerError("");
                    }}
                    className="w-full"
                  >
                    <ArrowLeft className="h-4 w-4 ml-2" />
                    العودة لتسجيل الدخول
                  </Button>
                )}
              </div>
            </motion.div>
          ) : step === "verify" ? (
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <DialogHeader>
                <DialogTitle className="text-xl text-center">
                  تحقق من بريدك
                </DialogTitle>
                <DialogDescription className="text-center">
                  أدخلي الكود المكون من 6 أرقام المرسل لبريدك الإلكتروني
                </DialogDescription>
              </DialogHeader>

              {/* Error Alert */}
              {serverError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-center block">كود التحقق</Label>
                  <div className="flex gap-2 justify-center" dir="ltr">
                    {verificationCode.map((digit, index) => (
                      <Input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        className="w-12 h-12 text-center text-xl font-bold border-[var(--gold)]/30 focus:border-[var(--gold)]"
                      />
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleVerify}
                  disabled={isLoading}
                  className="w-full bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
                >
                  {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "تحقق"}
                </Button>

                <Button
                  variant="ghost"
                  onClick={handleResendCode}
                  disabled={isLoading}
                  className="w-full text-[var(--gold)]"
                >
                  لم يصلك الكود؟ إعادة الإرسال
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="auth"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
                  <TabsTrigger value="register">حساب جديد</TabsTrigger>
                </TabsList>

                {/* Server Error Alert */}
                {serverError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{serverError}</AlertDescription>
                  </Alert>
                )}

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <Alert className="mb-4 border-yellow-500 bg-yellow-50">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      <ul className="list-disc list-inside space-y-1">
                        {validationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Login Tab */}
                <TabsContent value="login" className="space-y-4">
                  <div className="space-y-2">
                    <Label>البريد الإلكتروني</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        type="email"
                        placeholder="example@email.com"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        className="pr-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>كلمة المرور</Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className="pr-10"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleLogin}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-[var(--gold-light)] to-[var(--gold)] hover:from-[var(--gold)] hover:to-[var(--gold-dark)]"
                  >
                    {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "تسجيل الدخول"}
                  </Button>

                  <Button
                    variant="link"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setServerError("");
                    }}
                    className="w-full text-[var(--gold-dark)]"
                  >
                    نسيت كلمة المرور؟
                  </Button>
                </TabsContent>

                {/* Register Tab */}
                <TabsContent value="register" className="space-y-3">
                  {/* Info Alert for password requirements */}
                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 text-xs">
                      كلمة المرور يجب أن تحتوي على: 8 أحرف، حرف كبير، حرف صغير، ورقم
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label>الاسم الكامل *</Label>
                    <div className="relative">
                      <User className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="الاسم الكامل"
                        value={registerData.name}
                        onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                        className="pr-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>البريد الإلكتروني *</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        type="email"
                        placeholder="example@email.com"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        className="pr-10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>كلمة المرور *</Label>
                      <div className="relative">
                        <Lock className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                          type="password"
                          placeholder="••••••••"
                          value={registerData.password}
                          onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                          className="pr-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>تأكيد كلمة المرور *</Label>
                      <div className="relative">
                        <Lock className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                          type="password"
                          placeholder="••••••••"
                          value={registerData.confirmPassword}
                          onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                          className="pr-10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password Strength Indicator */}
                  {registerData.password && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full ${
                              passwordStrength.score >= level
                                ? passwordStrength.score <= 2
                                  ? "bg-red-500"
                                  : passwordStrength.score <= 3
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                                : "bg-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {passwordStrength.checks.map((check, index) => (
                          <div
                            key={index}
                            className={`flex items-center gap-1 ${
                              check.passed ? "text-green-600" : "text-gray-400"
                            }`}
                          >
                            {check.passed ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {check.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>رقم الهاتف *</Label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        type="tel"
                        placeholder="+967XXXXXXXXX أو 05XXXXXXXX"
                        value={registerData.phone}
                        onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                        className="pr-10"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      مثال: +967712345678 (يمني) أو 0512345678 (سعودي)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>العنوان (اختياري)</Label>
                    <div className="relative">
                      <MapPin className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="المدينة، الحي"
                        value={registerData.address}
                        onChange={(e) => setRegisterData({ ...registerData, address: e.target.value })}
                        className="pr-10"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleRegister}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-[var(--gold-light)] to-[var(--gold)] hover:from-[var(--gold)] hover:to-[var(--gold-dark)]"
                  >
                    {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "إنشاء حساب"}
                  </Button>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
