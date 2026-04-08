import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../api';
import { motion } from 'framer-motion';

function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [isForgot, setIsForgot] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const [form, setForm] = useState({
        full_name: '',
        email: '',
        password: '',
    });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLogin) {
                const res = await api.post('/auth/login', {
                    email: form.email,
                    password: form.password,
                });
                localStorage.setItem('gyan_vault_token', res.data.access_token);
                localStorage.setItem('gyan_vault_user', JSON.stringify({
                    name: res.data.user_name,
                    email: res.data.user_email,
                }));
                toast.success('Welcome back!');
                navigate('/dashboard');
            } else {
                const res = await api.post('/auth/signup', {
                    full_name: form.full_name,
                    email: form.email,
                    password: form.password,
                });
                localStorage.setItem('gyan_vault_token', res.data.access_token);
                localStorage.setItem('gyan_vault_user', JSON.stringify({
                    name: res.data.user_name,
                    email: res.data.user_email,
                }));
                toast.success('Account created successfully!');
                navigate('/dashboard');
            }
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = (e) => {
        e.preventDefault();
        toast.success('Password reset link sent! (Demo)');
        setIsForgot(false);
        setIsLogin(true);
    };

    const pageVariants = {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1, transition: { duration: 0.5, type: "spring", stiffness: 200, damping: 20 } },
        exit: { opacity: 0, scale: 0.95, transition: { duration: 0.3 } }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 relative z-10">
            <motion.div
                className="auth-card p-10 w-full max-w-md bg-surface/80 backdrop-blur-xl border border-border shadow-2xl"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
            >
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-white tracking-wide">
                        📚 Gyan Vault
                    </h1>
                    <p className="text-gray-400 text-sm mt-2">
                        AI Powered Knowledge System
                    </p>
                </div>

                {!isForgot ? (
                    <form onSubmit={handleSubmit}>
                        {!isLogin && (
                            <input
                                type="text"
                                name="full_name"
                                placeholder="Full Name"
                                className="input-field mb-4"
                                value={form.full_name}
                                onChange={handleChange}
                                required
                            />
                        )}

                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            className="input-field mb-4"
                            value={form.email}
                            onChange={handleChange}
                            required
                        />

                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            className="input-field mb-6"
                            value={form.password}
                            onChange={handleChange}
                            required
                            minLength={6}
                        />

                        <button
                            type="submit"
                            className="primary-btn mb-4"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="spinner"></span>
                                    {isLogin ? 'Logging in...' : 'Creating account...'}
                                </span>
                            ) : (
                                isLogin ? 'Login' : 'Sign Up'
                            )}
                        </button>

                        {isLogin && (
                            <p
                                className="text-right text-sm text-blue-400 cursor-pointer hover:underline mb-4"
                                onClick={() => setIsForgot(true)}
                            >
                                Forgot Password?
                            </p>
                        )}

                        <p className="text-center text-sm text-gray-400">
                            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                            <span
                                className="text-blue-400 cursor-pointer hover:underline"
                                onClick={() => {
                                    setIsLogin(!isLogin);
                                    setIsForgot(false);
                                }}
                            >
                                {isLogin ? 'Sign Up' : 'Login'}
                            </span>
                        </p>
                    </form>
                ) : (
                    <form onSubmit={handleForgotPassword}>
                        <input
                            type="email"
                            name="email"
                            placeholder="Enter your email"
                            className="input-field mb-6"
                            value={form.email}
                            onChange={handleChange}
                            required
                        />

                        <button type="submit" className="primary-btn mb-4">
                            Send Reset Link
                        </button>

                        <p
                            className="text-center text-sm text-blue-400 cursor-pointer hover:underline"
                            onClick={() => {
                                setIsForgot(false);
                                setIsLogin(true);
                            }}
                        >
                            Back to Login
                        </p>
                    </form>
                )}
            </motion.div>
        </div>
    );
}

export default AuthPage;
