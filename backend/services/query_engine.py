from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage

from services.embeddings import generate_single_embedding
from services.search import HybridRetriever
from services.llm_factory import get_llm

_retriever = HybridRetriever()
_parser = StrOutputParser()

# ─── Prompt Templates ──────────────────────────────────────────

_REWRITE_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a query rewriter. Given a conversation history and the latest "
        "user question which might reference previous context, rewrite it as a "
        "fully standalone question that can be understood without the history. "
        "Do NOT answer the question — only rewrite it. "
        "If the question is already standalone, return it as-is.",
    ),
    MessagesPlaceholder("history"),
    ("human", "{question}"),
])

_QA_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are **Gyan Vault**, an advanced AI academic assistant.\n\n"
        "## Rules\n"
        "- Answer using ONLY the provided document context.\n"
        "- Cite sources using [Source N, Page P] markers from the context.\n"
        "- If the context is insufficient, say so clearly.\n"
        "- Use well-structured markdown: headings, bullet points, bold key terms.\n"
        "- Be concise yet thorough.\n\n"
        "## Document Context\n{context}\n",
    ),
    MessagesPlaceholder("history"),
    ("human", "{question}"),
])

_FOLLOWUP_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "Based on the answer you just gave and the document context, "
        "generate exactly 3 short follow-up questions the user might want to ask next. "
        "Return ONLY the questions, one per line, numbered 1-3. No other text.",
    ),
    ("human", "Answer given:\n{answer}\n\nContext summary:\n{context_summary}"),
])


# ─── Helpers ───────────────────────────────────────────────────

def _build_langchain_history(chat_history: list[dict]) -> list:
    """Convert raw history dicts to LangChain message objects."""
    messages = []
    for msg in (chat_history or [])[-6:]:  # Last 6 messages (3 exchanges)
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        else:
            messages.append(AIMessage(content=msg["content"]))
    return messages


def _rewrite_query(question: str, chat_history: list[dict], model_provider: str) -> str:
    """Rewrite a follow-up question into a standalone query using the LLM."""
    if not chat_history:
        return question

    lc_history = _build_langchain_history(chat_history)
    llm = get_llm(model_provider=model_provider, temperature=0.0)
    chain = _REWRITE_PROMPT | llm | _parser
    rewritten = chain.invoke({"question": question, "history": lc_history})
    return rewritten.strip() or question


def _generate_followups(answer: str, context_summary: str, model_provider: str) -> list[str]:
    """Generate suggested follow-up questions."""
    try:
        llm = get_llm(model_provider=model_provider, temperature=0.5)
        chain = _FOLLOWUP_PROMPT | llm | _parser
        raw = chain.invoke({"answer": answer[:500], "context_summary": context_summary[:300]})
        lines = [l.strip().lstrip("0123456789.) ") for l in raw.strip().split("\n") if l.strip()]
        return lines[:3]
    except Exception:
        return []


# ─── Main Pipeline ─────────────────────────────────────────────

def ask_question(
    question: str,
    doc_ids: list[int],
    chat_history: list[dict] | None = None,
    model_provider: str = "ollama",
) -> dict:
    """
    Advanced RAG pipeline:
    1. Rewrite follow-up questions into standalone queries
    2. Hybrid retrieval (Vector + BM25 with RRF fusion)
    3. LangChain LCEL chain for answer generation
    4. Generate suggested follow-up questions
    """
    # Step 1 — Conversational query rewriting
    standalone_query = _rewrite_query(question, chat_history, model_provider)

    # Step 2 — Retrieve relevant chunks
    results = _retriever.search(standalone_query, doc_ids, top_k=5)

    if not results:
        return {
            "answer": "I couldn't find any relevant information in your documents. "
                      "Please upload documents first or try a different question.",
            "sources": [],
            "followups": [],
        }

    # Build context and sources
    context_parts = []
    sources = []
    for i, r in enumerate(results):
        context_parts.append(f"[Source {i+1}, Page {r['page_number']}]:\n{r['text']}")
        sources.append({
            "doc_id": r["doc_id"],
            "page_number": r["page_number"],
            "text_preview": r["text"][:150] + "..." if len(r["text"]) > 150 else r["text"],
            "relevance_score": round(r["score"], 4),
        })

    context = "\n\n".join(context_parts)

    # Step 3 — Generate answer via LCEL chain
    lc_history = _build_langchain_history(chat_history)
    llm = get_llm(model_provider=model_provider)
    chain = _QA_PROMPT | llm | _parser

    answer = chain.invoke({
        "context": context,
        "history": lc_history,
        "question": question,
    })

    # Step 4 — Generate follow-up suggestions (non-blocking, best-effort)
    context_summary = " | ".join([r["text"][:80] for r in results[:3]])
    followups = _generate_followups(answer, context_summary, model_provider)

    return {
        "answer": answer,
        "sources": sources,
        "followups": followups,
    }


def ask_question_stream(
    question: str,
    doc_ids: list[int],
    chat_history: list[dict] | None = None,
    model_provider: str = "ollama",
):
    """
    Streaming version of the RAG pipeline.
    Yields chunks of the answer as they are generated.
    Returns a generator and the metadata (sources, standalone_query).
    """
    # Step 1 — Conversational query rewriting
    standalone_query = _rewrite_query(question, chat_history, model_provider)

    # Step 2 — Retrieve relevant chunks
    results = _retriever.search(standalone_query, doc_ids, top_k=5)

    if not results:
        yield {
            "type": "error",
            "content": "I couldn't find any relevant information in your documents.",
        }
        return

    # Build context and sources
    context_parts = []
    sources = []
    for i, r in enumerate(results):
        context_parts.append(f"[Source {i+1}, Page {r['page_number']}]:\n{r['text']}")
        sources.append({
            "doc_id": r["doc_id"],
            "page_number": r["page_number"],
            "text_preview": r["text"][:150] + "..." if len(r["text"]) > 150 else r["text"],
            "relevance_score": round(r["score"], 4),
        })

    context = "\n\n".join(context_parts)

    # Emit sources metadata first
    yield {"type": "sources", "content": sources}

    # Step 3 — Stream answer via LCEL chain
    lc_history = _build_langchain_history(chat_history)
    llm = get_llm(model_provider=model_provider)
    chain = _QA_PROMPT | llm

    full_answer = ""
    for chunk in chain.stream({
        "context": context,
        "history": lc_history,
        "question": question,
    }):
        token = chunk.content if hasattr(chunk, "content") else str(chunk)
        full_answer += token
        yield {"type": "token", "content": token}

    # Step 4 — Generate follow-ups
    context_summary = " | ".join([r["text"][:80] for r in results[:3]])
    followups = _generate_followups(full_answer, context_summary, model_provider)
    yield {"type": "followups", "content": followups}
    yield {"type": "done", "content": full_answer}
