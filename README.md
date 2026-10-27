# ⏱️ Painel de Ciclo de Aprovações & Gargalos de Alçada (TOTVS Protheus SCR)

![Status](https://img.shields.io/badge/Status-Produ%C3%A7%C3%A3o%20%2F%20Portf%C3%B3lio-10B981?style=for-the-badge)
![Stack](https://img.shields.io/badge/Stack-JavaScript%20ES6%2B%20%7C%20ApexCharts%20%7C%20SheetJS%20%7C%20CSS3-F59E0B?style=for-the-badge)
![ERP Integrado](https://img.shields.io/badge/ERP-TOTVS%20Protheus%20(SCR%2FSC7)-3B82F6?style=for-the-badge)
![Tema](https://img.shields.io/badge/UI-Dark%20%26%20Light%20Theme-1E293B?style=for-the-badge)

> **English Summary:** Analytics dashboard designed to isolate and audit bottlenecks in corporate approval hierarchies (Protheus SCR table). Measures retention time per approval tier (Supervision, Management, Executive Board) with aging analysis of blocked purchase orders.

---

## 🔒 Nota de Segurança e Conformidade (LGPD)
> **Aviso de Compliance:** Este repositório é uma versão de demonstração para portfólio. Todos os dados de alçadas, aprovadores, fornecedores e valores foram **100% anonimizados** e substituídos por dados sintéticos (`mock_data.js`). A identidade corporativa adotada é **AgroTech Bioenergia S.A.** sob a assinatura técnica **VB Systems | RPA & Analytics**.

---

## 1. O Problema de Negócio
Em operações industriais de grande porte, grande parte do atraso nas compras não decorre da negociação comercial, mas sim do **tempo de retenção na fila de aprovação de alçadas financeiras** (`SCR`).
Este painel decompõe o *Lead Time* total do pedido entre:
* **Tempo Comercial:** Emissão da SC (`SC1`) até a finalização da negociação do Pedido (`SC7`).
* **Tempo de Alçada:** Emissão do Pedido (`CR_EMISSAO`) até a efetiva liberação pelo aprovador (`CR_DATALIB`).

---

## 2. Como Executar
1. Clone o repositório:
   ```bash
   git clone https://github.com/<seu-usuario>/ciclo-aprovacoes-alcadas-scr.git
   cd ciclo-aprovacoes-alcadas-scr
   ```
2. Abra `index.html` diretamente no navegador.
