
import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { supabase } from '../services/supabase';
import { Customer, ProblemType } from '../types';
import { ImageUpload } from '../components/ImageUpload';
import { Search, Loader2, Save, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const ReportProblem: React.FC = () => {
    const { t, profile, permissions, showNotification, activeVisit, navigateTo } = useAppContext();
    const pagePermissions = permissions['Report a Problem'];

    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [customerId, setCustomerId] = useState<string>('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
    
    const [problemTypeId, setProblemTypeId] = useState('');
    const [problemTypes, setProblemTypes] = useState<ProblemType[]>([]);
    
    const [description, setDescription] = useState('');
    const [photoFiles, setPhotoFiles] = useState<File[]>([]);

    // Search Debounce
    const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Initial Load & Guard
    useEffect(() => {
        if (!pagePermissions?.can_view) return;

        // --- GUARD: Check for active visit if user is Seller/Merch ---
        const role = profile?.role?.name;
        if ((role === 'Satış' || role === 'Merch') && !activeVisit) {
             showNotification(t('dailyPlan.validation.startVisitFirst'), 'error');
             navigateTo('/daily-plan');
             return;
        }

        // --- PRE-SELECT: If active visit exists, lock customer ---
        if (activeVisit) {
            setCustomerId(activeVisit.customerId);
            setCustomerSearch(activeVisit.customerName);
        }

        const fetchProblemTypes = async () => {
             const { data, error } = await supabase.from('problem_types').select('*').order('name');
             if(error) {
                 console.error("Error fetching problem types", error);
                 showNotification(t('problemReport.updateError').replace('{error}', 'Failed to load types'), "error");
             } else {
                 setProblemTypes(data || []);
             }
        };
        fetchProblemTypes();
    }, [pagePermissions, activeVisit, profile, navigateTo, showNotification, t]);


    useEffect(() => {
        if (activeVisit) return; // Skip search if active visit locked

        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        if (customerSearch) {
            debounceTimeout.current = setTimeout(async () => {
                const lowercased = customerSearch.toLowerCase();
                const { data, error } = await supabase
                    .from('customers')
                    .select('*')
                    .or(`name.ilike.%${lowercased}%,customer_code.ilike.%${lowercased}%`)
                    .limit(10);
                
                if (error) {
                    console.error("Customer search error:", error);
                } else {
                    setFilteredCustomers(data || []);
                }
            }, 300);
        } else {
            setFilteredCustomers([]);
        }
        return () => { if (debounceTimeout.current) clearTimeout(debounceTimeout.current); };
    }, [customerSearch, activeVisit]);

    const handleSelectCustomer = (customer: Customer) => {
        setCustomerId(customer.id);
        setCustomerSearch(customer.name);
        setIsCustomerDropdownOpen(false);
    };

    const handleSave = async () => {
        if (!pagePermissions?.can_create) return;
        if (!customerId || !problemTypeId || !description) {
            showNotification(t('reportProblem.validation.fieldsRequired'), 'error');
            return;
        }

        setIsSaving(true);
        try {
            let photoUrl: string | null = null;
            if (photoFiles.length > 0) {
                const file = photoFiles[0];
                const filePath = `public/${profile?.id}/problem/${uuidv4()}`;
                const { error: uploadError } = await supabase.storage.from('problem_photos').upload(filePath, file);
                if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
                photoUrl = supabase.storage.from('problem_photos').getPublicUrl(filePath).data.publicUrl;
            }

            const { error } = await supabase.from('problems').insert({
                customer_id: customerId,
                problem_type_id: problemTypeId,
                description: description,
                photo_url: photoUrl,
                status: 'Pending',
                created_by: profile?.id
            });

            if (error) throw error;

            showNotification(t('reportProblem.saveSuccess'), 'success');
            
            // Reset form (except customer if active visit)
            if (!activeVisit) {
                 setCustomerId('');
                 setCustomerSearch('');
            }
            setProblemTypeId('');
            setDescription('');
            setPhotoFiles([]);

        } catch (error: any) {
            showNotification(t('reportProblem.saveError').replace('{error}', error.message), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (!pagePermissions?.can_view) return <p>{t('error.accessDenied.message')}</p>;

    return (
        <div className="space-y-6 max-w-3xl mx-auto animate-fade-in-up">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('reportProblem.title')}</h1>
                {pagePermissions.can_create && (
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center justify-center px-6 py-2 bg-primary dark:bg-dark-primary text-white font-semibold rounded-md hover:bg-secondary dark:hover:bg-dark-secondary transition-colors disabled:opacity-50 shadow-md">
                        {isSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                        {isSaving ? t('common.saving') : t('form.save')}
                    </button>
                 )}
            </div>

            <div className="p-6 bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border space-y-6">
                <div className="relative">
                    <label className="block text-sm font-medium mb-1">{t('reportProblem.customer')}</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={customerSearch}
                            onChange={e => { setCustomerSearch(e.target.value); setIsCustomerDropdownOpen(true); if(!e.target.value) setCustomerId(''); }}
                            onFocus={() => !activeVisit && setIsCustomerDropdownOpen(true)}
                            placeholder={t('reportProblem.searchCustomer')}
                            className={`w-full py-2 pl-10 pr-4 bg-transparent border border-border dark:border-dark-border rounded-md ${activeVisit ? 'cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''}`}
                            readOnly={!!activeVisit}
                        />
                    </div>
                    {isCustomerDropdownOpen && filteredCustomers.length > 0 && !activeVisit && (
                        <ul className="absolute z-10 w-full bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                            {filteredCustomers.map(cust => (
                                <li key={cust.id} onClick={() => handleSelectCustomer(cust)} className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm">
                                    {cust.name} ({cust.customer_code})
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">{t('reportProblem.problemType')}</label>
                    <select 
                        value={problemTypeId} 
                        onChange={e => setProblemTypeId(e.target.value)} 
                        className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-sm"
                    >
                        <option value="">{t('reportProblem.selectProblemType')}</option>
                        {problemTypes.map(type => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium mb-1 uppercase tracking-widest text-text-secondary">{t('reportProblem.status')}</label>
                     <div className="w-full py-2 px-3 bg-gray-100 dark:bg-gray-800 border border-border dark:border-dark-border rounded-md flex items-center text-text-secondary text-sm font-bold">
                        <AlertCircle className="h-4 w-4 mr-2 text-yellow-500"/>
                        {t('problemReport.status.Pending')}
                     </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">{t('reportProblem.description')}</label>
                    <textarea
                         value={description} 
                         onChange={e => setDescription(e.target.value)} 
                         rows={4}
                         className="w-full py-2 px-3 bg-transparent border border-border dark:border-dark-border rounded-md text-sm"
                    />
                </div>

                <div>
                    <ImageUpload
                        files={photoFiles}
                        onChange={setPhotoFiles}
                        maxFiles={1}
                        label={t('reportProblem.photo')}
                        buttonText={t('common.addPhoto')}
                    />
                </div>
            </div>
        </div>
    );
};

export default ReportProblem;
