
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { supabase } from '../services/supabase';
import { VisitType, ProductGroup } from '../types';
import { Loader2, AlertTriangle, Save, ArrowLeft, CheckCircle } from 'lucide-react';
import { ImageUpload } from '../components/ImageUpload';

interface GroupVisitState {
    groupId: string;
    beforeFiles: File[];
    afterFiles: File[];
    notes: string;
}

const getErrorMessage = (error: any): string => {
    if (!error) return 'Unknown error';
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    if (error.error_description) return error.error_description;
    try {
        return JSON.stringify(error);
    } catch {
        return 'An error occurred';
    }
};

const CustomerVisitForm: React.FC = () => {
    const { t, profile, activeVisit, markVisitAsSaved, navigateTo, showNotification } = useAppContext();
    const [visitTypes, setVisitTypes] = useState<VisitType[]>([]);
    const [assignedGroups, setAssignedGroups] = useState<ProductGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [visitTypeId, setVisitTypeId] = useState<string>('');
    const [description, setDescription] = useState('');
    const [groupStates, setGroupStates] = useState<GroupVisitState[]>([]);

    useEffect(() => {
        const fetchInitialData = async () => {
            if (!activeVisit) {
                setLoading(false);
                return; 
            }
            if (!profile) return;

            setLoading(true);
            try {
                // Fetch Visit Types
                const { data: vtData, error: vtError } = await supabase.from('visit_types').select('*').eq('is_active', true);
                if (vtError) throw vtError;
                setVisitTypes(vtData || []);

                // Fetch Product Groups based on role
                const roleName = profile.role?.name;
                const isSeller = roleName === 'Satış';
                const isMerch = roleName === 'Merch';
                
                if (isSeller || isMerch) {
                    const table = isSeller ? 'sellers' : 'merchs';
                    const { data: roleProfile } = await supabase.from(table).select('id').eq('user_id', profile.id).single();
                    
                    if (roleProfile && isSeller) {
                        const { data: groupsData, error: groupsError } = await supabase
                            .from('seller_product_groups')
                            .select('product_group:product_groups(*)')
                            .eq('seller_id', roleProfile.id);
                        if (groupsError) throw groupsError;
                        
                        const groups = (groupsData || []).map(d => (d as any).product_group);
                        setAssignedGroups(groups);
                        
                        // Initialize group states
                        setGroupStates(groups.map(g => ({
                            groupId: g.id,
                            beforeFiles: [],
                            afterFiles: [],
                            notes: ''
                        })));
                    }
                }
            } catch (err: any) {
                console.error("Error loading visit form data", err);
                setError(getErrorMessage(err));
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [activeVisit, profile]);

    const handleGroupChange = (groupId: string, field: keyof GroupVisitState, value: any) => {
        setGroupStates(prev => prev.map(s => s.groupId === groupId ? { ...s, [field]: value } : s));
    };

    const handleSave = async () => {
        if (!visitTypeId) {
            showNotification(t('dailyPlan.validation.selectVisitType'), 'error');
            return;
        }

        // --- MANDATORY IMAGE CHECK ---
        for (const group of assignedGroups) {
            const state = groupStates.find(s => s.groupId === group.id);
            if (state && (state.beforeFiles.length === 0 || state.afterFiles.length === 0)) {
                showNotification(t('dailyPlan.validation.imagesMandatory').replace('{groupName}', group.name), 'error');
                return;
            }
        }

        setIsSaving(true);
        try {
            // --- CALCULATE DURATION ---
            let durationMinutes = null;
            if (activeVisit && activeVisit.startTime) {
                const endTime = Date.now();
                durationMinutes = Math.round((endTime - activeVisit.startTime) / 60000);
                if (durationMinutes < 1) durationMinutes = 1; // Minimum 1 minute
            }

            const uploadFile = async (file: File) => {
                const filePath = `public/${profile!.id}/${Date.now()}-${file.name}`;
                const { error } = await supabase.storage.from('visit_photos').upload(filePath, file);
                if (error) throw new Error(`Failed to upload ${file.name}: ${error.message}`);
                return supabase.storage.from('visit_photos').getPublicUrl(filePath).data.publicUrl;
            };

            const roleName = profile?.role?.name;
            const isSeller = roleName === 'Seller';
            let tableName: 'seller_visits' | 'merch_visits' = isSeller ? 'seller_visits' : 'merch_visits';
            const roleTable = isSeller ? 'sellers' : 'merchs';
            const roleIdField = isSeller ? 'seller_id' : 'merch_id';

            const { data: roleProfile } = await supabase.from(roleTable).select('id').eq('user_id', profile!.id).single();
            if(!roleProfile) throw new Error(t('error.noProfile.message'));

            let finalVisitData: any = { 
                customer_id: activeVisit!.customerId,
                visit_type_id: visitTypeId,
                description,
                visit_datetime: new Date().toISOString(),
                is_visit: true,
                duration_minutes: durationMinutes, 
                created_by: profile!.id,
                [roleIdField]: roleProfile.id
            };

            let savedVisitId = activeVisit?.visitId;

            // If we have a visitId in context, it means we are updating an existing session record
            if (savedVisitId) {
                 const { error: updateError } = await supabase
                    .from(tableName)
                    .update(finalVisitData)
                    .eq('id', savedVisitId);
                 if (updateError) throw updateError;
            } else {
                 // Insert new record
                 const { data: insertedVisit, error: insertError } = await supabase
                    .from(tableName)
                    .insert(finalVisitData)
                    .select()
                    .single();
                 if (insertError) throw insertError;
                 savedVisitId = insertedVisit.id;
            }

            // --- Handle Group Details (Delete old, Insert new for simplicity on update) ---
            if (savedVisitId && groupStates.length > 0) {
                // Delete existing details for this visit to avoid duplicates/complex update logic
                const visitIdField = isSeller ? 'seller_visit_id' : 'merch_visit_id';
                await supabase.from('visit_product_group_details').delete().eq(visitIdField, savedVisitId);

                const groupDetailsToInsert = [];
                for (const state of groupStates) {
                    let beforeUrl = null, afterUrl = null;
                    if (state.beforeFiles.length > 0) beforeUrl = await uploadFile(state.beforeFiles[0]);
                    if (state.afterFiles.length > 0) afterUrl = await uploadFile(state.afterFiles[0]);
                    
                    if (beforeUrl || afterUrl || state.notes) {
                        const detailRecord: any = {
                            product_group_id: state.groupId,
                            before_image_url: beforeUrl,
                            after_image_url: afterUrl,
                            notes: state.notes,
                            [visitIdField]: savedVisitId
                        };
                        groupDetailsToInsert.push(detailRecord);
                    }
                }
                if (groupDetailsToInsert.length > 0) {
                    const { error: gError } = await supabase.from('visit_product_group_details').insert(groupDetailsToInsert);
                    if (gError) console.error("Error saving group details", gError);
                }
            }
            
            showNotification(t('notification.sellerVisit.saved'), 'success');
            
            // Mark as saved in context so Daily Plan knows it's safe to end
            if (savedVisitId) {
                markVisitAsSaved(savedVisitId);
            }
            
        } catch (error: any) {
            showNotification(t('notification.sellerVisit.saveError').replace('{error}', getErrorMessage(error)), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (!activeVisit) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">{t('dailyPlan.visitInProgress')}?</h2>
                <p className="text-text-secondary dark:text-dark-text-secondary mb-6 text-center">
                    {t('dailyPlan.validation.startVisitFirst')}
                </p>
                <button 
                    onClick={() => navigateTo('/daily-plan')}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-secondary transition-colors"
                >
                    {t('dailyPlan.title')}
                </button>
            </div>
        );
    }

    if (loading) return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;

    if (error) return <div className="p-4 bg-red-100 text-red-700 rounded-md">{error}</div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto animate-fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('sidebar.customerVisitForm')}</h1>
                <div className="flex gap-2">
                    <button 
                        onClick={() => navigateTo('/daily-plan')} 
                        className="flex items-center px-4 py-2 border border-border dark:border-dark-border bg-surface dark:bg-dark-surface rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {t('form.cancel')}
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving} 
                        className="flex items-center px-6 py-2 bg-primary dark:bg-dark-primary text-white font-bold rounded-md hover:bg-secondary dark:hover:bg-dark-secondary disabled:opacity-50 transition-colors shadow-md"
                    >
                        {isSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                        {isSaving ? t('common.saving') : t('form.save')}
                    </button>
                </div>
            </div>

            <div className="p-6 bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border space-y-6">
                
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg text-blue-800 dark:text-blue-200">{activeVisit.customerName}</h3>
                        <div className="mt-2 text-sm text-blue-600 dark:text-blue-300">
                            Visit Started: {new Date(activeVisit.startTime).toLocaleTimeString()}
                        </div>
                    </div>
                    {activeVisit.isSaved && (
                         <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-bold bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full text-xs">
                             <CheckCircle className="h-4 w-4" />
                             Saved
                         </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('dailyPlan.visitType')}</label>
                        <select 
                            value={visitTypeId} 
                            onChange={(e) => setVisitTypeId(e.target.value)} 
                            className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md"
                        >
                            <option value="">{t('dailyPlan.dropdown.selectType')}</option>
                            {visitTypes.map(vt => <option key={vt.id} value={vt.id}>{vt.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('dailyPlan.visitDateTime')}</label>
                        <input type="text" readOnly value={new Date().toLocaleString()} className="w-full p-2 bg-gray-100 dark:bg-gray-800 border border-border dark:border-dark-border rounded-md text-text-secondary" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">{t('dailyPlan.description')}</label>
                        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md" />
                    </div>
                </div>

                {assignedGroups.length > 0 && (
                    <div className="space-y-8 mt-8 pt-8 border-t border-border dark:border-dark-border">
                        <h3 className="text-xl font-bold text-primary dark:text-dark-primary">{t('sidebar.productGroups')}</h3>
                        {assignedGroups.map(group => {
                            const state = groupStates.find(s => s.groupId === group.id);
                            if (!state) return null;
                            return (
                                <div key={group.id} className="p-5 border border-border dark:border-dark-border rounded-xl bg-gray-50/30 dark:bg-gray-800/30 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border dark:border-dark-border pb-3">
                                        <div>
                                            <h4 className="text-lg font-bold text-text-primary dark:text-dark-text-primary">{group.name} <span className="text-red-500">*</span></h4>
                                            {group.description && <p className="text-xs text-text-secondary italic">{group.description}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <ImageUpload
                                            files={state.beforeFiles}
                                            onChange={(files) => handleGroupChange(group.id, 'beforeFiles', files)}
                                            maxFiles={1}
                                            label={t('visitTypes.groupOldVersion')}
                                            buttonText={t('common.addPhoto')}
                                        />
                                        <ImageUpload
                                            files={state.afterFiles}
                                            onChange={(files) => handleGroupChange(group.id, 'afterFiles', files)}
                                            maxFiles={1}
                                            label={t('visitTypes.groupNewVersion')}
                                            buttonText={t('common.addPhoto')}
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('visitTypes.groupNotes')}</label>
                                        <textarea 
                                            rows={2} 
                                            value={state.notes} 
                                            onChange={(e) => handleGroupChange(group.id, 'notes', e.target.value)}
                                            className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-sm"
                                            placeholder={t('dailyPlan.groupNotesPlaceholder')}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerVisitForm;
