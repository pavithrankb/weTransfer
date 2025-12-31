import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Server, Database, HardDrive, Smartphone, Cloud, Globe, FileUp, FileDown, Lock } from 'lucide-react';

const ArchitectureModal = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'download'

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
                            style={{ padding: '8px 24px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: activeTab === 'upload' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'upload' ? 'white' : 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', border: 'none' }}>
                            <FileUp size={14} /> Upload Flow
                        </button>
                        <button onClick={() => setActiveTab('download')}
                            style={{ padding: '8px 24px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: activeTab === 'download' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'download' ? 'white' : 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', border: 'none' }}>
                            <FileDown size={14} /> Download Flow
                        </button>
                    </div>
                    <button onClick={onClose} style={{ padding: '8px', borderRadius: '50%', background: 'transparent', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Canvas Area */}
                <div style={{ flex: 1, position: 'relative', background: 'var(--color-background)', overflow: 'hidden' }}>

                    {/* 1. NODES - Adjusted Positions to reduce overlap */}

                    {/* User Client (Centered Top) */}
                    <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: '20px', zIndex: 20 }}>
                        <Node
                            icon={Smartphone} title="User Client" subTitle="Browser"
                            desc="React App (Vite). Handles file selection, UI."
                            color="#e879f9" x={0} y={0} width={220} // Relative to wrapper
                        />
                    </div>

                    {/* EC2 Group (Left) - Moved Down slightly */}
                    <GroupBox title="AWS EC2 Instance" x={50} y={280} width={380} height={350} color="#6366f1">
                    </GroupBox>
                    <Node
                        icon={Server} title="Go Backend" subTitle="API SERVER"
                        desc="Auth, Metadata, Presigning." color="#6366f1"
                        x={90} y={340} width={200}
                    />
                    <Node
                        icon={Globe} title="Frontend Host" subTitle="NGINX"
                        desc="Static Assets." color="#22c55e"
                        x={90} y={500} width={200}
                    />


                    {/* AWS Data Infra (Right) - Moved Down slightly */}
                    {/* S3 */}
                    <GroupBox title="AWS Cloud Storage" x={550} y={280} width={380} height={350} color="#f59e0b">
                    </GroupBox>
                    <Node
                        icon={HardDrive} title="S3 Bucket" subTitle="Object Storage"
                        desc="Direct File Storage." color="#f59e0b"
                        x={630} y={340} width={220}
                    />
                    {/* RDS */}
                    <Node
                        icon={Database} title="PostgreSQL" subTitle="RDS Database"
                        desc="Metadata & Analytics." color="#3b82f6"
                        x={630} y={500} width={220}
                    />


                    {/* 2. SVG CONNECTIONS - Adjusted for new positions */}
                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 15 }}>
                        <defs>
                            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-primary)" />
                            </marker>
                            <marker id="arrow-success" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-success)" />
                            </marker>
                        </defs>

                        {/* PATHS based on activeTab */}

                        {/* 1. User -> Backend (Metadata) */}
                        {/* Orig: 450,150 -> 200,280. Now Target is lower (y=340 node starts). Target y=340. */}
                        {/* Adjusted curve to avoid label overlap */}
                        <motion.path
                            d="M 450 160 C 400 250, 200 250, 190 340"
                            fill="none" stroke="var(--color-primary)" strokeWidth="3" markerEnd="url(#arrow)"
                            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }}
                        />
                        {/* Moving Dot for Data Flow */}
                        <motion.circle r="4" fill="var(--color-primary)">
                            <animateMotion
                                path="M 450 160 C 400 250, 200 250, 190 340"
                                dur="1.5s" repeatCount="indefinite"
                            />
                        </motion.circle>
                        {/* Label moved left and down */}
                        <foreignObject x="220" y="220" width="120" height="30">
                            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-primary)', borderRadius: '10px', fontSize: '10px', textAlign: 'center', padding: '4px', fontWeight: 'bold' }}>
                                {activeTab === 'upload' ? '1. Req Upload URL' : '1. Get Metadata'}
                            </div>
                        </foreignObject>


                        {/* 2. Backend -> DB (Internal) */}
                        <motion.path
                            d="M 290 410 C 290 500, 630 500, 630 500" // Backend bottom to RDS Top-left
                            fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeDasharray="5,5"
                            initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 0.5 }}
                        />
                        <foreignObject x="400" y="470" width="100" height="30">
                            <div style={{ background: 'var(--input-bg)', color: 'var(--color-text-secondary)', fontSize: '10px', textAlign: 'center', padding: '2px' }}>
                                DB Record
                            </div>
                        </foreignObject>


                        {/* 3. User -> S3 (DIRECT) - The Main Feature */}
                        {/* Start: 550, 160. Target: 740, 340 (S3 Top Center). */}
                        {/* Curve pushed wider to avoid Client Node */}
                        <motion.path
                            d="M 550 160 C 600 220, 740 220, 740 340"
                            fill="none" stroke="var(--color-success)" strokeWidth="3" markerEnd="url(#arrow-success)"
                            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 0.5 }}
                        />
                        {/* Moving Dot for HTTPs Flow */}
                        <motion.circle r="4" fill="var(--color-success)">
                            <animateMotion
                                path="M 550 160 C 600 220, 740 220, 740 340"
                                dur="1s" repeatCount="indefinite"
                            />
                        </motion.circle>
                        {/* Label moved Lower to avoid User Client Node */}
                        <foreignObject x="650" y="210" width="120" height="40">
                            <div style={{ background: 'var(--color-surface)', border: '2px solid var(--color-success)', color: 'var(--color-success)', borderRadius: '10px', fontSize: '10px', textAlign: 'center', padding: '4px', fontWeight: 'bold' }}>
                                <Lock size={10} style={{ marginRight: '4px' }} />
                                {activeTab === 'upload' ? 'DIRECT UPLOAD' : 'DIRECT DOWNLOAD'}
                                <div style={{ fontSize: '9px', opacity: 0.8 }}>HTTPS (Port 443)</div>
                            </div>
                        </foreignObject>

                    </svg>

                </div>
            </motion.div>
        </div>
    );
};

export default ArchitectureModal;
