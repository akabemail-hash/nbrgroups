
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { supabase } from '../services/supabase';
import { Product, Customer } from '../types';
import { ImageUpload } from '../components/ImageUpload';
import { Plus, Trash2, Search, Loader2, Save } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface AnalysisItemState {
  localId: string;
  productId: string;
  productName: string;
  productPrice: string; // "Our Price" state
  competitorPrice: string;
  competitorProductName: string;
  photoFiles: File[];
}

const CompetitorPriceAnalysis: React.FC = () => {
    const { t, profile, permissions, showNotification, activeVisit, navigateTo } = useAppContext();
    const pagePermissions = permissions['Competitor Price Analysis'];

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [customerId, setCustomerId] = useState<string>('');
    const [analysisDate, setAnalysisDate] = useState(new Date().toISOString());
    const [description, setDescription] = useState('');
    const [items, setItems] = useState<AnalysisItemState[]>([]);
    
    // Customer search state
    const [customerSearch, setCustomerSearch] = useState('');
    const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

    // Product search state for each item
    const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [activeSearchInput, setActiveSearchInput] = useState<string | null>(null);
    
    const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const customerDebounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Initial Load & Guard
    useEffect(() => {
        if (!pagePermissions?.can_view) return;
        
        // --- GUARD: Check for active visit if user is Seller/Merch ---
        const role = profile?.role?.name;
        if ((role === 'Satış' || role === 'Merch') && !activeVisit) {
            showNotification(t('dailyPlan.validation.startVisitFirst'), 'error');
            navigateTo('/daily-plan');
            return;
        }

        // --- PRE-SELECT: If active visit exists, lock customer ---
        if (activeVisit) {
            setCustomerId(activeVisit.customerId);
            setCustomerSearch(activeVisit.customerName);
        }
        
        // Fetch Products
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const { data: productsData, error: productsError } = await supabase.from('products').select('*');
                if (productsError) throw productsError;
                setProducts(productsData || []);
            } catch (error: any) {
                showNotification(`Failed to load products: ${error.message}`, 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
        const timer = setInterval(() => setAnalysisDate(new Date().toISOString()), 60000); 
        return () => clearInterval(timer);
    }, [pagePermissions, activeVisit, profile, navigateTo, t, showNotification]);


    // Product Search Debounce
    useEffect(() => {
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        if (activeSearchInput && searchTerms[activeSearchInput]) {
            debounceTimeout.current = setTimeout(() => {
                const lowercased = searchTerms[activeSearchInput].toLowerCase();
                setFilteredProducts(products.filter(p => 
                    p.name.toLowerCase().includes(lowercased) || 
                    p.product_code.toLowerCase().includes(lowercased)
                ).slice(0, 10));
            }, 300);
        } else {
            setFilteredProducts([]);
        }
        return () => { if (debounceTimeout.current) clearTimeout(debounceTimeout.current) };
    }, [searchTerms, activeSearchInput, products]);

    // Customer Search Debounce (Only if NO active visit)
    useEffect(() => {
        if (activeVisit) return; // Skip search if locked

        if (customerDebounceTimeout.current) clearTimeout(customerDebounceTimeout.current);
        if (customerSearch) {
            customerDebounceTimeout.current = setTimeout(async () => {
                const lowercased = customerSearch.toLowerCase();
                const { data, error } = await supabase
                    .from('customers')
                    .select('*')
                    .or(`name.ilike.%${lowercased}%,customer_code.ilike.%${lowercased}%`)
                    .limit(10);
                
                if (error) {
                    console.error("Customer search error:", error);
                } else {
                    setFilteredCustomers(data || []);
                }
            }, 300);
        } else {
            setFilteredCustomers([]);
        }
        return () => { if (customerDebounceTimeout.current) clearTimeout(customerDebounceTimeout.current); };
    }, [customerSearch, activeVisit]);

    const handleSelectCustomer = (customer: Customer) => {
        setCustomerId(customer.id);
        setCustomerSearch(customer.name);
        setIsCustomerDropdownOpen(false);
    };

    const addItem = () => {
        setItems([...items, { localId: uuidv4(), productId: '', productName: '', productPrice: '', competitorPrice: '', competitorProductName: '', photoFiles: [] }]);
    };

    const removeItem = (localId: string) => {
        setItems(items.filter(item => item.localId !== localId));
    };
    
    // Used for single field updates
    const handleItemChange = (localId: string, field: keyof AnalysisItemState, value: any) => {
        setItems(prevItems => prevItems.map(item => item.localId === localId ? { ...item, [field]: value } : item));
    };

    const handleProductSearchChange = (localId: string, value: string) => {
        setSearchTerms(prev => ({ ...prev, [localId]: value }));
        setActiveSearchInput(localId);
        
        // If user types in the search box, invalidate the previously selected ID to ensure they select a valid product or we know it's custom
        setItems(prevItems => prevItems.map(item => {
            if (item.localId === localId && item.productName !== value) {
                 return { ...item, productId: '', productName: '', productPrice: '' };
            }
            return item;
        }));
    };
    
    const handleSelectProduct = (localId: string, product: Product) => {
        setItems(prevItems => prevItems.map(item => 
            item.localId === localId 
                ? { ...item, productId: product.id, productName: product.name, productPrice: product.price.toString() } 
                : item
        ));
        setSearchTerms(prev => ({ ...prev, [localId]: product.name }));
        setActiveSearchInput(null);
        setFilteredProducts([]);
    };

    const handleSave = async () => {
        if (!customerId) {
            showNotification(t('competitorPriceAnalysis.validation.customerRequired'), 'error');
            return;
        }

        // Updated Validation Logic: 
        // We require Product ID and a valid Competitor Price. 
        // "Our Price" (productPrice) is optional during validation; if invalid, it defaults to 0.
        const validItems = items.filter(item => {
            const compPrice = parseFloat(item.competitorPrice);
            return item.productId && !isNaN(compPrice) && Number.isFinite(compPrice);
        });
        
        if (items.length > 0 && validItems.length === 0) {
             showNotification(t('competitorPriceAnalysis.validation.fieldsRequired'), 'error');
             return;
        }

        setIsSaving(true);
        try {
            const { data: analysisData, error: analysisError } = await supabase
                .from('competitor_price_analysis')
                .insert({ 
                    customer_id: customerId, 
                    store_name: customerSearch, // Required field based on user feedback
                    description, 
                    created_by: profile?.id 
                })
                .select().single();
            if (analysisError) throw analysisError;

            const itemsToInsert = [];
            for (const item of items) {
                const compPrice = parseFloat(item.competitorPrice);
                const ourPrice = parseFloat(item.productPrice);
                const isPriceValid = !isNaN(compPrice) && Number.isFinite(compPrice);

                if (!item.productId || !isPriceValid) continue;

                let photo_url: string | null = null;
                if (item.photoFiles[0]) {
                    const file = item.photoFiles[0];
                    const filePath = `public/${profile?.id}/competitor/${analysisData.id}/${uuidv4()}`;
                    const { error: uploadError } = await supabase.storage.from('competitor_photos').upload(filePath, file);
                    if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
                    photo_url = supabase.storage.from('competitor_photos').getPublicUrl(filePath).data.publicUrl;
                }

                itemsToInsert.push({
                    analysis_id: analysisData.id,
                    product_id: item.productId,
                    competitor_price: compPrice,
                    competitor_product_name: item.competitorProductName,
                    photo_url,
                    created_by: profile?.id,
                    product_price: isNaN(ourPrice) ? 0 : ourPrice, // Defaults to 0 if empty/invalid
                });
            }

            if (itemsToInsert.length > 0) {
                const { error: itemsError } = await supabase.from('competitor_price_analysis_items').insert(itemsToInsert);
                if (itemsError) throw itemsError;
            }

            showNotification(t('notification.competitorPriceAnalysis.saved'), 'success');
            
            // Only reset non-locked fields
            if (!activeVisit) {
                 setCustomerId('');
                 setCustomerSearch('');
            }
            setDescription('');
            setItems([]);
            setSearchTerms({});
        } catch (error: any) {
            showNotification(t('notification.competitorPriceAnalysis.saveError').replace('{error}', error.message), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;
    if (!pagePermissions?.can_view) return <p>{t('error.accessDenied.message')}</p>;

    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <h1 className="text-3xl font-bold">{t('competitorPriceAnalysis.title')}</h1>
                 {pagePermissions.can_create && (
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center justify-center px-6 py-2 bg-primary dark:bg-dark-primary text-white font-semibold rounded-md hover:bg-secondary dark:hover:bg-dark-secondary transition-colors disabled:opacity-50">
                        {isSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                        {isSaving ? t('common.saving') : t('form.save')}
                    </button>
                 )}
            </div>

            <div className="p-6 bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative">
                        <label className="block text-sm font-medium mb-1">{t('reportProblem.customer')}</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                value={customerSearch}
                                onChange={e => { setCustomerSearch(e.target.value); setIsCustomerDropdownOpen(true); if(!e.target.value) setCustomerId(''); }}
                                onFocus={() => !activeVisit && setIsCustomerDropdownOpen(true)}
                                placeholder={t('reportProblem.searchCustomer')}
                                className={`w-full py-2 pl-10 pr-4 bg-transparent border border-border dark:border-dark-border rounded-md ${activeVisit ? 'cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''}`}
                                readOnly={!!activeVisit}
                            />
                        </div>
                        {isCustomerDropdownOpen && filteredCustomers.length > 0 && !activeVisit && (
                            <ul className="absolute z-10 w-full bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                                {filteredCustomers.map(cust => (
                                    <li key={cust.id} onClick={() => handleSelectCustomer(cust)} className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                                        {cust.name} ({cust.customer_code})
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('competitorPriceAnalysis.analysisDate')}</label>
                        <input type="text" readOnly value={new Date(analysisDate).toLocaleString()} className="w-full p-2 bg-gray-100 dark:bg-gray-800 border border-border dark:border-dark-border rounded-md" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">{t('competitorPriceAnalysis.description')}</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md" />
                    </div>
                </div>

                <div className="border-t border-border dark:border-dark-border pt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold">{t('competitorPriceAnalysis.items')}</h3>
                        {pagePermissions.can_create && <button onClick={addItem} className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"><Plus className="h-4 w-4 mr-1"/>{t('competitorPriceAnalysis.addItem')}</button>}
                    </div>
                    <div className="space-y-4">
                        {items.map((item) => (
                            <div key={item.localId} className="p-4 border border-border dark:border-dark-border rounded-lg relative space-y-4 bg-gray-50/50 dark:bg-gray-800/30">
                                {/* Adjusted Grid Layout to be single-line on large screens */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                                    <div className="lg:col-span-3 relative">
                                        <label className="block text-xs font-medium mb-1">{t('competitorPriceAnalysis.product')}</label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input type="text" value={searchTerms[item.localId] || ''} onChange={e => handleProductSearchChange(item.localId, e.target.value)} placeholder={t('competitorPriceAnalysis.searchProduct')} className="w-full p-2 pl-9 bg-transparent border border-border dark:border-dark-border rounded-md text-sm" />
                                        </div>
                                        {activeSearchInput === item.localId && filteredProducts.length > 0 && (
                                            <ul className="absolute z-10 w-full bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                                                {filteredProducts.map(p => (
                                                    <li key={p.id} onClick={() => handleSelectProduct(item.localId, p)} className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm">
                                                        {p.name} ({p.product_code})
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <div className="lg:col-span-2">
                                        <label className="block text-xs font-medium mb-1">{t('competitorPriceAnalysis.productPrice')}</label>
                                        <input type="number" step="0.01" value={item.productPrice} onChange={e => handleItemChange(item.localId, 'productPrice', e.target.value)} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-sm" placeholder="Our Price" />
                                    </div>
                                    <div className="lg:col-span-2">
                                        <label className="block text-xs font-medium mb-1">{t('competitorPriceAnalysis.competitorPrice')}</label>
                                        <input type="number" step="0.01" value={item.competitorPrice} onChange={e => handleItemChange(item.localId, 'competitorPrice', e.target.value)} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-sm" />
                                    </div>
                                    <div className="lg:col-span-3">
                                        <label className="block text-xs font-medium mb-1">{t('competitorPriceAnalysis.competitorProductName')}</label>
                                        <input type="text" value={item.competitorProductName} onChange={e => handleItemChange(item.localId, 'competitorProductName', e.target.value)} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-sm" />
                                    </div>
                                    <div className="lg:col-span-2">
                                        <ImageUpload
                                            files={item.photoFiles}
                                            onChange={(files) => handleItemChange(item.localId, 'photoFiles', files)}
                                            maxFiles={1}
                                            label={t('competitorPriceAnalysis.photo')}
                                            buttonText={t('common.addPhoto')}
                                        />
                                    </div>
                                </div>
                                
                                {pagePermissions.can_create && <button onClick={() => removeItem(item.localId)} className="absolute top-2 right-2 p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><Trash2 className="h-4 w-4"/></button>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompetitorPriceAnalysis;
