import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

// إنشاء الاتصال بقاعدة البيانات بدون طباعة السجلات لتسريع الاستجابة
export const db =
    globalForPrisma.prisma ??
    new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db