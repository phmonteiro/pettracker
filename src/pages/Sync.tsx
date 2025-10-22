import { useState } from 'react';
import { RefreshCw, Users, Calendar, Database, CheckCircle, XCircle } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import ProgressBar from '@/components/ProgressBar';
import type { SyncUsersResult, SyncEventsResult } from '@/types';
import { syncUsers, syncEvents, getSuggestedDateRanges } from '@/utils/syncService';

function Sync() {
  const [isSyncingUsers, setIsSyncingUsers] = useState(false);
  const [isSyncingEvents, setIsSyncingEvents] = useState(false);
  const [usersResult, setUsersResult] = useState<SyncUsersResult | null>(null);
  const [eventsResult, setEventsResult] = useState<SyncEventsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Date range selection
  const [selectedRange, setSelectedRange] = useState<string>('2'); // Default to "Último mês" (index 2)
  const [customFromDate, setCustomFromDate] = useState<string>('');
  const [customToDate, setCustomToDate] = useState<string>('');

  const suggestedRanges = getSuggestedDateRanges();

  const handleSyncUsers = async () => {
    setIsSyncingUsers(true);
    setError(null);
    setUsersResult(null);

    try {
      const result = await syncUsers();
      setUsersResult(result);

      if (!result.success) {
        setError('A sincronização de utilizadores foi concluída com erros.');
      }
    } catch (err) {
      console.error('Sync users error:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao sincronizar utilizadores');
    } finally {
      setIsSyncingUsers(false);
    }
  };

  const handleSyncEvents = async () => {
    setIsSyncingEvents(true);
    setError(null);
    setEventsResult(null);

    try {
      let fromDate: Date;
      let toDate: Date;

      if (selectedRange === 'custom') {
        if (!customFromDate || !customToDate) {
          throw new Error('Por favor, selecione as datas de início e fim.');
        }
        fromDate = new Date(customFromDate);
        toDate = new Date(customToDate);
      } else {
        const rangeIndex = parseInt(selectedRange);
        const range = suggestedRanges[rangeIndex];
        fromDate = range.from;
        toDate = range.to;
      }

      const result = await syncEvents(fromDate, toDate);
      setEventsResult(result);

      if (!result.success) {
        setError('A sincronização de eventos foi concluída com erros.');
      }
    } catch (err) {
      console.error('Sync events error:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao sincronizar eventos');
    } finally {
      setIsSyncingEvents(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sincronização</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Sincronize dados da API Trackimo para atualizar utilizadores, passeios e desafios
        </p>
      </div>

      {/* Global Error */}
      {error && (
        <ErrorMessage
          type="error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Sync Users Card */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <Users className="h-6 w-6 mr-2 text-fidelidade-red" />
              Sincronizar Utilizadores
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Busca todos os utilizadores e dispositivos da conta Trackimo principal
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {isSyncingUsers ? (
            <LoadingSpinner text="A sincronizar utilizadores..." />
          ) : (
            <>
              {usersResult && (
                <div className="space-y-3">
                  {usersResult.success ? (
                    <ErrorMessage
                      type="success"
                      title="Sincronização Concluída"
                      message={`${usersResult.totalProcessed} utilizadores processados com sucesso!`}
                      details={[
                        `Novos utilizadores: ${usersResult.newUsers}`,
                        `Utilizadores atualizados: ${usersResult.updatedUsers}`,
                        `Erros: ${usersResult.errors}`,
                      ]}
                    />
                  ) : (
                    <ErrorMessage
                      type="warning"
                      title="Sincronização com Erros"
                      message="A sincronização foi concluída mas alguns utilizadores tiveram problemas."
                      details={usersResult.errorDetails?.map((e) => `${e.email}: ${e.error}`)}
                    />
                  )}

                  {usersResult.totalProcessed > 0 && (
                    <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-center">
                        <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{usersResult.newUsers}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">Novos</p>
                      </div>
                      <div className="text-center">
                        <RefreshCw className="h-8 w-8 text-fidelidade-red mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{usersResult.updatedUsers}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">Atualizados</p>
                      </div>
                      <div className="text-center">
                        <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{usersResult.errors}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">Erros</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleSyncUsers}
                disabled={isSyncingUsers}
                className="btn btn-primary flex items-center space-x-2"
              >
                <RefreshCw className="h-5 w-5" />
                <span>Sincronizar Utilizadores</span>
              </button>

              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                <p>⚠️ Esta operação pode demorar alguns minutos dependendo do número de utilizadores.</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sync Events Card */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <Calendar className="h-6 w-6 mr-2 text-green-600" />
              Sincronizar Eventos e Passeios
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Busca eventos de entrada/saída de geozonas e processa passeios e desafios
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Date Range Selection */}
          <div>
            <label className="label">Período de Sincronização</label>
            <select
              value={selectedRange}
              onChange={(e) => setSelectedRange(e.target.value)}
              className="input"
              disabled={isSyncingEvents}
            >
              {suggestedRanges.map((range, index) => (
                <option key={index} value={index.toString()}>
                  {range.label}
                </option>
              ))}
              <option value="custom">Personalizado...</option>
            </select>
          </div>

          {/* Custom Date Range */}
          {selectedRange === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Data Início</label>
                <input
                  type="date"
                  value={customFromDate}
                  onChange={(e) => setCustomFromDate(e.target.value)}
                  className="input"
                  disabled={isSyncingEvents}
                />
              </div>
              <div>
                <label className="label">Data Fim</label>
                <input
                  type="date"
                  value={customToDate}
                  onChange={(e) => setCustomToDate(e.target.value)}
                  className="input"
                  disabled={isSyncingEvents}
                />
              </div>
            </div>
          )}

          {isSyncingEvents ? (
            <div className="space-y-4">
              <LoadingSpinner text="A sincronizar eventos..." />
              {eventsResult && eventsResult.totalEvents > 0 && (
                <div className="space-y-2">
                  <ProgressBar
                    current={eventsResult.savedEvents}
                    total={eventsResult.totalEvents}
                    label="Eventos Processados"
                  />
                  <ProgressBar
                    current={eventsResult.savedWalks}
                    total={eventsResult.processedWalks}
                    label="Passeios Guardados"
                  />
                </div>
              )}
            </div>
          ) : (
            <>
              {eventsResult && (
                <div className="space-y-3">
                  {eventsResult.success ? (
                    <ErrorMessage
                      type="success"
                      title="Sincronização Concluída"
                      message="Eventos e passeios sincronizados com sucesso!"
                      details={[
                        `Eventos recebidos: ${eventsResult.totalEvents}`,
                        `Eventos guardados: ${eventsResult.savedEvents}`,
                        `Passeios processados: ${eventsResult.processedWalks}`,
                        `Passeios guardados: ${eventsResult.savedWalks}`,
                        `Desafios calculados: ${eventsResult.processedChallenges}`,
                      ]}
                    />
                  ) : (
                    <ErrorMessage
                      type="warning"
                      title="Sincronização com Erros"
                      message="A sincronização foi concluída mas houve alguns problemas."
                      details={eventsResult.errors?.map((e) => e.error)}
                    />
                  )}

                  {eventsResult.totalEvents > 0 && (
                    <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-center">
                        <Database className="h-8 w-8 text-fidelidade-red mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{eventsResult.totalEvents}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">Eventos</p>
                      </div>
                      <div className="text-center">
                        <Users className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{eventsResult.savedWalks}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">Passeios</p>
                      </div>
                      <div className="text-center">
                        <CheckCircle className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {eventsResult.processedChallenges}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">Desafios</p>
                      </div>
                      <div className="text-center">
                        <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {eventsResult.errors?.length || 0}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">Erros</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleSyncEvents}
                disabled={isSyncingEvents}
                className="btn btn-success flex items-center space-x-2"
              >
                <RefreshCw className="h-5 w-5" />
                <span>Sincronizar Eventos</span>
              </button>

              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                <p>
                  ⚠️ Certifique-se de que sincronizou os utilizadores primeiro. Esta operação pode
                  demorar alguns minutos.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="card bg-red-50 dark:bg-red-900/20 border-l-4 border-fidelidade-red">
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
            <h3 className="text-sm font-medium text-red-800 dark:text-white">Processo de Sincronização</h3>
            <div className="mt-2 text-sm text-red-700 dark:text-white space-y-2">
              <p>
                <strong>1. Sincronizar Utilizadores:</strong> Busca todos os utilizadores e
                dispositivos da conta Trackimo. Execute isto primeiro e sempre que houver novos
                utilizadores.
              </p>
              <p>
                <strong>2. Sincronizar Eventos:</strong> Busca os eventos de entrada/saída de
                geozonas para o período selecionado. O sistema processa automaticamente os eventos
                em passeios válidos e calcula os desafios completados.
              </p>
              <p className="mt-3">
                <strong>Recomendação:</strong> Execute a sincronização de eventos mensalmente para
                calcular as recompensas do mês anterior.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sync;
