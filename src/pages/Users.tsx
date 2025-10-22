import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, Loader } from 'lucide-react';
import { User, PetPlan } from '@/types';
import { backendAPI } from '@/api/backendClient';
import { format } from 'date-fns';

function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    nif: '',
    email: '',
    fullName: '',
    petName: '',
    petPlan: 'Pet 1',
    deviceId: '',
    deviceName: '',
    accountId: '',
    active: true,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await backendAPI.getUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch (err) {
      setError('Erro ao carregar utilizadores. Por favor, tente novamente.');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = users.filter(
      (user) =>
        user.fullName.toLowerCase().includes(term) ||
        user.nif.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.petName.toLowerCase().includes(term) ||
        user.deviceName.toLowerCase().includes(term) ||
        user.petPlan.toLowerCase().includes(term)
    );
    setFilteredUsers(filtered);
  };

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({
      nif: '',
      email: '',
      fullName: '',
      petName: '',
      petPlan: 'Pet 1',
      deviceId: '',
      deviceName: '',
      devices: [],
      accountId: '',
      active: true,
    });
    setShowModal(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData(user);
    setShowModal(true);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Tem a certeza que deseja eliminar este utilizador?')) {
      return;
    }

    try {
      await backendAPI.deleteUser(userId);
      await loadUsers();
    } catch (err) {
      alert('Erro ao eliminar utilizador. Por favor, tente novamente.');
      console.error('Error deleting user:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.nif || !formData.email || !formData.fullName || !formData.petName) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    try {
      const userData: User = {
        id: editingUser?.id || crypto.randomUUID(),
        nif: formData.nif!,
        email: formData.email!,
        fullName: formData.fullName!,
        petName: formData.petName!,
        petPlan: formData.petPlan as PetPlan,
        deviceId: formData.deviceId || '',
        deviceName: formData.deviceName || '',
        devices: formData.devices || (formData.deviceId ? [{id: formData.deviceId, name: formData.deviceName || ''}] : []),
        accountId: formData.accountId || '',
        createdAt: editingUser?.createdAt || new Date().toISOString(),
        totalWalks: editingUser?.totalWalks || 0,
        totalChallengesCompleted: editingUser?.totalChallengesCompleted || 0,
        active: formData.active ?? true,
      };

      await backendAPI.saveUser(userData);
      await loadUsers();
      setShowModal(false);
    } catch (err) {
      alert('Erro ao guardar utilizador. Por favor, tente novamente.');
      console.error('Error saving user:', err);
    }
  };

  const handleInputChange = (field: keyof User, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Utilizadores</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gerir utilizadores e os seus dispositivos Pet Tracker
          </p>
        </div>
        <button onClick={handleAdd} className="btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Adicionar Utilizador
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Search */}
      <div className="card dark:bg-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome, NIF, email, animal ou dispositivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-fidelidade-red focus:border-transparent"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="card dark:bg-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Nome / Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NIF
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Animal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plano
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dispositivo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Passeios
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Desafios
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Criação
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {searchTerm
                      ? 'Nenhum utilizador encontrado com os critérios de pesquisa.'
                      : 'Nenhum utilizador registado. Clique em "Adicionar Utilizador" para começar.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{user.fullName}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {user.nif}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {user.petName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {user.petPlan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.devices && user.devices.length > 0 ? (
                        <div className="space-y-1">
                          {user.devices.map((device) => (
                            <div key={device.id} className="text-sm">
                              <div className="text-gray-900 dark:text-white font-medium">{device.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{device.id}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div>
                          <div className="text-sm text-gray-900 dark:text-white">{user.deviceName || '-'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{user.deviceId || '-'}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {user.totalWalks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {user.totalChallengesCompleted}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(user.createdAt), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.active
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {user.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                        title="Editar"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        title="Eliminar"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        {filteredUsers.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              A mostrar <span className="font-medium">{filteredUsers.length}</span> de{' '}
              <span className="font-medium">{users.length}</span> utilizadores
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingUser ? 'Editar Utilizador' : 'Adicionar Utilizador'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-fidelidade-red focus:border-transparent"
                  />
                </div>

                {/* NIF */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">NIF *</label>
                  <input
                    type="text"
                    required
                    pattern="[0-9]{9}"
                    value={formData.nif}
                    onChange={(e) => handleInputChange('nif', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-fidelidade-red focus:border-transparent"
                    placeholder="123456789"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-fidelidade-red focus:border-transparent"
                  />
                </div>

                {/* Pet Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome do Animal *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.petName}
                    onChange={(e) => handleInputChange('petName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-fidelidade-red focus:border-transparent"
                  />
                </div>

                {/* Pet Plan */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Plano Pet *
                  </label>
                  <select
                    required
                    value={formData.petPlan}
                    onChange={(e) => handleInputChange('petPlan', e.target.value as PetPlan)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-fidelidade-red focus:border-transparent"
                  >
                    <option value="Pet 1">Pet 1</option>
                    <option value="Pet 2">Pet 2</option>
                    <option value="Pet 3">Pet 3</option>
                    <option value="Pet Vital">Pet Vital</option>
                  </select>
                </div>

                {/* Device Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome do Dispositivo
                  </label>
                  <input
                    type="text"
                    value={formData.deviceName}
                    onChange={(e) => handleInputChange('deviceName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-fidelidade-red focus:border-transparent"
                  />
                </div>

                {/* Device ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ID do Dispositivo
                  </label>
                  <input
                    type="text"
                    value={formData.deviceId}
                    onChange={(e) => handleInputChange('deviceId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-fidelidade-red focus:border-transparent"
                  />
                </div>

                {/* Account ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ID da Conta Trackimo
                  </label>
                  <input
                    type="text"
                    value={formData.accountId}
                    onChange={(e) => handleInputChange('accountId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-fidelidade-red focus:border-transparent"
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => handleInputChange('active', e.target.checked)}
                    className="h-4 w-4 text-fidelidade-red focus:ring-fidelidade-red border-gray-400 dark:border-gray-600 rounded"
                  />
                  <label htmlFor="active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Utilizador Ativo
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingUser ? 'Guardar Alterações' : 'Adicionar Utilizador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;
