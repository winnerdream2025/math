import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://mathfils:mathfils123@localhost:5432/timesheet',
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
  synchronize: true,
});

async function seed() {
  console.log('Connecting to database...');
  await dataSource.initialize();
  console.log('Connected!');

  const userRepo = dataSource.getRepository('User');

  const existingAdmin = await userRepo.findOne({ where: { email: 'admin@mathfils.com' } });
  if (!existingAdmin) {
    const adminPassword = await bcrypt.hash('Admin@123', 12);
    await userRepo.save({
      email: 'admin@mathfils.com',
      password: adminPassword,
      firstName: 'System',
      lastName: 'Admin',
      role: 'ADMIN',
      employeeNumber: 'ADMIN-001',
      isActive: true,
    });
    console.log('Admin user created: admin@mathfils.com / Admin@123');
  } else {
    console.log('Admin user already exists');
  }

  const existingEmployee = await userRepo.findOne({ where: { email: 'employee@mathfils.com' } });
  if (!existingEmployee) {
    const empPassword = await bcrypt.hash('Employee@123', 12);
    await userRepo.save({
      email: 'employee@mathfils.com',
      password: empPassword,
      firstName: 'Jane',
      lastName: 'Doe',
      role: 'EMPLOYEE',
      employeeNumber: 'EMP-002',
      isActive: true,
    });
    console.log('Employee user created: employee@mathfils.com / Employee@123');
  } else {
    console.log('Employee user already exists');
  }

  console.log('Seed completed!');
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
