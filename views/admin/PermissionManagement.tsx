
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { PAGE_NAMES } from '../../constants';
import { Role, Permission } from '../../types';

// Helper to map DB page names to translation keys
const getPageTranslationKey = (pageName: string): string | null => {
    const mapping: Record<string, string> = {
        "Dashboard": "sidebar.dashboard",
        "Daily Plan": "sidebar.dailyPlan",
        "Customer Visit Form": "sidebar.customerVisitForm",
        "User Management": "sidebar.userManagement",
        "Role Management": "sidebar.roleManagement",
        "Permission Management": "sidebar.permissionManagement",
        "Customers": "sidebar.customers",
        "Customers Map": "sidebar.customersMap",
        "Products": "sidebar.products",
        "Product Groups": "sidebar.productGroups",
        "Sellers": "sidebar.sellers",
        "Merchandisers": "sidebar.merchandisers",
        "Customer-Seller Relations": "sidebar.customerSellerRelations",
        "Customer-Merch Relations": "sidebar.customerMerchRelations",
        "Seller Product Group Relations": "sidebar.sellerProductGroups",
        "Seller Product Assignments": "sidebar.sellerProductAssignments",
        "Seller-Merch Assignments": "sidebar.sellerMerchAssignments",
        "Visit Types": "sidebar.visitTypes",
        "Send Notification": "sidebar.sendNotification",
        "Track": "sidebar.track",
        "Sales Route Planning": "sidebar.salesRoutePlanning",
        "Merch Route Planning": "sidebar.merchRoutePlanning",
        "Visit Requests": "sidebar.visitRequests",
        "Visit Request Merchandiser": "sidebar.visitRequestMerchandiser",
        "Visit Request Report": "sidebar.visitRequestReport",
        "Visit Request Merch Report": "sidebar.visitRequestMerchReport",
        "Admin Seller Visit Report": "sidebar.adminSellerVisitReport",
        "Admin Merch Visit Report": "sidebar.adminMerchVisitReport",
        "My Visit Requests": "sidebar.myVisitRequests",
        "Seller Visit Report": "sidebar.sellerVisitReport",
        "Merch Visit Report": "sidebar.merchVisitReport",
        "Seller Route Report": "sidebar.sellerRouteReport",
        "My Profile": "profile.title",
        "Logo Management": "sidebar.logoManagement",
        "Fixed Asset Brands": "sidebar.fixedAssetBrands",
        "Fixed Asset Delivery": "sidebar.fixedAssetDelivery",
        "Fixed Asset Delivery Report": "sidebar.fixedAssetDeliveryReport",
        "Sales Dashboard": "sidebar.salesDashboard",
        "Competitor Price Analysis": "sidebar.competitorPriceAnalysis",
        "Competitor Price Analysis Report": "sidebar.competitorPriceAnalysisReport",
        "Competitor Price Analysis AI Report": "sidebar.competitorPriceAnalysisAIReport",
        "Product Display": "sidebar.productDisplay",
        "Display Reporting": "sidebar.displayReporting",
        "Product Shelf": "sidebar.productShelf",
        "Product Shelf Reporting": "sidebar.productShelfReporting",
        "Product Insert": "sidebar.productInsert",
        "Product Insert Reporting": "sidebar.productInsertReporting",
        "My Product Inserts": "sidebar.myProductInserts",
        "Problem Types": "sidebar.problemTypes",
        "Report a Problem": "sidebar.reportProblem",
        "Problem Report": "sidebar.problemReport",
        "Customer Properties": "sidebar.customerProperties",
        "Districts": "sidebar.districts",
        "Sales Route Report": "sidebar.salesRouteReport",
        "Merch Route Report": "sidebar.merchRouteReport",
        "Reasons for No Visits": "sidebar.noVisitReasons",
        "Team Dashboard": "sidebar.teamDashboard",
        "Team Reports": "sidebar.teamReports",
        "Rota Groups": "sidebar.rotaGroups",
        "Rota Group Relations": "sidebar.rotaGroupRelations",
        "Fixed Asset Form": "fixedAssetForm.title",
        "Fixed Asset Report Customer": "fixedAssetReportCustomer.title"
    };
    return mapping[pageName] || null;
};

const PermissionManagement: React.FC = () => {
    const { t, permissions, showNotification } = useAppContext();
    const pagePermissions = permissions['Permission Management'];
    
    const [roles, setRoles] = useState<Role[]>([]);
    const [selectedRole, setSelectedRole] = useState<string>('');
    const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    
    const permissionKeys: (keyof Permission)[] = ['can_navigate', 'can_view', 'can_create', 'can_edit', 'can_delete', 'can_export'];

    const initialPermissions = useMemo(() => PAGE_NAMES.map(page_name => ({
        page_name,
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
        can_navigate: false,
        can_export: false
    })), []);

    useEffect(() => {
        const fetchRoles = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase.from('user_roles').select('*').order('name', { ascending: true });
                if (error) throw error;
                if (data) setRoles(data);
            } catch (error: any) {
                console.error("Error fetching roles:", error);
                showNotification(`Failed to fetch roles: ${error.message}`, 'error');
            } finally {
                setLoading(false);
            }
        };
        if (pagePermissions?.can_view) {
            fetchRoles();
        } else {
            setLoading(false);
        }
    }, [pagePermissions, showNotification]);

    useEffect(() => {
        const fetchPermissions = async () => {
            if (!selectedRole) {
                setRolePermissions([]);
                return;
            }
            const { data } = await supabase.from('user_permissions').select('*').eq('role_id', selectedRole);
            
            const existingPerms = data || [];
            const allPerms = initialPermissions.map(p => {
                const existing = existingPerms.find(ep => ep.page_name === p.page_name);
                return existing ? { ...p, ...existing, role_id: selectedRole } : { ...p, role_id: selectedRole };
            });
            setRolePermissions(allPerms);
        };

        if (pagePermissions?.can_view) {
            fetchPermissions();
        }
    }, [selectedRole, initialPermissions, pagePermissions]);
    
    const handlePermissionChange = (pageName: string, key: keyof Permission, value: boolean) => {
        setRolePermissions(prev => prev.map(p => p.page_name === pageName ? {...p, [key]: value} : p));
    };

    const handleSave = async () => {
        if (!selectedRole || !pagePermissions?.can_edit) return;
        
        const { error } = await supabase.from('user_permissions').upsert(
            rolePermissions.map(({id, ...rest}) => rest), 
            { onConflict: 'role_id,page_name' }
        );

        if (error) {
            showNotification(`${t('notification.permissions.saveError')}: ${error.message}`, 'error');
        } else {
            showNotification(t('notification.permissions.saveSuccess'));
        }
    };
    
    if (loading) return <div>Loading...</div>;
    
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('permissions.title')}</h1>
             {pagePermissions?.can_view ? (
                <>
                    <div className="mb-6">
                        <label htmlFor="role-select" className="sr-only">{t('permissions.selectRole')}</label>
                        <select 
                            id="role-select"
                            value={selectedRole}
                            onChange={e => setSelectedRole(e.target.value)}
                            className="w-full md:w-1/3 p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:ring-accent dark:focus:ring-dark-accent focus:border-accent dark:focus:border-dark-accent"
                        >
                            <option value="">{t('permissions.selectRole')}</option>
                            {roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                        </select>
                    </div>
                    {selectedRole && (
                        <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border overflow-x-auto">
                            <table className="min-w-full divide-y divide-border dark:divide-dark-border">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('permissions.pageName')}</th>
                                        {permissionKeys.map(key => <th key={key as string} className="px-2 py-3 text-center text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t(`permissions.${(key as string).substring(4)}`)}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border dark:divide-dark-border">
                                    {rolePermissions.map((perm) => (
                                        <tr key={perm.page_name} className="bg-surface dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary dark:text-dark-text-primary">
                                                {(() => {
                                                    const key = getPageTranslationKey(perm.page_name);
                                                    return key ? t(key) : perm.page_name;
                                                })()}
                                            </td>
                                            {permissionKeys.map(key => (
                                                <td key={key as string} className="px-2 py-4 text-center">
                                                    <input
                                                        type="checkbox"
                                                        className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-primary dark:text-dark-primary focus:ring-accent dark:focus:ring-dark-accent"
                                                        checked={!!perm[key]}
                                                        onChange={e => handlePermissionChange(perm.page_name, key, e.target.checked)}
                                                        disabled={!pagePermissions?.can_edit}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {pagePermissions?.can_edit && <div className="p-4 bg-gray-50 dark:bg-gray-800 flex justify-end border-t border-border dark:border-dark-border">
                                <button onClick={handleSave} className="px-4 py-2 bg-primary dark:bg-dark-primary text-white text-sm font-medium rounded-md hover:bg-secondary dark:hover:bg-dark-secondary">{t('permissions.save')}</button>
                            </div>}
                        </div>
                    )}
                </>
             ) : <p className="text-text-secondary dark:text-dark-text-secondary">You do not have permission to view permissions.</p>}
        </div>
    );
};

export default PermissionManagement;
