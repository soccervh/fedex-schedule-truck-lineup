# FedEx Truck Lineup Scheduling System

Web application for managing FedEx truck lineup scheduling across 4 belts with 32 spots each.

## Features

- **Belt View**: Visual grid of 32 spots per belt with color-coded assignments
- **Role-Based Access**: Managers can edit, drivers can view
- **Coverage Tracking**: Automatic alerts when spots need swing driver coverage
- **Time Off Management**: Import from CSV or in-app request/approval
- **Weekly Templates**: Base schedule with daily override capability

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Installation

1. Install dependencies:
   ```bash
   npm install
   cd server && npm install
   cd ../client && npm install
   ```

2. Create `server/.env`:
   ```
   PORT=3001
   DATABASE_URL="postgresql://user:password@localhost:5432/fedex_lineup"
   JWT_SECRET="your-secret-key"
   ```

3. Create `client/.env`:
   ```
   VITE_API_URL=http://localhost:3001/api
   ```

4. Run database migrations:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. Start development servers:
   ```bash
   npm run dev
   ```

## Color Coding

- **Blue**: Belt workers (in home area)
- **Orange**: Dock workers
- **Green**: Unload workers
- **Gray**: Swing drivers
- **Red border**: Needs coverage
