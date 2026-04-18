"use client";

import { motion } from "framer-motion";
import {
  Store,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  MapPin,
  User,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Merchant {
  id: string;
  storeName: string;
  storeType: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  identityCardImage: string;
  jeibWallet: string | null;
  kashWallet: string | null;
  jawaliWallet: string | null;
  transferInfo: string | null;
  isApproved: boolean;
  isActive: boolean;
  commissionAmount: number;
  totalSales: number;
  totalCommission: number;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    phone: string;
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
  };
}

interface MerchantsTabProps {
  merchants: Merchant[];
  merchantStats: {
    total: number;
    pending: number;
    approved: number;
  };
  merchantFilter: "all" | "pending" | "approved";
  setMerchantFilter: (filter: "all" | "pending" | "approved") => void;
  onRefresh: () => void;
  onViewDetails: (merchant: Merchant) => void;
  onApproval: (merchantId: string, approved: boolean) => void;
  formatDate: (date: string) => string;
}

export function MerchantsTab({
  merchants,
  merchantStats,
  merchantFilter,
  setMerchantFilter,
  onRefresh,
  onViewDetails,
  onApproval,
  formatDate,
}: MerchantsTabProps) {
  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-4 md:p-6">
        {/* Header with Filter Buttons */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#3D3021] flex items-center gap-2">
              <Store className="h-5 w-5 text-[var(--gold)]" />
              إدارة التجار
            </h2>
            <Button onClick={onRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 ml-2" />
              تحديث
            </Button>
          </div>

          {/* Filter Buttons - Scrollable on mobile */}
          <ScrollArea orientation="horizontal" className="pb-2">
            <div className="flex gap-2 min-w-max">
              <Button
                variant={merchantFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setMerchantFilter("all")}
                className={
                  merchantFilter === "all"
                    ? "bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
                    : ""
                }
              >
                الكل ({merchantStats.total})
              </Button>
              <Button
                variant={merchantFilter === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setMerchantFilter("pending")}
                className={
                  merchantFilter === "pending"
                    ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                    : ""
                }
              >
                قيد الانتظار ({merchantStats.pending})
              </Button>
              <Button
                variant={merchantFilter === "approved" ? "default" : "outline"}
                size="sm"
                onClick={() => setMerchantFilter("approved")}
                className={
                  merchantFilter === "approved"
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : ""
                }
              >
                مفعّل ({merchantStats.approved})
              </Button>
            </div>
          </ScrollArea>
        </div>

        {/* Merchants Cards */}
        {merchants.length === 0 ? (
          <div className="text-center py-12">
            <Store className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-[var(--muted-foreground)]">
              لا يوجد تجار حالياً
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {merchants.map((merchant) => (
                <motion.div
                  key={merchant.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="overflow-hidden border-[#E8E0D8] hover:shadow-lg transition-all">
                    <CardContent className="p-0">
                      {/* Card Header */}
                      <div className="p-4 bg-gradient-to-r from-[#FAF7F2] to-white border-b border-[#E8E0D8]">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-[var(--gold)]/20 flex items-center justify-center">
                              <Store className="h-6 w-6 text-[var(--gold)]" />
                            </div>
                            <div>
                              <h3 className="font-bold text-[#3D3021]">
                                {merchant.storeName}
                              </h3>
                              <p className="text-xs text-[#8B7355]">
                                {merchant.storeType}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {merchant.isApproved ? (
                              <Badge className="bg-green-500">مفعّل</Badge>
                            ) : (
                              <Badge className="bg-yellow-500">
                                قيد الانتظار
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-3">
                        {/* Contact Info */}
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-[#C9A962] shrink-0" />
                            <span className="text-[#5D5D5D] truncate">
                              {merchant.fullName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-[#C9A962] shrink-0" />
                            <span className="text-[#5D5D5D] truncate" dir="ltr">
                              {merchant.phone}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-[#C9A962] shrink-0" />
                            <span className="text-[#5D5D5D] truncate">
                              {merchant.email}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-[#C9A962] shrink-0 mt-0.5" />
                            <span className="text-[#5D5D5D] text-sm line-clamp-2">
                              {merchant.address}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-[#C9A962] shrink-0" />
                            <span className="text-[#5D5D5D] text-sm">
                              {formatDate(merchant.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-2 border-t border-[#E8E0D8]">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => onViewDetails(merchant)}
                          >
                            <Eye className="h-4 w-4 ml-1" />
                            عرض التفاصيل
                          </Button>
                          {!merchant.isApproved && (
                            <>
                              <Button
                                size="sm"
                                className="flex-1 bg-green-500 hover:bg-green-600"
                                onClick={() => onApproval(merchant.id, true)}
                              >
                                <CheckCircle className="h-4 w-4 ml-1" />
                                موافقة
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="flex-1"
                                onClick={() => onApproval(merchant.id, false)}
                              >
                                <XCircle className="h-4 w-4 ml-1" />
                                رفض
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
