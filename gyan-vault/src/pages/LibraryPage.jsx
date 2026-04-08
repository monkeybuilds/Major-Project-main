import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { SkeletonCard } from '../components/SkeletonCard';
import { HiOutlineDocumentText, HiOutlineTrash, HiOutlineClock, HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineChevronDown, HiOutlineChevronUp } from 'react-icons/hi';
import Sidebar from '../components/Sidebar';
import api from '../api';
import { motion } from 'framer-motion';

function LibraryPage() {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedDoc, setExpandedDoc] = useState(null);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const res = await api.get('/documents/');
            setDocuments(res.data.documents);
        } catch {
            toast.error('Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (docId, docName) => {
        if (!confirm(`Delete "${docName}"? This cannot be undone.`)) return;
        try {
            await api.delete(`/documents/${docId}`);
            setDocuments(documents.filter(d => d.id !== docId));
            toast.success('Document deleted');
        } catch {
            toast.error('Failed to delete document');
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'ready': return <HiOutlineCheckCircle size={18} className="text-green-400" />;
            case 'processing': return <HiOutlineClock size={18} className="text-yellow-400" />;
            case 'error': return <HiOutlineExclamationCircle size={18} className="text-red-400" />;
            default: return null;
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
        });
    };

    const pageVariants = {
        initial: { opacity: 0, y: 15 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
        exit: { opacity: 0, scale: 0.98, transition: { duration: 0.3 } }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
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
                    <h1 className="page-title">My Library</h1>
                    <p className="page-subtitle">
                        {documents.length} document{documents.length !== 1 ? 's' : ''} in your knowledge base
                    </p>
                </div>



                {loading ? (
                    <div className="documents-grid">
                        <SkeletonCard lines={3} />
                        <SkeletonCard lines={3} />
                        <SkeletonCard lines={3} />
                        <SkeletonCard lines={3} />
                        <SkeletonCard lines={3} />
                        <SkeletonCard lines={3} />
                    </div>
                ) : documents.length === 0 ? (
                    <div className="empty-state">
                        <HiOutlineDocumentText size={64} className="text-gray-500" />
                        <h3>No documents yet</h3>
                        <p>Upload your first file to get started</p>
                    </div>
                ) : (
                    <motion.div
                        className="documents-grid"
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                    >
                        {documents.map((doc) => (
                            <motion.div key={doc.id} className="doc-card" variants={itemVariants} whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}>
                                <div className="doc-card-header">
                                    <div className="doc-card-icon">
                                        <HiOutlineDocumentText size={28} />
                                    </div>
                                    <button
                                        className="doc-delete-btn"
                                        onClick={() => handleDelete(doc.id, doc.original_name)}
                                        title="Delete document"
                                    >
                                        <HiOutlineTrash size={18} />
                                    </button>
                                </div>

                                <h3 className="doc-card-title" title={doc.original_name}>
                                    {doc.original_name}
                                </h3>

                                {/* Tags */}
                                {doc.tags && doc.tags.length > 0 && (
                                    <div className="doc-tags">
                                        {doc.tags.slice(0, 3).map((tag, i) => (
                                            <span key={i} className="doc-tag">{tag}</span>
                                        ))}
                                        {doc.tags.length > 3 && (
                                            <span className="doc-tag-more">+{doc.tags.length - 3}</span>
                                        )}
                                    </div>
                                )}

                                <div className="doc-card-meta">
                                    <span className="doc-card-status">
                                        {getStatusIcon(doc.status)}
                                        {doc.status}
                                    </span>
                                    <span className="doc-card-date">{formatDate(doc.upload_date)}</span>
                                </div>

                                <div className="doc-card-stats">
                                    <span>{doc.page_count} pages</span>
                                    <span>{doc.chunk_count} chunks</span>
                                </div>

                                {/* Expandable Summary */}
                                {doc.summary && (
                                    <div className="doc-summary-section">
                                        <button
                                            className="doc-summary-toggle"
                                            onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                                        >
                                            <span>AI Summary</span>
                                            {expandedDoc === doc.id
                                                ? <HiOutlineChevronUp size={16} />
                                                : <HiOutlineChevronDown size={16} />
                                            }
                                        </button>
                                        {/* Animate summary expansion */}
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{
                                                height: expandedDoc === doc.id ? 'auto' : 0,
                                                opacity: expandedDoc === doc.id ? 1 : 0
                                            }}
                                            className="overflow-hidden"
                                        >
                                            <p className="doc-summary-text">{doc.summary}</p>
                                        </motion.div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </main>
        </motion.div>
    );
}

export default LibraryPage;
