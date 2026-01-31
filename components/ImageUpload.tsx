
import React, { useRef, useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Camera as CameraIcon, X, Image as ImageIcon } from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { dataUrlToFile } from '../utils/file';

interface ImageUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  label: string;
  buttonText: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  files, 
  onChange, 
  maxFiles = 1,
  label,
  buttonText
}) => {
  const { t, showNotification } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isPromptOpen, setIsPromptOpen] = useState(false);

  useEffect(() => {
    // Create blob URLs for previews
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);

    // Cleanup function to revoke blob URLs
    return () => {
      newPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [files]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    const newFiles: File[] = Array.from(selectedFiles);
    const totalFiles = files.length + newFiles.length;

    if (totalFiles > maxFiles) {
      showNotification(t('imageUpload.maxFilesReached').replace('{maxFiles}', String(maxFiles)), 'error');
      const allowedNewFiles = newFiles.slice(0, maxFiles - files.length);
      onChange([...files, ...allowedNewFiles]);
    } else {
      onChange([...files, ...newFiles]);
    }
  };

  const initiateSelection = () => {
    if (files.length >= maxFiles) {
        showNotification(t('imageUpload.maxFilesReached').replace('{maxFiles}', String(maxFiles)), 'error');
        return;
    }

    if (Capacitor.isNativePlatform()) {
        setIsPromptOpen(true);
    } else {
        fileInputRef.current?.click();
    }
  }

  const handleNativeSelect = async (source: CameraSource) => {
      setIsPromptOpen(false);
      try {
        const photo = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: source,
        });

        if (photo.dataUrl) {
          const newFile = await dataUrlToFile(photo.dataUrl, `photo_${Date.now()}.${photo.format}`);
          onChange([...files, newFile]);
        } else {
          showNotification(t('imageUpload.failedToCaptureImage'), 'error');
        }
      } catch (error) {
        if (String(error).includes('User cancelled photos app') || String(error).includes('cancelled')) {
            return; 
        }
        console.error('Capacitor Camera error:', error);
        showNotification(t('imageUpload.failedToAccessCamera'), 'error');
      }
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    onChange(updatedFiles);
  };

  return (
    <div className="space-y-4">
      <label className="block text-lg font-semibold">{label}</label>
      
      <div className="flex space-x-2">
        <button 
          type="button" 
          onClick={initiateSelection}
          disabled={files.length >= maxFiles}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          <CameraIcon className="w-4 h-4 mr-2" />
          <span>{buttonText}</span>
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={maxFiles > 1}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <div className={`grid gap-4 ${maxFiles === 1 ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'}`}>
          {previews.map((preview, index) => (
            <div key={index} className="relative group w-48 h-48">
              <img
                src={preview}
                alt={`Upload preview ${index + 1}`}
                className="w-full h-full object-cover rounded-lg border border-border dark:border-dark-border"
              />
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length >= maxFiles && (
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
          {t('imageUpload.maxFilesReached').replace('{maxFiles}', String(maxFiles))}
        </p>
      )}

      {/* Custom Source Selection Modal for Native Devices */}
      {isPromptOpen && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
              <div className="bg-surface dark:bg-dark-surface w-full max-w-xs rounded-xl shadow-2xl overflow-hidden transform scale-100 transition-all">
                  <div className="p-4 border-b border-border dark:border-dark-border text-center">
                      <h3 className="font-semibold text-lg text-text-primary dark:text-dark-text-primary">{t('common.chooseSource')}</h3>
                  </div>
                  <div className="p-2 space-y-2">
                      <button 
                          onClick={() => handleNativeSelect(CameraSource.Camera)}
                          className="w-full flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full mr-3">
                              <CameraIcon className="w-5 h-5" />
                          </div>
                          <span className="font-medium text-text-primary dark:text-dark-text-primary">{t('common.camera')}</span>
                      </button>
                      <button 
                          onClick={() => handleNativeSelect(CameraSource.Photos)}
                          className="w-full flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                           <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full mr-3">
                              <ImageIcon className="w-5 h-5" />
                          </div>
                          <span className="font-medium text-text-primary dark:text-dark-text-primary">{t('common.gallery')}</span>
                      </button>
                  </div>
                  <div className="p-2 border-t border-border dark:border-dark-border">
                      <button 
                          onClick={() => setIsPromptOpen(false)}
                          className="w-full py-2 text-center text-red-500 font-medium hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                      >
                          {t('form.cancel')}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
