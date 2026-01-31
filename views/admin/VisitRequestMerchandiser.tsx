
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { VisitRequest, Customer, Merch, VisitType } from '../../types';
import { Plus, Edit, Trash2, X, AlertTriangle, Search, MapPin, Upload, Image as ImageIcon, Loader2, Star, Eye } from 'lucide-react';
import { ImageUpload } from '../../components/ImageUpload';

const StarRating: React.FC<{
    rating: number | null | undefined;
    onSetRating: (rating: number) => void;
    disabled?: boolean;
}> = ({ rating, onSetRating, disabled = false }) => {
    const [hoverRating, setHoverRating] = useState(0);
    const currentRating = rating || 0;

    return (
        <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    className={`h-5 w-5 ${!disabled ? 'cursor-pointer' : 'cursor-default'} ${
                        (hoverRating || currentRating) >= star 
                        ? 'text-yellow-400 fill-yellow-400' 
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                    onMouseEnter={() => !disabled && setHoverRating(star)}
                    onMouseLeave={() => !disabled && setHoverRating(0)}
                    onClick={() => {
                        if (!disabled) {
                            const newRating = star === currentRating ? 0 : star;
                            onSetRating(newRating);
                        }
                    }}
                />
            ))}
        </div>
    );
};

const VisitRequestMerchModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (request: Partial<VisitRequest>, photoFile?: File) => Promise<void>;
    request: Partial<VisitRequest> | null;
    merchs: Merch[];
    visitTypes: VisitType[];
}> = ({ isOpen, onClose, onSave, request, merchs, visitTypes }) => {
    const { t } = useAppContext();
    const [formData, setFormData] = useState<Partial<VisitRequest>>({});
    const [photoFiles, setPhotoFiles] = useState<File[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const [customerSearch, setCustomerSearch] = useState('');
    const [customerOptions, setCustomerOptions] = useState<Customer[]>([]);
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    // Fix: Use ReturnType<typeof setTimeout> for browser compatibility instead of NodeJS.Timeout.
    const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch initial customer name if editing
    useEffect(() => {
        const initialFormData = request || { status: 'Pending' };
        setFormData(initialFormData);
        setSaveError(null);
        setPhotoFiles([]);

        if (initialFormData.customer_id) {
            supabase.from('customers').select('id, name, gps_latitude, gps_longitude').eq('id', initialFormData.customer_id).single().then(({ data }) => {
                if(data) {
                    setSelectedCustomer(data as unknown as Customer);
                    setCustomerSearch(data.name);
                }
            });
        } else {
            setCustomerSearch('');
            setSelectedCustomer(null);
        }
        
    }, [request]);
    
    // Debounced search effect
    useEffect(() => {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
        if (!customerSearch || selectedCustomer?.name === customerSearch) {
            setCustomerOptions([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        debounceTimeout.current = setTimeout(async () => {
            const { data, error } = await supabase
                .from('customers')
                .select('id, name, customer_code, gps_latitude, gps_longitude')
                .or(`name.ilike.%${customerSearch}%,customer_code.ilike.%${customerSearch}%`)
                .limit(10);
            
            if (error) {
                console.error("Customer search error:", error);
            } else {
                setCustomerOptions((data as unknown as Customer[]) || []);
            }
            setIsSearching(false);
        }, 300);

        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };

    }, [customerSearch, selectedCustomer]);


    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSelectCustomer = (customer: Customer) => {
        setFormData(prev => ({ ...prev, customer_id: customer.id }));
        setSelectedCustomer(customer);
        setCustomerSearch(customer.name);
        setIsCustomerDropdownOpen(false);
        setCustomerOptions([]);
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.customer_id) {
            setSaveError("Please select a customer.");
            return;
        }
        setIsSaving(true);
        setSaveError(null);
        try {
            await onSave(formData, photoFiles[0]);
        } catch (error: any) {
            setSaveError(error.message || 'An unexpected error occurred.');
        } finally {
            setIsSaving(false);
        }
    };
    

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-border dark:border-dark-border">
                    <h2 className="text-xl font-bold">{request?.id ? t('visitRequestMerch.editRequest') : t('visitRequestMerch.addRequest')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X className="h-6 w-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="overflow-y-auto">
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        {saveError && <div className="md:col-span-2 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md text-sm">{saveError}</div>}
                        
                        <div className="md:col-span-2 relative">
                            <label className="block text-sm font-medium mb-1">{t('visitRequests.customer')}</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                 {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 animate-spin" />}
                                <input 
                                    type="text"
                                    value={customerSearch}
                                    onChange={e => { setCustomerSearch(e.target.value); setIsCustomerDropdownOpen(true); }}
                                    onFocus={() => setIsCustomerDropdownOpen(true)}
                                    placeholder={t('visitRequests.selectCustomer')}
                                    className="w-full py-2 pl-10 pr-4 bg-transparent border border-border dark:border-dark-border rounded-md"
                                />
                            </div>
                            {isCustomerDropdownOpen && customerOptions.length > 0 && (
                                <ul className="absolute z-10 w-full bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                                    {customerOptions.map(cust => (
                                        <li key={cust.id} onClick={() => handleSelectCustomer(cust)} className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                                            {cust.name} ({cust.customer_code})
                                        </li>
                                    ))}
                                </ul>
                            )}
                             <div className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {selectedCustomer ? `${selectedCustomer.gps_latitude || 'N/A'}, ${selectedCustomer.gps_longitude || 'N/A'}` : t('visitRequests.noCustomerSelected')}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">{t('visitRequestMerch.merchandiser')}</label>
                            <select name="merch_id" value={formData.merch_id || ''} onChange={handleChange} required className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md">
                                <option value="" disabled>{t('visitRequestMerch.selectMerchandiser')}</option>
                                {merchs.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('visitRequests.visitType')}</label>
                            <select name="visit_type_id" value={formData.visit_type_id || ''} onChange={handleChange} required className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md">
                                <option value="" disabled>{t('visitRequests.selectVisitType')}</option>
                                {visitTypes.map(vt => <option key={vt.id} value={vt.id}>{vt.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">{t('visitRequests.requestDate')}</label>
                            <input type="date" name="request_date" value={formData.request_date || ''} onChange={handleChange} required className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md" />
                        </div>
                        <div>
                           <label className="block text-sm font-medium mb-1">{t('visitRequests.status')}</label>
                            <select name="status" value={formData.status || 'Pending'} onChange={handleChange} required className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md">
                                <option value="Pending">{t('visitRequests.status.Pending')}</option>
                                <option value="Completed">{t('visitRequests.status.Completed')}</option>
                                <option value="Cancelled">{t('visitRequests.status.Cancelled')}</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                             <label className="block text-sm font-medium mb-1">{t('visitRequests.description')}</label>
                             <textarea name="description" value={formData.description || ''} onChange={handleChange} rows={3} className="w-full py-2 px-3 bg-transparent border border-border dark:border-dark-border rounded-md"></textarea>
                        </div>
                        
                        <div className="md:col-span-2">
                             <ImageUpload
                                files={photoFiles}
                                onChange={setPhotoFiles}
                                maxFiles={1}
                                label={t('visitRequests.photo')}
                                buttonText={t('common.uploadNew')}
                            />
                            {photoFiles.length === 0 && formData.photo_url && (
                                <div className="mt-4">
                                    <p className="text-sm font-medium mb-2">{t('logoManagement.currentLogo')}</p>
                                    <img src={formData.photo_url} alt="Current" className="h-32 w-32 object-cover rounded-md border border-border dark:border-dark-border" />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end items-center p-4 border-t border-border dark:border-dark-border">
                        <button type="button" onClick={onClose} className="px-4 py-2 mr-2 text-sm font-medium rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800">{t('form.cancel')}</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-primary dark:bg-dark-primary rounded-md hover:bg-secondary dark:hover:bg-dark-secondary disabled:opacity-50">
                            {isSaving ? 'Saving...' : t('form.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const VisitDetailsModal: React.FC<{ request: VisitRequest; onClose: () => void; onImageClick: (url: string) => void }> = ({ request, onClose, onImageClick }) => {
    const { t } = useAppContext();

    const InfoItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
        <div>
            <p className="font-semibold text-sm">{label}</p>
            <div className="text-sm text-text-secondary dark:text-dark-text-secondary">{value || 'N/A'}</div>
        </div>
    );

    const PhotoItem: React.FC<{ label: string; url: string | null | undefined }> = ({ label, url }) => (
        <div className="text-center">
            <p className="text-xs font-semibold mb-1">{label}</p>
            {url ? (
                <img src={url} onClick={() => onImageClick(url)} alt={label} className="w-full h-32 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity" />
            ) : (
                <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center"><ImageIcon className="h-8 w-8 text-gray-400" /></div>
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-border dark:border-dark-border">
                    <h2 className="text-xl font-bold">{t('visitRequests.viewDetails')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X className="h-6 w-6" /></button>
                </div>
                <div className="overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4 p-4 border border-border dark:border-dark-border rounded-lg">
                        <h3 className="font-bold text-lg border-b border-border dark:border-dark-border pb-2">{t('visitRequests.details.requestTitle')}</h3>
                        <InfoItem label={t('visitRequests.customer')} value={request.customer?.name} />
                        <InfoItem label={t('visitRequestMerch.merchandiser')} value={request.merch?.name} />
                        <InfoItem label={t('visitRequests.visitType')} value={request.visit_type?.name} />
                        <InfoItem label={t('visitRequests.requestDate')} value={request.request_date} />
                        <InfoItem label={t('visitRequests.description')} value={<p className="whitespace-pre-wrap">{request.description}</p>} />
                        <PhotoItem label={t('visitRequests.photo')} url={request.photo_url} />
                    </div>

                    <div className="space-y-4 p-4 border border-border dark:border-dark-border rounded-lg">
                        <h3 className="font-bold text-lg border-b border-border dark:border-dark-border pb-2">{t('visitRequests.details.fulfillmentTitle')}</h3>
                        <InfoItem label={t('visitRequests.details.completionDate')} value={request.completed_at ? new Date(request.completed_at).toLocaleString() : 'N/A'} />
                        <InfoItem label={t('myVisitRequests.completionNotes')} value={<p className="whitespace-pre-wrap">{request.completion_notes}</p>} />
                        <InfoItem label={t('visitRequests.details.completionLocation')} value={`${request.completion_latitude || ''}, ${request.completion_longitude || ''}`} />
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <PhotoItem label={t('myVisitRequests.photoBefore')} url={request.completion_photo_before_url} />
                            <PhotoItem label={t('myVisitRequests.photoAfter')} url={request.completion_photo_after_url} />
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-border dark:border-dark-border text-right">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800">{t('form.cancel')}</button>
                </div>
            </div>
        </div>
    );
};


const VisitRequestMerchandiser: React.FC = () => {
    const { t, permissions, showNotification, profile } = useAppContext();
    const pagePermissions = permissions['Visit Request Merchandiser'];

    const [requests, setRequests] = useState<VisitRequest[]>([]);
    const [merchs, setMerchs] = useState<Merch[]>([]);
    const [visitTypes, setVisitTypes] = useState<VisitType[]>([]);

    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRequest, setEditingRequest] = useState<Partial<VisitRequest> | null>(null);
    const [deletingRequest, setDeletingRequest] = useState<VisitRequest | null>(null);
    const [viewingRequest, setViewingRequest] = useState<VisitRequest | null>(null);
    const [viewingImage, setViewingImage] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!pagePermissions?.can_view) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const reqPromise = supabase.from('visit_requests').select('*, customer:customers(name), merch:merchs(name), visit_type:visit_types(name)').not('merch_id', 'is', null);
            const merchPromise = supabase.from('merchs').select('*');
            const vtPromise = supabase.from('visit_types').select('*');

            const [
                { data: reqData, error: reqError },
                { data: merchData, error: merchError },
                { data: vtData, error: vtError }
            ] = await Promise.all([reqPromise, merchPromise, vtPromise]);

            if (reqError || merchError || vtError) throw reqError || merchError || vtError;

            setRequests((reqData as any) || []);
            setMerchs(merchData || []);
            setVisitTypes(vtData || []);

        } catch (error: any) {
            showNotification(`Failed to load data: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [pagePermissions, showNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async (requestData: Partial<VisitRequest>, photoFile?: File) => {
        try {
            const isNew = !requestData.id;
            let photo_url = requestData.photo_url || null;

            if (photoFile) {
                const filePath = `public/${profile?.id}/${Date.now()}-${photoFile.name}`;
                const { error: uploadError } = await supabase.storage.from('visit_photos').upload(filePath, photoFile);
                if (uploadError) throw new Error(t('notification.photo.uploadError').replace('{error}', uploadError.message));
                const { data } = supabase.storage.from('visit_photos').getPublicUrl(filePath);
                photo_url = data.publicUrl;
            }
            
            const dataToSave = {
                ...requestData,
                photo_url,
                created_by: requestData.id ? requestData.created_by : profile?.id,
                updated_at: new Date().toISOString(),
            };

            const { customer, seller, merch, visit_type, ...dbData } = dataToSave;

            const { error } = await supabase.from('visit_requests').upsert(dbData);
            if (error) throw new Error(t('notification.visitRequest.saveError').replace('{error}', error.message));

            if (isNew && dbData.merch_id && dbData.customer_id) {
                try {
                    const { data: merchInfo, error: merchError } = await supabase
                        .from('merchs')
                        .select('user_id')
                        .eq('id', dbData.merch_id)
                        .single();

                    if (merchError || !merchInfo?.user_id) {
                        console.warn("Could not find user for merchandiser to send notification.", merchError);
                    } else {
                        const {data: customerData, error: customerError} = await supabase.from('customers').select('name').eq('id', dbData.customer_id).single();
                        const customerName = customerData?.name || 'a customer';
                        if(customerError) console.warn("Could not find customer name for notification");
                        
                        const notificationMessage = t('notification.visitRequestMerch.new').replace('{customerName}', customerName);
                        
                        const { data: newNotification, error: notifError } = await supabase
                            .from('notifications')
                            .insert({ message: notificationMessage, created_by: profile?.id })
                            .select()
                            .single();
                        
                        if (notifError) throw notifError;

                        const { error: userNotifError } = await supabase
                            .from('user_notifications')
                            .insert({ user_id: merchInfo.user_id, notification_id: newNotification.id });
                        
                        if (userNotifError) throw userNotifError;
                    }
                } catch (notificationError: any) {
                    console.error("Failed to send notification for new visit request:", notificationError);
                    showNotification("Visit request saved, but failed to send notification.", "error");
                }
            }

            showNotification(t('notification.visitRequest.saved'));
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            throw error;
        }
    };
    
    const handleDelete = async () => {
        if (!deletingRequest || !pagePermissions?.can_delete) return;
        
        const { error } = await supabase.from('visit_requests').delete().eq('id', deletingRequest.id);
        if (error) {
            showNotification(t('notification.visitRequest.deleteError').replace('{error}', error.message), 'error');
        } else {
            showNotification(t('notification.visitRequest.deleted'));
            fetchData();
        }
        setDeletingRequest(null);
    };

    const handleSetRating = async (requestId: string, rating: number) => {
        if (!pagePermissions?.can_edit) return;
    
        const { error } = await supabase
            .from('visit_requests')
            .update({ admin_rating: rating === 0 ? null : rating })
            .eq('id', requestId);
    
        if (error) {
            showNotification(`Failed to save rating: ${error.message}`, 'error');
        } else {
            showNotification(t('notification.visitRequest.ratingSaved'));
            setRequests(prevRequests =>
                prevRequests.map(req =>
                    req.id === requestId ? { ...req, admin_rating: rating === 0 ? null : rating } : req
                )
            );
        }
    };

    if (loading) return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;
    if (!pagePermissions?.can_view) return <p>{t('error.accessDenied.message')}</p>;
    
    const getStatusChip = (status: string) => {
        switch(status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
            case 'Completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'Cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">{t('visitRequestMerch.title')}</h1>
                {pagePermissions.can_create && <button onClick={() => { setEditingRequest(null); setIsModalOpen(true); }} className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-secondary"><Plus className="h-5 w-5 mr-2" />{t('visitRequestMerch.addRequest')}</button>}
            </div>
            <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border overflow-x-auto">
                <table className="min-w-full divide-y divide-border dark:divide-dark-border">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">{t('visitRequests.customer')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">{t('visitRequestMerch.merchandiser')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">{t('visitRequests.requestDate')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">{t('visitRequests.status')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">{t('visitRequests.adminRating')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">{t('visitRequests.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border dark:divide-dark-border">
                        {requests.map(req => (
                            <tr key={req.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{req.customer?.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{req.merch?.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{req.request_date}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusChip(req.status)}`}>
                                        {t(`visitRequests.status.${req.status}`)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {req.status === 'Completed' ? (
                                        <StarRating 
                                            rating={req.admin_rating}
                                            onSetRating={(rating) => handleSetRating(req.id, rating)}
                                            disabled={!pagePermissions.can_edit}
                                        />
                                    ) : (
                                        <span className="text-xs text-gray-400">N/A</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                    {req.status === 'Completed' && (
                                        <button onClick={() => setViewingRequest(req)} className="text-blue-600 dark:text-blue-400 hover:underline" title={t('visitRequests.viewDetails')}>
                                            <Eye className="h-4 w-4 inline" />
                                        </button>
                                    )}
                                    {pagePermissions.can_edit && <button onClick={() => { setEditingRequest(req); setIsModalOpen(true); }} className="text-accent hover:underline"><Edit className="h-4 w-4 inline" /></button>}
                                    {pagePermissions.can_delete && <button onClick={() => setDeletingRequest(req)} className="text-red-600 hover:underline"><Trash2 className="h-4 w-4 inline" /></button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && <VisitRequestMerchModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} request={editingRequest} merchs={merchs} visitTypes={visitTypes} />}
            
            {deletingRequest && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-sm">
                        <div className="p-6 text-center">
                            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                            <h3 className="text-lg font-bold mb-2">{t('form.delete')}</h3>
                            <p className="text-sm text-text-secondary mb-6">{t('visitRequests.confirmDelete')}</p>
                            <div className="flex justify-center gap-4">
                                <button onClick={() => setDeletingRequest(null)} className="px-4 py-2 text-sm font-medium rounded-md border border-border">{t('form.cancel')}</button>
                                <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">{t('form.delete')}</button>
                            </div>
                        </div>
                    </div>
                 </div>
            )}

            {viewingRequest && <VisitDetailsModal request={viewingRequest} onClose={() => setViewingRequest(null)} onImageClick={setViewingImage} />}

            {viewingImage && (
                <div className="fixed inset-0 bg-black bg-opacity-80 z-[100] flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
                    <img src={viewingImage} alt="Visit" className="max-w-full max-h-full rounded-lg shadow-lg" />
                </div>
            )}
        </div>
    );
};

export default VisitRequestMerchandiser;
