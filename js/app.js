// app.js - Controlador principal do Painel de Alçadas de Aprovação
// AgroTech Bioenergia S.A. - Gestão de Alçadas com Subpáginas (Geral, SC, PC) e Mini Janelas

const App = {
  allDocuments: [],
  filteredDocuments: [],
  approverMap: {},
  approverDemand: [],
  kpis: {},
  activeTab: 'total', // 'total', 'sc', 'pc'

  filters: {
    dataInicio: '2026-09-18',
    dataFim: '',
    filial: 'TODOS',
    tipo: 'TODOS',
    status: 'TODOS',
    aprovador: 'TODOS',
    sla: 'TODOS',
    busca: ''
  },

  charts: {
    demandTotal: null,
    filialTotal: null,
    demandSC: null,
    filialSC: null,
    demandPC: null,
    filialPC: null
  },

  // Inicialização do aplicativo
  async init() {
    this.initTheme();
    this.initLucide();
    await this.loadApproverMap();
    await this.loadInitialData();
    this.bindEvents();
  },

  // Inicialização e Gestão de Tema (Claro / Escuro)
  initTheme() {
    const savedTheme = localStorage.getItem('eco_theme') || 'light';
    this.applyTheme(savedTheme);
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    this.applyTheme(next);
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('eco_theme', theme);

    const btnText = document.getElementById('theme-toggle-text');
    const iconWrap = document.getElementById('theme-toggle-icon-wrap');

    if (theme === 'dark') {
      if (btnText) btnText.innerText = 'Tema claro';
      if (iconWrap) iconWrap.innerHTML = '<i data-lucide="sun"></i>';
    } else {
      if (btnText) btnText.innerText = 'Tema escuro';
      if (iconWrap) iconWrap.innerHTML = '<i data-lucide="moon"></i>';
    }

    this.initLucide();
    this.updateChartsTheme(theme);
  },

  updateChartsTheme(theme) {
    const mode = theme === 'dark' ? 'dark' : 'light';
    Object.values(this.charts).forEach(chart => {
      if (chart) {
        chart.updateOptions({
          theme: { mode: mode }
        }, false, true);
      }
    });
  },

  initLucide() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  // Alterna entre Subpáginas (Visão Geral, SC, PC)
  switchTab(tabId) {
    if (!['total', 'sc', 'pc'].includes(tabId)) return;
    this.activeTab = tabId;

    // Atualiza botões da barra de navegação
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
    });
    const activeBtn = document.getElementById(`tab-btn-${tabId}`);
    if (activeBtn) {
      activeBtn.classList.add('active');
      activeBtn.setAttribute('aria-selected', 'true');
    }

    // Atualiza containers de visualização
    document.querySelectorAll('.subpage-view').forEach(view => {
      view.classList.remove('active');
    });
    const activeView = document.getElementById(`subpage-${tabId}`);
    if (activeView) activeView.classList.add('active');

    // Oculta/Exibe o seletor de Tipo de Documento no filtro conforme a aba
    const tipoContainer = document.getElementById('filter-tipo-container');
    if (tipoContainer) {
      if (tabId === 'sc') {
        tipoContainer.style.display = 'none';
        this.filters.tipo = 'SC';
      } else if (tabId === 'pc') {
        tipoContainer.style.display = 'none';
        this.filters.tipo = 'TODOS'; // dentro de PC pega PC e IP
      } else {
        tipoContainer.style.display = 'flex';
        this.filters.tipo = 'TODOS';
      }
      const selectTipo = document.getElementById('filter-tipo');
      if (selectTipo) selectTipo.value = this.filters.tipo;
    }

    this.applyFilters();
    this.initLucide();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // Filtro Rápido por Status (Segmented Buttons)
  setStatusFilter(status) {
    this.filters.status = status;
    document.querySelectorAll('[data-status]').forEach(c => c.classList.remove('active'));

    const chipId = status === 'TODOS' ? 'chip-status-todos' : (status === 'Pendente' ? 'chip-status-pendente' : 'chip-status-liberado');
    const chip = document.getElementById(chipId);
    if (chip) chip.classList.add('active');

    this.applyFilters();
  },

  // Filtro Rápido por Filial (Chips, Select ou Tabela)
  setFilialFilter(filial) {
    this.filters.filial = String(filial);

    const selFilial = document.getElementById('filter-filial');
    if (selFilial) selFilial.value = String(filial);

    this.applyFilters();
    this.showToast(filial === 'TODOS' ? 'Exibindo todas as filiais' : `Filtrando por Filial ${filial}`, 'info');
  },

  // Alterna o painel de filtros avançados
  toggleAdvancedFilters() {
    const panel = document.getElementById('advanced-panel');
    const btn = document.getElementById('toggle-advanced-btn');
    if (!panel || !btn) return;

    const isHidden = panel.hasAttribute('hidden');
    if (isHidden) {
      panel.removeAttribute('hidden');
      btn.setAttribute('aria-expanded', 'true');
      btn.classList.add('active');
    } else {
      panel.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', 'false');
      btn.classList.remove('active');
    }
    this.initLucide();
  },

  // Remove um filtro específico (via pills ativas)
  clearFilter(key) {
    switch (key) {
      case 'busca':
        this.filters.busca = '';
        const inBusca = document.getElementById('filter-busca');
        if (inBusca) inBusca.value = '';
        const searchBox = document.getElementById('search-box');
        if (searchBox) searchBox.classList.remove('has-value');
        break;
      case 'status':
        this.setStatusFilter('TODOS');
        return;
      case 'filial':
        this.setFilialFilter('TODOS');
        return;
      case 'tipo':
        this.filters.tipo = 'TODOS';
        const selTipo = document.getElementById('filter-tipo');
        if (selTipo) selTipo.value = 'TODOS';
        break;
      case 'aprovador':
        this.filters.aprovador = 'TODOS';
        const selAprov = document.getElementById('filter-aprovador');
        if (selAprov) selAprov.value = 'TODOS';
        break;
      case 'sla':
        this.filters.sla = 'TODOS';
        const selSla = document.getElementById('filter-sla');
        if (selSla) selSla.value = 'TODOS';
        break;
      case 'periodo':
        this.setQuickPeriod('atual_18');
        return;
      case 'dataInicio':
        this.filters.dataInicio = '2026-09-18';
        const inIni = document.getElementById('filter-data-inicio');
        if (inIni) inIni.value = '2026-09-18';
        break;
      case 'dataFim':
        this.filters.dataFim = '';
        const inFim = document.getElementById('filter-data-fim');
        if (inFim) inFim.value = '';
        break;
    }
    this.applyFilters();
  },

  // Reseta todos os filtros para o padrão
  resetFilters() {
    this.filters = {
      dataInicio: '2026-09-18',
      dataFim: '',
      filial: 'TODOS',
      tipo: this.activeTab === 'sc' ? 'SC' : 'TODOS',
      status: 'TODOS',
      aprovador: 'TODOS',
      sla: 'TODOS',
      busca: ''
    };

    const inInicio = document.getElementById('filter-data-inicio');
    if (inInicio) inInicio.value = '2026-09-18';
    const inFim = document.getElementById('filter-data-fim');
    if (inFim) inFim.value = '';
    const selFilial = document.getElementById('filter-filial');
    if (selFilial) selFilial.value = 'TODOS';
    const selTipo = document.getElementById('filter-tipo');
    if (selTipo) selTipo.value = this.filters.tipo;
    const selAprov = document.getElementById('filter-aprovador');
    if (selAprov) selAprov.value = 'TODOS';
    const selSla = document.getElementById('filter-sla');
    if (selSla) selSla.value = 'TODOS';
    const inBusca = document.getElementById('filter-busca');
    if (inBusca) inBusca.value = '';
    const searchBox = document.getElementById('search-box');
    if (searchBox) searchBox.classList.remove('has-value');

    document.querySelectorAll('#period-segment .seg-btn').forEach(p => p.classList.remove('active'));
    const pDefault = document.querySelector('#period-segment .seg-btn[data-period="atual_18"]');
    if (pDefault) pDefault.classList.add('active');

    document.querySelectorAll('[data-status]').forEach(c => c.classList.remove('active'));
    const cDefault = document.getElementById('chip-status-todos');
    if (cDefault) cDefault.classList.add('active');

    this.applyFilters();
    this.showToast('Filtros redefinidos para o padrão.', 'info');
  },

  // Carrega mapeamento de aprovadores (localStorage ou arquivo JSON padrão)
  async loadApproverMap() {
    try {
      const saved = localStorage.getItem('eco_approver_map');
      if (saved) {
        this.approverMap = JSON.parse(saved);
        return;
      }
      const res = await fetch('data/aprovadores.json');
      if (res.ok) {
        this.approverMap = await res.json();
      }
    } catch (e) {
      console.warn('Erro ao carregar mapa de aprovadores:', e);
      this.approverMap = {};
    }
  },

  // Carrega dados pré-processados da extração atual
  async loadInitialData() {
    try {
      const overlay = document.getElementById('loading-overlay');
      if (overlay) overlay.style.display = 'flex';
      const res = await fetch('data/initial_data.json');
      if (res.ok) {
        const data = await res.json();
        this.allDocuments = data.documentos || [];
        const origem = data.origem_arquivo ? ` (${data.origem_arquivo})` : '';
        this.updateDataIndicator(`Carregado: ${data.total_documentos} docs${origem}`);
        this.applyFilters();
      } else {
        this.showToast('Selecione ou carregue uma extração JSON para iniciar', 'info');
      }
    } catch (e) {
      console.warn('Erro ao carregar initial_data.json:', e);
      this.showToast('Aguardando envio de dados...', 'info');
    } finally {
      const overlay = document.getElementById('loading-overlay');
      if (overlay) overlay.style.display = 'none';
    }
  },

  updateDataIndicator(text) {
    const el = document.getElementById('data-indicator-text');
    if (el) el.innerText = text;
  },

  // Aplica filtros atuais e recalcula subpáginas e KPIs
  applyFilters() {
    const matchUser = (uCod, targetCod) => {
      if (!uCod || !targetCod) return false;
      const a = String(uCod).trim().replace(/^0+/, '') || '0';
      const b = String(targetCod).trim().replace(/^0+/, '') || '0';
      return a === b;
    };

    // 1. Filtra documentos globais respeitando período, filial, status, SLA, aprovador e busca
    const baseFilters = { ...this.filters, tipo: 'TODOS' };
    const docsAll = DataProcessor.filterDocuments(this.allDocuments, baseFilters);

    // Documentos segmentados
    const docsSC = docsAll.filter(d => d.tipo_docto === 'SC');
    const docsPC = docsAll.filter(d => d.tipo_docto !== 'SC'); // PC e IP

    // Se houver filtro específico de tipo no dropdown na tela geral:
    let docsTotalTab = docsAll;
    if (this.filters.tipo !== 'TODOS') {
      docsTotalTab = docsAll.filter(d => d.tipo_docto === this.filters.tipo);
    }

    // 2. Calcula demandas de aprovadores para cada recorte
    const demandTotal = DataProcessor.computeApproverDemand(docsTotalTab, this.approverMap);
    const demandSC = DataProcessor.computeApproverDemand(docsSC, this.approverMap);
    const demandPC = DataProcessor.computeApproverDemand(docsPC, this.approverMap);

    // 3. Calcula KPIs para cada recorte sob a ótica do aprovador selecionado (se houver)
    const kpisTotal = DataProcessor.computeKPIs(docsTotalTab, demandTotal, this.filters.aprovador);
    const kpisSC = DataProcessor.computeKPIs(docsSC, demandSC, this.filters.aprovador);
    const kpisPC = DataProcessor.computeKPIs(docsPC, demandPC, this.filters.aprovador);

    this.kpis = kpisTotal;
    this.filteredDocuments = docsTotalTab;

    // 4. Atualiza Badges das Abas no Topo
    const badgeTotal = document.getElementById('tab-badge-total');
    if (badgeTotal) badgeTotal.innerText = `${docsAll.length}`;

    const badgeSC = document.getElementById('tab-badge-sc');
    if (badgeSC) {
      badgeSC.innerText = `${kpisSC.docsPendentes} pendentes`;
      badgeSC.className = `tab-badge ${kpisSC.docsPendentes > 0 ? 'warn' : ''}`;
    }

    const badgePC = document.getElementById('tab-badge-pc');
    if (badgePC) {
      badgePC.innerText = `${kpisPC.docsPendentes} pendentes`;
      badgePC.className = `tab-badge ${kpisPC.docsPendentes > 0 ? 'warn' : ''}`;
    }

    // 5. Atualiza Contadores dos Chips de Status (mostra distribuição real sem travar no status ativo)
    const statusBaseDocs = DataProcessor.filterDocuments(this.allDocuments, {
      ...this.filters,
      status: 'TODOS',
      tipo: 'TODOS'
    });

    const countTodos = document.getElementById('chip-count-todos');
    if (countTodos) countTodos.innerText = statusBaseDocs.length;

    let pendCount = 0;
    let libCount = 0;
    if (this.filters.aprovador !== 'TODOS') {
      const app = this.filters.aprovador;
      statusBaseDocs.forEach(d => {
        if (d.aprovadores_pendentes && d.aprovadores_pendentes.some(p => matchUser(p.cod_usuario, app))) pendCount++;
        if (d.aprovadores_liberados && d.aprovadores_liberados.some(l => matchUser(l.cod_usuario, app))) libCount++;
      });
    } else {
      statusBaseDocs.forEach(d => {
        if (d.status_geral === 'Pendente') pendCount++;
        else if (d.status_geral === 'Totalmente Liberado') libCount++;
      });
    }

    const countPend = document.getElementById('chip-count-pend');
    if (countPend) countPend.innerText = pendCount;

    const countLib = document.getElementById('chip-count-lib');
    if (countLib) countLib.innerText = libCount;

    // 6. Renderiza Chips de Filiais dinamicamente com contagens atualizadas
    this.renderFilialChips();

    // 7. Atualiza contador de resultados
    const resCount = document.getElementById('result-count');
    const resLabel = document.getElementById('result-label');
    const currentViewDocs = this.activeTab === 'sc' ? docsSC : (this.activeTab === 'pc' ? docsPC : docsTotalTab);
    if (resCount) resCount.innerText = currentViewDocs.length;
    if (resLabel) resLabel.innerText = currentViewDocs.length === 1 ? 'processo na visão' : 'processos na visão';

    // 8. Atualiza Pills de Filtros Ativos
    this.renderActiveFilterPills();

    // 9. Renderiza Mini-Janelas Comparativas (SC vs PC) na Visão Geral
    this.renderMiniWindows(kpisSC, kpisPC);

    // 10. Renderiza KPIs de cada Subpágina
    this.renderSubpageKPIs(kpisTotal, kpisSC, kpisPC);

    // 11. Renderiza Gráficos de cada Subpágina
    this.renderCharts(docsTotalTab, demandTotal, docsSC, demandSC, docsPC, demandPC);

    // 12. Renderiza Listas de Aprovadores
    this.renderApproversList('total', demandTotal);
    this.renderApproversList('sc', demandSC);
    this.renderApproversList('pc', demandPC);

    // 13. Renderiza Tabelas de Documentos
    this.renderDocumentsTable('total', docsTotalTab);
    this.renderDocumentsTable('sc', docsSC);
    this.renderDocumentsTable('pc', docsPC);

    // Base de aprovadores disponíveis (sem travar no filtro de aprovador para não esvaziar a lista)
    const approverFilterBase = DataProcessor.filterDocuments(this.allDocuments, {
      ...this.filters,
      aprovador: 'TODOS',
      tipo: 'TODOS'
    });
    const allApproversDemand = DataProcessor.computeApproverDemand(approverFilterBase, this.approverMap);
    this.updateApproverSelectOptions(allApproversDemand);
    this.updateFilialSelectOptions();
    this.initLucide();
  },

  // Renderiza dinamicamente os chips de filial na barra de filtros
  renderFilialChips() {
    const container = document.getElementById('filial-chips');
    if (!container) return;

    const filiaisSet = new Set();
    this.allDocuments.forEach(d => { if (d.filial) filiaisSet.add(String(d.filial)); });
    const filiais = Array.from(filiaisSet).sort();

    // Documentos sob o período e status atuais (mas sem travar na filial)
    const baseDocs = DataProcessor.filterDocuments(this.allDocuments, {
      ...this.filters,
      filial: 'TODOS',
      tipo: this.activeTab === 'sc' ? 'SC' : (this.activeTab === 'pc' ? 'TODOS' : this.filters.tipo)
    });

    const counts = {};
    baseDocs.forEach(d => {
      const f = String(d.filial);
      counts[f] = (counts[f] || 0) + 1;
    });

    let html = `
      <button class="chip chip-all ${this.filters.filial === 'TODOS' ? 'active' : ''}" onclick="App.setFilialFilter('TODOS')">
        Todas <span class="chip-count">${baseDocs.length}</span>
      </button>
    `;

    filiais.forEach(f => {
      const count = counts[f] || 0;
      const isActive = String(this.filters.filial) === String(f);
      const emptyCls = count === 0 && !isActive ? 'is-empty' : '';
      html += `
        <button class="chip ${isActive ? 'active' : ''} ${emptyCls}" onclick="App.setFilialFilter('${f}')" title="Filtrar Filial ${f}">
          <span>Filial ${f}</span>
          <span class="chip-count">${count}</span>
        </button>
      `;
    });

    container.innerHTML = html;
  },

  // Renderiza as tags dos filtros ativos que o usuário pode remover com 1 clique
  renderActiveFilterPills() {
    const container = document.getElementById('active-filters');
    const advancedBadge = document.getElementById('advanced-count');
    if (!container) return;

    const activeList = [];
    let advancedActiveCount = 0;

    if (this.filters.busca && this.filters.busca.trim()) {
      activeList.push({
        key: 'busca',
        label: 'Busca',
        val: `"${this.filters.busca.trim()}"`
      });
    }

    if (this.filters.filial !== 'TODOS') {
      activeList.push({
        key: 'filial',
        label: 'Filial',
        val: `Filial ${this.filters.filial}`
      });
    }

    if (this.filters.status !== 'TODOS') {
      activeList.push({
        key: 'status',
        label: 'Status',
        val: this.filters.status === 'Pendente' ? 'Pendentes' : 'Concluídos'
      });
    }

    if (this.activeTab === 'total' && this.filters.tipo !== 'TODOS') {
      activeList.push({
        key: 'tipo',
        label: 'Tipo',
        val: this.filters.tipo
      });
      advancedActiveCount++;
    }

    if (this.filters.aprovador !== 'TODOS') {
      activeList.push({
        key: 'aprovador',
        label: 'Aprovador',
        val: this.getApproverName(this.filters.aprovador)
      });
      advancedActiveCount++;
    }

    if (this.filters.sla !== 'TODOS') {
      const slaMap = {
        'no_prazo': 'No prazo (≤ 2d)',
        'alerta': 'Atenção (3-5d)',
        'gargalo': 'Gargalo (> 5d)'
      };
      activeList.push({
        key: 'sla',
        label: 'SLA',
        val: slaMap[this.filters.sla] || this.filters.sla
      });
      advancedActiveCount++;
    }

    if (this.filters.dataInicio !== '2026-09-18' || this.filters.dataFim) {
      const iniFmt = this.filters.dataInicio ? this.formatDateIso(this.filters.dataInicio) : 'Início';
      const fimFmt = this.filters.dataFim ? this.formatDateIso(this.filters.dataFim) : 'Hoje';
      activeList.push({
        key: 'periodo',
        label: 'Emissão',
        val: `${iniFmt} → ${fimFmt}`
      });
      advancedActiveCount++;
    }

    if (advancedBadge) {
      if (advancedActiveCount > 0) {
        advancedBadge.removeAttribute('hidden');
        advancedBadge.innerText = advancedActiveCount;
      } else {
        advancedBadge.setAttribute('hidden', '');
      }
    }

    if (activeList.length === 0) {
      container.setAttribute('hidden', '');
      container.innerHTML = '';
      return;
    }

    container.removeAttribute('hidden');
    let html = activeList.map(item => `
      <span class="af-pill">
        <span>${item.label}:</span>
        <b>${item.val}</b>
        <button type="button" onclick="App.clearFilter('${item.key}')" title="Remover filtro ${item.label}">
          <i data-lucide="x"></i>
        </button>
      </span>
    `).join('');

    if (activeList.length > 1) {
      html += `<button class="af-clear" type="button" onclick="App.resetFilters()">Limpar todos</button>`;
    }

    container.innerHTML = html;
  },

  formatDateIso(iso) {
    if (!iso || iso.length < 10) return iso || '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  },

  // Renderiza as Mini Janelas Comparativas na Visão Geral
  renderMiniWindows(kpisSC, kpisPC) {
    // Mini Janela SC
    const elScTotal = document.getElementById('mini-sc-total');
    if (elScTotal) elScTotal.innerText = kpisSC.totalDocs || 0;
    const elScPend = document.getElementById('mini-sc-pendentes');
    if (elScPend) elScPend.innerText = kpisSC.docsPendentes || 0;
    const elScLib = document.getElementById('mini-sc-liberados');
    if (elScLib) elScLib.innerText = kpisSC.docsLiberados || 0;
    const elScSla = document.getElementById('mini-sc-sla');
    if (elScSla) elScSla.innerText = `${kpisSC.slaMedio || 0} dias`;
    const elScGargalo = document.getElementById('mini-sc-gargalo');
    if (elScGargalo) {
      if (kpisSC.gargalo && kpisSC.gargalo.qtd > 0) {
        elScGargalo.innerHTML = `<strong>${kpisSC.gargalo.nome}</strong> (${kpisSC.gargalo.qtd} pendências)`;
      } else {
        elScGargalo.innerText = 'Nenhuma retenção ativa';
      }
    }

    const scPct = kpisSC.totalDocs > 0 ? Math.round((kpisSC.docsLiberados / kpisSC.totalDocs) * 100) : 0;
    const elScProgLbl = document.getElementById('mini-sc-progress-label');
    const elScProgBar = document.getElementById('mini-sc-progress');
    if (elScProgLbl) elScProgLbl.innerText = `${scPct}% (${kpisSC.docsLiberados}/${kpisSC.totalDocs})`;
    if (elScProgBar) elScProgBar.style.width = `${scPct}%`;

    // Mini Janela PC
    const elPcTotal = document.getElementById('mini-pc-total');
    if (elPcTotal) elPcTotal.innerText = kpisPC.totalDocs || 0;
    const elPcPend = document.getElementById('mini-pc-pendentes');
    if (elPcPend) elPcPend.innerText = kpisPC.docsPendentes || 0;
    const elPcLib = document.getElementById('mini-pc-liberados');
    if (elPcLib) elPcLib.innerText = kpisPC.docsLiberados || 0;
    const elPcSla = document.getElementById('mini-pc-sla');
    if (elPcSla) elPcSla.innerText = `${kpisPC.slaMedio || 0} dias`;
    const elPcGargalo = document.getElementById('mini-pc-gargalo');
    if (elPcGargalo) {
      if (kpisPC.gargalo && kpisPC.gargalo.qtd > 0) {
        elPcGargalo.innerHTML = `<strong>${kpisPC.gargalo.nome}</strong> (${kpisPC.gargalo.qtd} pendências)`;
      } else {
        elPcGargalo.innerText = 'Nenhuma retenção ativa';
      }
    }

    const pcPct = kpisPC.totalDocs > 0 ? Math.round((kpisPC.docsLiberados / kpisPC.totalDocs) * 100) : 0;
    const elPcProgLbl = document.getElementById('mini-pc-progress-label');
    const elPcProgBar = document.getElementById('mini-pc-progress');
    if (elPcProgLbl) elPcProgLbl.innerText = `${pcPct}% (${kpisPC.docsLiberados}/${kpisPC.totalDocs})`;
    if (elPcProgBar) elPcProgBar.style.width = `${pcPct}%`;
  },

  // Renderiza KPIs em cada subpágina
  renderSubpageKPIs(kpisTotal, kpisSC, kpisPC) {
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    const setHtml = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };

    // Total Geral
    setVal('kpi-total-docs', kpisTotal.totalDocs || 0);
    setVal('kpi-pendentes-docs', kpisTotal.docsPendentes || 0);
    setVal('kpi-liberados-docs', kpisTotal.docsLiberados || 0);
    setVal('kpi-sla-medio', `${kpisTotal.slaMedio || 0} dias`);
    if (kpisTotal.gargalo && kpisTotal.gargalo.qtd > 0) {
      setHtml('kpi-gargalo-text', `<strong>${kpisTotal.gargalo.nome}</strong> (${kpisTotal.gargalo.qtd} pendências)`);
    } else {
      setVal('kpi-gargalo-text', 'Nenhum gargalo identificado');
    }

    // SC
    setVal('kpi-sc-total', kpisSC.totalDocs || 0);
    setVal('kpi-sc-pendentes', kpisSC.docsPendentes || 0);
    setVal('kpi-sc-liberados', kpisSC.docsLiberados || 0);
    setVal('kpi-sc-sla', `${kpisSC.slaMedio || 0} dias`);
    if (kpisSC.gargalo && kpisSC.gargalo.qtd > 0) {
      setHtml('kpi-sc-gargalo', `<strong>${kpisSC.gargalo.nome}</strong> (${kpisSC.gargalo.qtd} pendências)`);
    } else {
      setVal('kpi-sc-gargalo', 'Nenhum gargalo identificado');
    }

    // PC
    setVal('kpi-pc-total', kpisPC.totalDocs || 0);
    setVal('kpi-pc-pendentes', kpisPC.docsPendentes || 0);
    setVal('kpi-pc-liberados', kpisPC.docsLiberados || 0);
    setVal('kpi-pc-sla', `${kpisPC.slaMedio || 0} dias`);
    if (kpisPC.gargalo && kpisPC.gargalo.qtd > 0) {
      setHtml('kpi-pc-gargalo', `<strong>${kpisPC.gargalo.nome}</strong> (${kpisPC.gargalo.qtd} pendências)`);
    } else {
      setVal('kpi-pc-gargalo', 'Nenhum gargalo identificado');
    }
  },

  // Renderiza Gráficos (ApexCharts)
  renderCharts(docsTotal, demandTotal, docsSC, demandSC, docsPC, demandPC) {
    this.renderDemandChart('#chart-demand-total', demandTotal, 'demandTotal');
    this.renderFilialChart('#chart-filial-total', docsTotal, 'filialTotal');

    if (this.activeTab === 'sc') {
      this.renderDemandChart('#chart-demand-sc', demandSC, 'demandSC');
      this.renderFilialChart('#chart-filial-sc', docsSC, 'filialSC');
    } else if (this.activeTab === 'pc') {
      this.renderDemandChart('#chart-demand-pc', demandPC, 'demandPC');
      this.renderFilialChart('#chart-filial-pc', docsPC, 'filialPC');
    }
  },

  renderDemandChart(selector, approvers, chartKey) {
    const chartEl = document.querySelector(selector);
    if (!chartEl) return;

    const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const isDark = currentTheme === 'dark';

    const activeApprovers = approvers.filter(a => a.pendente_qtd > 0 || a.aguardando_qtd > 0 || a.liberado_qtd > 0);
    const names = activeApprovers.map(a => a.nome);
    const pendentes = activeApprovers.map(a => a.pendente_qtd);
    const aguardando = activeApprovers.map(a => a.aguardando_qtd);
    const liberados = activeApprovers.map(a => a.liberado_qtd);

    const options = {
      series: [
        { name: 'Pendente (Ação Imediata)', data: pendentes, color: '#f59e0b' },
        { name: 'Aguardando Nível Anterior', data: aguardando, color: '#3b82f6' },
        { name: 'Liberado no Período', data: liberados, color: '#10b981' }
      ],
      chart: {
        type: 'bar',
        height: 290,
        stacked: true,
        toolbar: { show: false },
        fontFamily: 'inherit',
        background: 'transparent'
      },
      theme: { mode: currentTheme },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 4,
          dataLabels: { total: { enabled: true, style: { fontSize: '11px', fontWeight: 700 } } }
        }
      },
      stroke: { width: 1, colors: [isDark ? '#101725' : '#ffffff'] },
      grid: {
        borderColor: isDark ? '#1e2939' : '#edf0f4',
        strokeDashArray: 3
      },
      xaxis: {
        categories: names,
        labels: { style: { colors: isDark ? '#9ba8ba' : '#64748b', fontSize: '11px' } }
      },
      yaxis: {
        labels: { style: { colors: isDark ? '#e7ecf3' : '#0f172a', fontWeight: 600, fontSize: '12px' } }
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '12px',
        labels: { colors: isDark ? '#9ba8ba' : '#4b5768' }
      },
      tooltip: {
        theme: currentTheme,
        y: { formatter: (val) => val + ' processos' }
      }
    };

    if (this.charts[chartKey]) {
      this.charts[chartKey].updateOptions(options);
    } else {
      this.charts[chartKey] = new ApexCharts(chartEl, options);
      this.charts[chartKey].render();
    }
  },

  renderFilialChart(selector, documents, chartKey) {
    const chartEl = document.querySelector(selector);
    if (!chartEl) return;

    const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const isDark = currentTheme === 'dark';

    const filialDocs = {};
    for (const doc of documents) {
      const f = `Filial ${doc.filial}`;
      if (!filialDocs[f]) filialDocs[f] = new Set();
      filialDocs[f].add(doc.documento);
    }

    const labels = Object.keys(filialDocs).sort();
    const values = labels.map(l => filialDocs[l].size);

    if (labels.length === 0) {
      labels.push('Sem processos');
      values.push(0);
    }

    const options = {
      series: [{ name: 'Processos Únicos', data: values }],
      chart: {
        type: 'bar',
        height: 290,
        toolbar: { show: false },
        fontFamily: 'inherit',
        background: 'transparent',
        events: {
          dataPointSelection: (event, chartContext, config) => {
            const selectedLabel = labels[config.dataPointIndex];
            if (selectedLabel && selectedLabel.startsWith('Filial ')) {
              const fil = selectedLabel.replace('Filial ', '').trim();
              this.setFilialFilter(fil);
            }
          }
        }
      },
      theme: { mode: currentTheme },
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: '45%',
          distributed: true,
          dataLabels: { position: 'top' }
        }
      },
      colors: ['#059669', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'],
      grid: {
        borderColor: isDark ? '#1e2939' : '#edf0f4',
        strokeDashArray: 3
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => val,
        offsetY: -20,
        style: { fontSize: '12px', colors: [isDark ? '#e7ecf3' : '#334155'], fontWeight: 700 }
      },
      legend: { show: false },
      xaxis: {
        categories: labels,
        labels: { style: { colors: isDark ? '#9ba8ba' : '#64748b', fontSize: '11px', fontWeight: 600 } }
      },
      yaxis: {
        labels: { style: { colors: isDark ? '#9ba8ba' : '#64748b', fontSize: '11px' } }
      },
      tooltip: {
        theme: currentTheme,
        y: { formatter: (val) => val + ' processos' }
      }
    };

    if (this.charts[chartKey]) {
      this.charts[chartKey].updateOptions(options);
    } else {
      this.charts[chartKey] = new ApexCharts(chartEl, options);
      this.charts[chartKey].render();
    }
  },

  // Renderiza cards de aprovadores para uma subpágina
  renderApproversList(type, demandList) {
    const containerId = type === 'total' 
      ? 'approvers-cards-container-total' 
      : (type === 'sc' ? 'approvers-cards-container-sc' : 'approvers-cards-container-pc');

    const container = document.getElementById(containerId);
    if (!container) return;

    const activeList = demandList.filter(a => a.pendente_qtd > 0 || a.aguardando_qtd > 0 || a.liberado_qtd > 0);
    activeList.sort((a, b) => b.pendente_qtd - a.pendente_qtd || b.liberado_qtd - a.liberado_qtd);

    if (activeList.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i data-lucide="inbox"></i>
          <div>Nenhum aprovador com demanda encontrada neste filtro.</div>
        </div>
      `;
      return;
    }

    const currentAprov = String(this.filters.aprovador);

    let html = '';
    for (const app of activeList) {
      const initials = app.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
      const hasPend = app.pendente_qtd > 0;
      const isSelected = currentAprov !== 'TODOS' && (currentAprov === String(app.cod_usuario) || currentAprov.replace(/^0+/, '') === String(app.cod_usuario).replace(/^0+/, ''));
      const cardClass = `${hasPend ? 'has-pendencia' : ''} ${isSelected ? 'is-selected' : ''}`.trim();

      html += `
        <div class="approver-card ${cardClass}">
          <div class="approver-card-header">
            <div class="approver-profile">
              <div class="approver-avatar">${initials}</div>
              <div style="min-width:0;">
                <div class="approver-name" title="${app.nome}">${app.nome}</div>
                <div class="approver-meta">Cód. Usuário: <strong>${app.cod_usuario}</strong> &bull; Alçada: <strong>${app.cod_aprovad || '-'}</strong></div>
                <div class="approver-meta text-muted">${app.cargo}</div>
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="App.filterByApprover('${app.cod_usuario}')" title="Filtrar processos deste aprovador">
              <i data-lucide="filter"></i> Fila
            </button>
          </div>

          <div class="approver-stats-row">
            <div class="approver-stat-item">
              <div class="stat-label">Pendente</div>
              <div class="stat-val stat-pendente">${app.pendente_qtd}</div>
            </div>
            <div class="approver-stat-item">
              <div class="stat-label">Em Espera</div>
              <div class="stat-val stat-aguardando">${app.aguardando_qtd}</div>
            </div>
            <div class="approver-stat-item">
              <div class="stat-label">Liberados</div>
              <div class="stat-val stat-liberado">${app.liberado_qtd}</div>
            </div>
          </div>

          <div class="approver-val-row">
            <span>Impacto no ciclo:</span>
            <span class="${hasPend ? 'impact-warn' : 'impact-ok'}">
              ${hasPend ? `${app.pendente_qtd} processo(s) retido(s)` : 'Alçada em dia'}
            </span>
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  },

  // Filtra direto ao clicar no botão "Fila" do cartão do aprovador
  filterByApprover(codUsr) {
    this.filters.aprovador = String(codUsr);
    const select = document.getElementById('filter-aprovador');
    if (select) select.value = String(codUsr);
    this.applyFilters();
    this.showToast(`Filtro aplicado para: ${this.getApproverName(codUsr)}`, 'info');
  },

  // Renderiza Tabela de Documentos para uma Subpágina
  renderDocumentsTable(type, documents) {
    const tbodyId = type === 'total' 
      ? 'documents-tbody-total' 
      : (type === 'sc' ? 'documents-tbody-sc' : 'documents-tbody-pc');

    const countBadgeId = type === 'total' 
      ? 'docs-count-badge-total' 
      : (type === 'sc' ? 'docs-count-badge-sc' : 'docs-count-badge-pc');

    const tbody = document.getElementById(tbodyId);
    const countBadge = document.getElementById(countBadgeId);

    const distinctCount = new Set(documents.map(d => d.documento)).size;
    if (countBadge) countBadge.innerText = `${distinctCount} processos únicos`;

    if (!tbody) return;

    if (documents.length === 0) {
      const colSpan = (type === 'sc' || type === 'pc') ? 9 : 8;
      tbody.innerHTML = `
        <tr>
          <td colspan="${colSpan}" class="empty-cell">
            <i data-lucide="search-x"></i><br>
            Nenhum documento encontrado para os filtros selecionados.
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    for (const doc of documents) {
      const tipoLower = doc.tipo_docto.toLowerCase();
      const tipoClass = `badge-${tipoLower}`;

      let statusBadge = '';
      if (doc.status_geral === 'Pendente') {
        statusBadge = '<span class="badge badge-status-pendente"><i data-lucide="clock"></i> Pendente</span>';
      } else if (doc.status_geral === 'Totalmente Liberado') {
        statusBadge = '<span class="badge badge-status-liberado"><i data-lucide="check-circle-2"></i> Liberado</span>';
      } else {
        statusBadge = '<span class="badge badge-status-aguardando"><i data-lucide="layers"></i> Aguardando nível</span>';
      }

      // Onde está parado (responsável imediato)
      let pendenteCom = '-';
      if (doc.status_geral === 'Pendente' && doc.onde_esta_parado) {
        pendenteCom = `<span class="cell-stuck">${doc.onde_esta_parado}</span>`;
      } else if (doc.status_geral === 'Totalmente Liberado') {
        pendenteCom = `<span class="cell-muted">${doc.onde_esta_parado}</span>`;
      } else {
        pendenteCom = `<span class="cell-muted">Aguardando nível anterior</span>`;
      }

      // SLA Badge
      const dias = doc.dias_alcada || 0;
      let slaBadge = '';
      if (doc.status_geral === 'Totalmente Liberado') {
        slaBadge = `<span class="badge badge-neutral"><i data-lucide="check-check"></i> ${dias}d (Concluído)</span>`;
      } else if (doc.sla_status === 'gargalo') {
        slaBadge = `<span class="badge badge-danger"><i data-lucide="alert-octagon"></i> ${dias}d (Gargalo)</span>`;
      } else if (doc.sla_status === 'alerta') {
        slaBadge = `<span class="badge badge-status-pendente"><i data-lucide="alert-triangle"></i> ${dias}d (Atenção)</span>`;
      } else {
        slaBadge = `<span class="badge badge-status-liberado"><i data-lucide="check-circle"></i> ${dias}d (No prazo)</span>`;
      }

      const isFilialActive = String(this.filters.filial) === String(doc.filial);
      const filialBtn = `
        <button class="badge badge-filial ${isFilialActive ? 'active' : ''}" onclick="App.setFilialFilter('${doc.filial}')" title="Filtrar processos da Filial ${doc.filial}">
          Filial ${doc.filial}
        </button>
      `;

      if (type === 'sc') {
        // Aba de SC: mostra o PC que virou
        let pcGeradoCell = '<span class="cell-muted">-</span>';
        const pcs = doc.pcs_gerados || [];
        if (pcs.length > 0) {
          pcGeradoCell = pcs.map(p => `
            <button class="link-chip link-chip-pc" onclick="App.openEsteiraModal('${p.tipo_docto || 'PC'}', '${p.filial || doc.filial}', '${p.documento}')" title="Inspecionar Pedido Gerado ${p.documento}">
              <i data-lucide="shopping-cart"></i> PC ${p.documento}
            </button>
          `).join(' ');
        } else if (doc.num_pc_gerado && doc.num_pc_gerado !== '-') {
          pcGeradoCell = `
            <button class="link-chip link-chip-pc" onclick="App.openEsteiraModal('PC', '${doc.filial}', '${doc.num_pc_gerado}')" title="Inspecionar Pedido Gerado ${doc.num_pc_gerado}">
              <i data-lucide="shopping-cart"></i> PC ${doc.num_pc_gerado}
            </button>
          `;
        }

        html += `
          <tr>
            <td>${filialBtn}</td>
            <td><span class="badge ${tipoClass}">${doc.tipo_docto}</span></td>
            <td><span class="doc-num sc">${doc.documento}</span></td>
            <td>${pcGeradoCell}</td>
            <td>${doc.data_emissao || '-'}</td>
            <td>${statusBadge}</td>
            <td>${pendenteCom}</td>
            <td>${slaBadge}</td>
            <td>
              <button class="btn btn-secondary btn-sm" onclick="App.openEsteiraModal('${doc.tipo_docto}', '${doc.filial}', '${doc.documento}')" title="Ver esteira de aprovação">
                <i data-lucide="eye"></i> Esteira
              </button>
            </td>
          </tr>
        `;
      } else if (type === 'pc') {
        // Aba de PC: mostra a SC de origem
        let scOrigemCell = '<span class="cell-muted">-</span>';
        if (doc.num_sc_origem && doc.num_sc_origem !== '-') {
          scOrigemCell = `
            <button class="link-chip link-chip-sc" onclick="App.openEsteiraModal('SC', '${doc.filial}', '${doc.num_sc_origem}')" title="Inspecionar SC de Origem ${doc.num_sc_origem}">
              <i data-lucide="file-text"></i> SC ${doc.num_sc_origem}
            </button>
          `;
        }

        html += `
          <tr>
            <td>${filialBtn}</td>
            <td><span class="badge ${tipoClass}">${doc.tipo_docto}</span></td>
            <td><span class="doc-num ${tipoLower}">${doc.documento}</span></td>
            <td>${scOrigemCell}</td>
            <td>${doc.data_emissao || '-'}</td>
            <td>${statusBadge}</td>
            <td>${pendenteCom}</td>
            <td>${slaBadge}</td>
            <td>
              <button class="btn btn-secondary btn-sm" onclick="App.openEsteiraModal('${doc.tipo_docto}', '${doc.filial}', '${doc.documento}')" title="Ver esteira de aprovação">
                <i data-lucide="eye"></i> Esteira
              </button>
            </td>
          </tr>
        `;
      } else {
        // Aba Geral: Sem coluna de SC origem
        html += `
          <tr>
            <td>${filialBtn}</td>
            <td><span class="badge ${tipoClass}">${doc.tipo_docto}</span></td>
            <td><span class="doc-num ${tipoLower}">${doc.documento}</span></td>
            <td>${doc.data_emissao || '-'}</td>
            <td>${statusBadge}</td>
            <td>${pendenteCom}</td>
            <td>${slaBadge}</td>
            <td>
              <button class="btn btn-secondary btn-sm" onclick="App.openEsteiraModal('${doc.tipo_docto}', '${doc.filial}', '${doc.documento}')" title="Ver esteira de aprovação">
                <i data-lucide="eye"></i> Esteira
              </button>
            </td>
          </tr>
        `;
      }
    }

    tbody.innerHTML = html;
  },

  // Retorna nome amigável do aprovador
  getApproverName(code) {
    if (code === undefined || code === null || code === '') return '-';
    const cStr = String(code).trim();
    const cClean = cStr.replace(/^0+/, '') || '0';
    const app = this.approverMap[cStr] || this.approverMap[cClean];
    return app ? app.nome : `Usuário ${code}`;
  },

  // Abre Modal de Linha do Tempo / Esteira de Cada Etapa
  openEsteiraModal(tipo, filial, docNum) {
    const doc = this.allDocuments.find(d => 
      d.tipo_docto === tipo && 
      String(d.filial) === String(filial) && 
      String(d.documento) === String(docNum)
    );
    if (!doc) {
      this.showToast(`Documento ${tipo} ${docNum} não localizado nesta extração.`, 'warning');
      return;
    }

    document.getElementById('modal-doc-title').innerText = `${doc.tipo_docto} ${doc.documento}`;
    const linkInfo = doc.tipo_docto === 'SC' 
      ? `PC Gerado: ${doc.num_pc_gerado || '-'}`
      : `SC Origem: ${doc.num_sc_origem || '-'}`;
    document.getElementById('modal-doc-sub').innerText = `Filial ${doc.filial} • Emissão: ${doc.data_emissao} • ${linkInfo}`;

    const container = document.getElementById('modal-timeline-container');
    let html = '';

    // Bloco de Resumo Superior do Status (Gargalo ou Conclusão)
    if (doc.status_geral === 'Totalmente Liberado') {
      html += `
        <div class="callout tone-ok">
          <div>
            <div class="callout-eyebrow"><i data-lucide="check-circle-2"></i> Status do Fluxo de Aprovações</div>
            <div class="callout-title">Processo 100% Concluído</div>
            <div class="callout-meta">${doc.onde_esta_parado}</div>
          </div>
          <span class="badge badge-status-liberado badge-lg">Totalmente Liberado</span>
        </div>
      `;
    } else if (doc.status_geral === 'Pendente') {
      html += `
        <div class="callout tone-warn">
          <div>
            <div class="callout-eyebrow"><i data-lucide="alert-triangle"></i> Onde está parado aguardando aprovação</div>
            <div class="callout-title">${doc.onde_esta_parado}</div>
            <div class="callout-meta">Tempo de espera nesta alçada: <strong>${doc.dias_alcada} dia(s)</strong></div>
          </div>
          <span class="badge badge-status-pendente badge-lg">Gargalo Ativo</span>
        </div>
      `;
    } else {
      html += `
        <div class="callout">
          <div>
            <div class="callout-eyebrow"><i data-lucide="layers"></i> Status do Fluxo de Aprovações</div>
            <div class="callout-title">Aguardando Liberação de Níveis Anteriores</div>
            <div class="callout-meta">A próxima alçada será notificada sequencialmente.</div>
          </div>
          <span class="badge badge-status-aguardando badge-lg">Aguardando Nível Anterior</span>
        </div>
      `;
    }

    // Bloco de Processos Conectados da Cadeia (SC -> IP / PC)
    if (doc.processos_relacionados && doc.processos_relacionados.length > 0) {
      html += `
        <div class="related-box">
          <div class="related-title">
            <i data-lucide="network"></i> Cadeia de Suprimentos Conectada (SC Origem: ${doc.num_sc_origem})
          </div>
          <div class="related-list">
            ${doc.processos_relacionados.map(rel => `
              <button class="btn btn-secondary btn-sm" onclick="App.openEsteiraModal('${rel.tipo_docto}', '${rel.filial}', '${rel.documento}')">
                <span class="badge badge-${rel.tipo_docto.toLowerCase()}">${rel.tipo_docto}</span>
                <strong>${rel.documento}</strong> (Filial ${rel.filial})
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    html += '<div class="timeline">';

    for (const a of doc.alcadas) {
      let stepClass = 'aguardando';
      let icon = 'lock';
      let statusLabel = a.status_label || 'Aguardando Nível Anterior';
      let badgeStyle = 'badge-status-aguardando';

      if (a.status === 'Liberado') {
        stepClass = 'liberado';
        icon = 'check-circle-2';
        statusLabel = `Aprovado em ${a.data_liber || '-'}`;
        badgeStyle = 'badge-status-liberado';
      } else if (a.status === 'Pendente') {
        stepClass = 'pendente';
        icon = 'clock-4';
        statusLabel = 'Pendente (Ação Necessária Agora)';
        badgeStyle = 'badge-status-pendente';
      } else if (a.status === 'Liberado outro aprov.') {
        stepClass = 'liberado';
        icon = 'user-check';
        statusLabel = `Liberado por outro aprovador (${a.data_liber || '-'})`;
        badgeStyle = 'badge-status-liberado';
      }

      const approverName = a.nome_aprovador || this.getApproverName(a.cod_usuario);
      const appInfo = this.approverMap[String(a.cod_usuario)] || this.approverMap[String(a.cod_usuario).replace(/^0+/, '')] || {};

      let cardContent = '';
      if (a.status === 'Liberado') {
        let compartilhadoHtml = '';
        if (a.alçada_compartilhada && a.alçada_compartilhada.length > 0) {
          compartilhadoHtml = `
            <div class="timeline-note ok">
              <strong>Alçada em grupo:</strong> Aprovado por este usuário (dispensou aprovação dos demais: ${a.alçada_compartilhada.map(m => m.nome).join(', ')})
            </div>
          `;
        }
        cardContent = `
          <div class="timeline-row">
            <div class="timeline-approver ok">
              <i data-lucide="user-check"></i>
              ${approverName}
            </div>
            <div class="date-pill">
              <i data-lucide="check-circle-2"></i> Aprovado: ${a.data_liber || '-'}
            </div>
          </div>
          <div class="timeline-details">
            <span>Cód. Usuário: <strong>${a.cod_usuario}</strong></span>
            <span>Cód. Alçada: <strong>${a.cod_aprovad || '-'}</strong></span>
            <span>Cargo: <strong>${appInfo.cargo || '-'}</strong></span>
          </div>
          ${compartilhadoHtml}
        `;
      } else if (a.status === 'Pendente') {
        cardContent = `
          <div class="timeline-alert">
            <i data-lucide="alert-circle"></i> Processo retido nesta alçada aguardando aprovação:
          </div>
          <div class="timeline-approver warn">
            <i data-lucide="clock"></i>
            ${approverName}
          </div>
          <div class="timeline-details">
            <span>Cód. Usuário: <strong>${a.cod_usuario}</strong></span>
            <span>Cód. Alçada: <strong>${a.cod_aprovad || '-'}</strong></span>
            <span>Prazo Limite: <strong>${a.prazo || 'Sem prazo'}</strong></span>
          </div>
        `;
      } else {
        cardContent = `
          <div class="timeline-approver muted">${approverName}</div>
          <div class="timeline-details">
            <span>Cód. Usuário: <strong>${a.cod_usuario}</strong></span>
            <span>Cód. Alçada: <strong>${a.cod_aprovad || '-'}</strong></span>
            <span>Próxima alçada sequencial</span>
          </div>
          <div class="timeline-note">
            Esta etapa será liberada para aprovação assim que o nível anterior for concluído.
          </div>
        `;
      }

      html += `
        <div class="timeline-step ${stepClass}">
          <div class="timeline-icon">
            <i data-lucide="${icon}"></i>
          </div>
          <div class="timeline-card">
            <div class="timeline-card-header">
              <span class="timeline-level-badge">Nível ${a.nivel} ${a.grupo_aprovacao ? `(Grupo ${a.grupo_aprovacao})` : ''}</span>
              <span class="badge ${badgeStyle}">${statusLabel}</span>
            </div>
            ${cardContent}
          </div>
        </div>
      `;
    }

    html += '</div>';
    container.innerHTML = html;
    this.openModal('modal-esteira');
    this.initLucide();
  },

  // Modal de Mapeamento de Aprovadores (De-Para)
  openApproverModal() {
    const tbody = document.getElementById('modal-aprovadores-tbody');
    let html = '';

    const codes = Object.keys(this.approverMap).sort((a,b) => String(a).localeCompare(String(b)));
    for (const c of codes) {
      const info = this.approverMap[c];
      html += `
        <tr>
          <td><strong>${c}</strong></td>
          <td>
            <input type="text" class="form-control form-control-sm app-name-input" data-cod="${c}" value="${info.nome || ''}" placeholder="Nome do Aprovador">
          </td>
          <td>
            <input type="text" class="form-control form-control-sm app-cargo-input" data-cod="${c}" value="${info.cargo || ''}" placeholder="Cargo / Alçada">
          </td>
          <td>
            <input type="text" class="form-control form-control-sm app-dept-input" data-cod="${c}" value="${info.departamento || ''}" placeholder="Área / Departamento">
          </td>
        </tr>
      `;
    }

    tbody.innerHTML = html;
    this.openModal('modal-aprovadores');
  },

  saveApproverMap() {
    const nameInputs = document.querySelectorAll('.app-name-input');
    nameInputs.forEach(input => {
      const cod = input.getAttribute('data-cod');
      const cargoInput = document.querySelector(`.app-cargo-input[data-cod="${cod}"]`);
      const deptInput = document.querySelector(`.app-dept-input[data-cod="${cod}"]`);

      if (!this.approverMap[cod]) this.approverMap[cod] = {};
      this.approverMap[cod].nome = input.value.trim() || `Usuário ${cod}`;
      this.approverMap[cod].cargo = cargoInput ? cargoInput.value.trim() : '';
      this.approverMap[cod].departamento = deptInput ? deptInput.value.trim() : '';
    });

    localStorage.setItem('eco_approver_map', JSON.stringify(this.approverMap));
    this.closeModal('modal-aprovadores');
    this.showToast('Mapeamento salvo com sucesso!', 'success');
    this.applyFilters();
  },

  // Leitura de Planilhas/JSON via Drag & Drop ou Upload
  handleFileUpload(file) {
    if (!file) return;
    const fname = file.name.toLowerCase();
    this.showToast(`Processando ${file.name}...`, 'info');

    const reader = new FileReader();

    if (fname.endsWith('.json')) {
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          const rows = Array.isArray(parsed) ? parsed : (parsed.documentos || parsed.data || parsed.rows || []);
          this.processNewRawData(rows, file.name);
        } catch (err) {
          this.showToast('Erro ao ler arquivo JSON: formato inválido.', 'error');
        }
      };
      reader.readAsText(file, 'utf-8');
    } else if (fname.endsWith('.csv')) {
      reader.onload = (e) => {
        const text = e.target.result;
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          delimiter: text.includes(';') ? ';' : ',',
          complete: (results) => {
            this.processNewRawData(results.data, file.name);
          }
        });
      };
      reader.readAsText(file, 'ISO-8859-1');
    } else if (fname.endsWith('.xlsx') || fname.endsWith('.xls')) {
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        this.processNewRawData(rows, file.name);
      };
      reader.readAsArrayBuffer(file);
    } else {
      this.showToast('Formato não suportado. Envie um arquivo .JSON, .XLSX ou .CSV', 'error');
    }
  },

  processNewRawData(rawRows, fileName) {
    if (!rawRows || rawRows.length === 0) {
      this.showToast('O arquivo enviado está vazio.', 'error');
      return;
    }
    const processed = DataProcessor.processRows(rawRows);
    this.allDocuments = processed;

    // Atualiza nomes de aprovadores descobertos
    if (processed.discoveredApprovers && Object.keys(processed.discoveredApprovers).length > 0) {
      let updatedCount = 0;
      for (const [k, v] of Object.entries(processed.discoveredApprovers)) {
        if (!this.approverMap[k] || this.approverMap[k].nome.startsWith('Usuário')) {
          this.approverMap[k] = { ...this.approverMap[k], ...v };
          updatedCount++;
        }
      }
      if (updatedCount > 0) {
        localStorage.setItem('eco_approver_map', JSON.stringify(this.approverMap));
      }
    }

    this.updateDataIndicator(`Arquivo: ${fileName} (${processed.length} docs)`);
    this.closeModal('modal-upload');
    this.applyFilters();
    this.showToast(`Arquivo carregado! ${processed.length} documentos analisados.`, 'success');
  },

  // Exportar dados filtrados para CSV (sem valores financeiros)
  exportData() {
    if (this.filteredDocuments.length === 0) {
      this.showToast('Nenhum dado para exportar.', 'warning');
      return;
    }

    const rows = [];
    rows.push(['Filial', 'Tipo', 'Documento', 'SC_Origem', 'PC_Gerado', 'Emissao', 'Status_Geral', 'SLA_Dias', 'SLA_Status', 'Onde_Esta_Parado']);

    for (const doc of this.filteredDocuments) {
      rows.push([
        doc.filial,
        doc.tipo_docto,
        doc.documento,
        doc.tipo_docto !== 'SC' ? (doc.num_sc_origem || '-') : '-',
        doc.tipo_docto === 'SC' ? (doc.num_pc_gerado || '-') : '-',
        doc.data_emissao,
        doc.status_geral,
        doc.dias_alcada || 0,
        doc.sla_status || 'no_prazo',
        doc.onde_esta_parado
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(";")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Alçadas_AgroTech_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('Relatório CSV baixado com sucesso!', 'success');
  },

  // Modal helpers
  openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  },

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  },

  // Toast helper
  showToast(msg, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = msg;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  },

  // Configura event listeners
  bindEvents() {
    // Quick Pills / Segments de Período
    document.querySelectorAll('#period-segment .seg-btn').forEach(pill => {
      pill.addEventListener('click', (e) => {
        document.querySelectorAll('#period-segment .seg-btn').forEach(p => p.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const period = e.currentTarget.getAttribute('data-period');
        this.setQuickPeriod(period);
      });
    });

    // Inputs de filtro de data
    const inputInicio = document.getElementById('filter-data-inicio');
    if (inputInicio) {
      inputInicio.addEventListener('change', (e) => {
        this.filters.dataInicio = e.target.value;
        this.applyFilters();
      });
    }

    const inputFim = document.getElementById('filter-data-fim');
    if (inputFim) {
      inputFim.addEventListener('change', (e) => {
        this.filters.dataFim = e.target.value;
        this.applyFilters();
      });
    }

    const selectFilial = document.getElementById('filter-filial');
    if (selectFilial) {
      selectFilial.addEventListener('change', (e) => {
        this.setFilialFilter(e.target.value);
      });
    }

    const selectTipo = document.getElementById('filter-tipo');
    if (selectTipo) {
      selectTipo.addEventListener('change', (e) => {
        this.filters.tipo = e.target.value;
        this.applyFilters();
      });
    }

    const selectAprov = document.getElementById('filter-aprovador');
    if (selectAprov) {
      selectAprov.addEventListener('change', (e) => {
        this.filters.aprovador = e.target.value;
        this.applyFilters();
      });
    }

    const selectSla = document.getElementById('filter-sla');
    if (selectSla) {
      selectSla.addEventListener('change', (e) => {
        this.filters.sla = e.target.value;
        this.applyFilters();
      });
    }

    // Busca rápida com clear button e classe has-value
    const inputBusca = document.getElementById('filter-busca');
    const searchBox = document.getElementById('search-box');
    const clearBtn = document.getElementById('search-clear-btn');

    if (inputBusca) {
      let timeout = null;
      inputBusca.addEventListener('input', (e) => {
        if (searchBox) {
          if (e.target.value) searchBox.classList.add('has-value');
          else searchBox.classList.remove('has-value');
        }
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          this.filters.busca = e.target.value;
          this.applyFilters();
        }, 220);
      });

      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          inputBusca.value = '';
          if (searchBox) searchBox.classList.remove('has-value');
          this.filters.busca = '';
          this.applyFilters();
          inputBusca.focus();
        });
      }
    }

    // Atalho de teclado: pressionar "/" foca a busca; "Escape" limpa ou fecha modais
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== inputBusca && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        if (inputBusca) {
          inputBusca.focus();
          inputBusca.select();
        }
      } else if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal-overlay.active');
        if (activeModal) {
          activeModal.classList.remove('active');
        } else if (document.activeElement === inputBusca && inputBusca.value) {
          inputBusca.value = '';
          if (searchBox) searchBox.classList.remove('has-value');
          this.filters.busca = '';
          this.applyFilters();
          inputBusca.blur();
        }
      }
    });

    // Dropzone de arquivo
    const dropzone = document.getElementById('file-dropzone');
    const fileInput = document.getElementById('file-input');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.handleFileUpload(e.dataTransfer.files[0]);
        }
      });
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.handleFileUpload(e.target.files[0]);
        }
      });
    }
  },

  // Atualiza opções do select de filiais
  updateFilialSelectOptions() {
    const select = document.getElementById('filter-filial');
    if (!select) return;
    const currentVal = this.filters.filial;

    const filiaisSet = new Set();
    for (const doc of this.allDocuments) {
      if (doc.filial) filiaisSet.add(String(doc.filial));
    }
    const filiais = Array.from(filiaisSet).sort();

    let html = '<option value="TODOS">Todas as Filiais</option>';
    for (const f of filiais) {
      const selected = String(f) === String(currentVal) ? 'selected' : '';
      html += `<option value="${f}" ${selected}>Filial ${f}</option>`;
    }
    select.innerHTML = html;
  },

  // Atualiza opções do select de aprovadores
  updateApproverSelectOptions(demandList) {
    const select = document.getElementById('filter-aprovador');
    if (!select) return;
    const currentVal = this.filters.aprovador;

    let html = '<option value="TODOS">Todos os Aprovadores</option>';
    for (const app of demandList) {
      const selected = String(app.cod_usuario) === String(currentVal) ? 'selected' : '';
      const pendStr = app.pendente_qtd > 0 ? ` (${app.pendente_qtd} pendentes)` : '';
      html += `<option value="${app.cod_usuario}" ${selected}>${app.nome}${pendStr}</option>`;
    }
    select.innerHTML = html;
  },

  // Atalhos de Período Rápido
  setQuickPeriod(period) {
    const inInicio = document.getElementById('filter-data-inicio');
    const inFim = document.getElementById('filter-data-fim');

    if (period === 'atual_18') {
      this.filters.dataInicio = '2026-09-18';
      this.filters.dataFim = '';
    } else if (period === 'setembro') {
      this.filters.dataInicio = '2026-09-01';
      this.filters.dataFim = '2026-09-30';
    } else if (period === '30dias') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      this.filters.dataInicio = d.toISOString().slice(0,10);
      this.filters.dataFim = '';
    } else if (period === 'ano_2026') {
      this.filters.dataInicio = '2026-01-01';
      this.filters.dataFim = '2026-12-31';
    } else if (period === 'todos') {
      this.filters.dataInicio = '';
      this.filters.dataFim = '';
    }

    if (inInicio) inInicio.value = this.filters.dataInicio;
    if (inFim) inFim.value = this.filters.dataFim;
    this.applyFilters();
  }
};
