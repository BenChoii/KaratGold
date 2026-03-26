import { Component, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Coins, Flame, TrendingUp, Sparkles } from 'lucide-react'
import { AnimatedCounter } from './AnimatedCounter'
import './TreasuryTracker.css'

/* Error boundary to prevent TreasuryTracker from crashing the whole page */
class TreasuryErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    constructor(props: { children: ReactNode }) {
        super(props)
        this.state = { hasError: false }
    }
    static getDerivedStateFromError() {
        return { hasError: true }
    }
    render() {
        if (this.state.hasError) return null
        return this.props.children
    }
}

function TreasuryTrackerInner() {
    const treasury = useQuery(api.campaigns.getKaratTreasury)
    const goldPriceData = useQuery(api.goldPrice.getGoldPrice)

    const GOLD_PRICE_PER_OUNCE = goldPriceData?.paxgUsd ?? 2900

    if (treasury === undefined || treasury === null) return null

    const balanceGrams = treasury.balance ?? 0
    const targetCad = 100000
    const currentCad = balanceGrams * GOLD_PRICE_PER_OUNCE
    const progressPercent = Math.min((currentCad / targetCad) * 100, 100)

    return (
        <div className="treasury-tracker-wrapper">
            <motion.div
                className="treasury-tracker card-solid"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
            >
                <div className="treasury-header">
                    <div className="treasury-title">
                        <Flame size={18} className="treasury-icon pulse" />
                        <h3 className="text-h4">KaratGold Master Treasury</h3>
                    </div>
                    <div className="treasury-meta badge badge-gold">
                        <TrendingUp size={12} />
                        Global Platform Fees (20%)
                    </div>
                </div>

                <div className="treasury-balance">
                    <div className="balance-cad">
                        <span className="balance-currency">$</span>
                        <AnimatedCounter value={currentCad} decimals={2} />
                    </div>
                    <div className="balance-gold text-tertiary">
                        <Coins size={14} />
                        <AnimatedCounter value={balanceGrams} decimals={4} /> oz PAXG
                    </div>
                </div>

                <div className="treasury-progress-container">
                    <div className="progress-labels">
                        <span className="text-secondary" style={{ fontSize: '0.8125rem' }}>AI CEO Goal: $100K</span>
                        <span className="text-secondary" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{progressPercent.toFixed(2)}%</span>
                    </div>
                    <div className="progress-bar-bg">
                        <motion.div
                            className="progress-bar-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                        >
                            <div className="progress-glow"></div>
                        </motion.div>
                    </div>
                </div>

                <div className="treasury-footer">
                    <Sparkles size={14} className="text-tertiary" />
                    <span className="text-tertiary" style={{ fontSize: '0.75rem' }}>
                        Fully transparent. 100% of platform revenue routes here instantly via smart Convex ledgers.
                    </span>
                </div>
            </motion.div>
        </div>
    )
}

export function TreasuryTracker() {
    return (
        <TreasuryErrorBoundary>
            <TreasuryTrackerInner />
        </TreasuryErrorBoundary>
    )
}
