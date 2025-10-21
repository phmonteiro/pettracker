function Walks() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Passeios</h1>
        <p className="text-gray-600 mt-1">
          Visualizar e gerir todos os passeios registados
        </p>
      </div>

      <div className="card bg-blue-50 border-l-4 border-fidelidade-blue">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-fidelidade-blue"
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
            <h3 className="text-sm font-medium text-blue-800">Em Desenvolvimento</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Esta página permitirá visualizar todos os passeios, filtrar por utilizador e data,
                e editar passeios inválidos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Walks;
