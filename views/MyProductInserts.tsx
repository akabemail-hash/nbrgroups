
import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { supabase } from '../services/supabase';
import { ProductInsert, ProductInsertSubmission, ProductInsertItem } from '../types';
import { Loader2, Search, Calendar, DollarSign, CheckCircle, Circle, Save, X, List } from 'lucide-react';
import { ImageUpload } from '../components/ImageUpload';
import { v4 as uuidv4 } from 'uuid';

interface ExtendedInsert extends ProductInsert {
  submission?: ProductInsertSubmission;
  items?: ProductInsertItem[];
}

const InsertSubmissionModal: React.FC<{
    insert: ExtendedInsert;
    onClose: () => void;
    onSave: (description: string, files: File[]) => Promise<void>;
}> = ({ insert, onClose, onSave }) => {
    const { t } = useAppContext();
    const [description, setDescription] = useState('');
    const [photoFiles, setPhotoFiles] = useState<File[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    
    const isSubmitted = !!insert.submission;

    useEffect(() => {
        if (insert.submission) {
            setDescription(insert.submission.description || '');
        }
    }, [insert.submission]);

    const handleSubmit = async () => {
        setIsSaving(true);
        try {
            await onSave(description, photoFiles);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };
    
    const totalPrice = insert.items ? insert.items.reduce((sum, i) => sum + Number(i.price), 0) : insert.insert_price || 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-border dark:border-dark-border">
                    <h2 className="text-xl font-bold">{t('myProductInserts.modalTitle')}</h2>
                    <button onClick={onClose}><X className="h-6 w-6" /></button>
                </div>
                <div className="overflow-y-auto p-6 space-y-6">
                    {/* Read Only Details */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-border dark:border-dark-border space-y-2">
                        <h3 className="font-semibold text-lg text-primary dark:text-dark-primary border-b border-gray-200 dark:border-gray-700 pb-2 mb-2">
                            {t('myProductInserts.details')}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-text-secondary uppercase">{t('productInsert.customer')}</p>
                                <p className="font-medium">{insert.customer?.name}</p>
                            </div>
                            <div>
                                <p className="text-xs text-text-secondary uppercase">{t('visitRequestReport.filters.dateRange')}</p>
                                <p className="text-sm">{insert.start_date} - {insert.end_date}</p>
                            </div>
                        </div>
                        
                        <div className="mt-4">
                            <p className="text-xs text-text-secondary uppercase mb-2">Items to Verify</p>
                            {insert.items && insert.items.length > 0 ? (
                                <div className="bg-white dark:bg-gray-900 rounded border border-border dark:border-dark-border text-sm">
                                    {insert.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between p-2 border-b border-border dark:border-dark-border last:border-0">
                                            <span>{item.product_name}</span>
                                            <span className="font-mono">{Number(item.price).toFixed(2)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between p-2 font-bold bg-gray-50 dark:bg-gray-800">
                                        <span>Total</span>
                                        <span className="text-green-600 dark:text-green-400">{totalPrice.toFixed(2)}</span>
                                    </div>
                                </div>
                            ) : (
                                // Fallback
                                <p className="font-medium">{insert.product_name} - {insert.insert_price?.toFixed(2)}</p>
                            )}
                        </div>

                        {insert.photo_urls && insert.photo_urls.length > 0 && (
                            <div className="mt-4">
                                <p className="text-xs text-text-secondary uppercase mb-1">Reference Photos</p>
                                <div className="flex gap-2 overflow-x-auto">
                                    {insert.photo_urls.map((url, i) => (
                                        <img key={i} src={url} alt="Ref" className="h-16 w-16 object-cover rounded-md border border-border" />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Submission Form */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg text-primary dark:text-dark-primary">
                            {t('myProductInserts.submission')}
                        </h3>
                        
                        {isSubmitted ? (
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                                    <CheckCircle className="h-5 w-5" />
                                    <span className="font-bold">{t('dailyPlan.status.completed')}</span>
                                </div>
                                <p className="text-sm">{insert.submission?.description}</p>
                                {insert.submission?.photo_urls && insert.submission.photo_urls.length > 0 && (
                                     <div className="flex gap-2 mt-3 overflow-x-auto">
                                        {insert.submission.photo_urls.map((url, i) => (
                                            <img key={i} src={url} alt="Proof" className="h-24 w-24 object-cover rounded-md border border-border" />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t('myProductInserts.description')}</label>
                                    <textarea 
                                        rows={3} 
                                        value={description} 
                                        onChange={(e) => setDescription(e.target.value)} 
                                        className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md"
                                    />
                                </div>
                                <div>
                                    <ImageUpload
                                        files={photoFiles}
                                        onChange={setPhotoFiles}
                                        maxFiles={2}
                                        label={t('productInsert.photos')}
                                        buttonText={t('common.addPhoto')}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex justify-end items-center p-4 border-t border-border dark:border-dark-border">
                    <button onClick={onClose} className="px-4 py-2 mr-2 rounded-md border border-border dark:border-dark-border">{t('form.cancel')}</button>
                    {!isSubmitted && (
                        <button onClick={handleSubmit} disabled={isSaving} className="px-4 py-2 text-white bg-primary rounded-md hover:bg-secondary disabled:opacity-50 flex items-center">
                             {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-5 w-5" />}
                            {isSaving ? t('common.saving') : t('form.save')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const MyProductInserts: React.FC = () => {
    const { t, permissions, showNotification, profile, activeVisit, navigateTo } = useAppContext();
    const pagePermissions = permissions['My Product Inserts'];

    const [inserts, setInserts] = useState<ExtendedInsert[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedInsert, setSelectedInsert] = useState<ExtendedInsert | null>(null);

    const fetchInserts = useCallback(async () => {
        if (!pagePermissions?.can_view || !profile) {
            setLoading(false);
            return;
        }

        const role = profile?.role?.name;
        // --- GUARD ---
        if ((role === 'Satış' || role === 'Merch') && !activeVisit) {
            showNotification(t('dailyPlan.validation.startVisitFirst'), 'error');
            navigateTo('/daily-plan');
            return;
        }

        setLoading(true);
        try {
            // Find user's entity ID (Seller or Merch)
            let customerIds: string[] = [];
            
            // If active visit, only show inserts for that customer
            if (activeVisit) {
                customerIds = [activeVisit.customerId];
            } else {
                if (role === 'Satış') {
                    const { data: seller } = await supabase.from('sellers').select('id').eq('user_id', profile.id).single();
                    if (seller) {
                        const { data: rels } = await supabase.from('customer_seller_relationships').select('customer_id').eq('seller_id', seller.id);
                        customerIds = (rels || []).map(r => r.customer_id);
                    }
                } else if (role === 'Merch') {
                     const { data: merch } = await supabase.from('merchs').select('id').eq('user_id', profile.id).single();
                     if (merch) {
                        const { data: rels } = await supabase.from('customer_merch_relationships').select('customer_id').eq('merch_id', merch.id);
                        customerIds = (rels || []).map(r => r.customer_id);
                     }
                }
            }

            if (customerIds.length === 0 && role !== 'Admin') {
                setInserts([]);
                setLoading(false);
                return;
            }

            const today = new Date().toISOString().split('T')[0];
            
            let query = supabase
                .from('product_inserts')
                .select('*, customer:customers(name), submission:product_insert_submissions(*), items:product_insert_items(*)')
                .lte('start_date', today)
                .gte('end_date', today);
            
            if (role !== 'Admin') {
                query = query.in('customer_id', customerIds);
            }

            const { data, error } = await query;
            if (error) throw error;
            
             const processedData = (data as any[]).map(insert => {
                 let userSubmission = null;
                 if (Array.isArray(insert.submission)) {
                     userSubmission = insert.submission.find((s: any) => s.user_id === profile.id);
                 } else if (insert.submission && insert.submission.user_id === profile.id) {
                     userSubmission = insert.submission;
                 }
                 return { ...insert, submission: userSubmission };
             });

            setInserts(processedData);

        } catch (error: any) {
            console.error("Error fetching inserts:", error);
            showNotification(error.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [pagePermissions, profile, activeVisit, showNotification, navigateTo, t]);

    useEffect(() => {
        fetchInserts();
    }, [fetchInserts]);

    const handleSaveSubmission = async (description: string, files: File[]) => {
        if (!selectedInsert) return;

        try {
            let photoUrls: string[] = [];
            if (files.length > 0) {
                 const uploadPromises = files.map(async (file) => {
                    const filePath = `public/${profile?.id}/insert_sub/${uuidv4()}`;
                    const { error: uploadError } = await supabase.storage.from('insert_photos').upload(filePath, file);
                    if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
                    return supabase.storage.from('insert_photos').getPublicUrl(filePath).data.publicUrl;
                });
                photoUrls = await Promise.all(uploadPromises);
            }

            const { error } = await supabase.from('product_insert_submissions').insert({
                insert_id: selectedInsert.id,
                user_id: profile?.id,
                description,
                photo_urls: photoUrls
            });

            if (error) throw error;

            showNotification(t('myProductInserts.saveSuccess'), 'success');
            fetchInserts(); // Refresh list to update status

        } catch (error: any) {
            showNotification(t('myProductInserts.saveError').replace('{error}', error.message), 'error');
            throw error; // Rethrow to modal
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    if (!pagePermissions?.can_view) return <p>{t('error.accessDenied.message')}</p>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">{t('myProductInserts.title')}</h1>
            
            {activeVisit && (
                 <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg mb-4 text-blue-700 dark:text-blue-300">
                    Active Customer: <strong>{activeVisit.customerName}</strong>
                </div>
            )}

            {inserts.length === 0 ? (
                 <div className="text-center p-12 bg-surface dark:bg-dark-surface rounded-lg border border-border dark:border-dark-border">
                    <p className="text-text-secondary">{t('myProductInserts.noInserts')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {inserts.map(insert => {
                         const itemCount = insert.items?.length || 0;
                         const totalPrice = insert.items ? insert.items.reduce((s, i) => s + Number(i.price), 0) : insert.insert_price;
                         
                         return (
                            <div key={insert.id} className="bg-surface dark:bg-dark-surface rounded-xl shadow-md border border-border dark:border-dark-border overflow-hidden">
                                <div className="p-4 border-b border-border dark:border-dark-border bg-gray-50 dark:bg-gray-800">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg">{insert.product_name}</h3>
                                            <p className="text-sm text-text-secondary">{insert.customer?.name}</p>
                                        </div>
                                        {insert.submission ? <CheckCircle className="text-green-500 h-6 w-6" /> : <Circle className="text-gray-300 h-6 w-6" />}
                                    </div>
                                </div>
                                <div className="p-4 space-y-3">
                                    <div className="flex items-center text-sm text-text-secondary gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>{new Date(insert.start_date).toLocaleDateString()} - {new Date(insert.end_date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center font-bold text-primary dark:text-dark-primary gap-2">
                                            <DollarSign className="h-4 w-4" />
                                            <span>{Number(totalPrice).toFixed(2)}</span>
                                        </div>
                                        {itemCount > 0 && (
                                            <div className="flex items-center text-text-secondary gap-1 text-xs">
                                                <List className="h-3 w-3" />
                                                <span>{itemCount} Items</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <button 
                                        onClick={() => setSelectedInsert(insert)}
                                        className={`w-full py-2 rounded-md font-medium transition-colors ${insert.submission 
                                            ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300' 
                                            : 'bg-primary text-white hover:bg-secondary'}`}
                                    >
                                        {insert.submission ? t('myProductInserts.register') : t('myProductInserts.register')}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            {selectedInsert && (
                <InsertSubmissionModal 
                    insert={selectedInsert} 
                    onClose={() => setSelectedInsert(null)} 
                    onSave={handleSaveSubmission}
                />
            )}
        </div>
    );
};

export default MyProductInserts;
