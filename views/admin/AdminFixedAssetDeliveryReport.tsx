
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { FixedAssetDelivery, Customer, FixedAssetDeliveryItem } from '../../types';
import { Loader2, ChevronLeft, ChevronRight, Eye, X, Image as ImageIcon, Search, ChevronDown, CheckSquare, Square } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

const MultiSelectDropdown: React.FC<{
    options: { id: string; name: string }[];
    selectedIds: Set<string>;
    onChange: (id: string) => void;
    label: string;
    placeholder?: string;
    isSearchable?: boolean;
}> = ({ options, selectedIds, onChange, label, placeholder = 'Select options', isSearchable = false }) => {
    const { t } = useAppContext();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedCount = selectedIds.size;
     
    const filteredOptions = useMemo(() => {
        if (!isSearchable || !searchTerm) return options;
        const term = searchTerm.toLowerCase();
        return options.filter(o => o.name.toLowerCase().includes(term));
    }, [options, searchTerm, isSearchable]);

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium mb-1">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-left flex justify-between items-center text-sm focus:ring-2 focus:ring-primary transition-all"
            >
                <span className="truncate">
                    {selectedCount === 0 ? placeholder : `${selectedCount} Selected`}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="absolute z-20 w-full bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md mt-1 max-h-72 overflow-hidden shadow-xl flex flex-col animate-in fade-in slide-in-from-top-1 duration-200">
                    {isSearchable && (
                        <div className="p-2 border-b border-border dark:border-dark-border bg-gray-50 dark:bg-gray-800">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    className="w-full pl-8 pr-2 py-1.5 text-xs bg-white dark:bg-gray-900 border border-border dark:border-dark-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder={t('relations.searchPlaceholder')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}
                    <div className="overflow-y-auto p-1 flex-1">
                        {filteredOptions.length === 0 ? (
                            <div className="p-3 text-xs text-text-secondary italic text-center">No options found</div>
                        ) : (
                            filteredOptions.map(option => (
                                <div
                                    key={option.id}
                                    onClick={() => onChange(option.id)}
                                    className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded transition-colors"
                                >
                                    {selectedIds.has(option.id) ? (
                                        <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                                    ) : (
                                        <Square className="h-4 w-4 text-gray-400 shrink-0" />
                                    )}
                                    <span className="text-sm truncate text-text-primary dark:text-dark-text-primary">{option.name}</span>
                                </div>
                            ))
                        )}
                    </div>
                    {selectedCount > 0 && (
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 border-t border-border dark:border-dark-border flex justify-between items-center">
                            <span className="text-[10px] text-text-secondary uppercase font-bold">
                                {selectedCount} Selected
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const DetailsModal: React.FC<{ delivery: FixedAssetDelivery; onClose: () => void; onImageClick: (url: string) => void }> = ({ delivery, onClose, onImageClick }) => {
    const { t } = useAppContext();
    const [items, setItems] = useState<FixedAssetDeliveryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchItems = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('fixed_asset_delivery_items')
                .select('*, brand:fixed_asset_brands(name)')
                .eq('delivery_id', delivery.id);
            if (error) console.error("Error fetching items:", error);
            else setItems((data as any) || []);
            setLoading(false);
        };
        fetchItems();
    }, [delivery.id]);

    const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-border dark:border-dark-border">
                    <h2 className="text-xl font-bold">{t('fixedAssetDeliveryReport.detailsTitle')}</h2>
                    <button onClick={onClose}><X className="h-6 w-6" /></button>
                </div>
                <div className="overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div><strong>{t('fixedAssetDelivery.customer')}:</strong> {delivery.customer?.name}</div>
                        <div><strong>{t('fixedAssetDelivery.deliveryDate')}:</strong> {new Date(delivery.delivery_date).toLocaleString()}</div>
                        <div className="md:col-span-2"><strong>{t('fixedAssetDelivery.gpsCoordinates')}:</strong> {delivery.gps_latitude}, {delivery.gps_longitude}</div>
                        <div className="md:col-span-2"><strong>{t('fixedAssetDelivery.description')}:</strong> {delivery.description || 'N/A'}</div>
                    </div>
                    <div className="border-t border-border dark:border-dark-border pt-4">
                        <h3 className="font-semibold mb-2">{t('fixedAssetDelivery.items')}</h3>
                        {loading ? <div className="flex justify-center p-4"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div> : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-border dark:divide-dark-border">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium uppercase">{t('fixedAssetDelivery.brand')}</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium uppercase">{t('fixedAssetDelivery.quantity')}</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium uppercase">{t('fixedAssetDelivery.price')}</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium uppercase">Total</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium uppercase">{t('fixedAssetDelivery.photo')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border dark:divide-dark-border">
                                        {items.map(item => (
                                            <tr key={item.id}>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm">{item.brand?.name}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm">{item.quantity}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm">{item.price.toFixed(2)}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm">{(item.quantity * item.price).toFixed(2)}</td>
                                                <td className="px-4 py-2">
                                                    <div className="flex gap-1">
                                                        {item.image_urls?.map((url, i) => (
                                                            <img key={i} src={url} alt={`item ${i}`} onClick={() => onImageClick(url)} className="h-10 w-10 object-cover rounded cursor-pointer" />
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                         <div className="text-right font-bold mt-4 pr-4">{t('fixedAssetDeliveryReport.totalPrice')}: {totalPrice.toFixed(2)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AdminFixedAssetDeliveryReport: React.FC = () => {
    const { t, permissions, showNotification } = useAppContext();
    const pagePermissions = permissions['Fixed Asset Delivery Report'];

    const [deliveries, setDeliveries] = useState<FixedAssetDelivery[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);

    const [filters, setFilters] = useState({ 
        customerIds: new Set<string>(), 
        startDate: '', 
        endDate: '' 
    });
    const [viewingDelivery, setViewingDelivery] = useState<FixedAssetDelivery | null>(null);
    const [viewingImage, setViewingImage] = useState<string | null>(null);

    const fetchDeliveries = useCallback(async (page: number, currentFilters: typeof filters) => {
        if (!pagePermissions?.can_view) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            let query = supabase
                .from('fixed_asset_deliveries')
                .select('*, customer:customers(name)', { count: 'exact' });

            if (currentFilters.customerIds.size > 0) {
                query = query.in('customer_id', Array.from(currentFilters.customerIds));
            }
            
            if (currentFilters.startDate) query = query.gte('delivery_date', `${currentFilters.startDate}T00:00:00.000Z`);
            if (currentFilters.endDate) query = query.lte('delivery_date', `${currentFilters.endDate}T23:59:59.999Z`);
            
            const startIndex = (page - 1) * ITEMS_PER_PAGE;
            query = query.range(startIndex, startIndex + ITEMS_PER_PAGE - 1).order('delivery_date', { ascending: false });

            const { data, error, count } = await query;
            if (error) throw error;
            setDeliveries((data as any) || []);
            setTotalCount(count || 0);

        } catch (error: any) {
            showNotification(`Failed to load reports: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [pagePermissions, showNotification]);
    
    useEffect(() => {
        const fetchCustomers = async () => {
            const { data, error } = await supabase.from('customers').select('*').order('name');
            if (error) showNotification(`Failed to load customers: ${error.message}`, 'error');
            else setCustomers(data || []);
        };
        fetchCustomers();
    }, [showNotification]);

    useEffect(() => {
        fetchDeliveries(currentPage, filters);
    }, [currentPage, filters, fetchDeliveries]);

    const handleCustomerToggle = (id: string) => {
        setFilters(prev => {
            const newSet = new Set(prev.customerIds);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return { ...prev, customerIds: newSet };
        });
        setCurrentPage(1);
    };

    const handleApplyFilters = () => {
        setCurrentPage(1);
        fetchDeliveries(1, filters);
    };

    const handleResetFilters = () => {
        setFilters({ customerIds: new Set(), startDate: '', endDate: '' });
        setCurrentPage(1);
    };
    
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    if (!pagePermissions?.can_view) return <p className="text-text-secondary dark:text-dark-text-secondary">{t('error.accessDenied.message')}</p>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">{t('fixedAssetDeliveryReport.title')}</h1>
            
            <div className="p-4 bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                         <MultiSelectDropdown 
                            options={customers}
                            selectedIds={filters.customerIds}
                            onChange={handleCustomerToggle}
                            label={t('fixedAssetDeliveryReport.filterByCustomer')}
                            placeholder="All Customers"
                            isSearchable={true}
                         />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('fixedAssetDeliveryReport.filterByDate')}</label>
                        <div className="flex items-center gap-2">
                             <input type="date" value={filters.startDate} onChange={e => { setFilters({...filters, startDate: e.target.value}); setCurrentPage(1); }} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-sm focus:ring-primary" />
                             <input type="date" value={filters.endDate} onChange={e => { setFilters({...filters, endDate: e.target.value}); setCurrentPage(1); }} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-sm focus:ring-primary" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 items-end">
                        <button onClick={handleResetFilters} className="px-4 py-2 text-sm font-medium rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">{t('visitRequestReport.filters.reset')}</button>
                        <button onClick={handleApplyFilters} className="px-4 py-2 text-sm font-medium text-white bg-primary dark:bg-dark-primary rounded-md hover:bg-secondary dark:hover:bg-dark-secondary transition-colors">{t('visitRequestReport.filters.apply')}</button>
                    </div>
                </div>
            </div>

            {loading ? <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div> :
             deliveries.length === 0 ? <p className="text-center py-8 text-text-secondary">{t('fixedAssetDeliveryReport.noResults')}</p> :
             (
                <>
                    <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border overflow-x-auto">
                        <table className="min-w-full divide-y divide-border dark:divide-dark-border">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">{t('fixedAssetDelivery.customer')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">{t('fixedAssetDelivery.deliveryDate')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">{t('fixedAssetDelivery.description')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">{t('form.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border dark:divide-dark-border">
                                {deliveries.map(d => (
                                    <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{d.customer?.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(d.delivery_date).toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm truncate max-w-xs">{d.description || '-'}</td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => setViewingDelivery(d)} className="text-accent hover:underline" title={t('fixedAssetDeliveryReport.viewDetails')}>
                                                <Eye className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                         <div className="flex items-center justify-between p-4">
                            <span className="text-sm text-text-secondary">{t('pagination.page').replace('{currentPage}', String(currentPage)).replace('{totalPages}', String(totalPages))} ({totalCount} results)</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-border dark:border-dark-border hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"><ChevronLeft className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-border dark:border-dark-border hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"><ChevronRight className="h-4 w-4" /></button>
                            </div>
                        </div>
                    )}
                </>
             )
            }
            {viewingDelivery && <DetailsModal delivery={viewingDelivery} onClose={() => setViewingDelivery(null)} onImageClick={setViewingImage}/>}

            {viewingImage && (
                <div className="fixed inset-0 bg-black bg-opacity-80 z-[100] flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
                    <img src={viewingImage} alt="Delivery Item" className="max-w-full max-h-full rounded-lg shadow-lg" />
                    <button className="absolute top-4 right-4 p-2 bg-white/20 rounded-full text-white hover:bg-white/40"><X/></button>
                </div>
            )}
        </div>
    );
};

export default AdminFixedAssetDeliveryReport;
