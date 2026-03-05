import { useEffect, useState } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'

interface AnimatedCounterProps {
    value: number
    decimals?: number
    duration?: number
    className?: string
    prefix?: string
    suffix?: string
}

export function AnimatedCounter({
    value,
    decimals = 0,
    duration = 1.5,
    className = '',
    prefix = '',
    suffix = ''
}: AnimatedCounterProps) {
    const [mounted, setMounted] = useState(false)
    const spring = useSpring(0, { duration: duration * 1000, bounce: 0 })
    const displayValue = useTransform(spring, (current) => {
        return `${prefix}${current.toFixed(decimals)}${suffix}`
    })

    useEffect(() => {
        setMounted(true)
        spring.set(value)
    }, [spring, value])

    if (!mounted) {
        return <span className={className}>{prefix}{(0).toFixed(decimals)}{suffix}</span>
    }

    return <motion.span className={className}>{displayValue}</motion.span>
}
