
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { supabase } from '../services/supabase';
import { Customer, VisitType, NoVisitReason } from '../types';
import { Loader2, X, Check, AlertTriangle, CheckCircle, Save, Search, ChevronLeft, ChevronRight, XCircle, Clock, Play, MapPin, MoreHorizontal, LogOut } from 'lucide-react';

interface PlannedCustomer extends Customer {
  completed: boolean;
  is_skipped?: boolean;
}

const ITEMS_PER_PAGE = 12;

const getErrorMessage = (error: any): string => {
    if (!error) return 'Unknown error';
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    if (error.error_description) return error.error_description;
    try {
        return JSON.stringify(error);
    } catch {
        return 'An error occurred';
    }
};

const VisitOptionsModal: React.FC<{
    customer: Customer;
    onClose: () => void;
    onStartVisit: () => void;
    onNoVisit: () => void;
}> = ({ customer, onClose, onStartVisit, onNoVisit }) => {
    const { t } = useAppContext();
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-surface dark:bg-dark-surface rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="p-4 border-b border-border dark:border-dark-border flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                    <h3 className="font-bold text-lg text-text-primary dark:text-dark-text-primary">{t('dailyPlan.visitOptions')}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                
                <div className="p-6">
                    <div className="text-center mb-6">
                        <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-3">
                            <MapPin className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h4 className="text-xl font-bold mb-1">{customer.name}</h4>
                        <p className="text-sm text-text-secondary">{t('dailyPlan.visitOptionsDesc').replace('{customerName}', '')}</p>
                    </div>

                    <div className="space-y-3">
                        <button 
                            onClick={onStartVisit}
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md transition-all flex items-center justify-center gap-2 transform active:scale-95"
                        >
                            <Play className="h-5 w-5 fill-current" />
                            {t('dailyPlan.action.start')}
                        </button>
                        
                        <button 
                            onClick={onNoVisit}
                            className="w-full py-3 px-4 bg-white dark:bg-gray-800 border-2 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 transform active:scale-95"
                        >
                            <XCircle className="h-5 w-5" />
                            {t('dailyPlan.action.noVisit')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const NoVisitFormModal: React.FC<{
    customer: Customer;
    onClose: () => void;
    onSave: (noVisitData: any) => Promise<void>;
    reasons: NoVisitReason[];
}> = ({ customer, onClose, onSave, reasons }) => {
    const { t } = useAppContext();
    const [reasonId, setReasonId] = useState('');
    const [explanation, setExplanation] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!reasonId) {
            setError(t('dailyPlan.validation.selectReason'));
            return;
        }
        setIsSaving(true);
        try {
            await onSave({
                customer_id: customer.id,
                is_visit: false,
                no_visit_reason_id: reasonId,
                no_visit_description: explanation,
                visit_datetime: new Date().toISOString()
            });
        } catch (err: any) {
            setError(getErrorMessage(err));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center p-4 border-b border-border dark:border-dark-border">
                    <h2 className="text-xl font-bold">{t('dailyPlan.noVisitFormTitle')}</h2>
                    <button onClick={onClose}><X className="h-6 w-6" /></button>
                </div>
                <div className="p-6 space-y-4">
                    {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
                    <div>
                        <h3 className="font-bold">{customer.name}</h3>
                        <p className="text-sm text-text-secondary">{customer.customer_code}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('dailyPlan.noVisitReason')}</label>
                        <select 
                            value={reasonId} 
                            onChange={e => setReasonId(e.target.value)} 
                            className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-sm"
                        >
                            <option value="">{t('dailyPlan.dropdown.selectReason')}</option>
                            {reasons.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                    {reasonId && (
                        <div className="animate-fade-in-up">
                            <label className="block text-sm font-medium mb-1">{t('dailyPlan.explanation')}</label>
                            <textarea 
                                value={explanation} 
                                onChange={e => setExplanation(e.target.value)} 
                                rows={4} 
                                className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-sm"
                                placeholder={t('dailyPlan.reasonPlaceholder')}
                            />
                        </div>
                    )}
                </div>
                <div className="flex justify-end items-center p-4 border-t border-border dark:border-dark-border">
                    <button onClick={onClose} className="px-4 py-2 mr-2 rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">{t('form.cancel')}</button>
                    <button onClick={handleSubmit} disabled={isSaving} className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center">
                        {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-5 w-5" />}
                        {isSaving ? t('common.saving') : t('form.save')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const DailyPlan: React.FC = () => {
    const { t, profile, permissions, showNotification, activeVisit, startVisit, endVisit, navigateTo } = useAppContext();
    const pagePermissions = permissions['Daily Plan'];
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string|null>(null);
    const [plannedCustomers, setPlannedCustomers] = useState<PlannedCustomer[]>([]);
    const [noVisitReasons, setNoVisitReasons] = useState<NoVisitReason[]>([]);
    
    // Modals state
    const [selectedCustomerForOptions, setSelectedCustomerForOptions] = useState<Customer|null>(null);
    const [selectedCustomerForNoVisit, setSelectedCustomerForNoVisit] = useState<Customer|null>(null);
    
    // Search and Pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const isSeller = profile?.role?.name === 'Satış';
    const isMerch = profile?.role?.name === 'Merch';
    
    const fetchDailyPlan = useCallback(async () => {
        if (!profile || !pagePermissions?.can_view || (!isSeller && !isMerch)) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const rpcPlanName = isSeller ? 'get_daily_plan_for_seller' : 'get_daily_plan_for_merch';
            const { data: customersData, error: rpcError } = await supabase.rpc(rpcPlanName);

            if (rpcError) throw rpcError;

            if (!customersData || customersData.length === 0) {
                setPlannedCustomers([]);
            } else {
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                
                const roleTable = isSeller ? 'sellers' : 'merchs';
                const visitTable = isSeller ? 'seller_visits' : 'merch_visits';
                const roleIdField = isSeller ? 'seller_id' : 'merch_id';

                const { data: roleProfile, error: roleError } = await supabase
                    .from(roleTable)
                    .select('id')
                    .eq('user_id', profile.id)
                    .single();
                
                if (roleError || !roleProfile) throw new Error(t('salesDashboard.error.profileLink').replace('{roleName}', profile.role?.name || ''));

                const { data: visitsData, error: visitsError } = await supabase
                    .from(visitTable)
                    .select('customer_id, is_visit')
                    .eq(roleIdField, roleProfile.id)
                    .gte('visit_datetime', todayStart.toISOString());
                
                if(visitsError) throw visitsError;

                const visitStatusMap = new Map((visitsData || []).map(v => [v.customer_id, v.is_visit]));

                const customersWithStatus: PlannedCustomer[] = (customersData as Customer[]).map(c => {
                    const isCompleted = visitStatusMap.has(c.id);
                    const isVisit = isCompleted ? visitStatusMap.get(c.id) : null;
                    return {
                        ...c,
                        completed: isCompleted,
                        is_skipped: isVisit === false
                    };
                });
                
                setPlannedCustomers(customersWithStatus);
            }
            
            const { data: nvRes } = await supabase.from('no_visit_reasons').select('*').order('name');
            setNoVisitReasons(nvRes || []);

        } catch(err: any) {
            const message = getErrorMessage(err);
            setError(message);
            showNotification(message, 'error');
        } finally {
            setLoading(false);
        }
    }, [profile, pagePermissions, showNotification, isSeller, isMerch, t]);

    useEffect(() => {
        fetchDailyPlan();
    }, [fetchDailyPlan]);

    // --- VISIT LOGIC ---

    const handleCustomerClick = (customer: Customer) => {
        if (activeVisit) {
             if (activeVisit.customerId === customer.id) {
                 // If clicking the active visit card, go to form
                 navigateTo('/customer-visit-form');
             } else {
                 showNotification("Another visit is already in progress. Please finish it first.", "error");
             }
        } else {
            // Open options modal
            setSelectedCustomerForOptions(customer);
        }
    };

    const handleStartVisit = () => {
        if (selectedCustomerForOptions) {
            startVisit(selectedCustomerForOptions);
            setSelectedCustomerForOptions(null);
            navigateTo('/customer-visit-form');
        }
    };

    const handleNoVisitOption = () => {
        const cust = selectedCustomerForOptions;
        setSelectedCustomerForOptions(null);
        setSelectedCustomerForNoVisit(cust);
    };
    
    // Logic for ending visit from Daily Plan
    const handleEndVisit = () => {
        if (!activeVisit) return;
        
        // Check if form was saved
        if (activeVisit.isSaved) {
            endVisit();
            // Refresh plan to show completed status immediately
            fetchDailyPlan(); 
        } else {
            showNotification("Please fill out and save the visit form first.", "info");
            navigateTo('/customer-visit-form');
        }
    };

    const handleContinueVisit = () => {
        navigateTo('/customer-visit-form');
    };

    const handleSaveNoVisit = async (visitData: any) => {
        try {
            let tableName: 'seller_visits' | 'merch_visits' = isSeller ? 'seller_visits' : 'merch_visits';
            const roleTable = isSeller ? 'sellers' : 'merchs';
            const roleIdField = isSeller ? 'seller_id' : 'merch_id';

            const { data: roleProfile } = await supabase.from(roleTable).select('id').eq('user_id', profile!.id).single();
            if(!roleProfile) throw new Error("Profile not found");
            
            const finalVisitData = { 
                ...visitData, 
                created_by: profile!.id,
                [roleIdField]: roleProfile.id 
            };

            const { error: insertError } = await supabase.from(tableName).insert(finalVisitData);
            if (insertError) throw insertError;
            
            showNotification("No-visit logged successfully.", 'success');
            setSelectedCustomerForNoVisit(null);
            
            fetchDailyPlan();
        } catch (error: any) {
            throw new Error(t('notification.sellerVisit.saveError').replace('{error}', getErrorMessage(error)));
        }
    };

    const filteredCustomers = useMemo(() => {
        if (!searchTerm) return plannedCustomers;
        const lowerTerm = searchTerm.toLowerCase();
        return plannedCustomers.filter(c => 
            c.name.toLowerCase().includes(lowerTerm) || 
            c.customer_code.toLowerCase().includes(lowerTerm)
        );
    }, [plannedCustomers, searchTerm]);

    const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
    const paginatedCustomers = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredCustomers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredCustomers, currentPage]);

    if (loading) return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;
    
    if (error) {
        return (
            <div className="p-4 bg-surface dark:bg-dark-surface rounded-lg text-center">
                 <div className="p-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">{t('dailyPlan.error.loadFailed')}</h3>
                    <p className="text-red-600 dark:text-red-300 mt-2">{error}</p>
                </div>
            </div>
        );
    }
    
    if (!pagePermissions?.can_view) return <p>{t('error.accessDenied.message')}</p>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold">{t('dailyPlan.title')}</h1>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('customersMap.searchPlaceholder')}
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-10 pr-4 py-2 border border-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface focus:ring-2 focus:ring-primary"
                    />
                </div>
            </div>
            
            {activeVisit && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg flex items-center justify-between shadow-sm animate-pulse">
                    <div className="flex items-center gap-3">
                         <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                         <div>
                             <p className="font-bold text-blue-800 dark:text-blue-200">{t('dailyPlan.visitInProgress')}</p>
                             <p className="text-sm text-blue-600 dark:text-blue-300">{activeVisit.customerName}</p>
                         </div>
                    </div>
                    <button 
                        onClick={handleContinueVisit}
                        className="px-4 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors shadow-md text-sm flex items-center gap-2"
                    >
                         {t('dailyPlan.action.continue')} <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            )}
            
            {plannedCustomers.length === 0 ? (
                <div className="text-center p-12 bg-surface dark:bg-dark-surface rounded-lg border border-border">
                    <p className="text-text-secondary">{t('dailyPlan.noPlan')}</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {paginatedCustomers.map(customer => {
                            const isVisitingThis = activeVisit?.customerId === customer.id;
                            const isOtherVisiting = activeVisit && activeVisit.customerId !== customer.id;
                            
                            return (
                            <div 
                                key={customer.id} 
                                onClick={() => !customer.completed && !isOtherVisiting ? handleCustomerClick(customer) : null}
                                className={`rounded-lg shadow-md p-5 flex flex-col justify-between transition-all transform duration-200 border-l-4 relative overflow-hidden group
                                    ${customer.completed 
                                        ? customer.is_skipped ? 'bg-red-50 dark:bg-red-900/20 border-red-500' : 'bg-green-50 dark:bg-green-900/20 border-green-500' 
                                        : isVisitingThis ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 ring-2 ring-blue-500' : 'bg-surface dark:bg-dark-surface border-amber-500 hover:-translate-y-1 hover:shadow-lg cursor-pointer'
                                    } 
                                    ${isOtherVisiting ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                                `}
                            >
                                <div>
                                    <h3 className="font-bold text-lg text-text-primary dark:text-dark-text-primary">{customer.name}</h3>
                                    <p className="text-sm text-text-secondary">{customer.customer_code}</p>
                                    <p className="text-sm mt-1 text-text-secondary">{customer.address}</p>
                                </div>
                                <div className="mt-4 flex flex-col gap-2">
                                    {customer.completed ? (
                                        <div className="flex items-center justify-center gap-2 font-bold py-2">
                                            {customer.is_skipped ? (
                                                <><XCircle className="text-red-600" /> <span className="text-red-600">{t('dailyPlan.noVisit')}</span></>
                                            ) : (
                                                <><CheckCircle className="text-green-600" /> <span className="text-green-600">{t('dailyPlan.status.completed')}</span></>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            {!activeVisit && (
                                                <div className="flex items-center justify-center text-primary dark:text-dark-primary font-medium opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <MoreHorizontal className="h-5 w-5 mr-1" />
                                                    <span className="text-sm">{t('form.actions')}</span>
                                                </div>
                                            )}
                                            
                                            {isVisitingThis && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleEndVisit(); }} 
                                                    className="w-full px-3 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 animate-pulse shadow-md"
                                                >
                                                    <LogOut className="h-4 w-4" /> 
                                                    {t('dailyPlan.action.end')}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )})}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-6">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-2 rounded-md border disabled:opacity-50"><ChevronLeft className="h-5 w-5" /></button>
                            <span className="text-sm font-medium">{t('pagination.page').replace('{currentPage}', String(currentPage)).replace('{totalPages}', String(totalPages))}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="p-2 rounded-md border disabled:opacity-50"><ChevronRight className="h-5 w-5" /></button>
                        </div>
                    )}
                </>
            )}

            {selectedCustomerForOptions && (
                <VisitOptionsModal 
                    customer={selectedCustomerForOptions}
                    onClose={() => setSelectedCustomerForOptions(null)}
                    onStartVisit={handleStartVisit}
                    onNoVisit={handleNoVisitOption}
                />
            )}

            {selectedCustomerForNoVisit && (
                <NoVisitFormModal 
                    customer={selectedCustomerForNoVisit} 
                    onClose={() => setSelectedCustomerForNoVisit(null)} 
                    onSave={handleSaveNoVisit} 
                    reasons={noVisitReasons}
                />
            )}
        </div>
    );
};

export default DailyPlan;
