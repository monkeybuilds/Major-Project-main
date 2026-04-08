import { NavLink, useNavigate } from 'react-router-dom';
import { HiOutlineHome, HiOutlineCloudUpload, HiOutlineCollection, HiOutlineChatAlt2, HiOutlineLogout, HiOutlineUser, HiOutlineMoon, HiOutlineSun, HiOutlineTemplate, HiOutlineChartBar } from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';

function Sidebar() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('gyan_vault_user') || '{}');
    const { theme, toggleTheme } = useTheme();

    const handleLogout = () => {
        localStorage.removeItem('gyan_vault_token');
        localStorage.removeItem('gyan_vault_user');
        navigate('/');
    };

    const links = [
        { to: '/dashboard', label: 'Dashboard', icon: <HiOutlineHome size={20} /> },
        { to: '/upload', label: 'Upload', icon: <HiOutlineCloudUpload size={20} /> },
        { to: '/library', label: 'Library', icon: <HiOutlineCollection size={20} /> },
        { to: '/query', label: 'Ask AI', icon: <HiOutlineChatAlt2 size={20} /> },
        { to: '/tools', label: 'PDF Tools', icon: <HiOutlineTemplate size={20} /> },
        { to: '/analytics', label: 'Analytics', icon: <HiOutlineChartBar size={20} /> },
        { to: '/profile', label: 'Profile', icon: <HiOutlineUser size={20} /> },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h2 className="sidebar-brand">📚 Gyan Vault</h2>
                <p className="sidebar-subtitle">AI Knowledge System</p>
            </div>

            <nav className="sidebar-nav">
                {links.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    >
                        {link.icon}
                        <span>{link.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                {/* Theme Toggle */}
                <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                    {theme === 'dark' ? <HiOutlineSun size={18} /> : <HiOutlineMoon size={18} />}
                    <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>

                <div className="sidebar-user">
                    <div className="sidebar-avatar">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="sidebar-user-info">
                        <p className="sidebar-user-name">{user.name || 'User'}</p>
                        <p className="sidebar-user-email">{user.email || ''}</p>
                    </div>
                </div>
                <button className="sidebar-logout" onClick={handleLogout}>
                    <HiOutlineLogout size={18} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
