
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { Seller, ProductGroup } from '../../types';
import { Save, Loader2, Search, ChevronLeft, ChevronRight, CheckSquare, Square } from 'lucide-react';

const ITEMS_PER_PAGE = 15;

const SellerProductGroupRelations: React.FC = () => {
    const { t, permissions, showNotification, profile } = useAppContext();
    const pagePermissions = permissions['Seller Product Group Relations'];

    const [sellers, setSellers] = useState<Seller[]>([]);
    const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
    const [selectedSellerId, setSelectedSellerId] = useState<string>('');
    
    const [associatedGroupIds, setAssociatedGroupIds] = useState<Set<string>>(new Set());
    const [checkedGroupIds, setCheckedGroupIds] = useState<Set<string>>(new Set());
    
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
                const sellersPromise = supabase.from('sellers').select('*').order('name');
                const groupsPromise = supabase.from('product_groups').select('*').order('name');
                
                const [
                    { data: sellersData, error: sellersError }, 
                    { data: groupsData, error: groupsError }
                ] = await Promise.all([sellersPromise, groupsPromise]);

                if (sellersError) throw sellersError;
                if (groupsError) throw groupsError;

                setSellers(sellersData || []);
                setProductGroups(groupsData || []);
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
            if (!selectedSellerId) {
                setAssociatedGroupIds(new Set());
                setCheckedGroupIds(new Set());
                return;
            }
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('seller_product_groups')
                    .select('product_group_id')
                    .eq('seller_id', selectedSellerId);

                if (error) throw error;
                
                const idSet = new Set<string>((data || []).map(rel => rel.product_group_id));
                setAssociatedGroupIds(idSet);
                setCheckedGroupIds(idSet);
            } catch (error: any) {
                 console.error("Error fetching relationships:", error);
                 showNotification(error.message || "Failed to load relationships.", "error");
            } finally {
                setLoading(false);
            }
        };

        fetchRelationships();
    }, [selectedSellerId, showNotification]);

    const filteredGroups = useMemo(() => {
        if (!searchTerm) return productGroups;
        const lowerTerm = searchTerm.toLowerCase();
        return productGroups.filter(g => 
            g.name.toLowerCase().includes(lowerTerm) || 
            (g.description && g.description.toLowerCase().includes(lowerTerm))
        );
    }, [productGroups, searchTerm]);

    const totalPages = Math.ceil(filteredGroups.length / ITEMS_PER_PAGE);

    const paginatedGroups = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredGroups.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredGroups, currentPage]);

    const handleCheckboxChange = (groupId: string, isChecked: boolean) => {
        setCheckedGroupIds(prev => {
            const newSet = new Set(prev);
            if (isChecked) newSet.add(groupId);
            else newSet.delete(groupId);
            return newSet;
        });
    };
    
    const handleSelectAllFiltered = (isChecked: boolean) => {
        const filteredIds = filteredGroups.map(g => g.id);
        setCheckedGroupIds(prev => {
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
        if (!selectedSellerId || !pagePermissions?.can_edit) return;
        setIsSaving(true);
        try {
            const initialIds = associatedGroupIds;
            const currentIds = checkedGroupIds;

            const idsToAdd = [...currentIds].filter(id => !initialIds.has(id));
            const idsToRemove = [...initialIds].filter(id => !currentIds.has(id));

            const promises = [];

            if (idsToAdd.length > 0) {
                const recordsToAdd = idsToAdd.map(groupId => ({
                    product_group_id: groupId,
                    seller_id: selectedSellerId,
                    created_by: profile?.id
                }));
                promises.push(supabase.from('seller_product_groups').insert(recordsToAdd));
            }

            if (idsToRemove.length > 0) {
                promises.push(
                    supabase.from('seller_product_groups')
                        .delete()
                        .eq('seller_id', selectedSellerId)
                        .in('product_group_id', idsToRemove)
                );
            }

            if (promises.length > 0) {
                const results = await Promise.all(promises);
                const errors = results.filter(res => res.error);
                if (errors.length > 0) throw new Error(errors.map(e => e.error?.message).join(', '));
            }

            showNotification(t('notification.relations.saveSuccess'));
            setAssociatedGroupIds(new Set(currentIds));

        } catch (error: any) {
            showNotification(error.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    if (!pagePermissions?.can_view) {
        return <p className="text-text-secondary dark:text-dark-text-secondary">{t('error.accessDenied.message')}</p>
    }

    const isAllFilteredSelected = filteredGroups.length > 0 && filteredGroups.every(g => checkedGroupIds.has(g.id));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('sellerProductGroups.title')}</h1>
                {pagePermissions?.can_edit && selectedSellerId && (
                     <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="flex items-center px-4 py-2 bg-primary dark:bg-dark-primary text-white rounded-md hover:bg-secondary dark:hover:bg-dark-secondary transition-colors disabled:opacity-50"
                    >
                         {isSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                        {isSaving ? 'Saving...' : t('relations.save')}
                    </button>
                )}
            </div>
            
             <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <select 
                        value={selectedSellerId}
                        onChange={e => {
                            setSelectedSellerId(e.target.value);
                            setSearchTerm('');
                            setCurrentPage(1);
                        }}
                        className="w-full md:w-1/3 p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:ring-accent"
                    >
                        <option value="">{t('sellerProductGroups.selectSeller')}</option>
                        {sellers.map(seller => <option key={seller.id} value={seller.id}>{seller.name}</option>)}
                    </select>
                
                    {selectedSellerId && (
                        <div className="relative w-full md:w-1/3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('relations.searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full p-2 pl-10 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md"
                            />
                        </div>
                    )}
                </div>

                {loading ? <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div> : 
                 !selectedSellerId ? (
                    <div className="text-center p-8 bg-surface dark:bg-dark-surface rounded-lg border border-border dark:border-dark-border">
                        <p className="text-text-secondary dark:text-dark-text-secondary">{t('sellerProductGroups.noSellerSelected')}</p>
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
                                                className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-primary focus:ring-accent"
                                                checked={isAllFilteredSelected}
                                                onChange={e => handleSelectAllFiltered(e.target.checked)}
                                                disabled={!pagePermissions?.can_edit}
                                            />
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('sellerProductGroups.groupName')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('sellerProductGroups.description')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border dark:divide-dark-border">
                                    {paginatedGroups.map(group => (
                                        <tr key={group.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <td className="p-4">
                                                <input
                                                    type="checkbox"
                                                    className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-primary focus:ring-accent"
                                                    checked={checkedGroupIds.has(group.id)}
                                                    onChange={e => handleCheckboxChange(group.id, e.target.checked)}
                                                    disabled={!pagePermissions?.can_edit}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary dark:text-dark-text-primary">{group.name}</td>
                                            <td className="px-6 py-4 text-sm text-text-secondary dark:text-dark-text-secondary">{group.description || '-'}</td>
                                        </tr>
                                    ))}
                                    {paginatedGroups.length === 0 && (
                                        <tr><td colSpan={3} className="text-center py-8 text-text-secondary dark:text-dark-text-secondary">No product groups found.</td></tr>
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

export default SellerProductGroupRelations;
