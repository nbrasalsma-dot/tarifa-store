import { Download, FileArchive, FileDown, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-2xl w-full">
        {/* الشعار */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-rose-600 mb-2">تَرِفَة</h1>
          <p className="text-gray-600">متجر إكسسوارات وعطور نسائية فاخرة</p>
        </div>

        {/* بطاقة التحميل */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileArchive className="w-10 h-10 text-rose-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-2">تحميل ملفات الموقع</h2>
          <p className="text-gray-500 mb-6">الملفات الكاملة لمتجر تَرِفَة جاهزة للنشر</p>

          {/* زر التحميل الرئيسي - ZIP */}
          <a 
            href="/tarifa-store.zip"
            download
            className="inline-flex items-center gap-3 bg-rose-600 hover:bg-rose-700 text-white font-bold py-4 px-8 rounded-2xl text-xl transition-all transform hover:scale-105 shadow-lg mb-4"
          >
            <Download className="w-6 h-6" />
            تحميل ملف ZIP
          </a>

          <p className="text-gray-400 text-sm mb-6">
            الحجم: 888 KB | الصيغة: ZIP (سهل الفتح على Windows)
          </p>

          {/* مميزات الملف */}
          <div className="bg-green-50 rounded-xl p-4 mb-6 text-right">
            <h3 className="font-bold text-green-700 mb-3">✅ الملف يحتوي على:</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-green-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>صفحات الموقع</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>API Routes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>قاعدة البيانات</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>المكونات (Components)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>الشعار والأيقونات</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>ملف الإعدادات</span>
              </div>
            </div>
          </div>

          {/* ما بعد التحميل */}
          <div className="mt-6 pt-6 border-t border-gray-100 text-right">
            <h3 className="font-bold text-gray-700 mb-3">📋 خطوات رفع الملفات إلى GitHub:</h3>
            <ol className="text-gray-600 space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="bg-rose-100 text-rose-600 w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0">1</span>
                <span><strong>فك الضغط</strong> على جهازك (كليك يمين → Extract All)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-rose-100 text-rose-600 w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0">2</span>
                <span>افتح المجلد المفكوك و<strong>اختر جميع الملفات والمجلدات</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-rose-100 text-rose-600 w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0">3</span>
                <span>اسحبهم جميعاً إلى GitHub (upload files)</span>
              </li>
            </ol>
          </div>

          {/* نصيحة */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-4 text-right">
            <p className="text-yellow-700 text-sm">
              💡 <strong>نصيحة مهمة:</strong> عند السحب إلى GitHub، تأكد من سحب <strong>محتويات المجلد</strong> وليس المجلد نفسه. بمعنى: افتح المجلد المفكوك واختر كل ما بداخله ثم اسحبه.
            </p>
          </div>
        </div>

        {/* رابط العودة */}
        <div className="text-center mt-6">
          <Link href="/" className="inline-flex items-center gap-2 text-rose-600 hover:text-rose-700">
            ← العودة للمتجر
          </Link>
        </div>
      </div>
    </div>
  );
}
