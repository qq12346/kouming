import { Routes, Route } from 'react-router';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AssemblyLine from './pages/AssemblyLine';
import PauseReflect from './pages/PauseReflect';
import SkillsPage from './pages/SkillsPage';
import AuditPanel from './pages/AuditPanel';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/assembly/new" element={<AssemblyLine />} />
        <Route path="/reflect" element={<PauseReflect />} />
        <Route path="/skills" element={<SkillsPage />} />
        <Route path="/audit" element={<AuditPanel />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
