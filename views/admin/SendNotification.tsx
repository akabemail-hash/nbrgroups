
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { UserProfile, Role } from '../../types';
import { Send, Loader2, Users, Shield, User, Link } from 'lucide-react';

const SendNotification: React.FC = () => {
    const { t, permissions, showNotification, profile } = useAppContext();
    const pagePermissions = permissions['Send Notification'];

    const [message, setMessage] = useState('');
    const [link, setLink] = useState('');
    const [targetType, setTargetType] = useState<'all' | 'role' | 'users'>('all');
    const [selectedRoleId, setSelectedRoleId] = useState<string>('');
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        const fetchInitialData = async () => {
            if (!pagePermissions?.can_view) {
                setLoading(false);
                return;
            }
            try {
                const usersPromise = supabase.from('users').select('*').order('full_name');
                const rolesPromise = supabase.from('user_roles').select('*').order('name');
                const [{ data: usersData, error: usersError }, { data: rolesData, error: rolesError }] = await Promise.all([usersPromise, rolesPromise]);
                
                if (usersError) throw usersError;
                if (rolesError) throw rolesError;

                setUsers(usersData || []);
                setRoles(rolesData || []);
            } catch (error: any) {
                console.error("Failed to fetch users and roles:", error);
                showNotification(`Failed to load data: ${error.message}`, 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [pagePermissions, showNotification]);

    const handleSend = async () => {
        if (!message.trim() || !pagePermissions?.can_create) return;
        setIsSending(true);

        try {
            // 1. Get the list of target user IDs
            let targetUserIds: string[] = [];
            if (targetType === 'all') {
                targetUserIds = users.map(u => u.id);
            } else if (targetType === 'role' && selectedRoleId) {
                const { data, error } = await supabase.from('users').select('id').eq('role_id', selectedRoleId);
                if (error) throw error;
                targetUserIds = data.map(u => u.id);
            } else if (targetType === 'users') {
                targetUserIds = selectedUserIds;
            }

            if (targetUserIds.length === 0) {
                throw new Error("No target users selected.");
            }

            // 2. Insert the notification message
            const { data: notificationData, error: notificationError } = await supabase
                .from('notifications')
                .insert({ message, link: link || null, created_by: profile?.id })
                .select()
                .single();
            
            if (notificationError) throw notificationError;
            const newNotificationId = notificationData.id;

            // 3. Link the notification to the target users
            const userNotifications = targetUserIds.map(userId => ({
                user_id: userId,
                notification_id: newNotificationId,
            }));

            const { error: linkError } = await supabase.from('user_notifications').insert(userNotifications);
            if (linkError) throw linkError;

            // --- PUSH NOTIFICATION (SERVER-SIDE) ---
            // To send a real push notification to mobile devices, you would now
            // invoke a secure Supabase Edge Function. Exposing service keys
            // on the client is a major security risk.
            //
            // Example:
            // await supabase.functions.invoke('send-push-notification', {
            //   body: { userIds: targetUserIds, title: 'New Message', body: message, link: link },
            // });


            showNotification(t('notification.sent.success'));
            setMessage('');
            setLink('');
            setTargetType('all');
            setSelectedRoleId('');
            setSelectedUserIds([]);
        } catch (error: any) {
            showNotification(t('notification.sent.error').replace('{error}', error.message), 'error');
        } finally {
            setIsSending(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!pagePermissions?.can_view) return <p className="text-text-secondary dark:text-dark-text-secondary">{t('error.accessDenied.message')}</p>;

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('sendNotification.title')}</h1>
            
            <div className="p-6 bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border space-y-6">
                <div>
                    <label htmlFor="message" className="block text-sm font-medium mb-2">{t('sendNotification.message')}</label>
                    <textarea
                        id="message"
                        rows={5}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={t('sendNotification.messagePlaceholder')}
                        className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={!pagePermissions.can_create}
                    />
                </div>
                
                <div>
                    <label htmlFor="link" className="block text-sm font-medium mb-2">{t('sendNotification.link')}</label>
                    <div className="relative">
                        <Link className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="url"
                            id="link"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            placeholder={t('sendNotification.linkPlaceholder')}
                            className="w-full pl-10 pr-3 py-2 bg-transparent border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            disabled={!pagePermissions.can_create}
                        />
                    </div>
                    <p className="mt-1 text-xs text-text-secondary dark:text-dark-text-secondary italic">
                        {t('sendNotification.linkHelp')}
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">{t('sendNotification.target')}</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button onClick={() => setTargetType('all')} disabled={!pagePermissions.can_create} className={`flex flex-col items-center justify-center p-4 border rounded-lg transition-colors ${targetType === 'all' ? 'border-primary dark:border-dark-primary bg-primary/10' : 'border-border dark:border-dark-border hover:border-gray-400 dark:hover:border-gray-500'}`}>
                            <Users className="h-6 w-6 mb-2"/>
                            <span>{t('sendNotification.allUsers')}</span>
                        </button>
                        <button onClick={() => setTargetType('role')} disabled={!pagePermissions.can_create} className={`flex flex-col items-center justify-center p-4 border rounded-lg transition-colors ${targetType === 'role' ? 'border-primary dark:border-dark-primary bg-primary/10' : 'border-border dark:border-dark-border hover:border-gray-400 dark:hover:border-gray-500'}`}>
                            <Shield className="h-6 w-6 mb-2"/>
                            <span>{t('sendNotification.role')}</span>
                        </button>
                        <button onClick={() => setTargetType('users')} disabled={!pagePermissions.can_create} className={`flex flex-col items-center justify-center p-4 border rounded-lg transition-colors ${targetType === 'users' ? 'border-primary dark:border-dark-primary bg-primary/10' : 'border-border dark:border-dark-border hover:border-gray-400 dark:hover:border-gray-500'}`}>
                            <User className="h-6 w-6 mb-2"/>
                            <span>{t('sendNotification.users')}</span>
                        </button>
                    </div>
                </div>

                {targetType === 'role' && (
                    <div className="animate-fade-in-up">
                        <select
                            value={selectedRoleId}
                            onChange={(e) => setSelectedRoleId(e.target.value)}
                            className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md"
                            disabled={!pagePermissions.can_create}
                        >
                            <option value="">{t('sendNotification.selectRole')}</option>
                            {roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                        </select>
                    </div>
                )}
                
                {targetType === 'users' && (
                    <div className="animate-fade-in-up">
                        <p className="text-sm font-medium mb-2">{t('sendNotification.selectUsers')}</p>
                        <div className="max-h-60 overflow-y-auto border border-border dark:border-dark-border rounded-md p-2 space-y-2">
                           {users.map(user => (
                                <label key={user.id} className="flex items-center space-x-3 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md">
                                    <input
                                        type="checkbox"
                                        checked={selectedUserIds.includes(user.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedUserIds([...selectedUserIds, user.id]);
                                            } else {
                                                setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                                            }
                                        }}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        disabled={!pagePermissions.can_create}
                                    />
                                    <span>{user.full_name}</span>
                                </label>
                           ))}
                        </div>
                    </div>
                )}
                
                {pagePermissions.can_create && (
                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSend}
                            disabled={isSending || !message.trim()}
                            className="flex items-center justify-center px-6 py-2 bg-primary dark:bg-dark-primary text-white font-semibold rounded-md hover:bg-secondary dark:hover:bg-dark-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSending ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Send className="h-5 w-5 mr-2" />}
                            {isSending ? t('sendNotification.sending') : t('sendNotification.button')}
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

export default SendNotification;
