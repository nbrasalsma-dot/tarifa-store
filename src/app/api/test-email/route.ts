import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ 
        success: false, 
        message: 'البريد الإلكتروني مطلوب' 
      }, { status: 400 });
    }

    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'nbrasalsma@gmail.com';

    if (!BREVO_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        message: 'مفتاح Brevo API غير موجود في الإعدادات' 
      }, { status: 500 });
    }

    // إنشاء كود تحقق عشوائي
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    console.log(`إرسال بريد من ${SENDER_EMAIL} إلى ${email}`);

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'تَرِفَة',
          email: SENDER_EMAIL,
        },
        to: [{ email }],
        subject: `تَرِفَة - كود التحقق: ${verificationCode}`,
        htmlContent: `
          <div style="text-align: center; padding: 40px; font-family: Arial, sans-serif; direction: rtl;">
            <h1 style="color: #b8860b; font-size: 32px;">تَرِفَة</h1>
            <p style="font-size: 16px;">هذا بريد اختبار من متجر تَرِفَة</p>
            <div style="background: #fdf2f8; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <p style="color: #888; font-size: 14px;">كود التحقق:</p>
              <div style="font-size: 32px; font-weight: bold; color: #b8860b; letter-spacing: 8px;">
                ${verificationCode}
              </div>
            </div>
            <p style="color: #888; font-size: 14px;">هذا الكود صالح لمدة 15 دقيقة</p>
            <p style="color: #22c55e; font-size: 16px; margin-top: 20px;">✅ إذا وصلتك هذه الرسالة، فنظام البريد يعمل بشكل صحيح!</p>
          </div>
        `,
        textContent: `كود التحقق: ${verificationCode}`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('خطأ في الإرسال:', data);
      return NextResponse.json({
        success: false,
        message: data.message || 'فشل في إرسال البريد',
        error: data.errors?.[0]?.message || 'خطأ غير معروف',
        sender: SENDER_EMAIL,
      }, { status: 200 });
    }

    console.log('تم الإرسال بنجاح:', data.messageId);

    return NextResponse.json({
      success: true,
      message: 'تم إرسال البريد بنجاح! تحقق من صندوق الوارد (أو السبام)',
      messageId: data.messageId,
      sender: SENDER_EMAIL,
      recipient: email,
      code: verificationCode,
    });

  } catch (error) {
    console.error('خطأ:', error);
    return NextResponse.json({
      success: false,
      message: 'حدث خطأ غير متوقع',
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    }, { status: 500 });
  }
}
