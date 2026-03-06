import { Link } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { SignUpButton, SignedIn, SignedOut } from '@clerk/clerk-react'
import { ArrowRight, CheckCircle2, ShieldCheck, Coins, TrendingUp } from 'lucide-react'
import './LandingV2.css'

/* Phone Mockup — shows a realistic Karat Gold app screen */
function PhoneMockup({ goldPrice }: { goldPrice: number }) {
    return (
        <div className="v2-phone">
            <div className="v2-phone-notch" />
            <div className="v2-phone-screen">
                {/* Status bar */}
                <div className="v2-screen-status">
                    <span>9:41</span>
                    <div className="v2-status-icons">
                        <span>●●●●</span>
                        <span>WiFi</span>
                        <span>100%</span>
                    </div>
                </div>

                {/* App header */}
                <div className="v2-app-header">
                    <div className="v2-app-logo">
                        <img src="/assets/karat-logo.png" alt="" style={{ height: 24, borderRadius: 4 }} />
                        <span>Karat Gold</span>
                    </div>
                </div>

                {/* Balance card */}
                <div className="v2-balance-card">
                    <span className="v2-balance-label">Your Gold</span>
                    <div className="v2-balance-amount">0.245 oz</div>
                    <div className="v2-balance-fiat">
                        <TrendingUp size={12} />
                        <span>${(0.245 * goldPrice).toFixed(2)} CAD</span>
                    </div>
                </div>

                {/* Portfolio items */}
                <div className="v2-portfolio">
                    <div className="v2-portfolio-header">
                        <span>Recent Earnings</span>
                    </div>

                    <div className="v2-portfolio-item">
                        <div className="v2-item-icon" style={{ background: '#f0e6d2' }}>☕</div>
                        <div className="v2-item-info">
                            <span className="v2-item-name">Bean Scene Café</span>
                            <span className="v2-item-sub">Instagram · Verified</span>
                        </div>
                        <div className="v2-item-value">
                            <span className="v2-item-amount">+0.008 oz</span>
                            <span className="v2-item-cad">${(0.008 * goldPrice).toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="v2-portfolio-item">
                        <div className="v2-item-icon" style={{ background: '#e8d5e8' }}>🍷</div>
                        <div className="v2-item-info">
                            <span className="v2-item-name">Summerhill Winery</span>
                            <span className="v2-item-sub">Instagram · Verified</span>
                        </div>
                        <div className="v2-item-value">
                            <span className="v2-item-amount">+0.015 oz</span>
                            <span className="v2-item-cad">${(0.015 * goldPrice).toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="v2-portfolio-item">
                        <div className="v2-item-icon" style={{ background: '#d5e8d5' }}>🍺</div>
                        <div className="v2-item-info">
                            <span className="v2-item-name">BNA Brewing</span>
                            <span className="v2-item-sub">Facebook · Verified</span>
                        </div>
                        <div className="v2-item-value">
                            <span className="v2-item-amount">+0.011 oz</span>
                            <span className="v2-item-cad">${(0.011 * goldPrice).toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="v2-portfolio-item">
                        <div className="v2-item-icon" style={{ background: '#d5dde8' }}>🏔️</div>
                        <div className="v2-item-info">
                            <span className="v2-item-name">Okanagan Adventure</span>
                            <span className="v2-item-sub">Instagram · Pending</span>
                        </div>
                        <div className="v2-item-value">
                            <span className="v2-item-amount pending">+0.012 oz</span>
                            <span className="v2-item-cad">${(0.012 * goldPrice).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Bottom nav */}
                <div className="v2-bottom-nav">
                    <div className="v2-nav-item active">
                        <Coins size={18} />
                        <span>Vault</span>
                    </div>
                    <div className="v2-nav-item">
                        <span style={{ fontSize: 18 }}>🗺️</span>
                        <span>Explore</span>
                    </div>
                    <div className="v2-nav-item">
                        <span style={{ fontSize: 18 }}>📸</span>
                        <span>Submit</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

function LandingV2() {
    const goldPriceData = useQuery(api.goldPrice.getGoldPrice)
    const paxgCad = goldPriceData?.paxgCad ?? 2900

    return (
        <div className="v2-landing">
            {/* ===== HERO ===== */}
            <section className="v2-hero">
                <div className="v2-hero-inner">
                    {/* Left: Copy */}
                    <div className="v2-hero-copy">
                        <h1 className="v2-hero-title">
                            Earn real gold<br />
                            for supporting local
                        </h1>
                        <p className="v2-hero-subtitle">
                            Okanagan locals trust Karat Gold,{' '}
                            <strong>the platform that turns social posts into real gold.</strong>
                        </p>

                        <div className="v2-hero-cta">
                            <SignedOut>
                                <SignUpButton mode="modal">
                                    <button className="v2-btn-primary">
                                        Get started <ArrowRight size={16} />
                                    </button>
                                </SignUpButton>
                            </SignedOut>
                            <SignedIn>
                                <Link to="/explore" className="v2-btn-primary">
                                    Open App <ArrowRight size={16} />
                                </Link>
                            </SignedIn>
                        </div>

                        <p className="v2-hero-footnote">
                            *Backed by LBMA-certified gold via PAXG. No minimum balance.
                        </p>

                        <div className="v2-hero-badges">
                            <span><CheckCircle2 size={14} /> LBMA Gold Backed</span>
                            <span><ShieldCheck size={14} /> AI Verified</span>
                            <span><Coins size={14} /> Cash out anytime</span>
                        </div>
                    </div>

                    {/* Right: Phone */}
                    <div className="v2-hero-visual">
                        <PhoneMockup goldPrice={paxgCad} />
                    </div>
                </div>
            </section>

            {/* ===== STATS BAR ===== */}
            <section className="v2-stats-bar">
                <p className="v2-stats-label">Powering Okanagan's local economy since 2026</p>
                <div className="v2-stats-row">
                    <div className="v2-stat">
                        <span className="v2-stat-value">124+</span>
                        <span className="v2-stat-label">Local businesses</span>
                    </div>
                    <div className="v2-stat">
                        <span className="v2-stat-value">3,200+</span>
                        <span className="v2-stat-label">Gold earners</span>
                    </div>
                    <div className="v2-stat">
                        <span className="v2-stat-value">${(paxgCad).toFixed(0)}</span>
                        <span className="v2-stat-label">Gold price per oz</span>
                    </div>
                </div>
            </section>

            {/* ===== TRUST LOGOS ===== */}
            <section className="v2-trust-logos">
                <p className="v2-trust-label">Trusted by & built with</p>
                <div className="v2-logos-row">
                    <img src="/assets/partners/stripe.png" alt="Stripe" />
                    <img src="/assets/partners/paxg.png" alt="PAXG" />
                    <img src="/assets/partners/lbma.png" alt="LBMA" />
                    <img src="/assets/partners/oktd.png" alt="OKTD.ca" />
                    <img src="/assets/partners/solana.png" alt="Solana" />
                </div>
            </section>
        </div>
    )
}

export default LandingV2
