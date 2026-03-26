import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Coins, Users, ArrowRight, MapPin, Navigation, Loader2, Truck, Instagram, Facebook, Zap, Eye, Clock, List, Map as MapIcon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { useWallet } from '@solana/wallet-adapter-react'
import { api } from '../../convex/_generated/api'
import { DirectoryMap, type MapCampaign } from '../components/DirectoryMap'
import { ErrorBoundary } from '../components/ErrorBoundary'
import './CustomerExplore.css'
import './CustomerExploreMap.css'

function formatTimeLeft(ms: number) {
    if (ms <= 0) return 'Ready'
    const days = Math.floor(ms / (1000 * 60 * 60 * 24))
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    if (days > 0) return `${days}d ${hours}h`
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${mins}m`
}

const CATEGORY_CHIPS = [
    { label: '🔥 Nearby', value: 'all' },
    { label: '☕ Cafés', value: 'café' },
    { label: '🍽️ Restaurants', value: 'restaurant' },
    { label: '🚗 Automotive', value: 'automotive' },
    { label: '💈 Barbers', value: 'barber' },
    { label: '🔧 Plumbing', value: 'plumbing' },
    { label: '💪 Fitness', value: 'fitness' },
    { label: '💇 Salon', value: 'salon' },
    { label: '🏗️ Construction', value: 'construction' },
    { label: '🧹 Cleaning', value: 'cleaning' },
    { label: 'Detailing', value: 'detailing' },
    { label: '🛒 Retail', value: 'retail' },
]

function CustomerExplore() {
    const { publicKey } = useWallet()
    const walletAddress = publicKey?.toBase58() ?? null
    const convexUser = useQuery(api.users.getByWalletAddress,
        walletAddress ? { walletAddress } : "skip"
    )
    const cooldowns = useQuery(api.submissions.getActiveCooldowns, {
        customerId: convexUser?._id,
    })
    const [now, setNow] = useState(Date.now())

    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 60000)
        return () => clearInterval(t)
    }, [])

    const [search, setSearch] = useState('')
    const [activeCategory, setActiveCategory] = useState('all')
    const [userLat, setUserLat] = useState<number | null>(null)
    const [userLng, setUserLng] = useState<number | null>(null)
    const [userCity, setUserCity] = useState<string | null>(null)
    const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle')
    const [showMapOnMobile, setShowMapOnMobile] = useState(false);

    // Request user location on mount
    useEffect(() => {
        if (navigator.geolocation) {
            setLocationStatus('requesting')
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    setUserLat(pos.coords.latitude)
                    setUserLng(pos.coords.longitude)
                    setLocationStatus('granted')

                    // Reverse geocode to get city name using Nominatim (free, no API key)
                    try {
                        const res = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=10`
                        )
                        const data = await res.json()
                        const city = data.address?.city || data.address?.town || data.address?.village
                        if (city) {
                            setUserCity(city)
                        }
                    } catch {
                        // Silently fail — city name is optional
                    }
                },
                () => {
                    setLocationStatus('denied')
                },
                { enableHighAccuracy: false, timeout: 8000 }
            )
        }
    }, [])

    const campaigns = useQuery(api.discovery.listNearby, {
        userLat: userLat ?? undefined,
        userLng: userLng ?? undefined,
        userCity: userCity ?? undefined,
        category: activeCategory !== 'all' ? activeCategory : undefined,
        search: search || undefined,
    })

    return (
        <div className="explore-page split-layout">
            {/* LEFT COLUMN: List & Filters */}
            <div className={`explore-list-column ${showMapOnMobile ? 'hidden-on-mobile' : ''}`}>
                <div className="explore-list-content">
                    {/* Header */}
                    <motion.div
                        className="explore-header"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="explore-title-row">
                            <div>
                                <h1 className="text-h2">
                                    <span style={{ color: 'var(--gold)' }}>Gold Check</span> ✦
                                </h1>
                                <p className="text-body" style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                                    Find businesses paying gold for your posts
                                </p>
                            </div>
                            <div className="explore-location-badge">
                                {locationStatus === 'requesting' && (
                                    <span className="location-pill">
                                        <Loader2 size={14} className="spinning" /> Locating...
                                    </span>
                                )}
                                {locationStatus === 'granted' && userCity && (
                                    <span className="location-pill location-active">
                                        <Navigation size={14} /> {userCity}
                                    </span>
                                )}
                                {locationStatus === 'denied' && (
                                    <span className="location-pill location-denied">
                                        <MapPin size={14} /> Location off
                                    </span>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* Search Bar */}
                    <motion.div
                        className="explore-search"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            className="input search-input"
                            placeholder="Search businesses, trades, or locations..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </motion.div>

                    {/* Category Filter Chips */}
                    <motion.div
                        className="category-chips"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.15 }}
                    >
                        {CATEGORY_CHIPS.map(chip => (
                            <button
                                key={chip.value}
                                className={`category-chip ${activeCategory === chip.value ? 'active' : ''}`}
                                onClick={() => setActiveCategory(chip.value)}
                            >
                                {chip.label}
                            </button>
                        ))}
                    </motion.div>

                    {/* Campaign Grid */}
                    <div className="campaigns-grid">
                        {campaigns === undefined ? (
                            <div className="explore-loading">
                                <Loader2 size={28} className="spinning" style={{ color: 'var(--gold)' }} />
                                <p>Finding gold opportunities near you...</p>
                            </div>
                        ) : campaigns.length === 0 ? (
                            <div className="explore-empty">
                                <Coins size={36} style={{ color: 'var(--text-tertiary)' }} />
                                <p>No campaigns found{activeCategory !== 'all' ? ' in this category' : ''}</p>
                                <p className="text-body-sm" style={{ color: 'var(--text-tertiary)' }}>
                                    Try a different category or check back soon — new campaigns appear daily
                                </p>
                            </div>
                        ) : (
                            <AnimatePresence mode="popLayout">
                                {campaigns.map((campaign, i) => (
                                    <motion.div
                                        key={campaign._id}
                                        className="campaign-card card-solid map-hoverable"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.4, delay: i * 0.04 }}
                                        layout
                                    >
                                        {(() => {
                                            const cooldownEnd = cooldowns?.[campaign._id]
                                            const isOnCooldown = cooldownEnd && cooldownEnd > now
                                            const timeLeft = isOnCooldown ? formatTimeLeft(cooldownEnd - now) : null

                                            return (
                                                <>
                                                    {/* Reward Badge */}
                                                    <div className="campaign-reward-badge">
                                                        <Coins size={14} />
                                                        <span>{campaign.rewardGrams} oz/post</span>
                                                    </div>

                                                    {/* Verification Badge */}
                                                    <div className="campaign-verify-badges">
                                                        {campaign.verificationMethod === 'auto' ? (
                                                            <div className="campaign-verify-badge verify-auto" style={{ gap: '4px' }}>
                                                                <Zap size={10} /> Instant Payouts
                                                            </div>
                                                        ) : (
                                                            <div className="campaign-verify-badge verify-manual" style={{ gap: '4px' }}>
                                                                <Eye size={10} /> Manual Review
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Business Info */}
                                                    <div className="campaign-card-top">
                                                        <div>
                                                            <h3 className="text-h4">{campaign.businessName}</h3>
                                                            <div className="campaign-location">
                                                                {campaign.locationType === 'service_area' ? (
                                                                    <>
                                                                        <Truck size={12} />
                                                                        <span>Service Area</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <MapPin size={12} />
                                                                        {campaign.distanceKm !== null ? (
                                                                            <span>{campaign.distanceKm} km away</span>
                                                                        ) : (
                                                                            <span>{campaign.businessLocation}</span>
                                                                        )}
                                                                    </>
                                                                )}
                                                                <span className="campaign-category-dot">·</span>
                                                                <span>{campaign.businessCategory}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Description */}
                                                    <p className="text-body-sm campaign-desc">
                                                        {campaign.description.length > 100
                                                            ? campaign.description.slice(0, 100) + '...'
                                                            : campaign.description
                                                        }
                                                    </p>

                                                    {/* Reward Detail */}
                                                    <div className="campaign-reward-detail">
                                                        <span className="reward-gold">
                                                            <Coins size={14} style={{ marginRight: 6, verticalAlign: '-2px' }} /> {campaign.rewardGrams} oz gold
                                                        </span>
                                                        <span className="reward-cad">
                                                            {campaign.rewardGrams} oz
                                                        </span>
                                                    </div>

                                                    {/* Meta Row */}
                                                    <div className="campaign-card-meta">
                                                        <div className="campaign-platforms">
                                                            {campaign.platforms.map(p => (
                                                                <span key={p} className="platform-tag">
                                                                    {p === 'Instagram' && <Instagram size={12} />}
                                                                    {p === 'Facebook' && <Facebook size={12} />}
                                                                    {p}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                                            <span className="text-body-sm" style={{ color: 'var(--text-tertiary)' }}>
                                                                <Users size={14} style={{ verticalAlign: '-2px' }} /> {campaign.remaining} spots left
                                                            </span>
                                                            <span style={{ fontSize: '0.6875rem', color: 'var(--accent)', fontWeight: 700, background: 'rgba(212, 175, 55, 0.15)', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.02em' }}>
                                                                {(campaign.remaining * campaign.rewardGrams).toFixed(3)} oz in pool!
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {isOnCooldown ? (
                                                        <button
                                                            disabled
                                                            className="btn btn-secondary campaign-cta"
                                                            style={{ marginTop: 'var(--space-4)', width: '100%', opacity: 0.7, cursor: 'not-allowed', color: 'var(--text-tertiary)' }}
                                                        >
                                                            <Clock size={16} style={{ marginRight: 6 }} /> Available in {timeLeft}
                                                        </button>
                                                    ) : (
                                                        <Link
                                                            to={`/submit?campaign=${campaign._id}`}
                                                            className="btn btn-primary campaign-cta"
                                                            style={{ marginTop: 'var(--space-4)', width: '100%' }}
                                                        >
                                                            Submit Post <ArrowRight size={16} />
                                                        </Link>
                                                    )}
                                                </>
                                            )
                                        })()}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: Leaflet Map */}
            <div className={`explore-map-column ${!showMapOnMobile ? 'hidden-on-mobile' : ''}`}>
                <ErrorBoundary>
                    <DirectoryMap
                        campaigns={(campaigns ?? []) as MapCampaign[]}
                        userLat={userLat}
                        userLng={userLng}
                    />
                </ErrorBoundary>
            </div>

            {/* Mobile Toggle Button (Floating) */}
            <button
                className="mobile-map-toggle btn-primary"
                onClick={() => setShowMapOnMobile(!showMapOnMobile)}
            >
                {showMapOnMobile ? (
                    <><List size={18} /> Show List</>
                ) : (
                    <><MapIcon size={18} /> Show Map</>
                )}
            </button>
        </div>
    )
}

export default CustomerExplore
