
import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase, supabaseUrl, supabaseAnonKey } from '../../services/supabase';
import { Merch, Role } from '../../types';
import { Plus, Edit, Trash2, X, AlertTriangle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// --- Merch Form Modal ---
const MerchModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (merch: Partial<Merch>, password?: string) => Promise<void>;
    merch: Partial<Merch> | null;
}> = ({ isOpen, onClose, onSave, merch }) => {
    const { t } = useAppContext();
    const [formData, setFormData] = useState<Partial<Merch>>({});
    const [password, setPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const isNew = !merch?.id;

    useEffect(() => {
        setFormData(merch || { is_active: true });
        setPassword('');
        setSaveError(null);
    }, [merch]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveError(null);
        try {
            await onSave(formData, password);
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
                    <h2 className="text-xl font-bold">{isNew ? t('merchs.form.title.add') : t('merchs.form.title.edit')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X className="h-6 w-6" /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        {saveError && <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md text-sm">{saveError}</div>}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('merchs.merchCode')}</label>
                                <input type="text" name="merch_code" value={formData.merch_code || ''} onChange={handleChange} required className="w-full py-2 px-3 bg-transparent border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('merchs.name')}</label>
                                <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required className="w-full py-2 px-3 bg-transparent border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">{t('merchs.email')}</label>
                                <input type="email" name="email" value={formData.email || ''} onChange={handleChange} required disabled={!isNew} className="w-full py-2 px-3 bg-transparent border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 dark:disabled:bg-gray-800" />
                            </div>
                            {isNew && (
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1">{t('merchs.password')}</label>
                                    <input type="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full py-2 px-3 bg-transparent border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('merchs.phoneNumber')}</label>
                                <input type="tel" name="phone_number" value={formData.phone_number || ''} onChange={handleChange} className="w-full py-2 px-3 bg-transparent border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                            <input type="checkbox" name="is_active" id="is_active" checked={!!formData.is_active} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                            <label htmlFor="is_active" className="text-sm font-medium">{t('merchs.active')}</label>
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

// --- Merchandiser Management Main Component ---
const Merchandisers: React.FC = () => {
    const { t, permissions, showNotification, profile } = useAppContext();
    const pagePermissions = permissions['Merchandisers'];

    const [merchs, setMerchs] = useState<Merch[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMerch, setEditingMerch] = useState<Partial<Merch> | null>(null);
    const [deletingMerch, setDeletingMerch] = useState<Merch | null>(null);
    
    const fetchMerchs = useCallback(async () => {
        if (!pagePermissions?.can_view) {
            setLoading(false);
            return;
        }
        try {
            const { data, error } = await supabase.from('merchs').select('*').order('name', { ascending: true });
            if (error) throw error;
            setMerchs(data as Merch[]);
        } catch (error: any) {
            console.error("Error fetching merchandisers:", error);
            showNotification(`Failed to fetch merchandisers: ${error.message}`, 'error');
        }
    }, [pagePermissions, showNotification]);
    
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                await fetchMerchs();
                const { data: rolesData, error: rolesError } = await supabase.from('user_roles').select('*');
                if (rolesError) throw rolesError;
                if (rolesData) setRoles(rolesData);
            } catch (error: any) {
                console.error("Error fetching initial merchandiser data:", error);
                showNotification(`Failed to load roles: ${error.message}`, 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [fetchMerchs, showNotification]);
    
    const handleAdd = () => {
        setEditingMerch(null);
        setIsModalOpen(true);
    };

    const handleEdit = (merch: Merch) => {
        setEditingMerch(merch);
        setIsModalOpen(true);
    };
    
    const handleDeleteConfirm = (merch: Merch) => {
        setDeletingMerch(merch);
    };
    
    const handleSave = async (merchData: Partial<Merch>, password?: string) => {
        const isNew = !merchData.id;
    
        try {
            if (isNew) {
                if (!password || !merchData.email || !merchData.name) {
                    throw new Error("Email, name, and password are required for new merchandisers.");
                }
                
                const merchRole = roles.find(r => r.name === 'Merch');
                if (!merchRole) throw new Error(t('notification.merch.roleNotFound'));
    
                // 1. Create a true, but isolated, in-memory storage adapter.
                const inMemoryStorage = new Map<string, string>();
                const storageAdapter = {
                    getItem: (key: string) => inMemoryStorage.get(key) || null,
                    setItem: (key: string, value: string) => {
                        inMemoryStorage.set(key, value);
                    },
                    removeItem: (key: string) => {
                        inMemoryStorage.delete(key);
                    },
                };
    
                // 2. Create a custom fetch that strips the Authorization header as a safeguard.
                const customFetch: typeof fetch = (input, init) => {
                    const headers = new Headers(init?.headers);
                    headers.delete('Authorization');
                    return fetch(input, { ...init, headers });
                };
    
                // 3. Create a temporary, fully isolated Supabase client.
                const tempAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
                    auth: {
                        storage: storageAdapter,
                        autoRefreshToken: false,
                        persistSession: false,
                        detectSessionInUrl: false
                    },
                    global: {
                        fetch: customFetch
                    }
                });
    
                // 4. Create the user in auth.users.
                const { data: { user: newUser }, error: signUpError } = await tempAuthClient.auth.signUp({
                    email: merchData.email,
                    password: password
                });
                
                if (signUpError) {
                     if (signUpError.message.includes('User already registered')) {
                        throw new Error(t('notification.merch.saveErrorUnique'));
                    }
                    throw new Error(signUpError.message);
                }
                if (!newUser) throw new Error("User auth account could not be created.");
    
                // 5. Use the main, admin-authenticated client for all subsequent database writes.
                const newUserId = newUser.id;
    
                try {
                    const { error: profileError } = await supabase.from('users').insert({
                        id: newUserId,
                        email: merchData.email,
                        full_name: merchData.name,
                        role_id: merchRole.id,
                        is_active: merchData.is_active
                    });
        
                    if (profileError) throw new Error(profileError.message);
                    
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { id, ...newMerchData } = merchData;
                    const { error: merchError } = await supabase.from('merchs').insert({
                        ...newMerchData,
                        user_id: newUserId,
                        created_by: profile?.id
                    });
        
                    if (merchError) throw new Error(merchError.message);

                } catch (innerError: any) {
                    console.error("Creation failed, cleaning up user record...", innerError);
                    await supabase.from('users').delete().eq('id', newUserId);
                    throw innerError;
                }
    
                showNotification(t('notification.merch.added'));
            } else {
                 // Editing existing merchandiser
                 // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { id, user_id, ...updateData } = merchData;
                const { error: merchError } = await supabase.from('merchs').update(updateData).eq('id', id!);
                if (merchError) throw new Error(merchError.message);
    
                if (user_id) {
                     const { error: userError } = await supabase.from('users').update({ full_name: updateData.name, is_active: updateData.is_active }).eq('id', user_id);
                     if(userError) console.error("Error updating user profile:", userError.message);
                }
                showNotification(t('notification.merch.updated'));
            }
    
            setIsModalOpen(false);
            fetchMerchs();
        } catch (error: any) {
            console.error("Save merch error:", error);
            if (error.message && (error.message.toLowerCase().includes('unique constraint') || error.message.includes('merch_code') || error.message.includes('email'))) {
                throw new Error(t('notification.merch.saveErrorUnique'));
            }
            throw error;
        }
    };
    
    const handleDelete = async () => {
        if (!deletingMerch || !pagePermissions?.can_delete) return;
        
        const { error } = await supabase.from('merchs').delete().eq('id', deletingMerch.id);
        if (error) {
            showNotification(error.message, 'error');
        } else {
            showNotification(t('notification.merch.deleted'));
            fetchMerchs();
        }
        setDeletingMerch(null);
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('merchs.title')}</h1>
                {pagePermissions?.can_create && <button onClick={handleAdd} className="flex items-center px-4 py-2 bg-primary dark:bg-dark-primary text-white rounded-md hover:bg-secondary dark:hover:bg-dark-secondary transition-colors"><Plus className="h-5 w-5 mr-2" />{t('merchs.addMerch')}</button>}
            </div>

            {!pagePermissions?.can_view ? <p>{t('error.accessDenied.message')}</p> : (
                <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border overflow-x-auto">
                    <table className="min-w-full divide-y divide-border dark:divide-dark-border">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('merchs.merchCode')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('merchs.name')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('merchs.email')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('merchs.phoneNumber')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('merchs.active')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('merchs.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-surface dark:bg-dark-surface divide-y divide-border dark:divide-dark-border">
                            {merchs.map(merch => (
                                <tr key={merch.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{merch.merch_code}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{merch.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{merch.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{merch.phone_number}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${merch.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                                            {merch.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                        {pagePermissions?.can_edit && <button onClick={() => handleEdit(merch)} className="text-accent dark:text-dark-accent hover:underline"><Edit className="h-4 w-4 inline" /></button>}
                                        {pagePermissions?.can_delete && <button onClick={() => handleDeleteConfirm(merch)} className="text-red-600 dark:text-red-500 hover:underline"><Trash2 className="h-4 w-4 inline" /></button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            <MerchModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} merch={editingMerch} />

            {deletingMerch && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-sm">
                        <div className="p-6 text-center">
                            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                            <h3 className="text-lg font-bold mb-2">{t('form.delete')} Merchandiser</h3>
                            <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-6">{t('merchs.form.confirmDelete')}</p>
                            <div className="flex justify-center gap-4">
                                <button onClick={() => setDeletingMerch(null)} className="px-4 py-2 text-sm font-medium rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800">{t('form.cancel')}</button>
                                <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">{t('form.delete')}</button>
                            </div>
                        </div>
                    </div>
                 </div>
            )}
        </div>
    );
};

export default Merchandisers;
