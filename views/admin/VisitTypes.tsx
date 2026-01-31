
import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { VisitType } from '../../types';
import { Plus, Edit, Trash2, X, AlertTriangle } from 'lucide-react';

// --- VisitType Form Modal ---
const VisitTypeModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (visitType: Partial<VisitType>) => Promise<void>;
    visitType: Partial<VisitType> | null;
}> = ({ isOpen, onClose, onSave, visitType }) => {
    const { t, profile } = useAppContext();
    const [formData, setFormData] = useState<Partial<VisitType>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        setFormData(visitType || { is_active: true });
        setSaveError(null);
    }, [visitType]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveError(null);
        try {
            await onSave({
                ...formData,
                created_by: visitType?.id ? formData.created_by : profile?.id,
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
                    <h2 className="text-xl font-bold">{visitType?.id ? t('visitTypes.form.title.edit') : t('visitTypes.form.title.add')}</h2>
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
                            <label className="block text-sm font-medium mb-1">{t('visitTypes.name')}</label>
                            <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-primary" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('visitTypes.description')}</label>
                            <textarea name="description" value={formData.description || ''} onChange={handleChange} rows={3} className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-primary"></textarea>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input type="checkbox" name="is_active" id="is_active" checked={!!formData.is_active} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                            <label htmlFor="is_active" className="text-sm font-medium">{t('visitTypes.active')}</label>
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

const VisitTypes: React.FC = () => {
    const { t, permissions, showNotification } = useAppContext();
    const pagePermissions = permissions['Visit Types'];
    const [visitTypes, setVisitTypes] = useState<VisitType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVisitType, setEditingVisitType] = useState<Partial<VisitType> | null>(null);
    const [deletingVisitType, setDeletingVisitType] = useState<VisitType | null>(null);

    const fetchVisitTypes = useCallback(async () => {
        if (!pagePermissions?.can_view) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase.from('visit_types').select('*').order('name', { ascending: true });
            if (error) throw error;
            if (data) setVisitTypes(data);
        } catch (error: any) {
            console.error("Error fetching visit types:", error);
            showNotification(`Failed to fetch visit types: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [pagePermissions, showNotification]);

    useEffect(() => {
        fetchVisitTypes();
    }, [fetchVisitTypes]);
    
    const handleAdd = () => {
        setEditingVisitType(null);
        setIsModalOpen(true);
    };

    const handleEdit = (visitType: VisitType) => {
        setEditingVisitType(visitType);
        setIsModalOpen(true);
    };
    
    const handleDeleteConfirm = (visitType: VisitType) => {
        setDeletingVisitType(visitType);
    };
    
    const handleSave = async (visitTypeData: Partial<VisitType>) => {
        const isNew = !visitTypeData.id;
        try {
            const { error } = await supabase.from('visit_types').upsert(visitTypeData);
            if (error) throw new Error(error.message);
            
            showNotification(isNew ? t('notification.visitType.added') : t('notification.visitType.updated'));
            setIsModalOpen(false);
            fetchVisitTypes();

        } catch (error: any) {
            console.error("Save visit type error:", error);
            if (error.message && error.message.includes('visit_types_name_key')) { // More specific check
                throw new Error(t('notification.visitType.saveErrorUnique'));
            }
            throw error;
        }
    };
    
    const handleDelete = async () => {
        if (!deletingVisitType || !pagePermissions?.can_delete) return;
        
        try {
            const { error } = await supabase.from('visit_types').delete().eq('id', deletingVisitType.id);
            if (error) throw error;
            
            showNotification(t('notification.visitType.deleted'));
            setDeletingVisitType(null);
            fetchVisitTypes();
        } catch (error: any) {
            showNotification(error.message, 'error');
            setDeletingVisitType(null);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('visitTypes.title')}</h1>
                {pagePermissions?.can_create && <button onClick={handleAdd} className="flex items-center px-4 py-2 bg-primary dark:bg-dark-primary text-white rounded-md hover:bg-secondary dark:hover:bg-dark-secondary transition-colors"><Plus className="h-5 w-5 mr-2" />{t('visitTypes.add')}</button>}
            </div>
             {pagePermissions?.can_view ? (
                <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border overflow-x-auto">
                    <table className="min-w-full divide-y divide-border dark:divide-dark-border">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('visitTypes.name')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('visitTypes.description')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('visitTypes.active')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('visitTypes.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-surface dark:bg-dark-surface divide-y divide-border dark:divide-dark-border">
                            {visitTypes.map(visitType => (
                                <tr key={visitType.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary dark:text-dark-text-primary">{visitType.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{visitType.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${visitType.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                            {visitType.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                        {pagePermissions?.can_edit && <button onClick={() => handleEdit(visitType)} className="text-accent dark:text-dark-accent hover:underline"><Edit className="h-4 w-4 inline" /></button>}
                                        {pagePermissions?.can_delete && <button onClick={() => handleDeleteConfirm(visitType)} className="text-red-600 dark:text-red-500 hover:underline"><Trash2 className="h-4 w-4 inline" /></button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             ) : <p className="text-text-secondary dark:text-dark-text-secondary">{t('error.accessDenied.message')}</p>}
             
            <VisitTypeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} visitType={editingVisitType} />
            
            {deletingVisitType && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
                    <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-sm">
                        <div className="p-6 text-center">
                            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                            <h3 className="text-lg font-bold mb-2">{t('form.delete')} {t('sidebar.visitTypes')}</h3>
                            <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-6">{t('visitTypes.form.confirmDelete')}</p>
                            <div className="flex justify-center gap-4">
                                <button onClick={() => setDeletingVisitType(null)} className="px-4 py-2 text-sm font-medium rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800">{t('form.cancel')}</button>
                                <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">{t('form.delete')}</button>
                            </div>
                        </div>
                    </div>
                 </div>
            )}
        </div>
    );
};

export default VisitTypes;