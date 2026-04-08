/**
 * Real-time Chat Component - Version 2.0 (فخمة للجوال)
 * Instant messaging between customers and agents
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Send,
  X,
  Minimize2,
  Maximize2,
  Loader2,
  User,
  Headphones,
  ChevronRight,
  Check,
  CheckCheck,
  Search,
  Sparkles,
  Clock,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { pusherClient } from "@/lib/pusher";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  createdAt: Date;
  isRead: boolean;
  isTemp?: boolean;
  error?: boolean;
}

interface Conversation {
  id: string;
  agentId: string;
  agentName: string;
  agentRole?: string;
  customerId: string;
  customerName?: string;
  status: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface Contact {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
}

interface ChatWidgetProps {
  userId: string;
  userName: string;
  userRole: string;
  productId?: string;
  targetAgentId?: string;
}

export function ChatWidget({
  userId,
  userName,
  userRole,
  productId,
  targetAgentId,
}: ChatWidgetProps) {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<"contacts" | "chat">("contacts");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Constants
  const isGuest = !userId || userId === "" || userId === "guest";
  const currentUserId = userId;
  // إخفاء النافذة العائمة تماماً عن الإدارة والتجار والمندوبين
  // لأن لديهم صندوق وارد خاص بهم في لوحة التحكم
  if (userRole === "ADMIN" || userRole === "AGENT" || userRole === "MERCHANT") {
    return null;
  }

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto focus input when chat opens
  useEffect(() => {
    if (isOpen && view === "chat" && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, view]);

  // ✅ رادار التقاط حدث النقر على زر "استفسار" من صفحة المنتج
  useEffect(() => {
    const handleStartInquiry = () => {
      if (isGuest) {
        toast({
          title: "تسجيل الدخول مطلوب",
          description: "يرجى تسجيل الدخول للاستفسار عن المنتج",
          variant: "destructive",
        });
        setIsOpen(false);
        window.location.href = "/?auth=login";
        return;
      }

      // 1. افتح النافذة
      setIsOpen(true);

      // 2. ابدأ المحادثة وأرسل رسالة المنتج (بعد فتح النافذة بلحظة)
      if (targetAgentId) {
        setTimeout(() => {
          startChatWith(targetAgentId);
        }, 100);
      }
    };

    window.addEventListener("start-inquiry", handleStartInquiry);
    return () =>
      window.removeEventListener("start-inquiry", handleStartInquiry);
  }, [targetAgentId, isGuest]);

  // Fetch contacts when chat opens
  useEffect(() => {
    if (!isOpen || view !== "contacts" || isGuest) return;

    const fetchContacts = async () => {
      setIsLoading(true);
      setConnectionError(null);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("لا يوجد توكن للمستخدم");
        }

        const response = await fetch("/api/chat/contacts", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        // Remove duplicates using Map (تم حل مشكلة TypeScript بتعريف النوع صراحة)
        const uniqueContacts: Contact[] = Array.from(
          new Map<string, Contact>(
            (data.contacts || []).map((c: Contact) => [c.id, c]),
          ).values(),
        );
        setContacts(uniqueContacts);
      } catch (error) {
        console.error("Error fetching contacts:", error);
        setConnectionError("فشل في تحميل جهات الاتصال");
        toast({
          title: "خطأ",
          description: "حدث خطأ في تحميل جهات الاتصال",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchContacts();
  }, [isOpen, view, isGuest]);

  // Pusher connection for real-time messages
  useEffect(() => {
    if (!conversation?.id || !isOpen || view !== "chat") return;

    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const setupPusher = () => {
      try {
        if (!pusherClient) {
          throw new Error("Pusher client not initialized");
        }

        const channel = pusherClient.subscribe(conversation.id);

        channel.bind("new-message", (newMessage: Message) => {
          if (!mounted) return;

          // ✅ فلتر الحماية (السر البرمجي لمنع التكرار نهائياً):
          // إذا كانت الرسالة القادمة من البوشر هي رسالتك أنت، تجاهلها!
          // لأن دالة الإرسال قد قامت بالفعل بوضعها في شاشتك بذكاء
          if (newMessage.senderId === currentUserId) {
            return;
          }

          setMessages((prev) => {
            if (prev.find((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });

          // Mark as read if needed
          if (newMessage.senderId !== currentUserId) {
            //markMessageAsRead(newMessage.id);
          }
        });

        channel.bind("message-read", (data: { messageId: string }) => {
          if (!mounted) return;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === data.messageId ? { ...msg, isRead: true } : msg,
            ),
          );
        });

        channel.bind("pusher:subscription_succeeded", () => {
          if (mounted) {
            setIsConnected(true);
            setConnectionError(null);
          }
        });

        channel.bind("pusher:subscription_error", (error: any) => {
          console.error("Pusher subscription error:", error);
          if (mounted) {
            setIsConnected(false);
            setConnectionError("انقطع الاتصال، جاري إعادة المحاولة...");
          }
        });

        return channel;
      } catch (error) {
        console.error("Pusher setup error:", error);
        if (mounted) {
          setIsConnected(false);
          setConnectionError("فشل الاتصال بخادم الدردشة");
        }
        return null;
      }
    };

    let channel = setupPusher();

    // Auto-reconnect logic
    const reconnectInterval = setInterval(() => {
      if (!isConnected && mounted && retryCount < maxRetries) {
        retryCount++;
        console.log(`Reconnecting... attempt ${retryCount}`);
        if (channel) {
          channel.unbind_all();
          pusherClient?.unsubscribe(conversation.id);
        }
        channel = setupPusher();
      }
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(reconnectInterval);
      if (channel) {
        channel.unbind_all();
        pusherClient?.unsubscribe(conversation.id);
      }
    };
  }, [conversation?.id, isOpen, view, currentUserId]);

  // Mark message as read
  const markMessageAsRead = async (messageId: string) => {
    try {
      const token = localStorage.getItem("token");
      await fetch("/api/chat/messages/read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messageId, conversationId: conversation?.id }),
      });
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  // Start or get existing conversation
  const startChatWith = async (contactId: string) => {
    if (isGuest) {
      toast({
        title: "تسجيل الدخول مطلوب",
        description: "يرجى تسجيل الدخول لبدء المحادثة",
        variant: "destructive",
      });
      setIsOpen(false);
      window.location.href = "/?auth=login";
      return;
    }

    setIsLoading(true);
    setConnectionError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("لا يوجد توكن");
      }

      const response = await fetch("/api/chat/conversation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId: currentUserId,
          agentId: contactId,
          productId: productId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setConversation(data.conversation);
      setMessages(data.conversation?.messages || []);
      setView("chat");
    } catch (error) {
      console.error("خطأ في بدء المحادثة:", error);
      setConnectionError("فشل في بدء المحادثة");
      toast({
        title: "خطأ",
        description: "حدث خطأ في بدء المحادثة، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Send message (تم التحديث لمنع تكرار الرسالة عند العميل باستخدام socket_id)
  const handleSendMessage = async () => {
    if (isSending) return;
    if (!message.trim() || !conversation?.id || !currentUserId) return;

    const content = message.trim();
    const tempId = `temp-${Date.now()}-${Math.random()}`;

    // Add temporary message
    const tempMessage: Message = {
      id: tempId,
      senderId: currentUserId,
      senderName: userName,
      senderRole: userRole,
      content: content,
      createdAt: new Date(),
      isRead: false,
      isTemp: true,
    };

    setMessage("");
    setMessages((prev) => [...prev, tempMessage]);
    setIsSending(true); // ← هذه السطر المضاف

    // Clear typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      const token = localStorage.getItem("token");

      // ✅ استخراج رقم الجلسة من Pusher لمنع تكرار الرسالة عند العميل (تأثير الصدى)
      const currentSocketId = pusherClient?.connection?.socket_id;

      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId: conversation.id,
          senderId: currentUserId,
          content: content,
          socketId: currentSocketId, // ✅ إرسال رقم الجلسة للسيرفر
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send");
      }

      const savedMessage = await response.json();

      // Replace temp message with saved one
      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempId ? savedMessage.message : msg)),
      );
    } catch (error) {
      console.error("خطأ في الإرسال:", error);
      // Mark message as error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId
            ? { ...msg, error: true, content: `${content} (لم ترسل)` }
            : msg,
        ),
      );
      toast({
        title: "خطأ",
        description: "فشل في إرسال الرسالة",
        variant: "destructive",
      });
      // Restore message to input
      setMessage(content);
    } finally {
      setIsSending(false); // ← هذه السطر المضاف
    }
  };

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing event via Pusher
    if (conversation?.id && isConnected) {
      const channel = pusherClient?.subscribe(conversation.id);
      channel?.trigger("client-typing", {
        userId: currentUserId,
        isTyping: true,
      });
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (conversation?.id && isConnected) {
        const channel = pusherClient?.subscribe(conversation.id);
        channel?.trigger("client-typing", {
          userId: currentUserId,
          isTyping: false,
        });
      }
    }, 1000);
  }, [conversation?.id, isConnected, currentUserId]);

  const formatTime = (date: Date) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: ar,
    });
  };

  // Get message status icon
  const getMessageStatus = (msg: Message) => {
    if (msg.error) return null;
    if (msg.isRead) return <CheckCheck className="h-3 w-3 text-green-400" />;
    return <Check className="h-3 w-3 text-gray-400" />;
  };

  // Filter contacts by search
  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Chat button (when closed)
  if (!isOpen) {
    const unreadCount = messages.filter(
      (m) => !m.isRead && m.senderId !== currentUserId,
    ).length;
    return (
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-[60] group"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#C9A962] to-[#B8956E] rounded-full blur-xl opacity-70 group-hover:opacity-100 transition-opacity" />
          <div className="relative w-14 h-14 rounded-full bg-gradient-to-r from-[#C9A962] to-[#B8956E] shadow-lg flex items-center justify-center text-white overflow-hidden">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"
            />
            <MessageCircle className="h-6 w-6 relative z-10" />
          </div>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white shadow-lg"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.div>
          )}
        </div>
      </motion.button>
    );
  }

  // Main chat window
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.9 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={`fixed bottom-6 left-6 z-[60] bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${
        isMinimized
          ? "w-80 h-14"
          : "w-[calc(100vw-2rem)] sm:w-96 md:w-[28rem] h-[600px] max-h-[calc(100vh-3rem)]"
      }`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] text-white px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {view === "chat" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20 rounded-full shrink-0"
              onClick={() => {
                setView("contacts");
                setConversation(null);
                setMessages([]);
              }}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent rounded-full blur" />
            <Avatar className="w-10 h-10 ring-2 ring-white/30 shrink-0">
              <AvatarFallback className="bg-white/20 text-white font-bold text-lg">
                {view === "contacts" ? (
                  <User className="h-5 w-5" />
                ) : (
                  <Headphones className="h-5 w-5" />
                )}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base truncate">
              {view === "contacts"
                ? "المراسلة المباشرة"
                : conversation?.agentName || "المحادثة"}
            </h3>
            {view === "chat" && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <div
                  className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`}
                />
                <p className="text-xs text-white/80">
                  {isConnected ? "متصل الآن" : "غير متصل"}
                </p>
                {connectionError && (
                  <p className="text-xs text-yellow-200 truncate">
                    {connectionError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minimize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      {!isMinimized && (
        <>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[500px] bg-gradient-to-b from-[#FAF7F2] to-white">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="h-10 w-10 text-[#C9A962]" />
              </motion.div>
              <p className="text-[#8B7355] mt-3 text-sm">جاري التحميل...</p>
            </div>
          ) : view === "contacts" ? (
            // Contacts View
            <div className="flex flex-col h-[520px] bg-gradient-to-b from-[#FAF7F2] to-white">
              {/* Guest View */}
              {isGuest ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" }}
                    className="w-24 h-24 rounded-full bg-gradient-to-r from-[#C9A962]/20 to-[#B8956E]/20 flex items-center justify-center mb-6"
                  >
                    <MessageCircle className="h-12 w-12 text-[#C9A962]" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-[#3D3021] mb-2">
                    مرحباً بك! 💬
                  </h3>
                  <p className="text-sm text-[#8B7355] mb-6 leading-relaxed">
                    للتواصل مع خدمة العملاء والاستفسار عن المنتجات، يرجى تسجيل
                    الدخول أولاً
                  </p>
                  <Button
                    onClick={() => {
                      setIsOpen(false);
                      window.location.href = "/?auth=login";
                    }}
                    className="w-full bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white rounded-xl py-6 shadow-lg"
                  >
                    تسجيل الدخول / إنشاء حساب
                  </Button>
                </div>
              ) : (
                // Contacts List
                <>
                  {/* Search Bar */}
                  <div className="p-4 border-b border-[#E8E0D8] bg-white">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C9A962]" />
                      <Input
                        placeholder="ابحث عن موظف..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pr-10 bg-[#FAF7F2] border-[#E8E0D8] rounded-xl focus:border-[#C9A962]"
                      />
                    </div>
                  </div>

                  <ScrollArea className="flex-1 p-4">
                    {filteredContacts.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                          <User className="h-8 w-8 text-gray-300" />
                        </div>
                        <p className="text-[#8B7355] text-sm">
                          {searchTerm
                            ? "لا توجد نتائج للبحث"
                            : "لا يوجد موظفين متاحين حالياً"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredContacts.map((contact, index) => (
                          <motion.button
                            key={`contact-${contact.id}-${index}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => startChatWith(contact.id)}
                            className="w-full flex items-center gap-4 p-4 bg-white hover:bg-gradient-to-r hover:from-[#FAF7F2] hover:to-white rounded-2xl transition-all shadow-sm border border-[#E8E0D8] group"
                          >
                            <div className="relative">
                              <Avatar className="w-12 h-12 shrink-0">
                                <AvatarFallback className="bg-gradient-to-br from-[#C9A962] to-[#B8956E] text-white font-bold text-lg">
                                  {contact.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                            </div>
                            <div className="flex-1 text-right">
                              <h4 className="font-bold text-[#3D3021] text-base">
                                {contact.name}
                              </h4>
                              <p className="text-xs text-[#8B7355] mt-0.5">
                                {contact.role === "ADMIN"
                                  ? "الإدارة"
                                  : contact.role === "AGENT"
                                    ? "دعم فني"
                                    : contact.role === "MERCHANT"
                                      ? "تاجر معتمد"
                                      : "موظف"}
                              </p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-[#C9A962]/10 flex items-center justify-center shrink-0 group-hover:bg-[#C9A962] group-hover:text-white transition-all duration-300">
                              <MessageCircle className="h-5 w-5 text-[#C9A962] group-hover:text-white" />
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </>
              )}
            </div>
          ) : (
            // Chat View
            <div className="flex flex-col h-[520px] bg-gradient-to-b from-[#FAF7F2] to-white">
              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.2 }}
                      className="w-20 h-20 rounded-full bg-gradient-to-r from-[#C9A962]/20 to-[#B8956E]/20 flex items-center justify-center mb-4"
                    >
                      <MessageCircle className="h-10 w-10 text-[#C9A962]" />
                    </motion.div>
                    <p className="text-[#3D3021] font-medium mb-1">
                      ابدأ المحادثة
                    </p>
                    <p className="text-xs text-[#8B7355]">
                      نحن هنا لمساعدتك! 💬
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {messages.map((msg) => {
                        const isOwn = msg.senderId === currentUserId;
                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={`flex group ${isOwn ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                                isOwn
                                  ? "bg-gradient-to-r from-[#C9A962] to-[#B8956E] text-white rounded-bl-none shadow-md"
                                  : "bg-white shadow-sm border border-[#E8E0D8] rounded-br-none"
                              } ${msg.error ? "opacity-70" : ""}`}
                            >
                              <p
                                className={`text-sm break-words ${msg.error ? "line-through" : ""}`}
                              >
                                {msg.content}
                              </p>
                              <div
                                className={`flex items-center gap-1 mt-1 ${isOwn ? "justify-start" : "justify-end"}`}
                              >
                                <p
                                  className={`text-[10px] ${isOwn ? "text-white/60" : "text-gray-400"}`}
                                >
                                  {formatTime(msg.createdAt)}
                                </p>
                                {isOwn && getMessageStatus(msg)}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {/* Typing indicator */}
                    {isTyping && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-end"
                      >
                        <div className="bg-white rounded-2xl px-4 py-3 shadow-md border border-[#E8E0D8]">
                          <div className="flex gap-1">
                            <span
                              className="w-2 h-2 bg-[#C9A962] rounded-full animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            />
                            <span
                              className="w-2 h-2 bg-[#C9A962] rounded-full animate-bounce"
                              style={{ animationDelay: "150ms" }}
                            />
                            <span
                              className="w-2 h-2 bg-[#C9A962] rounded-full animate-bounce"
                              style={{ animationDelay: "300ms" }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Connection status bar */}
              {connectionError && !isConnected && (
                <div className="mx-4 mb-2 p-2 bg-red-50 rounded-xl border border-red-200">
                  <div className="flex items-center gap-2 text-red-600 text-xs">
                    <WifiOff className="h-3 w-3" />
                    <span>جاري إعادة الاتصال...</span>
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-[#E8E0D8]">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="اكتب رسالتك هنا..."
                    className="flex-1 bg-[#FAF7F2] border-[#E8E0D8] rounded-xl focus:border-[#C9A962] focus:ring-[#C9A962]/20"
                    disabled={!isConnected}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || !isConnected}
                    className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white rounded-xl px-6 shadow-md transition-all active:scale-95"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {!isConnected && (
                  <p className="text-xs text-red-500 text-center mt-2">
                    <WifiOff className="h-3 w-3 inline ml-1" />
                    غير متصل، يرجى التحقق من اتصالك بالإنترنت
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
