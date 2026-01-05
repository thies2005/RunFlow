# RunFlow

A Dockerized running performance dashboard with Strava integration, combining Runna-style training interface with Runalyze-grade analytics.

## Features

- **Strava Sync**: OAuth2 integration with paginated activity sync (respects rate limits)
- **Cross-Training Engine**: Cycling contributes to aerobic fitness (CTL) but NOT running stress
- **VDOT Calculator**: Race predictions for 5K, 10K, Half Marathon, Marathon
- **Training Load**: CTL/ATL/TSB fitness tracking using Banister's model
- **Premium UI**: Dark theme with glassmorphism, animations, and Runna-style workout cards

## Quick Start

1. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

2. **Get Strava API credentials**
   - Go to https://www.strava.com/settings/api
   - Create an application
   - Copy Client ID and Client Secret to `.env`

3. **Get Cloudflare Tunnel token**
   - Go to https://one.dash.cloudflare.com
   - Zero Trust → Networks → Tunnels
   - Create tunnel and copy token to `.env`

4. **Start with Docker Compose**
   ```bash
   docker compose up --build
   ```

5. **Access the app**
   - Local: http://localhost:3000
   - Via tunnel: Your configured Cloudflare domain

## Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Start dev server
npm run dev
```

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, Recharts
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL 16
- **Auth**: NextAuth.js with Strava OAuth
- **Deployment**: Docker Compose, Cloudflare Tunnels

## Key Calculations

### VDOT (Daniels-Gilbert Formula)
Used for race predictions and training pace zones.

### TRIMP (Banister's Model)
```
TRIMP = Duration × %HRR × 0.64 × e^(1.92 × %HRR)
```

### Fitness Tracking
- **CTL**: 42-day exponentially weighted average
- **ATL**: 7-day exponentially weighted average  
- **TSB**: CTL - ATL (positive = fresh, negative = fatigued)
