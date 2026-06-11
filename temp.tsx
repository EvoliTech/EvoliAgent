const A = () =>         {activeTab === 'painel' && (
          <div className="flex-1 flex flex-col p-4 md:p-8">

            {/* Header Content */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-6 md:mb-8">
              <h2 className="text-[1.1rem] font-medium text-gray-800">Visão Geral</h2>
              {renderDateFilters()}
            </div>

            {/* Financial Grid Data */}
            <div className="flex flex-col border-b border-gray-200 pb-8 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                {/* Entradas */}
                <div className="flex flex-col px-0 md:px-6 border-b md:border-b-0 md:border-r border-gray-200 first:pl-0 pb-4 md:pb-0">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-medium text-gray-800">Entradas</h3>
                    <button onClick={() => setShowDetails('entradas')} className="text-sm font-medium text-blue-600 hover:underline">Ver detalhes</button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Recebido</span>
                      <span className="text-sm text-gray-800 font-medium">R$ {financialStats.paidTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">A receber</span>
                      <span className="text-sm text-gray-800 font-medium">R$ {financialStats.pendingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-sm text-gray-500">Total previsto</span>
                      <span className="text-sm text-gray-800 font-medium">R$ {financialStats.totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Saídas */}
                <div className="flex flex-col px-0 md:px-6 border-b md:border-b-0 md:border-r border-gray-200 pb-4 md:pb-0 pt-4 md:pt-0">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-medium text-gray-800">Saídas</h3>
                    <button onClick={() => setShowDetails('saidas')} className="text-sm font-medium text-blue-600 hover:underline">Ver detalhes</button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Pago</span>
                      <span className="text-sm text-gray-800 font-medium">R$ {despesas.filter(d => d.is_paga).reduce((acc, d) => acc + (d.valor || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">A pagar</span>
                      <span className="text-sm text-gray-800 font-medium">R$ {despesas.filter(d => !d.is_paga).reduce((acc, d) => acc + (d.valor || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-sm text-gray-500">Total previsto</span>
                      <span className="text-sm text-gray-800 font-medium">R$ {despesas.reduce((acc, d) => acc + (d.valor || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Taxas pagas / Planos */}
                <div className="flex flex-col px-0 md:px-6 pt-4 md:pt-0">
                  <div className="flex flex-col items-start justify-start mb-6 w-full">
                    <h3 className="text-sm font-medium text-gray-800">Taxas e Deduções</h3>
                    <span className="text-xs text-gray-400 mt-1">Custos retidos por operadoras e maquininhas</span>
                  </div>
                  <div className="space-y-4">
                    <div className="text-[28px] font-bold text-gray-800 mt-2">
                      R$ {financialStats.planTaxesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 flex-1">

              {/* Aguardando Repasse */}
              <div className="flex flex-col px-0 md:px-6 border-b md:border-b-0 md:border-r border-gray-200 first:pl-0 min-h-[160px] h-full overflow-hidden pb-4 md:pb-0">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-medium text-gray-800 w-full">Aguardando repasse (A receber)</h3>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded whitespace-nowrap">
                    Total: R$ {financialStats.pendingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="max-h-[160px] overflow-y-auto w-full pr-2 space-y-3">
                    {(() => {
                      const repassesPendentes = financialStats.transactions.filter(t => !t.isPaid && t.type !== 'saida');
                      if (repassesPendentes.length === 0) {
                        return <div className="text-center text-xs text-gray-500 mt-8">Não há pagamentos aguardando repasse.</div>;
                      }
                      return repassesPendentes.map((t, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800 line-clamp-1">{t.treatmentName || 'Pagamento'}</span>
                            <span className="text-xs text-gray-500">{t.patientName} • Data: {new Date(t.date).toLocaleDateString()}</span>
                          </div>
                          <span className="font-semibold text-emerald-600 whitespace-nowrap ml-2">
                            R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          {t.isManualRevenue && t.rawData && (
                            <button onClick={(e) => { e.stopPropagation(); setEditingTransaction({ type: 'receita', data: t.rawData }); }} className="text-blue-500 hover:text-blue-700 transition-colors p-1 ml-2">
                              <Edit3 size={15} />
                            </button>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              <div className="flex flex-col px-0 md:px-6 border-b md:border-b-0 md:border-r border-gray-200 pb-4 md:pb-0 pt-4 md:pt-0">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-medium text-gray-800">Histórico de Comissões</h3>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    Total: R$ {financialStats.comissoesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex flex-col flex-1 pb-2">
                  <div className="max-h-[160px] overflow-y-auto w-full pr-2">
                    {financialStats.comissoesList.length === 0 ? (
                      <div className="flex mt-8 items-center justify-center text-center text-xs text-gray-500">
                        Nenhum repasse de comissão encontrado para o período.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {financialStats.comissoesList.map(c => (
                            <div key={c.id} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-800 line-clamp-1">{c.treatment}</span>
                                <span className="text-xs text-gray-500">{c.profissional} • {c.paciente}</span>
                              </div>
                              <span className="font-semibold text-blue-600 whitespace-nowrap ml-2">
                                R$ {c.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>


              </div>

              {/* Proximas Despesas */}
              <div className="flex flex-col px-0 md:px-6 md:pr-0 min-h-[160px] pt-4 md:pt-0">
                <h3 className="text-sm font-medium text-gray-800 mb-6">Próximas despesas</h3>
                <div className="flex-1 flex flex-col justify-center">
                  {despesas.filter(d => !d.is_paga).length === 0 ? (
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-16 mb-3 relative flex items-center justify-center">
                        <div className="w-16 h-12 bg-orange-100 rounded border-2 border-orange-200 relative overflow-hidden flex items-end">
                          <div className="w-full h-1/2 bg-orange-200" />
                        </div>
                      </div>
                      <p className="text-xs font-medium text-gray-600">Nenhuma despesa futura cadastrada.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {despesas.filter(d => !d.is_paga).sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()).slice(0, 4).map(d => (
                        <div key={d.id} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                          <div>
                            <p className="font-medium text-gray-800 line-clamp-1">{d.titulo}</p>
                            <p className="text-xs text-gray-500">Vence: {new Date(d.data_vencimento + 'T12:00:00').toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-4 ml-2">
                            <p className="font-semibold text-red-600 whitespace-nowrap">R$ {d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <div className="flex items-center gap-1.5 border-l border-gray-100 pl-3">
                              <button onClick={(e) => handlePayDespesa(d.id!, d.tipoOrigem === 'receita', e)} className="text-emerald-600 font-bold text-[11px] px-2 py-1 bg-emerald-50 rounded hover:bg-emerald-100 transition-colors">
                                {d.tipoOrigem === 'receita' ? 'Receber' : 'Pagar'}
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setEditingTransaction({ type: d.tipoOrigem || 'despesa', data: d }); }} className="text-blue-500 hover:text-blue-700 transition-colors p-1">
                                <Edit3 size={15} />
                              </button>
                              <button onClick={(e) => handleDeleteDespesa(d.id!, d.tipoOrigem === 'receita', e)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {despesas.filter(d => !d.is_paga).length > 4 && (
                        <button
                          onClick={() => handleTabChange('fluxo')}
                          className="w-full mt-2 text-[13px] font-medium text-blue-600 hover:text-blue-700 hover:underline text-center pt-1"
                        >
                          Ver todas ({despesas.filter(d => !d.is_paga).length})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Footer Text */}
            <div className="pt-8 pb-10 border-b border-gray-200">
              <span className="text-xs text-gray-400 font-medium">* Informações atualizadas a cada 30 minutos</span>
            </div>

            {/* Nova Seção: Saúde da Clínica */}
            <div className="pt-10 flex flex-col">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-6">
                <h2 className="text-[1.1rem] font-medium text-gray-800">Saúde da clínica</h2>
                {renderDateFilters()}
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white flex flex-col">

                {/* Distribuição do faturamento */}
                <div className="flex flex-col p-6 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800 mb-6">Faturamento Geral</h3>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 flex-1">Clínica</span>
                    <span className="text-gray-700 font-medium w-32 text-center">100%</span>
                    <div className="w-32 flex justify-between items-center ml-auto">
                      <span className="text-gray-800 font-medium">R$ {financialStats.methodsData.reduce((acc, md) => acc + md.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Formas de pagamento */}
                <div className="flex flex-col p-6 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800 mb-6">Formas de pagamento</h3>
                  <div className="flex flex-col space-y-5 text-sm">
                    {financialStats.methodsData.length === 0 ? (
                      <span className="text-gray-500">Nenhum pagamento recebido.</span>
                    ) : financialStats.methodsData.map(md => (
                      <div key={md.name} className="flex justify-between items-center">
                        <span className="text-gray-600 flex-1">{md.name}</span>
                        <span className="text-gray-700 w-32 text-center">{Math.round(md.perc)}%</span>
                        <span className="text-gray-800 font-medium w-32 pr-[34px] text-right">R$ {md.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tratamentos mais realizados no período */}
                <div className="flex flex-col p-6">
                  <h3 className="text-sm font-semibold text-gray-800 mb-6">Tratamentos mais realizados no período</h3>
                  {financialStats.topTreatments.length === 0 ? (
                    <span className="text-gray-500 text-sm">Nenhum tratamento registrado.</span>
                  ) : financialStats.topTreatments.map((t, idx) => (
                    <div key={t.name} className="flex justify-between items-center text-sm mb-4 last:mb-0">
                      <span className="text-gray-600 flex-1">{idx + 1} - {t.name} (Qtd: {t.count})</span>
                      <span className="text-gray-800 font-medium w-32 pr-[34px] text-right">R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>

              </div>
            </div>

          </div>
        )}

        {activeTab === 'fluxo' && (
          <div className="flex-1 flex flex-col p-4 md:p-8 bg-[#fafafa]">

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8 mt-2">
              <div className="bg-white rounded-xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-gray-100 p-4 md:p-6 flex flex-col justify-between min-h-[120px] md:min-h-[140px]">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-emerald-500 font-medium text-[17px]">Receitas</h3>
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                    <ArrowDownRight size={18} strokeWidth={3} />
                  </div>
                </div>
                <div>
                  <div className="text-xl md:text-[28px] font-bold text-gray-800 leading-tight mb-2">R$ {financialStats.paidTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  <div className="text-[13px] font-medium text-gray-400 leading-tight">A receber R$ {financialStats.pendingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-gray-100 p-4 md:p-6 flex flex-col justify-between min-h-[120px] md:min-h-[140px]">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-red-500 font-medium text-[17px]">Despesas</h3>
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                    <ArrowUpRight size={18} strokeWidth={3} />
                  </div>
                </div>
                <div>
                  <div className="text-xl md:text-[28px] font-bold text-gray-800 leading-tight mb-2">R$ {despesas.filter(d => d.is_paga).reduce((a, b) => a + (b.valor || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  <div className="text-[13px] font-medium text-gray-400 leading-tight">A pagar R$ {despesas.filter(d => !d.is_paga).reduce((a, b) => a + (b.valor || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>;