import { AbsoluteFill, Img, useCurrentFrame, interpolate, useVideoConfig, staticFile } from 'remotion'

/* ===== GOLD COIN ===== */
function GoldCoin({ x, y, size, delay, speed }: {
    x: number; y: number; size: number; delay: number; speed: number
}) {
    const frame = useCurrentFrame()
    const { fps } = useVideoConfig()

    const cycle = speed * fps
    const t = ((frame - delay * fps) % cycle) / cycle
    if (frame < delay * fps) return null

    const yOff = interpolate(t, [0, 1], [60, -120])
    const opacity = interpolate(t, [0, 0.1, 0.5, 1], [0, 0.95, 0.8, 0])
    const scale = interpolate(t, [0, 0.15, 0.7, 1], [0.2, 1, 0.85, 0.3])
    const rotate = interpolate(t, [0, 1], [-10, 30])

    return (
        <div style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            width: size,
            height: size,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, #ffe066, #ffd700, #daa520, #b8860b)',
            boxShadow: `0 0 ${size / 2}px rgba(218, 165, 32, 0.4), inset 0 -2px 4px rgba(0,0,0,0.25), inset 0 2px 3px rgba(255,255,255,0.4)`,
            opacity, transform: `translateY(${yOff}px) scale(${scale}) rotate(${rotate}deg)`, zIndex: 10,
        }}>
            <div style={{
                position: 'absolute', top: '12%', left: '15%', width: '35%', height: '22%',
                borderRadius: '50%', background: 'rgba(255,255,255,0.45)', filter: 'blur(1px)',
            }} />
        </div>
    )
}

/* ===== SPARKLE STAR ===== */
function Sparkle({ x, y, delay, size }: { x: number; y: number; delay: number; size: number }) {
    const frame = useCurrentFrame()
    const { fps } = useVideoConfig()
    const cycle = 2.5 * fps
    const t = ((frame - delay * fps) % cycle) / cycle
    if (frame < delay * fps) return null

    const opacity = interpolate(t, [0, 0.25, 0.5, 1], [0, 1, 0.8, 0])
    const scale = interpolate(t, [0, 0.25, 0.5, 1], [0.1, 1.3, 1, 0])

    return (
        <div style={{
            position: 'absolute', left: `${x}%`, top: `${y}%`, opacity, transform: `scale(${scale})`, zIndex: 12,
        }}>
            <svg viewBox="0 0 24 24" width={size} height={size}>
                <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5Z" fill="#ffd700" />
            </svg>
        </div>
    )
}

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
    const bgOpacity = interpolate(frame, [10, 35], [0, 1], { extrapolateRight: 'clamp' })
    const bgScale = interpolate(frame, [10, 35], [1.05, 1], { extrapolateRight: 'clamp' })
    const streamOpacity = interpolate(frame, [20, 45], [0, 1], { extrapolateRight: 'clamp' })

    // Gold coins — positioned in the upper area around the gold stream
    const coins = [
        { x: 45, y: 2, size: 24, delay: 0.5, speed: 3.5 },
        { x: 70, y: 0, size: 20, delay: 1.0, speed: 4.0 },
        { x: 55, y: 8, size: 28, delay: 0.2, speed: 3.2 },
        { x: 80, y: 5, size: 16, delay: 1.5, speed: 4.5 },
        { x: 65, y: -3, size: 22, delay: 0.8, speed: 3.8 },
        { x: 50, y: 12, size: 18, delay: 2.0, speed: 4.2 },
        { x: 85, y: 10, size: 26, delay: 0.3, speed: 3.0 },
        { x: 60, y: 18, size: 17, delay: 1.8, speed: 3.6 },
        { x: 75, y: 15, size: 14, delay: 2.5, speed: 4.8 },
        { x: 52, y: 22, size: 21, delay: 1.2, speed: 3.4 },
    ]

    const sparkles = [
        { x: 50, y: 5, delay: 0.3, size: 16 },
        { x: 72, y: 3, delay: 1.2, size: 12 },
        { x: 62, y: 15, delay: 2.0, size: 14 },
        { x: 55, y: -2, delay: 0.7, size: 10 },
        { x: 80, y: 8, delay: 1.8, size: 13 },
        { x: 45, y: 20, delay: 2.5, size: 11 },
    ]

    return (
        <AbsoluteFill style={{
            background: 'transparent',
            overflow: 'visible',
        }}>
            {/* Café background image — behind the phone, right side */}
            <div style={{
                position: 'absolute',
                right: 0,
                top: '12%',
                width: '58%',
                height: '76%',
                borderRadius: 16,
                overflow: 'hidden',
                opacity: bgOpacity,
                transform: `scale(${bgScale})`,
                boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
                zIndex: 1,
            }}>
                <Img
                    src={staticFile('assets/hero-cafe-bg.png')}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            </div>

            {/* Gold shimmer stream — flowing from phone upward-right */}
            <div style={{
                position: 'absolute',
                top: '-20%',
                right: '-10%',
                width: '85%',
                height: '90%',
                opacity: streamOpacity,
                transform: 'rotate(-10deg)',
                zIndex: 8,
                pointerEvents: 'none',
                WebkitMaskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, black 25%, transparent 70%)',
                maskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, black 25%, transparent 70%)',
            }}>
                <Img
                    src={staticFile('assets/hero-gold-stream.png')}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
            </div>

            {/* Gold coins */}
            {coins.map((c, i) => <GoldCoin key={i} {...c} />)}

            {/* Sparkles */}
            {sparkles.map((s, i) => <Sparkle key={`s${i}`} {...s} />)}

            {/* LARGE phone with Instagram post — silver frame, centered-left */}
            <div style={{
                position: 'absolute',
                left: '15%',
                top: '3%',
                transform: `translateY(${phoneY + bobY}px) rotate(${bobRot}deg)`,
                opacity: phoneOpacity,
                zIndex: 15,
            }}>
                {/* Phone outer frame — SILVER metallic */}
                <div style={{
                    width: 320,
                    height: 650,
                    background: 'linear-gradient(145deg, #e8e8e8, #c0c0c0, #a8a8a8, #d0d0d0)',
                    borderRadius: 44,
                    padding: 5,
                    boxShadow: '0 40px 100px rgba(0,0,0,0.2), 0 15px 40px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.1)',
                }}>
                    {/* Phone screen */}
                    <div style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: 40,
                        overflow: 'hidden',
                        position: 'relative',
                        background: '#000',
                    }}>
                        <Img
                            src={staticFile('assets/hero-phone-screen.png')}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                objectPosition: 'top center',
                            }}
                        />
                    </div>
                </div>
            </div>
        </AbsoluteFill>
    )
}
