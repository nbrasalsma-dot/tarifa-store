"use client";

import Link from "next/link";
import { Phone, Mail, MapPin, Instagram, Twitter, Facebook } from "lucide-react";

// WhatsApp number
const WHATSAPP_NUMBER = "967776080395";

export function Footer() {
  return (
    <footer className="bg-[#1A1A1A] text-white py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-1">
            <img
              src="/logo-transparent.jpg"
              alt="تَرِفَة"
              className="h-16 w-auto object-contain mb-4"
            />
            <p className="text-gray-400 mb-6">
              وجهتك الأولى للأكسسوارات وأدوات التجميل والعطور الفاخرة في اليمن
            </p>
            <div className="flex gap-4">
              <a
                href="https://www.instagram.com/tarifa.store.ye?utm_source=qr&igsh=aXYxczJtcGVoM3lp"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-[var(--gold)] flex items-center justify-center transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-[var(--gold)] flex items-center justify-center transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-[var(--gold)] flex items-center justify-center transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4">روابط سريعة</h3>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/" className="hover:text-[var(--gold)] transition-colors">
                  الرئيسية
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-[var(--gold)] transition-colors">
                  المنتجات
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-[var(--gold)] transition-colors">
                  الفئات
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[var(--gold)] transition-colors">
                  عن المتجر
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4">خدمة العملاء</h3>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/contact" className="hover:text-[var(--gold)] transition-colors">
                  تواصلي معنا
                </Link>
              </li>
              <li>
                <span className="hover:text-[var(--gold)] transition-colors cursor-pointer">
                  خدمات التوصيل
                </span>
              </li>
              <li>
                <span className="hover:text-[var(--gold)] transition-colors cursor-pointer">
                  الأسئلة الشائعة
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4">تواصلي معنا</h3>
            <ul className="space-y-3 text-gray-400">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--gold)] transition-colors"
                >
                  +967 776 080 395
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>tarifa.store.ye@gmail.com</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>صنعاء، الجمهورية اليمنية</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
          <p>© 2024 تَرِفَة. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}
