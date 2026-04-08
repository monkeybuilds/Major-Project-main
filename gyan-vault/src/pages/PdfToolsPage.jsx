import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
    HiOutlineDocumentDuplicate,
    HiOutlineScissors,
    HiOutlinePhotograph,
    HiOutlineRefresh,
    HiOutlineDownload,
    HiOutlineCloudUpload,
    HiOutlineX,
    HiOutlineHashtag,
    HiOutlineShieldCheck,
    HiOutlineDocumentText,
} from 'react-icons/hi';
import Sidebar from '../components/Sidebar';
import api from '../api';

const TOOLS = [
    { id: 'merge', label: 'Merge PDF', desc: 'Combine multiple PDFs into one', icon: <HiOutlineDocumentDuplicate size={28} />, color: '#ef4444', multi: true },
    { id: 'split', label: 'Split PDF', desc: 'Extract specific page ranges', icon: <HiOutlineScissors size={28} />, color: '#f59e0b', multi: false },
    { id: 'compress', label: 'Compress PDF', desc: 'Reduce file size', icon: <HiOutlinePhotograph size={28} />, color: '#10b981', multi: false },
    { id: 'rotate', label: 'Rotate PDF', desc: 'Rotate pages by 90°, 180°, 270°', icon: <HiOutlineRefresh size={28} />, color: '#6366f1', multi: false },
    { id: 'add-page-numbers', label: 'Page Numbers', desc: 'Add page numbers to PDF', icon: <HiOutlineHashtag size={28} />, color: '#8b5cf6', multi: false },
    { id: 'watermark', label: 'Watermark', desc: 'Add text watermark to pages', icon: <HiOutlineShieldCheck size={28} />, color: '#ec4899', multi: false },
    { id: 'to-text', label: 'PDF to Text', desc: 'Extract text from PDF', icon: <HiOutlineDocumentText size={28} />, color: '#14b8a6', multi: false },
    { id: 'to-word', label: 'PDF to Word', desc: 'Convert PDF to DOCX', icon: <HiOutlineDocumentDuplicate size={28} />, color: '#3b82f6', multi: false },
];

function PdfToolsPage() {
    const [activeTool, setActiveTool] = useState(null);
    const [files, setFiles] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [startPage, setStartPage] = useState(1);
    const [endPage, setEndPage] = useState(0);
    const [angle, setAngle] = useState(90);
    const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
    const fileInputRef = useRef();

    const handleFileSelect = (e) => {
        const selected = Array.from(e.target.files);
        setFiles(prev => [...prev, ...selected]);
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    };

    const handleProcess = async () => {
        if (!activeTool || files.length === 0) return;

        setProcessing(true);
        try {
            const formData = new FormData();
            const tool = TOOLS.find(t => t.id === activeTool);

            if (tool.multi) {
                files.forEach(f => formData.append('files', f));
            } else {
                formData.append('file', files[0]);
            }

            // Add extra params
            if (activeTool === 'split') {
                formData.append('start_page', startPage);
                formData.append('end_page', endPage);
            }
            if (activeTool === 'rotate') {
                formData.append('angle', angle);
            }
            if (activeTool === 'watermark') {
                formData.append('text', watermarkText);
            }

            const response = await api.post(`/pdf-tools/${activeTool}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob',
            });

            // Download result
            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // Determine filename
            const contentDisp = response.headers['content-disposition'];
            let filename = `${activeTool}_result.pdf`;
            if (contentDisp) {
                const match = contentDisp.match(/filename=(.+)/);
                if (match) filename = match[1];
            }
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);

            toast.success('File processed successfully!');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Processing failed');
        } finally {
            setProcessing(false);
        }
    };

    const resetTool = () => {
        setActiveTool(null);
        setFiles([]);
        setStartPage(1);
        setEndPage(0);
    };

    const pageVariants = {
        initial: { opacity: 0, y: 15 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
        exit: { opacity: 0, scale: 0.98, transition: { duration: 0.3 } }
    };

    return (
        <motion.div className="app-layout" variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1 className="page-title">PDF Tools</h1>
                    <p className="page-subtitle">All-in-one PDF toolkit — merge, split, compress, convert, and more</p>
                </div>

                {!activeTool ? (
                    /* Tool Selection Grid */
                    <div className="pdf-tools-grid">
                        {TOOLS.map((tool, i) => (
                            <motion.div
                                key={tool.id}
                                className="pdf-tool-card"
                                onClick={() => setActiveTool(tool.id)}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                whileHover={{ y: -6, boxShadow: `0 12px 40px ${tool.color}22` }}
                            >
                                <div className="pdf-tool-icon" style={{ background: `${tool.color}18`, color: tool.color }}>
                                    {tool.icon}
                                </div>
                                <h3 className="pdf-tool-title">{tool.label}</h3>
                                <p className="pdf-tool-desc">{tool.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    /* Active Tool UI */
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pdf-tool-workspace">
                        <div className="pdf-tool-workspace-header">
                            <button className="icon-btn" onClick={resetTool}>
                                <HiOutlineX size={16} /> Back to Tools
                            </button>
                            <h2>{TOOLS.find(t => t.id === activeTool)?.label}</h2>
                        </div>

                        {/* File Upload */}
                        <div
                            className="drop-zone"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <HiOutlineCloudUpload size={48} className="drop-zone-icon" />
                            <p className="drop-zone-text">
                                Click to select {TOOLS.find(t => t.id === activeTool)?.multi ? 'multiple PDF files' : 'a PDF file'}
                            </p>
                            <p className="drop-zone-hint">PDF files only</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf"
                                multiple={TOOLS.find(t => t.id === activeTool)?.multi}
                                onChange={handleFileSelect}
                                hidden
                            />
                        </div>

                        {/* Selected Files */}
                        {files.length > 0 && (
                            <div className="pdf-files-list">
                                {files.map((f, i) => (
                                    <div key={i} className="file-preview">
                                        <div className="file-preview-info">
                                            <HiOutlineDocumentText size={20} style={{ color: '#60a5fa' }} />
                                            <div>
                                                <span className="file-name">{f.name}</span>
                                                <span className="file-size">{formatFileSize(f.size)}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => removeFile(i)} className="doc-delete-btn">
                                            <HiOutlineX size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Extra Options */}
                        {activeTool === 'split' && files.length > 0 && (
                            <div className="pdf-tool-options">
                                <label>Start Page: <input type="number" min={1} value={startPage} onChange={e => setStartPage(+e.target.value)} className="profile-input" style={{ width: 80 }} /></label>
                                <label>End Page (0 = last): <input type="number" min={0} value={endPage} onChange={e => setEndPage(+e.target.value)} className="profile-input" style={{ width: 80 }} /></label>
                            </div>
                        )}
                        {activeTool === 'rotate' && files.length > 0 && (
                            <div className="pdf-tool-options">
                                <label>Angle:
                                    <select value={angle} onChange={e => setAngle(+e.target.value)} className="profile-input" style={{ width: 100 }}>
                                        <option value={90}>90°</option>
                                        <option value={180}>180°</option>
                                        <option value={270}>270°</option>
                                    </select>
                                </label>
                            </div>
                        )}
                        {activeTool === 'watermark' && files.length > 0 && (
                            <div className="pdf-tool-options">
                                <label>Watermark Text: <input type="text" value={watermarkText} onChange={e => setWatermarkText(e.target.value)} className="profile-input" style={{ width: 200 }} /></label>
                            </div>
                        )}

                        {/* Process Button */}
                        {files.length > 0 && (
                            <button
                                className="primary-btn"
                                onClick={handleProcess}
                                disabled={processing}
                                style={{ maxWidth: 300, margin: '1.5rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            >
                                {processing ? (
                                    <><span className="spinner" /> Processing...</>
                                ) : (
                                    <><HiOutlineDownload size={18} /> Process & Download</>
                                )}
                            </button>
                        )}
                    </motion.div>
                )}
            </main>
        </motion.div>
    );
}

export default PdfToolsPage;
