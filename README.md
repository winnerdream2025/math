# Math & Fils Timesheet WebApp

Production-ready timesheet management system for employee time tracking, admin approvals, and payroll exports.

## Features

- ✅ **Draft Mode** - Save timesheets without submitting
- ✅ **Weekly & Bi-weekly** pay periods (40hr / 80hr caps)
- ✅ Employee timesheet submission with edit capability
- ✅ Automated overtime calculation (server-side)
- ✅ Admin approval workflow
- ✅ Excel export for payroll
- ✅ Role-based access control (RBAC)
- ✅ Audit logging
- ✅ Secure authentication (JWT)

## Tech Stack

**Frontend**: Next.js 14 + React + TypeScript + TailwindCSS + shadcn/ui  
**Backend**: NestJS + TypeScript + TypeORM  
**Database**: PostgreSQL 15+  
**Auth**: JWT with httpOnly cookies

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ (or Docker)
- pnpm (recommended) or npm

### Installation

```bash
# Clone repository
git clone <repo-url>
cd math

# Install dependencies
pnpm install

# Setup environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit .env files with your configuration

# Start PostgreSQL (Docker)
docker-compose up -d postgres

# Run database migrations
cd backend
pnpm run migration:run

# Seed database with admin user
pnpm run seed

# Start development servers
cd ..
pnpm run dev
```

### Default Credentials

**Admin**:
- Email: admin@mathfils.com
- Password: Admin@123

**Employee** (test):
- Email: employee@mathfils.com
- Password: Employee@123

**⚠️ Change these immediately in production!**

## Project Structure

```
math/
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── modules/         # Feature modules
│   │   ├── common/          # Shared utilities
│   │   └── config/          # Configuration
│   └── test/                # E2E tests
├── frontend/                # Next.js app
│   ├── src/
│   │   ├── app/             # App router
│   │   ├── components/      # UI components
│   │   └── lib/             # Utilities
│   └── public/              # Static assets
├── docker-compose.yml       # Docker services
└── docs/                    # Documentation
```

## Development

### Backend (Port 3001)
```bash
cd backend
pnpm run start:dev
```

### Frontend (Port 3000)
```bash
cd frontend
pnpm run dev
```

### Database Migrations

```bash
cd backend

# Create migration
pnpm run migration:create --name=MigrationName

# Run migrations
pnpm run migration:run

# Revert last migration
pnpm run migration:revert
```

## Testing

```bash
# Backend tests
cd backend
pnpm run test          # Unit tests
pnpm run test:e2e      # E2E tests
pnpm run test:cov      # Coverage

# Frontend tests
cd frontend
pnpm run test
```

## Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

### Build

```bash
# Backend
cd backend
pnpm run build

# Frontend
cd frontend
pnpm run build
```

### Environment Variables

**Backend** (backend/.env):
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/timesheet
JWT_SECRET=your-secret-key
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
CORS_ORIGIN=https://mathfils.org
```

**Frontend** (frontend/.env):
```env
NEXT_PUBLIC_API_URL=https://api.mathfils.org/api/v1
```

## Documentation

- [Architecture](ARCHITECTURE.md)
- [Database Schema](DATABASE_SCHEMA.md)
- [API Design](API_DESIGN.md)
- [Deployment](DEPLOYMENT.md)

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens with short expiration
- httpOnly cookies (XSS protection)
- CSRF tokens on mutations
- Rate limiting on auth endpoints
- Input validation on all endpoints
- SQL injection protection via ORM
- Role-based authorization

## Payroll Logic

- **Bi-weekly**: 14 days, 80 regular hours, overtime beyond
- **Weekly**: 7 days, 40 regular hours, overtime beyond
- Calculations done **server-side only**
- Employees cannot manually edit overtime
- Approved timesheets are locked

## Timesheet Workflow

1. **Create Draft** - Employee creates timesheet (status: DRAFT)
2. **Save & Edit** - Employee can save and update multiple times
3. **Submit** - Employee submits for approval (status: PENDING)
4. **Approve/Reject** - Admin reviews and approves/rejects
5. **Lock** - Approved timesheets are automatically locked

## Support

For issues or questions, contact IT support.

## License

Proprietary - Math & Fils Company
