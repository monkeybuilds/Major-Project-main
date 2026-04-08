from duckduckgo_search import DDGS
from services.crawler import scrape_url
from config import LLM_MODEL_NAME


class ResearchAgent:
    def __init__(self):
        self.ddgs = DDGS()

    def research(self, query: str, model_provider: str = "gemini") -> dict:
        """
        Perform deep research on a query:
        1. Search web for top results
        2. Scrape content from sources
        3. Synthesize answer using LLM
        """
        # Step 1 — Web search
        results = []
        try:
            results = self.ddgs.text(query, max_results=2)
        except Exception:
            pass

        if getattr(results, '__iter__', None) is None:
            results = []

        # Fallback: direct Wikipedia search
        if not results:
            try:
                import requests
                wiki_url = (
                    f"https://en.wikipedia.org/w/api.php"
                    f"?action=opensearch&search={query}&limit=2&namespace=0&format=json"
                )
                res = requests.get(wiki_url, timeout=5).json()
                if len(res) > 3 and res[3]:
                    for i in range(len(res[3])):
                        results.append({"title": res[1][i], "href": res[3][i]})
            except Exception:
                pass

        # Step 2 — Scrape & accumulate context
        context_parts = []
        sources = []

        for r in results:
            url = r.get("href")
            title = r.get("title")
            if not url:
                continue

            try:
                scraped = scrape_url(url)
                text = scraped.get("text", "")[:3000]
                context_parts.append(f"Title: {title}\nURL: {url}\nContent:\n{text}\n")
                sources.append({"title": title, "url": url})
            except Exception:
                continue

        combined_context = "\n---\n".join(context_parts)
        if not combined_context:
            combined_context = "No direct web context could be retrieved. Answer based on your internal knowledge."

        # Step 3 — Synthesize with LLM
        prompt = f"""You are a Deep Internet Research Agent. Answer the user's question.
You must be comprehensive, detailed, and write in a professional yet engaging tone.

If web context is provided, CITE YOUR SOURCES in the text using inline markers like [Source Title] or [1].
Format your response using beautiful markdown (headings, bullet points, bolding).

Web Search Results Context:
{combined_context}

Question: {query}

Answer:"""

        from services.llm_factory import get_llm
        llm = get_llm(model_provider=model_provider)
        response = llm.invoke(prompt)

        # De-duplicate sources
        unique_sources = []
        seen_urls = set()
        for src in sources:
            if src['url'] not in seen_urls:
                seen_urls.add(src['url'])
                unique_sources.append(src)

        return {
            "answer": response.content,
            "sources": unique_sources
        }
