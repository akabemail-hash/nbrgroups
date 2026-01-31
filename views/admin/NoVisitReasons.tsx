
import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { NoVisitReason } from '../../types';
import { Plus, Edit, Trash2, X, AlertTriangle, Loader2, Save, Search } from 'lucide-react';

const NoVisitReasonModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (reason: Partial<NoVisitReason>) => Promise<void>;
    reason: Partial<NoVisitReason> | null;
}> = ({ isOpen, onClose, onSave, reason }) => {
    const { t, profile } = useAppContext();
    const [formData, setFormData] = useState<Partial<NoVisitReason>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        setFormData(reason || {});
        setSaveError(null);
    }, [reason]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveError(null);
        try {
            await onSave({
                ...formData,
                created_by: reason?.id ? formData.created_by : profile?.id,
                updated_at: new Date().toISOString(),
            });
        } catch (error: any) {
            setSaveError(error.message || 'An unexpected error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-lg">
                <div className="flex justify-between items-center p-4 border-b border-border dark:border-dark-border">
                    <h2 className="text-xl font-bold">{reason?.id ? t('noVisitReasons.form.title.edit') : t('noVisitReasons.form.title.add')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        {saveError && (
                            <div className="p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 rounded-md text-sm">
                                {saveError}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('noVisitReasons.name')}</label>
                            <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-primary" />
                        </div>
                    </div>
                    <div className="flex justify-end items-center p-4 border-t border-border dark:border-dark-border">
                        <button type="button" onClick={onClose} className="px-4 py-2 mr-2 text-sm font-medium rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800">{t('form.cancel')}</button>
                        <button type="submit" disabled={isSaving} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary dark:bg-dark-primary rounded-md hover:bg-secondary dark:hover:bg-dark-secondary disabled:opacity-50 transition-colors shadow-md">
                             {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Save className="h-4 w-4 mr-2"/>}
                            {isSaving ? t('common.saving') : t('form.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const NoVisitReasons: React.FC = () => {
    const { t, permissions, showNotification } = useAppContext();
    const pagePermissions = permissions['Reasons for No Visits'];
    const [reasons, setReasons] = useState<NoVisitReason[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingReason, setEditingReason] = useState<Partial<NoVisitReason> | null>(null);
    const [deletingReason, setDeletingReason] = useState<NoVisitReason | null>(null);

    const fetchReasons = useCallback(async () => {
        if (!pagePermissions?.can_view) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase.from('no_visit_reasons').select('*').order('name', { ascending: true });
            if (error) throw error;
            if (data) setReasons(data);
        } catch (error: any) {
            console.error("Error fetching no visit reasons:", error);
            showNotification(`Failed to fetch reasons: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [pagePermissions, showNotification]);

    useEffect(() => {
        fetchReasons();
    }, [fetchReasons]);
    
    const filteredReasons = reasons.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleAdd = () => {
        setEditingReason(null);
        setIsModalOpen(true);
    };

    const handleEdit = (reason: NoVisitReason) => {
        setEditingReason(reason);
        setIsModalOpen(true);
    };
    
    const handleDeleteConfirm = (reason: NoVisitReason) => {
        setDeletingReason(reason);
    };
    
    const handleSave = async (reasonData: Partial<NoVisitReason>) => {
        const isNew = !reasonData.id;
        try {
            const { error } = await supabase.from('no_visit_reasons').upsert(reasonData);
            if (error) throw new Error(error.message);
            
            showNotification(isNew ? t('notification.noVisitReason.added') : t('notification.noVisitReason.updated'));
            setIsModalOpen(false);
            fetchReasons();

        } catch (error: any) {
            console.error("Save no visit reason error:", error);
            if (error.message && error.message.includes('unique constraint')) {
                throw new Error(t('notification.noVisitReason.saveErrorUnique'));
            }
            throw error;
        }
    };
    
    const handleDelete = async () => {
        if (!deletingReason || !pagePermissions?.can_delete) return;
        
        try {
            const { error } = await supabase.from('no_visit_reasons').delete().eq('id', deletingReason.id);
            if (error) throw error;
            
            showNotification(t('notification.noVisitReason.deleted'));
            setDeletingReason(null);
            fetchReasons();
        } catch (error: any) {
            showNotification(error.message, 'error');
            setDeletingReason(null);
        }
    };

    if (loading) return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('noVisitReasons.title')}</h1>
                {pagePermissions?.can_create && <button onClick={handleAdd} className="flex items-center px-4 py-2 bg-primary dark:bg-dark-primary text-white rounded-md hover:bg-secondary dark:hover:bg-dark-secondary transition-all shadow-md"><Plus className="h-5 w-5 mr-2" />{t('noVisitReasons.add')}</button>}
            </div>

            <div className="relative w-full md:w-1/3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search reasons..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 pl-10 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md focus:ring-accent"
                />
            </div>

             {pagePermissions?.can_view ? (
                <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border overflow-x-auto">
                    <table className="min-w-full divide-y divide-border dark:divide-dark-border">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('noVisitReasons.name')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('form.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-surface dark:bg-dark-surface divide-y divide-border dark:divide-dark-border">
                            {filteredReasons.map(reason => (
                                <tr key={reason.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary dark:text-dark-text-primary">{reason.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                        {pagePermissions?.can_edit && <button onClick={() => handleEdit(reason)} className="text-accent dark:text-dark-accent hover:underline transition-colors"><Edit className="h-4 w-4 inline" /></button>}
                                        {pagePermissions?.can_delete && <button onClick={() => handleDeleteConfirm(reason)} className="text-red-600 dark:text-red-500 hover:underline transition-colors"><Trash2 className="h-4 w-4 inline" /></button>}
                                    </td>
                                </tr>
                            ))}
                            {filteredReasons.length === 0 && (
                                <tr>
                                    <td colSpan={2} className="px-6 py-10 text-center text-text-secondary dark:text-dark-text-secondary">No reasons found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
             ) : <p className="text-text-secondary dark:text-dark-text-secondary">{t('error.accessDenied.message')}</p>}
             
            <NoVisitReasonModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} reason={editingReason} />
            
            {deletingReason && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
                    <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-sm">
                        <div className="p-6 text-center">
                            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                            <h3 className="text-lg font-bold mb-2">{t('form.delete')}</h3>
                            <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-6">{t('noVisitReasons.form.confirmDelete')}</p>
                            <div className="flex justify-center gap-4">
                                <button onClick={() => setDeletingReason(null)} className="px-4 py-2 text-sm font-medium rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800">{t('form.cancel')}</button>
                                <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors shadow-md">{t('form.delete')}</button>
                            </div>
                        </div>
                    </div>
                 </div>
            )}
        </div>
    );
};

export default NoVisitReasons;
