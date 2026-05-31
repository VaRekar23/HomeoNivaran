# HomeoClinic

Online homeopathy teleconsultation platform built with FastAPI + React.

## Tech Stack

**Backend:** FastAPI, SQLAlchemy 2.0 async, PostgreSQL (Neon.tech), Redis  
**Frontend:** React 18, Vite, Tailwind CSS v3, Zustand, React Query  
**AI:** OpenAI  
**Payments:** Razorpay  
**Deployment:** Google Cloud Run + Firebase Hosting  

## Project Structure

homeopathy-app/
├── backend/          # FastAPI application
│   ├── app/
│   │   ├── models/   # SQLAlchemy models
│   │   ├── routers/  # API endpoints
│   │   ├── services/ # Business logic
│   │   ├── schemas/  # Pydantic schemas
│   │   ├── ai/       # AI provider abstraction
│   │   └── cache/    # Redis caching
│   ├── migrations/   # Alembic migrations
│   └── requirements.txt
└── frontend/         # React application
├── src/
│   ├── api/      # API client functions
│   ├── pages/    # Page components
│   ├── hooks/    # React Query hooks
│   ├── store/    # Zustand stores
│   └── components/
└── package.json