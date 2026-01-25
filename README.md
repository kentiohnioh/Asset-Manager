# Asset-Manager
feature/update-maximum-stock
Inventory Control System Project by Group 9, E10, RUPP
=======

**Full-Stack Inventory Control System**  
A modern web application for managing products, suppliers, stock movements, and inventory alerts — built for RUPP ICS group project (Group 9, E10).

## ✨ Features

- User authentication + **Role-Based Access Control** (RBAC)
  - Roles: Admin • Manager • Stock Controller • Viewer
- Product management (add/edit/delete, categories, prices, unit, min stock level)
- Supplier management (name, contact, email, address, notes)
- **Stock In** & **Stock Out** tracking with automatic current stock calculation
- Low stock alerts (visual + future Telegram notifications)
- Dashboard with key statistics (total products, low stock count, estimated value, today in/out)
- Responsive & modern UI with persistent sidebar navigation

## 🛠 Tech Stack

**Backend**
- Node.js + Express
- TypeScript
- PostgreSQL (local)
- Drizzle ORM + drizzle-zod
- Passport.js (local strategy)
- Zod (validation)

**Frontend**
- React + TypeScript
- Vite
- React Hook Form + Zod
- TanStack Query (React Query)
- Shadcn UI + Tailwind CSS
- Lucide React icons

**Database**
- PostgreSQL (managed with pgAdmin)

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- PostgreSQL 15+ (installed locally with pgAdmin or Docker)
- Git

**1. Clone & install**
git clone https://github.com/kentiohnioh/Asset-Manager.git
cd Asset-Manager
npm install

**2. Create .env file in root**
# PostgreSQL connection
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/asset_manager

# Session secret (any random string)
SESSION_SECRET=super-secret-key-change-this-in-production

**3. Create database (if not exists)**
In pgAdmin or psql:
CREATE DATABASE asset_manager;

**4. Run the project**
npm run dev

**5. Default login (after first run — auto seeded)**
Admin
Email: admin@gmail.com
Password: rupp2025
Other test accounts (same password):

manager@gmail.com
stock@gmail.com
viewer@gmail.com

# 1. Create and switch to new branch
git checkout -b feature/max-stock-limit

# 2. (Now make your code changes in VS Code)

# 3. Stage changes
git add .

# 4. Commit
git commit -m "Limit maximum quantity to 100000 in stock-in/out"

# 5. Push the new branch to GitHub
git push --set-upstream origin feature/max-stock-limit
main
