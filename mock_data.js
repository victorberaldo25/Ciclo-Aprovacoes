/**
 * AgroTech Bioenergia S.A. | VB Systems - RPA & Analytics
 * Mock Data: Auditoria de Alçadas de Aprovação TOTVS Protheus (Tabela SCR)
 */
window.DEMO_MODE = true;

window.MOCK_SCR_DATA = {
  empresa: "AgroTech Bioenergia S.A.",
  metricas_alcada: {
    total_documentos: 154,
    tempo_medio_liberacao_horas: 18.5,
    aprovados_dentro_sla_pct: 88.3,
    bloqueados_em_alcada: 18,
    valor_bloqueado_brl: 3420000.00
  },
  niveis_alcada: [
    { nivel: "Nível 01 - Supervisão / Coordenação", tempo_medio_dias: 0.8, pendentes: 4, taxa_aprovacao: 96.2 },
    { nivel: "Nível 02 - Gerência de Área", tempo_medio_dias: 1.4, pendentes: 8, taxa_aprovacao: 91.5 },
    { nivel: "Nível 03 - Diretoria Executiva", tempo_medio_dias: 2.8, pendentes: 5, taxa_aprovacao: 84.0 },
    { nivel: "Nível 04 - CFO / Conselho", tempo_medio_dias: 4.1, pendentes: 1, taxa_aprovacao: 100.0 }
  ],
  aging_bloqueios: [
    { faixa: "0 a 2 dias", pedidos: 11, valor: 1450000.00 },
    { faixa: "3 a 5 dias", pedidos: 5, valor: 1120000.00 },
    { faixa: "6 a 10 dias", pedidos: 2, valor: 850000.00 },
    { faixa: "> 10 dias (Crítico)", pedidos: 0, valor: 0.00 }
  ]
};
