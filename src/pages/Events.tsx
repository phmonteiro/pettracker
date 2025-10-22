import { useState, useEffect } from 'react';
import { Calendar, Search, Loader, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { backendAPI } from '@/api/backendClient';
import { format } from 'date-fns';
import type { TrackimoEvent } from '@/types';

function Events() {
  const [events, setEvents] = useState<TrackimoEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<TrackimoEvent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'date' | 'user' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [searchTerm, events, sortField, sortDirection]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load events from backend (users are embedded in event data)
      const eventsData = await backendAPI.getEvents();

      setEvents(eventsData);
      setFilteredEvents(eventsData);
    } catch (err) {
      setError('Erro ao carregar eventos. Por favor, tente novamente.');
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = events;

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = events.filter((event) => {
        const accountEmail = event.account_email?.toLowerCase() || '';
        const accountName = event.account_full_name?.toLowerCase() || '';
        const deviceName = event.device_name?.toLowerCase() || '';
        const eventType = event.alarm_type.toLowerCase();
        const deviceId = event.device_id.toString().toLowerCase();

        return (
          accountEmail.includes(term) ||
          accountName.includes(term) ||
          deviceName.includes(term) ||
          eventType.includes(term) ||
          deviceId.includes(term)
        );
      });
    }

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let compareValue = 0;

        if (sortField === 'date') {
          compareValue = a.created - b.created;
        } else if (sortField === 'user') {
          const nameA = (a.account_full_name || '').toLowerCase();
          const nameB = (b.account_full_name || '').toLowerCase();
          compareValue = nameA.localeCompare(nameB);
        }

        return sortDirection === 'asc' ? compareValue : -compareValue;
      });
    }

    setFilteredEvents(filtered);
  };

  const handleSort = (field: 'date' | 'user') => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default descending order
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: 'date' | 'user') => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 inline opacity-30" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4 ml-1 inline text-fidelidade-red" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1 inline text-fidelidade-red" />
    );
  };

  const getEventTypeLabel = (type: string): string => {
    switch (type.toUpperCase()) {
      case 'GEOZONE_ENTRY':
        return 'Entrada';
      case 'GEOZONE_EXIT':
        return 'Saída';
      case 'ENTER':
        return 'Entrada';
      case 'EXIT':
        return 'Saída';
      default:
        return type;
    }
  };

  const getEventTypeBadgeColor = (type: string): string => {
    const upperType = type.toUpperCase();
    if (upperType.includes('ENTRY') || upperType === 'ENTER') {
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
    }
    if (upperType.includes('EXIT')) {
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
    }
    return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-fidelidade-red" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Eventos</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Visualizar todos os eventos de entrada/saída de geozonas
          </p>
        </div>
        <button
          onClick={loadData}
          className="btn btn-secondary flex items-center gap-2"
        >
          <Calendar className="h-5 w-5" />
          Atualizar
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div className="ml-3">
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="card bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Informação</h3>
            <div className="mt-2 text-sm text-blue-700 dark:text-blue-400">
              <p>
                A mostrar todos os eventos sincronizados de entrada/saída de geozonas.
                Os eventos contêm informação do utilizador, dispositivo e localização.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card dark:bg-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar por utilizador, email, tipo de evento ou dispositivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-fidelidade-red focus:border-transparent"
          />
        </div>
      </div>

      {/* Events Table */}
      <div className="card dark:bg-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  onClick={() => handleSort('date')}
                >
                  Data/Hora
                  {getSortIcon('date')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  onClick={() => handleSort('user')}
                >
                  Utilizador
                  {getSortIcon('user')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Animal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Dispositivo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Geozona
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {searchTerm
                      ? 'Nenhum evento encontrado com os critérios de pesquisa.'
                      : 'Nenhum evento registado. Sincronize eventos na página de Sincronização.'}
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => {
                  // Use the 'created' field which is Unix timestamp in milliseconds
                  const eventDate = new Date(event.created);
                  
                  return (
                    <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {format(eventDate, 'dd/MM/yyyy')}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {format(eventDate, 'HH:mm:ss')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {event.account_full_name || 'Nome não disponível'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {event.account_email || 'Email não disponível'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {event.device_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventTypeBadgeColor(
                            event.alarm_type
                          )}`}
                        >
                          {getEventTypeLabel(event.alarm_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {event.device_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {event.geozone_name || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        {filteredEvents.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              A mostrar <span className="font-medium">{filteredEvents.length}</span> de{' '}
              <span className="font-medium">{events.length}</span> eventos
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Events;
