import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    console.log('🔄 Starting database setup...');

    // ==================== إنشاء الجداول (بدون Enums - نستخدم TEXT) ====================

    // إنشاء جدول المستخدمين
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS users (
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

    // إنشاء جدول التصنيفات
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS categories (
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

    // إنشاء جدول المنتجات
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS products (
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
        "agentId" TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Products table created');

    // إنشاء جدول الطلبات
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS orders (
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

    // إنشاء جدول عناصر الطلب
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "orderId" TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        "productId" TEXT NOT NULL REFERENCES products(id),
        quantity INTEGER DEFAULT 1,
        price DOUBLE PRECISION NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Order items table created');

    // إنشاء جدول المحادثات
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS conversations (
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

    // إنشاء جدول الرسائل
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "conversationId" TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        "senderId" TEXT NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        "isRead" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Messages table created');

    // إنشاء جدول أكواد التحقق
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS verification_codes (
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

    // إنشاء جدول الإعدادات
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Settings table created');

    console.log('🎉 All tables created successfully!');

    return NextResponse.json({
      success: true,
      message: 'تم إنشاء جميع الجداول بنجاح! الآن اذهب إلى /api/admin/init'
    });
  } catch (error: unknown) {
    console.error('❌ Setup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      error: 'حدث خطأ',
      details: errorMessage
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
