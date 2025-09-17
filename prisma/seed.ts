import { PrismaClient } from '@prisma/client';
import { PasswordService } from '../app/lib/services/auth';
import { debugLogService } from '../app/lib/services/debugLogService';

const prisma = new PrismaClient();

async function main() {
  debugLogService.info('SEED', '🌱 Starting database seed...');

  // Create Super Admin user
  const superAdminEmail = 'superadmin@ebayconnector.com';
  const superAdminPassword = 'admin'; // Change this to a secure password

  try {
    // Check if Super Admin already exists
    const existingSuperAdmin = await prisma.user.findUnique({
      where: { email: superAdminEmail },
      select: {
        id: true,
        email: true,
        role: true,
      }
    });

    if (existingSuperAdmin) {
      debugLogService.info('SEED', '👤 Super Admin already exists', {
        email: existingSuperAdmin.email,
        role: existingSuperAdmin.role,
      });

      // Update role if needed
      if (existingSuperAdmin.role !== 'SUPER_ADMIN') {
        await prisma.user.update({
          where: { email: superAdminEmail },
          data: {
            role: 'SUPER_ADMIN',
          },
        });
        debugLogService.info('SEED', '✅ Updated existing user to SUPER_ADMIN role');
      }
      return;
    }

    // Hash password
    const hashedPassword = await PasswordService.hashPassword(superAdminPassword);

    // Create Super Admin user
    const superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        password: hashedPassword,
        name: 'Super Administrator',
        role: 'SUPER_ADMIN',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    debugLogService.info('SEED', '✅ Super Admin created successfully', {
      id: superAdmin.id,
      email: superAdmin.email,
      name: superAdmin.name,
      role: superAdmin.role,
      createdAt: superAdmin.createdAt
    });

  } catch (error) {
    debugLogService.error('SEED', `❌ Error creating Super Admin: ${error}`);
    throw error;
  }
}

main()
  .catch((e) => {
    debugLogService.error('SEED', `💥 Seed failed: ${e}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    debugLogService.info('SEED', '🏁 Database seed completed');
  });