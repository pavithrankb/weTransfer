import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Copy, Link as LinkIcon, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getDownloadUrl } from '../services/api';

const Success = () => {
    const { id } = useParams();
    const [copied, setCopied] = useState(false);
    const [downloadLink, setDownloadLink] = useState('');
    const [loadingLink, setLoadingLink] = useState(false);
    const [linkExpiryMinutes, setLinkExpiryMinutes] = useState(60);
    const [generated, setGenerated] = useState(false);

    const handleGenerateLink = async () => {
        setLoadingLink(true);
        try {
            const { data } = await getDownloadUrl(id, linkExpiryMinutes);
            setDownloadLink(data.download_url);
            setGenerated(true);
        } catch (err) {
            console.error("Failed to get download url", err);
            alert("Failed to generate link, please try again.");
        } finally {
            setLoadingLink(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(downloadLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '20px' }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card"
                style={{ textAlign: 'center' }}
            >
                <div style={{
                    width: '72px',
                    height: '72px',
                    background: 'var(--color-success)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    color: 'white',
                    boxShadow: '0 8px 16px rgba(56, 161, 105, 0.2)'
                }}>
                    <Check size={36} strokeWidth={3} />
                </div>

                <h1 style={{ marginBottom: '12px', fontSize: '28px', color: 'var(--color-text-main)' }}>Upload Complete!</h1>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px' }}>
                    Your files are ready. Generate a secure download link below.
                </p>

                {!generated ? (
                    <div style={{ textAlign: 'left', background: 'var(--input-bg)', padding: '24px', borderRadius: '16px', marginBottom: '24px', border: '1px solid var(--color-border)' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-main)' }}>
                            Link Validity
                        </label>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                            Expire link after:
                        </p>

                        <select
                            value={linkExpiryMinutes}
                            onChange={(e) => setLinkExpiryMinutes(parseInt(e.target.value))}
                            style={{ width: '100%', marginBottom: '16px' }}
                        >
                            <option value="5">5 Minutes</option>
                            <option value="60">1 Hour</option>
                            <option value="1440">1 Day</option>
                            <option value="4320">3 Days</option>
                            <option value="10080">1 Week</option>
                        </select>

                        <button
                            onClick={handleGenerateLink}
                            disabled={loadingLink}
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                        >
                            {loadingLink ? 'Generating...' : 'Generate Link'}
                            {!loadingLink && <LinkIcon size={18} style={{ marginLeft: '8px' }} />}
                        </button>
                    </div>
                ) : (
                    <div className="fade-in">
                        <div style={{ padding: '16px', background: 'var(--input-bg)', borderRadius: '12px', border: '1px solid var(--color-primary)', marginBottom: '24px' }}>
                            <p style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 600, marginBottom: '8px' }}>
                                Link ready ({linkExpiryMinutes >= 1440 ? Math.round(linkExpiryMinutes / 1440) + ' Days' : linkExpiryMinutes + ' Mins'})
                            </p>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    readOnly
                                    value={downloadLink}
                                    style={{ margin: 0, flex: 1, fontSize: '13px' }}
                                />
                                <button
                                    onClick={handleCopy}
                                    className="btn btn-primary"
                                    style={{ padding: '0 16px', borderRadius: '8px' }}
                                >
                                    {copied ? <Check size={18} /> : <Copy size={18} />}
                                </button>
                            </div>
                        </div>

                        <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
                                Scan to download on mobile
                            </p>
                            <div style={{ padding: '16px', background: 'white', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)' }}>
                                <QRCodeSVG value={downloadLink} size={120} />
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                    <Link to="/" className="btn btn-secondary" style={{ width: '100%' }}>
                        Send another file
                    </Link>
                </div>
            </motion.div>
        </div>
    );
};

export default Success;
