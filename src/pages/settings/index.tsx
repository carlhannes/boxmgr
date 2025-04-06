import { useState, useEffect } from 'react';
import MainLayout from '@/layouts/MainLayout';
import useAuth from '@/lib/useAuth';
import UserManagement from '@/components/UserManagement';

interface Setting {
  key: string;
  value: string;
  description: string | null;
}

export default function Settings() {
  const { isAuthenticated, user, isAdmin, isLoading } = useAuth();
  // We track settings but only use it indirectly through the API key setting
  const [, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form values
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [language, setLanguage] = useState('');

  // Fetch existing settings
  useEffect(() => {
    if (isAuthenticated) {
      fetchSettings();
    }
  }, [isAuthenticated]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      
      const settingsData = await response.json();
      setSettings(settingsData);
      
      // Populate form values with existing settings
      const apiKeySetting = settingsData.find((s: Setting) => s.key === 'anthropic_api_key');
      if (apiKeySetting) {
        setAnthropicApiKey(apiKeySetting.value);
      }

      // Populate language setting
      const languageSetting = settingsData.find((s: Setting) => s.key === 'scan_language');
      if (languageSetting) {
        setLanguage(languageSetting.value);
      }
    } catch (err) {
      setError('Error loading settings. Please try again.');
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Save Anthropic API key
      const apiKeyResponse = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          key: 'anthropic_api_key', 
          value: anthropicApiKey,
          description: 'Anthropic API Key for Claude AI services'
        }),
      });

      if (!apiKeyResponse.ok) {
        throw new Error('Failed to save API key setting');
      }
      
      // Save language setting
      const languageResponse = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          key: 'scan_language', 
          value: language,
          description: 'Language for AI to use when scanning boxes'
        }),
      });

      if (!languageResponse.ok) {
        throw new Error('Failed to save language setting');
      }
      
      setSuccess('Settings saved successfully!');
      
      // Refresh settings data
      fetchSettings();
    } catch (err) {
      setError('Error saving settings. Please try again.');
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  // Show loading state while checking authentication
  if (isAuthenticated === null || isLoading || loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <MainLayout title="Settings">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-600 p-4 rounded-md mb-4">
            {success}
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">AI Configuration</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="anthropic_api_key" className="block text-sm font-medium text-gray-700 mb-1">
                Anthropic API Key
              </label>
              <input
                type="password"
                id="anthropic_api_key"
                value={anthropicApiKey}
                onChange={(e) => setAnthropicApiKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your Anthropic API key"
              />
              <p className="mt-1 text-sm text-gray-500">
                Required for using Claude AI to scan boxes and identify items. Get your API key from{' '}
                <a 
                  href="https://console.anthropic.com/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:text-blue-800"
                >
                  Anthropic Console
                </a>.
              </p>
            </div>
            
            <div className="mb-4">
              <label htmlFor="scan_language" className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Language
              </label>
              <input
                type="text"
                id="scan_language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., English, Spanish, French, Swedish"
              />
              <p className="mt-1 text-sm text-gray-500">
                When set, Claude AI will identify items and respond in this language when scanning boxes.
                Leave empty to auto-detect language from existing items.
              </p>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* User Management section - only shown to admin users when we're sure they're admin */}
        {isAdmin && user && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <UserManagement currentUser={user} />
          </div>
        )}

        <div className="text-right text-sm text-gray-500">
          <p>
            Box Manager - {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </MainLayout>
  );
}