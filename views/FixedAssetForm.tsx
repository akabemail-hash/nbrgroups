
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { supabase } from '../services/supabase';
import { ImageUpload } from '../components/ImageUpload';
import { Save, Loader2, MapPin, CheckCircle, Package } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface AssetToVerify {
    itemId: string;
    brandName: string;
    deliveryDate: string;
    originalImages: string[];
}

const FixedAssetForm: React.FC = () => {
    const { t, profile, permissions, showNotification, activeVisit, navigateTo } = useAppContext();
    const pagePermissions = permissions['Fixed Asset Form'];

    const [existingAssets, setExistingAssets] = useState<AssetToVerify[]>([]);
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Verification Form State
    const [description, setDescription] = useState('');
    const [photoFiles, setPhotoFiles] = useState<File[]>([]);

    useEffect(() => {
        const role = profile?.role?.name;
        if (!pagePermissions?.can_view) return;
        
        if ((role === 'Satış' || role === 'Merch') && !activeVisit) {
            showNotification(t('dailyPlan.validation.startVisitFirst'), 'error');
            navigateTo('/daily-plan');
            return;
        }

        const fetchExistingAssets = async () => {
            if (!activeVisit) return;
            setLoading(true);
            try {
                // Step 1: Fetch deliveries for this customer first
                const { data: deliveries, error: deliveryError } = await supabase
                    .from('fixed_asset_deliveries')
                    .select('id, delivery_date')
                    .eq('customer_id', activeVisit.customerId);

                if (deliveryError) throw deliveryError;

                if (!deliveries || deliveries.length === 0) {
                    setExistingAssets([]);
                    return;
                }

                const deliveryIds = deliveries.map(d => d.id);
                const deliveryDateMap = new Map(deliveries.map(d => [d.id, d.delivery_date]));

                // Step 2: Fetch items belonging to these deliveries
                const { data: items, error: itemsError } = await supabase
                    .from('fixed_asset_delivery_items')
                    .select('id, delivery_id, image_urls, brand:fixed_asset_brands(name)')
                    .in('delivery_id', deliveryIds);

                if (itemsError) throw itemsError;
                
                const assets: AssetToVerify[] = (items || []).map((item: any) => ({
                    itemId: item.id,
                    brandName: item.brand?.name || t('fixedAssetForm.unknownBrand'),
                    deliveryDate: deliveryDateMap.get(item.delivery_id) || new Date().toISOString(),
                    originalImages: item.image_urls || []
                }));
                
                setExistingAssets(assets);

            } catch (error: any) {
                console.error("Asset fetch error:", error);
                showNotification(t('common.unknownError'), 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchExistingAssets();
    }, [pagePermissions, activeVisit, profile, t, navigateTo, showNotification]);

    const handleSave = async () => {
        if (!pagePermissions?.can_create || !activeVisit) return;
        if (!selectedAssetId) {
            showNotification(t('fixedAssetForm.validation.selectAsset'), "error");
            return;
        }

        setIsSaving(true);
        try {
            let imageUrls: string[] = [];
            if (photoFiles.length > 0) {
                const uploadPromises = photoFiles.map(async (file) => {
                    const filePath = `public/${profile?.id}/fixed_assets_check/${selectedAssetId}/${uuidv4()}`;
                    const { error: uploadError } = await supabase.storage.from('fixed_asset_photos').upload(filePath, file);
                    if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
                    return supabase.storage.from('fixed_asset_photos').getPublicUrl(filePath).data.publicUrl;
                });
                imageUrls = await Promise.all(uploadPromises);
            }

            const { error } = await supabase.from('fixed_asset_checks').insert({
                customer_id: activeVisit.customerId,
                fixed_asset_item_id: selectedAssetId,
                check_date: new Date().toISOString(),
                description: description,
                photo_urls: imageUrls,
                created_by: profile?.id
            });

            if (error) throw error;

            showNotification(t('fixedAssetForm.saveSuccess'), 'success');
            
            // Reset form
            setDescription('');
            setPhotoFiles([]);
            setSelectedAssetId(null);

        } catch (error: any) {
            showNotification(`${t('common.unknownError')}: ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;
    if (!pagePermissions?.can_view) return <p>{t('error.accessDenied.message')}</p>;

    return (
        <div className="space-y-6 max-w-3xl mx-auto animate-fade-in-up">
            <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('fixedAssetForm.title')}</h1>

            {activeVisit && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 flex items-center gap-3 text-blue-800 dark:text-blue-200">
                    <MapPin className="h-5 w-5" />
                    <div>
                        <span className="text-xs uppercase font-bold text-blue-600 dark:text-blue-300 block">{t('fixedAssetForm.customer')}</span>
                        <span className="font-bold text-lg">{activeVisit.customerName}</span>
                    </div>
                </div>
            )}

            {!activeVisit && (
                 <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 text-sm">
                     {t('dailyPlan.validation.startVisitFirst')}
                </div>
            )}

            {existingAssets.length === 0 ? (
                <div className="p-8 text-center bg-surface dark:bg-dark-surface rounded-lg border border-dashed border-border dark:border-dark-border">
                    <Package className="h-12 w-12 mx-auto text-text-secondary mb-3 opacity-30" />
                    <p className="text-text-secondary">No fixed assets found on record for this customer.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* List of Assets */}
                    <div className={`space-y-3 ${selectedAssetId ? 'hidden md:block' : ''}`}>
                         <h2 className="font-semibold text-lg mb-2">{t('fixedAssetForm.selectAsset')}</h2>
                         {existingAssets.map(asset => (
                             <div 
                                key={asset.itemId} 
                                onClick={() => setSelectedAssetId(asset.itemId)}
                                className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedAssetId === asset.itemId ? 'bg-primary text-white border-primary shadow-lg transform scale-[1.02]' : 'bg-surface dark:bg-dark-surface border-border dark:border-dark-border hover:border-primary'}`}
                            >
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold">{asset.brandName}</h3>
                                    {selectedAssetId === asset.itemId && <CheckCircle className="h-5 w-5 text-white" />}
                                </div>
                                <p className={`text-sm mt-1 ${selectedAssetId === asset.itemId ? 'text-blue-100' : 'text-text-secondary'}`}>
                                    {t('fixedAssetForm.delivered')}: {new Date(asset.deliveryDate).toLocaleDateString()}
                                </p>
                             </div>
                         ))}
                    </div>

                    {/* Verification Form (only visible if selected) */}
                    {selectedAssetId && (
                        <div className="bg-surface dark:bg-dark-surface p-6 rounded-lg shadow-lg border border-border dark:border-dark-border animate-fade-in-up">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">{t('fixedAssetForm.verifyAsset')}</h3>
                                <button onClick={() => setSelectedAssetId(null)} className="md:hidden text-sm text-text-secondary underline">{t('form.cancel')}</button>
                            </div>
                            
                            {(() => {
                                const asset = existingAssets.find(a => a.itemId === selectedAssetId);
                                if (!asset) return null;
                                return (
                                    <div className="space-y-6">
                                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-border dark:border-dark-border">
                                            <p className="text-sm font-semibold">{asset.brandName}</p>
                                            {asset.originalImages.length > 0 && (
                                                <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
                                                    {asset.originalImages.map((url, idx) => (
                                                        <img key={idx} src={url} alt="Original" className="h-16 w-16 object-cover rounded-md border border-border" />
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">{t('fixedAssetForm.description')}</label>
                                            <textarea 
                                                rows={3} 
                                                value={description} 
                                                onChange={(e) => setDescription(e.target.value)} 
                                                className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md"
                                                placeholder="Condition check, notes..."
                                            />
                                        </div>

                                        <div>
                                            <ImageUpload
                                                files={photoFiles}
                                                onChange={setPhotoFiles}
                                                maxFiles={3}
                                                label={t('fixedAssetForm.photos')}
                                                buttonText={t('common.addPhoto')}
                                            />
                                        </div>

                                        <button 
                                            onClick={handleSave} 
                                            disabled={isSaving}
                                            className="w-full py-3 bg-primary dark:bg-dark-primary text-white font-bold rounded-md hover:bg-secondary dark:hover:bg-dark-secondary transition-all shadow-md disabled:opacity-50 flex justify-center items-center gap-2"
                                        >
                                            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                                            {isSaving ? t('common.saving') : t('form.save')}
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FixedAssetForm;
