import{NextResponse}from'next/server';import{PrismaClient}from'@prisma/client';
const prisma=new PrismaClient();

export async function GET(){
  try{
    console.log('🔄 Database Setup (SECURED)...');
    
    // STEP 1: Create ALL Enums FIRST! ✅ FIXED
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS(SELECT 1 FROM pg_type WHERE typname='UserRole') THEN
          CREATE TYPE "UserRole" AS ENUM('ADMIN','AGENT','MERCHANT','CUSTOMER','GUEST');
        END IF;
        IF NOT EXISTS(SELECT 1 FROM pg_type WHERE typname='OrderStatus') THEN
          CREATE TYPE "OrderStatus" AS ENUM('PENDING','PROCESSING','SHIPPED','DELIVERED','COMPLETED','CANCELLED');
        END IF;
        IF NOT EXISTS(SELECT 1 FROM pg_type WHERE typname='PaymentStatus') THEN
          CREATE TYPE "PaymentStatus" AS ENUM('PENDING','CONFIRMED','REJECTED');
        END IF;
        IF NOT EXISTS(SELECT 1 FROM pg_type WHERE typname='ConversationStatus') THEN
          CREATE TYPE "ConversationStatus" AS ENUM('ACTIVE','CLOSED');
        END IF;
        IF NOT EXISTS(SELECT 1 FROM pg_type WHERE typname='VerificationType') THEN
          CREATE TYPE "VerificationType" AS ENUM('EMAIL_VERIFICATION','PASSWORD_RESET');
        END IF;
      END $$
    `);
    console.log('✅ Enums created');

    // STEP 2: Create tables with proper enum types
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS users(
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password TEXT NOT NULL,
        phone TEXT NOT NULL,address TEXT,
        role "UserRole" NOT NULL DEFAULT 'CUSTOMER',
        "isVerified" BOOLEAN DEFAULT false,"isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT NOW(),"updatedAt" TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      
      CREATE TABLE IF NOT EXISTS categories(
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,"nameAr" TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,
        image TEXT,"createdAt" TIMESTAMP DEFAULT NOW(),"updatedAt" TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS products(
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,"nameAr" TEXT NOT NULL,description TEXT,"descriptionAr" TEXT,
        price DOUBLE PRECISION NOT NULL,"originalPrice" DOUBLE PRECISION,
        images TEXT NOT NULL,"mainImage" TEXT NOT NULL,
        stock INTEGER DEFAULT 0,sku TEXT,
        "isActive" BOOLEAN DEFAULT true,"isFeatured" BOOLEAN DEFAULT false,
        colors TEXT,sizes TEXT,"videoUrl" TEXT,
        "featuresAr" TEXT,"usageAr" TEXT,"ingredientsAr" TEXT,
        "inStock" BOOLEAN DEFAULT true,"estimatedDays" INTEGER,"merchantId" TEXT,
        "categoryId" TEXT REFERENCES categories(id) ON DELETE SET NULL,
        "agentId" TEXT REFERENCES users(id),
        "createdAt" TIMESTAMP DEFAULT NOW(),"updatedAt" TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_products_category ON products("categoryId");
      
      CREATE TABLE IF NOT EXISTS orders(
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "customerId" TEXT NOT NULL REFERENCES users(id),
        "agentId" TEXT REFERENCES users(id),
        status "OrderStatus" NOT NULL DEFAULT 'PENDING',
        "totalAmount" DOUBLE PRECISION NOT NULL,notes TEXT,
        address TEXT,phone TEXT,governorate TEXT,
        "paymentMethod" TEXT,"paymentDetails" TEXT,
        "governorateId" TEXT,"deliveryFee" DOUBLE PRECISION DEFAULT 0,
        "paymentStatus" "PaymentStatus" DEFAULT 'PENDING',
        "createdAt" TIMESTAMP DEFAULT NOW(),"updatedAt" TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS order_items(
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "orderId" TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        "productId" TEXT NOT NULL REFERENCES products(id),
        quantity INTEGER DEFAULT 1,price DOUBLE PRECISION NOT NULL,
        color TEXT,"createdAt" TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS conversations(
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "customerId" TEXT NOT NULL REFERENCES users(id),
        "agentId" TEXT REFERENCES users(id),"productId" TEXT,
        status "ConversationStatus" DEFAULT 'ACTIVE',
        "createdAt" TIMESTAMP DEFAULT NOW(),"updatedAt" TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS messages(
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "conversationId" TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        "senderId" TEXT NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,"productImage" TEXT,
        "isRead" BOOLEAN DEFAULT false,"createdAt" TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS verification_codes(
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code TEXT NOT NULL,type "VerificationType" NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,used BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS notifications(
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,title TEXT NOT NULL,message TEXT NOT NULL,
        data TEXT,"isRead" BOOLEAN DEFAULT false,"createdAt" TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS settings(
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        key TEXT UNIQUE NOT NULL,value TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),"updatedAt" TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS merchants(
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" TEXT UNIQUE NOT NULL REFERENCES users(id),
        "storeName" TEXT NOT NULL,"storeType" TEXT NOT NULL,
        "fullName" TEXT NOT NULL,phone TEXT NOT NULL,email TEXT NOT NULL,
        address TEXT NOT NULL,"identityCardImage" TEXT NOT NULL,
        "jeibWallet" TEXT,"kashWallet" TEXT,"jawaliWallet" TEXT,
        "transferInfo" TEXT,"isApproved" BOOLEAN DEFAULT false,
        "isActive" BOOLEAN DEFAULT true,"commissionAmount" DOUBLE PRECISION DEFAULT 0,
        "totalSales" DOUBLE PRECISION DEFAULT 0,"totalCommission" DOUBLE PRECISION DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW(),"updatedAt" TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS governorates(
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT UNIQUE NOT NULL,"nameAr" TEXT NOT NULL,
        "deliveryFee" DOUBLE PRECISION DEFAULT 0,"isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT NOW(),"updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('🎉 All tables created successfully!');
    return NextResponse.json({success:true,message:'✅ تم إنشاء الجداول والـ Enums بنجاح! زر /api/admin/init'});
  }catch(e:any){
    console.error('❌ Error:',e);
    return NextResponse.json({error:String(e)},{status:500});
  }finally{await prisma.$disconnect();}
}