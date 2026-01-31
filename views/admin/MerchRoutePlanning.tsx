
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { Merch, Customer, District } from '../../types';
import { Save, Loader2, Search, ChevronLeft, ChevronRight, Filter, AlertCircle, Link } from 'lucide-react';

const ITEMS_PER_PAGE = 15;

const MerchRoutePlanning: React.FC = () => {
    const { t, permissions, showNotification, profile, navigateTo } = useAppContext();
    const pagePermissions = permissions['Merch Route Planning'];

    const [merchs, setMerchs] = useState<Merch[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [selectedMerchId, setSelectedMerchId] = useState<string>('');
    const [selectedDay, setSelectedDay] = useState<string>('');
    const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');

    // Customers assigned to the merch via Relationships page
    const [merchCustomerIds, setMerchCustomerIds] = useState<Set<string>>(new Set());
    
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
            const merchsPromise = supabase.from('merchs').select('*').order('name');
            const customersPromise = supabase.from('customers').select('*').order('name');
            const districtsPromise = supabase.from('districts').select('*').order('name');
            
            const [
                { data: merchsData, error: merchsError }, 
                { data: customersData, error: customersError },
                { data: districtsData, error: districtsError }
            ] = await Promise.all([merchsPromise, customersPromise, districtsPromise]);

            if (merchsError) throw merchsError;
            if (customersError) throw customersError;
            if (districtsError) throw districtsError;

            setMerchs(merchsData || []);
            setCustomers(customersData || []);
            setDistricts(districtsData || []);
        } catch (error: any) {
            showNotification(error.message, "error");
        } finally {
            setLoading(false);
        }
    }, [pagePermissions, showNotification]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    // Fetch the customers assigned to this merchandiser via Relationships
    useEffect(() => {
        const fetchMerchRelationships = async () => {
            if (!selectedMerchId) {
                setMerchCustomerIds(new Set());
                return;
            }
            setRelationshipLoading(true);
            try {
                const { data, error } = await supabase
                    .from('customer_merch_relationships')
                    .select('customer_id')
                    .eq('merch_id', selectedMerchId);

                if (error) throw error;
                const ids = new Set<string>((data || []).map(r => r.customer_id));
                setMerchCustomerIds(ids);
            } catch (error: any) {
                console.error("Error fetching merch relationships", error);
                showNotification("Failed to load merchandiser's assigned customers", "error");
            } finally {
                setRelationshipLoading(false);
            }
        };

        fetchMerchRelationships();
    }, [selectedMerchId, showNotification]);

    const fetchRoutes = useCallback(async () => {
        if (!selectedMerchId || !selectedDay) {
            setAssociatedCustomerIds(new Set());
            setCheckedCustomerIds(new Set());
            return;
        }
        // Don't set main loading here to avoid full screen flicker, just route data update
        try {
            const { data, error } = await supabase
                .from('daily_merch_routes')
                .select('customer_id')
                .eq('merch_id', selectedMerchId)
                .eq('day_of_week', parseInt(selectedDay));

            if (error) throw error;
            
            const idSet = new Set<string>((data || []).map(rel => rel.customer_id));
            setAssociatedCustomerIds(idSet);
            setCheckedCustomerIds(idSet);
        } catch (error: any) {
             showNotification(error.message, "error");
        }
    }, [selectedMerchId, selectedDay, showNotification]);

    useEffect(() => {
        fetchRoutes();
    }, [fetchRoutes]);

    const filteredCustomers = useMemo(() => {
        // Start with all customers
        let result = customers;

        // 1. Filter by Merch Relationships (Must be assigned to merch to appear here)
        if (selectedMerchId) {
            result = result.filter(c => merchCustomerIds.has(c.id));
        } else {
             // If no merch selected, conceptually we shouldn't show anything, 
             // but the UI handles hiding the table until selection.
             return [];
        }
        
        // 2. Filter by District
        if (selectedDistrictId) {
            result = result.filter(c => c.district_id === selectedDistrictId);
        }

        // 3. Filter by Search Term
        if (searchTerm) {
             const lowercasedFilter = searchTerm.toLowerCase();
             result = result.filter(customer =>
                customer.name.toLowerCase().includes(lowercasedFilter) ||
                customer.customer_code.toLowerCase().includes(lowercasedFilter)
            );
        }
       
        return result;
    }, [customers, searchTerm, selectedDistrictId, selectedMerchId, merchCustomerIds]);

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
        if (!selectedMerchId || !selectedDay || !pagePermissions?.can_edit) return;
        setIsSaving(true);
        try {
            const dayOfWeek = parseInt(selectedDay);
            const idsToAdd = [...checkedCustomerIds].filter(id => !associatedCustomerIds.has(id));
            const idsToRemove = [...associatedCustomerIds].filter(id => !checkedCustomerIds.has(id));

            if (idsToRemove.length > 0) {
                const { error } = await supabase
                    .from('daily_merch_routes')
                    .delete()
                    .eq('merch_id', selectedMerchId)
                    .eq('day_of_week', dayOfWeek)
                    .in('customer_id', idsToRemove);
                if (error) throw error;
            }

            if (idsToAdd.length > 0) {
                const recordsToAdd = idsToAdd.map(customerId => ({
                    customer_id: customerId,
                    merch_id: selectedMerchId,
                    day_of_week: dayOfWeek,
                    created_by: profile?.id
                }));
                const { error } = await supabase.from('daily_merch_routes').insert(recordsToAdd);
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
    const showWarningNoRelations = selectedMerchId && !loading && !relationshipLoading && merchCustomerIds.size === 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('merchRoutes.title')}</h1>
                {pagePermissions?.can_edit && selectedMerchId && selectedDay && !showWarningNoRelations && (
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     <select 
                        value={selectedDay}
                        onChange={e => {
                            setSelectedDay(e.target.value);
                            setSearchTerm('');
                            setCurrentPage(1);
                        }}
                        className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md focus:ring-accent"
                    >
                        <option value="">{t('merchRoutes.selectDay')}</option>
                        {daysOfWeek.map(day => <option key={day.value} value={day.value}>{day.label}</option>)}
                    </select>

                    <select 
                        value={selectedMerchId}
                        onChange={e => {
                            setSelectedMerchId(e.target.value);
                            setSearchTerm('');
                            setCurrentPage(1);
                        }}
                        className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md focus:ring-accent md:col-span-2"
                    >
                        <option value="">{t('merchRoutes.selectMerch')}</option>
                        {merchs.map(merch => <option key={merch.id} value={merch.id}>{merch.name}</option>)}
                    </select>

                    <div className="relative">
                         <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                         <select
                            value={selectedDistrictId}
                            onChange={(e) => {
                                setSelectedDistrictId(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md focus:ring-accent appearance-none"
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
                
                 {selectedMerchId && selectedDay && !showWarningNoRelations && (
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
                 !selectedMerchId || !selectedDay ? (
                    <div className="text-center p-8 bg-surface dark:bg-dark-surface rounded-lg border border-border dark:border-dark-border">
                        <p className="text-text-secondary dark:text-dark-text-secondary">{t('merchRoutes.noSelection')}</p>
                    </div>
                 ) : showWarningNoRelations ? (
                    <div className="text-center p-8 bg-surface dark:bg-dark-surface rounded-lg border border-border dark:border-dark-border flex flex-col items-center justify-center">
                         <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-full mb-4">
                            <AlertCircle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                         </div>
                        <h3 className="text-lg font-bold text-text-primary dark:text-dark-text-primary mb-2">{t('merchRoutes.noCustomersAssigned.title')}</h3>
                        <p className="text-text-secondary dark:text-dark-text-secondary mb-4 max-w-md">
                            {t('merchRoutes.noCustomersAssigned.message')}
                        </p>
                        <button 
                            onClick={() => navigateTo('/customer-merch-relations')}
                            className="flex items-center px-4 py-2 bg-primary dark:bg-dark-primary text-white rounded-md hover:bg-secondary transition-colors"
                        >
                            <Link className="h-4 w-4 mr-2" />
                            {t('merchRoutes.goToRelations')}
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
                                        <tr><td colSpan={4} className="text-center py-8 text-text-secondary">{t('merchRoutes.noCustomersFound')}</td></tr>
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

export default MerchRoutePlanning;
