
import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase, supabaseUrl, supabaseAnonKey } from '../../services/supabase';
import { UserProfile, Role } from '../../types';
import { Plus, Edit, Trash2, X, AlertTriangle, RefreshCw, Info } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// --- User Form Modal ---
const UserModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (user: Partial<UserProfile>, password?: string) => Promise<void>;
    user: Partial<UserProfile> | null;
    roles: Role[];
    onResetPassword: (email: string) => void;
}> = ({ isOpen, onClose, onSave, user, roles, onResetPassword }) => {
    const { t, showNotification } = useAppContext();
    const [formData, setFormData] = useState<Partial<UserProfile>>({});
    const [password, setPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const isNew = !user?.id;

    useEffect(() => {
        setFormData(user || { is_active: true });
        setPassword('');
        setSaveError(null);
    }, [user]);

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
                    <h2 className="text-xl font-bold">{isNew ? t('users.form.title.add') : t('users.form.title.edit')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X className="h-6 w-6" /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        {saveError && <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md text-sm">{saveError}</div>}
                        
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('users.fullName')}</label>
                            <input type="text" name="full_name" value={formData.full_name || ''} onChange={handleChange} required className="w-full py-2 px-3 bg-transparent border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">{t('users.email')}</label>
                            <input type="email" name="email" value={formData.email || ''} onChange={handleChange} required disabled={!isNew} className="w-full py-2 px-3 bg-transparent border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 dark:disabled:bg-gray-800" />
                        </div>
                        
                        {isNew ? (
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('users.password')}</label>
                                <input type="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full py-2 px-3 bg-transparent border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('users.password')}</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (formData.email) {
                                            onResetPassword(formData.email);
                                            onClose();
                                        }
                                    }}
                                    className="w-full flex justify-center py-2 px-3 border border-transparent text-sm font-medium rounded-md text-white bg-accent dark:bg-dark-accent hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-dark"
                                >
                                    {t('users.resetPassword')}
                                </button>
                            </div>
                        )}
                        
                        <div>
                             <label className="block text-sm font-medium mb-1">{t('users.role')}</label>
                            <select name="role_id" value={formData.role_id || ''} onChange={handleChange} required className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                                <option value="" disabled>{t('permissions.selectRole')}</option>
                                {roles
                                    .filter(role => !isNew || (role.name !== 'Seller' && role.name !== 'Merch'))
                                    .map(role => <option key={role.id} value={role.id}>{role.name}</option>)
                                }
                            </select>
                            {isNew && (
                                <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1 flex items-center gap-1">
                                    <Info className="h-3 w-3" />
                                    To add Sellers or Merchandisers, use their specific management pages.
                                </p>
                            )}
                        </div>
                        
                        <div className="flex items-center space-x-2 pt-2">
                            <input type="checkbox" name="is_active" id="is_active" checked={!!formData.is_active} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                            <label htmlFor="is_active" className="text-sm font-medium">{t('users.active')}</label>
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

const UserManagement: React.FC = () => {
    const { t, permissions, showNotification } = useAppContext();
    const pagePermissions = permissions['User Management'];
    
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<UserProfile> | null>(null);
    const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);

    const fetchUsersAndRoles = useCallback(async () => {
        setLoading(true);
        try {
            const usersPromise = supabase.from('users').select('*, role:user_roles(*)');
            const rolesPromise = supabase.from('user_roles').select('*');
            
            const [{ data: usersData, error: usersError }, { data: rolesData, error: rolesError }] = await Promise.all([usersPromise, rolesPromise]);

            if (usersError) throw usersError;
            if (rolesError) throw rolesError;
            
            if (usersData) setUsers(usersData as UserProfile[]);
            if (rolesData) setRoles(rolesData);
        } catch (error: any) {
            console.error("Error fetching users and roles:", error);
            showNotification(`Failed to fetch users and roles: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [showNotification]);

    useEffect(() => {
        if(pagePermissions?.can_view) {
            fetchUsersAndRoles();
        } else {
            setLoading(false);
        }
    }, [pagePermissions, fetchUsersAndRoles]);

    const handleAdd = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const handleEdit = (user: UserProfile) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleDeleteConfirm = (user: UserProfile) => {
        setDeletingUser(user);
    };
    
    const handleResetPassword = async (email: string) => {
        try {
            // Explicitly set redirectTo to the application's origin. This is often more reliable than omitting it,
            // as it prevents issues if the Supabase project's Site URL is not correctly configured.
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin,
            });
            if (error) throw error;
            showNotification(t('notification.user.passwordResetSent').replace('{email}', email), 'success');
        } catch (error: any) {
            console.error("Error sending password reset:", error);
            showNotification(t('notification.user.passwordResetError').replace('{error}', error.message), 'error');
        }
    };
    
    const handleSave = async (userData: Partial<UserProfile>, password?: string) => {
        const isNew = !userData.id;
    
        try {
            if (isNew) {
                if (!password || !userData.email || !userData.full_name || !userData.role_id) {
                    throw new Error("Email, name, password, and role are required for new users.");
                }
    
                // 1. Create a true, but isolated, in-memory storage adapter.
                const inMemoryStorage = new Map<string, string>();
                // Fix: Ensure setItem and removeItem return void to match Supabase storage type.
                const storageAdapter = {
                    getItem: (key: string) => inMemoryStorage.get(key) || null,
                    setItem: (key: string, value: string) => {
                        inMemoryStorage.set(key, value);
                    },
                    removeItem: (key: string) => {
                        inMemoryStorage.delete(key);
                    },
                };
    
                // Step 2: Create a custom fetch that strips the Authorization header as a safeguard.
                const customFetch: typeof fetch = (input, init) => {
                    const headers = new Headers(init?.headers);
                    headers.delete('Authorization');
                    return fetch(input, { ...init, headers });
                };
    
                // Step 3: Create a temporary, fully isolated Supabase client.
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
                
                // Step 4: Create the user in auth.users. This call is now guaranteed to be anonymous and has a working storage mechanism.
                const { data: { user: newUser }, error: signUpError } = await tempAuthClient.auth.signUp({
                    email: userData.email,
                    password: password,
                });
    
                if (signUpError) {
                    if (signUpError.message.includes('User already registered')) {
                        throw new Error(t('notification.user.saveErrorUnique'));
                    }
                    throw new Error(signUpError.message);
                }
                if (!newUser) {
                    throw new Error("User auth account could not be created.");
                }
    
                // Step 5: Use the main, admin-authenticated client to insert the profile into public.users.
                const { error: profileError } = await supabase.from('users').insert({
                    id: newUser.id,
                    email: userData.email,
                    full_name: userData.full_name,
                    role_id: userData.role_id,
                    is_active: userData.is_active
                });
    
                if (profileError) {
                    console.error("CRITICAL: Auth user created but profile insertion failed. Orphaned user ID:", newUser.id, "Error:", profileError.message);
                    throw new Error(`User account was created, but the profile could not be saved: ${profileError.message}`);
                }
                
                showNotification(t('notification.user.added'), 'success');
    
            } else { // Editing existing user
                const { id, role, ...updateData } = userData;

                const { error } = await supabase.from('users').update(updateData).eq('id', id!);
                if (error) throw new Error(error.message);
                showNotification(t('notification.user.updated'));
            }
    
            setIsModalOpen(false);
            fetchUsersAndRoles();
    
        } catch (error: any) {
             console.error("Save user error:", error);
            if (error.message && error.message.toLowerCase().includes('unique constraint')) {
                throw new Error(t('notification.user.saveErrorUnique'));
            }
            throw error;
        }
    };
    
    const handleDelete = async () => {
        if (!deletingUser || !pagePermissions?.can_delete) return;
        
        // In a real-world scenario, you would need Supabase Admin privileges to delete the auth.users record.
        // As we can't do that from the client-side securely, we will just delete the public.users record.
        // The auth user will be orphaned. A cleanup process (e.g., a Supabase Function) would be needed.
        const { error } = await supabase.from('users').delete().eq('id', deletingUser.id);
        
        if (error) {
            showNotification(error.message, 'error');
        } else {
            showNotification(t('notification.user.deleted'));
            fetchUsersAndRoles();
        }
        setDeletingUser(null);
    };


    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('users.title')}</h1>
                {pagePermissions?.can_create && <button onClick={handleAdd} className="flex items-center px-4 py-2 bg-primary dark:bg-dark-primary text-white rounded-md hover:bg-secondary dark:hover:bg-dark-secondary transition-colors"><Plus className="h-5 w-5 mr-2" />{t('users.addUser')}</button>}
            </div>
            {pagePermissions?.can_view ? (
                <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border overflow-x-auto">
                    <table className="min-w-full divide-y divide-border dark:divide-dark-border">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('users.fullName')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('users.email')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('users.role')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('users.active')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('users.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-surface dark:bg-dark-surface divide-y divide-border dark:divide-dark-border">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary dark:text-dark-text-primary">{user.full_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{user.role?.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                        {pagePermissions?.can_edit && <button onClick={() => handleEdit(user)} className="text-accent dark:text-dark-accent hover:underline"><Edit className="h-4 w-4 inline" /></button>}
                                        {pagePermissions?.can_delete && <button onClick={() => handleDeleteConfirm(user)} className="text-red-600 dark:text-red-500 hover:underline"><Trash2 className="h-4 w-4 inline" /></button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : <p className="text-text-secondary dark:text-dark-text-secondary">You do not have permission to view users.</p>}

             <UserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} user={editingUser} roles={roles} onResetPassword={handleResetPassword} />

            {deletingUser && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
                    <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-sm">
                        <div className="p-6 text-center">
                            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                            <h3 className="text-lg font-bold mb-2">{t('form.delete')} {t('sidebar.userManagement')}</h3>
                            <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-6">{t('users.form.confirmDelete')}</p>
                            <div className="flex justify-center gap-4">
                                <button onClick={() => setDeletingUser(null)} className="px-4 py-2 text-sm font-medium rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800">{t('form.cancel')}</button>
                                <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">{t('form.delete')}</button>
                            </div>
                        </div>
                    </div>
                 </div>
            )}
        </div>
    );
};

export default UserManagement;
