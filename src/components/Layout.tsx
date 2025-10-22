import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Footprints, Calendar, RefreshCw, FileDown } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  const navLinks = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/users', icon: Users, label: 'Utilizadores' },
    { to: '/walks', icon: Footprints, label: 'Passeios' },
    { to: '/events', icon: Calendar, label: 'Eventos' },
    { to: '/sync', icon: RefreshCw, label: 'Sincronizar' },
    { to: '/export', icon: FileDown, label: 'Exportar' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-fidelidade-red dark:bg-fidelidade-darkRed text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="flex items-center">
                <h1 className="text-2xl font-bold">Fidelidade Pet Tracker</h1>
                <span className="ml-3 text-sm text-red-100">Gestão de Recompensas</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-gray-800 shadow-md border-r border-gray-200 dark:border-gray-700">
          <nav className="mt-5 px-2">
            {navLinks.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `group flex items-center px-4 py-3 text-sm font-medium rounded-lg mb-1 transition-colors ${
                    isActive
                      ? 'bg-fidelidade-red text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
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
        <main className="flex-1 bg-gray-50 dark:bg-gray-900 p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            © 2025 Fidelidade - Sistema de Gestão de Recompensas Pet Tracker
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
