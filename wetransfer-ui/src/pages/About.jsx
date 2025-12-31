import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Server, Database, HardDrive, Smartphone, Cloud, Globe, FileUp, FileDown, User, Github, Linkedin, Mail, Clock, ArrowRight, CheckCircle, ArrowLeft, Upload, Settings } from 'lucide-react';

const About = () => {
    const [activeTab, setActiveTab] = useState('upload'); // 'upload', 'download', or 'about'

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

    // Node Component for diagram
    const Node = ({ icon: Icon, title, desc, color, subTitle, style = {} }) => (
        <div style={{
            background: 'var(--color-surface)',
            border: '2px solid var(--color-border)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            boxShadow: 'var(--shadow-md)',
            minWidth: '160px',
            ...style
        }}>
            <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: color + '20', color: color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px'
            }}>
                <Icon size={24} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px', color: 'var(--color-text-main)' }}>{title}</h3>
            {subTitle && <span style={{ fontSize: '11px', fontWeight: 600, color: color, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{subTitle}</span>}
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{desc}</p>
        </div>
    );

    // Pulsing Arrow component with animation
    const PulsingArrow = ({ direction = 'right', label, color = 'var(--color-primary)', stepNumber }) => {
        const isVertical = direction === 'down' || direction === 'up';

        return (
            <div style={{
                display: 'flex',
                flexDirection: isVertical ? 'column' : 'row',
                alignItems: 'center',
                gap: '4px',
                padding: isVertical ? '8px 0' : '0 8px',
                position: 'relative'
            }}>
                {/* Animated line with pulse effect */}
                <div style={{
                    position: 'relative',
                    width: isVertical ? '3px' : '80px',
                    height: isVertical ? '50px' : '3px',
                    background: `linear-gradient(${isVertical ? '180deg' : '90deg'}, ${color}40, ${color}, ${color}40)`,
                    borderRadius: '2px',
                    overflow: 'hidden'
                }}>
                    {/* Pulsing dot animation */}
                    <motion.div
                        style={{
                            position: 'absolute',
                            width: isVertical ? '3px' : '20px',
                            height: isVertical ? '20px' : '3px',
                            background: color,
                            borderRadius: '2px',
                            boxShadow: `0 0 10px ${color}, 0 0 20px ${color}`,
                            left: isVertical ? 0 : 0,
                            top: isVertical ? 0 : 0
                        }}
                        animate={{
                            [isVertical ? 'top' : 'left']: isVertical ? ['0%', '100%'] : ['0%', '100%']
                        }}
                        transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            ease: 'linear'
                        }}
                    />
                </div>

                {/* Label */}
                {label && (
                    <motion.span
                        style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: 'white',
                            background: color,
                            padding: '5px 10px',
                            borderRadius: '6px',
                            whiteSpace: 'nowrap',
                            boxShadow: `0 2px 8px ${color}50`
                        }}
                        animate={{
                            scale: [1, 1.02, 1],
                            opacity: [0.9, 1, 0.9]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut'
                        }}
                    >
                        {stepNumber && <span style={{ marginRight: '4px' }}>{stepNumber}.</span>}
                        {label}
                    </motion.span>
                )}

                {/* Arrow head */}
                <motion.div
                    style={{
                        width: 0,
                        height: 0,
                        borderLeft: direction === 'right' ? `10px solid ${color}` : direction === 'down' ? '7px solid transparent' : 'none',
                        borderRight: direction === 'left' ? `10px solid ${color}` : direction === 'down' ? '7px solid transparent' : 'none',
                        borderTop: direction === 'down' ? `10px solid ${color}` : '7px solid transparent',
                        borderBottom: direction === 'up' ? `10px solid ${color}` : direction !== 'down' ? '7px solid transparent' : 'none',
                        filter: `drop-shadow(0 0 4px ${color})`
                    }}
                    animate={{
                        scale: [1, 1.15, 1],
                        opacity: [0.8, 1, 0.8]
                    }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: 'easeInOut'
                    }}
                />
            </div>
        );
    };

    return (
        <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '24px', paddingBottom: '60px' }}>
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '32px'
                }}
            >
                <div>
                    <Link
                        to="/"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'var(--color-text-secondary)',
                            textDecoration: 'none',
                            fontSize: '14px',
                            marginBottom: '12px'
                        }}
                    >
                        <ArrowLeft size={16} />
                        Back to Home
                    </Link>
                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: 800,
                        color: 'var(--color-text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <Cloud size={32} style={{ color: 'var(--color-primary)' }} />
                        System Architecture
                    </h1>
                </div>

                {/* Tab Switcher */}
                <div style={{
                    display: 'flex',
                    background: 'var(--color-surface)',
                    padding: '4px',
                    borderRadius: '12px',
                    border: '1px solid var(--color-border)'
                }}>
                    {[
                        { id: 'upload', label: 'Upload Flow', icon: FileUp },
                        { id: 'download', label: 'Download Flow', icon: FileDown },
                        { id: 'about', label: 'About', icon: User }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontWeight: 600,
                                background: activeTab === tab.id ? 'var(--color-primary)' : 'transparent',
                                color: activeTab === tab.id ? 'white' : 'var(--color-text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                border: 'none',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* About Tab Content */}
            {activeTab === 'about' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ maxWidth: '700px', margin: '0 auto' }}
                >
                    {/* Author Card */}
                    <div style={{
                        background: 'var(--color-surface)',
                        borderRadius: '24px',
                        padding: '48px',
                        border: '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-lg)',
                        textAlign: 'center',
                        marginBottom: '32px'
                    }}>
                        <div style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--color-primary), #a855f7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 28px',
                            boxShadow: '0 12px 40px rgba(99, 102, 241, 0.35)'
                        }}>
                            <User size={56} style={{ color: 'white' }} />
                        </div>

                        <h2 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '8px' }}>
                            Pavithran KB
                        </h2>
                        <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', marginBottom: '20px', maxWidth: '600px', lineHeight: 1.6 }}>
                            Software Engineer specializing in PKI, Certificate Lifecycle Management & Cloud Security
                        </p>


                        {/* AWS Certifications */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '28px' }}>
                            <a
                                href="https://www.credly.com/badges/fe6e0b6b-1a0d-4ed3-8f87-5ed3167d7074/linked_in_profile"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px 18px',
                                    background: 'linear-gradient(135deg, #232f3e 0%, #1a2332 100%)',
                                    borderRadius: '12px',
                                    border: '2px solid #ff9900',
                                    textDecoration: 'none',
                                    transition: 'all 0.3s ease',
                                    boxShadow: '0 4px 15px rgba(255, 153, 0, 0.2)'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 153, 0, 0.35)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 153, 0, 0.2)';
                                }}
                            >
                                <img
                                    src="https://images.credly.com/size/340x340/images/0e284c3f-5164-4b21-8660-0d84737941bc/image.png"
                                    alt="AWS Solutions Architect Associate"
                                    style={{ width: '50px', height: '50px', objectFit: 'contain' }}
                                />
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontSize: '10px', color: '#ff9900', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '2px' }}>AWS CERTIFIED</div>
                                    <div style={{ fontSize: '13px', color: 'white', fontWeight: 600 }}>Solutions Architect</div>
                                    <div style={{ fontSize: '10px', color: '#8899a6' }}>Associate</div>
                                </div>
                            </a>
                            <a
                                href="https://www.credly.com/badges/5259639f-e3dc-446f-9978-9745341aca09/linked_in_profile"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px 18px',
                                    background: 'linear-gradient(135deg, #232f3e 0%, #1a2332 100%)',
                                    borderRadius: '12px',
                                    border: '2px solid #ff9900',
                                    textDecoration: 'none',
                                    transition: 'all 0.3s ease',
                                    boxShadow: '0 4px 15px rgba(255, 153, 0, 0.2)'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 153, 0, 0.35)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 153, 0, 0.2)';
                                }}
                            >
                                <img
                                    src="https://images.credly.com/size/340x340/images/00634f82-b07f-4bbd-a6bb-53de397fc3a6/image.png"
                                    alt="AWS Cloud Practitioner"
                                    style={{ width: '50px', height: '50px', objectFit: 'contain' }}
                                />
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontSize: '10px', color: '#ff9900', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '2px' }}>AWS CERTIFIED</div>
                                    <div style={{ fontSize: '13px', color: 'white', fontWeight: 600 }}>Cloud Practitioner</div>
                                    <div style={{ fontSize: '10px', color: '#8899a6' }}>Foundational</div>
                                </div>
                            </a>
                        </div>


                        {/* Social Links */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '40px' }}>
                            <a
                                href="mailto:pavithrankb2001@gmail.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '14px 24px',
                                    background: 'var(--input-bg)',
                                    border: '2px solid var(--color-border)',
                                    borderRadius: '14px',
                                    color: 'var(--color-text-main)',
                                    textDecoration: 'none',
                                    fontSize: '15px',
                                    fontWeight: 600,
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <Mail size={20} style={{ color: '#ef4444' }} />
                                Email
                            </a>
                            <a
                                href="https://linkedin.com/in/pavithrankb"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '14px 24px',
                                    background: 'var(--input-bg)',
                                    border: '2px solid var(--color-border)',
                                    borderRadius: '14px',
                                    color: 'var(--color-text-main)',
                                    textDecoration: 'none',
                                    fontSize: '15px',
                                    fontWeight: 600,
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <Linkedin size={20} style={{ color: '#0a66c2' }} />
                                LinkedIn
                            </a>
                            <a
                                href="https://github.com/pavithrankb"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '14px 24px',
                                    background: 'var(--input-bg)',
                                    border: '2px solid var(--color-border)',
                                    borderRadius: '14px',
                                    color: 'var(--color-text-main)',
                                    textDecoration: 'none',
                                    fontSize: '15px',
                                    fontWeight: 600,
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <Github size={20} />
                                GitHub
                            </a>
                        </div>

                        {/* Project Description */}
                        <div style={{
                            background: 'var(--input-bg)',
                            borderRadius: '16px',
                            padding: '28px',
                            textAlign: 'left',
                            border: '1px solid var(--color-border)'
                        }}>
                            <h4 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '14px' }}>
                                About This Project
                            </h4>
                            <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                                WeTransfer Clone is a secure file-sharing application built with modern cloud architecture.
                                It features direct S3 uploads using presigned URLs for optimal performance,
                                a Go backend for API handling, and a React frontend for a seamless user experience.
                            </p>
                            <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                {['React', 'Go', 'AWS S3', 'PostgreSQL RDS', 'AWS EC2', 'Presigned URLs'].map(tech => (
                                    <span key={tech} style={{
                                        padding: '8px 14px',
                                        background: 'var(--color-primary-light)',
                                        color: 'var(--color-primary)',
                                        borderRadius: '10px',
                                        fontSize: '13px',
                                        fontWeight: 600
                                    }}>
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Architecture Flow Content */}
            {(activeTab === 'upload' || activeTab === 'download') && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {/* Architecture Diagram */}
                    <div style={{
                        background: 'var(--color-surface)',
                        borderRadius: '24px',
                        padding: '40px',
                        border: '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-lg)',
                        marginBottom: '32px'
                    }}>
                        <h3 style={{
                            fontSize: '18px',
                            fontWeight: 700,
                            color: 'var(--color-text-main)',
                            marginBottom: '32px',
                            textAlign: 'center'
                        }}>
                            {activeTab === 'upload' ? 'Upload Architecture' : 'Download Architecture'}
                        </h3>

                        {/* Diagram Container */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0px',
                            position: 'relative'
                        }}>
                            {/* User Client with arrows originating from it */}
                            <div style={{
                                position: 'relative',
                                zIndex: 3,
                                marginBottom: '70px'  /* Space for arrows */
                            }}>
                                <Node
                                    icon={Smartphone}
                                    title="User Client"
                                    subTitle="Browser"
                                    desc="React App on AWS EC2"
                                    color="#e879f9"
                                />

                                {/* Arrow 1: Originates from bottom-left of User Client, goes to EC2 */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: '-70px',
                                    left: '-60px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center'
                                }}>
                                    <motion.div
                                        style={{
                                            width: '3px',
                                            height: '70px',
                                            background: 'linear-gradient(180deg, #6366f1, #6366f1)',
                                            borderRadius: '2px',
                                            position: 'relative',
                                            boxShadow: '0 0 10px rgba(99, 102, 241, 0.6)'
                                        }}
                                        animate={{ opacity: [0.7, 1, 0.7] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    >
                                        {/* Arrow head at bottom */}
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '-10px',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            width: 0,
                                            height: 0,
                                            borderLeft: '8px solid transparent',
                                            borderRight: '8px solid transparent',
                                            borderTop: '12px solid #6366f1',
                                            filter: 'drop-shadow(0 0 4px #6366f1)'
                                        }} />
                                        {/* Flowing dot */}
                                        <motion.div
                                            style={{
                                                position: 'absolute',
                                                left: '-4px',
                                                width: '10px',
                                                height: '10px',
                                                borderRadius: '50%',
                                                background: '#6366f1',
                                                boxShadow: '0 0 12px #6366f1'
                                            }}
                                            animate={{ top: ['0%', '100%'] }}
                                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                        />
                                    </motion.div>
                                    {/* Label */}
                                    <motion.div
                                        style={{
                                            position: 'absolute',
                                            top: '20px',
                                            left: '-80px',
                                            background: '#6366f1',
                                            color: 'white',
                                            padding: '5px 12px',
                                            borderRadius: '6px',
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            whiteSpace: 'nowrap',
                                            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)'
                                        }}
                                        animate={{ opacity: [0.8, 1, 0.8] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                        1. Request URL
                                    </motion.div>
                                </div>

                                {/* Arrow 5: Originates from bottom-right of User Client, goes to S3 */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: '-70px',
                                    right: '-60px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center'
                                }}>
                                    <motion.div
                                        style={{
                                            width: '3px',
                                            height: '70px',
                                            background: 'linear-gradient(180deg, #22c55e, #22c55e)',
                                            borderRadius: '2px',
                                            position: 'relative',
                                            boxShadow: '0 0 10px rgba(34, 197, 94, 0.6)'
                                        }}
                                        animate={{ opacity: [0.7, 1, 0.7] }}
                                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                                    >
                                        {/* Arrow head at bottom */}
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '-10px',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            width: 0,
                                            height: 0,
                                            borderLeft: '8px solid transparent',
                                            borderRight: '8px solid transparent',
                                            borderTop: '12px solid #22c55e',
                                            filter: 'drop-shadow(0 0 4px #22c55e)'
                                        }} />
                                        {/* Flowing dot */}
                                        <motion.div
                                            style={{
                                                position: 'absolute',
                                                left: '-4px',
                                                width: '10px',
                                                height: '10px',
                                                borderRadius: '50%',
                                                background: '#22c55e',
                                                boxShadow: '0 0 12px #22c55e'
                                            }}
                                            animate={{ top: ['0%', '100%'] }}
                                            transition={{ duration: 1, repeat: Infinity, ease: 'linear', delay: 0.5 }}
                                        />
                                    </motion.div>
                                    {/* Label */}
                                    <motion.div
                                        style={{
                                            position: 'absolute',
                                            top: '20px',
                                            right: '-100px',
                                            background: '#22c55e',
                                            color: 'white',
                                            padding: '5px 12px',
                                            borderRadius: '6px',
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            whiteSpace: 'nowrap',
                                            boxShadow: '0 2px 8px rgba(34, 197, 94, 0.4)'
                                        }}
                                        animate={{ opacity: [0.8, 1, 0.8] }}
                                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                                    >
                                        5. {activeTab === 'upload' ? 'Direct Upload' : 'Direct Download'}
                                    </motion.div>
                                </div>
                            </div>

                            {/* Main row: EC2 Group, Middle Arrows, AWS Cloud Group */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'stretch',
                                gap: '30px',
                                justifyContent: 'center',
                                width: '100%',
                                maxWidth: '900px'
                            }}>
                                {/* Left: AWS EC2 Group */}
                                <div style={{
                                    border: '2px dashed #6366f1',
                                    borderRadius: '20px',
                                    padding: '24px',
                                    background: 'rgba(99, 102, 241, 0.05)',
                                    position: 'relative',
                                    flex: '0 0 220px'
                                }}>
                                    <span style={{
                                        position: 'absolute',
                                        top: '-12px',
                                        left: '20px',
                                        background: '#6366f1',
                                        color: 'white',
                                        padding: '4px 12px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: 700
                                    }}>
                                        AWS EC2 Instance
                                    </span>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
                                        <Node
                                            icon={Server}
                                            title="Go Backend"
                                            subTitle="API Server"
                                            desc={activeTab === 'upload' ? 'Presigned URLs (5-min)' : 'Presigned URLs (configurable)'}
                                            color="#6366f1"
                                        />
                                        <Node
                                            icon={Globe}
                                            title="React Frontend"
                                            subTitle="NGINX"
                                            desc="Static assets"
                                            color="#22c55e"
                                        />
                                    </div>
                                </div>

                                {/* Center: Arrows between Backend and AWS Services */}
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'flex-start',
                                    gap: '20px',
                                    paddingTop: '50px',
                                    flex: '0 0 180px'
                                }}>
                                    {/* Arrow 2: Get Presigned URL */}
                                    <div style={{ position: 'relative' }}>
                                        <motion.div
                                            style={{
                                                height: '3px',
                                                background: 'linear-gradient(90deg, #f59e0b 0%, #f59e0b 40%, #f59e0b40 100%)',
                                                borderRadius: '2px',
                                                position: 'relative',
                                                boxShadow: '0 0 8px rgba(245, 158, 11, 0.5)'
                                            }}
                                            animate={{ opacity: [0.6, 1, 0.6] }}
                                            transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
                                        >
                                            {/* Arrow head */}
                                            <div style={{
                                                position: 'absolute',
                                                right: '-6px',
                                                top: '-5px',
                                                width: 0,
                                                height: 0,
                                                borderTop: '7px solid transparent',
                                                borderBottom: '7px solid transparent',
                                                borderLeft: '10px solid #f59e0b'
                                            }} />
                                            {/* Flowing dot */}
                                            <motion.div
                                                style={{
                                                    position: 'absolute',
                                                    width: '10px',
                                                    height: '10px',
                                                    borderRadius: '50%',
                                                    background: '#f59e0b',
                                                    boxShadow: '0 0 12px #f59e0b',
                                                    top: '-4px'
                                                }}
                                                animate={{ left: ['0%', '100%'] }}
                                                transition={{ duration: 1, repeat: Infinity, ease: 'linear', delay: 0.2 }}
                                            />
                                        </motion.div>
                                        <motion.div
                                            style={{
                                                marginTop: '8px',
                                                background: '#f59e0b',
                                                color: 'white',
                                                padding: '5px 10px',
                                                borderRadius: '6px',
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                textAlign: 'center',
                                                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)'
                                            }}
                                            animate={{ opacity: [0.8, 1, 0.8] }}
                                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                                        >
                                            2. Get Presigned URL
                                        </motion.div>
                                    </div>

                                    {/* Arrow 3: Store Metadata */}
                                    <div style={{ position: 'relative' }}>
                                        <motion.div
                                            style={{
                                                height: '3px',
                                                background: 'linear-gradient(90deg, #3b82f6 0%, #3b82f6 40%, #3b82f640 100%)',
                                                borderRadius: '2px',
                                                position: 'relative',
                                                boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)'
                                            }}
                                            animate={{ opacity: [0.6, 1, 0.6] }}
                                            transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
                                        >
                                            {/* Arrow head */}
                                            <div style={{
                                                position: 'absolute',
                                                right: '-6px',
                                                top: '-5px',
                                                width: 0,
                                                height: 0,
                                                borderTop: '7px solid transparent',
                                                borderBottom: '7px solid transparent',
                                                borderLeft: '10px solid #3b82f6'
                                            }} />
                                            {/* Flowing dot */}
                                            <motion.div
                                                style={{
                                                    position: 'absolute',
                                                    width: '10px',
                                                    height: '10px',
                                                    borderRadius: '50%',
                                                    background: '#3b82f6',
                                                    boxShadow: '0 0 12px #3b82f6',
                                                    top: '-4px'
                                                }}
                                                animate={{ left: ['0%', '100%'] }}
                                                transition={{ duration: 1, repeat: Infinity, ease: 'linear', delay: 0.4 }}
                                            />
                                        </motion.div>
                                        <motion.div
                                            style={{
                                                marginTop: '8px',
                                                background: '#3b82f6',
                                                color: 'white',
                                                padding: '5px 10px',
                                                borderRadius: '6px',
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                textAlign: 'center',
                                                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)'
                                            }}
                                            animate={{ opacity: [0.8, 1, 0.8] }}
                                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                                        >
                                            3. Store Metadata
                                        </motion.div>
                                    </div>

                                    {/* Arrow 4: URL Returned (now in the same area as arrows 2 and 3) */}
                                    <div style={{ position: 'relative' }}>
                                        <motion.div
                                            style={{
                                                height: '3px',
                                                background: 'linear-gradient(270deg, #6366f1 0%, #6366f1 40%, #6366f140 100%)',
                                                borderRadius: '2px',
                                                position: 'relative',
                                                boxShadow: '0 0 8px rgba(99, 102, 241, 0.5)'
                                            }}
                                            animate={{ opacity: [0.6, 1, 0.6] }}
                                            transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                                        >
                                            {/* Arrow head - pointing left */}
                                            <div style={{
                                                position: 'absolute',
                                                left: '-6px',
                                                top: '-5px',
                                                width: 0,
                                                height: 0,
                                                borderTop: '7px solid transparent',
                                                borderBottom: '7px solid transparent',
                                                borderRight: '10px solid #6366f1'
                                            }} />
                                            {/* Flowing dot */}
                                            <motion.div
                                                style={{
                                                    position: 'absolute',
                                                    width: '10px',
                                                    height: '10px',
                                                    borderRadius: '50%',
                                                    background: '#6366f1',
                                                    boxShadow: '0 0 12px #6366f1',
                                                    top: '-4px'
                                                }}
                                                animate={{ right: ['0%', '100%'] }}
                                                transition={{ duration: 1, repeat: Infinity, ease: 'linear', delay: 0.6 }}
                                            />
                                        </motion.div>
                                        <motion.div
                                            style={{
                                                marginTop: '8px',
                                                background: '#6366f1',
                                                color: 'white',
                                                padding: '5px 10px',
                                                borderRadius: '6px',
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                textAlign: 'center',
                                                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)',
                                                border: '1px dashed rgba(255,255,255,0.3)'
                                            }}
                                            animate={{ opacity: [0.7, 1, 0.7] }}
                                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                                        >
                                            4. URL Returned
                                        </motion.div>
                                    </div>
                                </div>

                                {/* Right: AWS Cloud Services Group */}
                                <div style={{
                                    border: '2px dashed #f59e0b',
                                    borderRadius: '20px',
                                    padding: '24px',
                                    background: 'rgba(245, 158, 11, 0.05)',
                                    position: 'relative',
                                    flex: '0 0 220px'
                                }}>
                                    <span style={{
                                        position: 'absolute',
                                        top: '-12px',
                                        left: '20px',
                                        background: '#f59e0b',
                                        color: 'white',
                                        padding: '4px 12px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: 700
                                    }}>
                                        AWS Cloud Services
                                    </span>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
                                        <Node
                                            icon={HardDrive}
                                            title="S3 Bucket"
                                            subTitle="Object Storage"
                                            desc="Direct file transfer"
                                            color="#f59e0b"
                                        />
                                        <Node
                                            icon={Database}
                                            title="PostgreSQL"
                                            subTitle="AWS RDS"
                                            desc="Metadata & Analytics"
                                            color="#3b82f6"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Flow Steps */}
                    <div style={{
                        background: 'var(--color-surface)',
                        borderRadius: '24px',
                        padding: '32px',
                        border: '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-lg)'
                    }}>
                        <h3 style={{
                            fontSize: '18px',
                            fontWeight: 700,
                            color: 'var(--color-text-main)',
                            marginBottom: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            {activeTab === 'upload' ? <FileUp size={20} style={{ color: 'var(--color-primary)' }} /> : <FileDown size={20} style={{ color: 'var(--color-primary)' }} />}
                            {activeTab === 'upload' ? 'Upload Flow Steps' : 'Download Flow Steps'}
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                            {activeTab === 'upload' ? (
                                <>
                                    <FlowStep
                                        number="1"
                                        title="Request Upload URL"
                                        description="User selects a file and the React frontend sends a request to the Go backend (AWS EC2) to generate a presigned upload URL."
                                        icon={Smartphone}
                                        color="#e879f9"
                                    />
                                    <FlowStep
                                        number="2"
                                        title="Backend Contacts AWS S3"
                                        description="Go backend communicates with AWS S3 to create a presigned URL valid for 5 minutes. This URL grants temporary, secure upload access."
                                        icon={HardDrive}
                                        color="#f59e0b"
                                    />
                                    <FlowStep
                                        number="3"
                                        title="Store Metadata in PostgreSQL"
                                        description="Transfer metadata (filename, size, expiry, etc.) is stored in PostgreSQL RDS for tracking and management."
                                        icon={Database}
                                        color="#3b82f6"
                                    />
                                    <FlowStep
                                        number="4"
                                        title="URL Returned to Client"
                                        description="The presigned URL is returned to the frontend client, ready for direct upload."
                                        icon={ArrowRight}
                                        color="#6366f1"
                                    />
                                    <FlowStep
                                        number="5"
                                        title="Client Uploads Directly to S3"
                                        description="The UI automatically uploads the file directly to AWS S3 using the presigned URL via HTTPS. Backend is completely bypassed for the file transfer."
                                        icon={Upload}
                                        color="#22c55e"
                                    />
                                </>
                            ) : (
                                <>
                                    <FlowStep
                                        number="1"
                                        title="Request Download URL"
                                        description="User clicks download on the React frontend, which sends a request to the Go backend (AWS EC2) to generate a presigned download URL."
                                        icon={Smartphone}
                                        color="#e879f9"
                                    />
                                    <FlowStep
                                        number="2"
                                        title="Backend Contacts AWS S3"
                                        description="Go backend verifies transfer status, then communicates with AWS S3 to create a presigned download URL with configurable expiry time."
                                        icon={HardDrive}
                                        color="#f59e0b"
                                    />
                                    <FlowStep
                                        number="3"
                                        title="Update Metadata in PostgreSQL"
                                        description="Download count is incremented and access is logged in PostgreSQL RDS for analytics and tracking."
                                        icon={Database}
                                        color="#3b82f6"
                                    />
                                    <FlowStep
                                        number="4"
                                        title="URL Returned to Client"
                                        description="The presigned download URL is returned to the frontend client."
                                        icon={ArrowRight}
                                        color="#6366f1"
                                    />
                                    <FlowStep
                                        number="5"
                                        title="Client Downloads Directly from S3"
                                        description="The browser downloads the file directly from AWS S3 using the presigned URL via HTTPS. No backend involvement for the file transfer."
                                        icon={FileDown}
                                        color="#22c55e"
                                    />
                                </>
                            )}
                        </div>

                        {/* Key Benefits */}
                        <div style={{
                            marginTop: '28px',
                            padding: '20px',
                            background: 'var(--input-bg)',
                            borderRadius: '14px',
                            border: '1px solid var(--color-border)'
                        }}>
                            <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '14px' }}>
                                Key Benefits
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                {(activeTab === 'upload' ? [
                                    { icon: Clock, text: 'Upload URLs expire in 5 minutes', color: '#f59e0b' },
                                    { icon: HardDrive, text: 'Direct S3 upload bypasses server', color: '#22c55e' },
                                    { icon: Server, text: 'Frontend & Backend on AWS EC2', color: '#6366f1' },
                                    { icon: Database, text: 'Metadata stored in PostgreSQL RDS', color: '#3b82f6' },
                                    { icon: Globe, text: 'Secure HTTPS transfer via AWS', color: '#e879f9' },
                                    { icon: CheckCircle, text: 'Scalable cloud architecture', color: '#22c55e' }
                                ] : [
                                    { icon: Settings, text: 'Download URL expiry is configurable', color: '#f59e0b' },
                                    { icon: HardDrive, text: 'Direct S3 download bypasses server', color: '#22c55e' },
                                    { icon: Server, text: 'Frontend & Backend on AWS EC2', color: '#6366f1' },
                                    { icon: Database, text: 'Download analytics in PostgreSQL', color: '#3b82f6' },
                                    { icon: Globe, text: 'Secure HTTPS transfer via AWS', color: '#e879f9' },
                                    { icon: CheckCircle, text: 'Scalable cloud architecture', color: '#22c55e' }
                                ]).map((benefit, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <benefit.icon size={16} style={{ color: benefit.color, flexShrink: 0 }} />
                                        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{benefit.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default About;
