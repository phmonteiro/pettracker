import { Trophy, TrendingUp } from 'lucide-react';
import type { TopUser } from '@/types';

interface TopUsersTableProps {
  topUsers: TopUser[];
}

function TopUsersTable({ topUsers }: TopUsersTableProps) {
  if (topUsers.length === 0) {
    return (
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <Trophy className="h-6 w-6 mr-2 text-yellow-500" />
          Top 10 - Ranking Mensal
        </h2>
        <div className="text-center py-8 text-gray-500">
          <p>Ainda não há dados suficientes para o ranking.</p>
          <p className="text-sm mt-2">Sincronize eventos para ver os resultados.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
        <Trophy className="h-6 w-6 mr-2 text-yellow-500" />
        Top 10 - Ranking Mensal
      </h2>

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th className="w-16">Rank</th>
              <th>Nome</th>
              <th>Nome do Pet</th>
              <th className="text-center">Passeios</th>
              <th className="text-center">Desafios</th>
              <th className="text-center">Pontuação</th>
            </tr>
          </thead>
          <tbody>
            {topUsers.map((user) => (
              <tr key={user.nif} className="hover:bg-gray-50">
                <td>
                  <div className="flex items-center justify-center">
                    {user.rank <= 3 ? (
                      <div
                        className={`
                          w-8 h-8 rounded-full flex items-center justify-center font-bold text-white
                          ${user.rank === 1 ? 'bg-yellow-500' : ''}
                          ${user.rank === 2 ? 'bg-gray-400' : ''}
                          ${user.rank === 3 ? 'bg-orange-600' : ''}
                        `}
                      >
                        {user.rank}
                      </div>
                    ) : (
                      <span className="text-gray-600 font-semibold">{user.rank}</span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="font-medium text-gray-900 dark:text-white">{user.fullName}</div>
                  <div className="text-xs text-gray-500">NIF: {user.nif}</div>
                </td>
                <td>
                  <span className="font-medium text-gray-700">{user.petName}</span>
                </td>
                <td className="text-center">
                  <span className="badge badge-info">{user.totalWalks}</span>
                </td>
                <td className="text-center">
                  <span className="badge badge-success">{user.totalChallenges}</span>
                </td>
                <td className="text-center">
                  <div className="flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="font-bold text-gray-900 dark:text-white">{user.combinedScore}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-500 border-t pt-4">
        <p className="font-medium">📊 Sistema de Pontuação:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Cada passeio válido = 1 ponto</li>
          <li>Cada desafio completado = 10 pontos</li>
          <li>Pontuação total = Passeios + (Desafios × 10)</li>
        </ul>
      </div>
    </div>
  );
}

export default TopUsersTable;
