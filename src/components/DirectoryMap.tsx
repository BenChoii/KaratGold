import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Coins, MapPin, ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';


// You'll need to add a mapbox token to your .env.local: VITE_MAPBOX_TOKEN
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Use a dark, premium mapbox style
const MAP_STYLE = 'mapbox://styles/mapbox/dark-v11';

export interface MapCampaign {
    _id: string;
    businessName: string;
    businessCategory: string;
    rewardGrams: number;
    rewardCad: number;
    latitude: number | null;
    longitude: number | null;
}

interface DirectoryMapProps {
    campaigns: MapCampaign[];
    userLat?: number | null;
    userLng?: number | null;
}

export function DirectoryMap({ campaigns, userLat, userLng }: DirectoryMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
    const [popupInfo, setPopupInfo] = useState<MapCampaign | null>(null);

    // Initial map setup
    useEffect(() => {
        if (!mapContainer.current || !MAPBOX_TOKEN) return;
        if (map.current) return; // Initialize map only once

        mapboxgl.accessToken = MAPBOX_TOKEN;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: MAP_STYLE,
            center: [userLng ?? 0, userLat ?? 20],
            zoom: userLng ? 11 : 2,
            pitch: 45,
            bearing: 0
        });

        // Add navigation controls (zoom, rotation)
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Add 3D terrain on load
        map.current.on('style.load', () => {
            if (!map.current) return;

            // Setup DEM source
            map.current.addSource('mapbox-dem', {
                'type': 'raster-dem',
                'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
                'tileSize': 512,
                'maxzoom': 14
            });
            // Add the DEM source as a terrain layer with exaggerated height
            map.current.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
        });

        // Cleanup on unmount
        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
            // Cleanup markers
            Object.values(markersRef.current).forEach(marker => marker.remove());
            markersRef.current = {};
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync campaigns to markers
    useEffect(() => {
        if (!map.current) return;

        // Valid campaigns with coordinates that are actually numbers
        const validCampaigns = campaigns.filter(c => {
            if (c.latitude === null || c.longitude === null) return false;
            const lat = Number(c.latitude);
            const lng = Number(c.longitude);
            return !isNaN(lat) && !isNaN(lng);
        });
        const currentCampaignIds = new Set(validCampaigns.map(c => c._id));

        // 1. Remove markers for campaigns that no longer exist
        Object.keys(markersRef.current).forEach(id => {
            if (id !== 'user-location' && !currentCampaignIds.has(id)) {
                markersRef.current[id].remove();
                delete markersRef.current[id];
            }
        });

        // 2. Add or update markers
        validCampaigns.forEach(campaign => {
            if (!markersRef.current[campaign._id]) {
                // Create custom DOM element for the marker
                const el = document.createElement('div');
                el.className = 'campaign-marker';

                // Use standard DOM to avoid React 19 createRoot crashes inside map loop
                el.style.width = '32px';
                el.style.height = '32px';
                el.style.background = 'rgba(20, 20, 20, 0.9)';
                el.style.border = '2px solid var(--gold)';
                el.style.borderRadius = '50%';
                el.style.display = 'flex';
                el.style.alignItems = 'center';
                el.style.justifyContent = 'center';
                el.style.cursor = 'pointer';
                el.style.boxShadow = '0 0 15px rgba(212, 175, 55, 0.4), 0 4px 8px rgba(0,0,0,0.5)';
                el.style.color = 'var(--gold)';
                el.style.transition = 'transform 0.2s, box-shadow 0.2s';

                // Add the SVG directly via innerHTML
                el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-coins"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/></svg>`;

                el.addEventListener('mouseenter', (e) => {
                    const target = e.currentTarget as HTMLElement;
                    target.style.transform = 'scale(1.1) translateY(-4px)';
                    target.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.6), 0 8px 16px rgba(0,0,0,0.6)';
                });

                el.addEventListener('mouseleave', (e) => {
                    const target = e.currentTarget as HTMLElement;
                    target.style.transform = 'none';
                    target.style.boxShadow = '0 0 15px rgba(212, 175, 55, 0.4), 0 4px 8px rgba(0,0,0,0.5)';
                });

                // Add click listener to the element itself
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    setPopupInfo(campaign);

                    // Optional: fly to the clicked marker
                    if (map.current) {
                        map.current.flyTo({
                            center: [campaign.longitude!, campaign.latitude!],
                            zoom: 14,
                            pitch: 60,
                            essential: true
                        });
                    }
                });

                // Create and add the marker to the map
                const marker = new mapboxgl.Marker({ element: el })
                    .setLngLat([Number(campaign.longitude), Number(campaign.latitude)])
                    .addTo(map.current!);

                markersRef.current[campaign._id] = marker;
            } else {
                // Update position if it exists (though rare for this app)
                markersRef.current[campaign._id].setLngLat([Number(campaign.longitude), Number(campaign.latitude)]);
            }
        });

    }, [campaigns]);

    // Handle user location marker
    useEffect(() => {
        if (!map.current ||
            typeof userLat !== 'number' ||
            typeof userLng !== 'number' ||
            isNaN(userLat) ||
            isNaN(userLng)
        ) return;

        if (!markersRef.current['user-location']) {
            const el = document.createElement('div');
            el.className = 'user-marker';

            el.style.width = '16px';
            el.style.height = '16px';
            el.style.background = 'var(--accent)';
            el.style.borderRadius = '50%';
            el.style.border = '3px solid #fff';
            el.style.boxShadow = '0 0 15px var(--accent)';

            const marker = new mapboxgl.Marker({ element: el })
                .setLngLat([userLng, userLat])
                .addTo(map.current);

            markersRef.current['user-location'] = marker;
        } else {
            markersRef.current['user-location'].setLngLat([userLng, userLat]);
        }

    }, [userLat, userLng]);

    if (!MAPBOX_TOKEN) {
        return (
            <div className="directory-map-fallback" style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ textAlign: 'center', color: '#666' }}>
                    <MapPin size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                    <p>Mapbox token missing.<br />Please add VITE_MAPBOX_TOKEN to .env.local</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* The Map Container */}
            <div ref={mapContainer} className="mapbox-map-container" />

            {/* Custom Overlay Popup (React-rendered, positioned over map) */}
            {popupInfo && (
                <div
                    className="premium-map-popup-overlay"
                    style={{
                        position: 'absolute',
                        top: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 10,
                        background: 'rgba(15, 15, 15, 0.95)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 15px rgba(212, 175, 55, 0.2)',
                        padding: '16px',
                        width: 'calc(100% - 40px)',
                        maxWidth: '320px',
                        pointerEvents: 'auto',
                    }}
                >
                    <button
                        onClick={() => setPopupInfo(null)}
                        style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: 'transparent',
                            border: 'none',
                            color: '#888',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px',
                            borderRadius: '4px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#fff';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#888';
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        <X size={16} />
                    </button>

                    <div style={{ marginBottom: '12px', paddingRight: '24px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                            {popupInfo.businessName}
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {popupInfo.businessCategory}
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', background: 'rgba(212, 175, 55, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                        <Coins size={20} color="var(--gold)" />
                        <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--gold)' }}>
                                {popupInfo.rewardGrams} oz gold
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#a0a0a0' }}>
                                ≈ ${popupInfo.rewardCad.toFixed(2)} CAD
                            </div>
                        </div>
                    </div>

                    <Link
                        to={`/submit?campaign=${popupInfo._id}`}
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '10px', fontSize: '0.9rem', display: 'flex', justifyContent: 'center' }}
                    >
                        Earn Gold <ArrowRight size={16} style={{ marginLeft: '6px' }} />
                    </Link>
                </div>
            )}
        </div>
    );
}
