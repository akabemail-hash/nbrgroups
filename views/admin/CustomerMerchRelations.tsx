
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { Merch, Customer, District } from '../../types';
import { Save, Loader2, Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

const ITEMS_PER_PAGE = 15;

const CustomerMerchRelations: React.FC = () => {
    const { t, permissions, showNotification, profile } = useAppContext();
    const pagePermissions = permissions['Customer-Merch Relations'];

    const [merchs, setMerchs] = useState<Merch[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [selectedMerchId, setSelectedMerchId] = useState<string>('');
    const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');
    
    const [associatedCustomerIds, setAssociatedCustomerIds] = useState<Set<string>>(new Set());
    const [checkedCustomerIds, setCheckedCustomerIds] = useState<Set<string>>(new Set());
    
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        const fetchInitialData = async () => {
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
                console.error("Error fetching initial data:", error);
                showNotification(error.message || "Failed to load data.", "error");
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [pagePermissions, showNotification]);

    useEffect(() => {
        const fetchRelationships = async () => {
            if (!selectedMerchId) {
                setAssociatedCustomerIds(new Set());
                setCheckedCustomerIds(new Set());
                return;
            }
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('customer_merch_relationships')
                    .select('customer_id')
                    .eq('merch_id', selectedMerchId);

                if (error) throw error;
                
                const idSet = new Set<string>((data || []).map(rel => rel.customer_id));
                setAssociatedCustomerIds(idSet);
                setCheckedCustomerIds(idSet);
            } catch (error: any) {
                 console.error("Error fetching relationships:", error);
                 showNotification(error.message || "Failed to load relationships for the selected merchandiser.", "error");
            } finally {
                setLoading(false);
            }
        };

        fetchRelationships();
    }, [selectedMerchId, showNotification]);

    const filteredCustomers = useMemo(() => {
        let result = customers;

        if (selectedDistrictId) {
            result = result.filter(c => c.district_id === selectedDistrictId);
        }

        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            result = result.filter(customer =>
                customer.name.toLowerCase().includes(lowercasedFilter) ||
                customer.customer_code.toLowerCase().includes(lowercasedFilter)
            );
        }
        
        return result;
    }, [customers, searchTerm, selectedDistrictId]);

    const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);

    const paginatedCustomers = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredCustomers.slice(startIndex, endIndex);
    }, [filteredCustomers, currentPage]);

    const handleCheckboxChange = (customerId: string, isChecked: boolean) => {
        setCheckedCustomerIds(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                newSet.add(customerId);
            } else {
                newSet.delete(customerId);
            }
            return newSet;
        });
    };
    
    const handleSelectAllFiltered = (isChecked: boolean) => {
        const filteredIds = new Set(filteredCustomers.map(c => c.id));
        setCheckedCustomerIds(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                for (const id of filteredIds) {
                    newSet.add(id);
                }
            } else {
                for (const id of filteredIds) {
                    newSet.delete(id);
                }
            }
            return newSet;
        });
    };

    const handleSave = async () => {
        if (!selectedMerchId || !pagePermissions?.can_edit) return;
        setIsSaving(true);
        try {
            const initialIds = associatedCustomerIds;
            const currentIds = checkedCustomerIds;

            const idsToAdd = [...currentIds].filter(id => !initialIds.has(id));
            const idsToRemove = [...initialIds].filter(id => !currentIds.has(id));

            const promises = [];

            if (idsToAdd.length > 0) {
                const recordsToAdd = idsToAdd.map(customerId => ({
                    customer_id: customerId,
                    merch_id: selectedMerchId,
                    created_by: profile?.id
                }));
                promises.push(supabase.from('customer_merch_relationships').insert(recordsToAdd));
            }

            if (idsToRemove.length > 0) {
                promises.push(
                    supabase.from('customer_merch_relationships')
                        .delete()
                        .eq('merch_id', selectedMerchId)
                        .in('customer_id', idsToRemove)
                );
            }

            if (promises.length > 0) {
                const results = await Promise.all(promises);
                const errors = results.filter(res => res.error);

                if (errors.length > 0) {
                    throw new Error(errors.map(e => e.error?.message).join(', '));
                }
            }

            showNotification(t('notification.relations.saveSuccess'));
            setAssociatedCustomerIds(new Set(currentIds));

        } catch (error: any) {
            showNotification(t('notification.relations.saveError').replace('{error}', error.message), 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    if (!pagePermissions?.can_view) {
        return <p className="text-text-secondary dark:text-dark-text-secondary">{t('error.accessDenied.message')}</p>
    }

    const isAllFilteredSelected = filteredCustomers.length > 0 && filteredCustomers.every(c => checkedCustomerIds.has(c.id));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('merchRelations.title')}</h1>
                {pagePermissions?.can_edit && selectedMerchId && (
                     <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="flex items-center px-4 py-2 bg-primary dark:bg-dark-primary text-white rounded-md hover:bg-secondary dark:hover:bg-dark-secondary transition-colors disabled:opacity-50"
                    >
                         {isSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                        {isSaving ? 'Saving...' : t('merchRelations.save')}
                    </button>
                )}
            </div>
            
             <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <select 
                        value={selectedMerchId}
                        onChange={e => {
                            setSelectedMerchId(e.target.value);
                            setSearchTerm('');
                            setCurrentPage(1);
                        }}
                        className="w-full md:w-1/3 p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:ring-accent dark:focus:ring-dark-accent focus:border-accent dark:focus:border-dark-accent"
                    >
                        <option value="">{t('merchRelations.selectMerch')}</option>
                        {merchs.map(merch => <option key={merch.id} value={merch.id}>{merch.name}</option>)}
                    </select>

                    <div className="relative w-full md:w-1/3">
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
                    
                    {selectedMerchId && (
                        <div className="relative w-full md:w-1/3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('merchRelations.searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full p-2 pl-10 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:ring-accent dark:focus:ring-dark-accent focus:border-accent dark:focus:border-dark-accent"
                            />
                        </div>
                    )}
                </div>

                {loading ? <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div> : 
                 !selectedMerchId ? (
                    <div className="text-center p-8 bg-surface dark:bg-dark-surface rounded-lg border border-border dark:border-dark-border">
                        <p className="text-text-secondary dark:text-dark-text-secondary">{t('merchRelations.noMerchSelected')}</p>
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
                                                className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-primary dark:text-dark-primary focus:ring-accent dark:focus:ring-dark-accent"
                                                checked={isAllFilteredSelected}
                                                onChange={e => handleSelectAllFiltered(e.target.checked)}
                                                disabled={!pagePermissions?.can_edit}
                                                title={t('merchRelations.selectAll')}
                                            />
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('merchRelations.customerCode')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('merchRelations.customerName')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('customers.district')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border dark:divide-dark-border">
                                    {paginatedCustomers.map(customer => (
                                        <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <td className="p-4">
                                                <input
                                                    type="checkbox"
                                                    className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-primary dark:text-dark-primary focus:ring-accent dark:focus:ring-dark-accent"
                                                    checked={checkedCustomerIds.has(customer.id)}
                                                    onChange={e => handleCheckboxChange(customer.id, e.target.checked)}
                                                    disabled={!pagePermissions?.can_edit}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary dark:text-dark-text-primary">{customer.customer_code}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{customer.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">
                                                {districts.find(d => d.id === customer.district_id)?.name || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {paginatedCustomers.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="text-center py-8 text-text-secondary dark:text-dark-text-secondary">
                                                No customers found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between p-4 border-t border-border dark:border-dark-border">
                                <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
                                    {t('pagination.page').replace('{currentPage}', String(currentPage)).replace('{totalPages}', String(totalPages))}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1 text-sm flex items-center gap-1 rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        {t('pagination.previous')}
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1 text-sm flex items-center gap-1 rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {t('pagination.next')}
                                        <ChevronRight className="h-4 w-4" />
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

export default CustomerMerchRelations;
