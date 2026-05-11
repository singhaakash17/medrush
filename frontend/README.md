# medrush-frontend

React Native (Expo) app for MedRush — India's 15-minute prescription medicine delivery platform. Includes screens for customers and riders.

## Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 51 + Expo Router 3 (file-based routing) |
| Language | TypeScript |
| Server state | TanStack Query v5 |
| Client state | Zustand |
| Auth storage | Expo SecureStore |
| HTTP client | Axios |
| Location | expo-location |
| Image picker | expo-image-picker |
| Animations | react-native-reanimated |

## Prerequisites

- Node.js 20+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS) or Android emulator, or Expo Go on a physical device

## Setup

```bash
cd frontend
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Set `EXPO_PUBLIC_API_URL` to the running backend URL (default: `http://localhost:3001`).

Start the development server:

```bash
npx expo start
```

Press `i` for iOS simulator, `a` for Android emulator, or scan the QR code with Expo Go.

## App Structure

```
frontend/
├── app/                     # Expo Router file-based routes
│   ├── (auth)/              # Login / OTP verification screens
│   ├── (tabs)/              # Bottom tab navigator
│   │   ├── index.tsx        # Home — ETA banner, quick actions, Rx vault CTA
│   │   ├── search.tsx       # Medicine search + nearby pharmacy map
│   │   ├── orders.tsx       # Order history list
│   │   └── profile.tsx      # Profile & settings
│   ├── cart.tsx             # Cart, address entry, payment selector, checkout
│   ├── tracking/[id].tsx    # Live order tracking with WebSocket + status stepper
│   ├── rx/
│   │   ├── upload.tsx       # Camera / gallery Rx upload + OCR result
│   │   └── vault.tsx        # Prescription vault list
│   ├── medicine/[id].tsx    # Medicine detail with generic substitutes
│   ├── pharmacy/[id].tsx    # Pharmacy detail with inventory
│   └── rider/               # Rider-only screens
│       ├── shift.tsx        # Go online / offline, night-shift mode
│       ├── tasks.tsx        # Active and completed assignment list
│       ├── delivery/[id].tsx # Active delivery: pickup confirm, OTP verify
│       └── earnings.tsx     # Shift earnings with daily bar chart
├── src/
│   ├── api/                 # API client modules
│   │   ├── client.ts        # Axios instance with auth token injection
│   │   ├── catalog.ts       # Medicine search, substitutes
│   │   ├── geo.ts           # Nearby pharmacies
│   │   ├── orders.ts        # Place order, status, ratings, pharmacy orders
│   │   ├── rx.ts            # Rx upload, presigned URL, vault, verify
│   │   ├── logistics.ts     # Rider assignments, GPS ping, OTP, shift
│   │   ├── cart.ts          # Cart CRUD
│   │   └── user.ts          # Profile, addresses, family members
│   ├── store/
│   │   └── auth.ts          # Zustand auth store (principalId, role, hydrate)
│   ├── components/          # Shared UI components
│   │   ├── SlaTimer.tsx     # Live SLA countdown badge
│   │   └── NearbyPharmacyCard.tsx
│   └── types/
│       └── index.ts         # Shared TypeScript interfaces
└── package.json
```

## Customer Screens

| Screen | Route | Key Features |
|---|---|---|
| Home | `/(tabs)/` | ETA guarantee banner, quick actions, category scroll, Rx vault CTA, MedRush Plus CTA |
| Search | `/(tabs)/search` | Tab switcher (Medicines / Pharmacies), GPS-based nearby search, Rx upload shortcut |
| Cart | `/cart` | Address form, Rx selector, UPI / Card / COD payment, SLA guarantee footer |
| Order Tracking | `/tracking/[id]` | WebSocket real-time updates, 5-step status stepper, live rider location, OTP display, fee breakdown |
| Rx Upload | `/rx/upload` | Camera or gallery, OCR confidence bar, extracted medicines list, flag warnings |
| Rx Vault | `/rx/vault` | Prescription history with verification badges |
| Medicine Detail | `/medicine/[id]` | Brand info, schedule, substitutes with price comparison |

## Rider Screens

| Screen | Route | Key Features |
|---|---|---|
| Shift | `/rider/shift` | Online/offline toggle, shift timer, night-shift detection, safety reminder |
| Tasks | `/rider/tasks` | Active and history assignment list with pull-to-refresh |
| Active Delivery | `/rider/delivery/[id]` | 4-step flow: pickup confirm → en route → OTP entry → done; live GPS ping |
| Earnings | `/rider/earnings` | 7d / 30d toggle, daily bar chart, per-day breakdown table, payout schedule |

## Real-time

The order tracking screen opens a WebSocket to `ws://{API_URL}/ws/orders/{id}` and handles:

- `status_update` — invalidates the order query and advances the status stepper
- `rider_assigned` — shows rider info and OTP
- `rider_location` — updates the live location indicator

A 25-second ping heartbeat keeps the connection alive through proxies.

## Environment Variables

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend base URL (default: `http://localhost:3001`) |
