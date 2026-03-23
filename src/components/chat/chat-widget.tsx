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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { io, Socket } from "socket.io-client";
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
}

export function ChatWidget({ userId, userName, userRole, productId }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Connect to WebSocket
  useEffect(() => {
    if (!isOpen) return;

    const socket = io("/?XTransformPort=3030", {
      auth: { userId, role: userRole },
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("🔌 Chat connected");
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("🔌 Chat disconnected");
      setIsConnected(false);
    });

    socket.on("new-message", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("user-typing", (data: { userId: string; isTyping: boolean }) => {
      if (data.userId !== userId) {
        setIsTyping(data.isTyping);
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [isOpen, userId, userRole]);

  // Load existing conversation or create new one
  useEffect(() => {
    if (!isOpen) return;

    const loadConversation = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/chat/conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId: userId, productId }),
        });

        if (response.ok) {
          const data = await response.json();
          setConversation(data.conversation);
          setMessages(data.conversation?.messages || []);

          // Join conversation room
          if (data.conversation?.id) {
            socketRef.current?.emit("join-conversation", data.conversation.id);
          }
        }
      } catch (error) {
        console.error("Error loading conversation:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversation();
  }, [isOpen, userId, productId]);

  // Send message
  const handleSendMessage = useCallback(() => {
    if (!message.trim() || !conversation?.id || !isConnected) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      senderId: userId,
      senderName: userName,
      senderRole: userRole,
      content: message.trim(),
      createdAt: new Date(),
      isRead: false,
    };

    // Add to local state immediately
    setMessages((prev) => [...prev, newMessage]);
    setMessage("");

    // Send to server
    socketRef.current?.emit("send-message", {
      conversationId: conversation.id,
      message: newMessage,
      recipientId: conversation.agentId,
    });

    // Save to database
    fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: conversation.id,
        senderId: userId,
        content: newMessage.content,
      }),
    });
  }, [message, conversation?.id, conversation?.agentId, isConnected, userId, userName, userRole]);

  // Typing indicator
  const handleTyping = useCallback(() => {
    if (conversation?.id) {
      socketRef.current?.emit("typing", {
        conversationId: conversation.id,
        isTyping: true,
      });

      // Stop typing after 2 seconds
      setTimeout(() => {
        socketRef.current?.emit("typing", {
          conversationId: conversation.id,
          isTyping: false,
        });
      }, 2000);
    }
  }, [conversation?.id]);

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
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-[var(--gold-light)] to-[var(--gold)] shadow-lg hover:shadow-xl flex items-center justify-center text-white"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
          {messages.filter((m) => !m.isRead && m.senderId !== userId).length > 0
            ? messages.filter((m) => !m.isRead && m.senderId !== userId).length
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
      className={`fixed bottom-6 left-6 z-50 bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
        isMinimized ? "w-80 h-14" : "w-80 md:w-96 h-[500px]"
      }`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--gold-light)] to-[var(--gold)] text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-white/20 text-white">
              <Headphones className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-bold text-sm">خدمة العملاء</h3>
            <p className="text-xs text-white/80 flex items-center gap-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-400" : "bg-red-400"
                }`}
              />
              {isConnected ? "متصل" : "غير متصل"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
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
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      {!isMinimized && (
        <>
          <ScrollArea className="h-[340px] p-4 bg-gray-50">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--gold)]" />
              </div>
            ) : messages.length === 0 ? (
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
                        msg.senderId === userId ? "justify-start" : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          msg.senderId === userId
                            ? "bg-[var(--gold)] text-white rounded-bl-none"
                            : "bg-white shadow rounded-br-none"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            msg.senderId === userId
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
                  handleTyping();
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
    </motion.div>
  );
}
