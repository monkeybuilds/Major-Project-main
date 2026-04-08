import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { HiOutlineCloudUpload, HiOutlineDocumentText, HiOutlineCheckCircle } from 'react-icons/hi';
import Sidebar from '../components/Sidebar';
import api from '../api';
import { motion } from 'framer-motion';

function UploadPage() {
    const [file, setFile] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState('');
    const [uploadedDoc, setUploadedDoc] = useState(null);
    const [activeTab, setActiveTab] = useState('file'); // 'file' | 'web'
    const [url, setUrl] = useState('');
    const fileInputRef = useRef();
    const navigate = useNavigate();

    const ALLOWED_TYPES = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
    ];
    const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];

    const isValidFile = (f) => {
        const ext = '.' + f.name.split('.').pop().toLowerCase();
        return ALLOWED_TYPES.includes(f.type) || ALLOWED_EXTENSIONS.includes(ext);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && isValidFile(droppedFile)) {
            setFile(droppedFile);
        } else {
            toast.error('Unsupported file. Use PDF, DOCX, or TXT');
        }
    };

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) setFile(selectedFile);
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setProgress('Uploading document...');

        const formData = new FormData();
        formData.append('file', file);

        try {
            setProgress('Processing — extracting text, chunking, generating embeddings & AI summary...');
            const res = await api.post('/documents/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setUploadedDoc(res.data);
            setProgress('');
            toast.success('Document uploaded and processed!');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Upload failed');
            setProgress('');
        } finally {
            setUploading(false);
        }
    };

    const handleWebImport = async () => {
        if (!url.trim()) return;
        setUploading(true);
        setProgress('Crawling website content...');
        try {
            const res = await api.post('/documents/crawl', { url: url.trim() });
            setUploadedDoc(res.data);
            setProgress('');
            toast.success('Website content imported!');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Import failed');
            setProgress('');
        } finally {
            setUploading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

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
            <main className="main-content">
                <div className="page-header">
                    <h1 className="page-title">Upload Document</h1>
                    <p className="page-subtitle">Upload PDF, DOCX, or TXT files to your knowledge base</p>
                </div>

                {!uploadedDoc ? (
                    <>
                        <div className="upload-tabs-container mb-6 flex space-x-4 border-b border-white/10">
                            <button
                                className={`pb-2 px-4 ${activeTab === 'file' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                onClick={() => setActiveTab('file')}
                            >
                                File Upload
                            </button>
                            <button
                                className={`pb-2 px-4 ${activeTab === 'web' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                                onClick={() => setActiveTab('web')}
                            >
                                Import from Web
                            </button>
                        </div>

                        {activeTab === 'file' ? (
                            <div
                                className={`drop-zone ${dragging ? 'drop-zone-active' : ''}`}
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
                                <HiOutlineCloudUpload size={48} className="drop-zone-icon" />
                                <p className="drop-zone-text">
                                    Drag & drop your file here, or <span className="text-blue-400">browse</span>
                                </p>
                                <p className="drop-zone-hint">Supports PDF, DOCX, and TXT files</p>
                            </div>
                        ) : (
                            <div className="web-import-card p-6 bg-white/5 rounded-xl border border-white/10">
                                <label className="block text-sm font-medium mb-2">Website URL</label>
                                <div className="flex gap-4">
                                    <input
                                        type="url"
                                        className="flex-1 bg-black/20 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
                                        placeholder="https://example.com/article"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                    />
                                    <button
                                        className="primary-btn whitespace-nowrap"
                                        onClick={handleWebImport}
                                        disabled={uploading || !url.trim()}
                                    >
                                        {uploading ? 'Crawling...' : 'Import'}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    We'll extract the main text from the page. JavaScript-heavy sites might not be fully captured.
                                </p>
                            </div>
                        )}

                        {activeTab === 'file' && file && (
                            <div className="file-preview">
                                <div className="file-preview-info">
                                    <HiOutlineDocumentText size={24} className="text-blue-400" />
                                    <div>
                                        <p className="file-name">{file.name}</p>
                                        <p className="file-size">{formatFileSize(file.size)}</p>
                                    </div>
                                </div>
                                <button className="upload-btn" onClick={handleUpload} disabled={uploading}>
                                    {uploading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="spinner"></span>
                                            Processing...
                                        </span>
                                    ) : 'Upload & Process'}
                                </button>
                            </div>
                        )}

                        {progress && (
                            <div className="processing-status">
                                <div className="processing-spinner"></div>
                                <p>{progress}</p>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="upload-success">
                        <HiOutlineCheckCircle size={64} className="text-green-400" />
                        <h2 className="success-title">Document Processed Successfully!</h2>

                        <div className="success-stats">
                            <div className="success-stat">
                                <span className="success-stat-value">{uploadedDoc.page_count}</span>
                                <span className="success-stat-label">Pages</span>
                            </div>
                            <div className="success-stat">
                                <span className="success-stat-value">{uploadedDoc.chunk_count}</span>
                                <span className="success-stat-label">Chunks</span>
                            </div>
                        </div>

                        {/* AI Summary */}
                        {uploadedDoc.summary && (
                            <div className="upload-summary-card">
                                <h3>🤖 AI Summary</h3>
                                <p>{uploadedDoc.summary}</p>
                                {uploadedDoc.tags && uploadedDoc.tags.length > 0 && (
                                    <div className="upload-tags">
                                        {uploadedDoc.tags.map((tag, i) => (
                                            <span key={i} className="doc-tag">{tag}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="success-actions">
                            <button className="primary-btn" onClick={() => navigate('/query')}>
                                Ask Questions
                            </button>
                            <button className="secondary-btn" onClick={() => { setFile(null); setUploadedDoc(null); }}>
                                Upload Another
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </motion.div>
    );
}

export default UploadPage;
