import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Instagram, Facebook, ShieldCheck, CheckCircle2, XCircle, Loader2, Coins, ArrowRight, Search, Link2, Zap, Eye, Clock } from 'lucide-react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { useUser } from '@clerk/clerk-react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import './CustomerSubmit.css'

function formatTimeLeft(ms: number) {
    if (ms <= 0) return 'Ready'
    const days = Math.floor(ms / (1000 * 60 * 60 * 24))
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    if (days > 0) return `${days}d ${hours}h`
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${mins}m`
}

type Status = 'idle' | 'verifying' | 'approved' | 'rejected' | 'pending'

function CustomerSubmit() {
    const [status, setStatus] = useState<Status>('idle')
    const [selectedCampaignId, setSelectedCampaignId] = useState<Id<"campaigns"> | null>(null)
    const [selectedPlatform, setSelectedPlatform] = useState<'Instagram' | 'Facebook' | null>(null)
    const [instagramHandle, setInstagramHandle] = useState('')
    const [postUrl, setPostUrl] = useState('')
    const [earnedGrams, setEarnedGrams] = useState(0)
    const [resultReason, setResultReason] = useState('')

    const { user: clerkUser } = useUser()

    const goldPriceData = useQuery(api.goldPrice.getGoldPrice)
    const GOLD_PRICE_PER_OUNCE = goldPriceData?.paxgCad ?? 2900

    const campaigns = useQuery(api.campaigns.listActive, {})
    const convexUser = useQuery(api.users.getByClerkId, {
        clerkId: clerkUser?.id ?? "none",
    })

    const cooldowns = useQuery(api.submissions.getActiveCooldowns, {
        customerId: convexUser?._id,
    })
    const [now, setNow] = useState(Date.now())

    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 60000)
        return () => clearInterval(t)
    }, [])

    // URL Query Parameter Auto-Selection
    useEffect(() => {
        if (!campaigns || selectedCampaignId) return;

        const searchParams = new URLSearchParams(window.location.search);
        const urlCampaignId = searchParams.get('campaign');

        if (urlCampaignId) {
            const matchedCampaign = campaigns.find(c => c._id === urlCampaignId);
            if (matchedCampaign) {
                // Ensure it's not on cooldown
                const cooldownEnd = cooldowns?.[matchedCampaign._id];
                if (!cooldownEnd || cooldownEnd <= now) {
                    setSelectedCampaignId(matchedCampaign._id as Id<"campaigns">);

                    const isCAuto = matchedCampaign.verificationMethod === 'auto';
                    const validPlats = matchedCampaign.platforms?.filter(
                        (p: string) => isCAuto ? p === 'Instagram' : (p === 'Instagram' || p === 'Facebook')
                    ) ?? [];

                    if (validPlats.length === 1) {
                        setSelectedPlatform(validPlats[0] as any);
                        setTimeout(() => scrollToSection('step-3-input'), 200);
                    } else {
                        setSelectedPlatform(null);
                        setTimeout(() => scrollToSection('step-2-platform'), 200);
                    }
                }
            }
        }
    }, [campaigns, cooldowns, now, selectedCampaignId]);

    const scanForUser = useAction(api.tagScanner.scanForUser)
    const submitMutation = useMutation(api.submissions.submit)

    const selectedCampaign = campaigns?.find((c) => c._id === selectedCampaignId) ?? null

    // Determine effective verification method based on platform + business tier
    // Facebook is always manual. Instagram follows the campaign's verificationMethod.
    const effectiveMethod = selectedPlatform === 'Facebook'
        ? 'manual'
        : (selectedCampaign?.verificationMethod ?? 'manual')

    const isAutoVerify = effectiveMethod === 'auto'
    const handleClean = instagramHandle.trim().replace(/^@/, '')

    // Available platforms for selected campaign
    // An instant campaign only supports instant platforms (Instagram) to avoid mixed manual states
    const isCampaignAuto = selectedCampaign?.verificationMethod === 'auto'
    const availablePlatforms = selectedCampaign?.platforms?.filter(
        (p: string) => isCampaignAuto ? p === 'Instagram' : (p === 'Instagram' || p === 'Facebook')
    ) ?? []

    // Ready check: need platform + (handle for auto OR url for manual)
    const isReady = selectedCampaignId && selectedPlatform && convexUser && (
        isAutoVerify ? handleClean.length >= 2 : postUrl.trim().length > 10
    )

    const scrollToSection = (id: string) => {
        // Wait briefly for DOM to mount/animate before measuring coordinates
        setTimeout(() => {
            const el = document.getElementById(id)
            if (el) {
                // Scroll specifically to avoid the sticky navbar
                const yOffset = el.getBoundingClientRect().top + window.scrollY - 100
                window.scrollTo({ top: yOffset, behavior: 'smooth' })
            }
        }, 150)
    }

    const handleClaim = async () => {
        if (!isReady || !convexUser || !selectedCampaignId || !selectedCampaign || !selectedPlatform) return

        if (isAutoVerify) {
            setStatus('verifying')
            try {
                const result = await scanForUser({
                    campaignId: selectedCampaignId,
                    customerId: convexUser._id,
                    instagramHandle: handleClean,
                })

                if (result.verified) {
                    setEarnedGrams(selectedCampaign.rewardGrams)
                    setResultReason(result.reason)
                    setStatus('approved')
                } else {
                    setResultReason(result.reason)
                    setStatus('rejected')
                }
            } catch (err: any) {
                setResultReason(err.message ?? 'Something went wrong')
                setStatus('rejected')
            }
        } else {
            setStatus('verifying')
            try {
                await submitMutation({
                    campaignId: selectedCampaignId,
                    customerId: convexUser._id,
                    postUrl: postUrl.trim(),
                    submissionMethod: 'url',
                    platform: selectedPlatform,
                })
                setEarnedGrams(selectedCampaign.rewardGrams)
                setStatus('pending')
            } catch (err: any) {
                setResultReason(err.message ?? 'Something went wrong')
                setStatus('rejected')
            }
        }
    }

    const resetForm = () => {
        setStatus('idle')
        setSelectedCampaignId(null)
        setSelectedPlatform(null)
        setInstagramHandle('')
        setPostUrl('')
        setEarnedGrams(0)
        setResultReason('')
    }

    return (
        <div className="submit-page">
            <div className="submit-content">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-h1">Claim Your Gold</h1>
                    <p className="text-body text-secondary" style={{ marginTop: 'var(--space-2)' }}>
                        Tagged a business on Instagram or Facebook? Claim your reward.
                    </p>
                </motion.div>

                <AnimatePresence mode="wait">
                    {/* ===== IDLE: Select campaign + platform + provide details ===== */}
                    {status === 'idle' && (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4 }}
                        >
                            {/* Step 1: Pick a campaign */}
                            <div className="submit-section" style={{ marginTop: 'var(--space-8)' }}>
                                <label className="submit-label">
                                    <span className="step-number">1</span>
                                    Select Campaign
                                </label>

                                {!campaigns || campaigns.length === 0 ? (
                                    <div className="empty-campaigns card-solid" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                                        <Search size={28} style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)' }} />
                                        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                                            No active campaigns right now. Check back soon!
                                        </p>
                                    </div>
                                ) : (
                                    <div className="campaign-list">
                                        {campaigns.map((c) => {
                                            const cooldownEnd = cooldowns?.[c._id]
                                            const isOnCooldown = cooldownEnd && cooldownEnd > now

                                            return (
                                                <button
                                                    key={c._id}
                                                    disabled={!!isOnCooldown}
                                                    className={`campaign-option card-solid ${selectedCampaignId === c._id ? 'selected' : ''} ${isOnCooldown ? 'cooldown-locked' : ''}`}
                                                    style={isOnCooldown ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                                                    onClick={() => {
                                                        if (isOnCooldown) return;
                                                        setSelectedCampaignId(c._id)

                                                        const isCAuto = c.verificationMethod === 'auto'
                                                        const validPlats = c.platforms?.filter(
                                                            (p: string) => isCAuto ? p === 'Instagram' : (p === 'Instagram' || p === 'Facebook')
                                                        ) ?? []

                                                        if (validPlats.length === 1) {
                                                            setSelectedPlatform(validPlats[0] as any)
                                                            scrollToSection('step-3-input')
                                                        } else {
                                                            setSelectedPlatform(null)
                                                            scrollToSection('step-2-platform')
                                                        }
                                                    }}
                                                >
                                                    <div className="campaign-option-info">
                                                        <div className="campaign-option-header">
                                                            <strong>{c.title}</strong>
                                                            {isOnCooldown && (
                                                                <span className="verify-badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                                                                    <Clock size={10} /> {formatTimeLeft(cooldownEnd - now)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="campaign-option-business text-tertiary">
                                                            {c.businessName} · {c.description?.slice(0, 50)}
                                                        </span>
                                                        <div className="campaign-platform-badges">
                                                            {c.verificationMethod === 'auto' ? (
                                                                <span className="verify-badge badge-auto" style={{ gap: '4px' }}>
                                                                    <Zap size={10} /> Instant Payouts
                                                                </span>
                                                            ) : (
                                                                <span className="verify-badge badge-manual" style={{ gap: '4px' }}>
                                                                    <Eye size={10} /> Manual Review
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="campaign-option-reward" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <Coins size={14} />
                                                            <span>{c.rewardGrams.toFixed(3)} oz</span>
                                                            <span className="text-tertiary" style={{ fontSize: '0.75rem' }}>
                                                                (${(c.rewardGrams * GOLD_PRICE_PER_OUNCE).toFixed(2)})
                                                            </span>
                                                        </div>
                                                        <span style={{ fontSize: '0.6875rem', color: 'var(--accent)', fontWeight: 700, background: 'rgba(212, 175, 55, 0.15)', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.02em', marginTop: '2px' }}>
                                                            Only ${((c.maxSubmissions - c.currentSubmissions) * c.rewardGrams * GOLD_PRICE_PER_OUNCE).toFixed(0)} CAD in pool!
                                                        </span>
                                                    </div>
                                                    {selectedCampaignId === c._id && (
                                                        <CheckCircle2 size={18} className="campaign-check" style={{ color: 'var(--green-400)' }} />
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Step 2: Pick platform */}
                            {selectedCampaign && availablePlatforms.length > 0 && (
                                <div id="step-2-platform" className="submit-section" style={{ marginTop: 'var(--space-6)' }}>
                                    <label className="submit-label">
                                        <span className="step-number">2</span>
                                        Which platform did you post on?
                                    </label>
                                    <div className="platform-selector">
                                        {availablePlatforms.includes('Instagram') && (
                                            <button
                                                className={`platform-btn ${selectedPlatform === 'Instagram' ? 'selected' : ''}`}
                                                onClick={() => {
                                                    setSelectedPlatform('Instagram')
                                                    scrollToSection('step-3-input')
                                                }}
                                            >
                                                <Instagram size={20} />
                                                <span>Instagram</span>
                                            </button>
                                        )}
                                        {availablePlatforms.includes('Facebook') && (
                                            <button
                                                className={`platform-btn ${selectedPlatform === 'Facebook' ? 'selected' : ''}`}
                                                onClick={() => {
                                                    setSelectedPlatform('Facebook')
                                                    scrollToSection('step-3-input')
                                                }}
                                            >
                                                <Facebook size={20} />
                                                <span>Facebook</span>
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-tertiary" style={{ fontSize: '0.75rem', marginTop: 'var(--space-3)', textAlign: 'center' }}>
                                        {isCampaignAuto ? "This campaign offers instant payouts via AI verification." : "This campaign requires manual review by the business owner."}
                                    </p>
                                </div>
                            )}

                            {/* Step 3: Depends on effective verification method */}
                            {selectedPlatform && (
                                <div id="step-3-input" className="submit-section" style={{ marginTop: 'var(--space-6)' }}>
                                    {isAutoVerify ? (
                                        <>
                                            <label className="submit-label">
                                                <span className="step-number">3</span>
                                                Your Instagram Handle
                                            </label>
                                            <div className="handle-input-wrap">
                                                <Instagram size={18} className="handle-icon" />
                                                <input
                                                    type="text"
                                                    className="input handle-input"
                                                    placeholder="your_username"
                                                    value={instagramHandle}
                                                    onChange={(e) => setInstagramHandle(e.target.value)}
                                                />
                                            </div>
                                            <p className="text-tertiary" style={{ fontSize: '0.75rem', marginTop: 'var(--space-2)' }}>
                                                Must match the account you used to tag the business
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <label className="submit-label">
                                                <span className="step-number">3</span>
                                                {selectedPlatform} Post URL
                                            </label>
                                            <div className="handle-input-wrap">
                                                <Link2 size={18} className="handle-icon" />
                                                <input
                                                    type="url"
                                                    className="input handle-input"
                                                    placeholder={selectedPlatform === 'Facebook'
                                                        ? 'https://www.facebook.com/.../posts/...'
                                                        : 'https://www.instagram.com/p/...'}
                                                    value={postUrl}
                                                    onChange={(e) => setPostUrl(e.target.value)}
                                                />
                                            </div>
                                            <div className="manual-info">
                                                <Eye size={14} />
                                                <span>
                                                    {selectedPlatform === 'Facebook'
                                                        ? 'Facebook posts are always manually reviewed by the business.'
                                                        : 'This business manually reviews posts.'}
                                                    {' '}You'll be paid out within 24 hours.
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Claim button */}
                            {selectedPlatform && (
                                <button
                                    className="btn btn-primary submit-btn"
                                    disabled={!isReady}
                                    onClick={handleClaim}
                                >
                                    {isAutoVerify ? (
                                        <>
                                            <ShieldCheck size={18} />
                                            I Tagged Them — Verify My Post
                                            <ArrowRight size={16} />
                                        </>
                                    ) : (
                                        <>
                                            <Link2 size={18} />
                                            Submit for Review
                                            <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>
                            )}

                            {/* How it works */}
                            {selectedPlatform && (
                                <div className="how-it-works" style={{ marginTop: 'var(--space-8)' }}>
                                    <p className="text-tertiary" style={{ fontSize: '0.8125rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                        {isAutoVerify
                                            ? <><Zap size={14} style={{ color: 'var(--gold-dark)' }} /> We'll scan tagged posts to verify instantly. Gold is credited in ~30 seconds.</>
                                            : <><Eye size={14} /> The business will review your post. If no response in 24h, you're auto-approved.</>}
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ===== VERIFYING ===== */}
                    {status === 'verifying' && (
                        <motion.div
                            key="verifying"
                            className="verify-state"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <Loader2 size={48} className="verify-spinner spinning" />
                            <h2 className="text-h2" style={{ marginTop: 'var(--space-6)' }}>
                                {isAutoVerify ? 'Scanning Tagged Posts...' : 'Submitting...'}
                            </h2>

                            <div className="verify-steps">
                                <div className="verify-step done">
                                    <CheckCircle2 size={16} />
                                    <span>Campaign selected</span>
                                </div>
                                <div className="verify-step done">
                                    <CheckCircle2 size={16} />
                                    <span>
                                        {selectedPlatform === 'Instagram' ? <Instagram size={14} /> : <Facebook size={14} />}
                                        {' '}{selectedPlatform}
                                    </span>
                                </div>
                                {isAutoVerify ? (
                                    <>
                                        <div className="verify-step done">
                                            <CheckCircle2 size={16} />
                                            <span>Handle confirmed: @{handleClean}</span>
                                        </div>
                                        <div className="verify-step active">
                                            <Loader2 size={16} className="spinning" />
                                            <span>Scanning tagged posts...</span>
                                        </div>
                                        <div className="verify-step">
                                            <span className="step-dot" />
                                            <span>AI verification</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="verify-step active">
                                        <Loader2 size={16} className="spinning" />
                                        <span>Submitting post URL for review...</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* ===== PENDING (manual review submitted) ===== */}
                    {status === 'pending' && (
                        <motion.div
                            key="pending"
                            className="result-state"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            <div className="result-icon pending-icon">
                                <Clock size={40} />
                            </div>
                            <h2 className="text-h2" style={{ marginTop: 'var(--space-4)' }}>
                                Submitted for Review
                            </h2>
                            <p className="text-body text-secondary" style={{ marginTop: 'var(--space-2)' }}>
                                The business will review your {selectedPlatform} post
                            </p>

                            <div className="reward-display pending-reward">
                                <Coins size={24} style={{ color: 'var(--accent)' }} />
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>
                                        {earnedGrams.toFixed(4)} oz Gold
                                    </div>
                                    <div className="text-tertiary" style={{ fontSize: '0.8125rem' }}>
                                        ≈ ${(earnedGrams * GOLD_PRICE_PER_OUNCE).toFixed(2)} CAD — pending approval
                                    </div>
                                </div>
                            </div>

                            <p className="text-tertiary" style={{ fontSize: '0.8125rem', marginTop: 'var(--space-4)', maxWidth: 400 }}>
                                If the business doesn't respond within 24 hours, your post will be <strong>auto-approved</strong> and gold will be credited to your account.
                            </p>

                            <div className="result-actions">
                                <button className="btn btn-primary" onClick={resetForm}>
                                    Submit Another
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ===== APPROVED (instant auto-verify) ===== */}
                    {status === 'approved' && (
                        <motion.div
                            key="approved"
                            className="result-state"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            <div className="result-icon approved-icon">
                                <CheckCircle2 size={40} />
                            </div>
                            <h2 className="text-h2" style={{ marginTop: 'var(--space-4)' }}>
                                Tag Verified!
                            </h2>
                            <p className="text-body text-secondary" style={{ marginTop: 'var(--space-2)' }}>
                                Your post was found in the tagged feed
                            </p>

                            <div className="reward-display">
                                <Coins size={24} style={{ color: 'var(--accent)' }} />
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>
                                        +{earnedGrams.toFixed(4)} oz Gold
                                    </div>
                                    <div className="text-tertiary" style={{ fontSize: '0.8125rem' }}>
                                        ≈ ${(earnedGrams * GOLD_PRICE_PER_OUNCE).toFixed(2)} CAD
                                    </div>
                                </div>
                            </div>

                            {resultReason && (
                                <p className="ai-reason text-tertiary" style={{ marginTop: 'var(--space-4)', fontSize: '0.8125rem' }}>
                                    {resultReason}
                                </p>
                            )}

                            <div className="result-actions">
                                <button className="btn btn-primary" onClick={resetForm}>
                                    Submit Another
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ===== REJECTED ===== */}
                    {status === 'rejected' && (
                        <motion.div
                            key="rejected"
                            className="result-state"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            <div className="result-icon rejected-icon">
                                <XCircle size={40} />
                            </div>
                            <h2 className="text-h2" style={{ marginTop: 'var(--space-4)' }}>
                                {isAutoVerify ? 'Tag Not Found' : 'Submission Failed'}
                            </h2>

                            <p className="ai-reason text-secondary" style={{ marginTop: 'var(--space-4)' }}>
                                {resultReason || "We couldn't verify your post."}
                            </p>
                            {isAutoVerify && (
                                <p className="text-tertiary" style={{ fontSize: '0.8125rem', marginTop: 'var(--space-2)', maxWidth: 400 }}>
                                    Make sure you tagged the business (not just a location) and that your Instagram is set to public.
                                </p>
                            )}

                            <div className="result-actions">
                                <button className="btn btn-ghost" onClick={resetForm}>
                                    Try Again
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

export default CustomerSubmit
