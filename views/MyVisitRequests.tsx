
import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { supabase } from '../services/supabase';
import { VisitRequest } from '../types';
import { useGeolocation } from '../hooks/useGeolocation';
import { Loader2, AlertTriangle, X, MapPin, Camera, CheckCircle } from 'lucide-react';
import { ImageUpload } from '../components/ImageUpload';
import { Capacitor } from '@capacitor/core';

const FulfillmentModal: React.FC<{
    request: VisitRequest;
    onClose: () => void;
    onComplete: (completionData: Partial<VisitRequest>, beforeFile?: File, afterFile?: File) => Promise<void>;
}> = ({ request, onClose, onComplete }) => {
    const { t, profile } = useAppContext();
    const { updateLocation, loading: geoLoading, error: geoError } = useGeolocation(profile?.id);
    
    const [notes, setNotes] = useState('');
    const [beforeFiles, setBeforeFiles] = useState<File[]>([]);
    const [afterFiles, setAfterFiles] = useState<File[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const handleSubmit = async () => {
        setIsSaving(true);
        setSaveError(null);
        try {
            // Attempt to get location first
            let latitude: number | null = null;
            let longitude: number | null = null;

            if(Capacitor.isNativePlatform() || navigator.geolocation) {
                 try {
                    await updateLocation();
                    // Refetch profile to get latest location, as updateLocation doesn't return it.
                    // This is a bit indirect but works with the current hook design.
                    const { data: user, error } = await supabase.from('users').select('last_known_latitude, last_known_longitude').eq('id', profile!.id).single();
                    if(error) console.warn("Could not refetch user location, might be stale.", error);
                    latitude = user?.last_known_latitude ?? null;
                    longitude = user?.last_known_longitude ?? null;
                 } catch (e: any) {
                    console.error("Geolocation failed during completion:", e);
                    // Decide if location is critical. For now, we'll proceed without it.
                 }
            }

            const completionData: Partial<VisitRequest> = {
                id: request.id,
                status: 'Completed',
                completed_at: new Date().toISOString(),
                completion_notes: notes,
                completion_latitude: latitude,
                completion_longitude: longitude,
            };
            await onComplete(completionData, beforeFiles[0], afterFiles[0]);
        } catch (error: any) {
            setSaveError(error.message);
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-border dark:border-dark-border">
                    <h2 className="text-xl font-bold">{t('myVisitRequests.completeVisit')}</h2>
                    <button onClick={onClose}><X className="h-6 w-6" /></button>
                </div>
                <div className="overflow-y-auto p-6 space-y-6">
                    {saveError && <div className="p-3 bg-red-100 text-red-700 rounded">{saveError}</div>}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column: Details */}
                        <div className="space-y-4 p-4 border border-border dark:border-dark-border rounded-lg">
                             <h3 className="font-semibold text-lg border-b border-border dark:border-dark-border pb-2">{t('myVisitRequests.visitDetails')}</h3>
                             <p><strong>{t('visitRequests.customer')}:</strong> {request.customer?.name}</p>
                             <p><strong>{t('visitRequests.requestDate')}:</strong> {request.request_date}</p>
                             <p><strong>{t('visitRequests.visitType')}:</strong> {request.visit_type?.name}</p>
                             <p><strong>{t('visitRequests.description')}:</strong> {request.description || 'N/A'}</p>
                             {request.photo_url && (
                                <div>
                                    <strong>{t('visitRequests.photo')}:</strong>
                                    <img src={request.photo_url} alt="Request" className="mt-2 rounded-md max-h-40"/>
                                </div>
                             )}
                        </div>

                        {/* Right Column: Fulfillment */}
                        <div className="space-y-4 p-4 border border-border dark:border-dark-border rounded-lg">
                            <h3 className="font-semibold text-lg border-b border-border dark:border-dark-border pb-2">{t('myVisitRequests.fulfillment')}</h3>
                             <div>
                                <label className="block text-sm font-medium mb-1">{t('myVisitRequests.completionNotes')}</label>
                                <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md" />
                             </div>
                             <ImageUpload
                                files={beforeFiles}
                                onChange={setBeforeFiles}
                                maxFiles={1}
                                label={t('myVisitRequests.photoBefore')}
                                buttonText={t('common.addPhoto')}
                            />
                            <ImageUpload
                                files={afterFiles}
                                onChange={setAfterFiles}
                                maxFiles={1}
                                label={t('myVisitRequests.photoAfter')}
                                buttonText={t('common.addPhoto')}
                            />
                             {geoError && <p className="text-sm text-red-500">{t('myVisitRequests.yourLocation')}: {geoError}</p>}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end items-center p-4 border-t border-border dark:border-dark-border">
                    <button onClick={onClose} className="px-4 py-2 mr-2 rounded-md border border-border dark:border-dark-border">{t('form.cancel')}</button>
                    <button onClick={handleSubmit} disabled={isSaving || geoLoading} className="px-4 py-2 text-white bg-primary rounded-md hover:bg-secondary disabled:opacity-50 flex items-center">
                        {isSaving || geoLoading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                        {isSaving ? 'Saving...' : geoLoading ? 'Getting Location...' : t('myVisitRequests.completeVisit')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const MyVisitRequests: React.FC = () => {
    const { t, permissions, showNotification, profile } = useAppContext();
    const pagePermissions = permissions['My Visit Requests'];
    
    const [requests, setRequests] = useState<VisitRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<VisitRequest | null>(null);

    const fetchMyRequests = useCallback(async () => {
        if (!pagePermissions?.can_view) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // RLS will handle filtering for admins (all) and sellers (theirs only) automatically.
            const { data, error } = await supabase
                .from('visit_requests')
                .select('*, customer:customers(name, gps_latitude, gps_longitude), seller:sellers(name), visit_type:visit_types(name)')
                .eq('status', 'Pending')
                .order('request_date', { ascending: true });
            
            if (error) throw error;
            setRequests(data as any || []);

        } catch (error: any) {
            showNotification(`Failed to load visit requests: ${error.message}`, 'error');
            setRequests([]);
        } finally {
            setLoading(false);
        }
    }, [pagePermissions, showNotification]);


    useEffect(() => {
        fetchMyRequests();
    }, [fetchMyRequests]);

    const handleComplete = async (completionData: Partial<VisitRequest>, beforeFile?: File, afterFile?: File) => {
        try {
            let photo_before_url = null;
            let photo_after_url = null;

            if (beforeFile) {
                const filePath = `public/${profile?.id}/before-${Date.now()}-${beforeFile.name}`;
                const { error: uploadError } = await supabase.storage.from('visit_photos').upload(filePath, beforeFile);
                if (uploadError) throw new Error(t('notification.photo.uploadError').replace('{error}', uploadError.message));
                photo_before_url = supabase.storage.from('visit_photos').getPublicUrl(filePath).data.publicUrl;
            }
             if (afterFile) {
                const filePath = `public/${profile?.id}/after-${Date.now()}-${afterFile.name}`;
                const { error: uploadError } = await supabase.storage.from('visit_photos').upload(filePath, afterFile);
                if (uploadError) throw new Error(t('notification.photo.uploadError').replace('{error}', uploadError.message));
                photo_after_url = supabase.storage.from('visit_photos').getPublicUrl(filePath).data.publicUrl;
            }

            const finalData = {
                ...completionData,
                completion_photo_before_url: photo_before_url,
                completion_photo_after_url: photo_after_url,
            };

            const { error } = await supabase.from('visit_requests').update(finalData).eq('id', finalData.id!);
            if (error) throw new Error(t('notification.visitRequest.completeError').replace('{error}', error.message));

            showNotification(t('notification.visitRequest.completed'));
            setSelectedRequest(null);
            fetchMyRequests();

        } catch(error) {
            console.error(error);
            throw error; // Rethrow to be shown in modal
        }
    };

    if (loading) return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;
    if (!pagePermissions?.can_view) return <p>{t('error.accessDenied.message')}</p>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">{t('myVisitRequests.title')}</h1>

            {requests.length === 0 ? (
                <div className="text-center p-12 bg-surface dark:bg-dark-surface rounded-lg border border-border dark:border-dark-border">
                    <p className="text-text-secondary">{t('myVisitRequests.noPending')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {requests.map(req => (
                        <div key={req.id} className="bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border p-5 flex flex-col justify-between">
                           <div>
                                <h3 className="font-bold text-lg">{req.customer?.name}</h3>
                                {profile?.role?.is_admin && <p className="text-sm text-cyan-600 dark:text-cyan-400">{req.seller?.name}</p>}
                                <p className="text-sm text-text-secondary">{req.visit_type?.name}</p>
                                <p className="text-sm font-semibold text-primary dark:text-dark-primary mt-1">{req.request_date}</p>
                                <p className="text-sm mt-2">{req.description}</p>
                           </div>
                           <button onClick={() => setSelectedRequest(req)} className="mt-4 w-full px-4 py-2 bg-accent text-white rounded-md hover:bg-teal-700">
                                {t('myVisitRequests.completeVisit')}
                            </button>
                        </div>
                    ))}
                </div>
            )}
            
            {selectedRequest && <FulfillmentModal request={selectedRequest} onClose={() => setSelectedRequest(null)} onComplete={handleComplete} />}
        </div>
    );
};

export default MyVisitRequests;
