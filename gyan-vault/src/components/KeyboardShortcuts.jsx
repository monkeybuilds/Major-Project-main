import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function KeyboardShortcuts() {
    const [showHelp, setShowHelp] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Don't trigger if typing in an input
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            // Ctrl+/ or ? — show shortcuts
            if ((e.ctrlKey && e.key === '/') || e.key === '?') {
                e.preventDefault();
                setShowHelp(prev => !prev);
                return;
            }

            // Escape — close modal
            if (e.key === 'Escape' && showHelp) {
                setShowHelp(false);
                return;
            }

            // Navigation shortcuts (no modifier keys)
            if (e.ctrlKey || e.altKey || e.metaKey) return;

            switch (e.key.toLowerCase()) {
                case 'g':
                    if (e.shiftKey) return;
                    // Wait for second key
                    const handler = (e2) => {
                        document.removeEventListener('keydown', handler);
                        switch (e2.key.toLowerCase()) {
                            case 'd': navigate('/dashboard'); break;
                            case 'u': navigate('/upload'); break;
                            case 'l': navigate('/library'); break;
                            case 'a': navigate('/query'); break;
                            case 'p': navigate('/profile'); break;
                        }
                    };
                    document.addEventListener('keydown', handler, { once: true });
                    setTimeout(() => document.removeEventListener('keydown', handler), 1000);
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [navigate, showHelp]);

    if (!showHelp) return null;

    const shortcuts = [
        { keys: ['G', 'D'], desc: 'Go to Dashboard' },
        { keys: ['G', 'U'], desc: 'Go to Upload' },
        { keys: ['G', 'L'], desc: 'Go to Library' },
        { keys: ['G', 'A'], desc: 'Go to Ask AI' },
        { keys: ['G', 'P'], desc: 'Go to Profile' },
        { keys: ['?'], desc: 'Show this help' },
        { keys: ['Esc'], desc: 'Close this dialog' },
    ];

    return (
        <div className="shortcuts-overlay" onClick={() => setShowHelp(false)}>
            <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
                <div className="shortcuts-header">
                    <h2>⌨️ Keyboard Shortcuts</h2>
                    <button className="shortcuts-close" onClick={() => setShowHelp(false)}>✕</button>
                </div>
                <div className="shortcuts-list">
                    {shortcuts.map((s, i) => (
                        <div key={i} className="shortcut-item">
                            <span className="shortcut-desc">{s.desc}</span>
                            <div className="shortcut-keys">
                                {s.keys.map((k, j) => (
                                    <span key={j}>
                                        <kbd className="shortcut-key">{k}</kbd>
                                        {j < s.keys.length - 1 && <span className="shortcut-then">then</span>}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <p className="shortcuts-hint">Press <kbd>?</kbd> anytime to toggle this panel</p>
            </div>
        </div>
    );
}

export default KeyboardShortcuts;
