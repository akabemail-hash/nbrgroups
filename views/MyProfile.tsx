
import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { supabase } from '../services/supabase';
import { Seller, Merch } from '../types';
import { Save, Loader2, KeyRound, User, Phone } from 'lucide-react';

const MyProfile: React.FC = () => {
    const { t, profile, showNotification } = useAppContext();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form state
    const [fullName, setFullName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // Role-specific state
    const [isSellerOrMerch, setIsSellerOrMerch] = useState(false);
    const [roleTableName, setRoleTableName] = useState<'sellers' | 'merchs' | null>(null);

    const fetchRoleSpecificData = useCallback(async () => {
        if (!profile) return;
        
        const roleName = profile.role?.name;
        let tableName: 'sellers' | 'merchs' | null = null;
        if (roleName === 'Satış') tableName = 'sellers';
        if (roleName === 'Merch') tableName = 'merchs';

        setRoleTableName(tableName);

        if (tableName) {
            setIsSellerOrMerch(true);
            try {
                const { data, error } = await supabase
                    .from(tableName)
                    .select('phone_number')
                    .eq('user_id', profile.id)
                    .single();
                
                if (error && error.code !== 'PGRST116') throw error; // Ignore 'exact one row' error if profile doesn't exist yet
                setPhoneNumber(data?.phone_number || '');

            } catch (error: any) {
                showNotification(`Failed to load profile details: ${error.message}`, 'error');
            }
        }
    }, [profile, showNotification]);

    useEffect(() => {
        setLoading(true);
        if (profile) {
            setFullName(profile.full_name);
            fetchRoleSpecificData().finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [profile, fetchRoleSpecificData]);
    
    const handleSave = async () => {
        if (!profile) return;
        
        setIsSaving(true);
        try {
            const promises = [];
            let passwordUpdated = false;

            // 1. Update password if provided and valid
            if (password) {
                if (password.length < 6) {
                    throw new Error(t('profile.passwordMinLength'));
                }
                if (password !== confirmPassword) {
                    throw new Error(t('profile.passwordMismatch'));
                }
                promises.push(supabase.auth.updateUser({ password }));
                passwordUpdated = true;
            }

            // 2. Update full_name in public.users
            if (fullName !== profile.full_name) {
                promises.push(supabase.from('users').update({ full_name: fullName }).eq('id', profile.id));
            }
            
            // 3. Update name and phone_number in sellers/merchs table
            if (roleTableName) {
                // Check if data actually changed before updating
                const { data: currentRoleData } = await supabase.from(roleTableName).select('name, phone_number').eq('user_id', profile.id).single();
                if (currentRoleData?.name !== fullName || currentRoleData?.phone_number !== phoneNumber) {
                    const roleDataToUpdate: { name: string; phone_number: string } = { name: fullName, phone_number: phoneNumber };
                    promises.push(supabase.from(roleTableName).update(roleDataToUpdate).eq('user_id', profile.id));
                }
            }
            
            if (promises.length === 0) {
                showNotification("No changes to save.", "info");
                setIsSaving(false);
                return;
            }

            const results = await Promise.allSettled(promises);
            
            const errors = results.filter(r => r.status === 'rejected').map((r: any) => r.reason?.message || 'Unknown error');
            if (errors.length > 0) {
                throw new Error(errors.join(', '));
            }

            showNotification(t('profile.updateSuccess'), 'success');
            if (passwordUpdated) {
                 showNotification(t('profile.passwordUpdateSuccess'), 'success');
                 setPassword('');
                 setConfirmPassword('');
            }

        } catch (error: any) {
            showNotification(t('profile.updateError').replace('{error}', error.message), 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    if (loading) {
        return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;
    }
    
    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('profile.title')}</h1>
            
            <div className="p-6 bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border space-y-8">
                {/* Personal Information Section */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2"><User /> {t('profile.personalInfo')}</h2>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('users.fullName')}</label>
                        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full py-2 px-3 bg-transparent border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('users.email')}</label>
                        <input type="email" value={profile?.email || ''} disabled className="w-full py-2 px-3 bg-gray-100 dark:bg-gray-800 border border-border dark:border-dark-border rounded-md cursor-not-allowed" />
                    </div>
                    {isSellerOrMerch && (
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('sellers.phoneNumber')}</label>
                            <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="w-full py-2 px-3 bg-transparent border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                    )}
                </div>

                {/* Password Section */}
                <div className="space-y-4 pt-6 border-t border-border dark:border-dark-border">
                    <h2 className="text-xl font-semibold flex items-center gap-2"><KeyRound /> {t('profile.passwordSection')}</h2>
                     <div>
                        <label className="block text-sm font-medium mb-1">{t('users.newPassword')}</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('users.newPassword.placeholder')} className="w-full py-2 px-3 bg-transparent border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium mb-1">{t('profile.confirmPassword')}</label>
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full py-2 px-3 bg-transparent border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center justify-center px-6 py-2 bg-primary dark:bg-dark-primary text-white font-semibold rounded-md hover:bg-secondary dark:hover:bg-dark-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                        {isSaving ? t('common.saving') : t('form.save')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MyProfile;
