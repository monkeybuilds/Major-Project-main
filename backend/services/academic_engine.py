from services.search import HybridRetriever
from services.llm_factory import get_llm

_retriever = HybridRetriever()

# ─── Prompt Templates ───────────────────────────────────────────

PROMPT_TEMPLATES = {
    "exam_notes": """You are an academic assistant. Based on the following document content, generate concise exam-ready notes.

Format: Use clear headings, bullet points, and highlight key terms in **bold**.
Keep it short and memorizable — like a cheat sheet.

{style_instruction}

Document Content:
{context}

{topic_instruction}

Generate exam notes:""",

    "mcqs": """You are an academic assistant. Based on the following document content, generate 10 multiple choice questions (MCQs).

Format for each question:
**Q1.** [Question text]
A) Option A
B) Option B
C) Option C
D) Option D
**Answer:** [Correct letter] — [Brief explanation]

{style_instruction}

Document Content:
{context}

{topic_instruction}

Generate MCQs:""",

    "viva": """You are an academic assistant. Based on the following document content, generate 15 viva voce (oral exam) questions with model answers.

Format:
**Q1.** [Question]
**A:** [Concise answer, 2-3 sentences]

Questions should range from basic definitions to analytical/application-based.

{style_instruction}

Document Content:
{context}

{topic_instruction}

Generate viva questions:""",

    "flashcards": """You are an academic assistant. Based on the following document content, generate 15 flashcards.

Format each flashcard as:
**Term:** [Key term or concept]
**Definition:** [Clear, concise definition or explanation]
---

{style_instruction}

Document Content:
{context}

{topic_instruction}

Generate flashcards:""",

    "summary": """You are an academic assistant. Based on the following document content, generate a comprehensive chapter-wise summary.

Format: Use headings for each section/chapter. Under each, provide 3-5 key points.
End with a "Key Takeaways" section.

{style_instruction}

Document Content:
{context}

{topic_instruction}

Generate summary:""",

    "definitions": """You are an academic assistant. Based on the following document content, extract ALL definitions, key terms, and important concepts.

Format:
**[Term]:** [Definition as found in the document]

Include page references where the definition appears.
List them alphabetically.

{style_instruction}

Document Content:
{context}

{topic_instruction}

Extract definitions:""",

    "assignment": """You are an academic assistant. Based on the following document content, generate 5 detailed assignment-style long answers (10-mark quality).

Format:
**Question 1:** [Question]
**Answer:**
[Detailed answer with introduction, main points, examples, and conclusion. 200-300 words each.]

{style_instruction}

Document Content:
{context}

{topic_instruction}

Generate assignment answers:""",

    "compare": """You are an academic assistant. Compare and analyze the following documents.

Identify:
1. **Common Topics** — What both documents cover
2. **Key Differences** — Where they differ in content, perspective, or data
3. **Unique Content** — What's in one but not the other
4. **Contradictions** — Any conflicting information

Format your response with clear headings and bullet points.
Cite which document (Source 1 vs Source 2) each point comes from.

{style_instruction}

Document Content:
{context}

{topic_instruction}

Generate comparison:""",

    "ask": """You are Gyan Vault, an AI academic assistant that answers questions based on document context.
Answer the user's question accurately using ONLY the information from the context below.
If the context does not contain enough information, say so clearly.
Always cite the source page number when referencing information.

{style_instruction}

Document Content:
{context}

{history_section}

Question: {question}

Answer:"""
}

# ─── Style Instructions ─────────────────────────────────────────

STYLE_INSTRUCTIONS = {
    "simple": "Use simple language suitable for beginners. Avoid jargon.",
    "technical": "Use technical and academic language appropriate for advanced students.",
    "bullet": "Format your entire response in bullet points. No paragraphs.",
    "detailed": "Provide thorough, detailed explanations with examples.",
}


def generate_academic_content(
    doc_ids: list[int],
    mode: str,
    style: str = "simple",
    topic: str | None = None,
    question: str | None = None,
    chat_history: list[dict] | None = None,
    model_provider: str = "ollama",
) -> dict:
    """
    Generate academic content from uploaded documents.
    Supports: exam_notes, mcqs, viva, flashcards, summary, definitions, assignment, compare, ask.
    """
    # Retrieve relevant chunks from all selected documents
    search_query = topic or question or mode.replace("_", " ")
    results = _retriever.search(search_query, doc_ids, top_k=8)

    if not results:
        return {
            "content": "No relevant content found in the selected documents. Please upload documents first.",
            "sources": [],
            "mode": mode,
        }

    # Build context with source citations
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

    # Get the appropriate prompt template
    template = PROMPT_TEMPLATES.get(mode, PROMPT_TEMPLATES["ask"])

    # Build style instruction
    style_instruction = STYLE_INSTRUCTIONS.get(style, STYLE_INSTRUCTIONS["simple"])

    # Build topic instruction
    topic_instruction = f"Focus specifically on: {topic}" if topic else ""

    # Build history section for ask mode
    history_section = ""
    if chat_history and mode == "ask":
        history_parts = []
        for msg in chat_history[-6:]:
            role = "User" if msg["role"] == "user" else "Assistant"
            history_parts.append(f"{role}: {msg['content']}")
        history_section = f"Previous conversation:\n" + "\n".join(history_parts)

    # Fill template
    prompt = template.format(
        context=context,
        style_instruction=f"Style: {style_instruction}",
        topic_instruction=topic_instruction,
        question=question or "",
        history_section=history_section,
    )

    # Generate response
    llm = get_llm(model_provider=model_provider)
    response = llm.invoke(prompt)

    return {
        "content": response.content,
        "sources": sources,
        "mode": mode,
    }
