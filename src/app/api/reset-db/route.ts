import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    console.log('🗑️ Starting database reset...');

    // ==================== حذف جميع الجداول ====================
    
    const tables = [
      'order_items',
      'messages',
      'conversations',
      'verification_codes',
      'settings',
      'orders',
      'products',
      'categories',
      'users',
    ];

    // حذف الجداول
    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS ${table} CASCADE;`);
        console.log(`✅ Dropped table: ${table}`);
      } catch (e) {
        console.log(`⚠️ Could not drop ${table}`);
      }
    }

    console.log('🔄 Creating new tables...');

    // ==================== إنشاء الجداول الجديدة ====================

    // 1. إنشاء جدول المستخدمين
    await prisma.$executeRawUnsafe(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT,
        role TEXT NOT NULL DEFAULT 'CUSTOMER',
        "isVerified" BOOLEAN DEFAULT false,
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Users table created');

    // 2. إنشاء جدول التصنيفات
    await prisma.$executeRawUnsafe(`
      CREATE TABLE categories (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        "nameAr" TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        image TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Categories table created');

    // 3. إنشاء جدول المنتجات
    await prisma.$executeRawUnsafe(`
      CREATE TABLE products (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        "nameAr" TEXT NOT NULL,
        description TEXT,
        "descriptionAr" TEXT,
        price DOUBLE PRECISION NOT NULL,
        "originalPrice" DOUBLE PRECISION,
        images TEXT NOT NULL,
        "mainImage" TEXT NOT NULL,
        stock INTEGER DEFAULT 0,
        sku TEXT,
        "isActive" BOOLEAN DEFAULT true,
        "isFeatured" BOOLEAN DEFAULT false,
        "categoryId" TEXT REFERENCES categories(id) ON DELETE SET NULL,
        "agentId" TEXT NOT NULL REFERENCES users(id),
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Products table created');

    // 4. إنشاء جدول الطلبات
    await prisma.$executeRawUnsafe(`
      CREATE TABLE orders (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "customerId" TEXT NOT NULL REFERENCES users(id),
        "agentId" TEXT REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'PENDING',
        "totalAmount" DOUBLE PRECISION NOT NULL,
        notes TEXT,
        address TEXT,
        phone TEXT,
        governorate TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Orders table created');

    // 5. إنشاء جدول عناصر الطلب
    await prisma.$executeRawUnsafe(`
      CREATE TABLE order_items (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "orderId" TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        "productId" TEXT NOT NULL REFERENCES products(id),
        quantity INTEGER DEFAULT 1,
        price DOUBLE PRECISION NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Order items table created');

    // 6. إنشاء جدول المحادثات
    await prisma.$executeRawUnsafe(`
      CREATE TABLE conversations (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "customerId" TEXT NOT NULL REFERENCES users(id),
        "agentId" TEXT NOT NULL REFERENCES users(id),
        "productId" TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Conversations table created');

    // 7. إنشاء جدول الرسائل
    await prisma.$executeRawUnsafe(`
      CREATE TABLE messages (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "conversationId" TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        "senderId" TEXT NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        "isRead" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Messages table created');

    // 8. إنشاء جدول أكواد التحقق
    await prisma.$executeRawUnsafe(`
      CREATE TABLE verification_codes (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code TEXT NOT NULL,
        type TEXT NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Verification codes table created');

    // 9. إنشاء جدول الإعدادات
    await prisma.$executeRawUnsafe(`
      CREATE TABLE settings (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Settings table created');

    console.log('🎉 Database reset completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'تم إعادة ضبط قاعدة البيانات بنجاح! الآن اذهب إلى /api/admin/init لإنشاء حساب الإدارة',
      tablesCreated: 9,
    });
  } catch (error: unknown) {
    console.error('❌ Reset error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      error: 'حدث خطأ أثناء إعادة ضبط قاعدة البيانات',
      details: errorMessage
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
