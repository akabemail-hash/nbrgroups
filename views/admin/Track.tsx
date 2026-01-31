
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { Customer } from '../../types';
import L from 'leaflet';
import { Loader2, Store, Briefcase, ShoppingBag, Check, RefreshCw, Layers, MapPin } from 'lucide-react';

// --- Custom Icon Creation ---
const createCustomIcon = (svgPath: string, color: string, bgColor: string) => {
  const iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg>`;
  return L.divIcon({
    html: `<div style="background-color: ${bgColor}; border: 3px solid ${color}; width: 36px; height: 36px; border-radius: 50%; display: flex; justify-content: center; align-items: center; box-shadow: 0 4px 8px rgba(0,0,0,0.25);">${iconHtml}</div>`,
    className: 'custom-map-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

const storeSvgPath = `<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7"/>`;
const briefcaseSvgPath = `<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>`;
const shoppingBagSvgPath = `<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>`;

const customerIcon = createCustomIcon(storeSvgPath, '#3b82f6', '#2563eb'); 
const sellerIcon = createCustomIcon(briefcaseSvgPath, '#22c55e', '#16a34a'); 
const merchIcon = createCustomIcon(shoppingBagSvgPath, '#a855f7', '#9333ea'); 

type FilterType = 'customers' | 'sellers' | 'merchs';

// Maximum points to render to prevent browser crash
const MAX_POINTS = 2000;

const Track: React.FC = () => {
    const { t, permissions, showNotification } = useAppContext();
    const pagePermissions = permissions['Track'];

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [sellers, setSellers] = useState<any[]>([]);
    const [merchs, setMerchs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<Record<FilterType, boolean>>({
        customers: true,
        sellers: true,
        merchs: true,
    });
    
    // Main Map Refs
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markersRef = useRef<L.LayerGroup | null>(null);
    const [mapReady, setMapReady] = useState(false);

    // --- Data Fetching ---
    const fetchData = useCallback(async () => {
        if (!pagePermissions?.can_view) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // Apply limit to prevent huge data loads initially
            const customersPromise = supabase
                .from('customers')
                .select('*')
                .eq('is_active', true)
                .not('gps_latitude', 'is', null)
                .not('gps_longitude', 'is', null)
                .limit(MAX_POINTS);
            
            const sellersPromise = supabase
                .from('users')
                .select('*, role:user_roles!inner(name)')
                .eq('is_active', true)
                .eq('role.name', 'Seller')
                .not('last_known_latitude', 'is', null)
                .not('last_known_longitude', 'is', null);

            const merchsPromise = supabase
                .from('users')
                .select('*, role:user_roles!inner(name)')
                .eq('is_active', true)
                .eq('role.name', 'Merch')
                .not('last_known_latitude', 'is', null)
                .not('last_known_longitude', 'is', null);

            const [
                { data: customersData, error: customersError },
                { data: sellersData, error: sellersError },
                { data: merchsData, error: merchsError },
            ] = await Promise.all([customersPromise, sellersPromise, merchsPromise]);
            
            if (customersError || sellersError || merchsError) {
                throw new Error([customersError?.message, sellersError?.message, merchsError?.message].filter(Boolean).join(', '));
            }

            setCustomers(customersData || []);
            setSellers(sellersData || []);
            setMerchs(merchsData || []);

        } catch (error: any) {
            showNotification(`Error fetching location data: ${error.message}`, 'error');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [pagePermissions, showNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    // --- Load Leaflet CSS Manually ---
    useEffect(() => {
        // Ensure Leaflet CSS is loaded. This fixes issues where tiles appear as simple images
        // stacked on top of each other ("frame-by-frame") because 'position: absolute' is missing.
        const linkId = 'leaflet-css-manual-injection';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }
    }, []);

    // --- Initialize Main Map ---
    useEffect(() => {
        const timer = setTimeout(() => {
            if (mapContainerRef.current && !mapRef.current) {
                // Remove any existing map instance logic is handled by ref check usually,
                // but we also check for _leaflet_id property on container
                if ((mapContainerRef.current as any)._leaflet_id) return; 

                try {
                    const map = L.map(mapContainerRef.current, { 
                        center: [40.4093, 49.8671], 
                        zoom: 12,
                        zoomControl: true,
                    });

                    // Use CartoDB Voyager for high reliability
                    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                        maxZoom: 19
                    }).addTo(map);

                    markersRef.current = L.layerGroup().addTo(map);
                    mapRef.current = map;
                    setMapReady(true);
                    
                    // Force invalidate size to handle container dimension changes
                    setTimeout(() => map.invalidateSize(), 200);
                } catch (err) {
                    console.error("Map initialization failed:", err);
                }
            }
        }, 100);

        return () => {
            clearTimeout(timer);
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                markersRef.current = null;
                setMapReady(false);
            }
        };
    }, []);

    // Handle Window Resize
    useEffect(() => {
        const handleResize = () => {
            if (mapRef.current) {
                mapRef.current.invalidateSize();
            }
        };
        
        window.addEventListener('resize', handleResize);
        const interval = setInterval(handleResize, 1000); // Periodic check for layout changes
        
        return () => {
            window.removeEventListener('resize', handleResize);
            clearInterval(interval);
        };
    }, []);

    // Update Markers
    useEffect(() => {
        if (!mapRef.current || !markersRef.current || !mapReady) return;
        
        mapRef.current.invalidateSize();
        markersRef.current.clearLayers();
        const allPoints: L.LatLngExpression[] = [];

        // Plot Customers
        if (filters.customers) {
            customers.forEach(customer => {
                if (customer.gps_latitude && customer.gps_longitude) {
                    const latLng: L.LatLngExpression = [customer.gps_latitude, customer.gps_longitude];
                    allPoints.push(latLng);
                    const popupContent = `
                        <div class="p-2 min-w-[150px]">
                            <h3 class="font-bold text-sm text-gray-900">${customer.name}</h3>
                            <p class="text-xs mt-1 text-gray-600"><strong>${t('track.popup.phone')}:</strong> ${customer.phone_number || 'N/A'}</p>
                            <p class="text-xs text-gray-600"><strong>${t('track.popup.contact')}:</strong> ${customer.contact_person_name || 'N/A'}</p>
                        </div>
                    `;
                    L.marker(latLng, { icon: customerIcon }).bindPopup(popupContent).addTo(markersRef.current!);
                }
            });
        }

        // Plot Sellers
        if (filters.sellers) {
            sellers.forEach(seller => {
                if (seller.last_known_latitude && seller.last_known_longitude) {
                    const latLng: L.LatLngExpression = [seller.last_known_latitude, seller.last_known_longitude];
                    allPoints.push(latLng);
                    const popupContent = `
                        <div class="p-2 min-w-[150px]">
                            <h3 class="font-bold text-sm text-gray-900">${seller.full_name}</h3>
                            <p class="text-xs mt-1 text-green-600 font-semibold">Seller</p>
                            <p class="text-xs text-gray-600"><strong>${t('track.popup.phone')}:</strong> ${seller.phone_number || 'N/A'}</p>
                        </div>
                    `;
                    L.marker(latLng, { icon: sellerIcon }).bindPopup(popupContent).addTo(markersRef.current!);
                }
            });
        }
        
        // Plot Merchs
        if (filters.merchs) {
            merchs.forEach(merch => {
                if (merch.last_known_latitude && merch.last_known_longitude) {
                    const latLng: L.LatLngExpression = [merch.last_known_latitude, merch.last_known_longitude];
                    allPoints.push(latLng);
                    const popupContent = `
                        <div class="p-2 min-w-[150px]">
                            <h3 class="font-bold text-sm text-gray-900">${merch.full_name}</h3>
                            <p class="text-xs mt-1 text-purple-600 font-semibold">Merchandiser</p>
                            <p class="text-xs text-gray-600"><strong>${t('track.popup.phone')}:</strong> ${merch.phone_number || 'N/A'}</p>
                        </div>
                    `;
                    L.marker(latLng, { icon: merchIcon }).bindPopup(popupContent).addTo(markersRef.current!);
                }
            });
        }

        if (allPoints.length > 0) {
            const bounds = L.latLngBounds(allPoints);
            if (bounds.isValid()) {
                mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
            }
        }
        
    }, [customers, sellers, merchs, filters, t, mapReady]);
    
    const handleFilterToggle = (filter: FilterType) => {
        setFilters(prev => ({...prev, [filter]: !prev[filter]}));
    };

    const handleRefresh = () => {
        fetchData();
        if (mapRef.current) mapRef.current.invalidateSize();
    };

    if (!pagePermissions?.can_view) {
        return <p className="text-text-secondary dark:text-dark-text-secondary">{t('error.accessDenied.message')}</p>;
    }

    const FilterButton = ({ filter, label, count, icon: Icon, colorClasses }: { filter: FilterType, label: string, count: number, icon: React.ElementType, colorClasses: string }) => {
        const isActive = filters[filter];
        return (
            <button
                onClick={() => handleFilterToggle(filter)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-full border transition-all duration-200 shadow-sm ${
                    isActive
                        ? colorClasses
                        : 'bg-surface dark:bg-dark-surface border-border dark:border-dark-border text-text-secondary dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
            >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    {count}
                </span>
                {isActive && <Check className="h-3 w-3 ml-1" />}
            </button>
        )
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto pb-10">
            {/* CSS Override for Leaflet/Tailwind conflict */}
            <style>{`
                /* Ensure tiles are not collapsed by Tailwind's img { max-width: 100% } */
                .leaflet-pane img,
                .leaflet-tile,
                .leaflet-marker-icon,
                .leaflet-marker-shadow,
                .leaflet-tile-container img {
                    max-width: none !important;
                    max-height: none !important;
                }
                .leaflet-container {
                    z-index: 0;
                    background-color: #e5e7eb; /* gray-200 */
                }
                .dark .leaflet-container {
                    background-color: #1f2937; /* gray-800 */
                }
            `}</style>

            <div className="flex flex-col space-y-4 mb-4 flex-shrink-0">
                 <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary flex items-center gap-2">
                        <MapPin className="h-6 w-6 text-accent" />
                        {t('track.title')}
                    </h1>
                    <button 
                        onClick={handleRefresh}
                        className="p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 shadow-sm"
                        title="Refresh Data & Map"
                    >
                        <RefreshCw className={`h-4 w-4 text-text-secondary ${loading ? 'animate-spin' : ''}`} />
                    </button>
                 </div>
                 
                 <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-border dark:border-dark-border">
                    <div className="flex items-center gap-2 text-sm text-text-secondary dark:text-dark-text-secondary mr-2">
                        <Layers className="h-4 w-4" />
                        <span className="hidden sm:inline">Layers:</span>
                    </div>
                    <FilterButton 
                        filter="customers" 
                        label={t('track.filter.customers')} 
                        count={customers.length}
                        icon={Store} 
                        colorClasses="bg-blue-600 border-blue-700 text-white"
                    />
                    <FilterButton 
                        filter="sellers" 
                        label={t('track.filter.sellers')} 
                        count={sellers.length}
                        icon={Briefcase} 
                        colorClasses="bg-green-600 border-green-700 text-white"
                    />
                    <FilterButton 
                        filter="merchs" 
                        label={t('sidebar.merchandisers')} 
                        count={merchs.length}
                        icon={ShoppingBag} 
                        colorClasses="bg-purple-600 border-purple-700 text-white"
                    />
                 </div>
                 
                 {customers.length >= MAX_POINTS && (
                     <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-md border border-amber-200 dark:border-amber-800">
                         Displaying first {MAX_POINTS} customers to ensure performance. Filter your data if needed.
                     </div>
                 )}
            </div>
            
            {/* Map Container Wrapper */}
            <div className="flex-shrink-0 w-full h-[600px] rounded-xl shadow-xl border border-border dark:border-dark-border overflow-hidden relative bg-gray-200 dark:bg-gray-800 mb-8">
                {loading && (
                    <div className="absolute inset-0 bg-black/20 z-[1000] flex items-center justify-center backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-2xl flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="text-xs font-semibold text-text-secondary">Loading Map Data...</span>
                        </div>
                    </div>
                )}
                <div 
                    ref={mapContainerRef} 
                    className="absolute inset-0 w-full h-full"
                    style={{ minHeight: '500px' }}
                />
            </div>
        </div>
    );
};

export default Track;
