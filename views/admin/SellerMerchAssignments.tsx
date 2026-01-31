
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { Seller, Merch } from '../../types';
import { Save, Loader2, Search, CheckSquare, Square } from 'lucide-react';

const SellerMerchAssignments: React.FC = () => {
    const { t, permissions, showNotification, profile } = useAppContext();
    const pagePermissions = permissions['Seller-Merch Assignments'];

    const [sellers, setSellers] = useState<Seller[]>([]);
    const [merchs, setMerchs] = useState<Merch[]>([]);
    const [selectedSellerId, setSelectedSellerId] = useState<string>('');
    
    const [associatedMerchIds, setAssociatedMerchIds] = useState<Set<string>>(new Set());
    const [checkedMerchIds, setCheckedMerchIds] = useState<Set<string>>(new Set());
    
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchInitialData = async () => {
            if (!pagePermissions?.can_view) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const sellersPromise = supabase.from('sellers').select('*').order('name');
                const merchsPromise = supabase.from('merchs').select('*').order('name');
                
                const [
                    { data: sellersData, error: sellersError }, 
                    { data: merchsData, error: merchsError }
                ] = await Promise.all([sellersPromise, merchsPromise]);

                if (sellersError) throw sellersError;
                if (merchsError) throw merchsError;

                setSellers(sellersData || []);
                setMerchs(merchsData || []);
            } catch (error: any) {
                showNotification(error.message || "Failed to load data.", "error");
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [pagePermissions, showNotification]);

    useEffect(() => {
        const fetchAssignments = async () => {
            if (!selectedSellerId) {
                setAssociatedMerchIds(new Set());
                setCheckedMerchIds(new Set());
                return;
            }
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('seller_merch_assignments')
                    .select('merch_id')
                    .eq('seller_id', selectedSellerId);

                if (error) throw error;
                
                const idSet = new Set<string>((data || []).map(rel => rel.merch_id));
                setAssociatedMerchIds(idSet);
                setCheckedMerchIds(idSet);
            } catch (error: any) {
                 showNotification(error.message || "Failed to load assignments.", "error");
            } finally {
                setLoading(false);
            }
        };

        fetchAssignments();
    }, [selectedSellerId, showNotification]);

    const filteredMerchs = useMemo(() => {
        if (!searchTerm) return merchs;
        const lowerTerm = searchTerm.toLowerCase();
        return merchs.filter(m => 
            m.name.toLowerCase().includes(lowerTerm) || 
            m.merch_code.toLowerCase().includes(lowerTerm)
        );
    }, [merchs, searchTerm]);

    const handleCheckboxChange = (merchId: string, isChecked: boolean) => {
        setCheckedMerchIds(prev => {
            const newSet = new Set(prev);
            if (isChecked) newSet.add(merchId);
            else newSet.delete(merchId);
            return newSet;
        });
    };

    const handleSave = async () => {
        if (!selectedSellerId || !pagePermissions?.can_edit) return;
        setIsSaving(true);
        try {
            const initialIds = associatedMerchIds;
            const currentIds = checkedMerchIds;

            const idsToAdd = [...currentIds].filter(id => !initialIds.has(id));
            const idsToRemove = [...initialIds].filter(id => !currentIds.has(id));

            const promises = [];

            if (idsToAdd.length > 0) {
                const recordsToAdd = idsToAdd.map(merchId => ({
                    merch_id: merchId,
                    seller_id: selectedSellerId
                }));
                promises.push(supabase.from('seller_merch_assignments').insert(recordsToAdd));
            }

            if (idsToRemove.length > 0) {
                promises.push(
                    supabase.from('seller_merch_assignments')
                        .delete()
                        .eq('seller_id', selectedSellerId)
                        .in('merch_id', idsToRemove)
                );
            }

            if (promises.length > 0) {
                const results = await Promise.all(promises);
                const errors = results.filter(res => res.error);
                if (errors.length > 0) throw new Error(errors.map(e => e.error?.message).join(', '));
            }

            showNotification(t('notification.relations.saveSuccess'));
            setAssociatedMerchIds(new Set(currentIds));

        } catch (error: any) {
            showNotification(error.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    if (!pagePermissions?.can_view) return <p>{t('error.accessDenied.message')}</p>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('sellerMerchAssignments.title')}</h1>
                {pagePermissions?.can_edit && selectedSellerId && (
                     <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="flex items-center px-4 py-2 bg-primary dark:bg-dark-primary text-white rounded-md hover:bg-secondary transition-colors disabled:opacity-50"
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
                        onChange={e => setSelectedSellerId(e.target.value)}
                        className="w-full md:w-1/3 p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:ring-accent"
                    >
                        <option value="">{t('sellerMerchAssignments.selectSeller')}</option>
                        {sellers.map(seller => <option key={seller.id} value={seller.id}>{seller.name}</option>)}
                    </select>
                
                    {selectedSellerId && (
                        <div className="relative w-full md:w-1/3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('relations.searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full p-2 pl-10 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md"
                            />
                        </div>
                    )}
                </div>

                {loading ? <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div> : 
                 !selectedSellerId ? (
                    <div className="text-center p-8 bg-surface dark:bg-dark-surface rounded-lg border border-border">
                        <p className="text-text-secondary">{t('sellerMerchAssignments.noSellerSelected')}</p>
                    </div>
                 ) : (
                    <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border overflow-hidden">
                        <table className="min-w-full divide-y divide-border dark:divide-dark-border">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="p-4 text-left w-10"></th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{t('merchs.merchCode')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{t('merchs.name')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{t('merchs.phoneNumber')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border dark:divide-dark-border">
                                {filteredMerchs.map(merch => (
                                    <tr key={merch.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <td className="p-4">
                                            <input
                                                type="checkbox"
                                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-accent"
                                                checked={checkedMerchIds.has(merch.id)}
                                                onChange={e => handleCheckboxChange(merch.id, e.target.checked)}
                                                disabled={!pagePermissions?.can_edit}
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{merch.merch_code}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{merch.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{merch.phone_number || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 )}
            </div>
        </div>
    );
};

export default SellerMerchAssignments;
