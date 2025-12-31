import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", isDestructive = false }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px'
            }}>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onCancel}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.5)',
                        backdropFilter: 'blur(4px)'
                    }}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '400px',
                        background: 'var(--color-surface)',
                        borderRadius: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        padding: '24px',
                        zIndex: 1001,
                        border: '1px solid var(--color-border)'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {isDestructive && (
                                <div style={{ width: '40px', height: '40px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-error)' }}>
                                    <AlertTriangle size={20} />
                                </div>
                            )}
                            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-main)' }}>{title}</h3>
                        </div>
                        <button onClick={onCancel} style={{ padding: '4px', color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>
                    </div>

                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px', lineHeight: 1.6, fontSize: '14px' }}>
                        {message}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button
                            onClick={onCancel}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 600,
                                background: 'var(--input-bg)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-main)',
                                cursor: 'pointer'
                            }}
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 600,
                                background: isDestructive ? 'var(--color-error)' : 'var(--color-primary)',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            {confirmText}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ConfirmModal;
