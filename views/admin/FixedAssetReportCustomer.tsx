
import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { Customer } from '../../types';
import { Loader2, ChevronDown, ChevronRight, Image as ImageIcon, X, History, Box } from 'lucide-react';

const ReportItem: React.FC<{ 
    deliveryItem: any; 
    onImageClick: (url: string) => void;
}> = ({ deliveryItem, onImageClick }) => {
    const { t } = useAppContext();
    const [checks, setChecks] = useState<any[]>([]);
    const [loadingChecks, setLoadingChecks] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const toggleChecks = async () => {
        if (!expanded && checks.length === 0) {
            setLoadingChecks(true);
            const { data, error } = await supabase
                .from('fixed_asset_checks')
                .select('*, creator:users(full_name)')
                .eq('fixed_asset_item_id', deliveryItem.id)
                .order('check_date', { ascending: false });
            
            if (!error && data) setChecks(data);
            setLoadingChecks(false);
        }
        setExpanded(!expanded);
    };

    return (
        <div className="border border-border dark:border-dark-border rounded-lg mb-4 overflow-hidden bg-white dark:bg-gray-800">
             {/* Header: Original Delivery Info */}
             <div className="p-4 bg-gray-50 dark:bg-gray-750 flex flex-col sm:flex-row gap-4 justify-between items-start">
                 <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                        <Box className="h-6 w-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg text-text-primary dark:text-dark-text-primary">{deliveryItem.brand?.name}</h4>
                        <p className="text-sm text-text-secondary">Delivered: {new Date(deliveryItem.delivery?.delivery_date).toLocaleDateString()}</p>
                        {deliveryItem.delivery?.description && <p className="text-xs italic mt-1 opacity-75">"{deliveryItem.delivery.description}"</p>}
                    </div>
                 </div>
                 
                 {/* Original Images */}
                 {deliveryItem.image_urls && deliveryItem.image_urls.length > 0 && (
                     <div className="flex gap-2">
                         {deliveryItem.image_urls.map((url: string, i: number) => (
                             <img key={i} src={url} onClick={(e) => { e.stopPropagation(); onImageClick(url); }} className="h-16 w-16 object-cover rounded-md border border-border cursor-pointer hover:opacity-80" alt="Original" />
                         ))}
                     </div>
                 )}
             </div>

             {/* Action Bar */}
             <button 
                onClick={toggleChecks}
                className="w-full p-2 bg-gray-100 dark:bg-gray-700 flex items-center justify-center gap-2 text-sm font-semibold text-text-secondary hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
             >
                 {expanded ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                 View History / Checks
             </button>

             {/* Checks History */}
             {expanded && (
                 <div className="p-4 space-y-4 bg-gray-50/50 dark:bg-gray-800/50">
                     {loadingChecks ? <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div> : 
                      checks.length === 0 ? <p className="text-center text-sm text-text-secondary italic">No checks recorded yet.</p> :
                      checks.map(check => (
                          <div key={check.id} className="relative pl-6 border-l-2 border-gray-300 dark:border-gray-600 pb-4 last:pb-0">
                              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600 border-2 border-white dark:border-gray-800"></div>
                              <div className="flex justify-between items-start mb-1">
                                  <span className="text-sm font-bold">{new Date(check.check_date).toLocaleString()}</span>
                                  <span className="text-xs text-text-secondary">by {check.creator?.full_name || 'Unknown'}</span>
                              </div>
                              <p className="text-sm mb-2">{check.description}</p>
                              {check.photo_urls && check.photo_urls.length > 0 && (
                                  <div className="flex gap-2">
                                      {check.photo_urls.map((url: string, idx: number) => (
                                          <img key={idx} src={url} onClick={() => onImageClick(url)} className="h-12 w-12 object-cover rounded border border-border cursor-pointer hover:scale-105 transition-transform" alt="Check Proof" />
                                      ))}
                                  </div>
                              )}
                          </div>
                      ))
                     }
                 </div>
             )}
        </div>
    );
};

const FixedAssetReportCustomer: React.FC = () => {
    const { t, permissions, showNotification } = useAppContext();
    const pagePermissions = permissions['Fixed Asset Report Customer'];

    const [groupedItems, setGroupedItems] = useState<Record<string, any[]>>({});
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewingImage, setViewingImage] = useState<string | null>(null);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());

    const fetchDropdowns = useCallback(async () => {
         const { data, error } = await supabase.from('customers').select('id, name').order('name');
         if(error) showNotification("Error loading customers", "error");
         else setCustomers(data as Customer[]);
    }, [showNotification]);

    const fetchData = useCallback(async () => {
        if (!pagePermissions?.can_view) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // Fetch all delivery items (assets)
            // Note: Filter applies to Delivery Date or we could join Checks. 
            // For now, let's filter by original delivery date as primary scope.
            let query = supabase
                .from('fixed_asset_delivery_items')
                .select(`
                    *,
                    brand:fixed_asset_brands(name),
                    delivery:fixed_asset_deliveries!inner(customer_id, delivery_date, description, customer:customers(name))
                `)
                .order('created_at', { ascending: false });

            if (startDate) query = query.gte('delivery.delivery_date', `${startDate}T00:00:00.000Z`);
            if (endDate) query = query.lte('delivery.delivery_date', `${endDate}T23:59:59.999Z`);
            if (selectedCustomerId) query = query.eq('delivery.customer_id', selectedCustomerId);
            
            const { data, error } = await query;
            if (error) throw error;

            // Group by Customer ID
            const groups: Record<string, any[]> = {};
            (data || []).forEach((item: any) => {
                const cId = item.delivery.customer_id;
                if (!groups[cId]) groups[cId] = [];
                groups[cId].push(item);
            });
            
            setGroupedItems(groups);

        } catch (error: any) {
            showNotification(error.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [pagePermissions, startDate, endDate, selectedCustomerId, showNotification]);

    useEffect(() => {
        fetchDropdowns();
    }, [fetchDropdowns]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const toggleExpandCustomer = (customerId: string) => {
        setExpandedCustomers(prev => {
            const next = new Set(prev);
            if (next.has(customerId)) next.delete(customerId);
            else next.add(customerId);
            return next;
        });
    };

    if (!pagePermissions?.can_view) return <p>{t('error.accessDenied.message')}</p>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">{t('fixedAssetReportCustomer.title')}</h1>

            <div className="p-4 bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Delivery Date Range</label>
                        <div className="flex gap-2">
                             <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 bg-transparent border border-border rounded-md text-sm" />
                             <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 bg-transparent border border-border rounded-md text-sm" />
                        </div>
                    </div>
                    <div>
                         <label className="block text-sm font-medium mb-1">{t('fixedAssetReportCustomer.filterByCustomer')}</label>
                         <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full p-2 bg-surface dark:bg-dark-surface border border-border rounded-md text-sm">
                             <option value="">All Customers</option>
                             {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                         </select>
                    </div>
                </div>
            </div>

            {loading ? <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div> :
             Object.keys(groupedItems).length === 0 ? <p className="text-center py-8 text-text-secondary">{t('fixedAssetReportCustomer.noResults')}</p> :
             (
                 <div className="space-y-4">
                     {Object.keys(groupedItems).map(customerId => {
                         const groupItems = groupedItems[customerId];
                         if (groupItems.length === 0) return null;
                         const customerName = groupItems[0].delivery?.customer?.name || "Unknown Customer";
                         const isExpanded = expandedCustomers.has(customerId);
                         
                         return (
                             <div key={customerId} className="bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border overflow-hidden">
                                 <button 
                                    onClick={() => toggleExpandCustomer(customerId)}
                                    className="w-full flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                 >
                                     <span className="font-bold text-lg text-text-primary dark:text-dark-text-primary flex items-center gap-2">
                                         {customerName}
                                         <span className="text-xs font-normal text-white bg-primary px-2 py-0.5 rounded-full">
                                             {groupItems.length} Assets
                                         </span>
                                     </span>
                                     {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                                 </button>
                                 
                                 {isExpanded && (
                                     <div className="p-4 border-t border-border dark:border-dark-border bg-white dark:bg-gray-900">
                                         {groupItems.map(item => (
                                             <ReportItem key={item.id} deliveryItem={item} onImageClick={setViewingImage} />
                                         ))}
                                     </div>
                                 )}
                             </div>
                         );
                     })}
                 </div>
             )
            }

            {viewingImage && (
                <div className="fixed inset-0 bg-black bg-opacity-90 z-[100] flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
                    <img src={viewingImage} alt="Full Asset" className="max-w-full max-h-full rounded-lg shadow-xl" />
                    <button className="absolute top-4 right-4 p-2 bg-white/20 rounded-full text-white hover:bg-white/40"><X/></button>
                </div>
            )}
        </div>
    );
};

export default FixedAssetReportCustomer;
