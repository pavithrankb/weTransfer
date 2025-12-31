import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Server, Database, HardDrive, Smartphone, Cloud, Globe, FileUp, FileDown, Lock, User, Github, Linkedin, Mail, Clock, ArrowRight, CheckCircle } from 'lucide-react';

const ArchitectureModal = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('upload'); // 'upload', 'download', or 'about'

    if (!isOpen) return null;

    // Node Component for Absolute Positioning
    const Node = ({ icon: Icon, title, desc, color, subTitle, x, y, width = 220 }) => (
        <div style={{
            position: 'absolute', left: x, top: y, width: width,
            background: 'var(--input-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            zIndex: 10, boxShadow: 'var(--shadow-md)'
        }}>
            <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: color + '20', color: color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px'
            }}>
                <Icon size={20} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--color-text-main)' }}>{title}</h3>
            {subTitle && <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '4px', textTransform: 'uppercase' }}>{subTitle}</span>}
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{desc}</p>
        </div>
    );

    // Group Box for EC2
    const GroupBox = ({ title, x, y, width, height, children, color = 'var(--color-primary)' }) => (
        <div style={{
            position: 'absolute', left: x, top: y, width: width, height: height,
            border: '2px dashed var(--color-border)', borderRadius: '24px',
            background: 'var(--input-bg)',
            zIndex: 5
        }}>
            <div style={{
                position: 'absolute', top: '-14px', left: '20px',
                background: color, color: 'white',
                padding: '4px 12px', borderRadius: '6px',
                fontSize: '12px', fontWeight: 700
            }}>
                {title}
            </div>
            {children}
        </div>
    );

    // Flow Step Component for detailed explanation
    const FlowStep = ({ number, title, description, icon: Icon, color }) => (
        <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            padding: '16px',
            background: 'var(--input-bg)',
            borderRadius: '12px',
            border: '1px solid var(--color-border)'
        }}>
            <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: color + '20',
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '14px',
                flexShrink: 0
            }}>
                {number}
            </div>
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Icon size={16} style={{ color: color }} />
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-main)' }}>{title}</h4>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{description}</p>
            </div>
        </div>
    );

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 2000 }} />

            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                style={{
                    background: 'var(--color-surface)', width: '1000px', height: '800px',
                    borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    boxShadow: 'var(--shadow-lg)', border: '1px solid var(--color-border)',
                    zIndex: 2001, position: 'relative'
                }}
            >
                {/* Header */}
                <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface)', zIndex: 20 }}>
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Cloud size={24} style={{ color: 'var(--color-primary)' }} />
                            System Architecture
                        </h2>
                    </div>
                    <div style={{ display: 'flex', background: 'var(--input-bg)', padding: '4px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                        <button onClick={() => setActiveTab('upload')}
                            style={{ padding: '8px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: activeTab === 'upload' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'upload' ? 'white' : 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', border: 'none' }}>
                            <FileUp size={14} /> Upload
                        </button>
                        <button onClick={() => setActiveTab('download')}
                            style={{ padding: '8px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: activeTab === 'download' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'download' ? 'white' : 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', border: 'none' }}>
                            <FileDown size={14} /> Download
                        </button>
                        <button onClick={() => setActiveTab('about')}
                            style={{ padding: '8px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: activeTab === 'about' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'about' ? 'white' : 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', border: 'none' }}>
                            <User size={14} /> About
                        </button>
                    </div>
                    <button onClick={onClose} style={{ padding: '8px', borderRadius: '50%', background: 'transparent', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* About Tab Content */}
                {activeTab === 'about' && (
                    <div style={{ flex: 1, padding: '40px', overflow: 'auto', background: 'var(--color-background)' }}>
                        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                            {/* Author Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    background: 'var(--color-surface)',
                                    borderRadius: '24px',
                                    padding: '40px',
                                    border: '1px solid var(--color-border)',
                                    boxShadow: 'var(--shadow-lg)',
                                    textAlign: 'center'
                                }}
                            >
                                <div style={{
                                    width: '100px',
                                    height: '100px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, var(--color-primary), #a855f7)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 24px',
                                    boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)'
                                }}>
                                    <User size={48} style={{ color: 'white' }} />
                                </div>

                                <h3 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '8px' }}>
                                    Pavithran KB
                                </h3>
                                <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', marginBottom: '32px' }}>
                                    Full-Stack Developer & Cloud Enthusiast
                                </p>

                                {/* Social Links */}
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '32px' }}>
                                    <a
                                        href="mailto:pavithrankb@gmail.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 20px',
                                            background: 'var(--input-bg)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: '12px',
                                            color: 'var(--color-text-main)',
                                            textDecoration: 'none',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                                    >
                                        <Mail size={18} style={{ color: '#ef4444' }} />
                                        Email
                                    </a>
                                    <a
                                        href="https://linkedin.com/in/pavithrankb"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 20px',
                                            background: 'var(--input-bg)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: '12px',
                                            color: 'var(--color-text-main)',
                                            textDecoration: 'none',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0a66c2'}
                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                                    >
                                        <Linkedin size={18} style={{ color: '#0a66c2' }} />
                                        LinkedIn
                                    </a>
                                    <a
                                        href="https://github.com/pavithrankb"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 20px',
                                            background: 'var(--input-bg)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: '12px',
                                            color: 'var(--color-text-main)',
                                            textDecoration: 'none',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-text-main)'}
                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                                    >
                                        <Github size={18} />
                                        GitHub
                                    </a>
                                </div>

                                {/* Project Description */}
                                <div style={{
                                    background: 'var(--input-bg)',
                                    borderRadius: '16px',
                                    padding: '24px',
                                    textAlign: 'left',
                                    border: '1px solid var(--color-border)'
                                }}>
                                    <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '12px' }}>
                                        About This Project
                                    </h4>
                                    <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                                        WeTransfer Clone is a secure file-sharing application built with modern cloud architecture.
                                        It features direct S3 uploads using presigned URLs for optimal performance,
                                        a Go backend for API handling, and a React frontend for a seamless user experience.
                                    </p>
                                    <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {['React', 'Go', 'AWS S3', 'PostgreSQL', 'EC2', 'Presigned URLs'].map(tech => (
                                            <span key={tech} style={{
                                                padding: '6px 12px',
                                                background: 'var(--color-primary-light)',
                                                color: 'var(--color-primary)',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: 600
                                            }}>
                                                {tech}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                )}

                {/* Architecture Flow Content */}
                {(activeTab === 'upload' || activeTab === 'download') && (
                    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                        {/* Left: Visual Diagram */}
                        <div style={{ flex: 1, position: 'relative', background: 'var(--color-background)', overflow: 'hidden' }}>

                            {/* User Client (Centered Top) */}
                            <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: '20px', zIndex: 20 }}>
                                <Node
                                    icon={Smartphone} title="User Client" subTitle="Browser"
                                    desc="React App on AWS EC2. File selection & UI."
                                    color="#e879f9" x={0} y={0} width={200}
                                />
                            </div>

                            {/* EC2 Group (Left) */}
                            <GroupBox title="AWS EC2 Instance" x={30} y={200} width={250} height={280} color="#6366f1">
                            </GroupBox>
                            <Node
                                icon={Server} title="Go Backend" subTitle="API SERVER"
                                desc="Creates presigned URLs. Handles metadata."
                                color="#6366f1"
                                x={55} y={255} width={200}
                            />
                            <Node
                                icon={Globe} title="React Frontend" subTitle="NGINX"
                                desc="Static assets served."
                                color="#22c55e"
                                x={55} y={390} width={200}
                            />

                            {/* AWS Data Infra (Right) */}
                            <GroupBox title="AWS Cloud Services" x={320} y={200} width={280} height={280} color="#f59e0b">
                            </GroupBox>
                            <Node
                                icon={HardDrive} title="S3 Bucket" subTitle="Object Storage"
                                desc="Direct file upload/download via presigned URL."
                                color="#f59e0b"
                                x={360} y={255} width={200}
                            />
                            <Node
                                icon={Database} title="PostgreSQL" subTitle="AWS RDS"
                                desc="Transfer metadata & analytics."
                                color="#3b82f6"
                                x={360} y={390} width={200}
                            />

                            {/* SVG CONNECTIONS */}
                            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 15 }}>
                                <defs>
                                    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                        <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-primary)" />
                                    </marker>
                                    <marker id="arrow-success" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                        <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-success)" />
                                    </marker>
                                </defs>

                                {/* 1. User -> Backend */}
                                <motion.path
                                    d="M 280 140 C 250 180, 180 200, 155 255"
                                    fill="none" stroke="var(--color-primary)" strokeWidth="3" markerEnd="url(#arrow)"
                                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }}
                                />
                                <motion.circle r="4" fill="var(--color-primary)">
                                    <animateMotion path="M 280 140 C 250 180, 180 200, 155 255" dur="1.5s" repeatCount="indefinite" />
                                </motion.circle>

                                {/* 2. Backend -> S3 (presigned URL generation) */}
                                <motion.path
                                    d="M 255 300 L 360 300"
                                    fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeDasharray="5,5"
                                    initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 0.3 }}
                                />

                                {/* 3. Backend -> RDS */}
                                <motion.path
                                    d="M 255 430 L 360 430"
                                    fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeDasharray="5,5"
                                    initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 0.5 }}
                                />

                                {/* 4. User -> S3 (DIRECT with presigned URL) */}
                                <motion.path
                                    d="M 380 140 C 420 180, 460 200, 460 255"
                                    fill="none" stroke="var(--color-success)" strokeWidth="3" markerEnd="url(#arrow-success)"
                                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 0.5 }}
                                />
                                <motion.circle r="4" fill="var(--color-success)">
                                    <animateMotion path="M 380 140 C 420 180, 460 200, 460 255" dur="1s" repeatCount="indefinite" />
                                </motion.circle>

                            </svg>
                        </div>

                        {/* Right: Flow Steps Explanation */}
                        <div style={{
                            width: '380px',
                            background: 'var(--color-surface)',
                            borderLeft: '1px solid var(--color-border)',
                            padding: '24px',
                            overflow: 'auto'
                        }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {activeTab === 'upload' ? <FileUp size={18} style={{ color: 'var(--color-primary)' }} /> : <FileDown size={18} style={{ color: 'var(--color-primary)' }} />}
                                {activeTab === 'upload' ? 'Upload Flow' : 'Download Flow'}
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {activeTab === 'upload' ? (
                                    <>
                                        <FlowStep
                                            number="1"
                                            title="User Selects File"
                                            description="User selects a file through the React frontend running on AWS EC2."
                                            icon={Smartphone}
                                            color="#e879f9"
                                        />
                                        <FlowStep
                                            number="2"
                                            title="Request Presigned URL"
                                            description="Frontend sends request to Go backend (AWS EC2) to generate a presigned upload URL."
                                            icon={Server}
                                            color="#6366f1"
                                        />
                                        <FlowStep
                                            number="3"
                                            title="Backend Creates Presigned URL"
                                            description="Go backend communicates with AWS S3 to create a presigned URL valid for 5 minutes. Metadata is stored in PostgreSQL RDS."
                                            icon={Clock}
                                            color="#f59e0b"
                                        />
                                        <FlowStep
                                            number="4"
                                            title="URL Returned to Client"
                                            description="Backend returns the presigned URL to the frontend client."
                                            icon={ArrowRight}
                                            color="#6366f1"
                                        />
                                        <FlowStep
                                            number="5"
                                            title="Direct Upload to S3"
                                            description="Client directly uploads the file to S3 using the presigned URL via HTTPS. Backend is bypassed for the actual file transfer."
                                            icon={HardDrive}
                                            color="#22c55e"
                                        />
                                        <FlowStep
                                            number="6"
                                            title="Upload Complete"
                                            description="Client notifies backend of completion. Transfer status is updated in PostgreSQL RDS."
                                            icon={CheckCircle}
                                            color="#22c55e"
                                        />
                                    </>
                                ) : (
                                    <>
                                        <FlowStep
                                            number="1"
                                            title="User Requests Download"
                                            description="User clicks download on the React frontend running on AWS EC2."
                                            icon={Smartphone}
                                            color="#e879f9"
                                        />
                                        <FlowStep
                                            number="2"
                                            title="Request Presigned URL"
                                            description="Frontend requests a presigned download URL from Go backend (AWS EC2)."
                                            icon={Server}
                                            color="#6366f1"
                                        />
                                        <FlowStep
                                            number="3"
                                            title="Backend Creates Presigned URL"
                                            description="Go backend verifies transfer status in PostgreSQL RDS, then creates a presigned download URL (5-minute window) from AWS S3."
                                            icon={Clock}
                                            color="#f59e0b"
                                        />
                                        <FlowStep
                                            number="4"
                                            title="URL Returned to Client"
                                            description="Backend returns the presigned URL to the frontend client."
                                            icon={ArrowRight}
                                            color="#6366f1"
                                        />
                                        <FlowStep
                                            number="5"
                                            title="Direct Download from S3"
                                            description="Client downloads the file directly from S3 using the presigned URL via HTTPS. No backend involvement for file transfer."
                                            icon={HardDrive}
                                            color="#22c55e"
                                        />
                                        <FlowStep
                                            number="6"
                                            title="Download Tracked"
                                            description="Download count is incremented in PostgreSQL RDS for analytics."
                                            icon={CheckCircle}
                                            color="#22c55e"
                                        />
                                    </>
                                )}
                            </div>

                            {/* Key Benefits */}
                            <div style={{
                                marginTop: '24px',
                                padding: '16px',
                                background: 'var(--input-bg)',
                                borderRadius: '12px',
                                border: '1px solid var(--color-border)'
                            }}>
                                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '12px' }}>
                                    Key Benefits
                                </h4>
                                <ul style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.6, paddingLeft: '16px', margin: 0 }}>
                                    <li>Presigned URLs expire in <strong>5 minutes</strong> for security</li>
                                    <li>Direct S3 transfer reduces server load</li>
                                    <li>Frontend & Backend run on <strong>AWS EC2</strong></li>
                                    <li>Metadata stored in <strong>PostgreSQL RDS</strong></li>
                                    <li>Secure HTTPS transfer via AWS infrastructure</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default ArchitectureModal;
