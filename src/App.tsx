import React, { useState } from 'react';
import { AppProvider, useAppContext } from './contexts/AppContext';
import Login from './views/Login';
import Admin from './views/Admin';
import { Clipboard, Check, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { setupSqlScript } from './utils/dbSetup';

const Main: React.FC = () => {
    const { session, loading, error } = useAppContext();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center">
                    <Loader2 className="animate-spin h-10 w-10 text-indigo-600 dark:text-indigo-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-300">Loading application...</p>
                </div>
            </div>
        );
    }

    if (error === 'rls_error') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-3xl w-full border-l-4 border-yellow-500">
                    <div className="flex items-center mb-4 text-yellow-600">
                        <AlertTriangle className="h-8 w-8 mr-3" />
                        <h2 className="text-2xl font-bold">Database Setup Required</h2>
                    </div>
                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        It looks like this is the first time you are running the app, or the database policies are missing.
                        Please run the setup SQL script in your Supabase SQL Editor.
                    </p>
                    
                    <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md overflow-x-auto relative group">
                        <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap h-64 overflow-y-auto font-mono">
                            {setupSqlScript}
                        </pre>
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(setupSqlScript);
                                alert('SQL script copied to clipboard!');
                            }}
                            className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center text-sm"
                        >
                            <Clipboard className="h-4 w-4 mr-1" /> Copy SQL
                        </button>
                    </div>

                    <div className="mt-6 flex justify-end">
                         <button 
                            onClick={() => window.location.reload()}
                            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 flex items-center font-bold transition-colors"
                        >
                            <RefreshCw className="h-5 w-5 mr-2" />
                            I've run the script, Reload App
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    
    if (error) {
         return (
            <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-900/10 p-4">
                <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-red-100 dark:border-red-900">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">Application Error</h2>
                    <p className="text-red-600 dark:text-red-300">{error}</p>
                    <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">Retry</button>
                </div>
            </div>
        );
    }

    return session ? <Admin /> : <Login />;
};

const App: React.FC = () => {
    return (
        <ErrorBoundary>
            <AppProvider>
                <Main />
            </AppProvider>
        </ErrorBoundary>
    );
};

export default App;