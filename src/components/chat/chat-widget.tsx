/**
 * Real-time Chat Component
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
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { pusherClient } from "@/lib/pusher";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  createdAt: Date;
  isRead: boolean;
}

interface Conversation {
  id: string;
  agentId: string;
  agentName: string;
  status: string;
  messages: Message[];
}

interface ChatWidgetProps {
  userId: string;
  userName: string;
  userRole: string;
  productId?: string;
  targetAgentId?: string; // 👈 إضافة معرف الموظف المستهدف
}

export function ChatWidget({ userId, userName, userRole, productId, targetAgentId }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
    // --- هذا الكود يراقب إذا فتحت الشات من صفحة منتج يدخلك للمحادثة فوراً ---
  useEffect(() => {
    if (isOpen && productId && targetAgentId && view === 'contacts') {
      startChatWith(targetAgentId);
    }
  }, [isOpen, productId, targetAgentId]);
  // ------------------------------------------------------------------
   
  // الهوية الحالية (إما العميل المسجل أو الضيف)
  const currentUserId = userId;
  // ---------------------------------
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'contacts' | 'chat'>('contacts'); // للتبديل بين القائمة والمحادثة
  const [contacts, setContacts] = useState<any[]>([]); // لتخزين الموظفين (المندوبين، التجار)
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- ربط Pusher للاستقبال اللحظي ---
  useEffect(() => {
    if (!conversation?.id || !isOpen) return;

    // الاشتراك في قناة المحادثة
    const channel = pusherClient.subscribe(conversation.id);

    // استقبال الرسائل الجديدة
    channel.bind("new-message", (newMessage: Message) => {
      setMessages((prev) => {
        // إذا الرسالة موجودة أصلاً (أرسلتها أنت) لا نكررها
        if (prev.find((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
    });

    setIsConnected(true);

    // تنظيف الاتصال عند الإغلاق
    return () => {
      pusherClient.unsubscribe(conversation.id);
    };
  }, [conversation?.id, isOpen]);

  // Load existing conversation or create new one
  // جلب الموظفين (مناديب، تجار، إدارة) فور فتح الدردشة
  useEffect(() => {
    if (!isOpen || view !== 'contacts') return;

    const fetchContacts = async () => {
      setIsLoading(true);
      try {
        // نأخذ التوكن من الذاكرة
        const token = localStorage.getItem("token"); 
        
        const response = await fetch("/api/chat/contacts", {
          headers: {
            "Authorization": `Bearer ${token}` // نرسل التوكن للسيرفر
          }
        });
        if (response.ok) {
          const data = await response.json();
          setContacts(data.contacts || []);
        }
      } catch (error) {
        console.error("Error fetching contacts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContacts();
  }, [isOpen, view]);

    // دالة لفتح المحادثة عند الضغط على اسم موظف
  const startChatWith = async (contactId: string) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch("/api/chat/conversation", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          customerId: currentUserId, 
          agentId: contactId,
          productId: productId // 👈 أضفنا هذا السطر لربط المحادثة بالمنتج
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setConversation(data.conversation);
        setMessages(data.conversation?.messages || []);
        setView('chat'); // تبديل الواجهة من القائمة إلى الدردشة
      }
    } catch (error) {
      console.error("خطأ في بدء المحادثة:", error);
    } finally {
      setIsLoading(false);
    }
  };

const handleSendMessage = async () => {
    if (!message.trim() || !conversation?.id || !currentUserId) return;

    const content = message.trim();
    setMessage(""); // مسح الحقل فوراً لسرعة الاستجابة

    // إضافة الرسالة للواجهة فوراً
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      senderId: currentUserId,
      senderName: userName,
      senderRole: userRole,
      content: content,
      createdAt: new Date(),
      isRead: false,
    };

    setMessages((prev) => [...prev, newMessage]);

    try {
      await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id,
          senderId: currentUserId,
          content: content,
        }),
      });
    } catch (error) {
      console.error("خطأ في الإرسال:", error);
    }
  };

  const formatTime = (date: Date) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: ar,
    });
  };

  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 md:bottom-6 left-6 z-[60] w-14 h-14 rounded-full bg-gradient-to-r from-[var(--gold-light)] to-[var(--gold)] shadow-lg hover:shadow-xl flex items-center justify-center text-white"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
          {messages.filter((m) => !m.isRead && m.senderId !== currentUserId).length > 0
            ? messages.filter((m) => !m.isRead && m.senderId !== currentUserId).length
            : ""}
        </span>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className={`fixed bottom-24 md:bottom-6 left-4 md:left-6 z-[60] bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
        isMinimized ? "w-80 h-14" : "w-80 md:w-96 h-[500px]"
      }`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--gold-light)] to-[var(--gold)] text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* زر الرجوع يظهر فقط إذا كنا داخل المحادثة */}
          {view === 'chat' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
              onClick={() => setView('contacts')}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-white/20 text-white">
              {view === 'contacts' ? <User className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-bold text-sm">
              {view === 'contacts' ? 'المراسلة المباشرة' : conversation?.agentName || 'المحادثة'}
            </h3>
            {view === 'chat' && (
              <p className="text-xs text-white/80 flex items-center gap-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-green-400" : "bg-red-400"
                  }`}
                />
                {isConnected ? "متصل" : "غير متصل"}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages & Contacts Area */}
      {!isMinimized && (
        <>
          {isLoading ? (
            <ScrollArea className="h-[340px] p-4 bg-gray-50 flex items-center justify-center">
              <div className="flex items-center justify-center h-full w-full mt-32">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--gold)]" />
              </div>
            </ScrollArea>
          ) : view === 'contacts' ? (
            /* --- واجهة اختيار الموظف أو تسجيل الدخول --- */
            <ScrollArea className="h-[400px] p-4 bg-gray-50">
              {!userId ? (
                /* إذا كان المستخدم زائر، نظهر له رسالة تطلب منه تسجيل الدخول */
                <div className="flex flex-col items-center justify-center h-full mt-20 text-center space-y-4 px-6">
                  <div className="bg-[var(--gold-light)]/20 p-4 rounded-full">
                    <User className="h-8 w-8 text-[var(--gold)]" />
                  </div>
                  <h3 className="font-bold text-[#3D3021]">خدمة العملاء بانتظارك!</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    للبدء بالمحادثة والحصول على استفساراتك، يرجى تسجيل الدخول أولاً لضمان جودة الخدمة.
                  </p>
                  <Button 
                    onClick={() => {
                        setIsOpen(false); // إغلاق نافذة الشات
                        window.location.href = "/?auth=login"; // توجيهه لفتح نافذة الدخول
                    }}
                    className="w-full bg-[var(--gold)] hover:bg-[var(--gold-dark)] text-white rounded-xl shadow-md py-6"
                  >
                    تسجيل الدخول / إنشاء حساب
                  </Button>
                </div>
              ) : (
                /* إذا كان مسجل دخول، تظهر له القائمة بشكل طبيعي كما كانت */
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 mb-4 px-2 font-bold">اختر من تود مراسلته:</p>
                  {contacts.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm mt-10">لا يوجد موظفين متاحين حالياً</p>
                  ) : (
                    contacts.map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => startChatWith(contact.id)}
                        className="w-full flex items-center gap-3 p-3 bg-white hover:bg-gray-100 rounded-xl transition-all shadow-sm border border-gray-100 group"
                      >
                        {/* ... كود الـ Avatar والاسم كما هو ... */}
                      </button>
                    ))
                  )}
                </div>
              )}
            </ScrollArea>
          ) : (
            /* --- واجهة الدردشة والمراسلة --- */
            <>
              <ScrollArea className="h-[340px] p-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">ابدأ المحادثة معنا</p>
                    <p className="text-xs mt-1">نحن هنا لمساعدتك!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {messages.map((msg) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${
                            msg.senderId === currentUserId ? "justify-start" : "justify-end"
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                              msg.senderId === currentUserId
                                ? "bg-[var(--gold)] text-white rounded-bl-none"
                                : "bg-white shadow rounded-br-none"
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                msg.senderId === currentUserId
                                  ? "text-white/70"
                                  : "text-gray-400"
                              }`}
                            >
                              {formatTime(msg.createdAt)}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {/* Typing indicator */}
                    {isTyping && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-end"
                      >
                        <div className="bg-white rounded-2xl px-4 py-3 shadow">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="p-3 bg-white border-t">
                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                    }}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="اكتب رسالتك..."
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || !isConnected}
                    className="bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </motion.div>
  );
}