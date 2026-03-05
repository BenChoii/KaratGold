import { useParams } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

/**
 * Public scan page — no auth required.
 * Renders ONLY the EmbedSocial tagged-posts widget for a given business.
 * Playwright visits this page to screenshot the tagged posts.
 */
function ScanPage() {
    const { businessId } = useParams<{ businessId: string }>()

    // Query business by ID (public query, no auth needed)
    const business = useQuery(api.businesses.getById,
        businessId ? { businessId: businessId as Id<"businesses"> } : "skip"
    )

    if (!business) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: '#999', fontFamily: 'system-ui' }}>
                Loading business data...
            </div>
        )
    }

    if (!business.embedSocialActive || !business.embedSocialWidgetId) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: '#999', fontFamily: 'system-ui' }}>
                No tagged posts widget configured for this business.
            </div>
        )
    }

    return (
        <div
            style={{
                padding: 20,
                background: '#fff',
                minHeight: '100vh',
                fontFamily: 'system-ui',
            }}
        >
            <div style={{ marginBottom: 16, color: '#666', fontSize: 12 }}>
                Tagged posts for @{business.instagramHandle ?? business.name}
            </div>

            {/* EmbedSocial widget — Playwright will screenshot this */}
            <div
                className="embedsocial-hashtag"
                data-ref={business.embedSocialWidgetId}
            ></div>
        </div>
    )
}

export default ScanPage
