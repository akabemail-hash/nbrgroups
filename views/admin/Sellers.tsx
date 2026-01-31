
import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase, supabaseUrl, supabaseAnonKey } from '../../services/supabase';
import { Seller, Role } from '../../types';
import { Plus, Edit, Trash2, X, AlertTriangle, Loader2, Save } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// --- Seller Form Modal ---
const SellerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (seller: Partial<Seller> & { role_id?: string }, password?: string) => Promise<void>;
    seller: (Partial<Seller> & { role_id?: string }) | null;
    roles: Role[];
}> = ({ isOpen, onClose, onSave, seller, roles }) => {
    const { t } = useAppContext();
    const [formData, setFormData] = useState<Partial<Seller> & { role_id?: string }>({});
    const [password, setPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const isNew = !seller?.id;

    useEffect(() => {
        if (isNew && !seller?.role_id) {
            // Default to 'Seller' role if new
            const sellerRole = roles.find(r => r.name === 'Seller');
            setFormData({ is_active: true, role_id: sellerRole?.id });
        } else {
            setFormData(seller || { is_active: true });
        }
        setPassword('');
        setSaveError(null);
    }, [seller, isNew, roles]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
                    <h2 className="text-xl font-bold">{isNew ? t('sellers.form.title.add') : t('sellers.form.title.edit')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X className="h-6 w-6" /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        {saveError && <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md text-sm">{saveError}</div>}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('sellers.sellerCode')}</label>
                                <input type="text" name="seller_code" value={formData.seller_code || ''} onChange={handleChange} required className="w-full py-2 px-3 bg-transparent border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('sellers.name')}</label>
                                <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required className="w-full py-2 px-3 bg-transparent border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">{t('users.role')}</label>
                                <select 
                                    name="role_id" 
                                    value={formData.role_id || ''} 
                                    onChange={handleChange} 
                                    required 
                                    className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="" disabled>{t('permissions.selectRole')}</option>
                                    {roles.map(role => (
                                        <option key={role.id} value={role.id}>{role.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">{t('sellers.email')}</label>
                                <input type="email" name="email" value={formData.email || ''} onChange={handleChange} required disabled={!isNew} className="w-full py-2 px-3 bg-transparent border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 dark:disabled:bg-gray-800" />
                            </div>
                            {isNew && (
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1">{t('sellers.password')}</label>
                                    <input type="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full py-2 px-3 bg-transparent border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('sellers.phoneNumber')}</label>
                                <input type="tel" name="phone_number" value={formData.phone_number || ''} onChange={handleChange} className="w-full py-2 px-3 bg-transparent border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                            <input type="checkbox" name="is_active" id="is_active" checked={!!formData.is_active} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                            <label htmlFor="is_active" className="text-sm font-medium">{t('sellers.active')}</label>
                        </div>
                    </div>
                    <div className="flex justify-end items-center p-4 border-t border-border dark:border-dark-border">
                        <button type="button" onClick={onClose} className="px-4 py-2 mr-2 text-sm font-medium rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800">{t('form.cancel')}</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-primary dark:bg-dark-primary rounded-md hover:bg-secondary dark:hover:bg-dark-secondary disabled:opacity-50 flex items-center gap-2">
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {isSaving ? t('common.saving') : t('form.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Seller Management Main Component ---
const Sellers: React.FC = () => {
    const { t, permissions, showNotification, profile } = useAppContext();
    const pagePermissions = permissions['Sellers'];

    const [sellers, setSellers] = useState<Seller[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSeller, setEditingSeller] = useState<(Partial<Seller> & { role_id?: string }) | null>(null);
    const [deletingSeller, setDeletingSeller] = useState<Seller | null>(null);
    
    const fetchSellers = useCallback(async () => {
        if (!pagePermissions?.can_view) {
            setLoading(false);
            return;
        }
        try {
            // Explicitly specify the foreign key constraint for the relationship to avoid ambiguity
            // sellers.user_id REFERENCES users.id
            const { data, error } = await supabase
                .from('sellers')
                .select('*, user:users!sellers_user_id_fkey(role_id)')
                .order('name', { ascending: true });
            
            if (error) throw error;
            setSellers(data as unknown as Seller[]);
        } catch (error: any) {
            console.error("Error fetching sellers:", error);
            showNotification(`Failed to fetch sellers: ${error.message}`, 'error');
        }
    }, [pagePermissions, showNotification]);
    
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                await fetchSellers();
                const { data: rolesData, error: rolesError } = await supabase.from('user_roles').select('*');
                if (rolesError) throw rolesError;
                if (rolesData) setRoles(rolesData);
            } catch (error: any) {
                console.error("Error fetching initial seller data:", error);
                showNotification(`Failed to load roles: ${error.message}`, 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [fetchSellers, showNotification]);
    
    const handleAdd = () => {
        setEditingSeller(null);
        setIsModalOpen(true);
    };

    const handleEdit = (seller: Seller) => {
        // Map the nested user role to the flat role_id needed for the form
        const roleId = (seller as any).user?.role_id;
        setEditingSeller({ ...seller, role_id: roleId });
        setIsModalOpen(true);
    };
    
    const handleDeleteConfirm = (seller: Seller) => {
        setDeletingSeller(seller);
    };
    
    const handleSave = async (sellerData: Partial<Seller> & { role_id?: string }, password?: string) => {
        const isNew = !sellerData.id;
    
        try {
            if (isNew) {
                if (!password || !sellerData.email || !sellerData.name || !sellerData.role_id) {
                    throw new Error("Email, name, password, and role are required for new sellers.");
                }
                
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
                    email: sellerData.email,
                    password: password
                });
    
                if (signUpError) {
                    if (signUpError.message.includes('User already registered')) {
                        throw new Error(t('notification.seller.saveErrorUnique'));
                    }
                    throw new Error(signUpError.message);
                }
                if (!newUser) throw new Error("User auth account could not be created.");
    
                // 5. Use the main, admin-authenticated client for all subsequent database writes.
                const newUserId = newUser.id;
    
                try {
                    const { error: profileError } = await supabase.from('users').insert({
                        id: newUserId,
                        email: sellerData.email,
                        full_name: sellerData.name,
                        role_id: sellerData.role_id, // Use selected role
                        is_active: sellerData.is_active
                    });
        
                    if (profileError) throw new Error(profileError.message);
        
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { id, role_id, ...newSellerData } = sellerData;
                    const { error: sellerError } = await supabase.from('sellers').insert({
                        ...newSellerData,
                        user_id: newUserId,
                        created_by: profile?.id
                    });
        
                    if (sellerError) throw new Error(sellerError.message);
                } catch (innerError: any) {
                    // Attempt cleanup of the user record if subsequent steps fail
                    // We cannot delete from auth.users from client, but we can clean public.users to avoid "profile missing" errors later
                    console.error("Creation failed, cleaning up user record...", innerError);
                    await supabase.from('users').delete().eq('id', newUserId);
                    throw innerError;
                }
    
                showNotification(t('notification.seller.added'));
    
            } else {
                // Editing existing seller
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { id, user_id, role_id, ...updateData } = sellerData;
                
                // Update seller table
                const { error: sellerError } = await supabase.from('sellers').update(updateData).eq('id', id!);
                if (sellerError) throw new Error(sellerError.message);
    
                // Update user table (name, active status, and role)
                if (user_id) {
                     const userUpdates: any = { full_name: updateData.name, is_active: updateData.is_active };
                     if (role_id) userUpdates.role_id = role_id; // Update role if provided
                     
                     const { error: userError } = await supabase.from('users').update(userUpdates).eq('id', user_id);
                     if(userError) console.error("Error updating user profile:", userError.message);
                }
                showNotification(t('notification.seller.updated'));
            }
    
            setIsModalOpen(false);
            fetchSellers();
        } catch (error: any) {
            console.error("Save seller error:", error);
            if (error.message && (error.message.toLowerCase().includes('unique constraint') || error.message.includes('seller_code') || error.message.includes('email'))) {
                 throw new Error(t('notification.seller.saveErrorUnique'));
            }
            throw error;
        }
    };
    
    const handleDelete = async () => {
        if (!deletingSeller || !pagePermissions?.can_delete) return;
        
        const { error } = await supabase.from('sellers').delete().eq('id', deletingSeller.id);
        if (error) {
            showNotification(error.message, 'error');
        } else {
            showNotification(t('notification.seller.deleted'));
            fetchSellers();
        }
        setDeletingSeller(null);
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('sellers.title')}</h1>
                {pagePermissions?.can_create && <button onClick={handleAdd} className="flex items-center px-4 py-2 bg-primary dark:bg-dark-primary text-white rounded-md hover:bg-secondary dark:hover:bg-dark-secondary transition-colors"><Plus className="h-5 w-5 mr-2" />{t('sellers.addSeller')}</button>}
            </div>

            {!pagePermissions?.can_view ? <p>{t('error.accessDenied.message')}</p> : (
                <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border overflow-x-auto">
                    <table className="min-w-full divide-y divide-border dark:divide-dark-border">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('sellers.sellerCode')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('sellers.name')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('sellers.email')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('sellers.phoneNumber')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('sellers.active')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('sellers.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-surface dark:bg-dark-surface divide-y divide-border dark:divide-dark-border">
                            {sellers.map(seller => (
                                <tr key={seller.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{seller.seller_code}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{seller.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{seller.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{seller.phone_number}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${seller.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                                            {seller.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                        {pagePermissions?.can_edit && <button onClick={() => handleEdit(seller)} className="text-accent dark:text-dark-accent hover:underline"><Edit className="h-4 w-4 inline" /></button>}
                                        {pagePermissions?.can_delete && <button onClick={() => handleDeleteConfirm(seller)} className="text-red-600 dark:text-red-500 hover:underline"><Trash2 className="h-4 w-4 inline" /></button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            <SellerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} seller={editingSeller} roles={roles} />

            {deletingSeller && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-sm">
                        <div className="p-6 text-center">
                            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                            <h3 className="text-lg font-bold mb-2">{t('form.delete')} Seller</h3>
                            <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-6">{t('sellers.form.confirmDelete')}</p>
                            <div className="flex justify-center gap-4">
                                <button onClick={() => setDeletingSeller(null)} className="px-4 py-2 text-sm font-medium rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800">{t('form.cancel')}</button>
                                <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">{t('form.delete')}</button>
                            </div>
                        </div>
                    </div>
                 </div>
            )}
        </div>
    );
};

export default Sellers;
