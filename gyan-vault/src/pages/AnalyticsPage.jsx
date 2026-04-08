import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    HiOutlineChartBar,
    HiOutlineDocumentText,
    HiOutlineChatAlt2,
    HiOutlineCollection,
    HiOutlineLightningBolt,
    HiOutlineClock,
    HiOutlineCloudUpload
} from 'react-icons/hi';
import Sidebar from '../components/Sidebar';
import api from '../api';

function AnalyticsPage() {
    const [stats, setStats] = useState(null);
    const [activity, setActivity] = useState({ recent_activity: [], chart_data: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const [statsRes, activityRes] = await Promise.all([
                    api.get('/analytics/stats'),
                    api.get('/analytics/activity')
                ]);
                setStats(statsRes.data);
                setActivity(activityRes.data);
            } catch (err) {
                console.error("Failed to load analytics", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    const pageVariants = {
        initial: { opacity: 0, y: 15 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
        exit: { opacity: 0, scale: 0.98, transition: { duration: 0.3 } }
    };

    if (loading) {
        return (
            <div className="app-layout">
                <Sidebar />
                <main className="main-content flex-center">
                    <div className="loader"></div>
                </main>
            </div>
        );
    }

    return (
        <motion.div className="app-layout" variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1 className="page-title">Analytics</h1>
                    <p className="page-subtitle">Track your knowledge base usage and activity</p>
                </div>

                {/* ── Stats Grid ── */}
                <div className="dashboard-stats" style={{ marginBottom: '2rem' }}>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}>
                            <HiOutlineCollection size={24} />
                        </div>
                        <div className="stat-info">
                            <h3>{stats?.total_documents || 0}</h3>
                            <p>Total Documents</p>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24' }}>
                            <HiOutlineDocumentText size={24} />
                        </div>
                        <div className="stat-info">
                            <h3>{stats?.total_pages || 0}</h3>
                            <p>Total Pages Indexed</p>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}>
                            <HiOutlineChatAlt2 size={24} />
                        </div>
                        <div className="stat-info">
                            <h3>{stats?.total_queries || 0}</h3>
                            <p>Total Queries</p>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa' }}>
                            <HiOutlineLightningBolt size={24} />
                        </div>
                        <div className="stat-info">
                            <h3>{stats?.total_chat_sessions || 0}</h3>
                            <p>Chat Sessions</p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                    {/* ── Activity Chart Concept ── */}
                    <div className="profile-card" style={{ height: 'fit-content' }}>
                        <h3 className="profile-card-title">
                            <HiOutlineChartBar size={20} />
                            Activity Over Time
                        </h3>
                        <div style={{ height: 250, display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '1rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            {activity.chart_data.map((day, i) => {
                                const maxVal = Math.max(...activity.chart_data.map(d => Math.max(d.queries, d.uploads, 1)));
                                const queryHeight = (day.queries / maxVal) * 100;
                                const uploadHeight = (day.uploads / maxVal) * 100;

                                return (
                                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%' }}>
                                        <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '4px' }}>
                                            {/* Query Bar */}
                                            <div style={{ width: '40%', height: `${queryHeight}%`, background: '#3b82f6', borderRadius: '4px 4px 0 0', minHeight: day.queries > 0 ? '4px' : '0' }} title={`${day.queries} queries`} />
                                            {/* Upload Bar */}
                                            <div style={{ width: '40%', height: `${uploadHeight}%`, background: '#10b981', borderRadius: '4px 4px 0 0', minHeight: day.uploads > 0 ? '4px' : '0' }} title={`${day.uploads} uploads`} />
                                        </div>
                                        <span style={{ fontSize: '10px', color: '#64748b' }}>
                                            {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '12px', color: '#94a3b8', justifyContent: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 10, height: 10, background: '#3b82f6', borderRadius: 2 }}></div> Queries</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 10, height: 10, background: '#10b981', borderRadius: 2 }}></div> Uploads</span>
                        </div>
                    </div>

                    {/* ── Recent Activity Feed ── */}
                    <div className="profile-card">
                        <h3 className="profile-card-title">
                            <HiOutlineClock size={20} />
                            Recent Activity Feed
                        </h3>
                        {activity.recent_activity.length === 0 ? (
                            <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>No recent activity.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {activity.recent_activity.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                        <div style={{
                                            padding: '8px',
                                            borderRadius: '8px',
                                            background: item.type === 'upload' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                            color: item.type === 'upload' ? '#10b981' : '#3b82f6'
                                        }}>
                                            {item.type === 'upload' ? <HiOutlineCloudUpload size={18} /> : <HiOutlineChatAlt2 size={18} />}
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.9rem', color: '#e2e8f0', margin: '0 0 2px 0' }}>{item.title}</p>
                                            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                                                {new Date(item.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </motion.div>
    );
}

export default AnalyticsPage;
