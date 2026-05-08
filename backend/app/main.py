from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import value_chain, hs_codes, baci, sankey, kpi, export

app = FastAPI(title="Supply Chain Intelligence API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(value_chain.router, prefix="/api")
app.include_router(hs_codes.router, prefix="/api")
app.include_router(baci.router, prefix="/api")
app.include_router(sankey.router, prefix="/api")
app.include_router(kpi.router, prefix="/api")
app.include_router(export.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
