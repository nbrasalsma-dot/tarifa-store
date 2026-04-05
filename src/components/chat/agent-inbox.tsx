/**
 * Agent Inbox Component
 * Professional inbox for admins, agents, and merchants
 * Design: 80% Mobile / 20% Desktop - فخم جداً
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageCircle,
    Send,
    User,
    Loader2,
    ArrowRight,
    Search,
    Check,
    CheckCheck,
    Clock,
    Wifi,
    WifiOff,
    Sparkles,
    Filter,
    Users,
    Star,
    Phone,
    Mail,
    MoreVertical,
    Archive,
    Trash2,
    Pin,
    Bell,
    BellOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    customerId: string;
    customer: {
        id: string;
        name: string;
        role: string;
        phone?: string;
        email?: string;
    };
    agentId: string | null;
    agent: {
        id: string;
        name: string;
        role: string;
    } | null;
    status: string;
    messages: Message[];
    createdAt: Date;
    updatedAt: Date;
    unreadCount?: number;
}

interface AgentInboxProps {
    agentId: string;
    agentRole?: string;
}

export function AgentInbox({ agentId, agentRole = "AGENT" }: AgentInboxProps) {
    // State
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isConnected, setIsConnected] = useState(true);
    const [activeTab, setActiveTab] = useState<"all" | "unread" | "active">("all");
    const [isMobileView, setIsMobileView] = useState(false);
    const [showChat, setShowChat] = useState(false);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const isMountedRef = useRef(true);

    // Check if mobile view
    useEffect(() => {
        const checkMobile = () => {
            setIsMobileView(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Auto scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Auto focus input when chat opens on mobile
    useEffect(() => {
        if (showChat && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [showChat]);

    // Fetch conversations
    useEffect(() => {
        fetchConversations();
    }, [agentId]);

    // Fetch messages when active conversation changes
    useEffect(() => {
        if (activeConversation) {
            fetchMessages(activeConversation.id);
            if (isMobileView) {
                setShowChat(true);
            }
        } else {
            setShowChat(false);
        }
    }, [activeConversation, isMobileView]);

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Pusher subscription for real-time updates
    useEffect(() => {
        if (!activeConversation?.id) return;

        let mounted = true;
        let retryCount = 0;
        const maxRetries = 3;

        const setupPusher = () => {
            try {
                if (!pusherClient) return null;

                const channel = pusherClient.subscribe(activeConversation.id);

                channel.bind("new-message", (newMessage: Message) => {
                    if (!mounted || !isMountedRef.current) return;
                    setMessages((prev) => {
                        if (prev.find((m) => m.id === newMessage.id)) return prev;
                        return [...prev, newMessage];
                    });
                    // Mark message as read - DISABLED temporarily
                    // if (newMessage.senderId !== agentId) {
                    //   markMessageAsRead(newMessage.id);
                    // }
                    // Update conversation list
                    setConversations((prev) =>
                        prev.map((conv) =>
                            conv.id === activeConversation.id
                                ? { ...conv, updatedAt: new Date(), messages: [...conv.messages, newMessage] }
                                : conv
                        )
                    );
                });

                channel.bind("message-read", (data: { messageId: string }) => {
                    if (!mounted || !isMountedRef.current) return;
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === data.messageId ? { ...msg, isRead: true } : msg
                        )
                    );
                });

                channel.bind("pusher:subscription_succeeded", () => {
                    if (mounted && isMountedRef.current) setIsConnected(true);
                });

                channel.bind("pusher:subscription_error", () => {
                    if (mounted && isMountedRef.current) setIsConnected(false);
                });

                return channel;
            } catch (error) {
                console.error("Pusher error:", error);
                if (mounted && isMountedRef.current) setIsConnected(false);
                return null;
            }
        };

        let channel = setupPusher();

        // Auto-reconnect
        const reconnectInterval = setInterval(() => {
            if (!isConnected && mounted && isMountedRef.current && retryCount < maxRetries) {
                retryCount++;
                if (channel) {
                    channel.unbind_all();
                    pusherClient?.unsubscribe(activeConversation.id);
                }
                channel = setupPusher();
            }
        }, 5000);

        return () => {
            mounted = false;
            clearInterval(reconnectInterval);
            if (channel) {
                channel.unbind_all();
                pusherClient?.unsubscribe(activeConversation.id);
            }
        };
    }, [activeConversation?.id, agentId]);

    // Fetch conversations from API
    const fetchConversations = async () => {
        if (!isMountedRef.current) return;
        setIsLoading(true);
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                throw new Error("No token found");
            }

            const response = await fetch("/api/chat/inbox", {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const convs = data.conversations || [];

            // Calculate unread counts
            const convsWithUnread = convs.map((conv: Conversation) => ({
                ...conv,
                unreadCount: conv.messages?.filter(
                    (m: Message) => !m.isRead && m.senderId !== agentId
                ).length || 0
            }));

            if (isMountedRef.current) {
                setConversations(convsWithUnread);
            }
        } catch (error) {
            console.error("Error fetching conversations:", error);
            if (isMountedRef.current) {
                toast({
                    title: "خطأ",
                    description: "فشل في تحميل المحادثات",
                    variant: "destructive",
                });
            }
        } finally {
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    };

    // Fetch messages for a conversation
    const fetchMessages = async (conversationId: string) => {
        if (!isMountedRef.current) return;
        setIsLoadingMessages(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`/api/chat/messages?conversationId=${conversationId}`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (isMountedRef.current) {
                setMessages(data.messages || []);
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
            if (isMountedRef.current) {
                toast({
                    title: "خطأ",
                    description: "فشل في تحميل الرسائل",
                    variant: "destructive",
                });
            }
        } finally {
            if (isMountedRef.current) {
                setIsLoadingMessages(false);
            }
        }
    };

    // Mark message as read - TEMPORARILY DISABLED TO FIX DUPLICATE MESSAGES
    const markMessageAsRead = async (messageId: string) => {
        // تم تعطيل هذه الدالة مؤقتاً لحل مشكلة تكرار الرسائل
        console.log("markMessageAsRead disabled:", messageId);
        return;

        /* الكود الأصلي معطل مؤقتاً
        try {
          const token = localStorage.getItem("token");
          await fetch("/api/chat/messages/read", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ messageId, conversationId: activeConversation?.id }),
          });
        } catch (error) {
          console.error("Error marking message as read:", error);
        }
        */
    };

    // Send message
    const handleSendMessage = async () => {
        if (isSending) return;
        if (!message.trim() || !activeConversation?.id) return;

        const content = message.trim();
        const tempId = `temp-${Date.now()}-${Math.random()}`;

        // Add temporary message
        const tempMessage: Message = {
            id: tempId,
            senderId: agentId,
            senderName: "أنت",
            senderRole: agentRole,
            content: content,
            createdAt: new Date(),
            isRead: false,
            isTemp: true,
        };

        setMessage("");
        setMessages((prev) => [...prev, tempMessage]);
        setIsSending(true);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch("/api/chat/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    conversationId: activeConversation.id,
                    senderId: agentId,
                    content: content,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to send");
            }

            const savedMessage = await response.json();

            if (isMountedRef.current) {
                // Replace temp message
                setMessages((prev) =>
                    prev.map(msg => msg.id === tempId ? savedMessage.message : msg)
                );

                // Update conversation list
                setConversations((prev) =>
                    prev.map((conv) =>
                        conv.id === activeConversation.id
                            ? { ...conv, updatedAt: new Date(), messages: [...conv.messages, savedMessage.message] }
                            : conv
                    )
                );
            }
        } catch (error) {
            console.error("Error sending message:", error);
            if (isMountedRef.current) {
                setMessages((prev) =>
                    prev.map(msg =>
                        msg.id === tempId ? { ...msg, error: true, content: `${content} (لم ترسل)` } : msg
                    )
                );
                toast({
                    title: "خطأ",
                    description: "فشل في إرسال الرسالة",
                    variant: "destructive",
                });
                setMessage(content);
            }
        } finally {
            if (isMountedRef.current) {
                setIsSending(false);
            }
        }
    };

    // Filter conversations based on tab and search
    const filteredConversations = conversations.filter((conv) => {
        // Search filter
        const customerName = conv.customer?.name || "عميل";
        const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        // Tab filter
        if (activeTab === "unread") {
            return (conv.unreadCount || 0) > 0;
        }
        if (activeTab === "active") {
            const hoursSinceUpdate = (Date.now() - new Date(conv.updatedAt).getTime()) / (1000 * 60 * 60);
            return hoursSinceUpdate < 24;
        }
        return true;
    });

    const formatTime = (date: Date) => {
        return formatDistanceToNow(new Date(date), {
            addSuffix: true,
            locale: ar,
        });
    };

    const getMessageStatus = (msg: Message) => {
        if (msg.error) return null;
        if (msg.isRead) return <CheckCheck className="h-3 w-3 text-green-400" />;
        return <Check className="h-3 w-3 text-gray-400" />;
    };

    // Desktop view (both sidebar and chat visible)
    if (!isMobileView) {
        return (
            <div className="bg-white rounded-3xl shadow-xl border border-[#E8E0D8] overflow-hidden h-[calc(100vh-200px)] min-h-[500px]">
                <div className="flex h-full">
                    {/* Sidebar - Conversations List */}
                    <div className="w-96 border-l border-[#E8E0D8] flex flex-col bg-gradient-to-b from-[#FAF7F2] to-white">
                        {/* Header */}
                        <div className="p-5 border-b border-[#E8E0D8] bg-white">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-[#3D3021] flex items-center gap-2">
                                        <MessageCircle className="h-5 w-5 text-[#C9A962]" />
                                        صندوق الرسائل
                                    </h2>
                                    <p className="text-xs text-[#8B7355] mt-1">
                                        {conversations.length} محادثة
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={fetchConversations}
                                    className="rounded-full"
                                >
                                    <Loader2 className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                                </Button>
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C9A962]" />
                                <Input
                                    placeholder="ابحث عن عميل..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pr-10 bg-[#FAF7F2] border-[#E8E0D8] rounded-xl focus:border-[#C9A962]"
                                />
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="px-5 pt-3">
                            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                                <TabsList className="w-full bg-gray-100 rounded-xl p-1">
                                    <TabsTrigger value="all" className="flex-1 rounded-lg text-sm">
                                        الكل
                                    </TabsTrigger>
                                    <TabsTrigger value="unread" className="flex-1 rounded-lg text-sm">
                                        غير مقروءة
                                    </TabsTrigger>
                                    <TabsTrigger value="active" className="flex-1 rounded-lg text-sm">
                                        نشطة
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* Conversations List - Improved scrolling */}
                        <ScrollArea className="flex-1 p-3 h-full min-h-0">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-64">
                                    <Loader2 className="h-8 w-8 animate-spin text-[#C9A962]" />
                                    <p className="text-[#8B7355] mt-3 text-sm">جاري التحميل...</p>
                                </div>
                            ) : filteredConversations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-center">
                                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                        <MessageCircle className="h-8 w-8 text-gray-300" />
                                    </div>
                                    <p className="text-[#8B7355] font-medium">لا توجد محادثات</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {searchTerm ? "لا توجد نتائج للبحث" : "ستظهر هنا المحادثات الجديدة"}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredConversations.map((conv) => {
                                        const isActive = activeConversation?.id === conv.id;
                                        const lastMessage = conv.messages?.[conv.messages.length - 1];
                                        const unreadCount = conv.unreadCount || 0;

                                        return (
                                            <motion.button
                                                key={`conv-${conv.id}-${conv.updatedAt}`}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                onClick={() => setActiveConversation(conv)}
                                                className={`w-full text-right p-4 rounded-2xl transition-all duration-200 ${isActive
                                                        ? "bg-gradient-to-r from-[#C9A962]/10 to-[#B8956E]/5 border border-[#C9A962]/30 shadow-md"
                                                        : "hover:bg-gray-50 border border-transparent"
                                                    }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="relative shrink-0">
                                                        <Avatar className="w-12 h-12">
                                                            <AvatarFallback className="bg-gradient-to-br from-[#C9A962] to-[#B8956E] text-white font-bold text-lg">
                                                                {conv.customer?.name?.charAt(0) || "ع"}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        {unreadCount > 0 && (
                                                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                                                                {unreadCount > 9 ? "9+" : unreadCount}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="font-bold text-[#3D3021] text-sm truncate">
                                                                {conv.customer?.name || "عميل"}
                                                            </h4>
                                                            <span className="text-[10px] text-gray-400 shrink-0 mr-2">
                                                                {formatTime(conv.updatedAt)}
                                                            </span>
                                                        </div>
                                                        {lastMessage && (
                                                            <p className="text-xs text-gray-500 truncate mt-1">
                                                                {lastMessage.senderId === agentId ? "أنت: " : ""}
                                                                {lastMessage.content}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 flex flex-col bg-white">
                        {!activeConversation ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring" }}
                                    className="w-24 h-24 rounded-full bg-gradient-to-r from-[#C9A962]/20 to-[#B8956E]/20 flex items-center justify-center mb-6"
                                >
                                    <MessageCircle className="h-12 w-12 text-[#C9A962]" />
                                </motion.div>
                                <h3 className="text-xl font-bold text-[#3D3021] mb-2">مرحباً بك!</h3>
                                <p className="text-[#8B7355] text-sm max-w-xs">
                                    اختر محادثة من القائمة للبدء بالرد على العملاء
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Chat Header */}
                                <div className="p-4 border-b border-[#E8E0D8] bg-white shrink-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="w-10 h-10">
                                                <AvatarFallback className="bg-gradient-to-br from-[#C9A962] to-[#B8956E] text-white font-bold">
                                                    {activeConversation.customer?.name?.charAt(0) || "ع"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h3 className="font-bold text-[#3D3021]">
                                                    {activeConversation.customer?.name || "عميل"}
                                                </h3>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
                                                    <p className="text-xs text-gray-500">
                                                        {isConnected ? "متصل" : "غير متصل"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="rounded-full">
                                                    <MoreVertical className="h-5 w-5 text-gray-500" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem className="gap-2">
                                                    <Phone className="h-4 w-4" /> رقم العميل
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="gap-2">
                                                    <Mail className="h-4 w-4" /> البريد الإلكتروني
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="gap-2 text-red-500">
                                                    <Trash2 className="h-4 w-4" /> أرشيف
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                {/* Messages Area */}
                                <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-[#FAF7F2] to-white h-full min-h-0">
                                    {isLoadingMessages ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="h-8 w-8 animate-spin text-[#C9A962]" />
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center">
                                            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                                <MessageCircle className="h-8 w-8 text-gray-300" />
                                            </div>
                                            <p className="text-[#8B7355]">لا توجد رسائل بعد</p>
                                            <p className="text-xs text-gray-400 mt-1">ابدأ المحادثة بردك الأول</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <AnimatePresence>
                                                {messages.map((msg) => {
                                                    const isOwn = msg.senderId === agentId;
                                                    return (
                                                        <motion.div
                                                            key={msg.id}
                                                            initial={{ opacity: 0, y: 20 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className={`flex ${isOwn ? "justify-start" : "justify-end"}`}
                                                        >
                                                            <div
                                                                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isOwn
                                                                        ? "bg-gradient-to-r from-[#C9A962] to-[#B8956E] text-white rounded-bl-none"
                                                                        : "bg-white shadow-md border border-[#E8E0D8] rounded-br-none"
                                                                    } ${msg.error ? "opacity-70" : ""}`}
                                                            >
                                                                <p className="text-sm break-words">{msg.content}</p>
                                                                <div className="flex items-center gap-1 mt-1">
                                                                    <p className={`text-[10px] ${isOwn ? "text-white/60" : "text-gray-400"}`}>
                                                                        {formatTime(msg.createdAt)}
                                                                    </p>
                                                                    {isOwn && getMessageStatus(msg)}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </AnimatePresence>
                                            <div ref={messagesEndRef} />
                                        </div>
                                    )}
                                </ScrollArea>

                                {/* Input Area */}
                                <div className="p-4 bg-white border-t border-[#E8E0D8] shrink-0">
                                    <div className="flex gap-2">
                                        <Input
                                            ref={inputRef}
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage();
                                                }
                                            }}
                                            placeholder="اكتب ردك هنا..."
                                            className="flex-1 bg-[#FAF7F2] border-[#E8E0D8] rounded-xl focus:border-[#C9A962]"
                                            disabled={isSending}
                                        />
                                        <Button
                                            onClick={handleSendMessage}
                                            disabled={!message.trim() || isSending}
                                            className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white rounded-xl px-6 shadow-md"
                                        >
                                            {isSending ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Send className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Mobile view (conversations list or chat, one at a time)
    return (
        <div className="bg-white rounded-3xl shadow-xl border border-[#E8E0D8] overflow-hidden h-[calc(100vh-180px)] min-h-[500px]">
            {!showChat ? (
                // Conversations List View (Mobile)
                <div className="flex flex-col h-full bg-gradient-to-b from-[#FAF7F2] to-white">
                    {/* Header */}
                    <div className="p-4 border-b border-[#E8E0D8] bg-white sticky top-0">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h2 className="text-lg font-bold text-[#3D3021] flex items-center gap-2">
                                    <MessageCircle className="h-5 w-5 text-[#C9A962]" />
                                    الرسائل
                                </h2>
                                <p className="text-xs text-[#8B7355]">{conversations.length} محادثة</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={fetchConversations}
                                className="rounded-full"
                            >
                                <Loader2 className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                            </Button>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C9A962]" />
                            <Input
                                placeholder="ابحث عن عميل..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pr-10 bg-[#FAF7F2] border-[#E8E0D8] rounded-xl text-sm"
                            />
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="px-4 pt-3">
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                            <TabsList className="w-full bg-gray-100 rounded-xl p-1">
                                <TabsTrigger value="all" className="flex-1 rounded-lg text-xs py-1.5">
                                    الكل
                                </TabsTrigger>
                                <TabsTrigger value="unread" className="flex-1 rounded-lg text-xs py-1.5">
                                    غير مقروءة
                                </TabsTrigger>
                                <TabsTrigger value="active" className="flex-1 rounded-lg text-xs py-1.5">
                                    نشطة
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    {/* Conversations List - Improved scrolling */}
                    <ScrollArea className="flex-1 p-3 h-full min-h-0">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-64">
                                <Sparkles className="h-8 w-8 animate-spin text-[#C9A962]" />
                                <p className="text-[#8B7355] mt-3 text-sm">جاري التحميل...</p>
                            </div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                    <MessageCircle className="h-8 w-8 text-gray-300" />
                                </div>
                                <p className="text-[#8B7355] font-medium">لا توجد محادثات</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {searchTerm ? "لا توجد نتائج للبحث" : "ستظهر هنا المحادثات الجديدة"}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredConversations.map((conv) => {
                                    const lastMessage = conv.messages?.[conv.messages.length - 1];
                                    const unreadCount = conv.unreadCount || 0;

                                    return (
                                        <motion.button
                                            key={`conv-${conv.id}-${conv.updatedAt}`}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            onClick={() => setActiveConversation(conv)}
                                            className="w-full text-right p-3 rounded-xl transition-all active:bg-gray-50"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="relative shrink-0">
                                                    <Avatar className="w-12 h-12">
                                                        <AvatarFallback className="bg-gradient-to-br from-[#C9A962] to-[#B8956E] text-white font-bold text-lg">
                                                            {conv.customer?.name?.charAt(0) || "ع"}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    {unreadCount > 0 && (
                                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                                                            {unreadCount > 9 ? "9+" : unreadCount}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-bold text-[#3D3021] text-sm truncate">
                                                            {conv.customer?.name || "عميل"}
                                                        </h4>
                                                        <span className="text-[10px] text-gray-400 shrink-0 mr-2">
                                                            {formatTime(conv.updatedAt)}
                                                        </span>
                                                    </div>
                                                    {lastMessage && (
                                                        <p className="text-xs text-gray-500 truncate mt-1">
                                                            {lastMessage.senderId === agentId ? "أنت: " : ""}
                                                            {lastMessage.content}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            ) : (
                // Chat View (Mobile)
                <div className="flex flex-col h-full bg-white">
                    {/* Chat Header */}
                    <div className="p-3 border-b border-[#E8E0D8] bg-white shrink-0 flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full shrink-0"
                            onClick={() => {
                                setShowChat(false);
                                setActiveConversation(null);
                                setMessages([]);
                            }}
                        >
                            <ArrowRight className="h-5 w-5 text-gray-600" />
                        </Button>
                        <Avatar className="w-10 h-10 shrink-0">
                            <AvatarFallback className="bg-gradient-to-br from-[#C9A962] to-[#B8956E] text-white font-bold">
                                {activeConversation?.customer?.name?.charAt(0) || "ع"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <h3 className="font-bold text-[#3D3021] text-sm">
                                {activeConversation?.customer?.name || "عميل"}
                            </h3>
                            <div className="flex items-center gap-1 mt-0.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
                                <p className="text-xs text-gray-500">{isConnected ? "متصل" : "غير متصل"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <ScrollArea className="flex-1 p-3 bg-gradient-to-b from-[#FAF7F2] to-white h-full min-h-0">
                        {isLoadingMessages ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-[#C9A962]" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                    <MessageCircle className="h-8 w-8 text-gray-300" />
                                </div>
                                <p className="text-[#8B7355] text-sm">لا توجد رسائل بعد</p>
                                <p className="text-xs text-gray-400 mt-1">رد على العميل لبدء المحادثة</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <AnimatePresence>
                                    {messages.map((msg) => {
                                        const isOwn = msg.senderId === agentId;
                                        return (
                                            <motion.div
                                                key={msg.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`flex ${isOwn ? "justify-start" : "justify-end"}`}
                                            >
                                                <div
                                                    className={`max-w-[80%] rounded-2xl px-3 py-2 ${isOwn
                                                            ? "bg-gradient-to-r from-[#C9A962] to-[#B8956E] text-white rounded-bl-none"
                                                            : "bg-white shadow-sm border border-[#E8E0D8] rounded-br-none"
                                                        }`}
                                                >
                                                    <p className="text-sm break-words">{msg.content}</p>
                                                    <p className={`text-[10px] mt-1 ${isOwn ? "text-white/60" : "text-gray-400"}`}>
                                                        {formatTime(msg.createdAt)}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </ScrollArea>

                    {/* Input Area */}
                    <div className="p-3 bg-white border-t border-[#E8E0D8] shrink-0">
                        <div className="flex gap-2">
                            <Input
                                ref={inputRef}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder="اكتب ردك..."
                                className="flex-1 bg-[#FAF7F2] border-[#E8E0D8] rounded-xl text-sm"
                                disabled={isSending}
                            />
                            <Button
                                onClick={handleSendMessage}
                                disabled={!message.trim() || isSending}
                                size="sm"
                                className="bg-gradient-to-r from-[#C9A962] to-[#B8956E] hover:from-[#B8956E] hover:to-[#9A7B4F] text-white rounded-xl px-4"
                            >
                                {isSending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}