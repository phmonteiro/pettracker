import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Walks from './pages/Walks';
import Sync from './pages/Sync';
import Export from './pages/Export';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={<Users />} />
        <Route path="/walks" element={<Walks />} />
        <Route path="/sync" element={<Sync />} />
        <Route path="/export" element={<Export />} />
      </Routes>
    </Layout>
  );
}

export default App;
