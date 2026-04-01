# RunFlow Coding Standards

> **Last Updated:** February 2026  
> **Purpose:** Maintain code consistency, improve readability, and ensure code quality across the RunFlow codebase.

---

## Table of Contents

1. [Naming Conventions](#1-naming-conventions)
2. [Code Organization](#2-code-organization)
3. [TypeScript Standards](#3-typescript-standards)
4. [React Standards](#4-react-standards)
5. [Error Handling](#5-error-handling)
6. [API Standards](#6-api-standards)
7. [Database Standards](#7-database-standards)
8. [Security Standards](#8-security-standards)
9. [Testing Standards](#9-testing-standards)
10. [Code Quality](#10-code-quality)

---

## 1. Naming Conventions

### Functions

Use **camelCase** for function names. Verbs should describe the action.

**Good:**
```typescript
function getUserById(id: string): Promise<User> {}
function calculateTrimp(activity: Activity): number {}
function validateEmail(email: string): boolean {}
```

**Bad:**
```typescript
function getUserById(id: string): Promise<User> {}
function calculate_trimp(activity: Activity): number {}
function ValidateEmail(email: string): boolean {}
```

### Components

Use **PascalCase** for React components.

**Good:**
```typescript
export function ActivityList({ activities }: ActivityListProps) {}
export function ErrorBoundary({ children }: ErrorBoundaryProps) {}
export function FitnessChart({ data }: FitnessChartProps) {}
```

**Bad:**
```typescript
export function activityList({ activities }: ActivityListProps) {}
export function error_boundary({ children }: ErrorBoundaryProps) {}
```

### Interfaces and Types

Use **PascalCase** for interfaces and type definitions. Use **PascalCase** for type parameters.

**Good:**
```typescript
interface User {
  id: string;
  email: string;
}

type ActivityType = 'RUN' | 'RIDE' | 'SWIM';

interface ApiResponse<T> {
  data: T;
  status: number;
}

function transformData<T>(input: T): T {}
```

**Bad:**
```typescript
interface user {
  id: string;
  email: string;
}

type activityType = 'RUN' | 'RIDE' | 'SWIM';

interface apiResponse<t> {
  data: t;
}
```

### Constants

Use **UPPER_SNAKE_CASE** for constants that are truly immutable and exported.

**Good:**
```typescript
export const MAX_RETRY_ATTEMPTS = 3;
export const DEFAULT_PAGE_SIZE = 50;
export const RATE_LIMIT_DURATION_MS = 60000;
```

**Bad:**
```typescript
export const maxRetryAttempts = 3;
export const DefaultPageSize = 50;
```

### Variables

Use **camelCase** for local variables and parameters.

**Good:**
```typescript
const userId = session.user.id;
const activityList = await getActivities();
const isActive = user.isActive;
```

**Bad:**
```typescript
const userId = session.user.id;
const ActivityList = await getActivities();
const is_active = user.isActive;
```

### Files

- **Components:** `PascalCase.tsx` or `PascalCase.ts`
- **Utilities:** `kebab-case.ts`
- **API Routes:** `route.ts` (Next.js convention)
- **Tests:** `filename.test.ts` or `__tests__/filename.test.ts`

**Good:**
```
src/
  components/
    ActivityList.tsx
    FitnessChart.tsx
    ErrorBoundary.tsx
  lib/
    api-response.ts
    db.ts
    rate-limit.ts
  app/
    api/
      activities/
        route.ts
```

**Bad:**
```
src/
  components/
    activityList.tsx
    fitness-chart.tsx
    errorBoundary.tsx
  lib/
    apiResponse.ts
    database.ts
```

### Database Models

Use **PascalCase** for Prisma models (following Prisma convention).

**Good:**
```prisma
model User {
  id        String   @id @default(cuid())
  email     String?  @unique
  name      String?
  createdAt DateTime @default(now())
}

model Activity {
  id        String @id @default(cuid())
  userId    String
  startDate DateTime
  distance  Float
}
```

**Bad:**
```prisma
model user {
  id        String   @id @default(cuid())
  email     String?  @unique
}

model activity {
  id String @id @default(cuid())
}
```

### API Routes

Use **kebab-case** for API route segments.

**Good:**
```
/api/activities
/api/user/settings
/api/ai/chat
/api/admin/users/[id]/toggle-ai
```

**Bad:**
```
/api/Activities
/api/userSettings
/api/aiChat
```

---

## 2. Code Organization

### Directory Structure

Follow the established Next.js 15 App Router structure:

```
Web/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes
│   │   ├── (auth)/         # Auth group
│   │   ├── (dashboard)/    # Dashboard group
│   │   └── layout.tsx
│   ├── components/         # React components
│   │   ├── dashboard/     # Feature-specific components
│   │   ├── auth/          # Auth components
│   │   ├── navigation/    # Nav components
│   │   └── providers/     # Context providers
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility libraries
│   │   ├── auth/
│   │   ├── metrics/
│   │   ├── strava/
│   │   ├── ai/
│   │   └── utils/
│   └── types/             # Type definitions
├── prisma/                # Database schema
└── public/                # Static assets
```

### File Naming

- Components: `PascalCase.tsx`
- Utilities: `kebab-case.ts`
- Types: `filename.d.ts` (for global) or inline
- Tests: `filename.test.ts` or `__tests__/filename.test.ts`

### Import Order

Organize imports in this order:

1. **React & Next.js** imports
2. **Third-party** libraries
3. **Internal** imports (from @/)
4. **Relative** imports
5. **Type-only** imports (if separate)

**Good:**
```typescript
import React, { useState, useEffect } from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/apiError';
import { cachedResponse } from '@/lib/apiResponse';

import { ActivityList } from './ActivityList';
import type { Activity } from '@/lib/types';
```

**Bad:**
```typescript
import { ActivityList } from './ActivityList';
import { NextRequest } from 'next/server';
import React from 'react';
import { prisma } from '@/lib/db';
import { cachedResponse } from '@/lib/apiResponse';
```

### Barrel Exports

Use `index.ts` files to export related modules together.

**Good:**
```typescript
// src/components/index.ts
export { ActivityList } from './ActivityList';
export { FitnessChart } from './FitnessChart';
export { ErrorBoundary } from './ErrorBoundary';

// src/lib/metrics/index.ts
export { calculateTrimp } from './trimp';
export { calculateVdot } from './vdot';
export { calculateFitness } from './fitness';
```

**Usage:**
```typescript
import { ActivityList, FitnessChart, ErrorBoundary } from '@/components';
import { calculateTrimp, calculateVdot } from '@/lib/metrics';
```

---

## 3. TypeScript Standards

### Strict Mode

**REQUIRED:** TypeScript strict mode is enabled in `tsconfig.json`. All code must pass strict type checking.

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### Avoid `any` Type

Never use `any`. Use `unknown` for truly unknown data, or create proper type definitions.

**Good:**
```typescript
function processData(data: unknown): Result {
  if (typeof data === 'string') {
    return { value: data };
  }
  throw new Error('Invalid data type');
}

interface ApiResponse<T> {
  data: T;
  status: number;
}
```

**Bad:**
```typescript
function processData(data: any): Result {
  return { value: data };
}
```

### Interface vs Type

- Use **interfaces** for object shapes that can be extended
- Use **types** for unions, intersections, and mapped types

**Good:**
```typescript
// Interface for extendable object shapes
interface User {
  id: string;
  email: string;
  name?: string;
}

interface AdminUser extends User {
  permissions: string[];
}

// Type for unions and utilities
type ActivityType = 'RUN' | 'RIDE' | 'SWIM' | 'HIKE';
type PartialUser = Partial<User>;
type UserWithActivity = User & { activities: Activity[] };
```

### Null/Undefined Handling

Use strict null checking. Avoid non-null assertions (`!`) unless absolutely necessary.

**Good:**
```typescript
function getUserEmail(user: User | null): string {
  if (!user) {
    throw new Error('User not found');
  }
  return user.email || 'No email';
}

function getActivityDistance(activity: Activity | undefined): number {
  return activity?.distance ?? 0;
}
```

**Bad:**
```typescript
function getUserEmail(user: User | null): string {
  return user!.email;
}
```

### Type Assertions

Prefer type guards over type assertions.

**Good:**
```typescript
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function processValue(value: unknown) {
  if (isString(value)) {
    return value.toUpperCase();
  }
  return null;
}
```

**Bad:**
```typescript
function processValue(value: unknown) {
  return (value as string).toUpperCase();
}
```

### Return Types

Explicitly declare return types for exported functions and API route handlers.

**Good:**
```typescript
export async function getActivities(
  userId: string
): Promise<Activity[]> {
  return await prisma.activity.findMany({ where: { userId } });
}

export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  const data = await fetchData();
  return cachedResponse(data);
}
```

**Bad:**
```typescript
export async function getActivities(userId: string) {
  return await prisma.activity.findMany({ where: { userId } });
}
```

---

## 4. React Standards

### Functional Components Preferred

Use functional components with hooks. Avoid class components unless extending a class-based API (like `ErrorBoundary`).

**Good:**
```typescript
export function ActivityList({ activities }: ActivityListProps) {
  const [filter, setFilter] = useState<ActivityType | null>(null);

  const filteredActivities = useMemo(() => {
    if (!filter) return activities;
    return activities.filter(a => a.type === filter);
  }, [activities, filter]);

  return <div>{/* JSX */}</div>;
}
```

**Bad:**
```typescript
export class ActivityList extends Component {
  constructor(props) {
    super(props);
    this.state = { filter: null };
  }
  // ... class component methods
}
```

### Hooks Usage Guidelines

- Call hooks at the top level of your component
- Never call hooks inside loops, conditions, or nested functions
- Use custom hooks to extract reusable logic

**Good:**
```typescript
export function useActivities(userId: string | null) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchActivities = async () => {
      const data = await getActivities(userId);
      setActivities(data);
      setLoading(false);
    };

    fetchActivities();
  }, [userId]);

  return { activities, loading };
}
```

**Bad:**
```typescript
export function ActivityList({ userId }: Props) {
  if (!userId) {
    const [activities] = useState([]); // Hook inside condition!
    return null;
  }
}
```

### Prop Patterns

Use interfaces for props. Destructure props in function signature. Provide default values where appropriate.

**Good:**
```typescript
interface ActivityCardProps {
  activity: Activity;
  onEdit?: (id: string) => void;
  showMetrics?: boolean;
}

export function ActivityCard({
  activity,
  onEdit,
  showMetrics = true
}: ActivityCardProps) {
  return <div>{/* JSX */}</div>;
}
```

**Bad:**
```typescript
export function ActivityCard(props: any) {
  const activity = props.activity;
  const onEdit = props.onEdit;
  return <div>{/* JSX */}</div>;
}
```

### State Management

- Use local state for component-specific data
- Use React Query (TanStack Query) for server state
- Use Context for shared application state

**Good:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function ActivitiesPage() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['activities'],
    queryFn: () => fetchActivities()
  });

  const queryClient = useQueryClient();

  const deleteActivity = useMutation({
    mutationFn: (id: string) => deleteActivityApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    }
  });

  if (isLoading) return <LoadingSpinner />;

  return <ActivityList activities={activities} />;
}
```

### Performance Considerations

Use `useMemo` and `useCallback` when necessary for expensive computations or stable references.

**Good:**
```typescript
export function FitnessChart({ activities }: FitnessChartProps) {
  const chartData = useMemo(() => {
    return processActivitiesForChart(activities);
  }, [activities]);

  const handlePointClick = useCallback((point: DataPoint) => {
    setSelectedPoint(point);
  }, []);

  return <LineChart data={chartData} onPointClick={handlePointClick} />;
}
```

**Bad:**
```typescript
export function FitnessChart({ activities }: FitnessChartProps) {
  const chartData = processActivitiesForChart(activities);

  const handlePointClick = (point: DataPoint) => {
    setSelectedPoint(point);
  };

  return <LineChart data={chartData} onPointClick={handlePointClick} />;
}
```

### Error Boundaries

Wrap components that may fail with `ErrorBoundary`. Particularly important for chart components.

**Good:**
```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function AnalyticsView() {
  return (
    <ErrorBoundary componentName="Analytics Dashboard">
      <FitnessChart />
      <VO2maxChart />
      <TRIMPChart />
    </ErrorBoundary>
  );
}
```

---

## 5. Error Handling

### Consistent Error Types

Use the `ApiError` class from `@/lib/apiError` for all API errors.

**Good:**
```typescript
import { ApiError, ApiErrorCode } from '@/lib/apiError';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(session.user.id);
    if (!user) {
      throw ApiError.notFound('User');
    }
    return cachedResponse(user);
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Error Logging

Always log errors with context. Use `console.error` with descriptive messages.

**Good:**
```typescript
export async function syncActivities(userId: string) {
  try {
    const activities = await fetchFromStrava(userId);
    return await saveActivities(activities);
  } catch (error) {
    console.error('Failed to sync activities for user:', userId, error);
    throw ApiError.externalService('Strava');
  }
}
```

**Bad:**
```typescript
export async function syncActivities(userId: string) {
  try {
    const activities = await fetchFromStrava(userId);
    return await saveActivities(activities);
  } catch (error) {
    console.log(error);
    throw error;
  }
}
```

### User-Facing Error Messages

Provide clear, actionable error messages to users. Never expose internal details in production.

**Good:**
```typescript
import { ApiError } from '@/lib/apiError';

throw ApiError.validation(
  'Email is required',
  { field: 'email' }
);

throw ApiError.unauthorized();
throw ApiError.notFound('Activity');
```

**Bad:**
```typescript
throw new Error('Database query failed: SELECT * FROM activities WHERE...');
throw new Error('User 12345 not found in database');
```

### API Error Response Format

All API error responses must follow a consistent format.

**Good:**
```typescript
// Success response
{
  "activities": [...],
  "total": 50
}

// Error response
{
  "error": "VALIDATION_ERROR",
  "message": "Email is required",
  "details": {
    "field": "email"
  }
}
```

**Bad:**
```typescript
// Inconsistent formats
{ "error": "Something went wrong" }
{ "status": 400, "msg": "Invalid" }
{ "error_code": 123, "description": "Error" }
```

### Try-Catch Patterns

Wrap API handlers in try-catch blocks. Use the `handleApiError` utility.

**Good:**
```typescript
import { handleApiError } from '@/lib/apiError';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const activity = await createActivity(body);
    return cachedResponse(activity);
  } catch (error) {
    return handleApiError(error);
  }
}
```

**Bad:**
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();
  const activity = await createActivity(body);
  return cachedResponse(activity);
  // No error handling!
}
```

---

## 6. API Standards

### Route Naming Conventions

API routes use kebab-case segments. Dynamic segments use brackets `[param]`.

**Good:**
```
GET    /api/activities
GET    /api/activities/:id
POST   /api/activities
PUT    /api/activities/:id
DELETE /api/activities/:id

GET    /api/admin/users/:id/toggle-ai
POST   /api/auth/forgot-password
```

**Bad:**
```
GET    /api/Activities
GET    /api/activity/:id
POST   /api/createActivity
PUT    /api/updateActivity/:id
```

### HTTP Method Usage

Use appropriate HTTP methods for CRUD operations.

| Method | Usage |
|--------|-------|
| GET    | Retrieve data (safe, idempotent) |
| POST   | Create resources |
| PUT    | Replace/update resources (idempotent) |
| PATCH  | Partial updates (not idempotent) |
| DELETE | Delete resources (idempotent) |

**Good:**
```typescript
// api/activities/route.ts
export async function GET(request: NextRequest) {} // List activities
export async function POST(request: NextRequest) {} // Create activity

// api/activities/[id]/route.ts
export async function GET(request: NextRequest, { params }: RouteParams) {} // Get single
export async function PATCH(request: NextRequest, { params }: RouteParams) {} // Update
export async function DELETE(request: NextRequest, { params }: RouteParams) {} // Delete
```

### Request/Response Patterns

Use the `cachedResponse` and `errorResponse` utilities for consistent responses.

**Good:**
```typescript
import { cachedResponse, errorResponse } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  const activities = await getActivities();
  return cachedResponse(activities, { maxAge: 120 });
}

export async function POST(request: NextRequest) {
  if (!isValidData) {
    return errorResponse('Invalid data', 400, { field: 'email' });
  }
  const result = await createActivity(data);
  return cachedResponse(result, { status: 201 });
}
```

### Status Codes

Use appropriate HTTP status codes.

| Code | Usage |
|------|-------|
| 200  | Success (GET, PUT, PATCH, DELETE) |
| 201  | Created (POST) |
| 204  | No Content (DELETE) |
| 400  | Bad Request (validation errors) |
| 401  | Unauthorized (no auth) |
| 403  | Forbidden (auth but no permission) |
| 404  | Not Found |
| 409  | Conflict (duplicate) |
| 429  | Too Many Requests (rate limited) |
| 500  | Internal Server Error |
| 502  | Bad Gateway (external service) |

**Good:**
```typescript
import { ApiError, ApiErrorCode } from '@/lib/apiError';

throw ApiError.validation('Invalid email'); // 400
throw ApiError.unauthorized(); // 401
throw ApiError.forbidden('Admin access required'); // 403
throw ApiError.notFound('Activity'); // 404
throw ApiError.rateLimited(); // 429
throw ApiError.internal(); // 500
```

### Authentication Middleware

Check authentication using `getServerSession` for protected routes.

**Good:**
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return errorResponse('Unauthorized', 401);
  }

  const data = await getUserData(session.user.id);
  return cachedResponse(data);
}
```

### Input Validation

Validate all input before processing. Use Zod or manual validation.

**Good:**
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, password } = body;

  if (!name || typeof name !== 'string' || name.length < 2) {
    return errorResponse('Name must be at least 2 characters', 400);
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return errorResponse('Invalid email format', 400);
  }

  if (!password || password.length < 8) {
    return errorResponse('Password must be at least 8 characters', 400);
  }

  const user = await createUser({ name, email, password });
  return cachedResponse(user, { status: 201 });
}
```

**Bad:**
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();
  const user = await createUser(body); // No validation!
  return cachedResponse(user);
}
```

---

## 7. Database Standards

### Prisma Model Conventions

- Use PascalCase for model names
- Use camelCase for field names
- Add appropriate indexes for query performance
- Use enums for fixed sets of values

**Good:**
```prisma
model Activity {
  id        String   @id @default(cuid())
  userId    String
  stravaId  BigInt   @unique
  type      ActivityType
  name      String
  distance  Float
  startDate DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, startDate])
  @@index([type])
}

enum ActivityType {
  RUN
  RIDE
  SWIM
  WORKOUT
}
```

### Query Patterns

Use type-safe Prisma queries. Select only needed fields.

**Good:**
```typescript
const activities = await prisma.activity.findMany({
  where: { userId: session.user.id },
  orderBy: { startDate: 'desc' },
  take: 50,
  select: {
    id: true,
    name: true,
    distance: true,
    startDate: true,
    averageHr: true,
  },
});
```

**Bad:**
```typescript
const activities = await prisma.activity.findMany({
  where: { userId: session.user.id },
  // No select, returns all fields
  // No limit, could return thousands of records
});
```

### Transaction Usage

Use Prisma transactions for multi-step operations that need atomicity.

**Good:**
```typescript
await prisma.$transaction(async (tx) => {
  const activity = await tx.activity.create({
    data: { userId, ...activityData }
  });

  await tx.dailyFitness.upsert({
    where: { userId_date: { userId, date: today } },
    update: { trimp: { increment: activity.trimp } },
    create: { userId, date: today, trimp: activity.trimp }
  });

  return activity;
});
```

**Bad:**
```typescript
// Not atomic - if second operation fails, first remains
const activity = await prisma.activity.create({ data: ... });
await prisma.dailyFitness.update({ data: ... });
```

### Index Usage

Add indexes to fields frequently used in queries and filters.

**Good:**
```prisma
model Activity {
  id        String   @id @default(cuid())
  userId    String
  type      ActivityType
  startDate DateTime

  @@index([userId, startDate]) // For user's activities by date
  @@index([type]) // For filtering by type
  @@index([userId, type, startDate]) // Composite index
}
```

---

## 8. Security Standards

### Input Validation

Always validate and sanitize user input. Never trust client-side validation.

**Good:**
```typescript
const MAX_NAME_LENGTH = 200;
const MIN_NAME_LENGTH = 1;

function validateActivityName(name: unknown): string {
  if (typeof name !== 'string') {
    throw ApiError.validation('Name must be a string');
  }
  if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
    throw ApiError.validation(
      `Name must be ${MIN_NAME_LENGTH}-${MAX_NAME_LENGTH} characters`
    );
  }
  return name.trim();
}

const cleanName = validateActivityName(body.name);
```

### Sensitive Data Handling

- Never log passwords, tokens, or PII
- Use environment variables for secrets
- Encrypt sensitive data at rest

**Good:**
```typescript
// Don't log sensitive data
console.error('Failed to authenticate user:', userId);
console.error('Password reset failed for user:', userId);
// NOT: console.error('Password reset failed:', user, password);

// Use environment variables
const jwtSecret = process.env.JWT_SECRET;
const encryptionKey = process.env.ENCRYPTION_KEY;

// Encrypt tokens
import { encrypt, decrypt } from '@/lib/crypto';
const encryptedToken = encrypt(accessToken);
```

**Bad:**
```typescript
console.log('Creating user:', email, password); // Logs password!
const token = accessToken; // Stored in plain text
```

### Authentication Patterns

- Use NextAuth for session management
- Use JWT for mobile app authentication
- Verify sessions on every protected route

**Good:**
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/strava/oauth';

// Web app session
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw ApiError.unauthorized();
  }
  // ... process request
}

// Mobile JWT
import { verifyMobileToken } from '@/lib/mobile/auth';
export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  const payload = await verifyMobileToken(token);
  if (!payload?.userId) {
    throw ApiError.unauthorized();
  }
  // ... process request
}
```

### Authorization Checks

Always verify user permissions before accessing or modifying resources.

**Good:**
```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const activity = await prisma.activity.findUnique({
    where: { id: params.id }
  });

  if (!activity) {
    throw ApiError.notFound('Activity');
  }

  if (activity.userId !== session.user.id) {
    throw ApiError.forbidden('You can only delete your own activities');
  }

  await prisma.activity.delete({ where: { id: params.id } });
  return cachedResponse({ success: true });
}
```

---

## 9. Testing Standards

### Test File Naming

- Unit tests: `filename.test.ts`
- Integration tests: `filename.integration.test.ts`
- Test files co-located with source or in `__tests__` directory

**Good:**
```
src/
  lib/
    api-error.ts
    api-error.test.ts
    metrics/
      trimp.ts
      trimp.test.ts
      vdot.ts
      __tests__/
        vdot.test.ts
```

**Bad:**
```
src/
  lib/
    api-error.ts
    test-api-error.ts
    metrics/
      trimp.ts
      TrimpSpec.ts
```

### Test Structure

Use Jest's `describe` and `it` pattern. Group related tests together.

**Good:**
```typescript
describe('calculateTrimp', () => {
  describe('with valid heart rate data', () => {
    it('calculates correct TRIMP for moderate intensity', () => {
      const result = calculateTrimp(60, 140, 180, 70);
      expect(result).toBeCloseTo(60, 1);
    });

    it('calculates correct TRIMP for high intensity', () => {
      const result = calculateTrimp(30, 170, 180, 70);
      expect(result).toBeCloseTo(45, 1);
    });
  });

  describe('with edge cases', () => {
    it('returns 0 for zero duration', () => {
      const result = calculateTrimp(0, 140, 180, 70);
      expect(result).toBe(0);
    });

    it('handles rest heart rate equals max', () => {
      const result = calculateTrimp(60, 70, 70, 70);
      expect(result).toBe(0);
    });
  });
});
```

### Mocking Guidelines

Mock external dependencies. Keep mocks simple and focused.

**Good:**
```typescript
// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    activity: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, options) => ({ body, status: options?.status || 200 })),
  },
}));

// Usage
import { prisma } from '@/lib/db';

beforeEach(() => {
  jest.clearAllMocks();
});

it('fetches activities', async () => {
  const mockActivities = [{ id: '1', name: 'Run' }];
  prisma.activity.findMany.mockResolvedValue(mockActivities);

  const result = await getActivities('user-123');

  expect(prisma.activity.findMany).toHaveBeenCalledWith({
    where: { userId: 'user-123' }
  });
  expect(result).toEqual(mockActivities);
});
```

### Coverage Requirements

- Aim for **80%+** code coverage
- Critical business logic should have **90%+** coverage
- Write tests for error cases and edge cases

**Good:**
```bash
# Run tests with coverage
npm test -- --coverage

# Output example:
--------------|---------|----------|---------|---------|-------------------
File          | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------|---------|----------|---------|---------|-------------------
All files     |   85.23 |    78.45 |   90.12 |   85.45 |
 apiError.ts  |  100.00 |   100.00 |  100.00 |  100.00 |
 trimp.ts     |   95.23 |    88.89 |  100.00 |   95.23 | 45
 vdot.ts      |   82.45 |    75.00 |   83.33 |   82.45 | 23-25,67
--------------|---------|----------|---------|---------|-------------------
```

---

## 10. Code Quality

### ESLint Rules Configuration

The project uses ESLint with Next.js config (`next/core-web-vitals`). Additional rules can be added in `.eslintrc.json`.

**Good:**
```json
{
  "extends": "next/core-web-vitals",
  "rules": {
    "no-console": ["warn", { "allow": ["error", "warn"] }],
    "prefer-const": "error",
    "no-var": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-function-return-type": "off"
  }
}
```

### Prettier Rules

Use Prettier for consistent formatting. Configure in `.prettierrc` (or use Next.js defaults).

**Good:**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### Code Review Checklist

Before submitting code for review, ensure:

- [ ] Code follows all naming conventions
- [ ] TypeScript strict mode passes (no `any`, proper types)
- [ ] All new functions have proper return types
- [ ] Error handling is consistent (use `ApiError`)
- [ ] API routes have proper authentication
- [ ] Input validation is implemented
- [ ] Database queries are optimized with indexes
- [ ] Tests are written for new functionality
- [ ] Tests cover edge cases and error scenarios
- [ ] No console.log statements remain (use console.error for errors)
- [ ] Sensitive data is never logged
- [ ] Code is self-documenting (minimal comments needed)
- [ ] Components are properly typed with interfaces
- [ ] Performance optimizations considered (useMemo, useCallback)
- [ ] Code compiles without errors
- [ ] ESLint passes without warnings
- [ ] Tests pass

### Documentation Requirements

- Exported functions should have JSDoc comments for complex logic
- Complex algorithms should include explanatory comments
- API endpoints should be documented in `MOBILE_API.md` or inline

**Good:**
```typescript
/**
 * Calculate Training Impulse (TRIMP) based on heart rate data.
 * 
 * TRIMP = duration * averageHRRatio
 * Where HRRatio = (avgHR - restHR) / (maxHR - restHR)
 * 
 * @param duration - Duration in minutes
 * @param avgHr - Average heart rate during activity
 * @param maxHr - Maximum heart rate
 * @param restHr - Resting heart rate
 * @returns TRIMP value
 * 
 * @example
 * calculateTrimp(60, 140, 180, 70); // Returns ~45.0
 */
export function calculateTrimp(
  duration: number,
  avgHr: number,
  maxHr: number,
  restHr: number
): number {
  const hrRatio = (avgHr - restHr) / (maxHr - restHr);
  const trimp = duration * hrRatio;
  return trimp;
}
```

---

## Related Issues

- **Q-30**: Improve type safety across the codebase (add more strict types, eliminate implicit any)
- **Q-31**: Standardize error handling across all API routes (use `ApiError` consistently)

---

## Quick Reference

```typescript
// Import order
import React from 'react';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cachedResponse } from '@/lib/apiResponse';
import { ApiError } from '@/lib/apiError';

// API route template
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw ApiError.unauthorized();
    }

    const data = await fetchData(session.user.id);
    return cachedResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

// Component template
interface ComponentProps {
  items: Item[];
  onItemClick?: (id: string) => void;
}

export function Component({ items, onItemClick }: ComponentProps) {
  return <div>{items.map(item => /* ... */)}</div>;
}

// Test template
describe('functionName', () => {
  it('should do something', () => {
    const result = functionName(input);
    expect(result).toBe(expected);
  });
});
```

---

**Note:** These standards should be followed for all new code. Existing code should be updated to match these standards when modified.
