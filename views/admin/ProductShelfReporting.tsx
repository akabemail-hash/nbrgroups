
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { ProductShelf, Customer, Seller, ProductGroup, RotaGroup } from '../../types';
import { Loader2, ChevronLeft, ChevronRight, X, CheckSquare, Square, ChevronDown, Filter, Search } from 'lucide-react';

const ITEMS_PER_PAGE = 6;

const ReportCard: React.FC<{ shelf: ProductShelf, onImageClick: (url: string) => void }> = ({ shelf, onImageClick }) => {
    const { t } = useAppContext();
    return (
        <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border p-4 flex flex-col space-y-3">
            <div>
                <h3 className="font-bold text-lg text-text-primary dark:text-dark-text-primary">{shelf.customer?.name}</h3>
                <p className="text-sm text-primary dark:text-dark-primary font-medium">{shelf.product_name}</p>
                <div className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1 space-y-0.5">
                     <p>{t('productShelf.shelfDateTime')}: {new Date(shelf.shelf_datetime).toLocaleString()}</p>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                     <p className="text-xs font-bold text-text-secondary uppercase mb-1">{t('productShelf.previousImage')}</p>
                     <div className="grid grid-cols-2 gap-1">
                        {shelf.before_image_urls && shelf.before_image_urls.length > 0 ? (
                            shelf.before_image_urls.map((url, index) => (
                                <img key={index} src={url} onClick={() => onImageClick(url)} alt={`Previous ${index+1}`} className="w-full h-16 object-cover rounded-md cursor-pointer hover:opacity-80 border border-border dark:border-dark-border"/>
                            ))
                        ) : (
                            <div className="col-span-2 h-16 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center text-gray-400 text-xs">{t('common.noImage')}</div>
                        )}
                     </div>
                </div>
                 <div>
                     <p className="text-xs font-bold text-text-secondary uppercase mb-1">{t('productShelf.nextImage')}</p>
                     <div className="grid grid-cols-2 gap-1">
                        {shelf.after_image_urls && shelf.after_image_urls.length > 0 ? (
                            shelf.after_image_urls.map((url, index) => (
                                <img key={index} src={url} onClick={() => onImageClick(url)} alt={`Next ${index+1}`} className="w-full h-16 object-cover rounded-md cursor-pointer hover:opacity-80 border border-border dark:border-dark-border"/>
                            ))
                        ) : (
                            <div className="col-span-2 h-16 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center text-gray-400 text-xs">{t('common.noImage')}</div>
                        )}
                     </div>
                </div>
            </div>
        </div>
    );
};

const MultiSelectDropdown: React.FC<{
    options: Customer[];
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

const ProductShelfReporting: React.FC = () => {
    const { t, permissions, showNotification } = useAppContext();
    const pagePermissions = permissions['Product Shelf Reporting'];

    const [shelves, setShelves] = useState<ProductShelf[]>([]);
    
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

    const fetchShelves = useCallback(async () => {
        if (!pagePermissions?.can_view) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            let query = supabase
                .from('product_shelves')
                .select('*, customer:customers(name)', { count: 'exact' });

            // Date Filters
            if (startDate) query = query.gte('shelf_datetime', `${startDate}T00:00:00.000Z`);
            if (endDate) query = query.lte('shelf_datetime', `${endDate}T23:59:59.999Z`);
            
            // Seller Filter (Match by created_by user_id)
            if (selectedSellerId) {
                const seller = sellers.find(s => s.id === selectedSellerId);
                if (seller?.user_id) {
                    query = query.eq('created_by', seller.user_id);
                }
            }

            // Product Group Filter (Match by product name list)
            if (selectedProductGroupId) {
                const { data: products } = await supabase
                    .from('products')
                    .select('name')
                    .eq('product_group_id', selectedProductGroupId);
                
                if (products && products.length > 0) {
                    const productNames = products.map(p => p.name);
                    query = query.in('product_name', productNames);
                } else {
                    query = query.in('product_name', ['__NO_PRODUCTS__']);
                }
            }

            // Customer Filtering Logic
            if (selectedCustomerIds.size > 0) {
                 query = query.in('customer_id', Array.from(selectedCustomerIds));
            } 
            else if (selectedRotaGroupId && rotaGroupCustomerIds.size > 0) {
                query = query.in('customer_id', Array.from(rotaGroupCustomerIds));
            }
            else if (selectedRotaGroupId && rotaGroupCustomerIds.size === 0) {
                query = query.in('customer_id', ['00000000-0000-0000-0000-000000000000']); 
            }

            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
            query = query.range(startIndex, startIndex + ITEMS_PER_PAGE - 1).order('shelf_datetime', { ascending: false });

            const { data, error, count } = await query;
            if (error) throw error;

            setShelves((data as any) || []);
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
        fetchShelves();
    }, [fetchShelves]);

    const handleCustomerToggle = (id: string) => {
        const newSet = new Set(selectedCustomerIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedCustomerIds(newSet);
        setCurrentPage(1); 
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
        fetchShelves();
    };

    const availableCustomers = useMemo(() => {
        if (!selectedRotaGroupId) return allCustomers;
        return allCustomers.filter(c => rotaGroupCustomerIds.has(c.id));
    }, [allCustomers, selectedRotaGroupId, rotaGroupCustomerIds]);

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    if (!pagePermissions?.can_view) return <p>{t('error.accessDenied.message')}</p>;

    return (
        <div className="space-y-6 pb-20">
            <h1 className="text-3xl font-bold">{t('productShelfReporting.title')}</h1>

            <div className="p-4 bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('productShelfReporting.filterByDate')}</label>
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
                            label={t('productShelfReporting.filterByCustomer')}
                            placeholder="All Selected Customers"
                            isSearchable={true}
                        />
                    </div>
                    <div className="flex justify-end gap-2 items-end">
                        <button onClick={handleResetFilters} className="px-4 py-2 text-sm font-medium rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800">{t('visitRequestReport.filters.reset')}</button>
                        <button onClick={handleApplyFilters} className="px-4 py-2 text-sm font-medium text-white bg-primary dark:bg-dark-primary rounded-md hover:bg-secondary dark:hover:bg-dark-secondary">{t('visitRequestReport.filters.apply')}</button>
                    </div>
                </div>
            </div>

             {loading ? <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div> :
             shelves.length === 0 ? <p className="text-center py-8 text-text-secondary">{t('productShelfReporting.noResults')}</p> :
             (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {shelves.map(s => <ReportCard key={s.id} shelf={s} onImageClick={setViewingImage}/>)}
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
                    <img src={viewingImage} alt="Shelf" className="max-w-full max-h-full rounded-lg shadow-lg" />
                    <button className="absolute top-4 right-4 p-2 bg-white/20 rounded-full text-white hover:bg-white/40"><X/></button>
                </div>
            )}
        </div>
    );
};

export default ProductShelfReporting;
