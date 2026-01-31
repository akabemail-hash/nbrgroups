
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { Customer, VisitType, SellerVisit, MerchVisit } from '../../types';
import L from 'leaflet';
import { Loader2, Store, MapPin, Search, Info, CalendarCheck, X, Save, AlertTriangle, CheckCircle } from 'lucide-react';
import { ImageUpload } from '../../components/ImageUpload';

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
const customerIcon = createCustomIcon(storeSvgPath, '#3b82f6', '#2563eb'); 

// --- Reusing VisitFormModal from DailyPlan ---
const VisitFormModal: React.FC<{
    customer: Customer;
    onClose: () => void;
    onSave: (visitData: Partial<SellerVisit | MerchVisit>, beforeFiles: File[], afterFiles: File[]) => Promise<void>;
    visitTypes: VisitType[];
}> = ({ customer, onClose, onSave, visitTypes }) => {
    const { t } = useAppContext();
    const [visitTypeId, setVisitTypeId] = useState<string>('');
    const [description, setDescription] = useState('');
    const [beforeFiles, setBeforeFiles] = useState<File[]>([]);
    const [afterFiles, setAfterFiles] = useState<File[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!visitTypeId) {
            setSaveError('Please select a visit type.');
            return;
        }
        setIsSaving(true);
        setSaveError(null);
        try {
            const visitData: Partial<SellerVisit | MerchVisit> = {
                customer_id: customer.id,
                visit_type_id: visitTypeId,
                description,
                visit_datetime: new Date().toISOString(),
            };
            await onSave(visitData, beforeFiles, afterFiles);
        } catch (error: any) {
            setSaveError(error.message);
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-4">
            <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-border dark:border-dark-border">
                    <h2 className="text-xl font-bold">{t('dailyPlan.visitFormTitle')}</h2>
                    <button onClick={onClose}><X className="h-6 w-6" /></button>
                </div>
                <div className="overflow-y-auto p-6 space-y-6">
                    {saveError && <div className="p-3 bg-red-100 text-red-700 rounded-md flex items-center gap-2"><AlertTriangle className="h-5 w-5"/>{saveError}</div>}
                    
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <h3 className="font-bold text-lg">{customer.name}</h3>
                        <p className="text-sm text-text-secondary">{customer.address}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('dailyPlan.visitDateTime')}</label>
                            <input type="text" readOnly value={new Date().toLocaleString()} className="w-full p-2 bg-gray-100 dark:bg-gray-800 border border-border dark:border-dark-border rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('dailyPlan.visitType')}</label>
                            <select value={visitTypeId} onChange={(e) => setVisitTypeId(e.target.value)} className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md">
                                <option value="">Select a type...</option>
                                {visitTypes.map(vt => <option key={vt.id} value={vt.id}>{vt.name}</option>)}
                            </select>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium mb-1">{t('dailyPlan.description')}</label>
                        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ImageUpload
                            files={beforeFiles}
                            onChange={setBeforeFiles}
                            maxFiles={3}
                            label={t('dailyPlan.beforeImages')}
                            buttonText={t('common.addPhoto')}
                        />
                        <ImageUpload
                            files={afterFiles}
                            onChange={setAfterFiles}
                            maxFiles={3}
                            label={t('dailyPlan.afterImages')}
                            buttonText={t('common.addPhoto')}
                        />
                    </div>
                </div>
                 <div className="flex justify-end items-center p-4 border-t border-border dark:border-dark-border">
                    <button onClick={onClose} className="px-4 py-2 mr-2 rounded-md border border-border dark:border-dark-border">{t('form.cancel')}</button>
                    <button onClick={handleSubmit} disabled={isSaving} className="px-4 py-2 text-white bg-primary rounded-md hover:bg-secondary disabled:opacity-50 flex items-center">
                        {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-5 w-5" />}
                        {isSaving ? 'Saving...' : t('form.save')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Customer Details Modal ---
const CustomerDetailsModal: React.FC<{ customer: Customer; onClose: () => void }> = ({ customer, onClose }) => {
    const { t } = useAppContext();
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-4">
            <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center p-4 border-b border-border dark:border-dark-border">
                    <h2 className="text-xl font-bold">{t('customersMap.detailsTitle')}</h2>
                    <button onClick={onClose}><X className="h-6 w-6" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-xs text-text-secondary uppercase font-semibold">{t('customers.name')}</label>
                        <p className="text-lg font-bold">{customer.name}</p>
                    </div>
                    <div>
                        <label className="text-xs text-text-secondary uppercase font-semibold">{t('customers.customerCode')}</label>
                        <p className="text-base">{customer.customer_code}</p>
                    </div>
                    <div>
                        <label className="text-xs text-text-secondary uppercase font-semibold">{t('customers.address')}</label>
                        <p className="text-base">{customer.address || 'N/A'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-text-secondary uppercase font-semibold">{t('customers.contactPersonName')}</label>
                            <p className="text-base">{customer.contact_person_name || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="text-xs text-text-secondary uppercase font-semibold">{t('customers.contactPersonPhone')}</label>
                            <p className="text-base">{customer.contact_person_phone || 'N/A'}</p>
                        </div>
                    </div>
                    {customer.notes && (
                        <div>
                            <label className="text-xs text-text-secondary uppercase font-semibold">{t('customers.notes')}</label>
                            <p className="text-sm italic">{customer.notes}</p>
                        </div>
                    )}
                </div>
                <div className="flex justify-end p-4 border-t border-border dark:border-dark-border">
                    <button onClick={onClose} className="px-4 py-2 bg-primary text-white rounded-md">{t('form.cancel')}</button>
                </div>
            </div>
        </div>
    );
};


const CustomersMap: React.FC = () => {
    const { t, permissions, showNotification, profile } = useAppContext();
    const pagePermissions = permissions['Customers Map'];

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [visitTypes, setVisitTypes] = useState<VisitType[]>([]);
    const [loading, setLoading] = useState(true);
    const [mapReady, setMapReady] = useState(false);
    
    // Search state
    const [searchTerm, setSearchTerm] = useState('');
    
    // Interaction state
    const [selectedCustomerForVisit, setSelectedCustomerForVisit] = useState<Customer | null>(null);
    const [selectedCustomerForInfo, setSelectedCustomerForInfo] = useState<Customer | null>(null);

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markersRef = useRef<L.LayerGroup | null>(null);

    // Fetch Data Logic
    const fetchData = useCallback(async () => {
        if (!pagePermissions?.can_view || !profile) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            let customersData: any[] = [];
            const roleName = profile.role?.name;

            // 1. Fetch Customers based on Role
            if (roleName === 'Admin') {
                const { data, error } = await supabase
                    .from('customers')
                    .select('*')
                    .not('gps_latitude', 'is', null)
                    .not('gps_longitude', 'is', null)
                    .eq('is_active', true);
                if (error) throw error;
                customersData = data || [];
            } else if (roleName === 'Seller') {
                // Get Seller ID first
                const { data: seller, error: sellerError } = await supabase.from('sellers').select('id').eq('user_id', profile.id).single();
                if (sellerError) throw sellerError;
                
                // Get Linked Customers
                const { data, error } = await supabase
                    .from('customers')
                    .select('*, customer_seller_relationships!inner(seller_id)')
                    .eq('customer_seller_relationships.seller_id', seller.id)
                    .not('gps_latitude', 'is', null)
                    .not('gps_longitude', 'is', null)
                    .eq('is_active', true);
                if (error) throw error;
                customersData = data || [];
            } else if (roleName === 'Merch') {
                // Get Merch ID first
                const { data: merch, error: merchError } = await supabase.from('merchs').select('id').eq('user_id', profile.id).single();
                if (merchError) throw merchError;

                // Get Linked Customers
                const { data, error } = await supabase
                    .from('customers')
                    .select('*, customer_merch_relationships!inner(merch_id)')
                    .eq('customer_merch_relationships.merch_id', merch.id)
                    .not('gps_latitude', 'is', null)
                    .not('gps_longitude', 'is', null)
                    .eq('is_active', true);
                if (error) throw error;
                customersData = data || [];
            }

            setCustomers(customersData);

            // 2. Fetch Visit Types (needed for the modal)
            const { data: vtData, error: vtError } = await supabase.from('visit_types').select('*').eq('is_active', true);
            if (vtError) throw vtError;
            setVisitTypes(vtData || []);

        } catch (error: any) {
            showNotification(`Error fetching data: ${error.message}`, 'error');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [pagePermissions, profile, showNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Initialize Map
    useEffect(() => {
        const timer = setTimeout(() => {
            if (mapContainerRef.current && !mapRef.current) {
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

    // Update Markers based on Search
    useEffect(() => {
        if (!mapRef.current || !markersRef.current || !mapReady) return;
        
        mapRef.current.invalidateSize();
        markersRef.current.clearLayers();
        const allPoints: L.LatLngExpression[] = [];

        const filteredCustomers = customers.filter(c => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return c.name.toLowerCase().includes(term) || c.customer_code.toLowerCase().includes(term);
        });

        filteredCustomers.forEach(customer => {
            if (customer.gps_latitude && customer.gps_longitude) {
                const latLng: L.LatLngExpression = [customer.gps_latitude, customer.gps_longitude];
                allPoints.push(latLng);
                
                // Create marker
                const marker = L.marker(latLng, { icon: customerIcon }).addTo(markersRef.current!);
                
                // Bind Popup with Buttons
                // Note: We use a simple HTML string. To handle clicks, we need to bind event listeners *after* the popup opens.
                const popupContent = `
                    <div class="p-2 min-w-[200px] text-center">
                        <h3 class="font-bold text-sm text-gray-900 mb-2">${customer.name}</h3>
                        <div class="flex gap-2 justify-center">
                            <button id="btn-info-${customer.id}" class="px-3 py-1 bg-blue-600 text-white text-xs rounded shadow hover:bg-blue-700">
                                ${t('customersMap.info')}
                            </button>
                            <button id="btn-visit-${customer.id}" class="px-3 py-1 bg-green-600 text-white text-xs rounded shadow hover:bg-green-700">
                                ${t('customersMap.visit')}
                            </button>
                        </div>
                    </div>
                `;
                
                marker.bindPopup(popupContent);

                // Event delegation for popup buttons
                marker.on('popupopen', () => {
                    const infoBtn = document.getElementById(`btn-info-${customer.id}`);
                    const visitBtn = document.getElementById(`btn-visit-${customer.id}`);

                    if (infoBtn) {
                        infoBtn.onclick = (e) => {
                            e.stopPropagation(); // Prevent map click
                            setSelectedCustomerForInfo(customer);
                            marker.closePopup();
                        };
                    }
                    if (visitBtn) {
                        visitBtn.onclick = (e) => {
                            e.stopPropagation();
                            setSelectedCustomerForVisit(customer);
                            marker.closePopup();
                        };
                    }
                });
            }
        });

        if (allPoints.length > 0) {
            const bounds = L.latLngBounds(allPoints);
            if (bounds.isValid()) {
                mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
            }
        }
        
    }, [customers, searchTerm, mapReady, t]); // Dependencies updated

    const handleSaveVisit = async (visitData: Partial<SellerVisit | MerchVisit>, beforeFiles: File[], afterFiles: File[]) => {
        try {
            const uploadFile = async (file: File) => {
                const filePath = `public/${profile!.id}/${Date.now()}-${file.name}`;
                const { error } = await supabase.storage.from('visit_photos').upload(filePath, file);
                if (error) throw new Error(`Failed to upload ${file.name}: ${error.message}`);
                return supabase.storage.from('visit_photos').getPublicUrl(filePath).data.publicUrl;
            };

            const before_image_urls = await Promise.all(beforeFiles.map(f => uploadFile(f)));
            const after_image_urls = await Promise.all(afterFiles.map(f => uploadFile(f)));

            let finalVisitData: any = {
                ...visitData,
                created_by: profile!.id,
                before_image_urls,
                after_image_urls,
            };
            
            let tableName: 'seller_visits' | 'merch_visits';
            
            const roleName = profile?.role?.name;

            if (roleName === 'Seller') {
                tableName = 'seller_visits';
                const { data: sellerProfile } = await supabase.from('sellers').select('id').eq('user_id', profile!.id).single();
                if(!sellerProfile) throw new Error("Seller profile not found");
                finalVisitData.seller_id = sellerProfile.id;
            } else if (roleName === 'Merch') {
                tableName = 'merch_visits';
                const { data: merchProfile } = await supabase.from('merchs').select('id').eq('user_id', profile!.id).single();
                if(!merchProfile) throw new Error("Merch profile not found");
                finalVisitData.merch_id = merchProfile.id;
            } else {
                // Admins theoretically can't log visits for themselves in this schema easily without being a seller/merch too, 
                // or we add a generic visit table. For now, assume Admin just views or this modal is restricted.
                // But the requirement says "When a vendor or merchandiser logs in...", implies they are the primary users of this action.
                throw new Error("Only Sellers and Merchandisers can log visits.");
            }

            const { error: insertError } = await supabase.from(tableName).insert(finalVisitData);
            if (insertError) throw insertError;
            
            showNotification(t('notification.sellerVisit.saved'), 'success');
            setSelectedCustomerForVisit(null);

        } catch (error: any) {
            console.error("Save visit error:", error);
            showNotification(t('notification.sellerVisit.saveError').replace('{error}', error.message), 'error');
        }
    };

    if (!pagePermissions?.can_view) return <p className="text-text-secondary dark:text-dark-text-secondary">{t('error.accessDenied.message')}</p>;

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] relative">
             {/* Force override Leaflet/Tailwind conflicts locally */}
             <style>{`
                .leaflet-pane img,
                .leaflet-tile,
                .leaflet-marker-icon,
                .leaflet-marker-shadow,
                .leaflet-tile-container img {
                    max-width: none !important;
                    max-height: none !important;
                    width: auto;
                    padding: 0;
                }
                .leaflet-container {
                    z-index: 0;
                    background-color: #f3f4f6; /* gray-100 */
                }
                .dark .leaflet-container {
                    background-color: #111827; /* gray-900 */
                }
                .leaflet-popup-content-wrapper {
                    border-radius: 8px;
                    padding: 0;
                    overflow: hidden;
                }
                .leaflet-popup-content {
                    margin: 0;
                }
            `}</style>

            <div className="absolute top-4 right-4 z-[1000] w-64 md:w-80 shadow-lg">
                <div className="relative">
                    <input
                        type="text"
                        placeholder={t('customersMap.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-border dark:border-dark-border bg-white dark:bg-gray-800 text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
            </div>

            <div className="flex-grow w-full rounded-xl shadow-xl border border-border dark:border-dark-border overflow-hidden relative bg-gray-200 dark:bg-gray-800">
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
                    style={{ minHeight: '400px' }} 
                />
            </div>

            {/* Visit Modal */}
            {selectedCustomerForVisit && (
                <VisitFormModal 
                    customer={selectedCustomerForVisit} 
                    onClose={() => setSelectedCustomerForVisit(null)}
                    onSave={handleSaveVisit}
                    visitTypes={visitTypes}
                />
            )}

            {/* Info Modal */}
            {selectedCustomerForInfo && (
                <CustomerDetailsModal
                    customer={selectedCustomerForInfo}
                    onClose={() => setSelectedCustomerForInfo(null)}
                />
            )}
        </div>
    );
};

export default CustomersMap;
