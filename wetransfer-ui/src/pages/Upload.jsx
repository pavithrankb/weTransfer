import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Plus, Loader, Calendar, File, DownloadCloud, Clock, Copy, Shield, Zap, Globe, Mail, Send } from 'lucide-react';
import { createTransfer, getUploadUrl, completeTransfer, getDownloadUrl, shareDownload } from '../services/api';
import { QRCodeSVG } from 'qrcode.react';

// Animated Dot Grid Background with Mouse Interaction
const DotGrid = () => {
    const canvasRef = useRef(null);
    const mouseRef = useRef({ x: -1000, y: -1000 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let animationId;
        let time = 0;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        resize();
        window.addEventListener('resize', resize);

        // Mouse tracking
        const handleMouseMove = (e) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener('mousemove', handleMouseMove);

        const dots = [];
        const spacing = 45;
        const baseRadius = 2;
        const mouseRadius = 150; // Interaction radius

        const initDots = () => {
            dots.length = 0;
            const cols = Math.ceil(canvas.width / spacing) + 1;
            const rows = Math.ceil(canvas.height / spacing) + 1;

            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    dots.push({
                        x: i * spacing,
                        y: j * spacing,
                        baseX: i * spacing,
                        baseY: j * spacing,
                        vx: 0,
                        vy: 0,
                    });
                }
            }
        };

        initDots();
        window.addEventListener('resize', initDots);

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const dotColor = isDark ? 'rgba(139, 92, 246, 0.5)' : 'rgba(99, 102, 241, 0.35)';
            const lineColor = isDark ? 'rgba(139, 92, 246, 0.12)' : 'rgba(99, 102, 241, 0.08)';
            const glowColor = isDark ? 'rgba(167, 139, 250, 0.9)' : 'rgba(99, 102, 241, 0.8)';

            time += 0.005;
            const mouse = mouseRef.current;

            dots.forEach((dot) => {
                // Mouse interaction
                const dx = mouse.x - dot.baseX;
                const dy = mouse.y - dot.baseY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < mouseRadius) {
                    const force = (mouseRadius - dist) / mouseRadius;
                    const angle = Math.atan2(dy, dx);
                    // Push dots away from mouse
                    dot.vx -= Math.cos(angle) * force * 2;
                    dot.vy -= Math.sin(angle) * force * 2;
                }

                // Spring back to original position
                const springX = (dot.baseX - dot.x) * 0.08;
                const springY = (dot.baseY - dot.y) * 0.08;

                dot.vx += springX;
                dot.vy += springY;

                // Friction
                dot.vx *= 0.85;
                dot.vy *= 0.85;

                // Update position
                dot.x += dot.vx;
                dot.y += dot.vy;

                // Calculate radius based on distance from mouse
                let radius = baseRadius;
                if (dist < mouseRadius) {
                    const scale = 1 + ((mouseRadius - dist) / mouseRadius) * 2;
                    radius = baseRadius * scale;
                }

                // Draw dot
                ctx.beginPath();
                ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = dist < mouseRadius ? glowColor : dotColor;
                ctx.fill();
            });

            // Draw connecting lines
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 0.5;

            for (let i = 0; i < dots.length; i++) {
                for (let j = i + 1; j < dots.length; j++) {
                    const dx = dots[i].x - dots[j].x;
                    const dy = dots[i].y - dots[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < spacing * 1.6) {
                        const opacity = 1 - (dist / (spacing * 1.6));
                        ctx.globalAlpha = opacity * 0.5;
                        ctx.beginPath();
                        ctx.moveTo(dots[i].x, dots[i].y);
                        ctx.lineTo(dots[j].x, dots[j].y);
                        ctx.stroke();
                        ctx.globalAlpha = 1;
                    }
                }
            }

            animationId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
            window.removeEventListener('resize', initDots);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 0
            }}
        />
    );
};

const Upload = () => {
    const [step, setStep] = useState('idle');
    const [file, setFile] = useState(null);
    const fileInputRef = useRef(null);

    const [expiryDateTime, setExpiryDateTime] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().slice(0, 16);
    });
    const [maxDownloads, setMaxDownloads] = useState(10);
    const [progress, setProgress] = useState(0);
    const [transferId, setTransferId] = useState('');
    const [transferInfo, setTransferInfo] = useState(null);
    const [linkExpiryMinutes, setLinkExpiryMinutes] = useState(60);
    const [downloadUrl, setDownloadUrl] = useState('');
    const [generatingLink, setGeneratingLink] = useState(false);
    const [copied, setCopied] = useState(false);

    // Email sharing state
    const [emailInput, setEmailInput] = useState('');
    const [sendingEmail, setSendingEmail] = useState(false);
    const [emailSuccess, setEmailSuccess] = useState(false);
    const [emailError, setEmailError] = useState('');

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
            const interval = setInterval(() => {
                setProgress(prev => (prev < 85 ? prev + 5 : prev));
            }, 400);

            const expiresAtISO = new Date(expiryDateTime).toISOString();
            const createRes = await createTransfer(expiresAtISO, maxDownloads);
            const { id } = createRes.data;
            setTransferId(id);

            const urlRes = await getUploadUrl(id, file.name, file.type || 'application/octet-stream');
            const { upload_url } = urlRes.data;

            const s3Res = await fetch(upload_url, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type || 'application/octet-stream' }
            });
            if (!s3Res.ok) throw new Error('S3 Upload failed');

            const completeRes = await completeTransfer(id);
            setTransferInfo(completeRes.data);

            clearInterval(interval);
            setProgress(100);
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

    // Email validation helper
    const isValidEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    };

    // Parse and validate email input
    const getValidEmails = () => {
        const emails = emailInput
            .split(',')
            .map(e => e.trim())
            .filter(e => e.length > 0);
        return emails.filter(isValidEmail);
    };

    const handleSendEmail = async () => {
        const emails = getValidEmails();
        if (emails.length === 0) return;

        setSendingEmail(true);
        setEmailError('');
        setEmailSuccess(false);

        try {
            await shareDownload(transferId, emails);
            setEmailSuccess(true);
            setEmailInput('');
            setTimeout(() => setEmailSuccess(false), 3000);
        } catch (err) {
            console.error(err);
            setEmailError('Failed to send email(s). Please try again.');
            setTimeout(() => setEmailError(''), 5000);
        } finally {
            setSendingEmail(false);
        }
    };

    const reset = () => {
        setStep('idle');
        setFile(null);
        setProgress(0);
        setTransferId('');
        setTransferInfo(null);
        setDownloadUrl('');
        setCopied(false);
        setEmailInput('');
        setEmailSuccess(false);
        setEmailError('');
    };

    const getExpiryLabel = (mins) => {
        if (mins >= 1440) return `${Math.round(mins / 1440)} Day${mins >= 2880 ? 's' : ''}`;
        if (mins >= 60) return `${Math.round(mins / 60)} Hour${mins >= 120 ? 's' : ''}`;
        return `${mins} Min${mins > 1 ? 's' : ''}`;
    };

    const features = [
        { icon: Shield, title: 'Secure', desc: 'End-to-end encrypted' },
        { icon: Zap, title: 'Fast', desc: 'Direct S3 transfers' },
        { icon: Globe, title: 'Global', desc: 'CDN-powered delivery' },
    ];

    return (
        <div style={{ position: 'relative', minHeight: 'calc(100vh - 73px)', overflow: 'hidden' }}>
            <DotGrid />

            {/* Main Content - Split Layout */}
            <div style={{
                position: 'relative',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 'calc(100vh - 73px)',
                padding: '40px',
                gap: '80px'
            }}>

                {/* Left: Upload Card */}
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    style={{
                        width: '420px',
                        background: 'var(--color-surface)',
                        padding: '40px',
                        borderRadius: '24px',
                        boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.12), 0 0 0 1px var(--color-border)',
                        backdropFilter: 'blur(20px)'
                    }}
                >
                    {/* STEP: IDLE */}
                    {step === 'idle' && (
                        <>
                            <div style={{ marginBottom: '24px' }}>
                                <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '6px' }}>Upload Files</h2>
                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Share files securely in seconds.</p>
                            </div>

                            {!file ? (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        height: '140px',
                                        border: '2px dashed var(--color-border)',
                                        borderRadius: '16px',
                                        background: 'var(--input-bg)',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', marginBottom: '24px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ width: '48px', height: '48px', background: 'var(--color-primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', color: 'white' }}>
                                        <Plus size={24} />
                                    </div>
                                    <span style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: '14px' }}>Add your files</span>
                                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Up to 2GB</span>
                                </div>
                            ) : (
                                <div style={{ padding: '14px 16px', background: 'var(--input-bg)', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--color-border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                                        <div style={{ width: '38px', height: '38px', background: 'var(--color-primary-light)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                                            <File size={18} />
                                        </div>
                                        <div style={{ overflow: 'hidden' }}>
                                            <span style={{ display: 'block', fontWeight: 600, color: 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }}>{file.name}</span>
                                            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                        </div>
                                    </div>
                                    <button onClick={() => setFile(null)} style={{ color: 'var(--color-text-secondary)', padding: '6px', background: 'transparent' }}><X size={16} /></button>
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '6px' }}>
                                    <Calendar size={12} /> Expires At
                                </label>
                                <input type="datetime-local" value={expiryDateTime} onChange={(e) => setExpiryDateTime(e.target.value)} min={new Date().toISOString().slice(0, 16)} style={{ marginBottom: '14px', fontSize: '13px' }} />

                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '6px' }}>
                                    <DownloadCloud size={12} /> Max Downloads
                                </label>
                                <input type="number" value={maxDownloads} onChange={(e) => setMaxDownloads(e.target.value)} min="1" style={{ marginBottom: 0, fontSize: '13px' }} />
                            </div>

                            <button onClick={handleUpload} disabled={!file} className="btn btn-primary" style={{ width: '100%', height: '48px', fontSize: '15px' }}>
                                Upload File
                            </button>
                        </>
                    )}

                    {/* STEP: UPLOADING */}
                    {step === 'uploading' && (
                        <div style={{ textAlign: 'center', padding: '16px 0' }}>
                            <Loader className="spin" size={44} style={{ color: 'var(--color-primary)', marginBottom: '20px' }} />
                            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text-main)' }}>Uploading...</h3>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '20px' }}>{file?.name}</p>
                            <div style={{ height: '6px', background: 'var(--input-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                                <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} style={{ height: '100%', background: 'var(--color-primary)', borderRadius: '3px' }} />
                            </div>
                            <p style={{ marginTop: '10px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{progress}%</p>
                        </div>
                    )}

                    {/* STEP: READY */}
                    {step === 'ready' && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: '56px', height: '56px', background: 'var(--color-success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'white' }}>
                                <Check size={28} />
                            </div>
                            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text-main)' }}>File Ready!</h3>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
                                <strong>{transferInfo?.filename || file?.name}</strong> uploaded.
                            </p>

                            <div style={{ textAlign: 'left', background: 'var(--input-bg)', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--color-border)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '8px' }}>
                                    <Clock size={12} /> Link Validity
                                </label>
                                <select value={linkExpiryMinutes} onChange={(e) => setLinkExpiryMinutes(parseInt(e.target.value))} style={{ width: '100%', marginBottom: 0, fontSize: '13px' }}>
                                    <option value="5">5 Minutes</option>
                                    <option value="20">20 Minutes</option>
                                    <option value="60">1 Hour</option>
                                    <option value="1440">1 Day</option>
                                    <option value="10080">1 Week</option>
                                </select>
                            </div>

                            <button onClick={handleGenerateDownloadLink} disabled={generatingLink} className="btn btn-primary" style={{ width: '100%', height: '48px', fontSize: '15px' }}>
                                {generatingLink ? <Loader className="spin" size={18} /> : 'Get Download Link'}
                            </button>
                        </div>
                    )}

                    {/* STEP: COMPLETE */}
                    {step === 'complete' && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: '56px', height: '56px', background: 'var(--color-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'white' }}>
                                <Check size={28} />
                            </div>
                            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text-main)' }}>Done!</h3>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                                Valid for <strong>{getExpiryLabel(linkExpiryMinutes)}</strong>
                            </p>

                            <div style={{ background: 'var(--input-bg)', padding: '12px', borderRadius: '10px', border: '1px solid var(--color-border)', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input readOnly value={downloadUrl} style={{ flex: 1, margin: 0, fontSize: '11px', fontFamily: 'monospace' }} />
                                    <button onClick={handleCopy} className="btn btn-primary" style={{ padding: '0 14px', borderRadius: '8px', fontSize: '13px' }}>
                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginBottom: '10px' }}>Scan to download</p>
                                <div style={{ display: 'inline-block', padding: '12px', background: 'white', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                                    <QRCodeSVG value={downloadUrl} size={100} />
                                </div>
                            </div>

                            {/* Share via Email Section */}
                            <div style={{
                                background: 'var(--input-bg)',
                                padding: '16px',
                                borderRadius: '12px',
                                border: '1px solid var(--color-border)',
                                marginBottom: '20px',
                                textAlign: 'left'
                            }}>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    color: 'var(--color-text-main)',
                                    marginBottom: '12px'
                                }}>
                                    <Mail size={14} />
                                    Share via Email
                                </label>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                    <input
                                        type="text"
                                        value={emailInput}
                                        onChange={(e) => setEmailInput(e.target.value)}
                                        placeholder="Enter email(s), comma-separated"
                                        style={{
                                            flex: 1,
                                            margin: 0,
                                            fontSize: '13px',
                                            padding: '10px 12px',
                                            borderRadius: '8px'
                                        }}
                                        disabled={sendingEmail}
                                    />
                                    <button
                                        onClick={handleSendEmail}
                                        disabled={sendingEmail || getValidEmails().length === 0}
                                        className="btn btn-primary"
                                        style={{
                                            padding: '0 16px',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            opacity: (sendingEmail || getValidEmails().length === 0) ? 0.6 : 1
                                        }}
                                    >
                                        {sendingEmail ? (
                                            <Loader className="spin" size={14} />
                                        ) : (
                                            <>
                                                <Send size={14} />
                                                Send
                                            </>
                                        )}
                                    </button>
                                </div>
                                {emailSuccess && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        color: 'var(--color-success)',
                                        fontSize: '12px',
                                        marginTop: '4px'
                                    }}>
                                        <Check size={12} />
                                        Email(s) sent successfully
                                    </div>
                                )}
                                {emailError && (
                                    <div style={{
                                        color: 'var(--color-error, #ef4444)',
                                        fontSize: '12px',
                                        marginTop: '4px'
                                    }}>
                                        {emailError}
                                    </div>
                                )}
                            </div>

                            <button onClick={reset} className="btn btn-secondary" style={{ width: '100%', height: '44px', fontSize: '14px' }}>
                                Send another
                            </button>
                        </div>
                    )}
                </motion.div>

                {/* Right: Catchy Content */}
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                    style={{ maxWidth: '380px' }}
                >
                    <h1 style={{
                        fontSize: '48px',
                        fontWeight: 900,
                        color: 'var(--color-text-main)',
                        lineHeight: 1.1,
                        marginBottom: '20px',
                        letterSpacing: '-1px'
                    }}>
                        Share files<br />
                        <span style={{ color: 'var(--color-primary)' }}>effortlessly.</span>
                    </h1>

                    <p style={{
                        fontSize: '17px',
                        color: 'var(--color-text-secondary)',
                        lineHeight: 1.7,
                        marginBottom: '36px'
                    }}>
                        No signup required. Upload your file, set an expiry, and share a secure link instantly.
                    </p>

                    {/* Feature Pills */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {features.map((f, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + i * 0.1 }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '14px',
                                    padding: '14px 18px',
                                    background: 'var(--color-surface)',
                                    borderRadius: '14px',
                                    border: '1px solid var(--color-border)',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                                }}
                            >
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    background: 'var(--color-primary-light)',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--color-primary)'
                                }}>
                                    <f.icon size={20} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text-main)' }}>{f.title}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{f.desc}</div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

            </div>
        </div>
    );
};

export default Upload;
