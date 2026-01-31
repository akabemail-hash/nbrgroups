
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { ProductInsert, Customer, ProductInsertItem, Seller, ProductGroup, RotaGroup } from '../../types';
import { Loader2, ChevronLeft, ChevronRight, X, CheckSquare, Square, ChevronDown, Search } from 'lucide-react';

const ITEMS_PER_PAGE = 6;

// Extended type for report to include items
interface ExtendedProductInsert extends ProductInsert {
    items?: ProductInsertItem[];
}

const ReportCard: React.FC<{ insert: ExtendedProductInsert, onImageClick: (url: string) => void }> = ({ insert, onImageClick }) => {
    const { t } = useAppContext();
    const totalPrice = insert.items ? insert.items.reduce((sum, item) => sum + Number(item.price), 0) : 0;

    return (
        <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border p-4 flex flex-col space-y-3">
            <div>
                <h3 className="font-bold text-lg text-text-primary dark:text-dark-text-primary">{insert.customer?.name}</h3>
                <div className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1 space-y-0.5 mb-2">
                     <p>{t('productInsert.startDate')}: {new Date(insert.start_date).toLocaleDateString()}</p>
                     <p>{t('productInsert.endDate')}: {new Date(insert.end_date).toLocaleDateString()}</p>
                </div>
                
                {/* Items List */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-2 border border-border dark:border-dark-border text-sm">
                    {insert.items && insert.items.length > 0 ? (
                        <div className="space-y-1">
                            {insert.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between border-b border-border dark:border-dark-border last:border-0 pb-1 last:pb-0">
                                    <span className="font-medium">{item.product_name}</span>
                                    <span className="text-text-secondary">{Number(item.price).toFixed(2)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between pt-2 font-bold border-t border-border dark:border-dark-border mt-1">
                                <span>Total</span>
                                <span className="text-green-600 dark:text-green-400">{totalPrice.toFixed(2)}</span>
                            </div>
                        </div>
                    ) : (
                        // Fallback for old data structure
                        <div className="flex justify-between">
                            <span className="font-medium">{insert.product_name}</span>
                            <span className="font-bold">{insert.insert_price?.toFixed(2)}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
                {insert.photo_urls && insert.photo_urls.length > 0 ? (
                    insert.photo_urls.map((url, index) => (
                         <img key={index} src={url} onClick={() => onImageClick(url)} alt={`Insert ${index+1}`} className="w-full h-24 object-cover rounded-md cursor-pointer hover:opacity-80 border border-border dark:border-dark-border"/>
                    ))
                ) : (
                    <div className="col-span-2 h-24 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center text-gray-400 text-xs">No Photos</div>
                )}
            </div>
        </div>
    );
};

const MultiSelectDropdown: React.FC<{
    options: Customer[];
    selectedIds: Set<string>;
    onChange: (id: string) => void;
    label: string;
}> = ({ options, selectedIds, onChange, label }) => {
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

    const filteredOptions = options.filter(option => 
        option.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium mb-1">{label}</label>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-left flex justify-between items-center text-sm"
            >
                <span className="truncate">
                    {selectedCount === 0 ? 'All Selected Customers' : `${selectedCount} Selected`}
                </span>
                <ChevronDown className="h-4 w-4" />
            </button>
            
            {isOpen && (
                <div className="absolute z-10 w-full bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md mt-1 max-h-60 overflow-hidden shadow-lg flex flex-col">
                    <div className="p-2 border-b border-border dark:border-dark-border bg-gray-50 dark:bg-gray-800">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                            <input 
                                type="text"
                                className="w-full pl-8 pr-2 py-1 text-sm bg-white dark:bg-gray-900 border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                                placeholder={t('relations.searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto p-2">
                        {filteredOptions.length === 0 ? (
                            <div className="p-2 text-sm text-text-secondary italic">No customers found</div>
                        ) : (
                            filteredOptions.map(option => (
                                <div
                                    key={option.id}
                                    onClick={() => onChange(option.id)}
                                    className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded-md"
                                >
                                    {selectedIds.has(option.id) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-gray-400" />}
                                    <span className="text-sm truncate">{option.name}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const ProductInsertReporting: React.FC = () => {
    const { t, permissions, showNotification } = useAppContext();
    const pagePermissions = permissions['Product Insert Reporting'];

    const [inserts, setInserts] = useState<ExtendedProductInsert[]>([]);
    
    // Dropdown Data
    const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
    const [rotaGroups, setRotaGroups] = useState<RotaGroup[]>([]);

    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [viewingImage, setViewingImage] = useState<string | null>(null);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
    const [selectedSellerId, setSelectedSellerId] = useState('');
    const [selectedProductGroupId, setSelectedProductGroupId] = useState('');
    const [selectedRotaGroupId, setSelectedRotaGroupId] = useState('');

    // Derived state for Rota Logic
    const [rotaGroupCustomerIds, setRotaGroupCustomerIds] = useState<Set<string>>(new Set());

    const fetchInitialData = useCallback(async () => {
        try {
            const customersPromise = supabase.from('customers').select('id, name').order('name');
            const sellersPromise = supabase.from('sellers').select('*').order('name');
            const groupsPromise = supabase.from('product_groups').select('*').order('name');
            const rotaPromise = supabase.from('rota_groups').select('*').order('name');

            const [custRes, sellersRes, groupsRes, rotaRes] = await Promise.all([customersPromise, sellersPromise, groupsPromise, rotaPromise]);

            if (custRes.error) throw custRes.error;
            if (sellersRes.error) throw sellersRes.error;
            if (groupsRes.error) throw groupsRes.error;
            if (rotaRes.error) throw rotaRes.error;

            setAllCustomers(custRes.data || []);
            setSellers(sellersRes.data || []);
            setProductGroups(groupsRes.data || []);
            setRotaGroups(rotaRes.data || []);

        } catch (error: any) {
            showNotification(`Failed to load filter options: ${error.message}`, 'error');
        }
    }, [showNotification]);

    // Handle Rota Group Selection Logic
    useEffect(() => {
        const fetchRotaCustomers = async () => {
            if (!selectedRotaGroupId) {
                setRotaGroupCustomerIds(new Set());
                return;
            }
            const { data, error } = await supabase
                .from('rota_group_customers')
                .select('customer_id')
                .eq('rota_group_id', selectedRotaGroupId);
            
            if (error) {
                console.error("Error fetching rota customers", error);
            } else {
                setRotaGroupCustomerIds(new Set(data.map(d => d.customer_id)));
            }
        };
        fetchRotaCustomers();
    }, [selectedRotaGroupId]);

    const fetchInserts = useCallback(async () => {
        if (!pagePermissions?.can_view) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            let query = supabase
                .from('product_inserts')
                .select('*, customer:customers(name), items:product_insert_items(*)', { count: 'exact' });

            // Filter Logic
            // Start Date Filter: Show inserts ending ON or AFTER selected start date
            if (startDate) query = query.gte('end_date', startDate);
            // End Date Filter: Show inserts starting ON or BEFORE selected end date
            if (endDate) query = query.lte('start_date', endDate);
            
            // Seller Filter (Match by created_by user_id)
            if (selectedSellerId) {
                const seller = sellers.find(s => s.id === selectedSellerId);
                if (seller?.user_id) {
                    query = query.eq('created_by', seller.user_id);
                }
            }

            // Product Group Filter
            if (selectedProductGroupId) {
                // Fetch product names in this group
                const { data: products } = await supabase
                    .from('products')
                    .select('name')
                    .eq('product_group_id', selectedProductGroupId);
                
                if (products && products.length > 0) {
                    const productNames = products.map(p => p.name);
                    // We need to filter inserts that contain these items.
                    // This requires a subquery or join which is hard with Supabase simple filters on the parent.
                    // Instead, we find the insert IDs from the items table.
                    const { data: matchingItems } = await supabase
                        .from('product_insert_items')
                        .select('insert_id')
                        .in('product_name', productNames);
                    
                    if (matchingItems && matchingItems.length > 0) {
                         const insertIds = matchingItems.map(i => i.insert_id);
                         query = query.in('id', insertIds);
                    } else {
                         // No items found for this group
                         query = query.in('id', ['00000000-0000-0000-0000-000000000000']);
                    }
                } else {
                     query = query.in('id', ['00000000-0000-0000-0000-000000000000']);
                }
            }

            // Customer Filtering Logic (Complex due to Rota Group interaction)
            // 1. If explicit checkboxes are selected, use them
            if (selectedCustomerIds.size > 0) {
                query = query.in('customer_id', Array.from(selectedCustomerIds));
            }
            // 2. If no checkboxes, but Rota Group selected, use Rota Group customers
            else if (selectedRotaGroupId && rotaGroupCustomerIds.size > 0) {
                query = query.in('customer_id', Array.from(rotaGroupCustomerIds));
            }
            // 3. If Rota Group selected but has no customers, show nothing
            else if (selectedRotaGroupId && rotaGroupCustomerIds.size === 0) {
                 query = query.in('customer_id', ['00000000-0000-0000-0000-000000000000']);
            }

            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
            query = query.range(startIndex, startIndex + ITEMS_PER_PAGE - 1).order('created_at', { ascending: false });

            const { data, error, count } = await query;
            if (error) throw error;

            setInserts((data as any) || []);
            setTotalCount(count || 0);

        } catch (error: any) {
            showNotification(`Failed to load reports: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [pagePermissions, showNotification, currentPage, startDate, endDate, selectedCustomerIds, selectedSellerId, selectedProductGroupId, selectedRotaGroupId, rotaGroupCustomerIds, sellers]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        fetchInserts();
    }, [fetchInserts]);

    const handleCustomerToggle = (id: string) => {
        const newSet = new Set(selectedCustomerIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedCustomerIds(newSet);
        setCurrentPage(1); // Reset to first page on filter change
    };

    const handleResetFilters = () => {
        setStartDate('');
        setEndDate('');
        setSelectedCustomerIds(new Set());
        setSelectedSellerId('');
        setSelectedProductGroupId('');
        setSelectedRotaGroupId('');
        setCurrentPage(1);
    };

    const handleApplyFilters = () => {
        setCurrentPage(1);
        fetchInserts();
    };

    // Filter available customers in dropdown based on Rota Group
    const availableCustomers = useMemo(() => {
        if (!selectedRotaGroupId) return allCustomers;
        return allCustomers.filter(c => rotaGroupCustomerIds.has(c.id));
    }, [allCustomers, selectedRotaGroupId, rotaGroupCustomerIds]);

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    if (!pagePermissions?.can_view) return <p>{t('error.accessDenied.message')}</p>;

    return (
        <div className="space-y-6 pb-20">
            <h1 className="text-3xl font-bold">{t('productInsertReporting.title')}</h1>

            <div className="p-4 bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('productInsertReporting.filterByDate')}</label>
                        <div className="flex items-center gap-2">
                             <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-sm" />
                             <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-sm" />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('competitorPriceAnalysisReport.filters.salesRep')}</label>
                        <select 
                            value={selectedSellerId} 
                            onChange={e => setSelectedSellerId(e.target.value)} 
                            className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-sm"
                        >
                            <option value="">{t('visitRequestReport.filters.all')}</option>
                            {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div>
                         <label className="block text-sm font-medium mb-1">{t('sidebar.productGroups')}</label>
                         <select 
                            value={selectedProductGroupId} 
                            onChange={e => setSelectedProductGroupId(e.target.value)} 
                            className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-sm"
                        >
                            <option value="">{t('visitRequestReport.filters.all')}</option>
                            {productGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    </div>

                    <div>
                         <label className="block text-sm font-medium mb-1">{t('rotaGroups.title')}</label>
                         <select 
                            value={selectedRotaGroupId} 
                            onChange={e => { setSelectedRotaGroupId(e.target.value); setSelectedCustomerIds(new Set()); }} 
                            className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-sm"
                        >
                            <option value="">{t('visitRequestReport.filters.all')}</option>
                            {rotaGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <MultiSelectDropdown 
                            options={availableCustomers} 
                            selectedIds={selectedCustomerIds} 
                            onChange={handleCustomerToggle} 
                            label={t('productInsertReporting.filterByCustomer')}
                        />
                    </div>
                    <div className="flex justify-end gap-2 items-end">
                        <button onClick={handleResetFilters} className="px-4 py-2 text-sm font-medium rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800">{t('visitRequestReport.filters.reset')}</button>
                        <button onClick={handleApplyFilters} className="px-4 py-2 text-sm font-medium text-white bg-primary dark:bg-dark-primary rounded-md hover:bg-secondary dark:hover:bg-dark-secondary">{t('visitRequestReport.filters.apply')}</button>
                    </div>
                </div>
            </div>

             {loading ? <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div> :
             inserts.length === 0 ? <p className="text-center py-8 text-text-secondary">{t('productInsertReporting.noResults')}</p> :
             (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {inserts.map(i => <ReportCard key={i.id} insert={i} onImageClick={setViewingImage}/>)}
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

            {viewingImage && (
                <div className="fixed inset-0 bg-black bg-opacity-80 z-[100] flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
                    <img src={viewingImage} alt="Insert" className="max-w-full max-h-full rounded-lg shadow-lg" />
                    <button className="absolute top-4 right-4 p-2 bg-white/20 rounded-full text-white hover:bg-white/40"><X/></button>
                </div>
            )}
        </div>
    );
};

export default ProductInsertReporting;
