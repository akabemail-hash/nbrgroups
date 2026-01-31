
import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { supabase } from '../services/supabase';
import { Customer, Product } from '../types';
import { ImageUpload } from '../components/ImageUpload';
import { Search, Loader2, Save, Calendar, Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface InsertItemState {
    localId: string;
    productName: string;
    price: string;
    productId?: string; // Optional: To track if selected from DB
}

const ProductInsert: React.FC = () => {
    const { t, profile, permissions, showNotification } = useAppContext();
    const pagePermissions = permissions['Product Insert'];

    const [isSaving, setIsSaving] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(false);

    // Form State
    const [customerId, setCustomerId] = useState<string>('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
    
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [photoFiles, setPhotoFiles] = useState<File[]>([]);
    
    // Items State
    const [items, setItems] = useState<InsertItemState[]>([]);
    
    // Product Search State (Shared for all items, but filtered dynamically)
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [activeSearchId, setActiveSearchId] = useState<string | null>(null);

    // Search Debounce for Customer
    const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!pagePermissions?.can_view) return;
        
        // Load all products for client-side filtering (better UX for dropdowns)
        const fetchProducts = async () => {
            setLoadingProducts(true);
            const { data } = await supabase.from('products').select('id, name, price, product_code').order('name');
            setAllProducts((data as Product[]) || []);
            setLoadingProducts(false);
        };
        fetchProducts();
    }, [pagePermissions]);

    useEffect(() => {
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        if (customerSearch) {
            debounceTimeout.current = setTimeout(async () => {
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
        return () => { if (debounceTimeout.current) clearTimeout(debounceTimeout.current); };
    }, [customerSearch]);

    const handleSelectCustomer = (customer: Customer) => {
        setCustomerId(customer.id);
        setCustomerSearch(customer.name);
        setIsCustomerDropdownOpen(false);
    };

    // Item Management
    const addItem = () => {
        setItems([...items, { localId: uuidv4(), productName: '', price: '' }]);
    };

    const removeItem = (localId: string) => {
        setItems(items.filter(i => i.localId !== localId));
    };

    const handleItemChange = (localId: string, field: keyof InsertItemState, value: string) => {
        setItems(items.map(item => {
            if (item.localId === localId) {
                // If user types in productName, clear the productId because it's now potentially custom or needs re-matching
                if (field === 'productName') {
                    return { ...item, productName: value, productId: undefined };
                }
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    // Product Autocomplete Logic
    const handleProductSearchFocus = (localId: string) => {
        setActiveSearchId(localId);
        // Show all initially or filter based on current text
        const currentName = items.find(i => i.localId === localId)?.productName || '';
        filterProducts(currentName);
    };

    const handleProductSearchChange = (localId: string, value: string) => {
        handleItemChange(localId, 'productName', value);
        setActiveSearchId(localId);
        filterProducts(value);
    };

    const filterProducts = (searchTerm: string) => {
        if (!searchTerm) {
            setFilteredProducts(allProducts.slice(0, 50)); // Show first 50 if empty
            return;
        }
        const lower = searchTerm.toLowerCase();
        const filtered = allProducts.filter(p => 
            p.name.toLowerCase().includes(lower) || 
            p.product_code.toLowerCase().includes(lower)
        ).slice(0, 20);
        setFilteredProducts(filtered);
    };

    const handleSelectProduct = (localId: string, product: Product) => {
        setItems(items.map(item => item.localId === localId ? { 
            ...item, 
            productName: product.name, 
            price: product.price.toString(),
            productId: product.id 
        } : item));
        setActiveSearchId(null); // Close dropdown
    };

    // Close product dropdown on click outside logic is simplified by handling focus/blur or specific selection
    // Here we rely on conditional rendering based on activeSearchId

    const handleSave = async () => {
        if (!pagePermissions?.can_create) return;
        
        if (!customerId || !startDate || !endDate) {
            showNotification(t('productInsert.validation.fieldsRequired'), 'error');
            return;
        }
        
        if (items.length === 0) {
            showNotification(t('productInsert.validation.atLeastOne'), 'error');
            return;
        }

        // Validate items
        for (const item of items) {
            if (!item.productName.trim() || !item.price) {
                showNotification(t('productInsert.validation.itemFields'), 'error');
                return;
            }
        }

        if (new Date(startDate) > new Date(endDate)) {
            showNotification(t('productDisplay.validation.dateError'), 'error');
            return;
        }

        setIsSaving(true);
        try {
            let photoUrls: string[] = [];
            if (photoFiles.length > 0) {
                const uploadPromises = photoFiles.map(async (file) => {
                    const filePath = `public/${profile?.id}/insert/${uuidv4()}`;
                    const { error: uploadError } = await supabase.storage.from('insert_photos').upload(filePath, file);
                    if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
                    return supabase.storage.from('insert_photos').getPublicUrl(filePath).data.publicUrl;
                });
                photoUrls = await Promise.all(uploadPromises);
            }

            // 1. Insert Parent
            const { data: insertData, error: insertError } = await supabase.from('product_inserts').insert({
                customer_id: customerId,
                start_date: startDate,
                end_date: endDate,
                photo_urls: photoUrls,
                created_by: profile?.id,
                // Legacy fields (nullable in new schema or ignored)
                product_name: "Multi-Item Insert", 
                insert_price: items.reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0)
            }).select().single();

            if (insertError) throw insertError;

            // 2. Insert Items
            const itemsPayload = items.map(item => ({
                insert_id: insertData.id,
                product_name: item.productName,
                price: parseFloat(item.price) || 0
            }));

            const { error: itemsError } = await supabase.from('product_insert_items').insert(itemsPayload);
            if (itemsError) throw itemsError;

            showNotification(t('productInsert.saveSuccess'), 'success');
            
            // Reset form
            setCustomerId('');
            setCustomerSearch('');
            setStartDate('');
            setEndDate('');
            setPhotoFiles([]);
            setItems([]);

        } catch (error: any) {
            console.error(error);
            showNotification(t('productInsert.saveError').replace('{error}', error.message), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (!pagePermissions?.can_view) return <p>{t('error.accessDenied.message')}</p>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto animate-fade-in-up">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('productInsert.title')}</h1>
                {pagePermissions.can_create && (
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center justify-center px-6 py-2 bg-primary dark:bg-dark-primary text-white font-semibold rounded-md hover:bg-secondary dark:hover:bg-dark-secondary transition-colors disabled:opacity-50 shadow-md">
                        {isSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                        {isSaving ? t('common.saving') : t('form.save')}
                    </button>
                 )}
            </div>

            <div className="p-6 bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border space-y-6">
                <div className="relative">
                    <label className="block text-sm font-medium mb-1">{t('productInsert.customer')}</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={customerSearch}
                            onChange={e => { setCustomerSearch(e.target.value); setIsCustomerDropdownOpen(true); if(!e.target.value) setCustomerId(''); }}
                            onFocus={() => setIsCustomerDropdownOpen(true)}
                            placeholder={t('productInsert.searchCustomer')}
                            className="w-full py-2 pl-10 pr-4 bg-transparent border border-border dark:border-dark-border rounded-md"
                        />
                    </div>
                    {isCustomerDropdownOpen && filteredCustomers.length > 0 && (
                        <ul className="absolute z-10 w-full bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                            {filteredCustomers.map(cust => (
                                <li key={cust.id} onClick={() => handleSelectCustomer(cust)} className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm">
                                    {cust.name} ({cust.customer_code})
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('productInsert.startDate')}</label>
                        <div className="relative">
                             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                             <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full py-2 pl-10 pr-3 bg-transparent border border-border dark:border-dark-border rounded-md text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('productInsert.endDate')}</label>
                         <div className="relative">
                             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                             <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full py-2 pl-10 pr-3 bg-transparent border border-border dark:border-dark-border rounded-md text-sm" />
                        </div>
                    </div>
                </div>

                {/* Items Section */}
                <div className="border-t border-border dark:border-dark-border pt-4">
                    <div className="flex justify-between items-center mb-4">
                         <h3 className="font-semibold text-lg">{t('productInsert.productsTitle')}</h3>
                         <button onClick={addItem} className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"><Plus className="h-4 w-4 mr-1"/> {t('productInsert.addItem')}</button>
                    </div>

                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={item.localId} className="flex flex-col md:flex-row gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-border dark:border-dark-border relative">
                                <div className="flex-1 relative">
                                     <label className="block text-xs font-medium text-text-secondary mb-1">{t('productInsert.itemProductName')} {item.productId ? t('productInsert.itemSelected') : t('productInsert.itemManual')}</label>
                                     <input 
                                        type="text" 
                                        value={item.productName} 
                                        onChange={e => handleProductSearchChange(item.localId, e.target.value)}
                                        onFocus={() => handleProductSearchFocus(item.localId)}
                                        className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-sm"
                                        placeholder={t('productInsert.searchProductPlaceholder')}
                                     />
                                     {activeSearchId === item.localId && (
                                         <ul className="absolute z-20 w-full bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md mt-1 max-h-48 overflow-y-auto shadow-xl">
                                             {loadingProducts && <li className="px-4 py-2 text-xs text-text-secondary">{t('productInsert.loading')}</li>}
                                             {!loadingProducts && filteredProducts.length === 0 && item.productName.length > 0 && (
                                                 <li className="px-4 py-2 text-xs text-text-secondary italic">{t('productInsert.noMatchManual')}</li>
                                             )}
                                             {filteredProducts.map(p => (
                                                 <li key={p.id} onMouseDown={() => handleSelectProduct(item.localId, p)} className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm">
                                                     {p.name}
                                                 </li>
                                             ))}
                                         </ul>
                                     )}
                                </div>
                                <div className="w-full md:w-32">
                                     <label className="block text-xs font-medium text-text-secondary mb-1">{t('productInsert.price')}</label>
                                     <input 
                                        type="number" 
                                        step="0.01" 
                                        value={item.price} 
                                        onChange={e => handleItemChange(item.localId, 'price', e.target.value)} 
                                        className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-sm"
                                        placeholder="0.00"
                                     />
                                </div>
                                <div className="flex items-end">
                                     <button onClick={() => removeItem(item.localId)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors" title={t('productInsert.removeItem')}>
                                         <Trash2 className="h-5 w-5" />
                                     </button>
                                </div>
                            </div>
                        ))}
                        {items.length === 0 && <p className="text-sm text-text-secondary italic text-center py-4">{t('productInsert.noItems')}</p>}
                    </div>
                </div>

                <div className="border-t border-border dark:border-dark-border pt-4">
                    <ImageUpload
                        files={photoFiles}
                        onChange={setPhotoFiles}
                        maxFiles={2}
                        label={t('productInsert.photos')}
                        buttonText={t('common.addPhoto')}
                    />
                </div>
            </div>
        </div>
    );
};

export default ProductInsert;
