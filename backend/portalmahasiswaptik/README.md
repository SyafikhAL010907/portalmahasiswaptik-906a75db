# Portal Mahasiswa PTIK - Go Backend API

Backend API untuk Portal Mahasiswa PTIK menggunakan Go (Golang) dengan Fiber framework dan GORM ORM.

## 📋 Fitur

- **Authentication & Authorization**
  - JWT validation (Supabase tokens)
  - Role-Based Access Control (RBAC)
  - Class-scoped data isolation

- **User Management**
  - CRUD operations for users
  - Role assignment (admin_dev, admin_kelas, admin_dosen, mahasiswa)
  - Profile management

- **Finance Module**
  - Transaction management (income/expense)
  - Chart data for Recharts visualization
  - Per-class financial breakdown
  - Weekly dues tracking

- **Attendance System**
  - QR code generation for lecturers
  - QR scanning for students
  - Geolocation validation (150m campus radius)
  - Session management with auto-expiry

## 🛠️ Tech Stack

- **Go 1.21+**
- **Fiber v2** - Web framework
- **GORM** - ORM for PostgreSQL
- **Supabase** - Database & Authentication

## 📁 Project Structure

```
backend/portalmahasiswaptik/
├── cmd/
│   └── server/
│       └── main.go           # Entry point
├── internal/
│   ├── config/
│   │   └── database.go       # Database connection
│   ├── handlers/
│   │   ├── attendance.go     # Attendance API handlers
│   │   ├── finance.go        # Finance API handlers
│   │   └── user.go           # User API handlers
│   ├── middleware/
│   │   └── auth.go           # JWT & RBAC middleware
│   ├── models/
│   │   └── models.go         # GORM models
│   └── routes/
│       └── routes.go         # Route definitions
├── .env.example              # Environment template
├── go.mod                    # Go module definition
└── README.md                 # This file
```

## 🚀 Getting Started

### Prerequisites

- Go 1.21 or later
- Access to Supabase project (owqjsqvpmsctztpgensg)

### Installation

1. **Clone and navigate to backend:**
   ```bash
   cd backend/portalmahasiswaptik
   ```

2. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Configure `.env` file:**
   ```env
   PORT=8080
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.owqjsqvpmsctztpgensg.supabase.co:5432/postgres
   JWT_SECRET=your_supabase_jwt_secret
   SUPABASE_URL=https://owqjsqvpmsctztpgensg.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ALLOWED_ORIGINS=http://localhost:5173,https://portalmahasiswaptik.lovable.app
   ```

4. **Install dependencies:**
   ```bash
   go mod download
   ```

5. **Run the server:**
   ```bash
   go run cmd/server/main.go
   ```

6. **Server will start at:**
   ```
   http://localhost:8080
   ```

## 📡 API Endpoints

### Public Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/docs` | API documentation |
| GET | `/api/config` | Supabase public config |

### User Endpoints (Authenticated)
| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/api/profile` | All | Get current user profile |
| GET | `/api/classes` | All | List all classes |
| GET | `/api/users` | Admin | List users with filters |
| GET | `/api/users/:id` | All | Get user by ID |
| POST | `/api/users` | AdminDev | Create new user |
| PUT | `/api/users/:id` | Owner/Admin | Update user |
| DELETE | `/api/users/:id` | AdminDev | Delete user |

### Finance Endpoints (Authenticated)
| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/api/finance/summary` | All | Financial summary with chart data |
| GET | `/api/finance/transactions` | All | List transactions |
| POST | `/api/finance/transaction` | Admin | Create transaction |
| GET | `/api/finance/dues/summary` | Admin | Dues collection summary |

### Attendance Endpoints (Authenticated)
| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/api/attendance/subjects` | All | List subjects |
| GET | `/api/attendance/meetings/:id` | All | List meetings for subject |
| POST | `/api/attendance/session` | Dosen | Create QR session |
| GET | `/api/attendance/sessions` | Dosen | List active sessions |
| POST | `/api/attendance/scan` | Mahasiswa | Scan QR code |
| GET | `/api/attendance/records` | All | List attendance records |
| POST | `/api/attendance/session/:id/refresh` | Dosen | Refresh QR code |
| POST | `/api/attendance/session/:id/deactivate` | Dosen | End session |

## 🔐 RBAC (Role-Based Access Control)

| Role | Permissions |
|------|-------------|
| `admin_dev` | Full access to all resources across all classes |
| `admin_kelas` | CRUD for finance/repository, scoped to own class only |
| `admin_dosen` | QR generation for attendance, read-only for other modules |
| `mahasiswa` | QR scanning, read-only access to finance/repository |

## 📊 Finance Chart Data Format

The `/api/finance/summary` endpoint returns data formatted for Recharts:

```json
{
  "success": true,
  "data": {
    "total_income": 15000000,
    "total_expense": 5000000,
    "balance": 10000000,
    "chart_data": [
      { "name": "Class A", "income": 5000000, "expense": 2000000, "balance": 3000000 },
      { "name": "Class B", "income": 5000000, "expense": 1500000, "balance": 3500000 },
      { "name": "Class C", "income": 5000000, "expense": 1500000, "balance": 3500000 }
    ],
    "monthly_breakdown": [
      { "month": "Jan", "income": 2000000, "expense": 500000 },
      { "month": "Feb", "income": 2500000, "expense": 600000 }
    ]
  }
}
```

## 🎯 Frontend Integration

### Update React to use Go Backend:

```typescript
// src/lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export async function fetchFinanceSummary(token: string) {
  const response = await fetch(`${API_BASE_URL}/finance/summary`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return response.json();
}
```

### Using with Recharts:

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

function FinanceChart({ data }) {
  return (
    <BarChart width={600} height={300} data={data.chart_data}>
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="income" fill="#22c55e" name="Pemasukan" />
      <Bar dataKey="expense" fill="#ef4444" name="Pengeluaran" />
    </BarChart>
  );
}
```

## 🐳 Docker Deployment

```dockerfile
# Dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main cmd/server/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE 8080
CMD ["./main"]
```

```bash
# Build and run
docker build -t portal-ptik-api .
docker run -p 8080:8080 --env-file .env portal-ptik-api
```

## 📝 Notes

1. **Supabase Auth**: This backend validates Supabase JWT tokens. User creation still requires Supabase Admin API.

2. **Database**: Uses the existing Supabase PostgreSQL database. No migrations needed.

3. **CORS**: Configure `ALLOWED_ORIGINS` for your frontend domains.

4. **Geolocation**: Campus coordinates set to Jakarta State University. Update `CampusLatitude` and `CampusLongitude` in `handlers/attendance.go`.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create Pull Request

## 📄 License

MIT License - PTIK UNJ 2025
