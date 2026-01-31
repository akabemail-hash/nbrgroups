import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { FixedAssetDelivery, Customer, FixedAssetDeliveryItem } from '../../types';
import { Loader2, ChevronLeft, ChevronRight, Eye, X, Image as ImageIcon } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

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
                        {loading ? <Loader2 className="animate-spin" /> : (
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

    const [filters, setFilters] = useState({ customerId: '', startDate: '', endDate: '' });
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

            if (currentFilters.customerId) query = query.eq('customer_id', currentFilters.customerId);
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

    const handleApplyFilters = () => {
        setCurrentPage(1);
        fetchDeliveries(1, filters);
    };

    const handleResetFilters = () => {
        setFilters({ customerId: '', startDate: '', endDate: '' });
        setCurrentPage(1);
    };
    
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    if (!pagePermissions?.can_view) return <p>{t('error.accessDenied.message')}</p>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">{t('fixedAssetDeliveryReport.title')}</h1>
            
            <div className="p-4 bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('fixedAssetDeliveryReport.filterByCustomer')}</label>
                        <select value={filters.customerId} onChange={e => setFilters({...filters, customerId: e.target.value})} className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-sm">
                             <option value="">{t('visitRequestReport.filters.all')}</option>
                             {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                         </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('fixedAssetDeliveryReport.filterByDate')}</label>
                        <div className="flex items-center gap-2">
                             <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-sm" />
                             <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-sm" />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={handleResetFilters} className="px-4 py-2 text-sm font-medium rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800">{t('visitRequestReport.filters.reset')}</button>
                    <button onClick={handleApplyFilters} className="px-4 py-2 text-sm font-medium text-white bg-primary dark:bg-dark-primary rounded-md hover:bg-secondary dark:hover:bg-dark-secondary">{t('visitRequestReport.filters.apply')}</button>
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm truncate max-w-xs">{d.description}</td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => setViewingDelivery(d)} className="text-accent hover:underline">
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
                                <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="p-2 rounded-md border disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="p-2 rounded-md border disabled:opacity-50"><ChevronRight className="h-4 w-4" /></button>
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
