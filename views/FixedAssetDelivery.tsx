import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { supabase } from '../services/supabase';
import { Customer, FixedAssetBrand, FixedAssetDelivery, FixedAssetDeliveryItem } from '../types';
import { ImageUpload } from '../components/ImageUpload';
import { Plus, Trash2, MapPin, Search, Loader2, Save } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface DeliveryItemState extends Partial<FixedAssetDeliveryItem> {
  localId: string;
  photoFiles: File[];
}

const FixedAssetDeliveryPage: React.FC = () => {
    const { t, profile, permissions, showNotification } = useAppContext();
    const pagePermissions = permissions['Fixed Asset Delivery'];

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [brands, setBrands] = useState<FixedAssetBrand[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [customerId, setCustomerId] = useState<string>('');
    const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString());
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [locationStatus, setLocationStatus] = useState<string>('');
    const [description, setDescription] = useState('');
    const [items, setItems] = useState<DeliveryItemState[]>([]);

    // Customer search state
    const [customerSearch, setCustomerSearch] = useState('');
    const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        setLocationStatus(t('fixedAssetDelivery.gettingLocation'));
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLatitude(position.coords.latitude);
                setLongitude(position.coords.longitude);
                setLocationStatus('');
            },
            (error) => {
                console.error("Geolocation error:", error);
                setLocationStatus(t('visitRequests.gpsUnavailable'));
            },
            { enableHighAccuracy: true }
        );

        try {
            const customersPromise = supabase.from('customers').select('*').order('name');
            const brandsPromise = supabase.from('fixed_asset_brands').select('*').order('name');
            const [{ data: customersData, error: customersError }, { data: brandsData, error: brandsError }] = await Promise.all([customersPromise, brandsPromise]);
            if (customersError) throw customersError;
            if (brandsError) throw brandsError;
            setCustomers(customersData || []);
            setBrands(brandsData || []);
        } catch (error: any) {
            showNotification(`${t('error.noProfile.message')} : ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [t, showNotification]);

    useEffect(() => {
        if (pagePermissions?.can_view) {
            fetchInitialData();
        } else {
            setLoading(false);
        }
    }, [pagePermissions, fetchInitialData]);

    useEffect(() => {
        if (customerSearch) {
            const lowercased = customerSearch.toLowerCase();
            setFilteredCustomers(customers.filter(c => c.name.toLowerCase().includes(lowercased) || c.customer_code.toLowerCase().includes(lowercased)).slice(0, 10));
        } else {
            setFilteredCustomers([]);
        }
    }, [customerSearch, customers]);

    const handleSelectCustomer = (customer: Customer) => {
        setCustomerId(customer.id);
        setCustomerSearch(customer.name);
        setIsCustomerDropdownOpen(false);
    };

    const addItem = () => {
        setItems([...items, { localId: uuidv4(), quantity: 1, price: 0, photoFiles: [] }]);
    };

    const removeItem = (localId: string) => {
        setItems(items.filter(item => item.localId !== localId));
    };

    const handleItemChange = (localId: string, field: keyof DeliveryItemState, value: any) => {
        setItems(items.map(item => item.localId === localId ? { ...item, [field]: value } : item));
    };

    const handleSave = async () => {
        if (!pagePermissions?.can_create) return;
        if (!customerId) {
            showNotification(t('fixedAssetDelivery.noCustomerSelected'), 'error');
            return;
        }
        setIsSaving(true);
        try {
            const { data: deliveryData, error: deliveryError } = await supabase
                .from('fixed_asset_deliveries')
                .insert({
                    customer_id: customerId,
                    delivery_date: deliveryDate,
                    gps_latitude: latitude,
                    gps_longitude: longitude,
                    description: description,
                    created_by: profile?.id
                })
                .select()
                .single();
            if (deliveryError) throw deliveryError;

            const itemsToInsert: Omit<FixedAssetDeliveryItem, 'id' | 'created_at'>[] = [];
            for (const item of items) {
                if (!item.fixed_asset_brand_id || (item.quantity && item.quantity <= 0)) continue;

                let imageUrls: string[] = [];
                if (item.photoFiles.length > 0) {
                    const uploadPromises = item.photoFiles.map(async (file) => {
                        const filePath = `public/${profile?.id}/fixed_assets/${deliveryData.id}/${uuidv4()}`;
                        const { error: uploadError } = await supabase.storage.from('fixed_asset_photos').upload(filePath, file);
                        if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
                        return supabase.storage.from('fixed_asset_photos').getPublicUrl(filePath).data.publicUrl;
                    });
                    imageUrls = await Promise.all(uploadPromises);
                }
                
                itemsToInsert.push({
                    delivery_id: deliveryData.id,
                    fixed_asset_brand_id: item.fixed_asset_brand_id!,
                    quantity: item.quantity || 1,
                    price: item.price || 0,
                    image_urls: imageUrls,
                    created_by: profile?.id
                });
            }

            if (itemsToInsert.length > 0) {
                const { error: itemsError } = await supabase.from('fixed_asset_delivery_items').insert(itemsToInsert);
                if (itemsError) throw itemsError;
            }
            
            showNotification(t('notification.fixedAssetDelivery.saved'), 'success');
            setCustomerId('');
            setCustomerSearch('');
            setDescription('');
            setItems([]);
            fetchInitialData();

        } catch (error: any) {
            showNotification(t('notification.fixedAssetDelivery.saveError').replace('{error}', error.message), 'error');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };
    
    if (loading) return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;
    if (!pagePermissions?.can_view) return <p>{t('error.accessDenied.message')}</p>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto animate-fade-in-up">
            <h1 className="text-3xl font-bold">{t('fixedAssetDelivery.title')}</h1>

            <div className="p-6 bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative">
                        <label className="block text-sm font-medium mb-1">{t('fixedAssetDelivery.customer')}</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text" value={customerSearch}
                                onChange={e => { setCustomerSearch(e.target.value); setIsCustomerDropdownOpen(true); if(!e.target.value) setCustomerId(''); }}
                                onFocus={() => setIsCustomerDropdownOpen(true)}
                                placeholder={t('visitRequests.selectCustomer')}
                                className="w-full py-2 pl-10 pr-4 bg-transparent border border-border dark:border-dark-border rounded-md"
                            />
                        </div>
                        {isCustomerDropdownOpen && filteredCustomers.length > 0 && (
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
                        <label className="block text-sm font-medium mb-1">{t('fixedAssetDelivery.deliveryDate')}</label>
                        <input type="text" readOnly value={new Date(deliveryDate).toLocaleString()} className="w-full p-2 bg-gray-100 dark:bg-gray-800 border border-border dark:border-dark-border rounded-md text-text-secondary" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('fixedAssetDelivery.gpsCoordinates')}</label>
                        <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 border border-border dark:border-dark-border rounded-md">
                            <MapPin className="h-5 w-5 text-gray-400" />
                            {locationStatus ? <span className="text-sm text-gray-500">{locationStatus}</span> : <span className="text-sm">{latitude?.toFixed(5)}, {longitude?.toFixed(5)}</span>}
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">{t('fixedAssetDelivery.description')}</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md" />
                    </div>
                </div>

                <div className="border-t border-border dark:border-dark-border pt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold">{t('fixedAssetDelivery.items')}</h3>
                        {pagePermissions.can_create && <button onClick={addItem} className="flex items-center px-3 py-1.5 bg-accent text-white rounded-md hover:opacity-90 text-sm shadow-sm transition-all"><Plus className="h-4 w-4 mr-1"/>{t('fixedAssetDelivery.addItem')}</button>}
                    </div>
                    <div className="space-y-4">
                        {items.map((item) => (
                            <div key={item.localId} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border border-border dark:border-dark-border rounded-lg relative bg-gray-50/50 dark:bg-gray-800/30">
                                <div className="md:col-span-3">
                                    <label className="block text-xs font-medium mb-1 uppercase tracking-wider text-text-secondary">{t('fixedAssetDelivery.brand')}</label>
                                    <select value={item.fixed_asset_brand_id || ''} onChange={e => handleItemChange(item.localId, 'fixed_asset_brand_id', e.target.value)} className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-sm">
                                        <option value="">{t('common.none')}</option>
                                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-medium mb-1 uppercase tracking-wider text-text-secondary">{t('fixedAssetDelivery.quantity')}</label>
                                    <input type="number" value={item.quantity || ''} onChange={e => handleItemChange(item.localId, 'quantity', parseInt(e.target.value))} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-sm" />
                                </div>
                                <div className="md:col-span-2">
                                     <label className="block text-xs font-medium mb-1 uppercase tracking-wider text-text-secondary">{t('fixedAssetDelivery.price')}</label>
                                     <input type="number" step="0.01" value={item.price || ''} onChange={e => handleItemChange(item.localId, 'price', parseFloat(e.target.value))} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-sm" />
                                </div>
                                <div className="md:col-span-5">
                                    <ImageUpload
                                        files={item.photoFiles}
                                        onChange={(files) => handleItemChange(item.localId, 'photoFiles', files)}
                                        maxFiles={3}
                                        label={t('fixedAssetDelivery.photo')}
                                        buttonText={t('common.addPhoto')}
                                    />
                                </div>
                                {pagePermissions.can_create && <button onClick={() => removeItem(item.localId)} className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"><Trash2 className="h-4 w-4"/></button>}
                            </div>
                        ))}
                    </div>
                </div>

                 {pagePermissions.can_create && (
                    <div className="flex justify-end pt-4">
                        <button onClick={handleSave} disabled={isSaving} className="flex items-center justify-center px-6 py-2 bg-primary dark:bg-dark-primary text-white font-semibold rounded-md hover:bg-secondary dark:hover:bg-dark-secondary transition-all shadow-md disabled:opacity-50">
                            {isSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                            {isSaving ? t('common.saving') : t('form.save')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FixedAssetDeliveryPage;
