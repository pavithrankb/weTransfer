import React, { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Moon, Sun, Info, Cloud, List, X, Edit2, Trash2, ExternalLink, RefreshCw, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ArchitectureModal from './ArchitectureModal';
import ConfirmModal from './ConfirmModal';
import { listTransfers, deleteTransfer, updateTransfer } from '../services/api';
import { format, formatDistanceToNow } from 'date-fns';

const Layout = ({ children }) => {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [showInfo, setShowInfo] = useState(false);
    const [showTransfers, setShowTransfers] = useState(false);

    // Transfers state
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ max_downloads: 0, expires_at: '' });

    // Delete confirmation
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, filename: '' });

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const fetchTransfers = async () => {
        setLoading(true);
        try {
            const res = await listTransfers(50, 0);
            setTransfers(res.data.items || []);
        } catch (err) {
            console.error("Failed to fetch transfers", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (showTransfers) {
            fetchTransfers();
        }
    }, [showTransfers]);

    const handleDelete = async (id) => {
        try {
            await deleteTransfer(id);
            setDeleteModal({ isOpen: false, id: null, filename: '' });
            fetchTransfers();
        } catch (err) {
            alert('Failed to delete transfer');
        }
    };

    const startEdit = (t) => {
        setEditingId(t.id);
        setEditForm({
            max_downloads: t.max_downloads,
            expires_at: new Date(t.expires_at).toISOString().slice(0, 16)
        });
    };

    const saveEdit = async (id) => {
        try {
            const updates = { max_downloads: parseInt(editForm.max_downloads) };
            if (editForm.expires_at) {
                updates.expires_at = new Date(editForm.expires_at).toISOString();
            }
            await updateTransfer(id, updates);
            setEditingId(null);
            fetchTransfers();
        } catch (err) {
            alert('Failed to update transfer');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'READY': return 'var(--color-success)';
            case 'EXPIRED': return 'var(--color-error)';
            case 'DELETED': return '#6b7280';
            case 'INIT': return 'var(--color-primary)';
            default: return 'var(--color-text-secondary)';
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-background)', color: 'var(--color-text-main)' }}>

            <ArchitectureModal isOpen={showInfo} onClose={() => setShowInfo(false)} />

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                title="Delete Transfer"
                message={`Are you sure you want to delete "${deleteModal.filename || 'this transfer'}"? This action cannot be undone.`}
                onConfirm={() => handleDelete(deleteModal.id)}
                onCancel={() => setDeleteModal({ isOpen: false, id: null, filename: '' })}
                isDestructive={true}
                confirmText="Delete"
            />

            {/* Header */}
            <header style={{
                padding: '16px 32px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--color-surface)',
                borderBottom: '1px solid var(--color-border)',
                zIndex: 20
            }}>
                <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-text-main)' }}>
                    <div style={{ width: '36px', height: '36px', background: 'var(--color-primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <Cloud size={20} fill="currentColor" />
                    </div>
                    <span style={{ fontSize: '18px', fontWeight: 700 }}>WeTransfer</span>
                </Link>

                <nav style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

                    {/* Transfers List Button */}
                    <button
                        onClick={() => setShowTransfers(true)}
                        style={{
                            background: 'var(--color-primary)',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '8px 16px',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            cursor: 'pointer', color: 'white',
                            fontWeight: 600, fontSize: '14px'
                        }}
                        title="View Transfers"
                    >
                        <List size={18} />
                        Transfers
                    </button>

                    <button
                        onClick={() => setShowInfo(true)}
                        style={{
                            background: 'var(--input-bg)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '50%', width: '40px', height: '40px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: 'var(--color-text-main)'
                        }}
                        title="System Architecture"
                    >
                        <Info size={18} />
                    </button>

                    <button
                        onClick={toggleTheme}
                        style={{
                            background: 'var(--input-bg)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '50%', width: '40px', height: '40px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: 'var(--color-text-main)'
                        }}
                        title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                    >
                        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                    </button>
                </nav>
            </header>

            {/* Transfers Slide-over Panel */}
            <AnimatePresence>
                {showTransfers && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowTransfers(false)}
                            style={{
                                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                                zIndex: 100, backdropFilter: 'blur(2px)'
                            }}
                        />

                        {/* Panel */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            style={{
                                position: 'fixed', top: 0, right: 0, bottom: 0,
                                width: '480px', maxWidth: '100vw',
                                background: 'var(--color-surface)',
                                boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
                                zIndex: 101,
                                display: 'flex', flexDirection: 'column',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Panel Header */}
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-main)' }}>All Transfers</h2>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={fetchTransfers}
                                        style={{ padding: '8px', borderRadius: '8px', background: 'var(--input-bg)', border: '1px solid var(--color-border)', cursor: 'pointer', color: 'var(--color-text-main)' }}
                                        title="Refresh"
                                    >
                                        <RefreshCw size={16} className={loading ? 'spin' : ''} />
                                    </button>
                                    <button
                                        onClick={() => setShowTransfers(false)}
                                        style={{ padding: '8px', borderRadius: '8px', background: 'var(--input-bg)', border: '1px solid var(--color-border)', cursor: 'pointer', color: 'var(--color-text-main)' }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Panel Body */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                                {loading ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                                        <Loader className="spin" size={32} style={{ color: 'var(--color-primary)' }} />
                                    </div>
                                ) : transfers.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
                                        No transfers found
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {transfers.map(t => (
                                            <div key={t.id} style={{
                                                padding: '16px',
                                                background: 'var(--input-bg)',
                                                borderRadius: '12px',
                                                border: '1px solid var(--color-border)'
                                            }}>
                                                {editingId === t.id ? (
                                                    // Edit Mode
                                                    <div>
                                                        <div style={{ marginBottom: '12px' }}>
                                                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Expires At</label>
                                                            <input
                                                                type="datetime-local"
                                                                value={editForm.expires_at}
                                                                onChange={(e) => setEditForm(prev => ({ ...prev, expires_at: e.target.value }))}
                                                                style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', width: '100%', marginBottom: '8px' }}
                                                            />
                                                        </div>
                                                        <div style={{ marginBottom: '12px' }}>
                                                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Max Downloads</label>
                                                            <input
                                                                type="number"
                                                                value={editForm.max_downloads}
                                                                onChange={(e) => setEditForm(prev => ({ ...prev, max_downloads: e.target.value }))}
                                                                min="1"
                                                                style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', width: '100%', marginBottom: 0 }}
                                                            />
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button onClick={() => saveEdit(t.id)} style={{ flex: 1, padding: '8px', borderRadius: '6px', background: 'var(--color-success)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                                                                Save
                                                            </button>
                                                            <button onClick={() => setEditingId(null)} style={{ flex: 1, padding: '8px', borderRadius: '6px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-main)', fontWeight: 600, cursor: 'pointer' }}>
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // View Mode
                                                    <>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {t.filename || 'Unnamed'}
                                                                </div>
                                                                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                                                                    {t.created_at ? formatDistanceToNow(new Date(t.created_at), { addSuffix: true }) : ''}
                                                                </div>
                                                            </div>
                                                            <span style={{
                                                                fontSize: '11px', fontWeight: 700,
                                                                padding: '3px 8px', borderRadius: '4px',
                                                                background: getStatusColor(t.status),
                                                                color: 'white'
                                                            }}>
                                                                {t.status}
                                                            </span>
                                                        </div>

                                                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
                                                            <div>Downloads: {t.download_count} / {t.max_downloads}</div>
                                                            <div>Expires: {t.expires_at ? format(new Date(t.expires_at), 'PPp') : 'N/A'}</div>
                                                            {t.file_size && <div>Size: {(t.file_size / 1024 / 1024).toFixed(2)} MB</div>}
                                                        </div>

                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <Link
                                                                to={`/transfers/${t.id}`}
                                                                onClick={() => setShowTransfers(false)}
                                                                style={{
                                                                    flex: 1, padding: '8px', borderRadius: '6px',
                                                                    background: 'var(--color-primary)', color: 'white',
                                                                    textAlign: 'center', fontWeight: 600, fontSize: '12px',
                                                                    textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                                                                }}
                                                            >
                                                                <ExternalLink size={14} /> View
                                                            </Link>
                                                            <button
                                                                onClick={() => startEdit(t)}
                                                                style={{
                                                                    padding: '8px 12px', borderRadius: '6px',
                                                                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                                                                    color: 'var(--color-text-main)', cursor: 'pointer'
                                                                }}
                                                                title="Edit"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => setDeleteModal({ isOpen: true, id: t.id, filename: t.filename })}
                                                                style={{
                                                                    padding: '8px 12px', borderRadius: '6px',
                                                                    background: 'var(--color-error)', border: 'none',
                                                                    color: 'white', cursor: 'pointer'
                                                                }}
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {children ? children : <Outlet context={{ toggleTheme }} />}
            </main>

        </div>
    );
};

export default Layout;
