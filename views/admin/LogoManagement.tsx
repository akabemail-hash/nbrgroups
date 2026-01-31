
import React, { useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { Save, Loader2 } from 'lucide-react';
import { ImageUpload } from '../../components/ImageUpload';

const LogoManagement: React.FC = () => {
    const { t, logoUrl, setLogoUrl, showNotification, permissions } = useAppContext();
    const pagePermissions = permissions['Logo Management'];

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!logoFile) {
            showNotification(t('logoManagement.noFile'), 'error');
            return;
        }
        if (!pagePermissions?.can_edit) return;

        setIsSaving(true);
        try {
            // 1. Upload file to storage, overwriting existing file
            const filePath = `public/app_logo.${logoFile.name.split('.').pop() || 'png'}`;
            const { error: uploadError } = await supabase.storage
                .from('logos')
                .upload(filePath, logoFile, {
                    cacheControl: '3600',
                    upsert: true,
                });
            
            if (uploadError) throw new Error(t('logoManagement.uploadError').replace('{error}', uploadError.message));

            // 2. Get public URL with a timestamp to bust cache
            const { data: urlData } = supabase.storage.from('logos').getPublicUrl(filePath);
            const newUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`;

            // 3. Save URL to settings table
            const { error: dbError } = await supabase
                .from('settings')
                .upsert({ key: 'app_logo_url', value: newUrl });

            if (dbError) throw new Error(t('logoManagement.saveError').replace('{error}', dbError.message));

            // 4. Update context and show success
            setLogoUrl(newUrl);
            showNotification(t('logoManagement.saveSuccess'), 'success');
            setLogoFile(null); // Clear the file after successful upload

        } catch (error: any) {
            showNotification(error.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    if (!pagePermissions?.can_view) {
        return <p className="text-text-secondary dark:text-dark-text-secondary">{t('error.accessDenied.message')}</p>;
    }

    // If there's a file being uploaded, ImageUpload shows its preview.
    // If not, we can show the current logo from the context as a placeholder.
    const currentFiles = logoFile ? [logoFile] : [];
    const currentLogoPreview = !logoFile && logoUrl ? [logoUrl] : [];

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('logoManagement.title')}</h1>
            <div className="p-6 bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border space-y-6">
                
                <ImageUpload
                    files={currentFiles}
                    onChange={(files) => setLogoFile(files[0] || null)}
                    maxFiles={1}
                    label={logoFile ? t('logoManagement.newLogoPreview') : t('logoManagement.currentLogo')}
                    buttonText={t('common.uploadNew')}
                />
                
                {/* Show current logo if no new one is being uploaded */}
                {!logoFile && logoUrl && (
                     <div className="w-48 h-48 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center border border-border dark:border-dark-border">
                        <img src={logoUrl} alt="Current Logo" className="max-w-full max-h-full object-contain rounded-lg" />
                     </div>
                )}
                
                {pagePermissions?.can_edit && (
                    <div className="flex justify-end pt-4 border-t border-border dark:border-dark-border">
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !logoFile}
                            className="flex items-center justify-center px-6 py-2 bg-primary dark:bg-dark-primary text-white font-semibold rounded-md hover:bg-secondary dark:hover:bg-dark-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                            {isSaving ? t('logoManagement.saving') : t('logoManagement.save')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LogoManagement;