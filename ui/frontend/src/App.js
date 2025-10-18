import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { WhatCanIHelp } from './pages/WhatCanIHelp';
import { Dashboard } from './pages/Dashboard';
import { CreateCluster } from './pages/CreateCluster';
import { ClusterList } from './pages/ClusterList';
import { ClusterDetails } from './pages/ClusterDetails';
import { Diagnostics } from './pages/Diagnostics';
import { GuidedSetup } from './pages/GuidedSetup';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<WhatCanIHelp />} />
          <Route path="/setup" element={<GuidedSetup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/diagnostics" element={<Diagnostics />} />
          <Route path="/clusters" element={<ClusterList />} />
          <Route path="/clusters/create" element={<CreateCluster />} />
          <Route path="/clusters/:id" element={<ClusterDetails />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
