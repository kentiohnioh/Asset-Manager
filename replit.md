# Inventory Control System (ICS)

## Overview

This is a full-stack Inventory Control System designed for small supermarkets, retail shops, or warehouses. The application provides comprehensive inventory management including products, suppliers, stock-in/out transactions, real-time stock tracking, low stock alerts, and role-based access control.

The system is built with a React frontend and Express backend, using PostgreSQL for data persistence. It features a modern dashboard with analytics, role-based navigation, and Telegram integration for low stock notifications.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18+ with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state caching and synchronization
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **Forms**: React Hook Form with Zod validation via @hookform/resolvers
- **Charts**: Recharts for dashboard analytics visualization
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Framework**: Express 5 on Node.js with TypeScript
- **Authentication**: Passport.js with Local Strategy, session-based auth using express-session
- **Session Storage**: MemoryStore (development) with connect-pg-simple available for production
- **Password Hashing**: Node.js crypto module with scrypt
- **API Design**: RESTful endpoints defined in shared/routes.ts with Zod schemas for validation

### Data Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema-to-validation integration
- **Schema Location**: shared/schema.ts contains all table definitions
- **Migrations**: Drizzle Kit with `db:push` command for schema synchronization

### Shared Code
- **Location**: /shared directory contains code shared between frontend and backend
- **Schema**: Drizzle table definitions and Zod insert schemas
- **Routes**: API route definitions with input/output schemas for type safety

### Role-Based Access Control
Four user roles with hierarchical permissions:
- **Admin**: Full system access including user management
- **Manager**: CRUD on products/suppliers, stock operations, all reports
- **Stock Controller**: Stock in/out operations, view own transactions
- **Viewer**: Read-only access to stock levels and reports

### Key Features
- Real-time stock calculation (sum of stock_in minus stock_out)
- Low stock alerts when current_stock <= min_stock_level
- Telegram bot integration for alert notifications
- Dashboard with statistics cards and transaction charts
- Responsive design with collapsible sidebar navigation

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via DATABASE_URL environment variable
- **Drizzle ORM**: Database queries and schema management

### Authentication & Sessions
- **Passport.js**: Authentication middleware
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store (optional)

### Notifications
- **Telegram Bot API**: Low stock alert notifications (requires TELEGRAM_BOT_TOKEN environment variable)

### UI Libraries
- **Radix UI**: Accessible component primitives (accordion, dialog, dropdown, etc.)
- **shadcn/ui**: Pre-built component library
- **Lucide React**: Icon library
- **Recharts**: Charting library for reports

### Build & Development
- **Vite**: Frontend build tool with HMR
- **esbuild**: Server-side bundling
- **TSX**: TypeScript execution for development

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `TELEGRAM_BOT_TOKEN`: (Optional) For low stock notifications