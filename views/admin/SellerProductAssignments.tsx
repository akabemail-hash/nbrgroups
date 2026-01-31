
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { Seller, ProductGroup, Product } from '../../types';
import { Save, Loader2, Search, CheckSquare, Square } from 'lucide-react';

const SellerProductAssignments: React.FC = () => {
    const { t, permissions, showNotification, profile } = useAppContext();
    const pagePermissions = permissions['Seller Product Assignments'];

    const [sellers, setSellers] = useState<Seller[]>([]);
    const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
    const [selectedSellerId, setSelectedSellerId] = useState<string>('');
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    
    // Products belonging to the selected group
    const [products, setProducts] = useState<Product[]>([]);
    
    // IDs of products already assigned to the selected seller (for ALL products or just this group? just this group is easier to manage in state)
    const [initialAssignedIds, setInitialAssignedIds] = useState<Set<string>>(new Set());
    // Current checkbox state
    const [checkedProductIds, setCheckedProductIds] = useState<Set<string>>(new Set());
    
    const [loading, setLoading] = useState(true);
    const [productsLoading, setProductsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // 1. Fetch Sellers and Groups on mount
    useEffect(() => {
        const fetchInitialData = async () => {
            if (!pagePermissions?.can_view) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const [sellersRes, groupsRes] = await Promise.all([
                    supabase.from('sellers').select('*').order('name'),
                    supabase.from('product_groups').select('*').order('name')
                ]);

                if (sellersRes.error) throw sellersRes.error;
                if (groupsRes.error) throw groupsRes.error;

                setSellers(sellersRes.data || []);
                setProductGroups(groupsRes.data || []);
            } catch (error: any) {
                showNotification(error.message || "Failed to load initial data", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [pagePermissions, showNotification]);

    // 2. Fetch Products and Existing Assignments when Seller or Group changes
    useEffect(() => {
        const fetchData = async () => {
            if (!selectedSellerId || !selectedGroupId) {
                setProducts([]);
                setInitialAssignedIds(new Set());
                setCheckedProductIds(new Set());
                return;
            }

            setProductsLoading(true);
            try {
                // A. Fetch Products for this Group
                const { data: productsData, error: productsError } = await supabase
                    .from('products')
                    .select('*')
                    .eq('product_group_id', selectedGroupId)
                    .order('name');
                
                if (productsError) throw productsError;
                
                const currentGroupProducts = productsData || [];
                setProducts(currentGroupProducts);

                // B. Fetch existing assignments for this seller AND these products
                // We only care about products in the current group
                if (currentGroupProducts.length > 0) {
                    const productIds = currentGroupProducts.map(p => p.id);
                    const { data: assignmentsData, error: assignmentsError } = await supabase
                        .from('seller_products')
                        .select('product_id')
                        .eq('seller_id', selectedSellerId)
                        .in('product_id', productIds);

                    if (assignmentsError) throw assignmentsError;

                    // Fix: Explicitly map to string to ensure Set<string> type compatibility
                    const assignedSet = new Set<string>((assignmentsData || []).map((a: any) => a.product_id));
                    setInitialAssignedIds(assignedSet);
                    setCheckedProductIds(new Set(assignedSet)); // Initialize checkboxes
                } else {
                    setInitialAssignedIds(new Set());
                    setCheckedProductIds(new Set());
                }

            } catch (error: any) {
                console.error("Error fetching products/assignments:", error);
                showNotification("Failed to load products.", "error");
            } finally {
                setProductsLoading(false);
            }
        };

        fetchData();
    }, [selectedSellerId, selectedGroupId, showNotification]);

    // Filter displayed products by search term
    const filteredProducts = useMemo(() => {
        if (!searchTerm) return products;
        const lower = searchTerm.toLowerCase();
        return products.filter(p => 
            p.name.toLowerCase().includes(lower) || 
            p.product_code.toLowerCase().includes(lower)
        );
    }, [products, searchTerm]);

    // Checkbox Handlers
    const handleCheckboxChange = (productId: string, checked: boolean) => {
        setCheckedProductIds(prev => {
            const next = new Set(prev);
            if (checked) next.add(productId);
            else next.delete(productId);
            return next;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        // Only affect filtered products
        const visibleIds = filteredProducts.map(p => p.id);
        setCheckedProductIds(prev => {
            const next = new Set(prev);
            if (checked) {
                visibleIds.forEach(id => next.add(id));
            } else {
                visibleIds.forEach(id => next.delete(id));
            }
            return next;
        });
    };

    const handleSave = async () => {
        if (!selectedSellerId || !selectedGroupId || !pagePermissions?.can_edit) return;
        setIsSaving(true);
        try {
            // Logic:
            // 1. Identify what's currently in DB for this group (initialAssignedIds)
            // 2. Identify what's currently checked (checkedProductIds)
            // 3. Diff them to find what to INSERT and what to DELETE
            // Important: Only consider products belonging to the selected group to avoid messing up other groups.

            const currentGroupProductIds = new Set(products.map(p => p.id));
            
            // Filter checkboxes to ensure we only process IDs valid for this group (sanity check)
            const validCheckedIds = new Set([...checkedProductIds].filter(id => currentGroupProductIds.has(id)));

            const toAdd = [...validCheckedIds].filter(id => !initialAssignedIds.has(id));
            const toRemove = [...initialAssignedIds].filter(id => !validCheckedIds.has(id));

            const promises = [];

            if (toAdd.length > 0) {
                const records = toAdd.map(pid => ({
                    seller_id: selectedSellerId,
                    product_id: pid,
                    created_by: profile?.id
                }));
                promises.push(supabase.from('seller_products').insert(records));
            }

            if (toRemove.length > 0) {
                promises.push(
                    supabase.from('seller_products')
                        .delete()
                        .eq('seller_id', selectedSellerId)
                        .in('product_id', toRemove)
                );
            }

            if (promises.length > 0) {
                const results = await Promise.all(promises);
                const errors = results.filter(r => r.error);
                if (errors.length > 0) throw new Error("Some updates failed.");
                
                showNotification(t('notification.relations.saveSuccess'), 'success');
                // Update initial state to reflect changes
                setInitialAssignedIds(validCheckedIds);
            } else {
                showNotification("No changes to save.", "info");
            }

        } catch (error: any) {
            showNotification(error.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const isAllSelected = filteredProducts.length > 0 && filteredProducts.every(p => checkedProductIds.has(p.id));

    if (!pagePermissions?.can_view) return <p className="text-text-secondary dark:text-dark-text-secondary">{t('error.accessDenied.message')}</p>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('sellerProductAssignments.title')}</h1>
                {pagePermissions?.can_edit && selectedSellerId && selectedGroupId && (
                     <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="flex items-center px-4 py-2 bg-primary dark:bg-dark-primary text-white rounded-md hover:bg-secondary transition-colors disabled:opacity-50"
                    >
                         {isSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                        {isSaving ? t('common.saving') : t('form.save')}
                    </button>
                )}
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Seller Select */}
                <select 
                    value={selectedSellerId}
                    onChange={e => {
                        setSelectedSellerId(e.target.value);
                        // Reset downstream
                        setProducts([]);
                        setSearchTerm('');
                    }}
                    className="p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md focus:ring-accent"
                >
                    <option value="">{t('sellerProductGroups.selectSeller')}</option>
                    {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>

                {/* Group Select */}
                <select 
                    value={selectedGroupId}
                    onChange={e => {
                        setSelectedGroupId(e.target.value);
                        setSearchTerm('');
                    }}
                    className="p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md focus:ring-accent"
                    disabled={!selectedSellerId}
                >
                    <option value="">{t('sellerProductAssignments.selectGroup')}</option>
                    {productGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('relations.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 pl-10 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md focus:ring-accent"
                        disabled={!selectedGroupId}
                    />
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border overflow-hidden min-h-[300px]">
                {loading || productsLoading ? (
                    <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : !selectedSellerId || !selectedGroupId ? (
                    <div className="flex justify-center items-center h-64 text-text-secondary">
                        {t('sellerProductAssignments.noGroupSelected')}
                    </div>
                ) : products.length === 0 ? (
                    <div className="flex justify-center items-center h-64 text-text-secondary">
                         {t('sellerProductAssignments.noProducts')}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border dark:divide-dark-border">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="p-4 w-12">
                                        <input 
                                            type="checkbox" 
                                            className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-accent"
                                            checked={isAllSelected}
                                            onChange={e => handleSelectAll(e.target.checked)}
                                        />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{t('products.productCode')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{t('products.name')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{t('products.brand')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{t('products.price')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border dark:divide-dark-border">
                                {filteredProducts.map(product => (
                                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <td className="p-4">
                                            <input 
                                                type="checkbox" 
                                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-accent"
                                                checked={checkedProductIds.has(product.id)}
                                                onChange={e => handleCheckboxChange(product.id, e.target.checked)}
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{product.product_code}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{product.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{product.brand || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{product.price.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredProducts.length === 0 && <div className="text-center p-8 text-text-secondary">No products match your search.</div>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SellerProductAssignments;
