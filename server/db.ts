import { PrismaClient } from '@prisma/client';
import { fieldEncryptionExtension } from 'prisma-field-encryption';

const globalPrisma = global as typeof global & {
  prisma?: PrismaClient;
};

export const prisma = globalPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalPrisma.prisma = prisma;
}

// Create encrypted client
export const encryptedPrisma = prisma.$extends(
  fieldEncryptionExtension({
    encryptionKey: process.env.ENCRYPTION_KEY || '',
  })
);
