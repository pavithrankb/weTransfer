import React, { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Moon, Sun, Info, Cloud, LayoutGrid, X, Pencil, Trash2, ArrowUpRight, RotateCw, Loader, FileText, Download, Calendar, HardDrive, Filter, ArrowUpDown, ChevronDown, Timer, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from './ConfirmModal';
import { listTransfers, deleteTransfer, updateTransfer } from '../services/api';
import { format, formatDistanceToNow } from 'date-fns';

const Layout = ({ children }) => {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [showTransfers, setShowTransfers] = useState(false);

    // Transfers state
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ max_downloads: 0, expires_at: '' });

    // Filter and Sort state
    const [statusFilter, setStatusFilter] = useState('');
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('DESC');

    // Delete confirmation
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, filename: '' });

    // Expire confirmation
    const [expireModal, setExpireModal] = useState({ isOpen: false, id: null, filename: '' });

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
            const res = await listTransfers(50, 0, statusFilter, sortBy, sortOrder);
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
    }, [showTransfers, statusFilter, sortBy, sortOrder]);

    const handleDelete = async (id) => {
        try {
            await deleteTransfer(id);
            setDeleteModal({ isOpen: false, id: null, filename: '' });
            fetchTransfers();
        } catch (err) {
            alert('Failed to delete transfer');
        }
    };

    const handleExpire = async (id) => {
        try {
            await updateTransfer(id, { status: 'EXPIRED' });
            setExpireModal({ isOpen: false, id: null, filename: '' });
            fetchTransfers();
        } catch (err) {
            alert('Failed to expire transfer');
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

    const getStatusStyle = (status) => {
        switch (status) {
            case 'READY': return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' };
            case 'EXPIRED': return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' };
            case 'DELETED': return { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280' };
            case 'INIT': return { bg: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' };
            default: return { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280' };
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '—';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-background)', color: 'var(--color-text-main)' }}>

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                title="Delete Transfer"
                message={`Are you sure you want to delete "${deleteModal.filename || 'this transfer'}"? This action cannot be undone.`}
                onConfirm={() => handleDelete(deleteModal.id)}
                onCancel={() => setDeleteModal({ isOpen: false, id: null, filename: '' })}
                isDestructive={true}
                confirmText="Delete"
            />

            <ConfirmModal
                isOpen={expireModal.isOpen}
                title="Expire Transfer"
                message={`Are you sure you want to expire "${expireModal.filename || 'this transfer'}"? The file will no longer be downloadable until revived.`}
                onConfirm={() => handleExpire(expireModal.id)}
                onCancel={() => setExpireModal({ isOpen: false, id: null, filename: '' })}
                isDestructive={true}
                confirmText="Expire Now"
            />

            {/* Header */}
            <header style={{
                padding: '14px 28px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--color-surface)',
                borderBottom: '1px solid var(--color-border)',
                zIndex: 20
            }}>
                <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-text-main)' }}>
                    <div style={{
                        width: '38px',
                        height: '38px',
                        background: 'linear-gradient(135deg, var(--color-primary), #a855f7)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                    }}>
                        <Cloud size={20} />
                    </div>
                    <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.5px' }}>WeTransfer</span>
                </Link>

                <nav style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

                    {/* Transfers List Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowTransfers(true)}
                        style={{
                            background: 'linear-gradient(135deg, var(--color-primary), #a855f7)',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '10px 18px',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            cursor: 'pointer', color: 'white',
                            fontWeight: 600, fontSize: '14px',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
                        }}
                    >
                        <LayoutGrid size={18} />
                        Dashboard
                    </motion.button>

                    <Link
                        to="/about"
                        style={{
                            background: 'var(--input-bg)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '12px', width: '42px', height: '42px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: 'var(--color-text-main)',
                            textDecoration: 'none'
                        }}
                        title="System Architecture & About"
                    >
                        <Info size={18} />
                    </Link>

                    <button
                        onClick={toggleTheme}
                        style={{
                            background: 'var(--input-bg)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '12px', width: '42px', height: '42px',
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
                                position: 'fixed', inset: 0,
                                background: 'rgba(0,0,0,0.5)',
                                zIndex: 100,
                                backdropFilter: 'blur(4px)'
                            }}
                        />

                        {/* Panel - Now Much Wider */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            style={{
                                position: 'fixed', top: 0, right: 0, bottom: 0,
                                width: '800px', maxWidth: '95vw',
                                background: 'var(--color-background)',
                                boxShadow: '-8px 0 30px rgba(0,0,0,0.2)',
                                zIndex: 101,
                                display: 'flex', flexDirection: 'column',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Panel Header */}
                            <div style={{
                                padding: '24px 32px',
                                background: 'var(--color-surface)',
                                borderBottom: '1px solid var(--color-border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '4px' }}>
                                        Transfers Dashboard
                                    </h2>
                                    <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                                        Manage all your file transfers
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={fetchTransfers}
                                        style={{
                                            padding: '10px 16px',
                                            borderRadius: '10px',
                                            background: 'var(--color-primary-light)',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: 'var(--color-primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontWeight: 600,
                                            fontSize: '13px'
                                        }}
                                    >
                                        <RotateCw size={16} className={loading ? 'spin' : ''} />
                                        Refresh
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setShowTransfers(false)}
                                        style={{
                                            padding: '10px',
                                            borderRadius: '10px',
                                            background: 'var(--input-bg)',
                                            border: '1px solid var(--color-border)',
                                            cursor: 'pointer',
                                            color: 'var(--color-text-main)'
                                        }}
                                    >
                                        <X size={20} />
                                    </motion.button>
                                </div>
                            </div>

                            {/* Stats & Filter Bar */}
                            <div style={{
                                padding: '16px 32px',
                                background: 'var(--color-surface)',
                                borderBottom: '1px solid var(--color-border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '16px'
                            }}>
                                {/* Stats */}
                                <div style={{ display: 'flex', gap: '20px' }}>
                                    {[
                                        { label: 'Total', value: transfers.length, color: 'var(--color-primary)' },
                                        { label: 'Ready', value: transfers.filter(t => t.status === 'READY').length, color: '#22c55e' },
                                        { label: 'Expired', value: transfers.filter(t => t.status === 'EXPIRED').length, color: '#ef4444' },
                                    ].map((stat, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: stat.color }} />
                                            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{stat.label}:</span>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-main)' }}>{stat.value}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Filter & Sort Controls */}
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {/* Status Filter */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--input-bg)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0 12px', height: '36px' }}>
                                        <Filter size={14} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            style={{
                                                padding: '0',
                                                border: 'none',
                                                background: 'transparent',
                                                color: 'var(--color-text-main)',
                                                fontSize: '13px',
                                                fontWeight: 500,
                                                cursor: 'pointer',
                                                outline: 'none',
                                                minWidth: '90px',
                                                height: '34px',
                                                lineHeight: '34px'
                                            }}
                                        >
                                            <option value="">All Status</option>
                                            <option value="READY">Ready</option>
                                            <option value="EXPIRED">Expired</option>
                                            <option value="INIT">Pending</option>
                                            <option value="DELETED">Deleted</option>
                                        </select>
                                    </div>

                                    {/* Sort By */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--input-bg)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0 12px', height: '36px' }}>
                                        <ArrowUpDown size={14} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            style={{
                                                padding: '0',
                                                border: 'none',
                                                background: 'transparent',
                                                color: 'var(--color-text-main)',
                                                fontSize: '13px',
                                                fontWeight: 500,
                                                cursor: 'pointer',
                                                outline: 'none',
                                                minWidth: '70px',
                                                height: '34px',
                                                lineHeight: '34px'
                                            }}
                                        >
                                            <option value="created_at">Created</option>
                                            <option value="expires_at">Expiry</option>
                                            <option value="file_size">Size</option>
                                            <option value="status">Status</option>
                                        </select>
                                    </div>

                                    {/* Sort Order Toggle */}
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC')}
                                        style={{
                                            height: '36px',
                                            padding: '0 14px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--color-border)',
                                            background: 'var(--input-bg)',
                                            color: 'var(--color-text-main)',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px',
                                            minWidth: '70px'
                                        }}
                                        title={sortOrder === 'DESC' ? 'Descending' : 'Ascending'}
                                    >
                                        {sortOrder === 'DESC' ? '↓ Desc' : '↑ Asc'}
                                    </motion.button>
                                </div>
                            </div>

                            {/* Panel Body */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                                {loading ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
                                        <Loader className="spin" size={40} style={{ color: 'var(--color-primary)', marginBottom: '16px' }} />
                                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Loading transfers...</span>
                                    </div>
                                ) : transfers.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-secondary)' }}>
                                        <FileText size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                                        <p style={{ fontSize: '15px' }}>No transfers found</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gap: '16px' }}>
                                        {transfers.map((t, index) => (
                                            <motion.div
                                                key={t.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.03 }}
                                                style={{
                                                    padding: '20px',
                                                    background: 'var(--color-surface)',
                                                    borderRadius: '16px',
                                                    border: '1px solid var(--color-border)',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                                                }}
                                            >
                                                {editingId === t.id ? (
                                                    // Edit Mode
                                                    <div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                                            <div>
                                                                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>Expires At</label>
                                                                <input
                                                                    type="datetime-local"
                                                                    value={editForm.expires_at}
                                                                    onChange={(e) => setEditForm(prev => ({ ...prev, expires_at: e.target.value }))}
                                                                    style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--input-bg)', color: 'var(--color-text-main)', width: '100%', fontSize: '13px' }}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>Max Downloads</label>
                                                                <input
                                                                    type="number"
                                                                    value={editForm.max_downloads}
                                                                    onChange={(e) => setEditForm(prev => ({ ...prev, max_downloads: e.target.value }))}
                                                                    min="1"
                                                                    style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--input-bg)', color: 'var(--color-text-main)', width: '100%', fontSize: '13px' }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '10px' }}>
                                                            <motion.button
                                                                whileHover={{ scale: 1.02 }}
                                                                whileTap={{ scale: 0.98 }}
                                                                onClick={() => saveEdit(t.id)}
                                                                style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'var(--color-success)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                                                            >
                                                                Save Changes
                                                            </motion.button>
                                                            <motion.button
                                                                whileHover={{ scale: 1.02 }}
                                                                whileTap={{ scale: 0.98 }}
                                                                onClick={() => setEditingId(null)}
                                                                style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-main)', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                                                            >
                                                                Cancel
                                                            </motion.button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // View Mode - Modern Card Layout
                                                    <>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, overflow: 'hidden' }}>
                                                                <div style={{
                                                                    width: '46px',
                                                                    height: '46px',
                                                                    background: 'var(--color-primary-light)',
                                                                    borderRadius: '12px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    color: 'var(--color-primary)',
                                                                    flexShrink: 0
                                                                }}>
                                                                    <FileText size={22} />
                                                                </div>
                                                                <div style={{ overflow: 'hidden' }}>
                                                                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                        {t.filename || 'Untitled File'}
                                                                    </div>
                                                                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                                                                        {t.created_at ? formatDistanceToNow(new Date(t.created_at), { addSuffix: true }) : '—'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <span style={{
                                                                fontSize: '12px',
                                                                fontWeight: 700,
                                                                padding: '6px 12px',
                                                                borderRadius: '8px',
                                                                background: getStatusStyle(t.status).bg,
                                                                color: getStatusStyle(t.status).color,
                                                                flexShrink: 0
                                                            }}>
                                                                {t.status}
                                                            </span>
                                                        </div>

                                                        {/* Info Grid */}
                                                        <div style={{
                                                            display: 'grid',
                                                            gridTemplateColumns: 'repeat(3, 1fr)',
                                                            gap: '12px',
                                                            marginBottom: '16px',
                                                            padding: '14px',
                                                            background: 'var(--input-bg)',
                                                            borderRadius: '12px'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <Download size={14} style={{ color: 'var(--color-primary)' }} />
                                                                <div>
                                                                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Downloads</div>
                                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)' }}>{t.download_count} / {t.max_downloads}</div>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <Calendar size={14} style={{ color: 'var(--color-primary)' }} />
                                                                <div>
                                                                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Expires</div>
                                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)' }}>{t.expires_at ? format(new Date(t.expires_at), 'MMM d, p') : '—'}</div>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <HardDrive size={14} style={{ color: 'var(--color-primary)' }} />
                                                                <div>
                                                                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Size</div>
                                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)' }}>{formatFileSize(t.file_size)}</div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Action Buttons */}
                                                        <div style={{ display: 'flex', gap: '10px' }}>
                                                            <Link
                                                                to={`/transfers/${t.id}`}
                                                                onClick={() => setShowTransfers(false)}
                                                                style={{
                                                                    flex: 1,
                                                                    padding: '10px',
                                                                    borderRadius: '10px',
                                                                    background: 'var(--color-primary)',
                                                                    color: 'white',
                                                                    textAlign: 'center',
                                                                    fontWeight: 600,
                                                                    fontSize: '13px',
                                                                    textDecoration: 'none',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    gap: '6px'
                                                                }}
                                                            >
                                                                <ArrowUpRight size={16} /> Open
                                                            </Link>
                                                            <motion.button
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => startEdit(t)}
                                                                style={{
                                                                    padding: '10px 14px',
                                                                    borderRadius: '10px',
                                                                    background: 'var(--input-bg)',
                                                                    border: '1px solid var(--color-border)',
                                                                    color: 'var(--color-text-main)',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px',
                                                                    fontSize: '13px',
                                                                    fontWeight: 600
                                                                }}
                                                            >
                                                                <Pencil size={14} /> Edit
                                                            </motion.button>
                                                            <motion.button
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => setDeleteModal({ isOpen: true, id: t.id, filename: t.filename })}
                                                                style={{
                                                                    padding: '10px 14px',
                                                                    borderRadius: '10px',
                                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                                    border: 'none',
                                                                    color: '#ef4444',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px',
                                                                    fontSize: '13px',
                                                                    fontWeight: 600
                                                                }}
                                                            >
                                                                <Trash2 size={14} /> Delete
                                                            </motion.button>
                                                            {/* Expire button - only for READY status */}
                                                            {t.status === 'READY' && (
                                                                <motion.button
                                                                    whileHover={{ scale: 1.05 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                    onClick={() => setExpireModal({ isOpen: true, id: t.id, filename: t.filename })}
                                                                    style={{
                                                                        padding: '10px 14px',
                                                                        borderRadius: '10px',
                                                                        background: 'rgba(251, 146, 60, 0.1)',
                                                                        border: 'none',
                                                                        color: '#f97316',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px',
                                                                        fontSize: '13px',
                                                                        fontWeight: 600
                                                                    }}
                                                                    title="Expire this transfer immediately"
                                                                >
                                                                    <Timer size={14} /> Expire
                                                                </motion.button>
                                                            )}
                                                            {/* Revive button - only for EXPIRED status */}
                                                            {t.status === 'EXPIRED' && (
                                                                <Link
                                                                    to={`/transfers/${t.id}`}
                                                                    onClick={() => setShowTransfers(false)}
                                                                    style={{
                                                                        padding: '10px 14px',
                                                                        borderRadius: '10px',
                                                                        background: 'rgba(34, 197, 94, 0.1)',
                                                                        border: 'none',
                                                                        color: '#22c55e',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px',
                                                                        fontSize: '13px',
                                                                        fontWeight: 600,
                                                                        textDecoration: 'none'
                                                                    }}
                                                                    title="Revive this transfer by setting a new expiry date"
                                                                >
                                                                    <RefreshCcw size={14} /> Revive
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </motion.div>
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
