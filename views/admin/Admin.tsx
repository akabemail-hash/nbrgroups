
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import { Language } from '../../types';
import { supabase } from '../../services/supabase';
import { User as UserIcon, LogOut, Shield, LayoutDashboard, Languages, ShieldAlert, Menu, X, ChevronDown, Sun, Moon, MapPin, Briefcase, CheckCircle, XCircle, Info, Store, ShoppingBag, Link2, ClipboardList, Send, Bell, BellDot, CheckCheck, MessageSquare, Map, CalendarDays, ClipboardCheck, Settings, KeyRound, Save, Loader2, BarChart3, CalendarCheck, Image, Bookmark, Truck, Package, Tag, Layers, FileInput, AlertCircle, FileWarning, AlertTriangle, List, ExternalLink, Database, FileText, TrendingUp, ChevronRight, Ban, Users, UserPlus, FileEdit, Box } from 'lucide-react';

// Import pages from admin subdirectory
import Dashboard from './admin/Dashboard';
import UserManagement from './admin/UserManagement';
import RoleManagement from './admin/RoleManagement';
import PermissionManagement from './admin/PermissionManagement';
import CustomerManagement from './admin/CustomerManagement';
import CustomersMap from './admin/CustomersMap';
import Sellers from './admin/Sellers';
import Merchandisers from './admin/Merchandisers';
import CustomerSellerRelations from './admin/CustomerSellerRelations';
import CustomerMerchRelations from './admin/CustomerMerchRelations';
import SellerProductGroupRelations from './admin/SellerProductGroupRelations';
import SellerProductAssignments from './admin/SellerProductAssignments';
import SellerMerchAssignments from './admin/SellerMerchAssignments';
import VisitTypes from './admin/VisitTypes';
import SendNotification from './admin/SendNotification';
import Track from './admin/Track';
import SalesRoutePlanning from './admin/SalesRoutePlanning';
import MerchRoutePlanning from './admin/MerchRoutePlanning';
import VisitRequests from './admin/VisitRequests';
import VisitRequestReport from './admin/VisitRequestReport';
import VisitRequestMerchandiser from './admin/VisitRequestMerchandiser';
import VisitRequestMerchReport from './admin/VisitRequestMerchReport';
import AdminSellerVisitReport from './admin/AdminSellerVisitReport';
import AdminMerchVisitReport from './admin/AdminMerchVisitReport';
import LogoManagement from './admin/LogoManagement';
import FixedAssetBrands from './admin/FixedAssetBrands';
import AdminFixedAssetDeliveryReport from './admin/AdminFixedAssetDeliveryReport';
import FixedAssetReportCustomer from './admin/FixedAssetReportCustomer';
import Products from './admin/Products';
import ProductGroups from './admin/ProductGroups';
import CompetitorPriceAnalysisReport from './admin/CompetitorPriceAnalysisReport';
import CompetitorPriceAnalysisAIReport from './admin/CompetitorPriceAnalysisAIReport';
import DisplayReporting from './admin/DisplayReporting';
import ProductShelfReporting from './admin/ProductShelfReporting';
import ProductInsertReporting from './admin/ProductInsertReporting';
import ProblemTypes from './admin/ProblemTypes';
import ProblemReport from './ProblemReport';
import CustomerProperties from './admin/CustomerProperties';
import Districts from './admin/Districts';
import SalesRouteReport from './admin/SalesRouteReport';
import MerchRouteReport from './admin/MerchRouteReport';
import NoVisitReasons from './admin/NoVisitReasons';
import RotaGroups from './admin/RotaGroups';
import RotaGroupRelations from './admin/RotaGroupRelations';

// Import pages from the current directory
import MyVisitRequests from '../MyVisitRequests';
import SellerVisitReport from '../SellerVisitReport';
import MyProfile from '../MyProfile';
import MerchVisitReport from '../MerchVisitReport';
import DailyPlan from '../DailyPlan';
import CustomerVisitForm from '../CustomerVisitForm';
import FixedAssetForm from '../FixedAssetForm';
import FixedAssetDelivery from '../FixedAssetDelivery';
import SalesDashboard from '../SalesDashboard';
import CompetitorPriceAnalysis from '../CompetitorPriceAnalysis';
import ProductDisplay from '../ProductDisplay';
import ProductShelf from '../ProductShelf';
import ProductInsert from '../ProductInsert';
import MyProductInserts from '../MyProductInserts';
import ReportProblem from '../ReportProblem';
import SellerRouteReport from '../SellerRouteReport';
import TeamDashboard from '../TeamDashboard';
import TeamReports from '../TeamReports';


const Logo = ({ className }: { className?: string }) => {
  const { logoUrl } = useAppContext();
  if (logoUrl) {
    return <img src={logoUrl} alt="App Logo" className={className} style={{ objectFit: 'contain' }} />;
  }
  return (
    <svg viewBox="0 0 260 250" className={className} xmlns="http://www.w3.org/2000/svg" aria-label="NBR Logo" preserveAspectRatio="xMidYMid meet">
      <path d="M130 5.09L252.16 70v129.82L130 244.91 7.84 199.82V70L130 5.09z" className="fill-primary dark:fill-dark-primary" />
      <path d="M130 11.08L247.11 72.99V197.01L130 238.92 12.89 197.01V72.99L130 11.08z" stroke="#FFFFFF" strokeWidth="5" fill="none" />
      <path d="M38.89,190 V60h11.1l22.5,41.4V60h11.1v71.4h-11.1l-22.5-41.4v41.4H38.89z M44.89,88.29a5.7,5.7 0 1,1-5.7-5.7,5.7 5.7 0 0,1 5.7 5.7z M100.89,131.4h42.9v-10.8h-31.8V97.8h30V87h-30V70.8h31.8V60h-42.9a10.2,10.2 0 0,0-10.2,10.2v51a10.2,10.2 0 0,0 10.2,10.2z M157.89,131.4h42.9V60h-16.8l-26.1,43.2V60h-11.1a10.2,10.2 0 0,0-10.2,10.2v51a10.2,10.2 0 0,0 10.2,10.2h11.1v-21.6z M194.79,93.9a11.1,11.1 0 1,0-11.1-11.1,11.1 11.1 0 0,0 11.1 11.1z" fill="#FFFFFF" />
    </svg>
  );
};

const NotificationContainer: React.FC = () => {
  const { notifications, dismissNotification } = useAppContext();
  const icons = {
    success: <CheckCircle className="h-6 w-6 text-green-500" />,
    error: <XCircle className="h-6 w-6 text-red-500" />,
    info: <Info className="h-6 w-6 text-blue-500" />,
    message: <MessageSquare className="h-6 w-6 text-purple-500" />,
  };
  return (
    <div className="fixed bottom-4 right-4 z-[100] w-full max-w-sm space-y-3">
      {notifications.map(notification => (
        <div key={notification.id} className="relative flex items-start p-4 pr-10 bg-surface dark:bg-dark-surface rounded-lg shadow-lg border border-border dark:border-dark-border animate-fade-in-up" role="alert" onClick={() => { if (notification.onClick) { notification.onClick(); dismissNotification(notification.id); } }}>
          <div className="flex-shrink-0 pt-0.5">{icons[notification.type || 'info']}</div>
          <div className="ml-3 flex-1"><p className="text-sm font-medium text-text-primary dark:text-dark-text-primary">{notification.message}</p></div>
          <button onClick={(e) => { e.stopPropagation(); dismissNotification(notification.id); }} className="absolute top-1 right-1 p-1.5 rounded-full inline-flex text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
};

const PasswordResetModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { t, showNotification } = useAppContext();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        setError(null);
        if (password.length < 6) {
            setError(t('profile.passwordMinLength'));
            return;
        }
        if (password !== confirmPassword) {
            setError(t('profile.passwordMismatch'));
            return;
        }

        setIsSaving(true);
        const { error: updateError } = await supabase.auth.updateUser({ password });
        setIsSaving(false);

        if (updateError) {
            setError(updateError.message);
        } else {
            showNotification(t('profile.passwordUpdateSuccess'), 'success');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[101] p-4">
            <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-md">
                <div className="p-4 border-b border-border dark:border-dark-border">
                    <h2 className="text-xl font-bold flex items-center gap-2"><KeyRound /> {t('profile.setNewPassword.title')}</h2>
                </div>
                <div className="p-6 space-y-4">
                    {error && <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md text-sm">{error}</div>}
                    <p className="text-sm text-text-secondary dark:text-dark-text-secondary">{t('profile.setNewPassword.description')}</p>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('users.newPassword')}</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full py-2 px-3 bg-transparent border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('profile.confirmPassword')}</label>
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full py-2 px-3 bg-transparent border border-border dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                </div>
                <div className="flex justify-end items-center p-4 border-t border-border dark:border-dark-border">
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 flex items-center text-sm font-medium text-white bg-primary dark:bg-dark-primary rounded-md hover:bg-secondary dark:hover:bg-dark-secondary disabled:opacity-50">
                        {isSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                        {isSaving ? 'Saving...' : t('form.save')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const NotificationsPanel: React.FC = () => {
  const { t, userNotifications, unreadCount, markNotificationAsRead, markAllNotificationsAsRead } = useAppContext();
  const handleNotificationClick = (notification: any) => {
    markNotificationAsRead(notification.id);
    if (notification.notification.link) {
      window.open(notification.notification.link, '_blank');
    }
  };
  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface dark:bg-dark-surface rounded-md shadow-lg z-20 border border-border dark:border-dark-border">
      <div className="p-3 flex justify-between items-center border-b border-border dark:border-dark-border">
        <h3 className="font-semibold">{t('notifications.title')}</h3>
        {unreadCount > 0 && (
          <button onClick={markAllNotificationsAsRead} className="text-sm text-primary dark:text-dark-primary hover:underline flex items-center gap-1">
            <CheckCheck className="h-4 w-4" />
            {t('notifications.markAllRead')}
          </button>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {userNotifications.length === 0 ? (
          <p className="text-center text-sm text-text-secondary dark:text-dark-text-secondary py-6">{t('notifications.noNotifications')}</p>
        ) : (
          userNotifications.map(n => (
            <div
              key={n.id}
              className={`p-3 border-b border-border dark:border-dark-border last:border-b-0 ${!n.is_read ? 'bg-blue-50 dark:bg-blue-900/20' : ''} ${n.notification.link ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''}`}
              onClick={() => handleNotificationClick(n)}
            >
              <div className="flex justify-between items-start gap-2">
                <p className="text-sm text-text-primary dark:text-dark-text-primary flex-1">{n.notification.message}</p>
                {n.notification.link && <ExternalLink className="h-4 w-4 text-text-secondary dark:text-dark-text-secondary flex-shrink-0" />}
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-text-secondary dark:text-dark-text-secondary">
                  {new Date(n.notification.created_at).toLocaleString()}
                </span>
                {!n.is_read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markNotificationAsRead(n.id);
                    }}
                    className="text-xs text-accent dark:text-dark-accent hover:underline"
                  >
                    {t('notifications.markRead')}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const Header: React.FC<{ setIsSidebarOpen: (isOpen: boolean) => void; isUpdatingLocation: boolean; }> = ({ setIsSidebarOpen, isUpdatingLocation }) => {
  const { profile, language, setLanguage, logout, t, theme, toggleTheme, unreadCount, notificationsPanelOpen, setNotificationsPanelOpen, navigateTo } = useAppContext();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  const languages: { code: Language; name: string }[] = [
    { code: 'en', name: 'English' },
    { code: 'az', name: 'Azərbaycanca' },
    { code: 'tr', name: 'Türkçe' },
  ];

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setLangDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsPanelOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setNotificationsPanelOpen]);

  return (
    <header className="h-16 bg-surface dark:bg-dark-surface border-b flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
      <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-1 text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text-primary">
        <Menu className="h-6 w-6" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center space-x-2 sm:space-x-4">
        {isUpdatingLocation && (
          <div className="flex items-center space-x-2 text-sm text-text-secondary dark:text-dark-text-secondary" aria-live="polite" aria-busy="true">
            <MapPin className="h-4 w-4 animate-pulse text-accent dark:text-dark-accent" />
            <span className="hidden sm:inline">{t('admin.updatingLocation')}</span>
          </div>
        )}

        <button onClick={toggleTheme} className="p-2 rounded-full text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text-primary hover:bg-slate-200 dark:hover:bg-gray-700">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="relative" ref={notificationsRef}>
          <button onClick={() => setNotificationsPanelOpen(!notificationsPanelOpen)} className="relative p-2 rounded-full text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text-primary hover:bg-slate-200 dark:hover:bg-gray-700">
            {unreadCount > 0 ? <BellDot className="h-5 w-5 text-red-500" /> : <Bell className="h-5 w-5" />}
          </button>
          {notificationsPanelOpen && <NotificationsPanel />}
        </div>

        <div className="relative" ref={langRef}>
          <button onClick={() => setLangDropdownOpen(!langDropdownOpen)} className="flex items-center space-x-2 text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text-primary p-2 rounded-md hover:bg-slate-200 dark:hover:bg-gray-700">
            <Languages className="h-5 w-5" />
            <span className="hidden sm:inline">{languages.find(l => l.code === language)?.name}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${langDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {langDropdownOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-surface dark:bg-dark-surface rounded-md shadow-lg z-20 border border-border dark:border-dark-border">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full text-left px-4 py-2 text-sm ${language === lang.code ? 'font-bold text-primary dark:text-dark-primary' : 'text-text-primary dark:text-dark-text-primary'} hover:bg-background dark:hover:bg-dark-background`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center space-x-2 p-2 rounded-md hover:bg-slate-200 dark:hover:bg-gray-700">
            <UserIcon className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 p-1 text-text-primary dark:text-dark-text-primary" />
            <span className="hidden md:inline font-medium text-text-primary dark:text-dark-text-primary">{profile?.full_name}</span>
            <ChevronDown className={`h-4 w-4 transition-transform text-text-secondary dark:text-dark-text-secondary ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-surface dark:bg-dark-surface rounded-md shadow-lg z-20 border border-border dark:border-dark-border">
              <button onClick={() => { navigateTo('/my-profile'); setDropdownOpen(false); }} className="w-full flex items-center px-4 py-2 text-sm text-text-primary dark:text-dark-text-primary hover:bg-background dark:hover:bg-dark-background">
                <Settings className="h-4 w-4 mr-2" />
                {t('profile.title')}
              </button>
              <button onClick={() => { logout(); setDropdownOpen(false); }} className="w-full flex items-center px-4 py-2 text-sm text-text-primary dark:text-dark-text-primary hover:bg-background dark:hover:bg-dark-background">
                <LogOut className="h-4 w-4 mr-2" />
                {t('sidebar.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const AccessDenied: React.FC = () => {
  const { t, navigateTo } = useAppContext();
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4 bg-surface dark:bg-dark-surface rounded-lg">
      <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
      <h1 className="text-2xl font-bold text-red-500 dark:text-red-400 mb-2">{t('error.accessDenied.title')}</h1>
      <p className="text-text-secondary dark:text-dark-text-secondary mb-6">{t('error.accessDenied.message')}</p>
      <button
        onClick={() => navigateTo('/')}
        className="px-4 py-2 bg-primary dark:bg-dark-primary text-white rounded-md hover:bg-secondary dark:hover:bg-dark-secondary"
      >
        {t('error.accessDenied.goHome')}
      </button>
    </div>
  );
};

const pageMap: Record<string, { component: React.ReactNode, pageName: string }> = {
  '/': { component: <Dashboard />, pageName: 'Dashboard' },
  '/sales-dashboard': { component: <SalesDashboard />, pageName: 'Sales Dashboard' },
  '/users': { component: <UserManagement />, pageName: 'User Management' },
  '/roles': { component: <RoleManagement />, pageName: 'Role Management' },
  '/permissions': { component: <PermissionManagement />, pageName: 'Permission Management' },
  '/customers': { component: <CustomerManagement />, pageName: 'Customers' },
  '/customers-map': { component: <CustomersMap />, pageName: 'Customers Map' },
  '/products': { component: <Products />, pageName: 'Products' },
  '/product-groups': { component: <ProductGroups />, pageName: 'Product Groups' },
  '/rota-groups': { component: <RotaGroups />, pageName: 'Rota Groups' },
  '/rota-group-relations': { component: <RotaGroupRelations />, pageName: 'Rota Group Relations' },
  '/sellers': { component: <Sellers />, pageName: 'Sellers' },
  '/merchandisers': { component: <Merchandisers />, pageName: 'Merchandisers' },
  '/customer-seller-relations': { component: <CustomerSellerRelations />, pageName: 'Customer-Seller Relations' },
  '/customer-merch-relations': { component: <CustomerMerchRelations />, pageName: 'Customer-Merch Relations' },
  '/seller-product-groups': { component: <SellerProductGroupRelations />, pageName: 'Seller Product Group Relations' },
  '/seller-product-assignments': { component: <SellerProductAssignments />, pageName: 'Seller Product Assignments' },
  '/seller-merch-assignments': { component: <SellerMerchAssignments />, pageName: 'Seller-Merch Assignments' },
  '/visit-types': { component: <VisitTypes />, pageName: 'Visit Types' },
  '/send-notification': { component: <SendNotification />, pageName: 'Send Notification' },
  '/track': { component: <Track />, pageName: 'Track' },
  '/sales-route-planning': { component: <SalesRoutePlanning />, pageName: 'Sales Route Planning' },
  '/merch-route-planning': { component: <MerchRoutePlanning />, pageName: 'Merch Route Planning' },
  '/visit-requests': { component: <VisitRequests />, pageName: 'Visit Requests' },
  '/visit-request-report': { component: <VisitRequestReport />, pageName: 'Visit Request Report' },
  '/visit-request-merch-report': { component: <VisitRequestMerchReport />, pageName: 'Visit Request Merch Report' },
  '/visit-request-merchandiser': { component: <VisitRequestMerchandiser />, pageName: 'Visit Request Merchandiser' },
  '/my-visit-requests': { component: <MyVisitRequests />, pageName: 'My Visit Requests' },
  '/daily-plan': { component: <DailyPlan />, pageName: 'Daily Plan' },
  '/customer-visit-form': { component: <CustomerVisitForm />, pageName: 'Customer Visit Form' },
  '/seller-visit-report': { component: <SellerVisitReport />, pageName: 'Seller Visit Report' },
  '/merch-visit-report': { component: <MerchVisitReport />, pageName: 'Merch Visit Report' },
  '/seller-route-report': { component: <SellerRouteReport />, pageName: 'Seller Route Report' },
  '/admin-seller-visit-report': { component: <AdminSellerVisitReport />, pageName: 'Admin Seller Visit Report' },
  '/admin-merch-visit-report': { component: <AdminMerchVisitReport />, pageName: 'Admin Merch Visit Report' },
  '/team-dashboard': { component: <TeamDashboard />, pageName: 'Team Dashboard' },
  '/team-reports': { component: <TeamReports />, pageName: 'Team Reports' },
  '/my-profile': { component: <MyProfile />, pageName: 'My Profile' },
  '/logo-management': { component: <LogoManagement />, pageName: 'Logo Management' },
  '/fixed-asset-brands': { component: <FixedAssetBrands />, pageName: 'Fixed Asset Brands' },
  '/fixed-asset-delivery': { component: <FixedAssetDelivery />, pageName: 'Fixed Asset Delivery' },
  '/fixed-asset-delivery-report': { component: <AdminFixedAssetDeliveryReport />, pageName: 'Fixed Asset Delivery Report' },
  '/fixed-asset-form': { component: <FixedAssetForm />, pageName: 'Fixed Asset Form' },
  '/fixed-asset-report-customer': { component: <FixedAssetReportCustomer />, pageName: 'Fixed Asset Report Customer' },
  '/competitor-price-analysis': { component: <CompetitorPriceAnalysis />, pageName: 'Competitor Price Analysis' },
  '/competitor-price-analysis-report': { component: <CompetitorPriceAnalysisReport />, pageName: 'Competitor Price Analysis Report' },
  '/competitor-price-analysis-ai-report': { component: <CompetitorPriceAnalysisAIReport />, pageName: 'Competitor Price Analysis AI Report' },
  '/product-display': { component: <ProductDisplay />, pageName: 'Product Display' },
  '/display-reporting': { component: <DisplayReporting />, pageName: 'Display Reporting' },
  '/product-shelf': { component: <ProductShelf />, pageName: 'Product Shelf' },
  '/product-shelf-reporting': { component: <ProductShelfReporting />, pageName: 'Product Shelf Reporting' },
  '/product-insert': { component: <ProductInsert />, pageName: 'Product Insert' },
  '/product-insert-reporting': { component: <ProductInsertReporting />, pageName: 'Product Insert Reporting' },
  '/my-product-inserts': { component: <MyProductInserts />, pageName: 'My Product Inserts' },
  '/problem-types': { component: <ProblemTypes />, pageName: 'Problem Types' },
  '/report-problem': { component: <ReportProblem />, pageName: 'Report a Problem' },
  '/problem-report': { component: <ProblemReport />, pageName: 'Problem Report' },
  '/customer-properties': { component: <CustomerProperties />, pageName: 'Customer Properties' },
  '/districts': { component: <Districts />, pageName: 'Districts' },
  '/sales-route-report': { component: <SalesRouteReport />, pageName: 'Sales Route Report' },
  '/merch-route-report': { component: <MerchRouteReport />, pageName: 'Merch Route Report' },
  '/no-visit-reasons': { component: <NoVisitReasons />, pageName: 'Reasons for No Visits' },
};

const SidebarNavItem: React.FC<{ path: string; label: string; icon: React.ElementType; activePage: string; navigateTo: (path: string) => void; depth?: number; }> = ({ path, label, icon: Icon, activePage, navigateTo, depth = 0 }) => {
  const active = activePage === path;
  let paddingClass = "px-3";
  if (depth === 1) paddingClass = "pl-9 pr-3";
  if (depth === 2) paddingClass = "pl-12 pr-3";

  return (
    <button onClick={() => navigateTo(path)} className={`w-full flex items-center py-2.5 ${paddingClass} text-sm font-medium rounded-md transition-colors ${active ? 'bg-primary text-white' : 'text-text-secondary hover:bg-slate-200 dark:hover:bg-gray-700'}`}>
      <Icon className={`mr-3 ${depth > 0 ? 'h-4 w-4' : 'h-5 w-5'}`} />
      <span className="truncate">{label}</span>
    </button>
  );
};

const Admin: React.FC = () => {
  const { activePage, permissions, profile, passwordRecoveryRequired, setPasswordRecoveryRequired } = useAppContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { updateLocation, loading: isUpdatingLocation } = useGeolocation(profile?.id);
  const [isAdminOpen, setIsAdminOpen] = useState(true);
  const [isTeamOpen, setIsTeamOpen] = useState(true);
  const { t, navigateTo } = useAppContext();

  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({
    general: false,
    definitions: false,
    sales: false,
    merch: false,
    reports: false,
    tools: false,
    rota: false,
  });

  const toggleSubMenu = (key: string) => {
    setOpenSubMenus(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => { if (profile?.id) updateLocation(); }, [profile?.id, updateLocation]);

  // Automatically close sidebar when navigation occurs on mobile/tablet (under 1024px)
  useEffect(() => {
    if (isSidebarOpen && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [activePage]);

  const adminGroups = useMemo(() => [
    {
      id: 'general',
      label: t('sidebar.generalSettings'),
      icon: Settings,
      items: [
        { path: '/users', label: t('sidebar.userManagement'), pageName: 'User Management', icon: UserIcon },
        { path: '/roles', label: t('sidebar.roleManagement'), pageName: 'Role Management', icon: Shield },
        { path: '/permissions', label: t('sidebar.permissionManagement'), pageName: 'Permission Management', icon: ShieldAlert },
        { path: '/visit-types', label: t('sidebar.visitTypes'), pageName: 'Visit Types', icon: ClipboardList },
        { path: '/logo-management', label: t('sidebar.logoManagement'), pageName: 'Logo Management', icon: Image },
      ]
    },
    {
      id: 'definitions',
      label: t('sidebar.definitions'),
      icon: Database,
      items: [
        { path: '/customers', label: t('sidebar.customers'), pageName: 'Customers', icon: Briefcase },
        { path: '/customers-map', label: t('sidebar.customersMap'), pageName: 'Customers Map', icon: MapPin },
        { path: '/products', label: t('sidebar.products'), pageName: 'Products', icon: Package },
        { path: '/product-groups', label: t('sidebar.productGroups'), pageName: 'Product Groups', icon: List },
        { path: '/fixed-asset-brands', label: t('sidebar.fixedAssetBrands'), pageName: 'Fixed Asset Brands', icon: Bookmark },
        { path: '/problem-types', label: t('sidebar.problemTypes'), pageName: 'Problem Types', icon: AlertTriangle },
        { path: '/customer-properties', label: t('sidebar.customerProperties'), pageName: 'Customer Properties', icon: List },
        { path: '/districts', label: t('sidebar.districts'), pageName: 'Districts', icon: List },
        { path: '/product-insert', label: t('sidebar.productInsert'), pageName: 'Product Insert', icon: FileInput },
        { path: '/no-visit-reasons', label: t('sidebar.noVisitReasons'), pageName: 'Reasons for No Visits', icon: Ban },
      ]
    },
    {
      id: 'rota',
      label: t('sidebar.rota'),
      icon: Map,
      items: [
          { path: '/rota-groups', label: t('sidebar.rotaGroups'), pageName: 'Rota Groups', icon: List },
          { path: '/rota-group-relations', label: t('sidebar.rotaGroupRelations'), pageName: 'Rota Group Relations', icon: Link2 }
      ]
    },
    {
      id: 'sales',
      label: t('sidebar.sales'),
      icon: TrendingUp,
      items: [
        { path: '/sellers', label: t('sidebar.sellers'), pageName: 'Sellers', icon: Store },
        { path: '/customer-seller-relations', label: t('sidebar.customerSellerRelations'), pageName: 'Customer-Seller Relations', icon: Link2 },
        { path: '/seller-product-groups', label: t('sidebar.sellerProductGroups'), pageName: 'Seller Product Group Relations', icon: Link2 },
        { path: '/seller-product-assignments', label: t('sidebar.sellerProductAssignments'), pageName: 'Seller Product Assignments', icon: ClipboardList },
        { path: '/seller-merch-assignments', label: t('sidebar.sellerMerchAssignments'), pageName: 'Seller-Merch Assignments', icon: UserPlus },
        { path: '/sales-route-planning', label: t('sidebar.salesRoutePlanning'), pageName: 'Sales Route Planning', icon: CalendarDays },
        { path: '/visit-requests', label: t('sidebar.visitRequests'), pageName: 'Visit Requests', icon: ClipboardCheck },
        { path: '/my-product-inserts', label: t('sidebar.myProductInserts'), pageName: 'My Product Inserts', icon: FileInput },
      ]
    },
    {
      id: 'merch',
      label: t('sidebar.merchandiser'),
      icon: ShoppingBag,
      items: [
        { path: '/merchandisers', label: t('sidebar.merchandisers'), pageName: 'Merchandisers', icon: ShoppingBag },
        { path: '/customer-merch-relations', label: t('sidebar.customerMerchRelations'), pageName: 'Customer-Merch Relations', icon: Link2 },
        { path: '/merch-route-planning', label: t('sidebar.merchRoutePlanning'), pageName: 'Merch Route Planning', icon: CalendarDays },
        { path: '/visit-request-merchandiser', label: t('sidebar.visitRequestMerchandiser'), pageName: 'Visit Request Merchandiser', icon: ClipboardCheck },
        { path: '/my-product-inserts', label: t('sidebar.myProductInserts'), pageName: 'My Product Inserts', icon: FileInput },
      ]
    },
    {
      id: 'reports',
      label: t('sidebar.reports'),
      icon: FileText,
      items: [
        { path: '/visit-request-report', label: t('sidebar.visitRequestReport'), pageName: 'Visit Request Report', icon: BarChart3 },
        { path: '/visit-request-merch-report', label: t('sidebar.visitRequestMerchReport'), pageName: 'Visit Request Merch Report', icon: BarChart3 },
        { path: '/admin-seller-visit-report', label: t('sidebar.adminSellerVisitReport'), pageName: 'Admin Seller Visit Report', icon: BarChart3 },
        { path: '/admin-merch-visit-report', label: t('sidebar.adminMerchVisitReport'), pageName: 'Admin Merch Visit Report', icon: BarChart3 },
        { path: '/fixed-asset-delivery-report', label: t('sidebar.fixedAssetDeliveryReport'), pageName: 'Fixed Asset Delivery Report', icon: BarChart3 },
        { path: '/fixed-asset-report-customer', label: t('fixedAssetReportCustomer.title'), pageName: 'Fixed Asset Report Customer', icon: BarChart3 },
        { path: '/competitor-price-analysis-report', label: t('sidebar.competitorPriceAnalysisReport'), pageName: 'Competitor Price Analysis Report', icon: BarChart3 },
        { path: '/competitor-price-analysis-ai-report', label: t('sidebar.competitorPriceAnalysisAIReport'), pageName: 'Competitor Price Analysis AI Report', icon: BarChart3 },
        { path: '/display-reporting', label: t('sidebar.displayReporting'), pageName: 'Display Reporting', icon: BarChart3 },
        { path: '/product-shelf-reporting', label: t('sidebar.productShelfReporting'), pageName: 'Product Shelf Reporting', icon: BarChart3 },
        { path: '/product-insert-reporting', label: t('sidebar.productInsertReporting'), pageName: 'Product Insert Reporting', icon: BarChart3 },
        { path: '/problem-report', label: t('sidebar.problemReport'), pageName: 'Problem Report', icon: FileWarning },
        { path: '/sales-route-report', label: t('sidebar.salesRouteReport'), pageName: 'Sales Route Report', icon: BarChart3 },
        { path: '/merch-route-report', label: t('sidebar.merchRouteReport'), pageName: 'Merch Route Report', icon: BarChart3 },
      ]
    },
    {
      id: 'tools',
      label: t('sidebar.tools'),
      icon: Briefcase,
      items: [
        { path: '/send-notification', label: t('sidebar.sendNotification'), pageName: 'Send Notification', icon: Send },
        { path: '/track', label: t('sidebar.track'), pageName: 'Track', icon: Map },
      ]
    }
  ], [t]);

  const hasAnyPermissionInGroup = (items: { pageName: string }[]) => {
    return items.some(item => permissions[item.pageName]?.can_navigate);
  };

  const canNavigateAdmin = useMemo(() => {
    return adminGroups.some(group => hasAnyPermissionInGroup(group.items));
  }, [permissions, adminGroups]);

  const canNavigateTeam = useMemo(() => {
    return permissions['Team Dashboard']?.can_navigate || permissions['Team Reports']?.can_navigate;
  }, [permissions]);

  const renderPage = () => {
    const page = pageMap[activePage] || pageMap['/'];
    return permissions[page.pageName]?.can_navigate ? page.component : <AccessDenied />;
  };

  return (
    <div className="flex h-screen bg-background dark:bg-dark-background text-text-primary dark:text-dark-text-primary">
      {/* Overlay backdrop for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-surface dark:bg-dark-surface border-r transition-transform lg:translate-x-0 lg:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <div className="flex items-center gap-2"><Logo className="h-8 w-8" /><span className="font-bold">NBR Platform</span></div>
          <button className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-full" onClick={() => setIsSidebarOpen(false)}><X className="h-6 w-6" /></button>
        </div>
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          {permissions['Dashboard']?.can_navigate && <SidebarNavItem path="/" label={t('sidebar.dashboard')} icon={LayoutDashboard} activePage={activePage} navigateTo={navigateTo} />}
          {permissions['Sales Dashboard']?.can_navigate && <SidebarNavItem path="/sales-dashboard" label={t('sidebar.salesDashboard')} icon={BarChart3} activePage={activePage} navigateTo={navigateTo} />}

          {canNavigateTeam && (
            <div className="pt-2">
              <button onClick={() => setIsTeamOpen(!isTeamOpen)} className="w-full flex items-center justify-between py-2.5 px-3 text-sm font-medium text-text-secondary hover:bg-slate-200 dark:hover:bg-gray-700 rounded-md">
                <div className="flex items-center"><Users className="mr-3 h-5 w-5" />{t('sidebar.myTeam')}</div>
                <ChevronDown className={`h-4 w-4 transition-transform ${isTeamOpen ? 'rotate-180' : ''}`} />
              </button>
              {isTeamOpen && (
                <div className="pl-4 space-y-1">
                  {permissions['Team Dashboard']?.can_navigate && <SidebarNavItem path="/team-dashboard" label={t('sidebar.teamDashboard')} icon={BarChart3} activePage={activePage} navigateTo={navigateTo} depth={1} />}
                  {permissions['Team Reports']?.can_navigate && <SidebarNavItem path="/team-reports" label={t('sidebar.teamReports')} icon={FileText} activePage={activePage} navigateTo={navigateTo} depth={1} />}
                </div>
              )}
            </div>
          )}

          {permissions['Daily Plan']?.can_navigate && <SidebarNavItem path="/daily-plan" label={t('sidebar.dailyPlan')} icon={CalendarCheck} activePage={activePage} navigateTo={navigateTo} />}
          {permissions['Customer Visit Form']?.can_navigate && <SidebarNavItem path="/customer-visit-form" label={t('sidebar.customerVisitForm')} icon={FileEdit} activePage={activePage} navigateTo={navigateTo} />}
          
          {/* Fixed Asset Form */}
          {permissions['Fixed Asset Form']?.can_navigate && <SidebarNavItem path="/fixed-asset-form" label={t('fixedAssetForm.title')} icon={Box} activePage={activePage} navigateTo={navigateTo} />}

          {permissions['Fixed Asset Delivery']?.can_navigate && <SidebarNavItem path="/fixed-asset-delivery" label={t('sidebar.fixedAssetDelivery')} icon={Truck} activePage={activePage} navigateTo={navigateTo} />}
          {permissions['Competitor Price Analysis']?.can_navigate && <SidebarNavItem path="/competitor-price-analysis" label={t('sidebar.competitorPriceAnalysis')} icon={Tag} activePage={activePage} navigateTo={navigateTo} />}
          {permissions['My Visit Requests']?.can_navigate && <SidebarNavItem path="/my-visit-requests" label={t('sidebar.myVisitRequests')} icon={ClipboardCheck} activePage={activePage} navigateTo={navigateTo} />}

          {permissions['Seller Visit Report']?.can_navigate && <SidebarNavItem path="/seller-visit-report" label={t('sidebar.sellerVisitReport')} icon={BarChart3} activePage={activePage} navigateTo={navigateTo} />}
          {permissions['Merch Visit Report']?.can_navigate && <SidebarNavItem path="/merch-visit-report" label={t('sidebar.merchVisitReport')} icon={BarChart3} activePage={activePage} navigateTo={navigateTo} />}
          {permissions['Seller Route Report']?.can_navigate && <SidebarNavItem path="/seller-route-report" label={t('sidebar.sellerRouteReport')} icon={BarChart3} activePage={activePage} navigateTo={navigateTo} />}

          {permissions['Product Display']?.can_navigate && <SidebarNavItem path="/product-display" label={t('sidebar.productDisplay')} icon={BarChart3} activePage={activePage} navigateTo={navigateTo} />}
          {permissions['Product Shelf']?.can_navigate && <SidebarNavItem path="/product-shelf" label={t('sidebar.productShelf')} icon={Layers} activePage={activePage} navigateTo={navigateTo} />}
          {permissions['Product Insert']?.can_navigate && <SidebarNavItem path="/product-insert" label={t('sidebar.productInsert')} icon={FileInput} activePage={activePage} navigateTo={navigateTo} />}

          {permissions['My Product Inserts']?.can_navigate && <SidebarNavItem path="/my-product-inserts" label={t('sidebar.myProductInserts')} icon={FileInput} activePage={activePage} navigateTo={navigateTo} />}

          {permissions['Report a Problem']?.can_navigate && <SidebarNavItem path="/report-problem" label={t('sidebar.reportProblem')} icon={AlertCircle} activePage={activePage} navigateTo={navigateTo} />}
          {permissions['Problem Report']?.can_navigate && <SidebarNavItem path="/problem-report" label={t('sidebar.problemReport')} icon={FileWarning} activePage={activePage} navigateTo={navigateTo} />}

          {canNavigateAdmin && (
            <div className="pt-2">
              <button onClick={() => setIsAdminOpen(!isAdminOpen)} className="w-full flex items-center justify-between py-2.5 px-3 text-sm font-medium text-text-secondary hover:bg-slate-200 dark:hover:bg-gray-700 rounded-md">
                <div className="flex items-center"><Shield className="mr-3 h-5 w-5" />{t('sidebar.admin')}</div>
                <ChevronDown className={`h-4 w-4 transition-transform ${isAdminOpen ? 'rotate-180' : ''}`} />
              </button>
              {isAdminOpen && (
                <div className="space-y-1">
                  {adminGroups.map(group => hasAnyPermissionInGroup(group.items) && (
                    <div key={group.id} className="pl-4">
                      <button onClick={() => toggleSubMenu(group.id)} className="w-full flex items-center justify-between py-2 px-3 text-xs font-bold text-text-secondary uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-gray-700 rounded-md">
                        <span className="flex items-center"><group.icon className="mr-2 h-4 w-4" />{group.label}</span>
                        <ChevronRight className={`h-3 w-3 transition-transform ${openSubMenus[group.id] ? 'rotate-90' : ''}`} />
                      </button>
                      {openSubMenus[group.id] && (
                        <div className="space-y-1 mt-1">
                          {group.items.map(item => permissions[item.pageName]?.can_navigate && (
                            <SidebarNavItem key={item.path} path={item.path} label={item.label} icon={item.icon} activePage={activePage} navigateTo={navigateTo} depth={2} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header setIsSidebarOpen={setIsSidebarOpen} isUpdatingLocation={isUpdatingLocation} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background dark:bg-dark-background p-4 sm:p-6 md:p-8">
          {renderPage()}
        </main>
      </div>
      <NotificationContainer />
      {passwordRecoveryRequired && <PasswordResetModal onClose={() => setPasswordRecoveryRequired(false)} />}
    </div>
  );
};

export default Admin;
