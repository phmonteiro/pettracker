import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Footprints, RefreshCw, FileDown } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  const navLinks = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/users', icon: Users, label: 'Utilizadores' },
    { to: '/walks', icon: Footprints, label: 'Passeios' },
    { to: '/sync', icon: RefreshCw, label: 'Sincronizar' },
    { to: '/export', icon: FileDown, label: 'Exportar' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-fidelidade-red text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold">Fidelidade Pet Tracker</h1>
              <span className="ml-3 text-sm text-blue-200">Gestão de Recompensas</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-md">
          <nav className="mt-5 px-2">
            {navLinks.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `group flex items-center px-4 py-3 text-sm font-medium rounded-lg mb-1 transition-colors ${
                    isActive
                      ? 'bg-fidelidade-red text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <Icon className="mr-3 h-5 w-5" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-gray-50 p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © 2025 Fidelidade - Sistema de Gestão de Recompensas Pet Tracker
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
