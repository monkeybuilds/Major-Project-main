import { useState, useEffect } from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import { toast } from 'react-hot-toast';
import {
    HiOutlineUser,
    HiOutlineMail,
    HiOutlineLockClosed,
    HiOutlineDocumentText,
    HiOutlineChatAlt2,
    HiOutlineCalendar,
    HiOutlinePencil,
    HiOutlineCheck,
    HiOutlineX,
    HiOutlineChip,
} from 'react-icons/hi';
import Sidebar from '../components/Sidebar';
import api from '../api';
import { motion } from 'framer-motion';

function ProfilePage() {
    const [user, setUser] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('gyan_vault_user') || '{}');
            return saved.name ? { full_name: saved.name, email: saved.email, created_at: null } : null;
        } catch { return null; }
    });
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(!user);

    // Edit name
    const [editingName, setEditingName] = useState(false);
    const [newName, setNewName] = useState('');

    // Change password
    const [showPassword, setShowPassword] = useState(false);
    const [passwords, setPasswords] = useState({
        current_password: '',
        new_password: '',
        confirm_password: '',
    });
    const [savingName, setSavingName] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    // Model Preference
    const [preferredModel, setPreferredModel] = useState(() => {
        return localStorage.getItem('gyan_vault_model') || 'gemini';
    });

    const [error, setError] = useState(null);

    useEffect(() => {
        fetchProfile();
        fetchStats();
    }, []);

    const fetchProfile = async () => {
        // Only show full page loader if we have no user data
        if (!user) setLoading(true);
        setError(null);
        try {
            const res = await api.get('/auth/profile');
            setUser(res.data);
            setNewName(res.data.full_name);
            // Update local storage to keep it fresh
            localStorage.setItem('gyan_vault_user', JSON.stringify({
                name: res.data.full_name,
                email: res.data.email,
            }));
        } catch (err) {
            console.error(err);
            // Only show error UI if we have absolutely no data to show
            if (!user) {
                setError('Failed to load profile. Please check your connection.');
            } else {
                toast.error('Could not refresh profile details');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await api.get('/analytics/stats');
            setStats(res.data);
        } catch { /* silently fail */ }
    };

    const handleUpdateName = async () => {
        if (!newName.trim()) return;
        setSavingName(true);
        try {
            const res = await api.put('/auth/profile', { full_name: newName.trim() });
            setUser({ ...user, full_name: res.data.full_name });
            localStorage.setItem('gyan_vault_user', JSON.stringify({
                name: res.data.full_name,
                email: user.email,
            }));
            setEditingName(false);
            toast.success('Name updated!');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to update name');
        } finally {
            setSavingName(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwords.new_password !== passwords.confirm_password) {
            toast.error('Passwords do not match');
            return;
        }
        if (passwords.new_password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        setSavingPassword(true);
        try {
            await api.put('/auth/change-password', {
                current_password: passwords.current_password,
                new_password: passwords.new_password,
            });
            setPasswords({ current_password: '', new_password: '', confirm_password: '' });
            setShowPassword(false);
            toast.success('Password changed successfully!');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to change password');
        } finally {
            setSavingPassword(false);
        }
    };



    const handleModelChange = (e) => {
        const model = e.target.value;
        setPreferredModel(model);
        localStorage.setItem('gyan_vault_model', model);
        toast.success(`Model switched to ${model === 'ollama' ? 'Local Ollama' : model}`);
    };

    const formatDate = (dateStr) => {
        if (!dateStr || dateStr === 'None') return '—';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '—';
            return date.toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric',
            });
        } catch {
            return '—';
        }
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
                <ErrorBoundary>
                    <div className="page-header">
                        <h1 className="page-title">Profile Settings</h1>
                        <p className="page-subtitle">Manage your account and preferences</p>
                    </div>

                    {loading ? (
                        <div className="loading-state">
                            <div className="processing-spinner"></div>
                            <p>Loading profile...</p>
                        </div>
                    ) : error ? (
                        <div className="error-state" style={{ textAlign: 'center', padding: '2rem' }}>
                            <p className="text-red-500 mb-4">{error}</p>
                            <button className="primary-btn" onClick={fetchProfile}>Retry</button>
                        </div>
                    ) : user ? (
                        <div className="profile-grid">
                            {/* Profile Card */}
                            <div className="profile-card profile-main-card">
                                <div className="profile-avatar-large">
                                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                                </div>

                                <div className="profile-info-section">
                                    {/* Name */}
                                    <div className="profile-field">
                                        <label className="profile-label">
                                            <HiOutlineUser size={16} />
                                            Full Name
                                        </label>
                                        {editingName ? (
                                            <div className="profile-edit-row">
                                                <input
                                                    type="text"
                                                    className="profile-input"
                                                    value={newName}
                                                    onChange={(e) => setNewName(e.target.value)}
                                                    autoFocus
                                                />
                                                <button className="profile-save-btn" onClick={handleUpdateName} disabled={savingName}>
                                                    <HiOutlineCheck size={16} />
                                                </button>
                                                <button className="profile-cancel-btn" onClick={() => { setEditingName(false); setNewName(user.full_name); }}>
                                                    <HiOutlineX size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="profile-value-row">
                                                <span className="profile-value">{user.full_name}</span>
                                                <button className="profile-edit-btn" onClick={() => setEditingName(true)}>
                                                    <HiOutlinePencil size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Email */}
                                    <div className="profile-field">
                                        <label className="profile-label">
                                            <HiOutlineMail size={16} />
                                            Email
                                        </label>
                                        <span className="profile-value">{user.email}</span>
                                    </div>

                                    {/* Member Since */}
                                    <div className="profile-field">
                                        <label className="profile-label">
                                            <HiOutlineCalendar size={16} />
                                            Member Since
                                        </label>
                                        <span className="profile-value">{formatDate(user.created_at)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Account Stats */}
                            {stats && (
                                <div className="profile-card">
                                    <h3 className="profile-card-title">📊 Account Stats</h3>
                                    <div className="profile-stats-grid">
                                        <div className="profile-stat">
                                            <HiOutlineDocumentText size={24} className="profile-stat-icon text-blue-400" />
                                            <div>
                                                <span className="profile-stat-value">{stats.total_documents}</span>
                                                <span className="profile-stat-label">Documents</span>
                                            </div>
                                        </div>
                                        <div className="profile-stat">
                                            <HiOutlineChatAlt2 size={24} className="profile-stat-icon text-purple-400" />
                                            <div>
                                                <span className="profile-stat-value">{stats.total_queries}</span>
                                                <span className="profile-stat-label">Queries</span>
                                            </div>
                                        </div>
                                        <div className="profile-stat">
                                            <HiOutlineDocumentText size={24} className="profile-stat-icon text-green-400" />
                                            <div>
                                                <span className="profile-stat-value">{stats.total_pages}</span>
                                                <span className="profile-stat-label">Pages Processed</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Change Password */}
                            <div className="profile-card">
                                <h3 className="profile-card-title">
                                    <HiOutlineLockClosed size={20} />
                                    Security
                                </h3>
                                {!showPassword ? (
                                    <button className="secondary-btn profile-password-btn" onClick={() => setShowPassword(true)}>
                                        Change Password
                                    </button>
                                ) : (
                                    <form className="profile-password-form" onSubmit={handleChangePassword}>
                                        <input
                                            type="password"
                                            className="profile-input"
                                            placeholder="Current Password"
                                            value={passwords.current_password}
                                            onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
                                            required
                                        />
                                        <input
                                            type="password"
                                            className="profile-input"
                                            placeholder="New Password (min 6 chars)"
                                            value={passwords.new_password}
                                            onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                                            required
                                            minLength={6}
                                        />
                                        <input
                                            type="password"
                                            className="profile-input"
                                            placeholder="Confirm New Password"
                                            value={passwords.confirm_password}
                                            onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                                            required
                                            minLength={6}
                                        />
                                        <div className="profile-password-actions">
                                            <button type="submit" className="primary-btn" disabled={savingPassword}>
                                                {savingPassword ? 'Saving...' : 'Update Password'}
                                            </button>
                                            <button type="button" className="secondary-btn" onClick={() => {
                                                setShowPassword(false);
                                                setPasswords({ current_password: '', new_password: '', confirm_password: '' });
                                            }}>
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>

                            {/* Model Settings */}
                            <div className="profile-card">
                                <h3 className="profile-card-title">
                                    <HiOutlineChip size={20} />
                                    AI Model Preference
                                </h3>
                                <div className="profile-field">
                                    <label className="profile-label">Preferred LLM Provider</label>
                                    <select
                                        className="profile-select"
                                        value="ollama"
                                        disabled
                                    >
                                        <option value="ollama">Local System (Ollama phi3 / llama3)</option>
                                    </select>
                                    <p className="profile-shortcuts-hint" style={{ marginTop: '0.5rem', color: '#10b981' }}>
                                        ✓ Running 100% Offline (Free & Private)
                                    </p>
                                </div>
                            </div>

                            {/* Keyboard Shortcuts Info */}
                            <div className="profile-card">
                                <h3 className="profile-card-title">⌨️ Keyboard Shortcuts</h3>
                                <p className="profile-shortcuts-hint">
                                    Press <kbd className="shortcut-key">?</kbd> anywhere in the app to view all keyboard shortcuts.
                                </p>
                                <div className="profile-shortcuts-preview">
                                    <span><kbd className="shortcut-key">G</kbd> then <kbd className="shortcut-key">D</kbd> → Dashboard</span>
                                    <span><kbd className="shortcut-key">G</kbd> then <kbd className="shortcut-key">A</kbd> → Ask AI</span>
                                    <span><kbd className="shortcut-key">G</kbd> then <kbd className="shortcut-key">L</kbd> → Library</span>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </ErrorBoundary>
            </main>
        </motion.div>
    );
}

export default ProfilePage;
