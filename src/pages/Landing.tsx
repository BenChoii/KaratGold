import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, ArrowRight, CheckCircle2, Instagram, Loader2, Search, Coins, Clock, Cpu, ArrowUpRight, MapPin, Activity, Heart, Zap, Sparkles, Camera } from 'lucide-react'
import { useState, useEffect, useRef, type MouseEvent } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import SplineScene from '@splinetool/react-spline'
import { TreasuryTracker } from '../components/TreasuryTracker'
import './Landing.css'

/* ===== ANIMATION VARIANTS ===== */
const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            delay: i * 0.12,
            duration: 0.7,
            ease: [0.16, 1, 0.3, 1]
        }
    })
}

/* ===== PHONE MOCKUP ===== */

/* ===== VERIFY CARD ===== */
function VerifyCard() {
    const checks = ['Hashtag #ad present', 'Business tagged', 'Photo quality', 'Location match']
    const [phase, setPhase] = useState(0)

    useEffect(() => {
        const t = setInterval(() => setPhase(p => (p + 1) % 6), 1200)

        return () => clearInterval(t)
    }, [])

    return (
        <div className="scene-verify hiw-card">
            <div className="verify-inner">
                <motion.div
                    className="scanner-line"
                    animate={{ top: ['0%', '100%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                />
                <div className="verify-checks">
                    {checks.map((c, i) => {
                        const done = phase > i + 1
                        const active = phase === i + 1

                        return (
                            <div key={i} className={`verify-row ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
                                <span className="verify-row-icon">
                                    {done ? <CheckCircle2 size={18} /> : active ? <Loader2 size={18} className="spinning" /> : <span className="check-pending" />}
                                </span>
                                <span className="verify-row-label">{c}</span>
                            </div>
                        )
                    })}
                </div>
                {phase >= 5 && (
                    <motion.div
                        className="verify-result"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                        ✅ Post Verified
                    </motion.div>
                )}
            </div>
        </div>
    )
}

/* ===== GOLD WALLET CARD ===== */
function GoldPileCard() {
    const [showDetails, setShowDetails] = useState(false)
    const goldPriceData = useQuery(api.goldPrice.getGoldPrice)
    const paxgCad = goldPriceData?.paxgCad ?? (93.47 * 31.1035)
    const rewardValue = (0.003 * paxgCad).toFixed(2)

    useEffect(() => {
        const t = setTimeout(() => setShowDetails(true), 1200)

        return () => clearTimeout(t)
    }, [])

    return (
        <div className="scene-gold hiw-card">
            <div className="gold-glow-bg" />
            <div className="gold-wallet-inner">
                {/* Wallet header */}
                <div className="gold-wallet-header">
                    <div className="gold-wallet-icon">
                        <Coins size={16} />
                    </div>
                    <div className="gold-wallet-header-text">
                        <span className="gold-wallet-label">Your Gold Wallet</span>
                        <span className="gold-wallet-balance">0.010 oz</span>
                    </div>
                </div>

                {/* Reward notification */}
                <motion.div
                    className="gold-reward-notif"
                    initial={{ opacity: 0, y: 12, scale: 0.96 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.5, type: "spring", stiffness: 140 }}
                    viewport={{ once: true }}
                >
                    <div className="gold-notif-dot" />
                    <div className="gold-notif-content">
                        <span className="gold-notif-title">Reward Received <Sparkles size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /></span>
                        <span className="gold-notif-amount">+ 0.003 oz Gold</span>
                    </div>
                    <span className="gold-notif-time">Just now</span>
                </motion.div>

                {/* Breakdown */}
                {showDetails && (
                    <motion.div
                        className="gold-breakdown"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="gold-breakdown-row">
                            <span>Post reward</span>
                            <span className="gold-breakdown-val">0.002 oz</span>
                        </div>
                        <div className="gold-breakdown-row">
                            <span>Quality bonus</span>
                            <span className="gold-breakdown-val accent">+0.001 oz</span>
                        </div>
                        <div className="gold-breakdown-divider" />
                        <div className="gold-breakdown-row total">
                            <span>Total earned</span>
                            <span className="gold-breakdown-val">0.003 oz</span>
                        </div>
                    </motion.div>
                )}

                {/* Value tag */}
                <motion.div
                    className="gold-value-pill"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    viewport={{ once: true }}
                >
                    <span>≈ ${rewardValue} CAD</span>
                    <span className="gold-value-dot">·</span>
                    <span className="gold-value-backed">Backed by real bullion</span>
                </motion.div>
            </div>
        </div>
    )
}

/* ===== SPARKLINE ===== */
function GoldSparkline() {

    return (
        <svg className="gold-sparkline" viewBox="0 0 200 40" width="200" height="40">
            <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d="M0,35 L20,30 L40,32 L60,25 L80,28 L100,18 L120,20 L140,12 L160,15 L180,8 L200,5" fill="none" stroke="var(--accent)" strokeWidth="2" />
            <path d="M0,35 L20,30 L40,32 L60,25 L80,28 L100,18 L120,20 L140,12 L160,15 L180,8 L200,5 L200,40 L0,40 Z" fill="url(#sparkGrad)" />
        </svg>
    )
}

/* ===== MAP CARD ===== */
function MapCard() {

    return (
        <div className="scene-map hiw-card">
            <div className="map-card-inner">
                <div className="map-search-bar">
                    <Search size={14} className="text-tertiary" />
                    <span>Search businesses, trades, or locations...</span>
                </div>

                <div className="map-pins-container">
                    <motion.div
                        className="map-pin-badge"
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        viewport={{ once: true }}
                        style={{ top: '25%', left: '20%' }}
                    >
                        <div className="map-pin-pulse" />
                        <span className="pin-title">Café</span>
                        <span className="pin-reward">0.011 oz</span>
                    </motion.div>

                    <motion.div
                        className="map-pin-badge"
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5, type: "spring" }}
                        viewport={{ once: true }}
                        style={{ top: '55%', right: '15%' }}
                    >
                        <div className="map-pin-pulse" style={{ animationDelay: '1s' }} />
                        <span className="pin-title">Brewery</span>
                        <span className="pin-reward">0.016 oz</span>
                    </motion.div>

                    <motion.div
                        className="map-pin-badge"
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8, type: "spring" }}
                        viewport={{ once: true }}
                        style={{ bottom: '20%', left: '35%' }}
                    >
                        <div className="map-pin-pulse" style={{ animationDelay: '2s' }} />
                        <span className="pin-title">Barber</span>
                        <span className="pin-reward">0.008 oz</span>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}

/* ===== ANIMATED COUNTER ===== */
function AnimatedCounter({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
    const [count, setCount] = useState(0)
    const ref = useRef<HTMLSpanElement>(null)
    const hasAnimated = useRef(false)

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !hasAnimated.current) {
                    hasAnimated.current = true
                    const duration = 1500
                    const startTime = Date.now()
                    const animate = () => {
                        const elapsed = Date.now() - startTime
                        const progress = Math.min(elapsed / duration, 1)
                        const eased = 1 - Math.pow(1 - progress, 3)
                        setCount(value * eased)
                        if (progress < 1) requestAnimationFrame(animate)
                    }
                    requestAnimationFrame(animate)
                }
            },
            { threshold: 0.5 }
        )
        if (ref.current) observer.observe(ref.current)

        return () => observer.disconnect()
    }, [value])

    return <span ref={ref}>{prefix}{count.toFixed(2)}{suffix}</span>
}

/* ===== INTERACTIVE ROI CALCULATOR ===== */
function ROICalculator() {
    const [budget, setBudget] = useState(500);
    const payoutPerPost = 10; // $10 CAD minimum per post

    const guaranteedPosts = Math.floor(budget / payoutPerPost);
    const estimatedImpressions = guaranteedPosts * 450; // Conservative 450 views per local follower

    return (
        <section id="for-business" className="roi-calculator-section">
            <div className="container">
                <div className="roi-header">
                    <p className="text-caption text-accent">For Businesses</p>
                    <h2 className="text-h2">Stop guessing. Predict your growth.</h2>
                    <p className="roi-subtitle">See exactly what your marketing budget buys when you pay for performance instead of impressions.</p>
                </div>

                <div className="roi-interactive-card">
                    <div className="roi-glass-glow"></div>

                    <div className="roi-slider-area">
                        <div className="roi-slider-labels">
                            <span className="slider-label-title">Expected Monthly Budget</span>
                            <span className="slider-label-value">${budget}</span>
                        </div>
                        <input
                            type="range"
                            min="100"
                            max="5000"
                            step="50"
                            value={budget}
                            onChange={(e) => setBudget(Number(e.target.value))}
                            className="roi-range-slider"
                        />
                        <div className="slider-ticks">
                            <span>$100</span>
                            <span>$5000</span>
                        </div>
                    </div>

                    <div className="roi-results-grid">
                        <div className="roi-result-col traditional">
                            <div className="roi-col-header">
                                <span className="method-label">Traditional Ads</span>
                                <span className="method-sub">FB / IG / Google</span>
                            </div>
                            <div className="roi-metrics">
                                <div className="roi-metric">
                                    <div className="metric-header">
                                        <div className="metric-value">${(budget * 0.4).toFixed(0)}</div>
                                        <span className="metric-name">Wasted on Bot Traffic/Ad Blockers (40% industry avg)</span>
                                    </div>
                                    <div className="metric-bar-bg"><div className="metric-bar-fill highlight-trad" style={{ width: '40%' }}></div></div>
                                </div>
                                <div className="roi-metric">
                                    <div className="metric-header">
                                        <div className="metric-value">{(budget * 80).toLocaleString()}</div>
                                        <span className="metric-name">Temporary Scroll-By Impressions</span>
                                    </div>
                                    <div className="metric-bar-bg"><div className="metric-bar-fill highlight-trad" style={{ width: `${Math.min(100, (budget / 5000) * 100)}%` }}></div></div>
                                </div>
                                <div className="roi-metric">
                                    <div className="metric-header">
                                        <div className="metric-value">0</div>
                                        <span className="metric-name">Authentic User Generated Content</span>
                                    </div>
                                    <div className="metric-bar-bg"><div className="metric-bar-fill highlight-trad" style={{ width: '0%' }}></div></div>
                                </div>
                            </div>
                        </div>

                        <div className="roi-vs-badge">VS</div>

                        <div className="roi-result-col karat">
                            <div className="roi-col-header">
                                <span className="method-label highlight">Karat Gold Protocol</span>
                                <span className="method-sub">Pay-per-performance</span>
                            </div>
                            <div className="roi-metrics">
                                <div className="roi-metric">
                                    <div className="metric-header">
                                        <div className="metric-value highlight">{guaranteedPosts}</div>
                                        <span className="metric-name">Authentic Customer Posts</span>
                                    </div>
                                    <div className="metric-bar-bg"><div className="metric-bar-fill highlight-gold" style={{ width: `${Math.min(100, (budget / 5000) * 100)}%` }}></div></div>
                                </div>
                                <div className="roi-metric">
                                    <div className="metric-header">
                                        <div className="metric-value">~{estimatedImpressions.toLocaleString()}</div>
                                        <span className="metric-name">High-Trust Local Views</span>
                                    </div>
                                    <div className="metric-bar-bg"><div className="metric-bar-fill highlight-gold" style={{ width: `${Math.min(100, (estimatedImpressions / 150000) * 100)}%` }}></div></div>
                                </div>
                                <div className="roi-metric">
                                    <div className="metric-header">
                                        <div className="metric-value">{guaranteedPosts}</div>
                                        <span className="metric-name">Permanent Content Assets</span>
                                    </div>
                                    <div className="metric-bar-bg"><div className="metric-bar-fill highlight-gold" style={{ width: `${Math.min(100, (budget / 5000) * 100)}%` }}></div></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="roi-disclaimer">
                        *Estimates based on a minimum reward of $10 CAD per post, and a conservative baseline of 450 views per local creator.
                    </div>
                </div>
            </div>
        </section>
    )
}

/* ===== LANDING PAGE ===== */
function Landing() {
    const goldPriceData = useQuery(api.goldPrice.getGoldPrice)
    const paxgCad = goldPriceData?.paxgCad ?? (93.47 * 31.1035)

    // Scroll tracker for HIW section and Bento mouse tracker
    const [activeHiwStep, setActiveHiwStep] = useState(0);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const boxes = document.querySelectorAll('.glow-hover');
            boxes.forEach(box => {
                const rect = (box as HTMLElement).getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                (box as HTMLElement).style.setProperty('--mouse-x', `${x}px`);
                (box as HTMLElement).style.setProperty('--mouse-y', `${y}px`);
            });
        };

        const handleScroll = () => {
            const stepElements = document.querySelectorAll('.hiw-step-desc-wrap');
            let currentStep = 0;
            stepElements.forEach((el, index) => {
                const rect = el.getBoundingClientRect();
                // Check if element is in the active reading zone (top 60% of viewport)
                if (rect.top < window.innerHeight * 0.6 && rect.bottom > 0) {
                    currentStep = index;
                }
            });
            setActiveHiwStep(currentStep);
        };

        // Attach events
        window.addEventListener('mousemove', handleMouseMove as any);
        window.addEventListener('scroll', handleScroll, { passive: true });

        // Initial check
        handleScroll();

        return () => {
            window.removeEventListener('mousemove', handleMouseMove as any);
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return (
        <div className="landing">
            {/* ===== HERO — Bento ===== */}
            <section className="hero">
                <div className="hero-bg-grid" />
                <div className="hero-gold-waves" />
                <div className="hero-glow" />
                <div className="hero-glow-right" />
                <div className="hero-vineyard-corner">
                    <img src="/assets/hero-vineyard-corner.png" alt="" />
                </div>

                <div className="container hero-bento">
                    {/* LEFT: Copy */}
                    <div className="hero-copy">
                        <motion.h1
                            className="text-display hero-title"
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.2 }}
                        >
                            Earn <span className="text-gradient">Gold</span> for
                            <br />
                            Supporting Okanagan
                            <br />
                            Local Businesses
                        </motion.h1>

                        <motion.p
                            className="hero-subtitle"
                            initial={{ opacity: 0, y: 25 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 100, damping: 22, delay: 0.4 }}
                        >
                            Support Okanagan businesses you love.
                            <br />
                            Earn real fractional gold.
                        </motion.p>

                        <motion.div
                            className="hero-ctas"
                            initial={{ opacity: 0, y: 25 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 100, damping: 22, delay: 0.55 }}
                        >
                            <Link to="/explore" className="btn btn-primary btn-lg">
                                Start Mining Gold
                            </Link>
                            <a href="#how-it-works" className="btn btn-outline-green btn-lg">
                                How It Works
                            </a>
                        </motion.div>
                    </div>

                    {/* RIGHT: Spline 3D Dominos Scene */}
                    <motion.div
                        className="hero-spline-area"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 80, damping: 22, delay: 0.3 }}
                    >
                        {/* Gold tint overlay */}
                        <div className="spline-gold-overlay" />

                        <div className="spline-container">
                            <SplineScene
                                scene="https://prod.spline.design/E4RB9iwXIiTqiaM2/scene.splinecode"
                                className="hero-spline"
                            />
                        </div>

                        {/* Pill bubble covering the Spline watermark */}
                        <div className="spline-watermark-bubble">
                            ✦ Powered by Karat Gold
                        </div>

                        {/* Floating flow labels */}
                        <motion.div
                            className="spline-flow-label spline-label-post"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 1.2, duration: 0.6 }}
                        >
                            <Camera size={14} />
                            <span>Post</span>
                        </motion.div>
                        <motion.div
                            className="spline-flow-label spline-label-verify"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 1.5, duration: 0.6 }}
                        >
                            <Cpu size={14} />
                            <span>Verify</span>
                        </motion.div>
                        <motion.div
                            className="spline-flow-label spline-label-earn"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.8, duration: 0.6 }}
                        >
                            <Coins size={14} />
                            <span>Earn Gold</span>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* ===== GLOBAL TREASURY TRACKER ===== */}
            <section className="treasury-section" style={{ padding: '0 20px', position: 'relative', marginTop: '-40px', zIndex: 20 }}>
                <TreasuryTracker />
            </section>

            {/* ===== TRUST & TECHNOLOGY PARTNERS ===== */}
            <section className="trust-section">
                <div className="trust-section-inner">
                    <div className="trust-marquee-strip">
                        <div className="marquee-track">
                            <div className="marquee-items">
                                <span className="marquee-item"><ShieldCheck size={14} /> LBMA-Certified Gold</span>
                                <span className="marquee-dot">·</span>
                                <span className="marquee-item"><Cpu size={14} /> AI-Powered Verification</span>
                                <span className="marquee-dot">·</span>
                                <span className="marquee-item"><Instagram size={14} /> Instagram Verified</span>
                                <span className="marquee-dot">·</span>
                                <span className="marquee-item"><Clock size={14} /> Instant Payouts</span>
                                <span className="marquee-dot">·</span>
                                <span className="marquee-item"><Activity size={14} /> Zero Wasted Spend</span>
                                {/* duplicate for loop */}
                                <span className="marquee-dot">·</span>
                                <span className="marquee-item"><ShieldCheck size={14} /> LBMA-Certified Gold</span>
                                <span className="marquee-dot">·</span>
                                <span className="marquee-item"><Cpu size={14} /> AI-Powered Verification</span>
                                <span className="marquee-dot">·</span>
                                <span className="marquee-item"><Instagram size={14} /> Instagram Verified</span>
                                <span className="marquee-dot">·</span>
                                <span className="marquee-item"><Clock size={14} /> Instant Payouts</span>
                                <span className="marquee-dot">·</span>
                                <span className="marquee-item"><Activity size={14} /> Zero Wasted Spend</span>
                            </div>
                        </div>
                    </div>

                    <div className="trust-partners">
                        <p className="trust-partners-label">Powered by industry leaders</p>
                        <div className="trust-partners-row">
                            <div className="trust-partner">
                                <span className="partner-name">stripe</span>
                                <span className="partner-role">Payments</span>
                            </div>
                            <div className="trust-partner-divider" />
                            <div className="trust-partner">
                                <span className="partner-name">Paxos</span>
                                <span className="partner-role">Gold Custody</span>
                            </div>
                            <div className="trust-partner-divider" />
                            <div className="trust-partner">
                                <span className="partner-name">LBMA</span>
                                <span className="partner-role">Gold Standard</span>
                            </div>
                            <div className="trust-partner-divider" />
                            <div className="trust-partner">
                                <span className="partner-name">OKTD</span>
                                <span className="partner-role">Partner</span>
                            </div>
                            <div className="trust-partner-divider" />
                            <div className="trust-partner">
                                <span className="partner-name">Solana</span>
                                <span className="partner-role">Blockchain</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== SECTION 2: STICKY HOW IT WORKS ===== */}
            <section id="how-it-works" className="sticky-hiw-section">
                <div className="container sticky-hiw-grid">
                    {/* LEFT: Contextual Sticky Text */}
                    <div className="hiw-copy-column">
                        <motion.div
                            className="section-header"
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-100px" }}
                            variants={fadeUp}
                            custom={0}
                        >
                            <p className="text-caption" style={{ color: 'var(--accent-dark)' }}>How It Works</p>
                            <h2 className="text-h1" style={{ marginTop: 'var(--space-3)' }}>Three steps.<br />Real gold.</h2>
                            <p className="text-body" style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-4)' }}>
                                From posting to earning — every step is designed to feel effortless and instant.
                            </p>
                        </motion.div>

                        <div className="hiw-steps-text">
                            <div className={`hiw-step-desc hiw-step-desc-wrap ${activeHiwStep === 0 ? 'active' : ''}`}>
                                <h3>01. Hunt Local Bounties</h3>
                                <p>Open the Explore map and find local Okanagan businesses paying bounties for authentic social posts.</p>
                            </div>
                            <div className="hiw-step-spacer hide-mobile"></div>
                            <div className={`hiw-step-desc hiw-step-desc-wrap ${activeHiwStep === 1 ? 'active' : ''}`}>
                                <h3>02. Snap, Tag, Publish</h3>
                                <p>Visit the business, snap a photo, and post it to Instagram or Facebook. Tag the business and include #ad.</p>
                            </div>
                            <div className="hiw-step-spacer hide-mobile"></div>
                            <div className={`hiw-step-desc hiw-step-desc-wrap ${activeHiwStep === 2 ? 'active' : ''}`}>
                                <h3>03. Instant Verification & Gold</h3>
                                <p>Our AI automatically verifies your post instantly. Fractions of an audited LBMA gold ounce are credited directly to your digital ledger.</p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Scrollable UI Cards inside a persistent iPhone Frame */}
                    <div className="hiw-visual-column">
                        <div className="hiw-iphone-frame">
                            <div className="iphone-notch"></div>
                            <div className="iphone-screen">
                                <div className={`hiw-step-screen ${activeHiwStep === 0 ? 'active' : ''}`}>
                                    <MapCard />
                                </div>
                                <div className={`hiw-step-screen ${activeHiwStep === 1 ? 'active' : ''}`}>
                                    <VerifyCard />
                                </div>
                                <div className={`hiw-step-screen ${activeHiwStep === 2 ? 'active' : ''}`}>
                                    <GoldPileCard />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== SECTION 3: BENTO VALUE PROP ===== */}
            <section id="about" className="values-bento-section">
                <div className="container">
                    <div className="bento-grid">

                        {/* BOX 1: Social Capital (Large Horizontal) */}
                        <motion.div
                            className="bento-box bento-large-h glow-hover"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                        >

                            {/* NEW: Left-side Visual (Animated Gold & Social Cards) */}
                            <div className="bento-visual-stacked">
                                <motion.div
                                    className="bento-floating-card bc-1"
                                    animate={{ y: [0, -12, 0], rotate: [-4, 0, -4] }}
                                    transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
                                >
                                    <Heart size={16} className="text-pink-500" fill="currentColor" />
                                    <span>24.5k Likes</span>
                                </motion.div>
                                <motion.div
                                    className="bento-floating-card bc-2"
                                    animate={{ y: [0, 15, 0], rotate: [4, 8, 4] }}
                                    transition={{ repeat: Infinity, duration: 5.5, ease: "easeInOut", delay: 1 }}
                                >
                                    <Instagram size={16} style={{ color: '#E1306C' }} />
                                    <span>#ad tagged</span>
                                </motion.div>
                                <motion.div
                                    className="bento-visual-core css-coin-wrapper"
                                    animate={{ scale: [1, 1.05, 1], y: [0, -10, 0] }}
                                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                >
                                    <div className="core-glow-ring"></div>
                                    <div className="css-gold-coin">
                                        <div className="coin-inner">
                                            <div className="coin-face">
                                                <span className="coin-symbol">K</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            <div className="bento-content">
                                <div>
                                    <h3 className="bento-title">Your Social Capital,<br />Monetized.</h3>
                                    <p className="bento-desc">You are already posting. Now get paid what your influence is worth in absolute scarcity: actual physical gold.</p>
                                </div>
                                <div className="bento-stat-highlight">
                                    <div className="stat-label">Total Gold Minted</div>
                                    <div className="stat-value"><AnimatedCounter value={124.58} suffix="g" /></div>
                                </div>
                            </div>
                            <div className="bento-bg-decor bento-bg-1" />
                        </motion.div>

                        {/* BOX 2: Instant Payouts (Medium Square) */}
                        <motion.div
                            className="bento-box bento-med bento-instant glow-hover"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ delay: 0.15 }}
                        >
                            <div className="bento-glow-blob"></div>
                            <div className="bento-instant-ticker">
                                <div className="ticker-track">
                                    <div className="ticker-item"><CheckCircle2 size={12} className="text-secondary" /> <span>@sarah paid 0.022 oz</span></div>
                                    <div className="ticker-item"><CheckCircle2 size={12} className="text-secondary" /> <span>@mike paid 0.011 oz</span></div>
                                    <div className="ticker-item"><CheckCircle2 size={12} className="text-secondary" /> <span>@alex paid 0.015 oz</span></div>
                                    <div className="ticker-item"><CheckCircle2 size={12} className="text-secondary" /> <span>@sarah paid 0.022 oz</span></div>
                                    <div className="ticker-item"><CheckCircle2 size={12} className="text-secondary" /> <span>@mike paid 0.011 oz</span></div>
                                    <div className="ticker-item"><CheckCircle2 size={12} className="text-secondary" /> <span>@alex paid 0.015 oz</span></div>
                                </div>
                            </div>
                            <div className="bento-icon-ring instagram-ring">
                                <Instagram size={24} style={{ color: '#E1306C' }} />
                            </div>
                            <div className="bento-content mt-auto">
                                <h3 className="bento-title-sm"><Zap size={18} style={{ color: 'var(--gold-dark)', display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }} /> Instant AI Payouts</h3>
                                <p className="bento-desc-sm">No waiting around for net-30 terms. Our agents scan Instagram immediately.</p>
                            </div>
                        </motion.div>

                        {/* BOX 3: Real Asset Accumulation (Medium Square) */}
                        <motion.div
                            className="bento-box bento-med bento-asset glow-hover"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="bento-glow-blob"></div>
                            <div className="bento-sparkline-wrap">
                                <GoldSparkline />
                                <div className="live-pill">
                                    <span className="pulse-dot"></span>
                                    <span>Live 1 oz = ${paxgCad.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="bento-content mt-auto">
                                <h3 className="bento-title-sm">Real Asset Accumulation</h3>
                                <p className="bento-desc-sm">1 token = 1 troy ounce of audited LBMA gold (PAXG) via blockchain.</p>
                            </div>
                        </motion.div>

                    </div>
                </div>
            </section>

            {/* ===== SECTION 3.5: ROI CALCULATOR ===== */}
            <ROICalculator />

            {/* ===== SECTION 5: PREMIUM DARK FOOTER ===== */}
            <footer className="footer-section">
                <div className="footer-glow-massive" />
                <div className="footer-grid-overlay" />

                <div className="container footer-content">
                    {/* Top CTA */}
                    <div className="footer-cta-card">
                        <div className="cta-icon-cluster">
                            <span className="cta-icon-item left"><Instagram size={20} /></span>
                            <span className="cta-icon-item center"><Coins size={28} /></span>
                            <span className="cta-icon-item right"><MapPin size={20} /></span>
                        </div>
                        <h2 className="footer-cta-title">Ready to start mining gold <br />in your city?</h2>
                        <p className="footer-cta-desc">Join hundreds of creators turning their everyday coffee runs and brewery nights into a growing portfolio of physical gold.</p>

                        <div className="footer-cta-actions">
                            <Link to="/explore" className="btn btn-primary btn-lg">
                                Launch Directory <ArrowUpRight size={18} style={{ marginLeft: 6 }} />
                            </Link>
                            <Link to="/join/business" className="btn-text-link">Business Setup <ArrowRight size={16} /></Link>
                        </div>
                    </div>

                    {/* Main Grid */}
                    <div className="footer-nav-grid">
                        <div className="footer-col brand-col">
                            <div className="footer-logo" style={{ gap: '8px' }}>
                                <Coins size={24} className="text-gold" />
                                <span className="logo-text">KARAT</span>
                                <span className="logo-text" style={{ opacity: 0.5 }}>×</span>
                                <div className="logo-oktd">
                                    <span className="logo-oktd-text">OKTD</span>
                                    <span className="logo-oktd-icon">🍁</span>
                                </div>
                            </div>
                            <p className="footer-brand-mission">Monetizing social capital through real assets. Transparent, automated, and built for local economies.</p>
                            <div className="footer-socials">
                                <a href="#" aria-label="Instagram"><Instagram size={20} /></a>
                                <a href="#" aria-label="Twitter">
                                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
                                </a>
                            </div>
                        </div>

                        <div className="footer-col">
                            <h4 className="footer-col-title">Platform</h4>
                            <div className="footer-links">
                                <Link to="/explore">Explore Directory</Link>
                                <Link to="/join/business">For Businesses</Link>
                                <a href="#leaderboard">Leaderboard <span className="badge-soon">Soon</span></a>
                            </div>
                        </div>

                        <div className="footer-col">
                            <h4 className="footer-col-title">Resources</h4>
                            <div className="footer-links">
                                <Link to="/how-it-works/customer">How It Works</Link>
                                <Link to="/gold">The Gold Standard</Link>
                                <Link to="/how-cashout-works">Cash Out Guide</Link>
                            </div>
                        </div>

                        <div className="footer-col">
                            <h4 className="footer-col-title">Legal</h4>
                            <div className="footer-links">
                                <Link to="/terms-of-service">Terms of Service</Link>
                                <Link to="/privacy-policy">Privacy Policy</Link>
                                <Link to="/how-it-works/customer">Creator Guidelines</Link>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Copyright */}
                    <div className="footer-bottom">
                        <p className="footer-copyright">© 2026 Karat Gold Platform. All rights reserved.</p>
                        <div className="footer-status">
                            <span className="status-dot"></span>
                            System Status: All systems operational
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default Landing
