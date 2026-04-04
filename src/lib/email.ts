/**
 * Email Service using Brevo (Sendinblue) API
 * 
 * Brevo is a reliable email service provider.
 * Free tier: 300 emails/day forever
 */

// Email configuration - IMPORTANT: The sender email MUST match the verified sender in Brevo
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "nbrasalsma@gmail.com";
const SENDER_NAME = process.env.BREVO_SENDER_NAME || "تَرِفَة";

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using Brevo API
 * 
 * NOTE: The sender email must be verified in your Brevo account.
 * Go to https://app.brevo.com/senders to verify your sender email.
 */
export async function sendEmail(options: EmailOptions): Promise<SendResult> {
  if (!BREVO_API_KEY) {
    console.warn("BREVO_API_KEY not configured - email will not be sent");
    return { success: false, error: "Email service not configured" };
  }

  try {
    console.log(`Sending email from ${SENDER_NAME} <${SENDER_EMAIL}> to ${options.to}`);
    
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: SENDER_NAME,
          email: SENDER_EMAIL,
        },
        to: Array.isArray(options.to)
          ? options.to.map(email => ({ email }))
          : [{ email: options.to }],
        subject: options.subject,
        htmlContent: options.html,
        textContent: options.text || options.html.replace(/<[^>]*>/g, ""),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Email send error:", data);
      return { 
        success: false, 
        error: data.message || data.errors?.[0]?.message || "Failed to send email" 
      };
    }

    console.log("Email sent successfully via Brevo:", data.messageId);
    return { 
      success: true, 
      messageId: data.messageId 
    };
  } catch (error) {
    console.error("Email send error:", error);
    return { 
      success: false, 
      error: "Failed to connect to email service" 
    };
  }
}

/**
 * Send verification code email
 */
export async function sendVerificationEmail(
  email: string,
  code: string,
  name: string
): Promise<SendResult> {
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>تَرِفَة - كود التحقق</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <tr>
          <td style="text-align: center; padding: 30px 0;">
            <h1 style="color: #b8860b; font-size: 32px; margin: 0; font-weight: bold;">تَرِفَة</h1>
            <p style="color: #888; font-size: 14px; margin: 5px 0 0 0;">وجهتك للأناقة والفخامة</p>
          </td>
        </tr>
        
        <!-- Content -->
        <tr>
          <td style="background-color: #ffffff; border-radius: 16px; padding: 40px 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #333; font-size: 24px; margin: 0 0 20px 0; text-align: center;">
              مرحباً ${name}! 👋
            </h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6; text-align: center; margin: 0 0 30px 0;">
              شكراً لتسجيلك في متجر تَرِفَة
              <br>
              يرجى إدخال الكود التالي للتحقق من بريدك الإلكتروني:
            </p>
            
            <!-- Code Box -->
            <div style="background: linear-gradient(135deg, #fdf2f8 0%, #fef3c7 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 0 0 30px 0;">
              <p style="color: #888; font-size: 14px; margin: 0 0 10px 0;">كود التحقق</p>
              <div style="font-size: 36px; font-weight: bold; color: #b8860b; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${code}
              </div>
            </div>
            
            <p style="color: #888; font-size: 14px; text-align: center; margin: 0 0 20px 0;">
              ⏰ هذا الكود صالح لمدة 15 دقيقة فقط
            </p>
            
            <div style="background-color: #fef3c7; border-radius: 8px; padding: 15px; text-align: center;">
              <p style="color: #92400e; font-size: 14px; margin: 0;">
                ⚠️ لم تقم بإنشاء هذا الحساب؟ تجاهل هذه الرسالة
              </p>
            </div>
          </td>
        </tr>
        
        <!-- Footer -->
        <tr>
          <td style="text-align: center; padding: 30px 0;">
            <p style="color: #888; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} تَرِفَة. جميع الحقوق محفوظة.
            </p>
            <p style="color: #aaa; font-size: 11px; margin: 10px 0 0 0;">
              هذا بريد آلي، يرجى عدم الرد عليه
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const text = `
مرحباً ${name}!

شكراً لتسجيلك في متجر تَرِفَة.

كود التحقق الخاص بك هو: ${code}

هذا الكود صالح لمدة 15 دقيقة فقط.

إذا لم تقم بإنشاء هذا الحساب، تجاهل هذه الرسالة.

---
© ${new Date().getFullYear()} تَرِفَة. جميع الحقوق محفوظة.
  `;

  return sendEmail({
    to: email,
    subject: `تَرِفَة - كود التحقق: ${code}`,
    html,
    text,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  code: string,
  name: string
): Promise<SendResult> {
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>تَرِفَة - إعادة تعيين كلمة المرور</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <tr>
          <td style="text-align: center; padding: 30px 0;">
            <h1 style="color: #b8860b; font-size: 32px; margin: 0; font-weight: bold;">تَرِفَة</h1>
            <p style="color: #888; font-size: 14px; margin: 5px 0 0 0;">وجهتك للأناقة والفخامة</p>
          </td>
        </tr>
        
        <!-- Content -->
        <tr>
          <td style="background-color: #ffffff; border-radius: 16px; padding: 40px 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #333; font-size: 24px; margin: 0 0 20px 0; text-align: center;">
              إعادة تعيين كلمة المرور 🔐
            </h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6; text-align: center; margin: 0 0 30px 0;">
              مرحباً ${name}،
              <br>
              تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك.
              <br>
              أدخل الكود التالي للمتابعة:
            </p>
            
            <!-- Code Box -->
            <div style="background: linear-gradient(135deg, #fdf2f8 0%, #fef3c7 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 0 0 30px 0;">
              <p style="color: #888; font-size: 14px; margin: 0 0 10px 0;">كود إعادة التعيين</p>
              <div style="font-size: 36px; font-weight: bold; color: #b8860b; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${code}
              </div>
            </div>
            
            <p style="color: #888; font-size: 14px; text-align: center; margin: 0 0 20px 0;">
              ⏰ هذا الكود صالح لمدة 15 دقيقة فقط
            </p>
            
            <div style="background-color: #fee2e2; border-radius: 8px; padding: 15px; text-align: center;">
              <p style="color: #991b1b; font-size: 14px; margin: 0;">
                🔒 لم تطلب هذا التغيير؟ تجاهل هذه الرسالة
              </p>
            </div>
          </td>
        </tr>
        
        <!-- Footer -->
        <tr>
          <td style="text-align: center; padding: 30px 0;">
            <p style="color: #888; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} تَرِفَة. جميع الحقوق محفوظة.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const text = `
مرحباً ${name}!

تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك.

كود إعادة التعيين: ${code}

هذا الكود صالح لمدة 15 دقيقة فقط.

إذا لم تطلب هذا التغيير، تجاهل هذه الرسالة.

---
© ${new Date().getFullYear()} تَرِفَة. جميع الحقوق محفوظة.
  `;

  return sendEmail({
    to: email,
    subject: `تَرِفَة - إعادة تعيين كلمة المرور`,
    html,
    text,
  });
}

/**
 * Send welcome email after verification
 */
export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<SendResult> {
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>تَرِفَة - مرحباً بك!</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <tr>
          <td style="text-align: center; padding: 30px 0;">
            <h1 style="color: #b8860b; font-size: 32px; margin: 0; font-weight: bold;">تَرِفَة</h1>
          </td>
        </tr>
        
        <!-- Content -->
        <tr>
          <td style="background-color: #ffffff; border-radius: 16px; padding: 40px 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center;">
            <div style="font-size: 60px; margin-bottom: 20px;">🎉</div>
            
            <h2 style="color: #333; font-size: 28px; margin: 0 0 20px 0;">
              أهلاً وسهلاً ${name}!
            </h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.8; margin: 0 0 30px 0;">
              تم تفعيل حسابك بنجاح!
              <br>
              أنتِ الآن جزء من عائلة تَرِفَة
            </p>
          </td>
        </tr>
        
        <!-- Features -->
        <tr>
          <td style="padding: 30px 0;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="text-align: center; padding: 15px;">
                  <div style="font-size: 30px; margin-bottom: 10px;">🚚</div>
                  <p style="color: #666; font-size: 14px; margin: 0;">توصيل سريع</p>
                </td>
                <td style="text-align: center; padding: 15px;">
                  <div style="font-size: 30px; margin-bottom: 10px;">💎</div>
                  <p style="color: #666; font-size: 14px; margin: 0;">منتجات أصلية</p>
                </td>
                <td style="text-align: center; padding: 15px;">
                  <div style="font-size: 30px; margin-bottom: 10px;">💬</div>
                  <p style="color: #666; font-size: 14px; margin: 0;">دعم متواصل</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        
        <!-- Footer -->
        <tr>
          <td style="text-align: center; padding: 20px 0;">
            <p style="color: #888; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} تَرِفَة. جميع الحقوق محفوظة.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `🎉 مرحباً بك في تَرِفَة!`,
    html,
  });
}
