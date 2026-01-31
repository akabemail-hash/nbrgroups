
import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { supabase } from '../services/supabase';
import { Customer, Product } from '../types';
import { ImageUpload } from '../components/ImageUpload';
import { Search, Loader2, Save, Clock, Package } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const ProductShelf: React.FC = () => {
    const { t, profile, permissions, showNotification, activeVisit } = useAppContext();
    const pagePermissions = permissions['Product Shelf'];

    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [customerId, setCustomerId] = useState<string>('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
    
    const [productName, setProductName] = useState('');
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);

    const [currentDateTime, setCurrentDateTime] = useState(new Date().toLocaleString());
    
    // Changed: Separate state for before and after images
    const [beforeFiles, setBeforeFiles] = useState<File[]>([]);
    const [afterFiles, setAfterFiles] = useState<File[]>([]);

    // Search Debounce
    const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const productDebounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Initial Active Visit Check
    useEffect(() => {
        if (activeVisit) {
            setCustomerId(activeVisit.customerId);
            setCustomerSearch(activeVisit.customerName);
        }
    }, [activeVisit]);

    // Update time every minute
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentDateTime(new Date().toLocaleString());
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    // Customer Search
    useEffect(() => {
        if (activeVisit) return; // Skip search if visit locked

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
    }, [customerSearch, activeVisit]);

    // Product Search
    useEffect(() => {
        if (productDebounceTimeout.current) clearTimeout(productDebounceTimeout.current);
        
        productDebounceTimeout.current = setTimeout(async () => {
            let query = supabase.from('products').select('*').limit(10);
            
            if (productName) {
                const lowercased = productName.toLowerCase();
                query = query.or(`name.ilike.%${lowercased}%,product_code.ilike.%${lowercased}%`);
            } else {
                if (!isProductDropdownOpen) return;
            }

            const { data, error } = await query;
            if (error) {
                console.error("Product search error:", error);
            } else {
                setFilteredProducts(data || []);
            }
        }, 300);

        return () => { if (productDebounceTimeout.current) clearTimeout(productDebounceTimeout.current); };
    }, [productName, isProductDropdownOpen]);

    const handleSelectCustomer = (customer: Customer) => {
        setCustomerId(customer.id);
        setCustomerSearch(customer.name);
        setIsCustomerDropdownOpen(false);
    };

    const handleSelectProduct = (product: Product) => {
        setProductName(product.name);
        setIsProductDropdownOpen(false);
    };

    const handleSave = async () => {
        if (!pagePermissions?.can_create) return;
        if (!customerId || !productName) {
            showNotification(t('productDisplay.validation.fieldsRequired'), 'error');
            return;
        }

        setIsSaving(true);
        try {
            const uploadFiles = async (files: File[], prefix: string) => {
                if (files.length === 0) return [];
                const uploadPromises = files.map(async (file) => {
                    const filePath = `public/${profile?.id}/shelf/${prefix}_${uuidv4()}`;
                    const { error: uploadError } = await supabase.storage.from('shelf_photos').upload(filePath, file);
                    if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
                    return supabase.storage.from('shelf_photos').getPublicUrl(filePath).data.publicUrl;
                });
                return Promise.all(uploadPromises);
            };

            const beforeUrls = await uploadFiles(beforeFiles, 'before');
            const afterUrls = await uploadFiles(afterFiles, 'after');

            const { error } = await supabase.from('product_shelves').insert({
                customer_id: customerId,
                product_name: productName,
                shelf_datetime: new Date().toISOString(),
                before_image_urls: beforeUrls,
                after_image_urls: afterUrls,
                created_by: profile?.id
            });

            if (error) throw error;

            showNotification(t('productShelf.saveSuccess'), 'success');
            // Reset form
            if (!activeVisit) {
                setCustomerId('');
                setCustomerSearch('');
            }
            setProductName('');
            setBeforeFiles([]);
            setAfterFiles([]);

        } catch (error: any) {
            showNotification(t('productShelf.saveError').replace('{error}', error.message), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (!pagePermissions?.can_view) return <p>{t('error.accessDenied.message')}</p>;

    return (
        <div className="space-y-6 max-w-3xl mx-auto animate-fade-in-up">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('productShelf.title')}</h1>
                {pagePermissions.can_create && (
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center justify-center px-6 py-2 bg-primary dark:bg-dark-primary text-white font-semibold rounded-md hover:bg-secondary dark:hover:bg-dark-secondary transition-colors disabled:opacity-50 shadow-md">
                        {isSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                        {isSaving ? t('common.saving') : t('form.save')}
                    </button>
                 )}
            </div>

            <div className="p-6 bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border space-y-6">
                <div className="relative">
                    <label className="block text-sm font-medium mb-1">{t('productShelf.customer')}</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={customerSearch}
                            onChange={e => { setCustomerSearch(e.target.value); setIsCustomerDropdownOpen(true); if(!e.target.value) setCustomerId(''); }}
                            onFocus={() => setIsCustomerDropdownOpen(true)}
                            placeholder={t('productShelf.searchCustomer')}
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

                <div>
                    <label className="block text-sm font-medium mb-1">{t('productShelf.shelfDateTime')}</label>
                    <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input 
                            type="text" 
                            value={currentDateTime} 
                            readOnly 
                            className="w-full py-2 pl-10 pr-3 bg-gray-100 dark:bg-gray-800 border border-border dark:border-dark-border rounded-md cursor-not-allowed text-text-secondary text-sm" 
                        />
                    </div>
                </div>

                {/* Product Name Autocomplete */}
                <div className="relative">
                    <label className="block text-sm font-medium mb-1">{t('productShelf.productName')}</label>
                    <div className="relative">
                        <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input 
                            type="text" 
                            value={productName} 
                            onChange={e => { setProductName(e.target.value); setIsProductDropdownOpen(true); }}
                            onFocus={() => setIsProductDropdownOpen(true)}
                            placeholder={t('productInsert.searchProductPlaceholder')}
                            className="w-full py-2 pl-10 pr-4 bg-transparent border border-border dark:border-dark-border rounded-md text-sm" 
                        />
                    </div>
                    {isProductDropdownOpen && filteredProducts.length > 0 && (
                        <ul className="absolute z-10 w-full bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                            {filteredProducts.map(prod => (
                                <li key={prod.id} onClick={() => handleSelectProduct(prod)} className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm">
                                    {prod.name} ({prod.product_code})
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <ImageUpload
                            files={beforeFiles}
                            onChange={setBeforeFiles}
                            maxFiles={3}
                            label={t('productShelf.previousImage')}
                            buttonText={t('common.addPhoto')}
                        />
                    </div>
                    <div>
                        <ImageUpload
                            files={afterFiles}
                            onChange={setAfterFiles}
                            maxFiles={3}
                            label={t('productShelf.nextImage')}
                            buttonText={t('common.addPhoto')}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductShelf;
