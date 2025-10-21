function Users() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Utilizadores</h1>
        <p className="text-gray-600 mt-1">
          Gerir utilizadores e os seus dispositivos Pet Tracker
        </p>
      </div>

      <div className="card bg-red-50 border-l-4 border-fidelidade-red">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-fidelidade-red"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Em Desenvolvimento</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>
                Esta página permitirá gerir utilizadores: adicionar, editar, remover e visualizar
                detalhes de cada utilizador e seus dispositivos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Users;
