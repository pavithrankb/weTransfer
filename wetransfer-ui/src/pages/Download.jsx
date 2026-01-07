import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download as DownloadIcon, File, AlertCircle, Loader2, Calendar, HardDrive, Activity, RefreshCw, Edit2, Save, X, Trash2 } from 'lucide-react';
import { getTransfer, getDownloadUrl, updateTransfer } from '../services/api';
import { isAfter } from 'date-fns';
import { formatInGMT, toGMTDateTimeLocal, fromGMTDateTimeLocal, getFutureGMTDateTimeLocal, getCurrentGMTDateTimeLocal } from '../utils/dateUtils';
import { QRCodeSVG } from 'qrcode.react';
import ConfirmModal from '../components/ConfirmModal';

const Download = () => {
    const { id } = useParams();
    const [transfer, setTransfer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expiryMinutes, setExpiryMinutes] = useState(5);
    const [downloadUrl, setDownloadUrl] = useState('');
    const [downloading, setDownloading] = useState(false);

    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ max_downloads: 0, expires_at: '' });

    // Modal State
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

    const fetchTransfer = async () => {
        try {
            const { data } = await getTransfer(id);
            setTransfer(data);
            setEditForm({
                max_downloads: data.max_downloads,
                expires_at: toGMTDateTimeLocal(data.expires_at)
            });
        } catch (err) {
            console.error(err);
            if (err.response && err.response.status === 410) {
                setError("This transfer has expired.");
            } else if (err.response && err.response.status === 404) {
                setError("Transfer not found.");
            } else {
                setError("Failed to load transfer details.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransfer();
    }, [id]);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const { data } = await getDownloadUrl(id, expiryMinutes);
            setDownloadUrl(data.download_url);
            window.open(data.download_url, '_blank');
        } catch (err) {
            console.error(err);
            setError("Failed to start download. The link might have expired.");
        } finally {
            setDownloading(false);
        }
    };

    const saveEdit = async () => {
        try {
            const updates = { max_downloads: parseInt(editForm.max_downloads) };
            if (editForm.expires_at) {
                updates.expires_at = fromGMTDateTimeLocal(editForm.expires_at);
            }
            await updateTransfer(id, updates);
            setIsEditing(false);
            fetchTransfer();
        } catch (err) {
            alert("Failed to update transfer");
        }
    };

    const handleRevive = () => {
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
                    setIsEditing(false);
                    fetchTransfer();
                    closeModal();
                } catch (err) {
                    alert("Failed to revive transfer");
                    closeModal();
                }
            },
            false,
            "Revive"
        );
    };

    const handleExpireNow = () => {
        openModal(
            "Expire Transfer",
            "Are you sure you want to expire this transfer immediately? Users will no longer be able to download it.",
            async () => {
                try {
                    await updateTransfer(id, { status: 'EXPIRED' });
                    setIsEditing(false);
                    fetchTransfer();
                    closeModal();
                } catch (err) {
                    alert("Failed to expire transfer");
                }
            },
            true, // destructive
            "Expire"
        );
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--color-primary)' }}>
                <Loader2 size={48} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (error) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card"
                style={{ textAlign: 'center', borderColor: 'var(--color-error)' }}
            >
                <div style={{ color: 'var(--color-error)', marginBottom: '16px' }}>
                    <AlertCircle size={48} />
                </div>
                <h2 style={{ marginBottom: '8px' }}>Oops!</h2>
                <p>{error}</p>
            </motion.div>
        );
    }

    // Dynamic styles based on status
    const getTheme = () => {
        switch (transfer.status) {
            case 'READY': return {
                bg: 'rgba(34, 197, 94, 0.05)',
                border: '#bbf7d0',
                text: 'var(--color-success)',
                shadow: '0 4px 6px -1px rgba(34, 197, 94, 0.1)'
            };
            case 'DELETED': return {
                bg: 'rgba(239, 68, 68, 0.05)',
                border: '#feb2b2',
                text: 'var(--color-error)',
                shadow: '0 4px 6px -1px rgba(239, 68, 68, 0.1)'
            };
            case 'EXPIRED':
            default: return {
                bg: 'var(--color-surface)',
                border: 'var(--color-border)',
                text: 'var(--color-text-secondary)',
                shadow: 'none'
            };
        }
    };

    const theme = getTheme();
    const isReady = transfer.status === 'READY';

    const cardStyle = {
        maxWidth: '600px',
        margin: '0 auto',
        // Subtle tints
        backgroundColor: theme.bg,
        border: `1px solid ${theme.border}`,
        boxShadow: theme.shadow
    };

    return (
        <div style={{ paddingBottom: '40px' }}>
            <ConfirmModal
                isOpen={modal.isOpen}
                title={modal.title}
                message={modal.message}
                onConfirm={modal.onConfirm}
                onCancel={closeModal}
                isDestructive={modal.isDestructive}
                confirmText={modal.confirmText}
            />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
                style={cardStyle}
            >
                <div style={{ marginBottom: '24px', borderBottom: isEditing ? 'none' : '1px solid rgba(0,0,0,0.05)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Transfer Details</h1>
                        <span style={{
                            fontSize: '12px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: theme.text,
                            color: 'white',
                            fontWeight: 600,
                            marginTop: '8px',
                            display: 'inline-block'
                        }}>
                            {transfer.status}
                        </span>
                    </div>

                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            style={{
                                padding: '8px',
                                borderRadius: '8px',
                                background: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-secondary)',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px'
                            }}
                        >
                            <Edit2 size={16} /> Edit
                        </button>
                    ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={saveEdit}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    background: 'var(--color-success)',
                                    color: 'white',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px'
                                }}
                            >
                                <Save size={16} /> Save
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                style={{
                                    padding: '8px',
                                    borderRadius: '8px',
                                    background: 'var(--color-surface)',
                                    border: '1px solid var(--color-border)',
                                    color: 'var(--color-text-secondary)',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                    )}
                </div>

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '24px',
                    background: 'var(--color-surface)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '24px',
                    border: '1px solid var(--color-border)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            background: 'var(--color-surface)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: '16px',
                            color: 'var(--color-primary)',
                            boxShadow: 'var(--shadow-sm)',
                            border: '1px solid var(--color-border)'
                        }}>
                            <File size={24} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{transfer.filename}</h3>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                                {(transfer.file_size / (1024 * 1024)).toFixed(2)} MB • {transfer.file_type}
                            </p>
                        </div>
                    </div>

                    <div style={{ width: '100%', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                        {isEditing ? (
                            <div style={{ display: 'grid', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Expires At (GMT)</label>
                                    <input
                                        type="datetime-local"
                                        value={editForm.expires_at}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, expires_at: e.target.value }))}
                                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--input-bg)', color: 'var(--color-text-main)' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Max Downloads</label>
                                    <input
                                        type="number"
                                        value={editForm.max_downloads}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, max_downloads: e.target.value }))}
                                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--input-bg)', color: 'var(--color-text-main)' }}
                                    />
                                </div>
                                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '8px' }}>
                                    {!isReady ? (
                                        <button
                                            onClick={handleRevive}
                                            style={{ width: '100%', padding: '10px', background: 'var(--color-success)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            Revive Transfer
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleExpireNow}
                                            style={{ width: '100%', padding: '10px', background: 'var(--color-error)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            Expire Now
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Activity size={16} />
                                    <span>{transfer.download_count} / {transfer.max_downloads} Downloads</span>
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Calendar size={16} />
                                    <span>Uploaded: {formatInGMT(transfer.created_at, 'PP')} (GMT)</span>
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', gridColumn: 'span 2', color: !isReady ? theme.text : 'inherit' }}>
                                    <Calendar size={16} />
                                    <span>Expires: {formatInGMT(transfer.expires_at, 'PPP p')} (GMT)</span>
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {!isEditing && (
                    <>
                        {transfer.status === 'READY' ? (
                            !downloadUrl ? (
                                <div style={{ marginTop: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--color-text-secondary)' }}>
                                        Generate Secure Link (Valid for):
                                    </label>
                                    <select
                                        value={expiryMinutes}
                                        onChange={(e) => setExpiryMinutes(parseInt(e.target.value))}
                                        style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', marginBottom: '16px', background: 'var(--input-bg)', color: 'var(--color-text-main)' }}
                                    >
                                        <option value="5">5 minutes</option>
                                        <option value="15">15 minutes</option>
                                        <option value="60">1 hour</option>
                                        <option value="1440">1 day</option>
                                    </select>

                                    <button
                                        onClick={handleDownload}
                                        disabled={downloading}
                                        className="btn btn-primary"
                                        style={{ width: '100%', fontSize: '16px', padding: '14px' }}
                                    >
                                        {downloading ? 'Starting...' : 'Generate Download Link'}
                                        {!downloading && <DownloadIcon size={18} style={{ marginLeft: '8px' }} />}
                                    </button>
                                </div>
                            ) : (
                                <div style={{ animation: 'fadeIn 0.5s ease', marginTop: '24px' }}>
                                    <div style={{ marginBottom: '24px' }}>
                                        <p style={{ fontWeight: 600, color: 'var(--color-success)', marginBottom: '12px' }}>Link Generated!</p>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                readOnly
                                                value={downloadUrl}
                                                style={{ flex: 1, padding: '12px', fontSize: '12px', background: 'var(--input-bg)', border: '1px solid var(--color-border)', color: 'var(--color-success)', borderRadius: '6px' }}
                                            />
                                            <button
                                                onClick={() => setDownloadUrl('')}
                                                title="Regenerate"
                                                style={{ padding: '12px', background: 'var(--color-background)', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'var(--color-text-main)' }}
                                            >
                                                <RefreshCw size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'center', padding: '24px', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                                        <QRCodeSVG value={downloadUrl} size={180} bgColor={'var(--color-surface)'} fgColor={'var(--color-text-main)'} />
                                    </div>
                                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                                        <button
                                            onClick={() => window.open(downloadUrl, '_blank')}
                                            className="btn btn-secondary"
                                            style={{ fontSize: '14px' }}
                                        >
                                            Open Link directly
                                        </button>
                                    </div>
                                </div>
                            )
                        ) : transfer.status === 'EXPIRED' ? (
                            /* Revival UI for expired transfers */
                            <div style={{ marginTop: '24px', padding: '24px', background: 'var(--input-bg)', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                    <div style={{
                                        width: '56px',
                                        height: '56px',
                                        background: 'rgba(251, 146, 60, 0.15)',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 12px',
                                        color: '#f97316'
                                    }}>
                                        <AlertCircle size={28} />
                                    </div>
                                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '4px' }}>Transfer Expired</h3>
                                    <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Set a new expiry date to revive this transfer.</p>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '8px' }}>
                                        <Calendar size={14} /> Revive Until (GMT)
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={editForm.expires_at}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, expires_at: e.target.value }))}
                                        min={getCurrentGMTDateTimeLocal()}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '10px',
                                            border: '1px solid var(--color-border)',
                                            background: 'var(--color-surface)',
                                            color: 'var(--color-text-main)',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                <button
                                    onClick={handleRevive}
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        background: '#22c55e',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        fontSize: '15px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <RefreshCw size={18} /> Revive Transfer
                                </button>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-secondary)' }}>
                                This transfer is no longer available. Status: {transfer.status}
                            </div>
                        )}
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default Download;
