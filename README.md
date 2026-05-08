# Supply Chain Analytics

AI-powered supply chain intelligence tool that combines trade data analysis with Claude AI to identify sourcing risks and optimization opportunities.

## Overview

A full-stack web application with a guided 4-step workflow:

1. **Value Chain Definition** – Describe your product and define the manufacturing steps
2. **HS Code Mapping** – Map value chain steps to Harmonized System trade codes
3. **Trade Flow Analysis** – Visualize global trade flows (BACI data) via Sankey diagrams
4. **KPI Dashboard** – Review supply chain KPIs including concentration risk, labor costs, and energy costs

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.11+, FastAPI |
| AI | Anthropic Claude API |
| Trade Data | BACI (CEPII), World Bank API |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Charts | Plotly.js |
| State | Zustand |
| Containers | Docker, Docker Compose |

## Quick Start (Docker)

```bash
# 1. Clone the repository
git clone <repo-url>
cd Supply_Chain_Analytics

# 2. Set up environment variables
cp backend/.env.example .env
# Edit .env and add your Anthropic API key

# 3. Start all services
docker compose up --build
```

Frontend: <http://localhost:3000>  
Backend API: <http://localhost:8000>  
API Docs: <http://localhost:8000/docs>

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install

# Create frontend env file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

npm run dev
```

## Environment Variables

Copy `backend/.env.example` to `.env` (project root for Docker, `backend/.env` for local dev):

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | API key or proxy token for Claude access | Yes |
| `ANTHROPIC_BASE_URL` | Custom endpoint — required when using an LLM proxy | No (direct Anthropic API if omitted) |
| `TEMP_DIR` | Temporary directory for BACI data | No (default: `/tmp`) |

## API Routes

| Route | Description |
|-------|-------------|
| `POST /api/value-chain` | Generate value chain from product description |
| `GET /api/hs-codes` | Suggest HS codes for a value chain step |
| `GET /api/baci/...` | Query BACI trade flow data |
| `GET /api/sankey` | Build Sankey diagram data |
| `GET /api/kpi` | Compute supply chain KPIs |
| `GET /api/export` | Export analysis results |
| `GET /health` | Health check |

## Data Sources

- **[BACI](https://www.cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37)** – International trade data at HS6 product level (CEPII)
- **[World Bank API](https://datahelpdesk.worldbank.org/knowledgebase/articles/898590)** – Country-level labor and energy cost indicators

## License

MIT
