import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Coins, ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';

// CartoDB dark tiles — completely free, no API key required
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

export interface MapCampaign {
    _id: string;
    businessName: string;
    businessCategory: string;
    rewardGrams: number;
    latitude: number | null;
    longitude: number | null;
}

interface DirectoryMapProps {
    campaigns: MapCampaign[];
    userLat?: number | null;
    userLng?: number | null;
}

// Custom gold coin icon for campaign markers
function createCampaignIcon(): L.DivIcon {
    return L.divIcon({
        className: 'campaign-marker-wrapper',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        html: `<div class="campaign-marker" style="
            width: 32px;
            height: 32px;
            background: rgba(20, 20, 20, 0.9);
            border: 2px solid var(--gold);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 0 15px rgba(212, 175, 55, 0.4), 0 4px 8px rgba(0,0,0,0.5);
            color: var(--gold);
            transition: transform 0.2s, box-shadow 0.2s;
        ">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/></svg>
        </div>`,
    });
}

// Custom user location icon
function createUserIcon(): L.DivIcon {
    return L.divIcon({
        className: 'user-marker-wrapper',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        html: `<div style="
            width: 16px;
            height: 16px;
            background: var(--accent);
            border-radius: 50%;
            border: 3px solid #fff;
            box-shadow: 0 0 15px var(--accent);
        "></div>`,
    });
}

export function DirectoryMap({ campaigns, userLat, userLng }: DirectoryMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<L.Map | null>(null);
    const markersRef = useRef<{ [key: string]: L.Marker }>({});
    const [popupInfo, setPopupInfo] = useState<MapCampaign | null>(null);

    // Initial map setup
    useEffect(() => {
        if (!mapContainer.current) return;
        if (map.current) return; // Initialize map only once

        map.current = L.map(mapContainer.current, {
            center: [userLat ?? 20, userLng ?? 0],
            zoom: userLng ? 11 : 2,
            zoomControl: false,
        });

        // Add zoom control to top-right (matching previous Mapbox layout)
        L.control.zoom({ position: 'topright' }).addTo(map.current);

        // Add dark tile layer
        L.tileLayer(TILE_URL, {
            attribution: TILE_ATTRIBUTION,
            maxZoom: 19,
            subdomains: 'abcd',
        }).addTo(map.current);

        // Cleanup on unmount
        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
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
        const campaignIcon = createCampaignIcon();

        validCampaigns.forEach(campaign => {
            const lat = Number(campaign.latitude);
            const lng = Number(campaign.longitude);

            if (!markersRef.current[campaign._id]) {
                const marker = L.marker([lat, lng], { icon: campaignIcon })
                    .addTo(map.current!);

                marker.on('click', () => {
                    setPopupInfo(campaign);

                    // Fly to the clicked marker
                    if (map.current) {
                        map.current.flyTo([lat, lng], 14, {
                            duration: 1.2,
                        });
                    }
                });

                // Hover effects via DOM
                const el = marker.getElement();
                if (el) {
                    el.addEventListener('mouseenter', () => {
                        const inner = el.querySelector('.campaign-marker') as HTMLElement;
                        if (inner) {
                            inner.style.transform = 'scale(1.1) translateY(-4px)';
                            inner.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.6), 0 8px 16px rgba(0,0,0,0.6)';
                        }
                    });
                    el.addEventListener('mouseleave', () => {
                        const inner = el.querySelector('.campaign-marker') as HTMLElement;
                        if (inner) {
                            inner.style.transform = 'none';
                            inner.style.boxShadow = '0 0 15px rgba(212, 175, 55, 0.4), 0 4px 8px rgba(0,0,0,0.5)';
                        }
                    });
                }

                markersRef.current[campaign._id] = marker;
            } else {
                // Update position if it exists
                markersRef.current[campaign._id].setLatLng([lat, lng]);
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

        const userIcon = createUserIcon();

        if (!markersRef.current['user-location']) {
            const marker = L.marker([userLat, userLng], { icon: userIcon })
                .addTo(map.current);
            markersRef.current['user-location'] = marker;
        } else {
            markersRef.current['user-location'].setLatLng([userLat, userLng]);
        }

    }, [userLat, userLng]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* The Map Container */}
            <div ref={mapContainer} className="leaflet-map-container" />

            {/* Custom Overlay Popup (React-rendered, positioned over map) */}
            {popupInfo && (
                <div
                    className="premium-map-popup-overlay"
                    style={{
                        position: 'absolute',
                        top: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 1000,
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
                                {popupInfo.rewardGrams} oz
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
