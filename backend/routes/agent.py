from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.agent import ResearchAgent

router = APIRouter(prefix="/agent", tags=["Agent"])


class ResearchRequest(BaseModel):
    query: str
    model_provider: str = "gemini"


@router.post("/research")
def research(request: ResearchRequest):
    """Perform deep research using web search, scraping, and LLM synthesis."""
    try:
        agent = ResearchAgent()
        result = agent.research(request.query, model_provider=request.model_provider)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
