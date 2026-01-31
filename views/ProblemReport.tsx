import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { supabase } from '../services/supabase';
import { Problem, ProblemType } from '../types';
import { Loader2, ChevronLeft, ChevronRight, Image as ImageIcon, X, Save, AlertCircle, CheckCircle, FileWarning } from 'lucide-react';

const ITEMS_PER_PAGE = 9;

const ProblemDetailsModal: React.FC<{ 
    problem: Problem; 
    onClose: () => void; 
    onUpdate: (id: string, status: string, note: string) => Promise<void> 
}> = ({ problem, onClose, onUpdate }) => {
    const { t } = useAppContext();
    const [status, setStatus] = useState(problem.status);
    const [resolutionNote, setResolutionNote] = useState(problem.resolution_note || '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // If already resolved, the form is read-only
    const isReadOnly = problem.status === 'Resolved';

    const handleSave = async () => {
        if ((status === 'Resolved' || status === 'Not Resolved') && !resolutionNote.trim()) {
            setError(t('problemReport.resolutionNoteRequired'));
            return;
        }
        setIsSaving(true);
        try {
            await onUpdate(problem.id, status, resolutionNote);
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-border dark:border-dark-border">
                    <h2 className="text-xl font-bold">{t('problemReport.detailsTitle')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X className="h-6 w-6" /></button>
                </div>
                <div className="overflow-y-auto p-6 space-y-4">
                    {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                         <div><strong>{t('reportProblem.customer')}:</strong> {problem.customer?.name}</div>
                         <div><strong>{t('reportProblem.problemType')}:</strong> {problem.problem_type?.name}</div>
                         <div><strong>{t('problemReport.reportedBy')}:</strong> {problem.created_by_user?.full_name}</div>
                         <div><strong>{t('problemReport.reportedDate')}:</strong> {new Date(problem.created_at!).toLocaleString()}</div>
                         
                         {problem.status === 'Resolved' && (
                             <>
                                <div><strong>{t('problemReport.resolvedBy')}:</strong> {problem.resolved_by_user?.full_name || t('common.na')}</div>
                                <div><strong>{t('problemReport.resolvedDate')}:</strong> {problem.resolved_at ? new Date(problem.resolved_at).toLocaleString() : t('common.na')}</div>
                             </>
                         )}
                    </div>

                    <div>
                        <strong>{t('reportProblem.description')}:</strong>
                        <p className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-border dark:border-dark-border whitespace-pre-wrap text-sm">{problem.description}</p>
                    </div>

                    {problem.photo_url && (
                        <div>
                            <strong>{t('reportProblem.photo')}:</strong>
                            <img src={problem.photo_url} alt="Evidence" className="mt-2 max-h-60 rounded-md border border-border dark:border-dark-border" />
                        </div>
                    )}

                    <div className="border-t border-border dark:border-dark-border pt-4 mt-2">
                        <h3 className="font-bold text-lg mb-4">{t('problemReport.resolutionSection')}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('reportProblem.status')}</label>
                                {isReadOnly ? (
                                    <div className="p-2 bg-gray-100 dark:bg-gray-800 border border-border dark:border-dark-border rounded-md text-green-600 dark:text-green-400 font-bold flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4" />
                                        {t(`problemReport.status.${status}`)}
                                    </div>
                                ) : (
                                    <select 
                                        value={status} 
                                        onChange={(e) => setStatus(e.target.value as any)} 
                                        className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md"
                                    >
                                        <option value="Pending">{t('problemReport.status.Pending')}</option>
                                        <option value="Resolved">{t('problemReport.status.Resolved')}</option>
                                        <option value="Not Resolved">{t('problemReport.status.Not Resolved')}</option>
                                    </select>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {t('problemReport.resolutionNote')} 
                                    {!isReadOnly && (status === 'Resolved' || status === 'Not Resolved') && <span className="text-red-500">*</span>}
                                </label>
                                {isReadOnly ? (
                                     <p className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-border dark:border-dark-border whitespace-pre-wrap text-sm">{resolutionNote}</p>
                                ) : (
                                    <textarea 
                                        rows={3} 
                                        value={resolutionNote} 
                                        onChange={(e) => setResolutionNote(e.target.value)} 
                                        className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md"
                                        placeholder={t('problemReport.resolutionNoteRequired')}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end items-center p-4 border-t border-border dark:border-dark-border gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800">{t('form.cancel')}</button>
                    {!isReadOnly && (
                        <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-primary dark:bg-dark-primary rounded-md hover:bg-secondary dark:hover:bg-dark-secondary disabled:opacity-50 flex items-center">
                            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            {isSaving ? t('common.saving') : t('form.save')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const ProblemReport: React.FC = () => {
    const { t, permissions, showNotification, profile } = useAppContext();
    const pagePermissions = permissions['Problem Report'];

    const [problems, setProblems] = useState<Problem[]>([]);
    const [problemTypes, setProblemTypes] = useState<ProblemType[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);

    // Filters
    const [filters, setFilters] = useState({ startDate: '', endDate: '', typeId: '', status: '' });

    const fetchData = useCallback(async () => {
        try {
             const { data } = await supabase.from('problem_types').select('*').order('name');
             setProblemTypes(data || []);
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const fetchProblems = useCallback(async () => {
        if (!pagePermissions?.can_view) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            let query = supabase
                .from('problems')
                .select(`
                    *, 
                    customer:customers(name), 
                    problem_type:problem_types(name), 
                    created_by_user:users!problems_created_by_fkey(full_name),
                    resolved_by_user:users!problems_resolved_by_fkey(full_name)
                `, { count: 'exact' });

            if (filters.startDate) query = query.gte('created_at', `${filters.startDate}T00:00:00.000Z`);
            if (filters.endDate) query = query.lte('created_at', `${filters.endDate}T23:59:59.999Z`);
            if (filters.typeId) query = query.eq('problem_type_id', filters.typeId);
            if (filters.status) query = query.eq('status', filters.status);

            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
            query = query.range(startIndex, startIndex + ITEMS_PER_PAGE - 1).order('created_at', { ascending: false });

            const { data, error, count } = await query;
            if (error) throw error;

            setProblems((data as any) || []);
            setTotalCount(count || 0);

        } catch (error: any) {
            console.error("Error fetching problems:", error);
            showNotification(`Failed to load reports: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [pagePermissions, showNotification, currentPage, filters]);

    useEffect(() => {
        fetchProblems();
    }, [fetchProblems]);

    const handleUpdateProblem = async (id: string, status: string, note: string) => {
         const updates: any = { status, resolution_note: note };
         
         // If marking as resolved, capture who and when
         if (status === 'Resolved' && profile?.id) {
             updates.resolved_by = profile.id;
             updates.resolved_at = new Date().toISOString();
         }

         const { error } = await supabase.from('problems').update(updates).eq('id', id);
         if (error) throw new Error(error.message);
         showNotification(t('problemReport.updateSuccess'), 'success');
         fetchProblems();
    };

    const handleResetFilters = () => {
        setFilters({ startDate: '', endDate: '', typeId: '', status: '' });
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Resolved': return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'Not Resolved': return <FileWarning className="h-5 w-5 text-red-500" />;
            default: return <AlertCircle className="h-5 w-5 text-yellow-500" />;
        }
    };
    
    const getStatusColor = (status: string) => {
         switch (status) {
            case 'Resolved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'Not Resolved': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
        }
    }

    if (!pagePermissions?.can_view) return <p>{t('error.accessDenied.message')}</p>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">{t('problemReport.title')}</h1>

            {/* Filters */}
            <div className="p-4 bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('problemReport.filterByDate')}</label>
                        <div className="flex items-center gap-2">
                             <input type="date" value={filters.startDate} onChange={e => { setFilters({...filters, startDate: e.target.value}); setCurrentPage(1); }} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-sm" />
                             <input type="date" value={filters.endDate} onChange={e => { setFilters({...filters, endDate: e.target.value}); setCurrentPage(1); }} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('problemReport.filterByType')}</label>
                        <select value={filters.typeId} onChange={e => { setFilters({...filters, typeId: e.target.value}); setCurrentPage(1); }} className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-sm">
                            <option value="">{t('visitRequestReport.filters.all')}</option>
                            {problemTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium mb-1">{t('problemReport.filterByStatus')}</label>
                        <select value={filters.status} onChange={e => { setFilters({...filters, status: e.target.value}); setCurrentPage(1); }} className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-sm">
                            <option value="">{t('visitRequestReport.filters.all')}</option>
                            <option value="Pending">{t('problemReport.status.Pending')}</option>
                            <option value="Resolved">{t('problemReport.status.Resolved')}</option>
                            <option value="Not Resolved">{t('problemReport.status.Not Resolved')}</option>
                        </select>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={handleResetFilters} className="px-4 py-2 text-sm font-medium rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800">{t('visitRequestReport.filters.reset')}</button>
                </div>
            </div>

            {loading ? <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div> :
             problems.length === 0 ? <p className="text-center py-8 text-text-secondary">{t('visitRequestReport.noResults')}</p> :
             (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {problems.map(p => (
                            <div key={p.id} className="bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border p-4 flex flex-col space-y-3">
                                <div className="flex justify-between items-start">
                                     <h3 className="font-bold text-lg text-text-primary dark:text-dark-text-primary">{p.customer?.name}</h3>
                                     {getStatusIcon(p.status)}
                                </div>
                                <div>
                                    <p className="text-sm text-primary font-medium">{p.problem_type?.name}</p>
                                    <p className="text-xs text-text-secondary mt-1">{new Date(p.created_at!).toLocaleString()}</p>
                                    <p className="text-xs text-text-secondary mt-0.5">{t('common.by')} {p.created_by_user?.full_name}</p>
                                </div>
                                <span className={`px-2 py-1 inline-flex w-fit text-xs leading-5 font-semibold rounded-full ${getStatusColor(p.status)}`}>
                                    {t(`problemReport.status.${p.status}`)}
                                </span>
                                <button 
                                    onClick={() => setSelectedProblem(p)}
                                    className="mt-3 w-full flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                                >
                                    {t('visitRequests.viewDetails')}
                                </button>
                            </div>
                        ))}
                    </div>
                    {totalPages > 1 && (
                         <div className="flex items-center justify-between p-4">
                            <span className="text-sm text-text-secondary dark:text-dark-text-secondary">{t('pagination.page').replace('{currentPage}', String(currentPage)).replace('{totalPages}', String(totalPages))} ({totalCount} {t('common.results')})</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="p-2 rounded-md border disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="p-2 rounded-md border disabled:opacity-50"><ChevronRight className="h-4 w-4" /></button>
                            </div>
                        </div>
                    )}
                </>
             )
            }

            {selectedProblem && (
                <ProblemDetailsModal 
                    problem={selectedProblem} 
                    onClose={() => setSelectedProblem(null)} 
                    onUpdate={handleUpdateProblem} 
                />
            )}
        </div>
    );
};

export default ProblemReport;