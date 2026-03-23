// Seed script to create admin user and sample data
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

// Hash password function using Node.js crypto
function hashPassword(password) {
  return crypto.createHash("sha256").update(password + "tarifa_salt_2024").digest("hex");
}

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const adminPassword = hashPassword("admin123");
  const admin = await prisma.user.upsert({
    where: { email: "admin@tarifa.com" },
    update: {},
    create: {
      email: "admin@tarifa.com",
      name: "جلال - الإدارة",
      password: adminPassword,
      phone: "0500000000",
      address: "الرياض، السعودية",
      role: "ADMIN",
      isVerified: true,
      isActive: true,
    },
  });
  console.log("✅ Admin user created:", admin.email);

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "perfumes" },
      update: {},
      create: {
        name: "Perfumes",
        nameAr: "عطور",
        slug: "perfumes",
        image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400",
      },
    }),
    prisma.category.upsert({
      where: { slug: "makeup" },
      update: {},
      create: {
        name: "Makeup",
        nameAr: "مكياج",
        slug: "makeup",
        image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400",
      },
    }),
    prisma.category.upsert({
      where: { slug: "accessories" },
      update: {},
      create: {
        name: "Accessories",
        nameAr: "أكسسوارات",
        slug: "accessories",
        image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400",
      },
    }),
    prisma.category.upsert({
      where: { slug: "skincare" },
      update: {},
      create: {
        name: "Skincare",
        nameAr: "عناية",
        slug: "skincare",
        image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400",
      },
    }),
  ]);
  console.log("✅ Categories created:", categories.length);

  // Check if products exist
  const existingProducts = await prisma.product.count();
  
  if (existingProducts === 0) {
    // Create sample products
    const products = [
      {
        name: "Golden Night Perfume",
        nameAr: "عطر الليل الذهبي",
        description: "A luxurious fragrance for special occasions",
        descriptionAr: "عطر فاخر للمناسبات الخاصة",
        price: 299,
        originalPrice: 450,
        mainImage: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400",
        images: JSON.stringify(["https://images.unsplash.com/photo-1541643600914-78b084683601?w=400"]),
        stock: 50,
        categoryId: categories[0].id,
        isFeatured: true,
        agentId: admin.id,
      },
      {
        name: "Luxury Eyeshadow Palette",
        nameAr: "لوحة ظلال العيون الفاخرة",
        description: "Professional eyeshadow palette with 24 shades",
        descriptionAr: "لوحة ظلال عيون احترافية بـ 24 لون",
        price: 189,
        originalPrice: 250,
        mainImage: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400",
        images: JSON.stringify(["https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400"]),
        stock: 30,
        categoryId: categories[1].id,
        isFeatured: true,
        agentId: admin.id,
      },
      {
        name: "Classic Pearl Necklace",
        nameAr: "قلادة اللؤلؤ الكلاسيكية",
        description: "Elegant pearl necklace for timeless beauty",
        descriptionAr: "قلادة لؤلؤ أنيقة لجمال خالد",
        price: 599,
        originalPrice: 800,
        mainImage: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400",
        images: JSON.stringify(["https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400"]),
        stock: 15,
        categoryId: categories[2].id,
        isFeatured: true,
        agentId: admin.id,
      },
      {
        name: "Vitamin C Serum",
        nameAr: "سيروم فيتامين سي المركز",
        description: "Concentrated vitamin C serum for radiant skin",
        descriptionAr: "سيروم فيتامين سي مركز لبشرة مشرقة",
        price: 149,
        originalPrice: 199,
        mainImage: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400",
        images: JSON.stringify(["https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400"]),
        stock: 100,
        categoryId: categories[3].id,
        isFeatured: true,
        agentId: admin.id,
      },
      {
        name: "Luxury Matte Lipstick",
        nameAr: "روج matte الفاخر",
        description: "Long-lasting matte lipstick in various shades",
        descriptionAr: "روج مات طويل الأمد بألوان متعددة",
        price: 89,
        originalPrice: 120,
        mainImage: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400",
        images: JSON.stringify(["https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400"]),
        stock: 200,
        categoryId: categories[1].id,
        isFeatured: true,
        agentId: admin.id,
      },
      {
        name: "Elegant Wristwatch",
        nameAr: "ساعة يد أنيقة",
        description: "Stylish wristwatch for modern women",
        descriptionAr: "ساعة يد عصرية للمرأة العصرية",
        price: 450,
        originalPrice: 600,
        mainImage: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400",
        images: JSON.stringify(["https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400"]),
        stock: 25,
        categoryId: categories[2].id,
        isFeatured: true,
        agentId: admin.id,
      },
    ];

    await prisma.product.createMany({
      data: products,
    });
    console.log("✅ Products created:", products.length);
  } else {
    console.log("✅ Products already exist, skipping...");
  }

  console.log("\n🎉 Seeding completed!");
  console.log("\n📋 Admin Login Credentials:");
  console.log("   Email: admin@tarifa.com");
  console.log("   Password: admin123");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
