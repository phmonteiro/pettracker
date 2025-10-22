import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Walks from './pages/Walks';
import Events from './pages/Events';
import Sync from './pages/Sync';
import Export from './pages/Export';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/walks" element={<Walks />} />
          <Route path="/events" element={<Events />} />
          <Route path="/sync" element={<Sync />} />
          <Route path="/export" element={<Export />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  );
}

export default App;
