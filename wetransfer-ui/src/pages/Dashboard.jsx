import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, DownloadCloud, File, Trash2, Edit2, X, Save, Filter, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { listTransfers, deleteTransfer, updateTransfer } from '../services/api';
import { formatDistanceToNow, isAfter } from 'date-fns';
import { formatInGMT, toGMTDateTimeLocal, fromGMTDateTimeLocal, getFutureGMTDateTimeLocal } from '../utils/dateUtils';
import ConfirmModal from '../components/ConfirmModal';

const Dashboard = () => {
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ max_downloads: 0, expires_at: '' });

    // Filters & Pagination
    const [filters, setFilters] = useState({
        status: '',
        sortBy: '',
        order: 'desc'
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0
    });

    // Modal state
    const [modal, setModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        isDestructive: false,
        confirmText: 'Confirm'
    });

    const openModal = (title, message, onConfirm, isDestructive = false, confirmText = 'Confirm') => {
        setModal({ isOpen: true, title, message, onConfirm, isDestructive, confirmText });
    };

    const closeModal = () => {
        setModal({ ...modal, isOpen: false });
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const offset = (pagination.page - 1) * pagination.limit;
            const res = await listTransfers(
                pagination.limit,
                offset,
                filters.status,
                filters.sortBy,
                filters.order
            );
            const { items, total_count } = res.data;
            setTransfers(items || []);
            setPagination(prev => ({ ...prev, total: total_count || 0 }));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [pagination.page, filters, pagination.limit]);

    // Handlers
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1
    };

    const handleSortToggle = (field) => {
        if (filters.sortBy === field) {
            handleFilterChange('order', filters.order === 'asc' ? 'desc' : 'asc');
        } else {
            setFilters(prev => ({ ...prev, sortBy: field, order: 'desc' }));
            setPagination(prev => ({ ...prev, page: 1 }));
        }
    };

    const handleDelete = (e, id) => {
        e.preventDefault();
        openModal(
            "Delete Transfer",
            "Are you sure you want to delete this transfer? This action cannot be undone.",
            async () => {
                try {
                    await deleteTransfer(id);
                    // Refresh data
                    fetchData();
                    closeModal();
                } catch (err) {
                    alert("Failed to delete transfer");
                }
            },
            true,
            "Delete"
        );
    };

    const startEdit = (e, t) => {
        e.preventDefault();
        setEditingId(t.id);
        const localDate = toGMTDateTimeLocal(t.expires_at);
        setEditForm({ max_downloads: t.max_downloads, expires_at: localDate });
    };

    const cancelEdit = (e) => {
        e.preventDefault();
        setEditingId(null);
    };

    const saveEdit = async (e, id) => {
        e.preventDefault();
        try {
            const updates = { max_downloads: parseInt(editForm.max_downloads) };
            if (editForm.expires_at) {
                updates.expires_at = fromGMTDateTimeLocal(editForm.expires_at);
            }
            await updateTransfer(id, updates);
            setEditingId(null);
            fetchData();
        } catch (err) {
            alert("Failed to update transfer");
        }
    };

    const updateTransferStatus = (e, id, status) => {
        e.preventDefault();
        openModal(
            status === 'EXPIRED' ? "Expire Transfer" : "Update Status",
            `Are you sure you want to mark this transfer as ${status}?`,
            async () => {
                try {
                    await updateTransfer(id, { status: status });
                    setEditingId(null);
                    fetchData();
                    closeModal();
                } catch (err) {
                    alert("Failed to update status");
                }
            },
            status === 'EXPIRED',
            status === 'EXPIRED' ? 'Expire' : 'Update'
        );
    };

    const reviveTransfer = (e, id) => {
        e.preventDefault();

        let targetDate = new Date();
        let usingCustomDate = false;

        if (editForm.expires_at) {
            const formDate = new Date(editForm.expires_at);
            if (isAfter(formDate, new Date())) {
                targetDate = formDate;
                usingCustomDate = true;
            }
        }

        if (!usingCustomDate) {
            targetDate.setDate(targetDate.getDate() + 7);
        }

        const dateStr = formatInGMT(targetDate, 'PPP');
        const message = usingCustomDate
            ? `Revive this transfer until ${dateStr}?`
            : `Revive this transfer? This will extend expiry by 7 days to ${dateStr}.`;

        openModal(
            "Revive Transfer",
            message,
            async () => {
                try {
                    const updates = {
                        expires_at: targetDate.toISOString(),
                        max_downloads: parseInt(editForm.max_downloads),
                        status: 'READY'
                    };

                    await updateTransfer(id, updates);
                    setEditingId(null);
                    fetchData();
                    closeModal();
                } catch (err) {
                    console.error("Revive failed", err);
                    alert("Failed to revive transfer. Ensure the date is in the future.");
                    closeModal();
                }
            },
            false,
            "Revive"
        );
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'READY': return 'var(--color-success)';
            case 'EXPIRED': return 'var(--color-text-secondary)';
            case 'DELETED': return 'var(--color-error)';
            case 'INIT': return 'var(--color-primary)';
            default: return 'var(--color-text-secondary)';
        }
    };

    const totalPages = Math.ceil(pagination.total / pagination.limit);

    return (
        <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}>
            <ConfirmModal
                isOpen={modal.isOpen}
                title={modal.title}
                message={modal.message}
                onConfirm={modal.onConfirm}
                onCancel={closeModal}
                isDestructive={modal.isDestructive}
                confirmText={modal.confirmText}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>Your Transfers</h1>
                <Link to="/" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '14px' }}>
                    New Transfer
                </Link>
            </div>

            {/* Filters */}
            <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '24px',
                padding: '16px',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-sm)',
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-main)' }}>
                    <Filter size={16} />
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>Filter:</span>
                </div>
                <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '14px', background: 'var(--input-bg)', color: 'var(--color-text-main)' }}
                >
                    <option value="">All Status</option>
                    <option value="READY">Ready</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="DELETED">Deleted</option>
                    <option value="INIT">Initializing</option>
                </select>

                <div style={{ width: '1px', height: '24px', background: 'var(--color-border)', margin: '0 8px' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)' }}>
                    <ArrowUpDown size={16} />
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>Sort:</span>
                </div>
                <button
                    onClick={() => handleSortToggle('created_at')}
                    style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: filters.sortBy === 'created_at' || filters.sortBy === '' ? 'var(--color-border)' : 'transparent',
                        fontSize: '13px',
                        fontWeight: 500
                    }}
                >
                    Date
                </button>
                <button
                    onClick={() => handleSortToggle('expires_at')}
                    style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: filters.sortBy === 'expires_at' ? '#e2e8f0' : 'transparent',
                        fontSize: '13px',
                        fontWeight: 500
                    }}
                >
                    Expiry
                </button>
                <button
                    onClick={() => handleSortToggle('file_size')}
                    style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: filters.sortBy === 'file_size' ? '#e2e8f0' : 'transparent',
                        fontSize: '13px',
                        fontWeight: 500
                    }}
                >
                    Size
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {transfers.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)' }}>
                            <p style={{ color: 'var(--color-text-secondary)' }}>No transfers found.</p>
                        </div>
                    )}
                    {transfers.map((t, i) => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            <Link
                                to={`/transfers/${t.id}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '20px',
                                    background: 'var(--color-surface)',
                                    borderRadius: 'var(--radius-lg)',
                                    boxShadow: 'var(--shadow-sm)',
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    border: '1px solid transparent',
                                    transition: 'var(--transition)',
                                    position: 'relative'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                                    e.currentTarget.style.borderColor = 'transparent';
                                }}
                            >
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    background: '#f0f4ff',
                                    color: 'var(--color-primary)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: '16px'
                                }}>
                                    <File size={20} />
                                </div>

                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                                        {t.filename || 'Uploading...'}
                                    </h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={14} />
                                            {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                                        </span>
                                        {t.file_size && <span>{(t.file_size / (1024 * 1024)).toFixed(2)} MB</span>}
                                        <span style={{ fontSize: '12px', color: t.status === 'EXPIRED' ? 'var(--color-error)' : 'var(--color-text-secondary)' }}>
                                            Expires: {formatInGMT(t.expires_at, 'PPP')} (GMT)
                                        </span>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    {editingId === t.id ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.preventDefault()}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <input
                                                    type="number"
                                                    value={editForm.max_downloads}
                                                    onChange={(e) => setEditForm({ ...editForm, max_downloads: e.target.value })}
                                                    style={{ width: '60px', padding: '4px', margin: 0, fontSize: '12px' }}
                                                    title="Max Downloads"
                                                />
                                                <input
                                                    type="datetime-local"
                                                    value={editForm.expires_at}
                                                    onChange={(e) => setEditForm({ ...editForm, expires_at: e.target.value })}
                                                    style={{ width: '130px', padding: '4px', margin: 0, fontSize: '10px' }}
                                                    title="Expires At"
                                                />
                                            </div>

                                            {t.status === 'EXPIRED' ? (
                                                <button
                                                    onClick={(e) => reviveTransfer(e, t.id)}
                                                    style={{ padding: '4px 8px', fontSize: '10px', color: 'white', background: 'var(--color-success)', borderRadius: '4px' }}
                                                    title="Revive/Save"
                                                >
                                                    Revive
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => updateTransferStatus(e, t.id, 'EXPIRED')}
                                                    style={{ padding: '4px 8px', fontSize: '10px', color: 'white', background: 'var(--color-text-secondary)', borderRadius: '4px' }}
                                                    title="Expire Now"
                                                >
                                                    Expire
                                                </button>
                                            )}

                                            <button onClick={(e) => saveEdit(e, t.id)} style={{ padding: '4px', color: 'var(--color-success)', background: 'none' }} title="Save Changes"><Save size={16} /></button>
                                            <button onClick={cancelEdit} style={{ padding: '4px', color: 'var(--color-text-secondary)', background: 'none' }} title="Cancel"><X size={16} /></button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                            <span style={{
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                color: getStatusColor(t.status),
                                                background: t.status === 'READY' ? '#f0fff4' : (t.status === 'DELETED' ? '#fff5f5' : '#f7fafc'),
                                                padding: '4px 8px',
                                                borderRadius: '4px'
                                            }}>
                                                {t.status}
                                            </span>
                                            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <DownloadCloud size={14} />
                                                {t.download_count} / {t.max_downloads}
                                            </span>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '8px', paddingLeft: '12px', borderLeft: '1px solid #edf2f7' }} onClick={e => e.preventDefault()}>
                                        <button
                                            onClick={(e) => startEdit(e, t)}
                                            style={{ padding: '6px', borderRadius: '4px', color: 'var(--color-text-secondary)', background: 'transparent' }}
                                            title="Edit Limits"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(e, t.id)}
                                            style={{ padding: '6px', borderRadius: '4px', color: 'var(--color-error)', background: 'transparent' }}
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}

                    {/* Pagination */}
                    {pagination.total > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                disabled={pagination.page === 1}
                                style={{ padding: '8px', borderRadius: '50%', background: 'white', border: '1px solid #e2e8f0', cursor: pagination.page === 1 ? 'not-allowed' : 'pointer', opacity: pagination.page === 1 ? 0.5 : 1 }}
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                                Page {pagination.page} of {totalPages || 1}
                            </span>
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                disabled={pagination.page >= totalPages}
                                style={{ padding: '8px', borderRadius: '50%', background: 'white', border: '1px solid #e2e8f0', cursor: pagination.page >= totalPages ? 'not-allowed' : 'pointer', opacity: pagination.page >= totalPages ? 0.5 : 1 }}
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
