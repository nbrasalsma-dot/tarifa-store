"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, User, Loader2, ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { pusherClient } from "@/lib/pusher";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

interface AgentInboxProps {
  agentId: string;
}

export function AgentInbox({ agentId }: AgentInboxProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
    // --- كود جديد: حالة البحث وفلترة المحادثات ---
  const [searchTerm, setSearchTerm] = useState("");

  const filteredConversations = conversations.filter((conv) => {
    const customerName = conv.customer?.name || "زائر";
    const agentName = conv.agent?.name || "";
    const search = searchTerm.toLowerCase();
    return customerName.toLowerCase().includes(search) || agentName.toLowerCase().includes(search);
  });

  // جلب قائمة المحادثات
  useEffect(() => {
    // 1. استخراج التوكن من الذاكرة المحلية
    const token = localStorage.getItem("token");

    // 2. إرسال الطلب مع التوكن ليعرف السيرفر صلاحياتنا (إدارة أم موظف)
    fetch(`/api/chat/inbox?agentId=${agentId}`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        setConversations(data.conversations || []);
        setIsLoading(false);
      })
      .catch((err) => console.error(err));
  }, [agentId]);

  // جلب رسائل المحادثة النشطة والاشتراك في Pusher اللحظي
  useEffect(() => {
    if (!activeConv) return;

    fetch(`/api/chat/messages?conversationId=${activeConv.id}`)
      .then((res) => res.json())
      .then((data) => setMessages(data.messages || []));

    const channel = pusherClient.subscribe(activeConv.id);
    channel.bind("new-message", (newMessage: any) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
    });

    return () => {
      pusherClient.unsubscribe(activeConv.id);
    };
  }, [activeConv]);

  // النزول لآخر رسالة تلقائياً
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !activeConv) return;
    
    const text = message.trim();
    setMessage(""); // تفريغ الحقل فوراً

    // إضافة الرسالة للواجهة فوراً لسرعة الاستجابة
    const newMsg = {
      id: `temp-${Date.now()}`,
      content: text,
      senderId: agentId,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, newMsg]);

    try {
      await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConv.id,
          senderId: agentId,
          content: text,
        }),
      });
    } catch (error) {
      console.error("خطأ في الإرسال:", error);
    }
  };

  const formatTime = (date: any) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[500px] bg-white rounded-2xl shadow-sm border">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--gold)]" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-180px)] md:h-[600px] w-full bg-white rounded-2xl shadow-sm border overflow-hidden">
      {/* القائمة الجانبية (صندوق الوارد) */}
      <div className={`${activeConv ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 flex-col border-l bg-gray-50/50`}>
        <div className="p-4 border-b bg-white">
          <h2 className="font-bold text-lg text-[#3D3021] flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[var(--gold)]" />
            صندوق الرسائل
          </h2>
           {/* --- إضافة: خانة البحث --- */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="ابحث عن عميل أو موظف..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9 bg-gray-50 border-gray-200"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {conversations.length === 0 ? (
            <div className="text-center p-8 text-gray-400 text-sm">لا توجد محادثات حالياً</div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConv(conv)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-right ${
                    activeConv?.id === conv.id ? 'bg-[var(--gold-light)]/10 border border-[var(--gold-light)]/30' : 'hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  <Avatar className="w-10 h-10 mt-1">
                    <AvatarFallback className="bg-gray-200 text-gray-600">
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden min-w-0">
                    <h4 className="font-bold text-sm text-gray-800 truncate">
                      {conv.customer?.name || "زائر"}
                      {/* لمسة الإدارة: إظهار اسم الموظف المسؤول عن المحادثة */}
                      {conv.agent?.name && (
                        <span className="text-[10px] text-[var(--gold)] mr-2 bg-[var(--gold-light)]/10 px-2 py-0.5 rounded-full border border-[var(--gold-light)]/20">
                          مع: {conv.agent.name}
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-gray-500 truncate mt-1">
                      {conv.messages?.[0]?.content || "بدأ محادثة جديدة"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* منطقة الدردشة */}
      <div className={`${!activeConv ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-white`}>
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageCircle className="h-16 w-16 mb-4 text-gray-200" />
            <p>اختر محادثة من القائمة للبدء بالرد</p>
          </div>
        ) : (
          <>
            {/* رأس الدردشة */}
            <div className="p-4 border-b flex items-center gap-3 bg-white">
              <button 
                onClick={() => setActiveConv(null)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-full"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-[var(--gold-light)] text-white">
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-[#3D3021]">{activeConv.customer?.name || "زائر"}</h3>
              </div>
            </div>

            {/* الرسائل */}
            <ScrollArea className="flex-1 p-4 bg-[#FAF7F2]/50">
              <div className="space-y-4">
                <AnimatePresence>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.senderId === agentId ? "justify-start" : "justify-end"}`}
                    >
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                        msg.senderId === agentId
                          ? "bg-[var(--gold)] text-white rounded-bl-none"
                          : "bg-white shadow-sm border border-gray-100 rounded-br-none"
                      }`}>
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${msg.senderId === agentId ? "text-white/70" : "text-gray-400"}`}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* صندوق الإدخال */}
            <div className="p-4 bg-white border-t">
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="اكتب ردك هنا..."
                  className="flex-1 bg-gray-50 border-gray-200"
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!message.trim()} 
                  className="bg-[var(--gold)] hover:bg-[var(--gold-dark)] text-white px-6 rounded-xl"
                >
                  <Send className="h-4 w-4 ml-2" />
                  إرسال
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}