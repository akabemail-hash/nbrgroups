
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAppContext } from '../contexts/AppContext';
import { Languages, Sun, Moon, ChevronDown, AtSign, Lock } from 'lucide-react';
import { Language } from '../types';

// NBR Logo Component
const Logo = ({ className }: { className?: string }) => {
  const { logoUrl } = useAppContext();

  if (logoUrl) {
    return <img src={logoUrl} alt="App Logo" className={className} style={{ objectFit: 'contain' }} />;
  }

  return <img src="https://iili.io/fN2Cwtp.png" alt="App Logo" className={className} style={{ objectFit: 'contain' }} />;
};


const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t, language, setLanguage, theme, toggleTheme } = useAppContext();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);


  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (err: any) {
      setError(t('login.error'));
    } finally {
      setLoading(false);
    }
  };
  
  const availableLanguages: { code: Language; name: string }[] = [
      { code: 'en', name: 'English' },
      { code: 'az', name: 'Azərbaycanca' },
      { code: 'tr', name: 'Türkçe' },
  ];

  const handleLanguageChange = (lang: Language) => {
      setLanguage(lang);
      setLangDropdownOpen(false);
  };

  return (
     <div className="min-h-screen bg-background dark:bg-dark-background flex items-center justify-center p-4">
        <div className="w-full max-w-5xl mx-auto bg-surface dark:bg-dark-surface rounded-2xl shadow-2xl overflow-hidden flex flex-col lg:flex-row lg:h-[700px]">

            {/* Left Panel - Branding */}
            <div className="relative hidden lg:flex lg:w-1/2 p-12 flex-col items-center justify-center text-white bg-primary dark:bg-dark-primary overflow-hidden order-1">
                {/* Decorative Blobs */}
                <div className="absolute -top-20 -left-20 w-80 h-80 bg-secondary dark:bg-dark-secondary rounded-full mix-blend-multiply filter blur-xl opacity-30"></div>
                <div className="absolute -bottom-20 -right-10 w-80 h-80 bg-accent dark:bg-dark-accent rounded-full mix-blend-multiply filter blur-xl opacity-30"></div>

                <div className="relative z-10 text-center">
                    <div className="mb-6">
                        <Logo className="h-32 w-32" />
                    </div>
                    <h1 className="text-4xl font-bold leading-tight">{t('login.platformTitle')}</h1>
                    <p className="mt-4 text-lg text-indigo-200 max-w-md">
                        {t('login.platformSubtitle')}
                    </p>
                </div>
            </div>


            {/* Right Panel - Form */}
            <div className="w-full lg:w-1/2 p-8 sm:p-12 flex flex-col justify-center order-2">
                <div className="w-full max-w-md mx-auto">
                    <h2 className="text-3xl font-extrabold text-text-primary dark:text-dark-text-primary mb-2">
                        {t('login.title')}
                    </h2>
                    <p className="text-text-secondary dark:text-dark-text-secondary mb-8">
                       {t('login.welcome')}
                    </p>

                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div>
                            <label htmlFor="email-address" className="sr-only">{t('login.email')}</label>
                            <div className="relative">
                                <AtSign className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="w-full block pl-12 pr-4 py-3 border border-border dark:border-dark-border bg-transparent text-text-primary dark:text-dark-text-primary placeholder-text-secondary dark:placeholder-dark-text-secondary focus:ring-2 focus:ring-inset focus:ring-primary dark:focus:ring-dark-primary rounded-lg shadow-sm sm:text-sm transition"
                                    placeholder={t('login.email')}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="sr-only">{t('login.password')}</label>
                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    className="w-full block pl-12 pr-4 py-3 border border-border dark:border-dark-border bg-transparent text-text-primary dark:text-dark-text-primary placeholder-text-secondary dark:placeholder-dark-text-secondary focus:ring-2 focus:ring-inset focus:ring-primary dark:focus:ring-dark-primary rounded-lg shadow-sm sm:text-sm transition"
                                    placeholder={t('login.password')}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        {error && <p className="text-red-500 dark:text-red-400 text-sm text-center">{error}</p>}
                        
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-primary dark:bg-dark-primary hover:bg-secondary dark:hover:bg-dark-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-dark-primary disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-primary/40 dark:hover:shadow-dark-primary/40"
                        >
                            {loading ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                t('login.button')
                            )}
                        </button>
                    </form>
                    
                     <div className="mt-10 pt-6 border-t border-border dark:border-dark-border flex items-center justify-center space-x-4">
                        <div className="relative">
                            <button onClick={() => setLangDropdownOpen(!langDropdownOpen)} className="flex items-center space-x-2 text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text-primary text-sm font-medium p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors">
                                <Languages className="h-5 w-5" />
                                <span>{availableLanguages.find(l => l.code === language)?.name}</span>
                                <ChevronDown className={`h-4 w-4 transition-transform ${langDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {langDropdownOpen && (
                                <div className="absolute bottom-full mb-2 w-40 bg-surface dark:bg-dark-surface rounded-md shadow-lg z-20 border border-border dark:border-dark-border">
                                    {availableLanguages.map(lang => (
                                        <button
                                            key={lang.code}
                                            onClick={() => handleLanguageChange(lang.code)}
                                            className={`w-full text-left px-4 py-2 text-sm ${language === lang.code ? 'font-bold text-accent dark:text-dark-accent' : 'text-text-primary dark:text-dark-text-primary'} hover:bg-background dark:hover:bg-dark-background`}
                                        >
                                            {lang.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-1 bg-background dark:bg-dark-background rounded-full flex items-center">
                             <button onClick={() => theme === 'dark' && toggleTheme()} className={`p-1.5 rounded-full ${theme === 'light' ? 'bg-accent text-white' : 'text-text-secondary'}`}>
                                <Sun className="h-4 w-4" />
                            </button>
                            <button onClick={() => theme === 'light' && toggleTheme()} className={`p-1.5 rounded-full ${theme === 'dark' ? 'bg-accent text-white' : 'text-text-secondary'}`}>
                                <Moon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
  );
};

export default Login;
