# medrush-core

Backend API for MedRush — India's 15-minute prescription medicine delivery platform.

## Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI (Python 3.11+) |
| Database | PostgreSQL 15 + PostGIS (spatial queries) |
| ORM | SQLAlchemy 2.0 async + asyncpg |
| Cache / OTP store | Redis |
| Events | Kafka (optional, stub-safe) |
| Migrations | Alembic |
| Payments | Razorpay |
| Storage | AWS S3 (presigned URLs for Rx images) |

## Prerequisites

- Python 3.11+
- PostgreSQL 15 with PostGIS extension
- Redis 7+
- (Optional) Kafka broker

## Setup

```bash
cd medrush-core
python -m venv .venv
source .venv/Scripts/activate
pip install -r requirements.txt
```

Copy the environment template and fill in values:

```bash
cp .env.example .env
```

Run database migrations:

```bash
alembic upgrade head
```

Start the development server:

```bash
uvicorn app.main:app --reload --port 3001
```

The API and interactive docs are available at:
- API: `http://localhost:3001/api/v1`
- Swagger UI: `http://localhost:3001/docs`
- Health check: `http://localhost:3001/health`

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL async DSN (`postgresql+asyncpg://...`) |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `KAFKA_ENABLED` | `false` | Set to `true` to publish domain events |
| `KAFKA_BROKERS` | `localhost:9092` | Kafka broker list |
| `ENABLE_PAYMENT_GATEWAY` | `false` | Set to `true` to call live Razorpay API |
| `RAZORPAY_KEY_ID` | placeholder | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | placeholder | Razorpay key secret |
| `S3_BUCKET_RX` | `medrush-rx-vault` | S3 bucket for prescription images |
| `S3_REGION` | `ap-south-1` | AWS region |
| `CORS_ORIGINS` | `http://localhost:3000,...` | Comma-separated allowed origins |
| `ENABLE_RX_VERIFICATION` | `false` | Enable manual Rx verification flow |

## API Modules

| Prefix | Module | Description |
|---|---|---|
| `/api/v1/identity` | identity | OTP-based phone auth, JWT tokens |
| `/api/v1/users` | user | Profile, addresses, family members |
| `/api/v1/catalog` | catalog | Medicine search (brand / generic / salt), substitutes |
| `/api/v1/pharmacies` | pharmacy | Pharmacy registration and profiles |
| `/api/v1/inventory` | inventory | Per-SKU stock levels, listing toggle, reservation saga |
| `/api/v1/geo` | geo | Nearby pharmacies via PostGIS `ST_DWithin` |
| `/api/v1/cart` | cart | Cart management |
| `/api/v1/orders` | order | Order placement, status transitions, ratings |
| `/api/v1/rx` | rx | Prescription upload, mock OCR, pharmacist review |
| `/api/v1/payments` | payment | Razorpay order creation + HMAC verification, COD |
| `/api/v1/logistics` | logistics | Rider assignment, GPS pings, OTP delivery verification |
| `/api/v1/notifications` | notification | SMS / push delivery log |
| `/api/v1/audit` | audit | Immutable audit trail for CDSCO compliance |
| `/ws` | ws | WebSocket rooms for real-time order and rider updates |

## Key Design Decisions

**Inventory reservation saga**
Stock is hard-reserved (`qty_reserved += qty`) at order placement using `SELECT FOR UPDATE` to prevent overselling. Reservations are committed (deduct `qty_on_hand`) on delivery or released on cancellation.

**SLA enforcement**
`sla_target_at = placed_at + 15 minutes` is stored on every order. Frontends count down in real-time; no polling is needed from the backend.

**WebSocket rooms**
A shared `ConnectionManager` broadcasts to typed rooms: `order:{id}`, `pharmacy:{id}`, `rider:{id}`. All service modules import the singleton and can broadcast without coupling to the transport layer.

**Mock OCR**
When `ENABLE_RX_VERIFICATION=false` (default), a deterministic seed derived from the S3 key picks 1–3 medicines with dosage, frequency, and duration. This lets the full Rx flow run without an ML service in development.

**Kafka is optional**
Every `publish_event()` call is wrapped so it degrades to a log line if `KAFKA_ENABLED=false`. No code changes needed to switch.

## Project Structure

```
medrush-core/
├── app/
│   ├── main.py              # FastAPI app, middleware, router registration
│   ├── settings.py          # Pydantic settings from environment
│   ├── db/                  # SQLAlchemy engine, session dependency
│   ├── cache/               # Redis client
│   ├── kafka/               # Event publisher
│   ├── lib/                 # Money utils, error handlers, idempotency middleware
│   └── modules/
│       ├── identity/        # Auth
│       ├── user/            # Profiles & addresses
│       ├── catalog/         # Medicines & substitutes
│       ├── pharmacy/        # Pharmacy entities
│       ├── inventory/       # Stock management
│       ├── geo/             # Spatial search
│       ├── cart/            # Cart
│       ├── order/           # Orders & status machine
│       ├── rx/              # Prescriptions & OCR
│       ├── payment/         # Razorpay integration
│       ├── logistics/       # Riders & deliveries
│       ├── notification/    # Delivery logs
│       ├── audit/           # Audit trail
│       └── ws/              # WebSocket connection manager
├── alembic/                 # Database migrations
├── requirements.txt
└── .env.example
```
