// data_processor.js - Motor de processamento de alcadas de aprovacao (SC / PC / IP)
// CONTAGEM DISTINTA RIGOROSA: Baseada na coluna Documento (número da SC / PC / IP)

const DataProcessor = {
  parseDate(str) {
    if (!str) return null;
    if (str instanceof Date) {
      const y = str.getFullYear();
      const m = String(str.getMonth() + 1).padStart(2, '0');
      const d = String(str.getDate()).padStart(2, '0');
      return {
        formatted: `${d}/${m}/${y}`,
        iso: `${y}-${m}-${d}`,
        timestamp: new Date(`${y}-${m}-${d}T00:00:00`).getTime()
      };
    }
    const clean = String(str).trim();
    if (clean === '' || clean === 'None' || clean.includes('  /  /')) return null;

    // Formato DD/MM/YYYY
    if (clean.includes('/')) {
      const parts = clean.split('/');
      if (parts.length === 3) {
        const d = parts[0].trim().padStart(2, '0');
        const m = parts[1].trim().padStart(2, '0');
        const y = parts[2].trim();
        if (y.length === 4) {
          return {
            formatted: `${d}/${m}/${y}`,
            iso: `${y}-${m}-${d}`,
            timestamp: new Date(`${y}-${m}-${d}T00:00:00`).getTime()
          };
        }
      }
    }

    // Formato YYYYMMDD (Protheus padrão)
    if (/^\d{8}$/.test(clean)) {
      const y = clean.substring(0, 4);
      const m = clean.substring(4, 6);
      const d = clean.substring(6, 8);
      return {
        formatted: `${d}/${m}/${y}`,
        iso: `${y}-${m}-${d}`,
        timestamp: new Date(`${y}-${m}-${d}T00:00:00`).getTime()
      };
    }

    // Formato YYYY-MM-DD (ISO/SQL Date)
    if (clean.includes('-')) {
      const parts = clean.split('-');
      if (parts.length === 3) {
        const y = parts[0].trim();
        const m = parts[1].trim().padStart(2, '0');
        const d = parts[2].trim().padStart(2, '0');
        if (y.length === 4) {
          return {
            formatted: `${d}/${m}/${y}`,
            iso: `${y}-${m}-${d}`,
            timestamp: new Date(`${y}-${m}-${d}T00:00:00`).getTime()
          };
        }
      }
    }

    return null;
  },

  normalizeRow(row) {
    const keys = Object.keys(row);
    const getVal = (patterns) => {
      for (const p of patterns) {
        const found = keys.find(k => k.trim().toLowerCase() === p.toLowerCase());
        if (found && row[found] !== null && row[found] !== undefined) return row[found];
      }
      return null;
    };

    const docRaw = getVal(['Numero_Documento', 'numero_documento', 'Documento', 'documento', 'Doc', 'CR_NUM']);
    const doc = docRaw !== null ? String(docRaw).trim() : '';

    const filialRaw = getVal(['Filial', 'filial', 'CR_FILIAL']);
    const filial = filialRaw !== null ? String(filialRaw).trim() : '0101';

    const tipo = (getVal(['Tipo_Documento', 'tipo_documento', 'Tipo docto', 'Tipo Docto', 'tipo docto', 'CR_TIPO']) || 'SC').toString().trim().toUpperCase();
    
    const codUsrRaw = getVal(['Cod_Usuario', 'cod_usuario', 'Cod. Usuario', 'Cod. Usuario.1', 'Cod Usuario', 'CR_USER']);
    const codUsr = codUsrRaw !== null ? String(codUsrRaw).trim() : '';

    const codAprovRaw = getVal(['Cod_Aprovador', 'cod_aprovador', 'Cod. Aprovad', 'Cod. Aprov.', 'Cod Aprovad', 'CR_APROV']);
    const codAprov = codAprovRaw !== null ? String(codAprovRaw).trim() : '';

    const grpAprov = getVal(['Grupo_Aprovacao', 'grupo_aprovacao', 'Grp Aprov', 'CR_GRUPO']) || null;
    const itemGrp = getVal(['Item Grp', 'CR_ITGRP', 'Item_Grupo']) || null;
    const nivel = parseInt(getVal(['Nivel', 'nivel', 'CR_NIVEL'])) || 1;

    let status = (getVal(['Status_Aprovacao', 'status_aprovacao', 'Cont. Aprov.', 'Cont Aprov', 'Status', 'CR_STATUS']) || '').toString().trim();
    if (status === '02' || status.startsWith('Liberado')) {
      status = 'Liberado';
    } else if (status === '03' || status.startsWith('Pendente')) {
      status = 'Pendente';
    } else if (status === '04' || status.startsWith('Liberado outro')) {
      status = 'Liberado outro aprov.';
    } else if (status.toLowerCase().includes('aguardando')) {
      status = 'Aguardando nivel anterior';
    }

    const dataEmissaoRaw = getVal(['Data_Emissao', 'data_emissao', 'Data Emissao', 'Data Emisso', 'CR_EMISSAO']);
    const dataLiberRaw = getVal(['Data_Liberacao', 'data_liberacao', 'Data Liber.', 'Data Liber', 'CR_DATALIB']);
    const prazoRaw = getVal(['Prazo', 'prazo', 'CR_PRAZO', 'CR_VALLIB']);

    const nomeAprovRaw = getVal(['Nome_Aprovador', 'nome_aprovador', 'Nome Aprovador', 'Nome Aprov', 'AK_NOME', 'Nome']);
    const descGrp = getVal(['Descricao Grupo', 'Desc Grupo', 'AL_DESC']);
    const numScOrigem = getVal(['Num_SC_Origem', 'num_sc_origem', 'SC_Origem', 'SC Origem', 'C7_NUMSC']);
    const codUsrLibRaw = getVal(['Cod_Usuario_Lib', 'cod_usuario_lib', 'Cod. Usuario.1', 'CR_USERLIB']);
    const codUsrLib = codUsrLibRaw !== null ? String(codUsrLibRaw).trim() : '';
    const nomeUsrLibRaw = getVal(['Nome_Usuario_Liberou', 'nome_usuario_liberou', 'Nome_Liberou']);
    const nomeUsrLib = nomeUsrLibRaw ? String(nomeUsrLibRaw).trim() : null;

    return {
      doc,
      filial,
      tipo,
      numScOrigem: numScOrigem ? String(numScOrigem).trim() : (tipo === 'SC' ? doc : '-'),
      codUsr,
      codAprov,
      nomeAprov: nomeAprovRaw ? String(nomeAprovRaw).trim() : null,
      descGrp: descGrp ? String(descGrp).trim() : null,
      grpAprov: grpAprov ? String(grpAprov).trim() : null,
      itemGrp,
      nivel,
      status,
      codUsrLib,
      nomeUsrLib,
      dataEmissao: this.parseDate(dataEmissaoRaw),
      dataLiber: this.parseDate(dataLiberRaw),
      prazo: this.parseDate(prazoRaw)
    };
  },

  processRows(rawRows) {
    const docMap = new Map();
    const discoveredApprovers = {};

    for (const raw of rawRows) {
      const r = this.normalizeRow(raw);
      if (!r.doc || r.doc === '0') continue;

      if (r.codUsr && r.nomeAprov) {
        const uKey = String(r.codUsr).replace(/^0+/, '') || '0';
        discoveredApprovers[String(r.codUsr)] = {
          nome: r.nomeAprov,
          cod_aprovad: r.codAprov,
          cargo: r.descGrp || ('Alçada Cód. ' + r.codAprov),
          departamento: 'Protheus'
        };
        discoveredApprovers[uKey] = discoveredApprovers[String(r.codUsr)];
      }

      if (r.codUsrLib && r.nomeUsrLib && !r.nomeUsrLib.startsWith('Usuario')) {
        const uLibKey = String(r.codUsrLib).replace(/^0+/, '') || '0';
        if (!discoveredApprovers[String(r.codUsrLib)] || discoveredApprovers[String(r.codUsrLib)].nome.startsWith('Usuario')) {
          discoveredApprovers[String(r.codUsrLib)] = {
            nome: r.nomeUsrLib,
            cod_aprovad: '',
            cargo: 'Alçada Protheus',
            departamento: 'Protheus'
          };
          discoveredApprovers[uLibKey] = discoveredApprovers[String(r.codUsrLib)];
        }
      }

      // Agrupamento estrito por DOCUMENTO
      const docKey = r.doc;
      if (!docMap.has(docKey)) {
        docMap.set(docKey, {
          tipo_docto: r.tipo,
          documento: r.doc,
          num_sc_origem: r.numScOrigem || (r.tipo === 'SC' ? r.doc : '-'),
          filial: r.filial,
          data_emissao: r.dataEmissao ? r.dataEmissao.formatted : null,
          dt_emissao_iso: r.dataEmissao ? r.dataEmissao.iso : '1970-01-01',
          dt_timestamp: r.dataEmissao ? r.dataEmissao.timestamp : 0,
          prazo: r.prazo ? r.prazo.formatted : null,
          niveisMap: new Map() // nivel -> array of raw records
        });
      }

      const docObj = docMap.get(docKey);
      if (r.numScOrigem && r.numScOrigem !== '-' && (!docObj.num_sc_origem || docObj.num_sc_origem === '-')) {
        docObj.num_sc_origem = r.numScOrigem;
      }
      if (r.dataEmissao && (!docObj.dt_timestamp || r.dataEmissao.timestamp < docObj.dt_timestamp)) {
        docObj.data_emissao = r.dataEmissao.formatted;
        docObj.dt_emissao_iso = r.dataEmissao.iso;
        docObj.dt_timestamp = r.dataEmissao.timestamp;
      }
      if (r.prazo && !docObj.prazo) {
        docObj.prazo = r.prazo.formatted;
      }

      if (!docObj.niveisMap.has(r.nivel)) {
        docObj.niveisMap.set(r.nivel, []);
      }
      docObj.niveisMap.get(r.nivel).push(r);
    }

    // Mapa de SC Origem para vincular processos da cadeia
    const scOrigemMap = {};
    for (const doc of docMap.values()) {
      const sc = doc.num_sc_origem;
      if (sc && sc !== '-') {
        if (!scOrigemMap[sc]) scOrigemMap[sc] = [];
        if (!scOrigemMap[sc].some(d => d.documento === doc.documento)) {
          scOrigemMap[sc].push({
            filial: doc.filial,
            tipo_docto: doc.tipo_docto,
            documento: doc.documento
          });
        }
      }
    }

    const documents = [];
    for (const doc of docMap.values()) {
      const sortedNiveis = Array.from(doc.niveisMap.keys()).sort((a, b) => a - b);
      const alcadasEstruturadas = [];
      let nivelParadoAtivo = null;
      let todosNiveisAprovados = true;

      for (const niv of sortedNiveis) {
        const rowsNiv = doc.niveisMap.get(niv);
        const libRecords = rowsNiv.filter(x => x.dataLiber && x.dataLiber.formatted);

        if (libRecords.length > 0) {
          // Nível Liberado / Aprovado
          const libRow = libRecords[0];
          const dLib = libRow.dataLiber.formatted;
          const uLib = libRow.codUsrLib || libRow.codUsr;
          
          let nomeLib = libRow.nomeUsrLib || libRow.nomeAprov;
          if (!nomeLib || nomeLib.startsWith('Usuario')) {
            const uClean = String(uLib).replace(/^0+/, '') || '0';
            const appEntry = discoveredApprovers[String(uLib)] || discoveredApprovers[uClean];
            if (appEntry && appEntry.nome && !appEntry.nome.startsWith('Usuario')) {
              nomeLib = appEntry.nome;
            } else {
              const qAprov = rowsNiv.find(x => x.codUsr === uLib && x.nomeAprov);
              nomeLib = qAprov ? qAprov.nomeAprov : (appEntry ? appEntry.nome : `Usuário ${uLib}`);
            }
          }

          const membrosGrupo = [];
          for (const x of rowsNiv) {
            const mCod = x.codUsr;
            const mClean = String(mCod).replace(/^0+/, '') || '0';
            const mApp = discoveredApprovers[String(mCod)] || discoveredApprovers[mClean] || {};
            const mNome = x.nomeAprov || mApp.nome || `Usuário ${mCod}`;
            if (mCod !== uLib && !membrosGrupo.some(m => m.cod_usuario === mCod)) {
              membrosGrupo.push({ cod_usuario: mCod, nome: mNome });
            }
          }

          alcadasEstruturadas.push({
            nivel: niv,
            status: 'Liberado',
            status_label: `Aprovado em ${dLib}`,
            cod_usuario: uLib,
            cod_aprovad: libRow.codAprov,
            nome_aprovador: nomeLib,
            data_liber: dLib,
            grupo_aprovacao: libRow.grpAprov,
            alçada_compartilhada: membrosGrupo,
            aprovado_por_outro: false
          });
        } else {
          // Nível Não Aprovado Ainda
          todosNiveisAprovados = false;
          const aprovadoresDesteNivel = [];
          const seenU = new Set();
          for (const x of rowsNiv) {
            const u = x.codUsr;
            if (!seenU.has(u)) {
              seenU.add(u);
              const uClean = String(u).replace(/^0+/, '') || '0';
              const mApp = discoveredApprovers[String(u)] || discoveredApprovers[uClean] || {};
              const nome = x.nomeAprov || mApp.nome || `Usuário ${u}`;
              aprovadoresDesteNivel.push({
                cod_usuario: u,
                cod_aprovad: x.codAprov,
                nome_aprovador: nome,
                grupo_aprovacao: x.grpAprov,
                prazo: x.prazo ? x.prazo.formatted : null
              });
            }
          }

          if (nivelParadoAtivo === null) {
            // Este é o nível ativo onde o documento está travado no momento!
            nivelParadoAtivo = { nivel: niv, aprovadores: aprovadoresDesteNivel };
            for (const ap of aprovadoresDesteNivel) {
              alcadasEstruturadas.push({
                nivel: niv,
                status: 'Pendente',
                status_label: 'Pendente (Ação Necessária Agora)',
                cod_usuario: ap.cod_usuario,
                cod_aprovad: ap.cod_aprovad,
                nome_aprovador: ap.nome_aprovador,
                data_liber: null,
                grupo_aprovacao: ap.grupo_aprovacao,
                prazo: ap.prazo,
                nivel_ativo_gargalo: true
              });
            }
          } else {
            // Nível futuro (aguardando níveis anteriores)
            for (const ap of aprovadoresDesteNivel) {
              alcadasEstruturadas.push({
                nivel: niv,
                status: 'Aguardando nivel anterior',
                status_label: `Aguardando Nível ${nivelParadoAtivo.nivel}`,
                cod_usuario: ap.cod_usuario,
                cod_aprovad: ap.cod_aprovad,
                nome_aprovador: ap.nome_aprovador,
                data_liber: null,
                grupo_aprovacao: ap.grupo_aprovacao,
                prazo: ap.prazo,
                nivel_ativo_gargalo: false
              });
            }
          }
        }
      }

      let statusGeral = 'Totalmente Liberado';
      let ondeEstaParado = '';
      const pendentes = [];
      const aguardando = [];
      const liberados = [];

      if (todosNiveisAprovados) {
        statusGeral = 'Totalmente Liberado';
        const ultimoLib = alcadasEstruturadas.filter(a => a.status === 'Liberado').pop();
        ondeEstaParado = ultimoLib ? `Concluído em ${ultimoLib.data_liber} por ${ultimoLib.nome_aprovador}` : 'Totalmente Liberado';
        for (const a of alcadasEstruturadas) {
          if (a.status === 'Liberado') liberados.push({ cod_usuario: a.cod_usuario, data_liber: a.data_liber, nivel: a.nivel });
        }
      } else if (nivelParadoAtivo !== null) {
        statusGeral = 'Pendente';
        const nomesPend = nivelParadoAtivo.aprovadores.map(ap => ap.nome_aprovador);
        ondeEstaParado = `Nível ${nivelParadoAtivo.nivel}: ` + nomesPend.join(', ');
        for (const ap of nivelParadoAtivo.aprovadores) {
          pendentes.push({ cod_usuario: ap.cod_usuario, nivel: nivelParadoAtivo.nivel });
        }
        for (const a of alcadasEstruturadas) {
          if (a.status === 'Liberado') liberados.push({ cod_usuario: a.cod_usuario, data_liber: a.data_liber, nivel: a.nivel });
          if (a.status === 'Aguardando nivel anterior') aguardando.push({ cod_usuario: a.cod_usuario, nivel: a.nivel });
        }
      } else {
        statusGeral = 'Aguardando Nível Anterior';
        ondeEstaParado = 'Aguardando Nível Anterior';
      }

      // Cálculo de SLA em dias corridos
      let diasAlcada = 0;
      if (doc.dt_timestamp) {
        if (statusGeral === 'Totalmente Liberado' && liberados.length > 0) {
          let maxLibTs = doc.dt_timestamp;
          for (const lib of alcadasEstruturadas) {
            if (lib.data_liber) {
              const parsed = this.parseDate(lib.data_liber);
              if (parsed && parsed.timestamp > maxLibTs) maxLibTs = parsed.timestamp;
            }
          }
          diasAlcada = Math.max(0, Math.round((maxLibTs - doc.dt_timestamp) / (1000 * 60 * 60 * 24)));
        } else {
          diasAlcada = Math.max(0, Math.round((Date.now() - doc.dt_timestamp) / (1000 * 60 * 60 * 24)));
        }
      }

      let slaStatus = 'no_prazo';
      if (diasAlcada > 5) slaStatus = 'gargalo';
      else if (diasAlcada > 2) slaStatus = 'alerta';

      const relacionados = [];
      const pcsGerados = [];
      let numPcGerado = '-';

      if (doc.tipo_docto === 'SC') {
        const scNum = doc.documento;
        if (scOrigemMap[scNum]) {
          for (const rel of scOrigemMap[scNum]) {
            if (rel.documento !== doc.documento) {
              relacionados.push(rel);
              pcsGerados.push(rel);
            }
          }
        }
        if (pcsGerados.length > 0) {
          numPcGerado = pcsGerados.map(p => p.documento).join(', ');
        }
      } else {
        const sc = doc.num_sc_origem;
        if (sc && scOrigemMap[sc]) {
          for (const rel of scOrigemMap[sc]) {
            if (rel.documento !== doc.documento) {
              relacionados.push(rel);
            }
          }
        }
      }

      documents.push({
        filial: doc.filial,
        tipo_docto: doc.tipo_docto,
        documento: doc.documento,
        num_sc_origem: doc.num_sc_origem,
        num_pc_gerado: numPcGerado,
        pcs_gerados: pcsGerados,
        data_emissao: doc.data_emissao || '-',
        dt_emissao_iso: doc.dt_emissao_iso,
        status_geral: statusGeral,
        onde_esta_parado: ondeEstaParado,
        dias_alcada: diasAlcada,
        sla_status: slaStatus,
        aprovadores_pendentes: pendentes,
        aprovadores_aguardando: aguardando,
        aprovadores_liberados: liberados,
        processos_relacionados: relacionados,
        alcadas: alcadasEstruturadas
      });
    }

    documents.sort((a, b) => {
      if (a.status_geral === 'Pendente' && b.status_geral !== 'Pendente') return -1;
      if (a.status_geral !== 'Pendente' && b.status_geral === 'Pendente') return 1;
      return b.dt_timestamp - a.dt_timestamp;
    });

    documents.discoveredApprovers = discoveredApprovers;
    return documents;
  },

  filterDocuments(documents, filters = {}) {
    const {
      dataInicio = '2026-09-18',
      dataFim = null,
      filial = 'TODOS',
      tipo = 'TODOS',
      status = 'TODOS',
      aprovador = 'TODOS',
      sla = 'TODOS',
      busca = ''
    } = filters;

    // Garante contagem e filtragem estritamente distinta por documento
    const seenDocs = new Set();

    return documents.filter(doc => {
      if (seenDocs.has(doc.documento)) return false;

      if (dataInicio && doc.dt_emissao_iso < dataInicio) return false;
      if (dataFim && doc.dt_emissao_iso > dataFim) return false;
      if (filial !== 'TODOS' && String(doc.filial) !== String(filial)) return false;
      if (tipo !== 'TODOS' && doc.tipo_docto !== tipo) return false;
      if (sla !== 'TODOS') {
        if (sla === 'no_prazo' && doc.sla_status !== 'no_prazo') return false;
        if (sla === 'alerta' && doc.sla_status !== 'alerta') return false;
        if (sla === 'gargalo' && doc.sla_status !== 'gargalo') return false;
      }
      if (aprovador !== 'TODOS') {
        const matchUser = (uCod, targetCod) => {
          if (!uCod || !targetCod) return false;
          const a = String(uCod).trim().replace(/^0+/, '') || '0';
          const b = String(targetCod).trim().replace(/^0+/, '') || '0';
          return a === b;
        };

        if (status === 'Pendente') {
          // Documentos onde este aprovador possui ação imediata pendente (gargalo ativo)
          const isPending = doc.aprovadores_pendentes && doc.aprovadores_pendentes.some(p => matchUser(p.cod_usuario, aprovador));
          if (!isPending) return false;
        } else if (status === 'Liberado') {
          // Documentos onde este aprovador já realizou a aprovação/liberação
          const isLiberado = doc.aprovadores_liberados && doc.aprovadores_liberados.some(l => matchUser(l.cod_usuario, aprovador));
          if (!isLiberado) return false;
        } else if (status === 'Aguardando') {
          // Documentos onde este aprovador aguarda a liberação de níveis anteriores
          const isAguardando = doc.aprovadores_aguardando && doc.aprovadores_aguardando.some(a => matchUser(a.cod_usuario, aprovador));
          if (!isAguardando) return false;
        } else {
          // Status 'TODOS': qualquer documento em que o aprovador participa em qualquer alçada
          const match = doc.alcadas && doc.alcadas.some(a => matchUser(a.cod_usuario, aprovador));
          if (!match) return false;
        }
      } else {
        // Sem filtro de aprovador: filtra pelo status geral do documento
        if (status !== 'TODOS') {
          if (status === 'Pendente' && doc.status_geral !== 'Pendente') return false;
          if (status === 'Liberado' && doc.status_geral !== 'Totalmente Liberado') return false;
          if (status === 'Aguardando' && doc.status_geral !== 'Aguardando Nível Anterior') return false;
        }
      }
      if (busca && busca.trim() !== '') {
        const term = busca.trim().toLowerCase();
        const docMatch = String(doc.documento).toLowerCase().includes(term);
        const scMatch = doc.num_sc_origem && String(doc.num_sc_origem).toLowerCase().includes(term);
        const filialMatch = String(doc.filial).toLowerCase().includes(term);
        const tipoMatch = doc.tipo_docto.toLowerCase().includes(term);
        const usrMatch = doc.alcadas.some(a => 
          String(a.cod_usuario).toLowerCase().includes(term) || 
          String(a.cod_aprovad).toLowerCase().includes(term) || 
          (a.nome_aprovador && a.nome_aprovador.toLowerCase().includes(term))
        );
        if (!docMatch && !scMatch && !filialMatch && !tipoMatch && !usrMatch) return false;
      }

      seenDocs.add(doc.documento);
      return true;
    });
  },

  computeApproverDemand(documents, approverMap = {}) {
    const map = new Map();

    const getOrInit = (codUsr, codAprov) => {
      const code = codUsr !== undefined && codUsr !== null ? String(codUsr).trim() : '0';
      const cleanKey = code.replace(/^0+/, '') || '0';
      
      const info = approverMap[code] || approverMap[cleanKey] || {
        nome: `Usuário ${code}`,
        cargo: `Alçada Cód. ${codAprov || '-'}`,
        departamento: 'Geral'
      };

      const finalKey = cleanKey;
      if (!map.has(finalKey)) {
        map.set(finalKey, {
          cod_usuario: code,
          cod_aprovad: codAprov || info.cod_aprovad || '-',
          nome: info.nome || `Usuário ${code}`,
          cargo: info.cargo || `Alçada Cód. ${codAprov || '-'}`,
          departamento: info.departamento || '-',
          pendente_qtd: 0,
          aguardando_qtd: 0,
          liberado_qtd: 0,
          _pend_docs_set: new Set(),
          _agrd_docs_set: new Set(),
          _lib_docs_set: new Set(),
          documentos_pendentes: [],
          documentos_aguardando: [],
          documentos_liberados: []
        });
      }
      return map.get(finalKey);
    };

    for (const [k, v] of Object.entries(approverMap)) {
      getOrInit(k, v.cod_aprovad);
    }

    // Contagem rigorosamente distinta por documento para cada aprovador
    for (const doc of documents) {
      const docId = doc.documento;

      // 1. Pendentes
      for (const p of doc.aprovadores_pendentes) {
        const app = getOrInit(p.cod_usuario, p.cod_aprovad);
        if (!app._pend_docs_set.has(docId)) {
          app._pend_docs_set.add(docId);
          app.documentos_pendentes.push({
            filial: doc.filial,
            tipo: doc.tipo_docto,
            documento: doc.documento,
            sc_origem: doc.num_sc_origem,
            nivel: p.nivel,
            data_emissao: doc.data_emissao
          });
        }
      }

      // 2. Aguardando (apenas se o aprovador não tiver pendência ativa neste mesmo documento)
      for (const ag of doc.aprovadores_aguardando) {
        const app = getOrInit(ag.cod_usuario, ag.cod_aprovad);
        if (!app._pend_docs_set.has(docId) && !app._agrd_docs_set.has(docId)) {
          app._agrd_docs_set.add(docId);
          app.documentos_aguardando.push({
            filial: doc.filial,
            tipo: doc.tipo_docto,
            documento: doc.documento,
            sc_origem: doc.num_sc_origem,
            nivel: ag.nivel,
            data_emissao: doc.data_emissao
          });
        }
      }

      // 3. Liberados
      for (const lib of doc.aprovadores_liberados) {
        const app = getOrInit(lib.cod_usuario, lib.cod_aprovad);
        if (!app._lib_docs_set.has(docId)) {
          app._lib_docs_set.add(docId);
          app.documentos_liberados.push({
            filial: doc.filial,
            tipo: doc.tipo_docto,
            documento: doc.documento,
            sc_origem: doc.num_sc_origem,
            data_liber: lib.data_liber
          });
        }
      }
    }

    const result = [];
    for (const app of map.values()) {
      app.pendente_qtd = app._pend_docs_set.size;
      app.aguardando_qtd = app._agrd_docs_set.size;
      app.liberado_qtd = app._lib_docs_set.size;
      delete app._pend_docs_set;
      delete app._agrd_docs_set;
      delete app._lib_docs_set;
      result.push(app);
    }

    result.sort((a, b) => b.pendente_qtd - a.pendente_qtd || b.aguardando_qtd - a.aguardando_qtd);
    return result;
  },

  computeKPIs(documents, approvers, filteredApprover = 'TODOS') {
    // Base de contagem rigorosamente distinta pelo número do documento
    const uniqueDocsMap = new Map();
    for (const d of documents) {
      if (!uniqueDocsMap.has(d.documento)) {
        uniqueDocsMap.set(d.documento, d);
      }
    }
    const uniqueDocs = Array.from(uniqueDocsMap.values());
    const totalDocs = uniqueDocs.length;

    let docsPendentes = 0;
    let docsLiberados = 0;
    let docsAguardando = 0;
    let totalDias = 0;

    const matchUser = (uCod, targetCod) => {
      if (!uCod || !targetCod) return false;
      const a = String(uCod).trim().replace(/^0+/, '') || '0';
      const b = String(targetCod).trim().replace(/^0+/, '') || '0';
      return a === b;
    };

    const hasApproverFilter = filteredApprover && filteredApprover !== 'TODOS';

    for (const doc of uniqueDocs) {
      totalDias += (doc.dias_alcada || 0);

      if (hasApproverFilter) {
        // Contagem específica sob a ótica do aprovador selecionado
        const isPend = doc.aprovadores_pendentes && doc.aprovadores_pendentes.some(p => matchUser(p.cod_usuario, filteredApprover));
        const isLib = doc.aprovadores_liberados && doc.aprovadores_liberados.some(l => matchUser(l.cod_usuario, filteredApprover));
        const isAgrd = doc.aprovadores_aguardando && doc.aprovadores_aguardando.some(a => matchUser(a.cod_usuario, filteredApprover));

        if (isPend) {
          docsPendentes++;
        } else if (isAgrd) {
          docsAguardando++;
        } else if (isLib) {
          docsLiberados++;
        } else {
          if (doc.status_geral === 'Pendente') docsPendentes++;
          else if (doc.status_geral === 'Totalmente Liberado') docsLiberados++;
          else docsAguardando++;
        }
      } else {
        if (doc.status_geral === 'Pendente') {
          docsPendentes++;
        } else if (doc.status_geral === 'Totalmente Liberado') {
          docsLiberados++;
        } else {
          docsAguardando++;
        }
      }
    }

    const slaMedio = totalDocs > 0 ? (totalDias / totalDocs).toFixed(1) : 0;

    let gargalo = null;
    if (hasApproverFilter) {
      const selectedApp = approvers.find(a => matchUser(a.cod_usuario, filteredApprover));
      if (selectedApp && selectedApp.pendente_qtd > 0) {
        gargalo = {
          nome: selectedApp.nome,
          cod: selectedApp.cod_usuario,
          qtd: selectedApp.pendente_qtd
        };
      }
    } else {
      const topGargalo = approvers.find(a => a.pendente_qtd > 0) || null;
      if (topGargalo) {
        gargalo = {
          nome: topGargalo.nome,
          cod: topGargalo.cod_usuario,
          qtd: topGargalo.pendente_qtd
        };
      }
    }

    return {
      totalDocs,
      docsPendentes,
      docsLiberados,
      docsAguardando,
      slaMedio,
      taxaConclusao: totalDocs > 0 ? ((docsLiberados / totalDocs) * 100).toFixed(1) : 0,
      gargalo
    };
  }
};

if (typeof window !== 'undefined') window.DataProcessor = DataProcessor;
if (typeof module !== 'undefined' && module.exports) module.exports = DataProcessor;
