import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    HiOutlinePaperAirplane,
    HiOutlineDocumentText,
    HiOutlinePlus,
    HiOutlineTrash,
    HiOutlineChatAlt2,
    HiOutlineChevronLeft,
    HiOutlineCloudUpload,
    HiOutlineCheckCircle,
    HiOutlineX,
    HiOutlineGlobe,
    HiOutlineClipboardCopy,
    HiOutlineSwitchHorizontal,
} from 'react-icons/hi';
import Sidebar from '../components/Sidebar';
import api, { API_BASE_URL } from '../api';
import { motion } from 'framer-motion';

function QueryPage() {
    const [messages, setMessages] = useState([
        {
            type: 'ai',
            text: "Hello! I'm **Gyan Vault AI**. Upload a document below and ask me anything about it. 📚",
            sources: [],
        }
    ]);
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [activeMode, setActiveMode] = useState('ask');
    const [activeStyle, setActiveStyle] = useState('simple');
    const [followups, setFollowups] = useState([]);

    // Model provider state
    const [modelProvider, setModelProvider] = useState(
        () => localStorage.getItem('gyan_vault_model') || 'ollama'
    );

    // Document upload & selection state
    const [documents, setDocuments] = useState([]);
    const [selectedDocIds, setSelectedDocIds] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [dragging, setDragging] = useState(false);

    const chatEndRef = useRef();
    const inputRef = useRef();
    const fileInputRef = useRef();
    const abortControllerRef = useRef(null);

    const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        fetchSessions();
        fetchDocuments();
    }, []);

    // Persist model choice
    useEffect(() => {
        localStorage.setItem('gyan_vault_model', modelProvider);
    }, [modelProvider]);

    // ─── Document Fetching ────────────────────────────────────
    const fetchDocuments = async () => {
        try {
            const res = await api.get('/documents/');
            setDocuments(res.data.documents);
            const readyIds = res.data.documents
                .filter(d => d.status === 'ready')
                .map(d => d.id);
            setSelectedDocIds(readyIds);
        } catch { /* ignore */ }
    };

    // ─── Inline Upload ────────────────────────────────────────
    const isValidFile = (f) => {
        const ext = '.' + f.name.split('.').pop().toLowerCase();
        return ALLOWED_EXTENSIONS.includes(ext);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && isValidFile(droppedFile)) {
            handleUploadFile(droppedFile);
        } else {
            toast.error('Unsupported file. Use PDF, DOCX, or TXT');
        }
    };

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && isValidFile(selectedFile)) {
            handleUploadFile(selectedFile);
        } else if (selectedFile) {
            toast.error('Unsupported file. Use PDF, DOCX, or TXT');
        }
        e.target.value = '';
    };

    const handleUploadFile = async (file) => {
        setUploading(true);
        setUploadProgress(`Uploading "${file.name}"...`);

        const formData = new FormData();
        formData.append('file', file);

        try {
            setUploadProgress(`Processing "${file.name}" — extracting text, chunking, generating embeddings...`);
            const res = await api.post('/documents/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setDocuments(prev => [res.data, ...prev]);
            setSelectedDocIds(prev => [...prev, res.data.id]);

            toast.success(`"${file.name}" uploaded & ready!`);

            setMessages(prev => [...prev, {
                type: 'ai',
                text: `✅ **${file.name}** has been uploaded and processed (${res.data.page_count} pages, ${res.data.chunk_count} chunks). You can now ask questions about it!`,
                sources: [],
            }]);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Upload failed');
        } finally {
            setUploading(false);
            setUploadProgress('');
        }
    };

    // ─── Document Selection ───────────────────────────────────
    const toggleDocSelection = (docId) => {
        setSelectedDocIds(prev =>
            prev.includes(docId)
                ? prev.filter(id => id !== docId)
                : [...prev, docId]
        );
    };

    const selectAllDocs = () => {
        const readyIds = documents.filter(d => d.status === 'ready').map(d => d.id);
        setSelectedDocIds(readyIds);
    };

    const deselectAllDocs = () => {
        setSelectedDocIds([]);
    };

    // ─── Chat Sessions ───────────────────────────────────────
    const fetchSessions = async () => {
        try {
            const res = await api.get('/chat/sessions');
            setSessions(res.data.sessions);
        } catch { /* ignore */ }
    };

    const loadSession = async (sid) => {
        try {
            const res = await api.get(`/chat/sessions/${sid}`);
            setSessionId(sid);
            const loadedMessages = res.data.messages.map(m => ({
                type: m.role === 'user' ? 'user' : 'ai',
                text: m.content,
                sources: m.sources || [],
            }));
            setMessages(loadedMessages.length ? loadedMessages : [{
                type: 'ai',
                text: "This session is empty. Ask a question!",
                sources: [],
            }]);
            setShowHistory(false);
            setFollowups([]);
        } catch {
            toast.error('Failed to load chat session');
        }
    };

    const startNewChat = () => {
        setSessionId(null);
        setMessages([{
            type: 'ai',
            text: "Hello! I'm **Gyan Vault AI**. Upload a document below and ask me anything about it. 📚",
            sources: [],
        }]);
        setShowHistory(false);
        setFollowups([]);
    };

    const deleteSession = async (sid, e) => {
        e.stopPropagation();
        try {
            await api.delete(`/chat/sessions/${sid}`);
            setSessions(sessions.filter(s => s.id !== sid));
            if (sessionId === sid) startNewChat();
            toast.success('Session deleted');
        } catch {
            toast.error('Failed to delete session');
        }
    };

    // ─── Copy to Clipboard ──────────────────────────────────
    const copyToClipboard = useCallback(async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Copied to clipboard!', { duration: 1500, icon: '📋' });
        } catch {
            toast.error('Failed to copy');
        }
    }, []);

    // ─── Ask Question (Streaming) ────────────────────────────
    const handleAsk = async (e) => {
        e.preventDefault();
        if (!question.trim() || loading) return;

        if (selectedDocIds.length === 0) {
            toast.error('Please upload or select at least one document first.');
            return;
        }

        const userMessage = question.trim();
        setQuestion('');
        setMessages(prev => [...prev, { type: 'user', text: userMessage }]);
        setLoading(true);
        setFollowups([]);

        try {
            if (activeMode === 'ask') {
                // ── Streaming Ask ──
                const payload = {
                    question: userMessage,
                    doc_ids: selectedDocIds,
                    model_provider: modelProvider,
                };
                if (sessionId) payload.session_id = sessionId;

                const token = localStorage.getItem('gyan_vault_token');
                const controller = new AbortController();
                abortControllerRef.current = controller;

                const response = await fetch(`${API_BASE_URL}/query/ask-stream`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal,
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || `HTTP ${response.status}`);
                }

                // Add placeholder AI message that we'll stream into
                const aiMsgIndex = messages.length + 1; // +1 for the user message we just added
                setMessages(prev => [...prev, { type: 'ai', text: '', sources: [], streaming: true }]);

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let streamedSources = [];

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        const jsonStr = line.slice(6).trim();
                        if (!jsonStr) continue;

                        try {
                            const event = JSON.parse(jsonStr);

                            if (event.type === 'session_id') {
                                if (!sessionId) {
                                    setSessionId(event.content);
                                    fetchSessions();
                                }
                            } else if (event.type === 'sources') {
                                streamedSources = event.content;
                                setMessages(prev => {
                                    const updated = [...prev];
                                    const last = updated[updated.length - 1];
                                    if (last && last.type === 'ai') {
                                        updated[updated.length - 1] = { ...last, sources: streamedSources };
                                    }
                                    return updated;
                                });
                            } else if (event.type === 'token') {
                                setMessages(prev => {
                                    const updated = [...prev];
                                    const last = updated[updated.length - 1];
                                    if (last && last.type === 'ai') {
                                        updated[updated.length - 1] = {
                                            ...last,
                                            text: last.text + event.content,
                                        };
                                    }
                                    return updated;
                                });
                            } else if (event.type === 'followups') {
                                setFollowups(event.content || []);
                            } else if (event.type === 'done') {
                                setMessages(prev => {
                                    const updated = [...prev];
                                    const last = updated[updated.length - 1];
                                    if (last && last.type === 'ai') {
                                        updated[updated.length - 1] = { ...last, streaming: false };
                                    }
                                    return updated;
                                });
                            } else if (event.type === 'error') {
                                setMessages(prev => {
                                    const updated = [...prev];
                                    const last = updated[updated.length - 1];
                                    if (last && last.type === 'ai') {
                                        updated[updated.length - 1] = {
                                            ...last,
                                            text: `⚠️ ${event.content}`,
                                            streaming: false,
                                        };
                                    }
                                    return updated;
                                });
                            }
                        } catch { /* skip malformed JSON */ }
                    }
                }
            } else {
                // ── Non-streaming Academic Modes ──
                const res = await api.post('/academic/generate', {
                    doc_ids: selectedDocIds,
                    mode: activeMode,
                    style: activeStyle,
                    topic: userMessage,
                    model_provider: modelProvider,
                });

                setMessages(prev => [...prev, {
                    type: 'ai',
                    text: res.data.content,
                    sources: res.data.sources,
                }]);
            }
        } catch (err) {
            if (err.name === 'AbortError') return;
            const errorMsg = err.response?.data?.detail || err.message || 'Failed to get answer.';
            setMessages(prev => {
                // If last message is an empty streaming AI, fill it with the error
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.type === 'ai' && last.streaming) {
                    updated[updated.length - 1] = {
                        ...last,
                        text: `⚠️ ${errorMsg}`,
                        streaming: false,
                    };
                    return updated;
                }
                return [...prev, { type: 'ai', text: `⚠️ ${errorMsg}`, sources: [] }];
            });
            toast.error(errorMsg);
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
            inputRef.current?.focus();
        }
    };

    // ─── Suggested Follow-up Click ──────────────────────────
    const handleFollowupClick = (q) => {
        setQuestion(q);
        // Auto-submit after a tick
        setTimeout(() => {
            inputRef.current?.closest('form')?.requestSubmit();
        }, 50);
    };

    const readyDocs = documents.filter(d => d.status === 'ready');

    const pageVariants = {
        initial: { opacity: 0, y: 15 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
        exit: { opacity: 0, scale: 0.98, transition: { duration: 0.3 } }
    };

    return (
        <motion.div
            className="app-layout"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <Sidebar />
            <main className="main-content query-page">
                <div className="page-header query-header">
                    <div>
                        <h1 className="page-title">Ask AI</h1>
                        <p className="page-subtitle">
                            {sessionId ? 'Follow-up questions carry context' : 'Upload a document and start asking'}
                        </p>
                    </div>
                    <div className="query-actions">
                        {/* Model Provider Toggle */}
                        <button
                            className={`icon-btn model-toggle-btn ${modelProvider === 'gemini' ? 'gemini-active' : ''}`}
                            onClick={() => setModelProvider(prev => prev === 'ollama' ? 'gemini' : 'ollama')}
                            title={`Current: ${modelProvider === 'ollama' ? 'Ollama (Local)' : 'Gemini (Cloud)'}. Click to switch.`}
                        >
                            <HiOutlineSwitchHorizontal size={18} />
                            <span>{modelProvider === 'ollama' ? '🦙 Ollama' : '✨ Gemini'}</span>
                        </button>

                        <button className="icon-btn" onClick={() => setShowHistory(!showHistory)} title="Chat History">
                            <HiOutlineChatAlt2 size={20} />
                            <span>History</span>
                            {sessions.length > 0 && <span className="badge">{sessions.length}</span>}
                        </button>
                        <button className="icon-btn new-chat-btn" onClick={startNewChat} title="New Chat">
                            <HiOutlinePlus size={20} />
                            <span>New Chat</span>
                        </button>
                    </div>
                </div>

                <div className="query-layout">
                    {/* Chat History Panel */}
                    {showHistory && (
                        <div className="chat-history-panel">
                            <div className="history-header">
                                <h3>Chat History</h3>
                                <button className="close-history" onClick={() => setShowHistory(false)}>
                                    <HiOutlineChevronLeft size={18} />
                                </button>
                            </div>
                            {sessions.length === 0 ? (
                                <p className="history-empty">No past conversations</p>
                            ) : (
                                <div className="history-list">
                                    {sessions.map(s => (
                                        <div
                                            key={s.id}
                                            className={`history-item ${sessionId === s.id ? 'active' : ''}`}
                                            onClick={() => loadSession(s.id)}
                                        >
                                            <div className="history-item-info">
                                                <p className="history-item-title">{s.title}</p>
                                                <p className="history-item-meta">{s.message_count} messages</p>
                                            </div>
                                            <button className="history-delete" onClick={(e) => deleteSession(s.id, e)}>
                                                <HiOutlineTrash size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Chat Container */}
                    <div className="chat-container">
                        {/* ── Academic Mode Selector ── */}
                        <div className="mode-selector-bar">
                            <div className="mode-pills">
                                {[
                                    { id: 'ask', label: '💬 Ask' },
                                    { id: 'exam_notes', label: '📝 Notes' },
                                    { id: 'mcqs', label: '✅ MCQs' },
                                    { id: 'viva', label: '🎤 Viva' },
                                    { id: 'flashcards', label: '🃏 Cards' },
                                    { id: 'summary', label: '📋 Summary' },
                                    { id: 'definitions', label: '📖 Definitions' },
                                    { id: 'assignment', label: '📄 Assignment' },
                                ].map(m => (
                                    <button
                                        key={m.id}
                                        className={`mode-pill ${activeMode === m.id ? 'active' : ''}`}
                                        onClick={() => setActiveMode(m.id)}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                            {activeMode !== 'ask' && (
                                <div className="style-pills">
                                    <span className="style-label">Style:</span>
                                    {['simple', 'technical', 'bullet', 'detailed'].map(s => (
                                        <button
                                            key={s}
                                            className={`style-pill ${activeStyle === s ? 'active' : ''}`}
                                            onClick={() => setActiveStyle(s)}
                                        >
                                            {s.charAt(0).toUpperCase() + s.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── Inline Document Upload & Selector Bar ── */}
                        <div className="query-doc-bar">
                            {/* Upload Zone (compact) */}
                            <div
                                className={`query-upload-zone ${dragging ? 'dragging' : ''}`}
                                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept=".pdf,.docx,.txt"
                                    onChange={handleFileSelect}
                                    hidden
                                />
                                {uploading ? (
                                    <div className="query-upload-progress">
                                        <div className="processing-spinner"></div>
                                        <span>{uploadProgress}</span>
                                    </div>
                                ) : (
                                    <>
                                        <HiOutlineCloudUpload size={20} />
                                        <span>Drop PDF / DOCX / TXT here or <strong>click to upload</strong></span>
                                    </>
                                )}
                            </div>

                            {/* Document Chips */}
                            {readyDocs.length > 0 && (
                                <div className="query-doc-selector">
                                    <div className="query-doc-selector-header">
                                        <span className="query-doc-label">
                                            <HiOutlineDocumentText size={14} />
                                            Documents ({selectedDocIds.length}/{readyDocs.length} selected)
                                        </span>
                                        <div className="query-doc-toggle-btns">
                                            <button onClick={selectAllDocs} className="query-doc-toggle">All</button>
                                            <button onClick={deselectAllDocs} className="query-doc-toggle">None</button>
                                        </div>
                                    </div>
                                    <div className="query-doc-chips">
                                        {readyDocs.map(doc => (
                                            <button
                                                key={doc.id}
                                                className={`query-doc-chip ${selectedDocIds.includes(doc.id) ? 'selected' : ''}`}
                                                onClick={() => toggleDocSelection(doc.id)}
                                                title={doc.original_name}
                                            >
                                                {selectedDocIds.includes(doc.id) ? (
                                                    <HiOutlineCheckCircle size={14} />
                                                ) : (
                                                    <HiOutlineDocumentText size={14} />
                                                )}
                                                <span className="doc-chip-name">
                                                    {doc.original_name.length > 25
                                                        ? doc.original_name.slice(0, 22) + '...'
                                                        : doc.original_name}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Chat Messages ── */}
                        <div className="chat-messages">
                            {messages.map((msg, idx) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: 0.05 }}
                                    key={idx}
                                    className={`chat-message ${msg.type}`}
                                >
                                    <div className="message-avatar">
                                        {msg.type === 'ai' ? '🤖' : '👤'}
                                    </div>
                                    <div className="message-content">
                                        <div className="chat-markdown">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />
                                                }}
                                            >
                                                {msg.text}
                                            </ReactMarkdown>
                                            {msg.streaming && (
                                                <span className="streaming-cursor">▊</span>
                                            )}
                                        </div>

                                        {/* Copy button for AI messages */}
                                        {msg.type === 'ai' && msg.text && !msg.streaming && (
                                            <button
                                                className="msg-copy-btn"
                                                onClick={() => copyToClipboard(msg.text)}
                                                title="Copy response"
                                            >
                                                <HiOutlineClipboardCopy size={14} />
                                                <span>Copy</span>
                                            </button>
                                        )}

                                        {msg.sources && msg.sources.length > 0 && (
                                            <div className="message-sources">
                                                <p className="sources-label">📖 Sources:</p>
                                                {msg.sources.map((src, sIdx) => (
                                                    <div key={sIdx} className="source-item">
                                                        {src.url ? (
                                                            <a href={src.url} target="_blank" rel="noopener noreferrer" className="web-source-link">
                                                                <HiOutlineGlobe size={14} />
                                                                <span>{src.title}</span>
                                                            </a>
                                                        ) : (
                                                            <>
                                                                <HiOutlineDocumentText size={14} />
                                                                <span>Page {src.page_number}</span>
                                                                <span className="source-preview">{src.text_preview}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <span className="message-time">
                                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}

                            {loading && !messages[messages.length - 1]?.streaming && (
                                <div className="chat-message ai">
                                    <div className="message-avatar">🤖</div>
                                    <div className="message-content">
                                        <div className="typing-indicator">
                                            <span></span><span></span><span></span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={chatEndRef} />
                        </div>

                        {/* ── Suggested Follow-ups ── */}
                        {followups.length > 0 && !loading && (
                            <div className="followup-bar">
                                <span className="followup-label">Suggested follow-ups:</span>
                                <div className="followup-chips">
                                    {followups.map((q, i) => (
                                        <button
                                            key={i}
                                            className="followup-chip"
                                            onClick={() => handleFollowupClick(q)}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Chat Input ── */}
                        <form className="chat-input-area" onSubmit={handleAsk}>
                            <input
                                ref={inputRef}
                                type="text"
                                className="chat-input"
                                placeholder={
                                    selectedDocIds.length === 0
                                        ? "Upload a document first..."
                                        : activeMode === 'ask'
                                            ? "Ask a question about your documents..."
                                            : `Enter a topic for ${activeMode.replace('_', ' ')}...`
                                }
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                disabled={loading || selectedDocIds.length === 0}
                            />
                            <button
                                type="submit"
                                className="chat-send-btn"
                                disabled={!question.trim() || loading || selectedDocIds.length === 0}
                            >
                                <HiOutlinePaperAirplane size={20} />
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </motion.div>
    );
}

export default QueryPage;
