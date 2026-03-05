import Spline from '@splinetool/react-spline';
import { useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface SplineSceneProps {
    scene: string;
    className?: string;
    onSplineLoad?: (splineApp: any) => void;
}

export default function SplineScene({ scene, className, onSplineLoad }: SplineSceneProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const handleLoad = (splineApp: any) => {
        setIsLoading(false);
        if (onSplineLoad) {
            onSplineLoad(splineApp);
        }
    };

    return (
        <div className={`relative w-full h-full overflow-hidden ${className || ''}`}>
            <AnimatePresence>
                {isLoading && !hasError && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-transparent backdrop-blur-sm"
                    >
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full border-4 border-gold/20 animate-pulse" />
                            <Loader2 className="absolute inset-0 m-auto text-gold animate-spin" size={32} />
                        </div>
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="mt-4 text-gold font-medium tracking-wider text-sm uppercase"
                        >
                            Forging 3D Experience...
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>

            {hasError && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-transparent backdrop-blur-sm p-8 text-center">
                    <p className="text-gold mb-2 font-bold italic">3D Scene Restricted</p>
                    <p className="text-white/60 text-xs max-w-xs">
                        The high-fidelity 3D core experienced a connection issue.
                        Falling back to static premium visuals.
                    </p>
                </div>
            )}

            <Suspense fallback={null}>
                {!hasError && (
                    <Spline
                        scene={scene}
                        onLoad={handleLoad}
                        onError={() => {
                            setHasError(true);
                            setIsLoading(false);
                        }}
                        className="w-full h-full"
                    />
                )}
            </Suspense>
        </div>
    );
}
