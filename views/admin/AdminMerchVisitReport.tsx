
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { MerchVisit, Customer, Merch, ProductGroup } from '../../types';
import { Loader2, ChevronLeft, ChevronRight, Image as ImageIcon, X, ChevronDown, CheckSquare, Square, Layers, Search } from 'lucide-react';

const ITEMS_PER_PAGE = 6;

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

const ReportCard: React.FC<{ visit: MerchVisit, onImageClick: (url: string) => void }> = ({ visit, onImageClick }) => {
    const { t } = useAppContext();
    return (
        <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border p-4 flex flex-col space-y-4">
            <div className="flex justify-between items-start border-b border-border dark:border-dark-border pb-3">
                <div>
                    <p className="text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{new Date(visit.visit_datetime).toLocaleString()}</p>
                    <h3 className="font-bold text-lg text-text-primary dark:text-dark-text-primary">{visit.customer?.name}</h3>
                    <p className="text-sm font-medium text-primary dark:text-dark-primary">{visit.merch?.name}</p>
                    <span className="mt-1 inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-text-secondary dark:text-dark-text-secondary rounded text-[10px] font-bold uppercase">{visit.visit_type?.name}</span>
                </div>
            </div>

            {visit.description && <p className="text-sm italic text-text-secondary border-l-4 border-gray-300 dark:border-gray-600 pl-3">"{visit.description}"</p>}

            {/* Product Group Specific Details */}
            {visit.group_details && visit.group_details.length > 0 && (
                <div className="space-y-4 pt-2">
                    <h4 className="text-sm font-bold flex items-center gap-2 text-text-primary dark:text-dark-text-primary">
                        <Layers className="h-4 w-4" /> {t('sidebar.productGroups')}
                    </h4>
                    {visit.group_details.map(detail => (
                        <div key={detail.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-border dark:border-dark-border space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-primary dark:text-dark-primary">{detail.product_group?.name}</span>
                            </div>
                            {detail.notes && <p className="text-xs text-text-secondary italic">Notes: {detail.notes}</p>}
                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-text-secondary">{t('visitTypes.groupOldVersion')}</p>
                                    {detail.before_image_url ? (
                                        <img src={detail.before_image_url} onClick={() => onImageClick(detail.before_image_url!)} alt="Before" className="w-full h-24 object-cover rounded-md cursor-pointer hover:opacity-80 border border-border dark:border-dark-border shadow-sm"/>
                                    ) : <div className="w-full h-24 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center text-gray-400"><ImageIcon className="h-6 w-6"/></div>}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-text-secondary">{t('visitTypes.groupNewVersion')}</p>
                                    {detail.after_image_url ? (
                                        <img src={detail.after_image_url} onClick={() => onImageClick(detail.after_image_url!)} alt="After" className="w-full h-24 object-cover rounded-md cursor-pointer hover:opacity-80 border border-border dark:border-dark-border shadow-sm"/>
                                    ) : <div className="w-full h-24 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center text-gray-400"><ImageIcon className="h-6 w-6"/></div>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const AdminMerchVisitReport: React.FC = () => {
    const { t, permissions, showNotification } = useAppContext();
    const pagePermissions = permissions['Admin Merch Visit Report'];

    const [visits, setVisits] = useState<MerchVisit[]>([]);
    const [merchs, setMerchs] = useState<Merch[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    
    const [filters, setFilters] = useState({ 
        merchId: '', 
        customerIds: new Set<string>(), 
        startDate: '', 
        endDate: '',
        groupIds: new Set<string>()
    });
    const [viewingImage, setViewingImage] = useState<string | null>(null);

    const fetchReports = useCallback(async () => {
        if (!pagePermissions?.can_view) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            if (merchs.length === 0 || customers.length === 0 || productGroups.length === 0) {
                const merchsPromise = supabase.from('merchs').select('*').order('name');
                const customersPromise = supabase.from('customers').select('*').order('name');
                const groupsPromise = supabase.from('product_groups').select('*').order('name');
                const [{ data: merchsData }, { data: customersData }, { data: groupsData }] = await Promise.all([merchsPromise, customersPromise, groupsPromise]);
                setMerchs(merchsData || []);
                setCustomers(customersData || []);
                setProductGroups(groupsData || []);
            }

            let visitIdsByGroups: string[] | null = null;
            if (filters.groupIds.size > 0) {
                const { data: gData } = await supabase
                    .from('visit_product_group_details')
                    .select('merch_visit_id')
                    .in('product_group_id', Array.from(filters.groupIds))
                    .not('merch_visit_id', 'is', null);
                
                visitIdsByGroups = (gData || []).map(d => d.merch_visit_id);
                if (visitIdsByGroups.length === 0) {
                    setVisits([]);
                    setTotalCount(0);
                    setLoading(false);
                    return;
                }
            }

            let query = supabase
                .from('merch_visits')
                .select('*, customer:customers(name), merch:merchs(name), visit_type:visit_types(name), group_details:visit_product_group_details(id, before_image_url, after_image_url, notes, product_group:product_groups(name))', { count: 'exact' });

            if (filters.merchId) query = query.eq('merch_id', filters.merchId);
            if (filters.customerIds.size > 0) query = query.in('customer_id', Array.from(filters.customerIds));
            if (filters.startDate) query = query.gte('visit_datetime', `${filters.startDate}T00:00:00.000Z`);
            if (filters.endDate) query = query.lte('visit_datetime', `${filters.endDate}T23:59:59.999Z`);
            if (visitIdsByGroups) query = query.in('id', visitIdsByGroups);

            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
            query = query.range(startIndex, startIndex + ITEMS_PER_PAGE - 1).order('visit_datetime', { ascending: false });

            const { data, error, count } = await query;
            if (error) throw error;

            setVisits((data as any) || []);
            setTotalCount(count || 0);

        } catch (error: any) {
            showNotification(`Failed to load reports: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [pagePermissions, showNotification, merchs.length, customers.length, productGroups.length, currentPage, filters]);
    
    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const handleFilterChange = (field: string, value: any) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setCurrentPage(1);
    };

    const handleGroupToggle = (id: string) => {
        const newSet = new Set(filters.groupIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        handleFilterChange('groupIds', newSet);
    };

    const handleCustomerToggle = (id: string) => {
        const newSet = new Set(filters.customerIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        handleFilterChange('customerIds', newSet);
    };
    
    const handleResetFilters = () => {
        setFilters({ merchId: '', customerIds: new Set(), startDate: '', endDate: '', groupIds: new Set() });
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    if (!pagePermissions?.can_view) return <p>{t('error.accessDenied.message')}</p>;

    return (
        <div className="space-y-6 pb-20">
            <h1 className="text-3xl font-bold">{t('adminMerchVisitReport.title')}</h1>
            
            <div className="p-5 bg-surface dark:bg-dark-surface rounded-xl shadow-md border border-border dark:border-dark-border space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('visitRequestReport.filters.dateRange')}</label>
                        <div className="flex items-center gap-2">
                             <input type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-sm focus:ring-primary" />
                             <input type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-sm focus:ring-primary" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('visitRequestMerchReport.filters.merchandiser')}</label>
                        <select value={filters.merchId} onChange={e => handleFilterChange('merchId', e.target.value)} className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-sm focus:ring-primary">
                            <option value="">{t('visitRequestReport.filters.all')}</option>
                            {merchs.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>
                     <div>
                         <MultiSelectDropdown 
                            options={customers} 
                            selectedIds={filters.customerIds} 
                            onChange={handleCustomerToggle} 
                            label={t('visitRequestReport.filters.customer')}
                            placeholder="All Selected Customers"
                            isSearchable={true}
                        />
                    </div>
                    <div>
                        <MultiSelectDropdown 
                            options={productGroups} 
                            selectedIds={filters.groupIds} 
                            onChange={handleGroupToggle} 
                            label={t('sidebar.productGroups')}
                            placeholder="All Selected Groups"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <button onClick={handleResetFilters} className="px-4 py-2 text-sm font-medium rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">{t('visitRequestReport.filters.reset')}</button>
                    <button onClick={() => setCurrentPage(1)} className="px-4 py-2 text-sm font-medium text-white bg-primary dark:bg-dark-primary rounded-md hover:bg-secondary dark:hover:bg-dark-secondary transition-colors">{t('visitRequestReport.filters.apply')}</button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
            ) : visits.length === 0 ? (
                <div className="text-center py-20 bg-surface dark:bg-dark-surface rounded-xl border border-dashed border-border dark:border-dark-border">
                    <p className="text-text-secondary text-lg">{t('visitRequestReport.noResults')}</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {visits.map(v => <ReportCard key={v.id} visit={v} onImageClick={setViewingImage}/>)}
                    </div>
                    {totalPages > 1 && (
                         <div className="flex items-center justify-between p-6 bg-surface dark:bg-dark-surface rounded-xl border border-border dark:border-dark-border mt-8">
                            <span className="text-sm text-text-secondary">{t('pagination.page').replace('{currentPage}', String(currentPage)).replace('{totalPages}', String(totalPages))} ({totalCount} results)</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-border dark:border-dark-border hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"><ChevronLeft className="h-5 w-5" /></button>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-border dark:border-dark-border hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"><ChevronRight className="h-5 w-5" /></button>
                            </div>
                        </div>
                    )}
                </>
             )
            }
            {viewingImage && (
                <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setViewingImage(null)}>
                    <img src={viewingImage} alt="Visit Detail" className="max-w-full max-h-full rounded-lg shadow-2xl animate-in zoom-in duration-200" />
                    <button className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"><X/></button>
                </div>
            )}
        </div>
    );
};

export default AdminMerchVisitReport;
