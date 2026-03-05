import { useState } from 'react';
import Navbar from './components/Navbar';
import GitHubSetup from './components/GitHubSetup';
import ProfilerAnalyzer from './components/tabs/ProfilerAnalyzer';
import CrashAnalyzer from './components/tabs/CrashAnalyzer';
import TopScriptOffenders from './components/tabs/TopScriptOffenders';
import TopCrashOffenders from './components/tabs/TopCrashOffenders';
import InfoTab from './components/tabs/InfoTab';

type Tab = 'profiler' | 'crash' | 'top-scripts' | 'top-crashes' | 'info';

export default function App() {
  const [activeTab,    setActiveTab]    = useState<Tab>('profiler');
  const [showGHSetup,  setShowGHSetup]  = useState(false);
  // refreshKey fuerza re-mount de tabs para recargar datos tras configurar GitHub
  const [refreshKey,   setRefreshKey]   = useState(0);

  function handleGHSynced() {
    setRefreshKey(k => k + 1);
  }

  return (
    <div className="min-h-screen bg-app text-white">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onGitHubClick={() => setShowGHSetup(true)}
      />
      <main className="mx-auto max-w-7xl px-4 py-8">
        {activeTab === 'profiler'     && <ProfilerAnalyzer key={`p-${refreshKey}`} />}
        {activeTab === 'crash'        && <CrashAnalyzer    key={`c-${refreshKey}`} />}
        {activeTab === 'top-scripts'  && <TopScriptOffenders />}
        {activeTab === 'top-crashes'  && <TopCrashOffenders />}
        {activeTab === 'info'         && <InfoTab />}
      </main>

      {showGHSetup && (
        <GitHubSetup
          onClose={() => setShowGHSetup(false)}
          onSynced={handleGHSynced}
        />
      )}
    </div>
  );
}
