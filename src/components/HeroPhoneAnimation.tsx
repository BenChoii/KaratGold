import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig } from 'remotion'
import { TrendingUp, CheckCircle2, ArrowLeft, User, ShieldCheck } from 'lucide-react'

/* ===== MAIN PHONE HERO COMPOSITION ===== */
export const HeroPhoneAnimation: React.FC = () => {
    const frame = useCurrentFrame()
    const { fps } = useVideoConfig()

    // Slow phone bobbing
    const bobY = interpolate(frame % (4 * fps), [0, 2 * fps, 4 * fps], [0, -8, 0])
    const bobRot = interpolate(frame % (7 * fps), [0, 3.5 * fps, 7 * fps], [-0.4, 0.4, -0.4])

    // Entry animations
    const phoneOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' })
    const phoneY = interpolate(frame, [0, 25], [40, 0], { extrapolateRight: 'clamp' })

    return (
        <AbsoluteFill style={{
            background: 'transparent',
            overflow: 'visible',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            {/* LARGE phone with Instagram post — silver frame, centered-left */}
            <div style={{
                position: 'absolute',
                left: '25%', // Centered more since background is gone
                top: '3%',
                transform: `translateY(${phoneY + bobY}px) rotate(${bobRot}deg)`,
                opacity: phoneOpacity,
                zIndex: 15,
            }}>
                {/* Phone outer frame — Premium Titanium */}
                <div style={{
                    width: 320,
                    height: 650,
                    background: '#e0e0e0',
                    backgroundImage: 'linear-gradient(145deg, #d1d5db 0%, #abafb8 20%, #6b7280 50%, #abafb8 80%, #d1d5db 100%)',
                    borderRadius: 50,
                    padding: 6,
                    boxShadow: '0 50px 100px -20px rgba(0,0,0,0.3), 0 30px 60px -30px rgba(0,0,0,0.4), inset 0 1px 3px rgba(255,255,255,0.8), inset 0 -1px 3px rgba(0,0,0,0.5)',
                    position: 'relative'
                }}>
                    {/* Hardware Buttons */}
                    <div style={{ position: 'absolute', left: -4, top: 120, width: 4, height: 30, background: '#9ca3af', borderRadius: '4px 0 0 4px', boxShadow: 'inset 1px 0 1px rgba(255,255,255,0.5)' }} />
                    <div style={{ position: 'absolute', left: -4, top: 165, width: 4, height: 50, background: '#9ca3af', borderRadius: '4px 0 0 4px', boxShadow: 'inset 1px 0 1px rgba(255,255,255,0.5)' }} />
                    <div style={{ position: 'absolute', left: -4, top: 225, width: 4, height: 50, background: '#9ca3af', borderRadius: '4px 0 0 4px', boxShadow: 'inset 1px 0 1px rgba(255,255,255,0.5)' }} />
                    <div style={{ position: 'absolute', right: -4, top: 180, width: 4, height: 75, background: '#9ca3af', borderRadius: '0 4px 4px 0', boxShadow: 'inset -1px 0 1px rgba(255,255,255,0.5)' }} />

                    {/* Dynamic Phone Screen UI */}
                    <div style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: 44,
                        overflow: 'hidden',
                        position: 'relative',
                        background: '#f9fafb',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: 'inset 0 0 0 4px #000' // Thin black bezel border
                    }}>
                        {/* Dynamic Island */}
                        <div style={{
                            position: 'absolute',
                            top: 15,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 110,
                            height: 32,
                            background: '#000',
                            borderRadius: 24,
                            zIndex: 100,
                            boxShadow: 'inset 0 -1px 2px rgba(255,255,255,0.2)'
                        }}>
                            {/* Camera lenses */}
                            <div style={{
                                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, borderRadius: '50%', background: '#111', boxShadow: 'inset 0 0 2px rgba(255,255,255,0.3)'
                            }} />
                            <div style={{
                                position: 'absolute', left: 28, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, borderRadius: '50%', background: '#111', boxShadow: 'inset 0 0 2px rgba(255,255,255,0.3)'
                            }} />
                        </div>

                        {/* Screen Glare Overlay */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.05) 30%, rgba(255,255,255,0) 100%)',
                            pointerEvents: 'none',
                            zIndex: 90
                        }} />

                        {/* Status Bar */}
                        <div style={{ position: 'absolute', top: 18, left: 0, width: '100%', padding: '0 24px', display: 'flex', justifyContent: 'space-between', zIndex: 50, fontSize: 13, fontWeight: 700, color: '#000' }}>
                            <span>9:41</span>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                {/* Basic signal / battery mock */}
                                <div style={{ display: 'flex', gap: 1 }}>
                                    <div style={{ width: 3, height: 4, background: '#000', alignSelf: 'flex-end' }} />
                                    <div style={{ width: 3, height: 6, background: '#000', alignSelf: 'flex-end' }} />
                                    <div style={{ width: 3, height: 8, background: '#000', alignSelf: 'flex-end' }} />
                                    <div style={{ width: 3, height: 10, background: '#000', alignSelf: 'flex-end' }} />
                                </div>
                                <span>5G</span>
                                <div style={{ width: 24, height: 12, border: '1px solid #000', borderRadius: 4, padding: 1, opacity: 0.8 }}>
                                    <div style={{ width: '80%', height: '100%', background: '#000', borderRadius: 1 }} />
                                </div>
                            </div>
                        </div>

                        <PhoneScreenSequence />
                    </div>
                </div>
            </div>
        </AbsoluteFill>
    )
}

/* ===== PHONE SCREEN SEQUENCE ===== */
function PhoneScreenSequence() {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Scene timeline
    const isScene1 = frame < 4 * fps;

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', paddingTop: 60, boxSizing: 'border-box' }}>
            {/* Content Area */}
            <div style={{ padding: '0 20px 20px', flex: 1, display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
                {isScene1 ? <SubmitScene frame={frame} fps={fps} /> : <BalanceScene frame={frame - 4 * fps} fps={fps} />}
            </div>
        </div>
    );
}

function SubmitScene({ frame, fps }: { frame: number, fps: number }) {
    // Animation timing
    const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
    const btnScale = interpolate(frame, [2 * fps, 2.2 * fps, 2.4 * fps], [1, 0.95, 1]);
    const btnColor = frame > 2.2 * fps ? '#E8C847' : '#1a1a1a';
    const btnText = frame > 2.2 * fps ? 'Scanning...' : 'Verify Visit';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, opacity, height: '100%', boxSizing: 'border-box' }}>
            {/* Nav Header Area */}
            <div style={{ padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <ArrowLeft size={18} color="#1a1a1a" />
                </div>
                <div style={{ fontWeight: 700, fontSize: 17, color: '#1a1a1a', letterSpacing: '-0.3px' }}>Verify Post</div>
                <div style={{ width: 36 }} />
            </div>

            <div style={{ fontSize: 15, color: '#6b7280', padding: '0 4px', lineHeight: 1.4 }}>
                Did you tag <span style={{ color: '#1a1a1a', fontWeight: 600 }}>@okanagan_gold</span> and the business?
            </div>

            {/* Mock IG Post Input */}
            <div style={{ background: '#fff', borderRadius: 24, boxShadow: '0 8px 30px rgba(0,0,0,0.06)', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.04)' }}>
                {/* Post Header */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '16px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={18} color="#9ca3af" />
                        </div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a', lineHeight: 1.2, letterSpacing: '-0.2px' }}>sarah_explores</div>
                        <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500, marginTop: 2 }}>Kelowna, BC</div>
                    </div>
                </div>
                {/* Post Image */}
                <div style={{ height: 230, background: '#f3f4f6', position: 'relative' }}>
                    <img src="/assets/hero-vineyard-bg.png" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {/* Tags overlay */}
                    <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, fontWeight: 500, padding: '6px 10px', borderRadius: 8, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <User size={12} /> @quails_gate
                    </div>
                </div>
                {/* Post Footer */}
                <div style={{ padding: '16px' }}>
                    <div style={{ fontSize: 14, color: '#1a1a1a', lineHeight: 1.4 }}>
                        <span style={{ fontWeight: 700, marginRight: 6 }}>sarah_explores</span>
                        Amazing afternoon at the vineyard! 🍷 Absolutely beautiful views.
                    </div>
                    <div style={{ fontSize: 14, color: '#3b82f6', marginTop: 4, fontWeight: 500 }}>#okanagan_gold #kelowna</div>
                </div>
            </div>

            {/* Submit Button */}
            <div style={{
                background: btnColor, color: '#fff', padding: '16px', borderRadius: 100,
                display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 600,
                transform: `scale(${btnScale})`, transition: 'background-color 0.2s', marginTop: 'auto'
            }}>
                {btnText}
            </div>
        </div>
    );
}

function BalanceScene({ frame, fps }: { frame: number, fps: number }) {
    // Animation timing
    const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
    const yOff = interpolate(frame, [0, 15], [20, 0], { extrapolateRight: 'clamp' });

    // Balance counter string interpolation
    const startBal = 0.00;
    const endBal = 1.50;
    const currentBal = interpolate(frame, [0.5 * fps, 3 * fps], [startBal, endBal], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

    // Success popup
    const popupOpacity = interpolate(frame, [0.5 * fps, 1 * fps], [0, 1], { extrapolateRight: 'clamp' });
    const popupScale = interpolate(frame, [0.5 * fps, 1 * fps], [0.8, 1], { extrapolateRight: 'clamp' });
    const popupY = interpolate(frame, [0.5 * fps, 1 * fps], [10, 0], { extrapolateRight: 'clamp' });

    // Gold pulse
    const goldGlow = interpolate(frame, [2.5 * fps, 3 * fps, 3.5 * fps], [0, 1, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, opacity, transform: `translateY(${yOff}px)`, height: '100%', paddingTop: 30, boxSizing: 'border-box' }}>

            {/* Checkmark Circle */}
            <div style={{
                width: 72, height: 72, borderRadius: '50%', background: '#ecfdf5', border: '5px solid #fff',
                boxShadow: '0 12px 30px rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto', opacity: popupOpacity, transform: `scale(${popupScale}) translateY(${popupY}px)`
            }}>
                <CheckCircle2 size={36} color="#10b981" />
            </div>

            <div style={{ textAlign: 'center', opacity: popupOpacity, transform: `translateY(${popupY}px)` }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.5px' }}>Post Verified</div>
                <div style={{ fontSize: 16, color: '#6b7280', marginTop: 6, fontWeight: 500 }}>Reward deposited to your vault</div>
            </div>

            {/* Premium Gold Card */}
            <div style={{
                position: 'relative', marginTop: 15, padding: '36px 24px', borderRadius: 32,
                background: 'linear-gradient(135deg, #1f2228 0%, #000 100%)',
                boxShadow: '0 25px 50px rgba(0,0,0,0.2)', overflow: 'hidden',
                color: '#fff', border: '1px solid rgba(255,255,255,0.1)'
            }}>
                {/* Gold Glow inside card */}
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: '100%', height: '100%', background: 'radial-gradient(circle, rgba(232,200,71,0.25) 0%, transparent 70%)',
                    opacity: goldGlow, pointerEvents: 'none'
                }} />

                <div style={{ fontSize: 15, color: '#9ca3af', fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={18} color="#E8C847" /> Vault Balance
                </div>
                <div style={{ fontSize: 64, fontWeight: 800, color: '#fff', letterSpacing: '-3px', display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    {currentBal.toFixed(2)} <span style={{ fontSize: 24, color: '#E8C847', letterSpacing: '-0.5px' }}>g</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontSize: 16, fontWeight: 600, marginTop: 20 }}>
                    <TrendingUp size={20} /> +$140.25 <span style={{ color: '#6b7280', fontWeight: 500 }}>(USD)</span>
                </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: 14, color: '#9ca3af', marginTop: 'auto', marginBottom: 20, fontWeight: 500 }}>
                Backed by 100% LBMA-Certified Gold
            </div>
        </div>
    );
}
