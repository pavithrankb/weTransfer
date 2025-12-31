import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Plus, Loader, Calendar, File, DownloadCloud, Clock, Copy, ExternalLink } from 'lucide-react';
import { createTransfer, getUploadUrl, completeTransfer, getDownloadUrl } from '../services/api';
import { QRCodeSVG } from 'qrcode.react';

const Upload = () => {
    // STEP: 'idle' | 'uploading' | 'ready' | 'complete'
    const [step, setStep] = useState('idle');

    // File State
    const [file, setFile] = useState(null);
    const fileInputRef = useRef(null);

    // Form options
    const [expiryDateTime, setExpiryDateTime] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        // Format for datetime-local input
        return d.toISOString().slice(0, 16);
    });
    const [maxDownloads, setMaxDownloads] = useState(10);

    // Upload progress
    const [progress, setProgress] = useState(0);

    // After upload complete
    const [transferId, setTransferId] = useState('');
    const [transferInfo, setTransferInfo] = useState(null);

    // Download URL generation
    const [linkExpiryMinutes, setLinkExpiryMinutes] = useState(60);
    const [downloadUrl, setDownloadUrl] = useState('');
    const [generatingLink, setGeneratingLink] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setStep('uploading');
        setProgress(0);

        try {
            // Simulated progress
            const interval = setInterval(() => {
                setProgress(prev => (prev < 85 ? prev + 5 : prev));
            }, 400);

            // 1. Create Transfer ID
            const expiresAtISO = new Date(expiryDateTime).toISOString();
            const createRes = await createTransfer(expiresAtISO, maxDownloads);
            const { id } = createRes.data;
            setTransferId(id);

            // 2. Get S3 Presigned URL
            const urlRes = await getUploadUrl(id, file.name, file.type || 'application/octet-stream');
            const { upload_url } = urlRes.data;

            // 3. Direct Upload to S3
            const s3Res = await fetch(upload_url, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type || 'application/octet-stream'
                }
            });
            if (!s3Res.ok) throw new Error('S3 Upload failed');

            // 4. Mark Complete
            const completeRes = await completeTransfer(id);
            setTransferInfo(completeRes.data);

            clearInterval(interval);
            setProgress(100);

            // Move to "ready" step (ask for download link expiry)
            setStep('ready');

        } catch (err) {
            console.error(err);
            alert('Upload failed: ' + err.message);
            setStep('idle');
        }
    };

    const handleGenerateDownloadLink = async () => {
        setGeneratingLink(true);
        try {
            const { data } = await getDownloadUrl(transferId, linkExpiryMinutes);
            setDownloadUrl(data.download_url);
            setStep('complete');
        } catch (err) {
            console.error(err);
            alert('Failed to generate download link');
        } finally {
            setGeneratingLink(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(downloadUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const reset = () => {
        setStep('idle');
        setFile(null);
        setProgress(0);
        setTransferId('');
        setTransferInfo(null);
        setDownloadUrl('');
        setCopied(false);
    };

    // Get expiry label
    const getExpiryLabel = (mins) => {
        if (mins >= 1440) return `${Math.round(mins / 1440)} Day${mins >= 2880 ? 's' : ''}`;
        if (mins >= 60) return `${Math.round(mins / 60)} Hour${mins >= 120 ? 's' : ''}`;
        return `${mins} Min${mins > 1 ? 's' : ''}`;
    };

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', height: '100%', minHeight: 'calc(100vh - 82px)' }}>

            {/* Left Side: Form */}
            <div style={{ flex: 1, minWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', background: 'var(--color-background)' }}>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        width: '100%', maxWidth: '440px',
                        background: 'var(--color-surface)',
                        padding: '40px', borderRadius: '24px',
                        boxShadow: 'var(--shadow-lg)',
                        border: '1px solid var(--color-border)'
                    }}
                >
                    {/* STEP: IDLE - File Selection */}
                    {step === 'idle' && (
                        <>
                            <div style={{ marginBottom: '28px' }}>
                                <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '8px' }}>Upload Files</h2>
                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Select files, set expiry time, and share.</p>
                            </div>

                            {!file ? (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        height: '160px',
                                        border: '2px dashed var(--color-primary)',
                                        borderRadius: '20px',
                                        background: 'var(--input-bg)',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', marginBottom: '28px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ width: '52px', height: '52px', background: 'var(--color-primary)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', color: 'white' }}>
                                        <Plus size={26} />
                                    </div>
                                    <span style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: '15px' }}>Add your files</span>
                                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Up to 2GB</span>
                                </div>
                            ) : (
                                <div style={{ padding: '16px 20px', background: 'var(--input-bg)', borderRadius: '14px', marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--color-border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                                        <div style={{ width: '40px', height: '40px', background: 'var(--color-primary-light)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                                            <File size={20} />
                                        </div>
                                        <div style={{ overflow: 'hidden' }}>
                                            <span style={{ display: 'block', fontWeight: 600, color: 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '14px' }}>{file.name}</span>
                                            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                        </div>
                                    </div>
                                    <button onClick={() => setFile(null)} style={{ color: 'var(--color-text-secondary)', padding: '6px', background: 'transparent' }}><X size={18} /></button>
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />

                            {/* Options */}
                            <div style={{ marginBottom: '28px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '8px' }}>
                                    <Calendar size={14} /> Transfer Expires At
                                </label>
                                <input
                                    type="datetime-local"
                                    value={expiryDateTime}
                                    onChange={(e) => setExpiryDateTime(e.target.value)}
                                    min={new Date().toISOString().slice(0, 16)}
                                    style={{ marginBottom: '16px' }}
                                />

                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '8px' }}>
                                    <DownloadCloud size={14} /> Max Downloads
                                </label>
                                <input
                                    type="number"
                                    value={maxDownloads}
                                    onChange={(e) => setMaxDownloads(e.target.value)}
                                    min="1"
                                    style={{ marginBottom: 0 }}
                                />
                            </div>

                            <button
                                onClick={handleUpload}
                                disabled={!file}
                                className="btn btn-primary"
                                style={{ width: '100%', height: '52px', fontSize: '16px' }}
                            >
                                Upload File
                            </button>
                        </>
                    )}

                    {/* STEP: UPLOADING */}
                    {step === 'uploading' && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <Loader className="spin" size={48} style={{ color: 'var(--color-primary)', marginBottom: '24px' }} />
                            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'var(--color-text-main)' }}>Uploading...</h3>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                                {file?.name}
                            </p>
                            <div style={{ height: '8px', background: 'var(--input-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    style={{ height: '100%', background: 'var(--color-primary)', borderRadius: '4px' }}
                                />
                            </div>
                            <p style={{ marginTop: '12px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>{progress}%</p>
                        </div>
                    )}

                    {/* STEP: READY - Ask for download link expiry */}
                    {step === 'ready' && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: '64px', height: '64px', background: 'var(--color-success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'white' }}>
                                <Check size={32} />
                            </div>
                            <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px', color: 'var(--color-text-main)' }}>File Ready!</h3>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '28px' }}>
                                <strong>{transferInfo?.filename || file?.name}</strong> has been uploaded successfully.
                            </p>

                            <div style={{ textAlign: 'left', background: 'var(--input-bg)', padding: '20px', borderRadius: '16px', marginBottom: '24px', border: '1px solid var(--color-border)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '12px' }}>
                                    <Clock size={14} /> Download Link Validity
                                </label>
                                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
                                    Choose how long the download link should be active.
                                </p>
                                <select
                                    value={linkExpiryMinutes}
                                    onChange={(e) => setLinkExpiryMinutes(parseInt(e.target.value))}
                                    style={{ width: '100%', marginBottom: 0 }}
                                >
                                    <option value="5">5 Minutes</option>
                                    <option value="20">20 Minutes</option>
                                    <option value="60">1 Hour</option>
                                    <option value="1440">1 Day</option>
                                    <option value="10080">1 Week</option>
                                </select>
                            </div>

                            <button
                                onClick={handleGenerateDownloadLink}
                                disabled={generatingLink}
                                className="btn btn-primary"
                                style={{ width: '100%', height: '52px', fontSize: '16px' }}
                            >
                                {generatingLink ? <Loader className="spin" size={20} /> : 'Get Download Link'}
                            </button>
                        </div>
                    )}

                    {/* STEP: COMPLETE - Show URL & QR */}
                    {step === 'complete' && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: '64px', height: '64px', background: 'var(--color-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'white' }}>
                                <Check size={32} />
                            </div>
                            <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px', color: 'var(--color-text-main)' }}>You're Done!</h3>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                                Link valid for <strong>{getExpiryLabel(linkExpiryMinutes)}</strong>
                            </p>

                            {/* Copy Link Section */}
                            <div style={{ background: 'var(--input-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                                    <input
                                        readOnly
                                        value={downloadUrl}
                                        style={{ flex: 1, margin: 0, fontSize: '12px', fontFamily: 'monospace' }}
                                    />
                                    <button
                                        onClick={handleCopy}
                                        className="btn btn-primary"
                                        style={{ padding: '0 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        {copied ? <Check size={18} /> : <Copy size={18} />}
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                            </div>

                            {/* QR Code */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' }}>
                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
                                    Scan to download
                                </p>
                                <div style={{ padding: '16px', background: 'white', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)' }}>
                                    <QRCodeSVG value={downloadUrl} size={140} />
                                </div>
                            </div>

                            <button onClick={reset} className="btn btn-secondary" style={{ width: '100%' }}>
                                Send another file
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Right Side: Hero */}
            <div style={{ flex: 1, minWidth: '400px', background: 'var(--hero-bg)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ zIndex: 10, textAlign: 'center', padding: '60px' }}>
                    <h1 style={{ fontSize: '52px', fontWeight: 900, marginBottom: '24px', color: 'var(--hero-text)', letterSpacing: '-1px', lineHeight: 1.1 }}>
                        Simple, safe<br />file sharing.
                    </h1>
                    <p style={{ fontSize: '18px', color: 'var(--hero-text)', opacity: 0.7, maxWidth: '420px', margin: '0 auto', lineHeight: 1.6 }}>
                        No registration required. Just upload and get a secure link to share instantly.
                    </p>
                </div>
                {/* Deco */}
                <div style={{ position: 'absolute', top: '10%', right: '10%', width: '350px', height: '350px', background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)', filter: 'blur(80px)', opacity: 0.15 }}></div>
                <div style={{ position: 'absolute', bottom: '10%', left: '10%', width: '350px', height: '350px', background: 'radial-gradient(circle, var(--color-success) 0%, transparent 70%)', filter: 'blur(80px)', opacity: 0.15 }}></div>
            </div>

        </div>
    );
};

export default Upload;
