"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MapPin, RefreshCw, Plus } from "lucide-react";

interface Governorate {
  id: string;
  name: string;
  nameAr: string;
  deliveryFee: number;
  isActive: boolean;
  createdAt: string;
}

interface GovernoratesTabProps {
  governorates: Governorate[];
  govForm: {
    name: string;
    nameAr: string;
    deliveryFee: string;
  };
  setGovForm: React.Dispatch<
    React.SetStateAction<{
      name: string;
      nameAr: string;
      deliveryFee: string;
    }>
  >;
  isSavingGov: boolean;
  onAddGovernorate: () => Promise<void>;
  onRefresh: () => void;
}

export function GovernoratesTab({
  governorates,
  govForm,
  setGovForm,
  isSavingGov,
  onAddGovernorate,
  onRefresh,
}: GovernoratesTabProps) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between px-4 md:px-6">
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          <MapPin className="h-5 w-5 text-[var(--gold)]" />
          إدارة المحافظات ورسوم التوصيل
        </CardTitle>
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 ml-2" />
          تحديث
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 px-4 md:px-6">
        {/* Add Form */}
        <div className="p-4 bg-gray-50 rounded-lg border overflow-x-auto">
          <h3 className="font-bold mb-3 text-[#3D3021]">إضافة محافظة جديدة</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>الاسم (إنجليزي) *</Label>
              <Input
                placeholder="e.g., Sana'a"
                value={govForm.name}
                onChange={(e) =>
                  setGovForm({ ...govForm, name: e.target.value })
                }
                dir="ltr"
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label>الاسم (عربي) *</Label>
              <Input
                placeholder="مثال: صنعاء"
                value={govForm.nameAr}
                onChange={(e) =>
                  setGovForm({ ...govForm, nameAr: e.target.value })
                }
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label>رسوم التوصيل (ر.ي) *</Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0 للمجان"
                  value={govForm.deliveryFee}
                  onChange={(e) =>
                    setGovForm({
                      ...govForm,
                      deliveryFee: e.target.value,
                    })
                  }
                  className="pl-14 bg-white"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  ر.ي
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              onClick={onAddGovernorate}
              disabled={isSavingGov}
              className="bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
            >
              {isSavingGov ? (
                <RefreshCw className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Plus className="h-4 w-4 ml-2" />
              )}
              إضافة محافظة
            </Button>
          </div>
        </div>

        {/* List */}
        {governorates.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-[var(--muted-foreground)]">
              لا توجد محافظات مضافة حالياً
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-2">
              قم بإضافة المحافظات لتحديد رسوم التوصيل
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">
                    المحافظة (عربي)
                  </TableHead>
                  <TableHead className="min-w-[150px]">
                    المحافظة (إنجليزي)
                  </TableHead>
                  <TableHead className="min-w-[120px]">رسوم التوصيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {governorates.map((gov) => (
                  <TableRow key={gov.id}>
                    <TableCell className="font-medium">{gov.nameAr}</TableCell>
                    <TableCell dir="ltr" className="text-gray-500">
                      {gov.name}
                    </TableCell>
                    <TableCell>
                      {gov.deliveryFee === 0 ? (
                        <Badge className="bg-green-500">توصيل مجاني</Badge>
                      ) : (
                        <span className="font-bold text-[var(--gold-dark)]">
                          {gov.deliveryFee.toLocaleString()} ر.ي
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
