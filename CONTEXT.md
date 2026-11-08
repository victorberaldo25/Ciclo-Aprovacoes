# CONTEXT.md — Ciclo-Aprovacoes

## Produto
Painel de auditoria do ciclo de aprovação de pedidos de compra (alçadas, tabela SCR do Protheus). Lê planilhas exportadas do ERP no navegador e mostra gargalos por aprovador e tempo de liberação.

## Estrutura
- `index.html` — layout
- `js/app.js` — UI, gráficos, filtros
- `js/data_processor.js` — parsing CSV/XLSX e cálculo de SLA
- `js/*.min.js` — libs locais (ApexCharts, PapaParse, SheetJS, Lucide)
- `css/styles.css` — design tokens (claro/escuro)
- `mock_data.js` — dados sintéticos (ainda não carregado pelo `index.html`)

## Tecnologias
HTML + JS vanilla, ApexCharts, PapaParse, SheetJS. Sem backend.
