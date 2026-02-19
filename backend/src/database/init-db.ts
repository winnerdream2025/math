import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function initDb() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL || 'postgresql://mathfils:mathfils123@localhost:5432/timesheet',
    entities: [],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Database connection successful!');
    await dataSource.destroy();
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
}

initDb();
