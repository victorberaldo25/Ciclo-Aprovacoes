# MEMORY.md — Ciclo-Aprovacoes

## Status atual (2026-11-08)
- Funcional como site estático; dados entram por upload de planilha.
- Auditoria de dados (2026-11-08): sem dados sensíveis encontrados.

## Pendências / próximos passos
- Ligar `mock_data.js` a um modo demonstração (hoje o painel abre vazio).

## Decisões
- Identidade fictícia única para o portfólio: **AgroTech Bioenergia S.A.** / VB Systems.
- Repositório reescrito em commit único limpo para não manter dados reais no histórico.

## Pegadinhas
- Planilhas reais (`*.xlsx`, `*.csv`) são ignoradas pelo `.gitignore` — manter assim.
