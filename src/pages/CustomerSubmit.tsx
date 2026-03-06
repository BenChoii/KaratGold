import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Instagram, Facebook, ShieldCheck, CheckCircle2, XCircle, Loader2, Coins, ArrowRight, Search, Link2, Zap, Eye, Clock, Upload, ImageIcon, X } from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
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
    const [postUrl, setPostUrl] = useState('')
    const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
    const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
    const [earnedGrams, setEarnedGrams] = useState(0)
    const [resultReason, setResultReason] = useState('')
    const [dragActive, setDragActive] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

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

    const submitMutation = useMutation(api.submissions.submit)
    const generateUploadUrl = useMutation(api.submissions.generateUploadUrl)

    const selectedCampaign = campaigns?.find((c) => c._id === selectedCampaignId) ?? null

    // Determine effective verification method based on platform + business tier
    // Facebook is always manual. Instagram follows the campaign's verificationMethod.
    const effectiveMethod = selectedPlatform === 'Facebook'
        ? 'manual'
        : (selectedCampaign?.verificationMethod ?? 'manual')

    const isAutoVerify = effectiveMethod === 'auto'

    // Available platforms for selected campaign
    const isCampaignAuto = selectedCampaign?.verificationMethod === 'auto'
    const availablePlatforms = selectedCampaign?.platforms?.filter(
        (p: string) => isCampaignAuto ? p === 'Instagram' : (p === 'Instagram' || p === 'Facebook')
    ) ?? []

    // Ready check: need platform + (screenshot for auto OR url for manual)
    const isReady = selectedCampaignId && selectedPlatform && convexUser && (
        isAutoVerify ? !!screenshotFile : postUrl.trim().length > 10
    )

    // Handle file selection
    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith('image/')) return
        setScreenshotFile(file)
        const reader = new FileReader()
        reader.onload = (e) => setScreenshotPreview(e.target?.result as string)
        reader.readAsDataURL(file)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragActive(false)
        if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0])
    }

    const clearScreenshot = () => {
        setScreenshotFile(null)
        setScreenshotPreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

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

        setStatus('verifying')

        try {
            let imageStorageId: Id<"_storage"> | undefined

            // Upload screenshot if provided
            if (screenshotFile) {
                const uploadUrl = await generateUploadUrl()
                const uploadResp = await fetch(uploadUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': screenshotFile.type },
                    body: screenshotFile,
                })
                const { storageId } = await uploadResp.json()
                imageStorageId = storageId
            }

            // Submit — the backend automatically triggers AI verification for auto campaigns
            await submitMutation({
                campaignId: selectedCampaignId,
                customerId: convexUser._id,
                postUrl: postUrl.trim() || undefined,
                imageStorageId,
                submissionMethod: imageStorageId ? 'upload' : 'url',
                platform: selectedPlatform,
            })

            if (isAutoVerify) {
                // AI verification happens server-side, show "verifying" then transition
                setEarnedGrams(selectedCampaign.rewardGrams)
                setStatus('pending')
            } else {
                setEarnedGrams(selectedCampaign.rewardGrams)
                setStatus('pending')
            }
        } catch (err: any) {
            setResultReason(err.message ?? 'Something went wrong')
            setStatus('rejected')
        }
    }

    const resetForm = () => {
        setStatus('idle')
        setSelectedCampaignId(null)
        setSelectedPlatform(null)
        setPostUrl('')
        setScreenshotFile(null)
        setScreenshotPreview(null)
        setEarnedGrams(0)
        setResultReason('')
        if (fileInputRef.current) fileInputRef.current.value = ''
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
                                                Upload Screenshot of Your Post
                                            </label>
                                            <p className="text-tertiary" style={{ fontSize: '0.8125rem', marginBottom: 'var(--space-3)' }}>
                                                Take a screenshot of your {selectedPlatform} post showing the business tag and upload it below.
                                            </p>

                                            {!screenshotPreview ? (
                                                <div
                                                    className={`screenshot-dropzone ${dragActive ? 'drag-active' : ''}`}
                                                    onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                                                    onDragLeave={() => setDragActive(false)}
                                                    onDrop={handleDrop}
                                                    onClick={() => fileInputRef.current?.click()}
                                                >
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        accept="image/*"
                                                        style={{ display: 'none' }}
                                                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                                    />
                                                    <Upload size={32} style={{ color: 'var(--text-tertiary)', marginBottom: '8px' }} />
                                                    <p style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.9375rem' }}>
                                                        Drop screenshot here or tap to upload
                                                    </p>
                                                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', marginTop: '4px' }}>
                                                        JPG, PNG, or HEIC • Max 10MB
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="screenshot-preview">
                                                    <img src={screenshotPreview} alt="Screenshot preview" />
                                                    <button
                                                        className="screenshot-remove"
                                                        onClick={(e) => { e.stopPropagation(); clearScreenshot() }}
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                    <div className="screenshot-info">
                                                        <ImageIcon size={14} />
                                                        <span>{screenshotFile?.name}</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="ai-info" style={{ marginTop: 'var(--space-3)' }}>
                                                <Zap size={14} style={{ color: 'var(--gold)' }} />
                                                <span>
                                                    Our AI instantly analyzes your screenshot to verify the business tag. Gold is credited in ~30 seconds.
                                                </span>
                                            </div>
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
                                            Upload & Verify My Post
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
                                            ? <><Zap size={14} style={{ color: 'var(--gold-dark)' }} /> Upload a screenshot of your post. AI verifies it instantly.</>
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
                                            <span>Screenshot uploaded</span>
                                        </div>
                                        <div className="verify-step active">
                                            <Loader2 size={16} className="spinning" />
                                            <span>AI analyzing your post...</span>
                                        </div>
                                        <div className="verify-step">
                                            <span className="step-dot" />
                                            <span>Verifying business tag</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="verify-step active">
                                        <Loader2 size={16} className="spinning" />
                                        <span>Submitting post for review...</span>
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
