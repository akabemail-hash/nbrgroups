
import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { RotaGroup } from '../../types';
import { Plus, Edit, Trash2, X, AlertTriangle, Loader2, Save } from 'lucide-react';

const RotaGroupModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (group: Partial<RotaGroup>) => Promise<void>;
    group: Partial<RotaGroup> | null;
}> = ({ isOpen, onClose, onSave, group }) => {
    const { t, profile } = useAppContext();
    const [formData, setFormData] = useState<Partial<RotaGroup>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        setFormData(group || {});
        setSaveError(null);
    }, [group]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
                created_by: group?.id ? formData.created_by : profile?.id,
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
                    <h2 className="text-xl font-bold">{group?.id ? t('rotaGroups.form.title.edit') : t('rotaGroups.form.title.add')}</h2>
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
                            <label className="block text-sm font-medium mb-1">{t('rotaGroups.name')}</label>
                            <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-primary" />
                        </div>
                    </div>
                    <div className="flex justify-end items-center p-4 border-t border-border dark:border-dark-border">
                        <button type="button" onClick={onClose} className="px-4 py-2 mr-2 text-sm font-medium rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800">{t('form.cancel')}</button>
                        <button type="submit" disabled={isSaving} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary dark:bg-dark-primary rounded-md hover:bg-secondary dark:hover:bg-dark-secondary disabled:opacity-50">
                             {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Save className="h-4 w-4 mr-2"/>}
                            {isSaving ? t('common.saving') : t('form.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const RotaGroups: React.FC = () => {
    const { t, permissions, showNotification } = useAppContext();
    const pagePermissions = permissions['Rota Groups'];
    const [groups, setGroups] = useState<RotaGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Partial<RotaGroup> | null>(null);
    const [deletingGroup, setDeletingGroup] = useState<RotaGroup | null>(null);

    const fetchGroups = useCallback(async () => {
        if (!pagePermissions?.can_view) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase.from('rota_groups').select('*').order('name', { ascending: true });
            if (error) throw error;
            if (data) setGroups(data);
        } catch (error: any) {
            console.error("Error fetching rota groups:", error);
            showNotification(`Failed to fetch rota groups: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [pagePermissions, showNotification]);

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);
    
    const handleAdd = () => {
        setEditingGroup(null);
        setIsModalOpen(true);
    };

    const handleEdit = (group: RotaGroup) => {
        setEditingGroup(group);
        setIsModalOpen(true);
    };
    
    const handleDeleteConfirm = (group: RotaGroup) => {
        setDeletingGroup(group);
    };
    
    const handleSave = async (groupData: Partial<RotaGroup>) => {
        const isNew = !groupData.id;
        try {
            const dataToSave = { ...groupData, updated_at: new Date().toISOString() };
            const { error } = await supabase.from('rota_groups').upsert(dataToSave);
            if (error) throw new Error(error.message);
            
            showNotification(isNew ? t('notification.rotaGroup.added') : t('notification.rotaGroup.updated'));
            setIsModalOpen(false);
            fetchGroups();

        } catch (error: any) {
            console.error("Save rota group error:", error);
            if (error.message && error.message.includes('rota_groups_name_key')) {
                throw new Error(t('notification.rotaGroup.saveErrorUnique'));
            }
            throw error;
        }
    };
    
    const handleDelete = async () => {
        if (!deletingGroup || !pagePermissions?.can_delete) return;
        
        try {
            const { error } = await supabase.from('rota_groups').delete().eq('id', deletingGroup.id);
            if (error) throw error;
            
            showNotification(t('notification.rotaGroup.deleted'));
            setDeletingGroup(null);
            fetchGroups();
        } catch (error: any) {
            showNotification(error.message, 'error');
            setDeletingGroup(null);
        }
    };

    if (loading) return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('rotaGroups.title')}</h1>
                {pagePermissions?.can_create && <button onClick={handleAdd} className="flex items-center px-4 py-2 bg-primary dark:bg-dark-primary text-white rounded-md hover:bg-secondary dark:hover:bg-dark-secondary transition-colors"><Plus className="h-5 w-5 mr-2" />{t('rotaGroups.addGroup')}</button>}
            </div>
             {pagePermissions?.can_view ? (
                <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border overflow-x-auto">
                    <table className="min-w-full divide-y divide-border dark:divide-dark-border">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('rotaGroups.name')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('form.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-surface dark:bg-dark-surface divide-y divide-border dark:divide-dark-border">
                            {groups.map(group => (
                                <tr key={group.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary dark:text-dark-text-primary">{group.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                        {pagePermissions?.can_edit && <button onClick={() => handleEdit(group)} className="text-accent dark:text-dark-accent hover:underline"><Edit className="h-4 w-4 inline" /></button>}
                                        {pagePermissions?.can_delete && <button onClick={() => handleDeleteConfirm(group)} className="text-red-600 dark:text-red-500 hover:underline"><Trash2 className="h-4 w-4 inline" /></button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             ) : <p className="text-text-secondary dark:text-dark-text-secondary">{t('error.accessDenied.message')}</p>}
             
            <RotaGroupModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} group={editingGroup} />
            
            {deletingGroup && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
                    <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-sm">
                        <div className="p-6 text-center">
                            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                            <h3 className="text-lg font-bold mb-2">{t('form.delete')} Rota Group</h3>
                            <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-6">{t('rotaGroups.form.confirmDelete')}</p>
                            <div className="flex justify-center gap-4">
                                <button onClick={() => setDeletingGroup(null)} className="px-4 py-2 text-sm font-medium rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800">{t('form.cancel')}</button>
                                <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">{t('form.delete')}</button>
                            </div>
                        </div>
                    </div>
                 </div>
            )}
        </div>
    );
};

export default RotaGroups;
