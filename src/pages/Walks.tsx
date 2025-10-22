import { useState, useEffect } from 'react';
import { Footprints, Search, Loader, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle, XCircle } from 'lucide-react';
import { backendAPI } from '@/api/backendClient';
import { format } from 'date-fns';
import type { Walk } from '@/types';

function Walks() {
  const [walks, setWalks] = useState<Walk[]>([]);
  const [filteredWalks, setFilteredWalks] = useState<Walk[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'date' | 'user' | 'duration' | null>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterValid, setFilterValid] = useState<'all' | 'valid' | 'invalid'>('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterWalks();
  }, [searchTerm, walks, sortField, sortDirection, filterValid]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load walks from backend
      const walksData = await backendAPI.getWalks();

      setWalks(walksData);
      setFilteredWalks(walksData);
    } catch (err) {
      setError('Erro ao carregar passeios. Por favor, tente novamente.');
      console.error('Error loading walks:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterWalks = () => {
    let filtered = walks;

    // Apply validity filter
    if (filterValid !== 'all') {
      filtered = filtered.filter((walk) => 
        filterValid === 'valid' ? walk.isValid : !walk.isValid
      );
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((walk) => {
        const petName = walk.petName?.toLowerCase() || '';
        const geozoneName = walk.geozoneName?.toLowerCase() || '';
        const nif = walk.nif?.toLowerCase() || '';
        const deviceId = walk.deviceId?.toString().toLowerCase() || '';

        return (
          petName.includes(term) ||
          geozoneName.includes(term) ||
          nif.includes(term) ||
          deviceId.includes(term)
        );
      });
    }

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let compareValue = 0;

        if (sortField === 'date') {
          compareValue = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        } else if (sortField === 'user') {
          const nameA = (a.petName || '').toLowerCase();
          const nameB = (b.petName || '').toLowerCase();
          compareValue = nameA.localeCompare(nameB);
        } else if (sortField === 'duration') {
          compareValue = a.durationMinutes - b.durationMinutes;
        }

        return sortDirection === 'asc' ? compareValue : -compareValue;
      });
    }

    setFilteredWalks(filtered);
  };

  const handleSort = (field: 'date' | 'user' | 'duration') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: 'date' | 'user' | 'duration') => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 inline opacity-30" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4 ml-1 inline text-fidelidade-red" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1 inline text-fidelidade-red" />
    );
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-fidelidade-red" />
      </div>
    );
  }

  const validWalksCount = walks.filter((w) => w.isValid).length;
  const invalidWalksCount = walks.filter((w) => !w.isValid).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Passeios</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Visualizar e gerir todos os passeios registados
          </p>
        </div>
        <button
          onClick={loadData}
          className="btn btn-secondary flex items-center gap-2"
        >
          <Footprints className="h-5 w-5" />
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 dark:text-green-400">Passeios Válidos</p>
              <p className="text-3xl font-bold text-green-900 dark:text-white">{validWalksCount}</p>
              <p className="text-xs text-green-500 dark:text-green-400 mt-1">≥ 10 minutos</p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
        </div>

        <div className="card bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 dark:text-red-400">Passeios Inválidos</p>
              <p className="text-3xl font-bold text-red-900 dark:text-white">{invalidWalksCount}</p>
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">&lt; 10 minutos</p>
            </div>
            <XCircle className="h-12 w-12 text-red-500" />
          </div>
        </div>

        <div className="card bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400">Total de Passeios</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-white">{walks.length}</p>
              <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">Todos os registos</p>
            </div>
            <Footprints className="h-12 w-12 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="card bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Como funciona</h3>
            <div className="mt-2 text-sm text-blue-700 dark:text-blue-400">
              <p>
                Um passeio é formado por um evento de <strong>saída</strong> seguido de um evento de <strong>entrada</strong> na mesma geozona.
                Para ser considerado válido, o passeio deve ter duração <strong>≥ 10 minutos</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card dark:bg-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar por animal, geozona, NIF ou dispositivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-fidelidade-red focus:border-transparent"
            />
          </div>

          {/* Validity Filter */}
          <div>
            <select
              value={filterValid}
              onChange={(e) => setFilterValid(e.target.value as 'all' | 'valid' | 'invalid')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-fidelidade-red focus:border-transparent"
            >
              <option value="all">Todos os Passeios</option>
              <option value="valid">Apenas Válidos (≥ 10 min)</option>
              <option value="invalid">Apenas Inválidos (&lt; 10 min)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Walks Table */}
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
                  Animal
                  {getSortIcon('user')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Geozona
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  onClick={() => handleSort('duration')}
                >
                  Duração
                  {getSortIcon('duration')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Saída
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Entrada
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredWalks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {searchTerm || filterValid !== 'all'
                      ? 'Nenhum passeio encontrado com os critérios de pesquisa.'
                      : 'Nenhum passeio registado. Sincronize eventos na página de Sincronização.'}
                  </td>
                </tr>
              ) : (
                filteredWalks.map((walk) => {
                  const startDate = new Date(walk.startTime);
                  const endDate = new Date(walk.endTime);
                  
                  return (
                    <tr key={walk.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {format(startDate, 'dd/MM/yyyy')}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {format(startDate, 'HH:mm')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {walk.petName || 'Nome não disponível'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          NIF: {walk.nif || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {walk.geozoneName || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatDuration(walk.durationMinutes)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {walk.durationSeconds}s
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {format(startDate, 'HH:mm:ss')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {format(endDate, 'HH:mm:ss')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {walk.isValid ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Válido
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inválido
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        {filteredWalks.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              A mostrar <span className="font-medium">{filteredWalks.length}</span> de{' '}
              <span className="font-medium">{walks.length}</span> passeios
              {filterValid === 'valid' && ' válidos'}
              {filterValid === 'invalid' && ' inválidos'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Walks;
