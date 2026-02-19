# Math & Fils Timesheet - Frontend

## Next.js 14 + TypeScript + TailwindCSS

This is the frontend application for the Math & Fils Timesheet management system.

## Setup

### 1. Install Dependencies

```powershell
cd frontend
npm install
```

This will install:
- Next.js 14
- React 18
- TypeScript
- TailwindCSS
- React Hot Toast (notifications)
- Axios (API calls)
- TanStack React Query (data fetching)
- Zustand (state management)
- date-fns (date formatting)
- Lucide React (icons)

###  2. Install Additional UI Dependencies

```powershell
npm install tailwindcss-animate
```

### 3. Start Development Server

```powershell
npm run dev
```

The application will be available at: **http://localhost:3000**

---

## Project Structure

```
frontend/
├── app/                      # Next.js 14 App Router
│   ├── layout.tsx           # Root layout with providers
│   ├── page.tsx             # Home/redirect page
│   ├── globals.css          # Global styles + Tailwind
│   ├── login/               
│   │   └── page.tsx         # Login page
│   ├── dashboard/           
│   │   └── page.tsx         # Employee dashboard
│   ├── timesheets/          
│   │   ├── page.tsx         # Timesheets list
│   │   ├── new/page.tsx     # Create timesheet
│   │   └── [id]/            # Dynamic routes
│   └── admin/               
│       ├── dashboard/       # Admin dashboard
│       ├── timesheets/      # Admin timesheet management
│       └── invitations/     # Invitation management
│
├── components/              
│   ├── ui/                  # Base UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── badge.tsx
│   │   └── card.tsx
│   └── providers/
│       └── query-provider.tsx
│
├── lib/                     
│   ├── api.ts               # API client + all endpoints
│   ├── store.ts             # Zustand auth store
│   ├── types.ts             # TypeScript types
│   └── utils.ts             # Utility functions
│
├── public/                  
├── .env.local               # Environment variables
├── next.config.js           
├── tailwind.config.ts       
├── tsconfig.json            
└── package.json             
```

---

## Pages Created

### ✅ Public Pages
- **Login** (`/login`) - User authentication
- **Activate** (`/activate`) - Account activation (to be added)

### ✅ Employee Pages
- **Dashboard** (`/dashboard`) - Overview & recent timesheets
- **New Timesheet** (`/timesheets/new`) - Create new timesheet
- **Timesheets List** (`/timesheets`) - View all timesheets
- **Timesheet Detail** (`/timesheets/[id]`) - View single timesheet
- **Edit Timesheet** (`/timesheets/[id]/edit`) - Edit draft

### ⏳ Admin Pages (To be added)
- **Admin Dashboard** (`/admin/dashboard`)
- **Pending Approvals** (`/admin/timesheets/pending`)
- **All Timesheets** (`/admin/timesheets/all`)
- **Invite Employee** (`/admin/users/invite`)
- **Manage Invitations** (`/admin/invitations`)
- **User Management** (`/admin/users`)

---

## Features Implemented

### Authentication
- ✅ Login with email/password
- ✅ JWT token management
- ✅ Auto-redirect based on role (Admin/Employee)
- ✅ Logout functionality
- ✅ Protected routes

### State Management
- ✅ Zustand for auth state
- ✅ LocalStorage persistence
- ✅ React Query for server state

### API Integration
- ✅ Axios client with interceptors
- ✅ Automatic token injection
- ✅ 401 handling (auto-logout)
- ✅ Error handling

### UI Components
- ✅ Button (multiple variants)
- ✅ Input fields
- ✅ Labels
- ✅ Badges (Draft, Pending, Approved, Rejected)
- ✅ Cards
- ✅ Toast notifications

### Dashboard
- ✅ Stats cards (Draft, Pending, Approved counts)
- ✅ Recent timesheets list
- ✅ Status badges
- ✅ Quick actions
- ✅ Empty states

---

## Environment Variables

Create `.env.local` file (already created):

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

---

## API Endpoints Used

All endpoints are defined in `lib/api.ts`:

### Authentication
- `POST /auth/login` - Login
- `POST /auth/activate` - Activate account

### Timesheets
- `GET /timesheets` - Get all timesheets
- `GET /timesheets/:id` - Get single timesheet
- `POST /timesheets` - Create timesheet
- `PATCH /timesheets/:id` - Update timesheet
- `POST /timesheets/:id/submit` - Submit for approval
- `DELETE /timesheets/:id` - Delete draft

### Admin (Timesheets)
- `POST /timesheets/:id/approve` - Approve timesheet
- `POST /timesheets/:id/reject` - Reject timesheet

### Invitations
- `GET /users/invitations` - List invitations
- `POST /users/invitations` - Create invitation
- `DELETE /users/invitations/:id` - Revoke invitation

### Users
- `GET /users` - Get all users
- `GET /users/profile` - Get current user

### Exports
- `POST /exports/excel` - Generate Excel file

---

## Test Accounts

### Admin
- **Email**: `admin@mathfils.com`
- **Password**: `Admin@123`

### Employee
- **Email**: `employee@mathfils.com`
- **Password**: `Employee@123`

---

## Development Commands

```powershell
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linter
npm run lint
```

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast
- **Icons**: Lucide React
- **Date Handling**: date-fns

---

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Start dev server: `npm run dev`
3. ⏳ Create remaining pages:
   - Timesheet creation form
   - Timesheet list with filters
   - Admin pages
4. ⏳ Add more UI components as needed
5. ⏳ Implement notification bell
6. ⏳ Add responsive mobile design
7. ⏳ Add form validation
8. ⏳ Add loading states
9. ⏳ Add error boundaries

---

## Notes

- All lint errors will resolve after running `npm install`
- Backend must be running at `http://localhost:3001`
- Database must be set up and migrated
- CORS is configured to allow `http://localhost:3000`

---

**Status**: Core structure complete | Ready for development
**Next**: Run `npm install` and start building features!
