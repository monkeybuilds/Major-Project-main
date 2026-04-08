import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineDocumentText, HiOutlineCloudUpload, HiOutlineChatAlt2, HiOutlineCollection, HiOutlineChartBar, HiOutlineDocumentSearch } from 'react-icons/hi';
import Sidebar from '../components/Sidebar';
import api from '../api';
import { motion } from 'framer-motion';

import { SkeletonStat } from '../components/SkeletonCard';

function Dashboard() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('gyan_vault_user') || '{}');
    const [stats, setStats] = useState({
        total_documents: 0,
        ready_documents: 0,
        total_pages: 0,
        total_chunks: 0,
        total_queries: 0,
        total_chat_sessions: 0,
    });
    const [activity, setActivity] = useState([]);
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        fetchStats();
        fetchActivity();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get('/analytics/stats');
            setStats(res.data);
        } catch { /* silently fail */ }
        finally { setLoadingStats(false); }
    };

    const fetchActivity = async () => {
        try {
            const res = await api.get('/analytics/activity');
            setActivity(res.data.recent_activity);
        } catch { /* silently fail */ }
    };

    const quickActions = [
        {
            title: 'Upload Document',
            description: 'Upload PDF, DOCX, or TXT files',
            icon: <HiOutlineCloudUpload size={32} />,
            color: 'from-blue-500 to-cyan-500',
            onClick: () => navigate('/upload'),
        },
        {
            title: 'My Library',
            description: 'Browse documents with AI summaries',
            icon: <HiOutlineCollection size={32} />,
            color: 'from-purple-500 to-pink-500',
            onClick: () => navigate('/library'),
        },
        {
            title: 'Ask AI',
            description: 'Chat with your documents',
            icon: <HiOutlineChatAlt2 size={32} />,
            color: 'from-emerald-500 to-teal-500',
            onClick: () => navigate('/query'),
        },
    ];

    const formatDate = (dateStr) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            });
        } catch { return dateStr; }
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
                {/* Welcome */}
                <div className="welcome-section">
                    <h1 className="welcome-title">
                        Welcome back, <span className="text-gradient">{user.name || 'User'}</span> 👋
                    </h1>
                    <p className="welcome-subtitle">
                        Your AI-powered knowledge base is ready. Upload documents and ask questions.
                    </p>
                </div>

                {/* Stats */}
                <div className="stats-grid">
                    {loadingStats ? (
                        <>
                            <SkeletonStat />
                            <SkeletonStat />
                            <SkeletonStat />
                            <SkeletonStat />
                        </>
                    ) : (
                        <>
                            <div className="stat-card">
                                <div className="stat-icon bg-blue-500/20 text-blue-400">
                                    <HiOutlineDocumentText size={24} />
                                </div>
                                <div>
                                    <p className="stat-value">{stats.total_documents}</p>
                                    <p className="stat-label">Documents</p>
                                </div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-icon bg-green-500/20 text-green-400">
                                    <HiOutlineDocumentSearch size={24} />
                                </div>
                                <div>
                                    <p className="stat-value">{stats.total_pages}</p>
                                    <p className="stat-label">Pages Processed</p>
                                </div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-icon bg-purple-500/20 text-purple-400">
                                    <HiOutlineCollection size={24} />
                                </div>
                                <div>
                                    <p className="stat-value">{stats.total_chunks}</p>
                                    <p className="stat-label">Knowledge Chunks</p>
                                </div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-icon bg-amber-500/20 text-amber-400">
                                    <HiOutlineChatAlt2 size={24} />
                                </div>
                                <div>
                                    <p className="stat-value">{stats.total_queries}</p>
                                    <p className="stat-label">Queries Asked</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Quick Actions */}
                <h2 className="section-title">Quick Actions</h2>
                <div className="actions-grid">
                    {quickActions.map((action) => (
                        <div key={action.title} className="action-card" onClick={action.onClick}>
                            <div className={`action-icon bg-gradient-to-br ${action.color}`}>
                                {action.icon}
                            </div>
                            <h3 className="action-title">{action.title}</h3>
                            <p className="action-desc">{action.description}</p>
                        </div>
                    ))}
                </div>

                {/* Recent Activity */}
                {activity.length > 0 && (
                    <>
                        <h2 className="section-title">Recent Activity</h2>
                        <div className="activity-feed">
                            {activity.map((item, idx) => (
                                <div key={idx} className="activity-item">
                                    <div className={`activity-dot ${item.type === 'upload' ? 'upload' : 'query'}`}></div>
                                    <div className="activity-info">
                                        <p className="activity-text">{item.title}</p>
                                        <p className="activity-date">{formatDate(item.date)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </main>
        </motion.div>
    );
}

export default Dashboard;
