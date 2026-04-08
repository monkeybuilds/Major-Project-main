from services.llm_factory import get_llm

def generate_summary(pages: list, model_provider: str = "ollama") -> dict:
    """
    Generate a summary and extract key tags from document text.
    Returns {'summary': str, 'tags': list[str]}.
    """
    # ...

    # Extract text if input is list[dict]
    text_pages = []
    for p in pages:
        if isinstance(p, dict):
            text_pages.append(p.get("text", ""))
        else:
            text_pages.append(p)

    # Combine first few pages for context (limit to ~3000 chars)
    combined = "\n".join(text_pages)[:3000]

    prompt = f"""Analyze the following document text and provide:
1. A concise summary in 3-5 sentences that captures the main topics and purpose
2. Extract exactly 5 key topic tags (single words or short phrases)

Format your response EXACTLY like this:
SUMMARY: <your summary here>
TAGS: tag1, tag2, tag3, tag4, tag5

Document text:
{combined}"""

    llm = get_llm(model_provider=model_provider)
    response = llm.invoke(prompt)
    content = response.content

    # Parse response
    summary = ""
    tags = []

    lines = content.strip().split("\n")
    for line in lines:
        if line.upper().startswith("SUMMARY:"):
            summary = line.split(":", 1)[1].strip()
        elif line.upper().startswith("TAGS:"):
            tags_str = line.split(":", 1)[1].strip()
            tags = [t.strip() for t in tags_str.split(",") if t.strip()][:5]

    # Fallback if parsing fails
    if not summary:
        summary = content[:300]
    if not tags:
        tags = ["document"]

    return {"summary": summary, "tags": tags}
