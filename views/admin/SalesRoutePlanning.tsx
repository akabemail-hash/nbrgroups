
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { Seller, Customer, District, RotaGroup } from '../../types';
import { Save, Loader2, Search, ChevronLeft, ChevronRight, Filter, AlertCircle, Link, Users } from 'lucide-react';

const ITEMS_PER_PAGE = 15;

const SalesRoutePlanning: React.FC = () => {
    const { t, permissions, showNotification, profile, navigateTo } = useAppContext();
    const pagePermissions = permissions['Sales Route Planning'];

    const [sellers, setSellers] = useState<Seller[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [rotaGroups, setRotaGroups] = useState<RotaGroup[]>([]); // New state

    const [selectedSellerId, setSelectedSellerId] = useState<string>('');
    const [selectedDay, setSelectedDay] = useState<string>('');
    const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');
    const [selectedRotaGroupId, setSelectedRotaGroupId] = useState<string>(''); // New state
    
    // Customers assigned to the seller via Relationships page
    const [sellerCustomerIds, setSellerCustomerIds] = useState<Set<string>>(new Set());
    
    // Customers assigned to the selected Rota Group
    const [rotaGroupCustomerIds, setRotaGroupCustomerIds] = useState<Set<string>>(new Set()); // New state

    const [associatedCustomerIds, setAssociatedCustomerIds] = useState<Set<string>>(new Set());
    const [checkedCustomerIds, setCheckedCustomerIds] = useState<Set<string>>(new Set());
    
    const [loading, setLoading] = useState(true);
    const [relationshipLoading, setRelationshipLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const daysOfWeek = [
        { value: '1', label: t('salesRoutes.day.1') },
        { value: '2', label: t('salesRoutes.day.2') },
        { value: '3', label: t('salesRoutes.day.3') },
        { value: '4', label: t('salesRoutes.day.4') },
        { value: '5', label: t('salesRoutes.day.5') },
        { value: '6', label: t('salesRoutes.day.6') },
        { value: '7', label: t('salesRoutes.day.7') },
    ];

    const fetchInitialData = useCallback(async () => {
        if (!pagePermissions?.can_view) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const sellersPromise = supabase.from('sellers').select('*').order('name');
            const customersPromise = supabase.from('customers').select('*').order('name');
            const districtsPromise = supabase.from('districts').select('*').order('name');
            const rotaGroupsPromise = supabase.from('rota_groups').select('*').order('name'); // New fetch
            
            const [
                { data: sellersData, error: sellersError }, 
                { data: customersData, error: customersError },
                { data: districtsData, error: districtsError },
                { data: rotaGroupsData, error: rotaGroupsError }
            ] = await Promise.all([sellersPromise, customersPromise, districtsPromise, rotaGroupsPromise]);

            if (sellersError) throw sellersError;
            if (customersError) throw customersError;
            if (districtsError) throw districtsError;
            if (rotaGroupsError) throw rotaGroupsError;

            setSellers(sellersData || []);
            setCustomers(customersData || []);
            setDistricts(districtsData || []);
            setRotaGroups(rotaGroupsData || []);
        } catch (error: any) {
            showNotification(error.message, "error");
        } finally {
            setLoading(false);
        }
    }, [pagePermissions, showNotification]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    // Fetch the customers assigned to this seller via Relationships
    useEffect(() => {
        const fetchSellerRelationships = async () => {
            if (!selectedSellerId) {
                setSellerCustomerIds(new Set());
                return;
            }
            setRelationshipLoading(true);
            try {
                const { data, error } = await supabase
                    .from('customer_seller_relationships')
                    .select('customer_id')
                    .eq('seller_id', selectedSellerId);

                if (error) throw error;
                const ids = new Set<string>((data || []).map(r => r.customer_id));
                setSellerCustomerIds(ids);
            } catch (error: any) {
                console.error("Error fetching seller relationships", error);
                showNotification("Failed to load seller's assigned customers", "error");
            } finally {
                setRelationshipLoading(false);
            }
        };

        fetchSellerRelationships();
    }, [selectedSellerId, showNotification]);

    // Fetch customers assigned to selected Rota Group
    useEffect(() => {
        const fetchRotaGroupCustomers = async () => {
            if (!selectedRotaGroupId) {
                setRotaGroupCustomerIds(new Set());
                return;
            }
            // We don't trigger main loading here to avoid UI flicker, filtering happens instantly on state change
            try {
                const { data, error } = await supabase
                    .from('rota_group_customers')
                    .select('customer_id')
                    .eq('rota_group_id', selectedRotaGroupId);

                if (error) throw error;
                const ids = new Set<string>((data || []).map(r => r.customer_id));
                setRotaGroupCustomerIds(ids);
            } catch (error: any) {
                console.error("Error fetching rota group customers", error);
                showNotification("Failed to load rota group customers", "error");
            }
        };

        fetchRotaGroupCustomers();
    }, [selectedRotaGroupId, showNotification]);

    const fetchRoutes = useCallback(async () => {
        if (!selectedSellerId || !selectedDay) {
            setAssociatedCustomerIds(new Set());
            setCheckedCustomerIds(new Set());
            return;
        }
        try {
            const { data, error } = await supabase
                .from('daily_sales_routes')
                .select('customer_id')
                .eq('seller_id', selectedSellerId)
                .eq('day_of_week', parseInt(selectedDay));

            if (error) throw error;
            
            const idSet = new Set<string>((data || []).map(rel => rel.customer_id));
            setAssociatedCustomerIds(idSet);
            setCheckedCustomerIds(idSet);
        } catch (error: any) {
             showNotification(error.message, "error");
        }
    }, [selectedSellerId, selectedDay, showNotification]);

    useEffect(() => {
        fetchRoutes();
    }, [fetchRoutes]);

    const filteredCustomers = useMemo(() => {
        // Start with all customers
        let result = customers;
        
        // 1. Filter by Seller Relationships (Must be assigned to seller to appear here)
        if (selectedSellerId) {
            result = result.filter(c => sellerCustomerIds.has(c.id));
        } else {
            return [];
        }

        // 2. Filter by Rota Group
        if (selectedRotaGroupId) {
            result = result.filter(c => rotaGroupCustomerIds.has(c.id));
        }

        // 3. Filter by District
        if (selectedDistrictId) {
            result = result.filter(c => c.district_id === selectedDistrictId);
        }

        // 4. Filter by Search Term
        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            result = result.filter(customer =>
                customer.name.toLowerCase().includes(lowercasedFilter) ||
                customer.customer_code.toLowerCase().includes(lowercasedFilter)
            );
        }
        
        return result;
    }, [customers, searchTerm, selectedDistrictId, selectedSellerId, sellerCustomerIds, selectedRotaGroupId, rotaGroupCustomerIds]);

    const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);

    const paginatedCustomers = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredCustomers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredCustomers, currentPage]);

    const handleCheckboxChange = (customerId: string, isChecked: boolean) => {
        setCheckedCustomerIds(prev => {
            const newSet = new Set(prev);
            if (isChecked) newSet.add(customerId);
            else newSet.delete(customerId);
            return newSet;
        });
    };
    
    const handleSelectAllFiltered = (isChecked: boolean) => {
        const filteredIds = new Set(filteredCustomers.map(c => c.id));
        setCheckedCustomerIds(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                filteredIds.forEach(id => newSet.add(id));
            } else {
                filteredIds.forEach(id => newSet.delete(id));
            }
            return newSet;
        });
    };

    const handleSave = async () => {
        if (!selectedSellerId || !selectedDay || !pagePermissions?.can_edit) return;
        setIsSaving(true);
        try {
            const dayOfWeek = parseInt(selectedDay);
            const idsToAdd = [...checkedCustomerIds].filter(id => !associatedCustomerIds.has(id));
            const idsToRemove = [...associatedCustomerIds].filter(id => !checkedCustomerIds.has(id));

            if (idsToRemove.length > 0) {
                const { error } = await supabase
                    .from('daily_sales_routes')
                    .delete()
                    .eq('seller_id', selectedSellerId)
                    .eq('day_of_week', dayOfWeek)
                    .in('customer_id', idsToRemove);
                if (error) throw error;
            }

            if (idsToAdd.length > 0) {
                const recordsToAdd = idsToAdd.map(customerId => ({
                    customer_id: customerId,
                    seller_id: selectedSellerId,
                    day_of_week: dayOfWeek,
                    created_by: profile?.id
                }));
                const { error } = await supabase.from('daily_sales_routes').insert(recordsToAdd);
                if (error) throw error;
            }

            showNotification(t('notification.routes.saveSuccess'));
            await fetchRoutes(); // Refresh the state from the database
        } catch (error: any) {
            showNotification(t('notification.routes.saveError').replace('{error}', error.message), 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    if (!pagePermissions?.can_view) {
        return <p className="text-text-secondary dark:text-dark-text-secondary">{t('error.accessDenied.message')}</p>;
    }

    const isAllFilteredSelected = filteredCustomers.length > 0 && filteredCustomers.every(c => checkedCustomerIds.has(c.id));
    const showWarningNoRelations = selectedSellerId && !loading && !relationshipLoading && sellerCustomerIds.size === 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('salesRoutes.title')}</h1>
                {pagePermissions?.can_edit && selectedSellerId && selectedDay && !showWarningNoRelations && (
                     <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="flex items-center px-4 py-2 bg-primary dark:bg-dark-primary text-white rounded-md hover:bg-secondary dark:hover:bg-dark-secondary transition-colors disabled:opacity-50"
                    >
                         {isSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                        {isSaving ? t('common.saving') : t('form.save')}
                    </button>
                )}
            </div>
            
             <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     <select 
                        value={selectedDay}
                        onChange={e => {
                            setSelectedDay(e.target.value);
                            setSearchTerm('');
                            setCurrentPage(1);
                        }}
                        className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md focus:ring-accent"
                    >
                        <option value="">{t('salesRoutes.selectDay')}</option>
                        {daysOfWeek.map(day => <option key={day.value} value={day.value}>{day.label}</option>)}
                    </select>

                    <select 
                        value={selectedSellerId}
                        onChange={e => {
                            setSelectedSellerId(e.target.value);
                            setSearchTerm('');
                            setCurrentPage(1);
                        }}
                        className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md focus:ring-accent"
                    >
                        <option value="">{t('salesRoutes.selectSeller')}</option>
                        {sellers.map(seller => <option key={seller.id} value={seller.id}>{seller.name}</option>)}
                    </select>

                    <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <select
                            value={selectedRotaGroupId}
                            onChange={(e) => {
                                setSelectedRotaGroupId(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:ring-accent focus:border-accent appearance-none"
                        >
                            <option value="">{t('rotaGroups.title')}: All</option>
                            {rotaGroups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                         <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>

                     <div className="relative">
                         <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                         <select
                            value={selectedDistrictId}
                            onChange={(e) => {
                                setSelectedDistrictId(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:ring-accent dark:focus:ring-dark-accent focus:border-accent dark:focus:border-dark-accent appearance-none"
                        >
                            <option value="">{t('customers.district')}: All</option>
                            {districts.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                         <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                </div>
                
                 {selectedSellerId && selectedDay && !showWarningNoRelations && (
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('relations.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-full md:w-1/2 p-2 pl-10 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md"
                        />
                    </div>
                 )}

                {loading || relationshipLoading ? <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div> : 
                 !selectedSellerId || !selectedDay ? (
                    <div className="text-center p-8 bg-surface dark:bg-dark-surface rounded-lg border border-border dark:border-dark-border">
                        <p className="text-text-secondary dark:text-dark-text-secondary">{t('salesRoutes.noSelection')}</p>
                    </div>
                 ) : showWarningNoRelations ? (
                    <div className="text-center p-8 bg-surface dark:bg-dark-surface rounded-lg border border-border dark:border-dark-border flex flex-col items-center justify-center">
                         <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-full mb-4">
                            <AlertCircle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                         </div>
                        <h3 className="text-lg font-bold text-text-primary dark:text-dark-text-primary mb-2">{t('salesRoutes.noCustomersAssigned.title')}</h3>
                        <p className="text-text-secondary dark:text-dark-text-secondary mb-4 max-w-md">
                            {t('salesRoutes.noCustomersAssigned.message')}
                        </p>
                        <button 
                            onClick={() => navigateTo('/customer-seller-relations')}
                            className="flex items-center px-4 py-2 bg-primary dark:bg-dark-primary text-white rounded-md hover:bg-secondary transition-colors"
                        >
                            <Link className="h-4 w-4 mr-2" />
                            {t('salesRoutes.goToRelations')}
                        </button>
                    </div>
                 ) : (
                    <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border dark:divide-dark-border">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="p-4 text-left">
                                            <input
                                                type="checkbox"
                                                className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-600 border-gray-300 text-primary focus:ring-accent"
                                                checked={isAllFilteredSelected}
                                                onChange={e => handleSelectAllFiltered(e.target.checked)}
                                                disabled={!pagePermissions?.can_edit}
                                                title={t('relations.selectAll')}
                                            />
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('relations.customerCode')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('relations.customerName')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('customers.district')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border dark:divide-dark-border">
                                    {paginatedCustomers.map(customer => (
                                        <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <td className="p-4">
                                                <input
                                                    type="checkbox"
                                                    className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-600 border-gray-300 text-primary focus:ring-accent"
                                                    checked={checkedCustomerIds.has(customer.id)}
                                                    onChange={e => handleCheckboxChange(customer.id, e.target.checked)}
                                                    disabled={!pagePermissions?.can_edit}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{customer.customer_code}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{customer.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                                {districts.find(d => d.id === customer.district_id)?.name || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {paginatedCustomers.length === 0 && (
                                        <tr><td colSpan={4} className="text-center py-8 text-text-secondary">{t('salesRoutes.noCustomersFound')}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between p-4 border-t border-border dark:border-dark-border">
                                <span className="text-sm text-text-secondary">
                                    {t('pagination.page').replace('{currentPage}', String(currentPage)).replace('{totalPages}', String(totalPages))}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1 text-sm flex items-center gap-1 rounded-md border border-border hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                                    >
                                        <ChevronLeft className="h-4 w-4" />{t('pagination.previous')}
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1 text-sm flex items-center gap-1 rounded-md border border-border hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                                    >
                                        {t('pagination.next')}<ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SalesRoutePlanning;
