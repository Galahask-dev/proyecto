import { useState } from 'react';
import Navbar from './components/Navbar';
import ProfilerAnalyzer from './components/tabs/ProfilerAnalyzer';
import CrashAnalyzer from './components/tabs/CrashAnalyzer';
import TopScriptOffenders from './components/tabs/TopScriptOffenders';
import TopCrashOffenders from './components/tabs/TopCrashOffenders';
import InfoTab from './components/tabs/InfoTab';

type Tab = 'profiler' | 'crash' | 'top-scripts' | 'top-crashes' | 'info';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('profiler');

  return (
    <div className="min-h-screen bg-app text-white">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="mx-auto max-w-7xl px-4 py-8">
        {activeTab === 'profiler'     && <ProfilerAnalyzer />}
        {activeTab === 'crash'        && <CrashAnalyzer />}
        {activeTab === 'top-scripts'  && <TopScriptOffenders />}
        {activeTab === 'top-crashes'  && <TopCrashOffenders />}
        {activeTab === 'info'         && <InfoTab />}
      </main>
    </div>
  );
}
