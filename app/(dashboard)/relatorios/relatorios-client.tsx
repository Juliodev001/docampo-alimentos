"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFileLines, faDollarSign, faChartBar, faArrowTrendUp, faXmark, faMagnifyingGlass, faUser } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { formatCurrency, formatDate } from "@/lib/utils";

type ClienteItem = { id: string; nome: string }

const GREEN = "#5ab952";
const NAVY = "#2d3561";
const PINK = "#e8255a";
const ORANGE = "#e87320";

type ReportResult = { tipo: string; data: unknown };

export default function RelatoriosClient() {
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<ReportResult | null>(null);

  /* ── Relatório por cliente ── */
  const [todosClientes, setTodosClientes] = useState<ClienteItem[]>([])
  const [clienteBusca, setClienteBusca] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteItem | null>(null)
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const [relInicio, setRelInicio] = useState('')
  const [relFim, setRelFim] = useState('')
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/clientes/lista').then(r => r.json()).then(setTodosClientes)
  }, [])

  useEffect(() => {
    function fechar(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setDropdownAberto(false)
    }
    document.addEventListener('mousedown', fechar)
    return () => document.removeEventListener('mousedown', fechar)
  }, [])

  const sugestoes = clienteBusca.trim()
    ? todosClientes.filter(c => c.nome.toLowerCase().includes(clienteBusca.toLowerCase())).slice(0, 8)
    : []

  function selecionarCliente(c: ClienteItem) {
    setClienteSelecionado(c)
    setClienteBusca(c.nome)
    setDropdownAberto(false)
  }

  function abrirRelatorioCliente() {
    if (!clienteSelecionado) return
    const p = new URLSearchParams()
    if (relInicio && relFim) { p.set('dataInicio', relInicio); p.set('dataFim', relFim) }
    const qs = p.toString()
    window.open(`/imprimir/relatorio-cliente/${clienteSelecionado.id}${qs ? `?${qs}` : ''}`, '_blank')
  }

  async function gerar(tipo: string) {
    setLoading(tipo);
    setResult(null);
    try {
      const params = new URLSearchParams({ tipo });
      if (de) params.set("de", de);
      if (ate) params.set("ate", ate);
      const res = await fetch(`/api/relatorios?${params}`);
      const data = await res.json();
      setResult({ tipo, data });
    } finally {
      setLoading(null);
    }
  }

  const inp = {
    padding: "9px 13px",
    border: "1.5px solid #e5e7eb",
    borderRadius: 10,
    fontSize: 14,
    color: NAVY,
    outline: "none",
    fontFamily: "inherit",
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: NAVY,
            margin: "0 0 4px",
          }}
        >
          Relatórios
        </h1>
        <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 24px" }}>
          Análises financeiras e operacionais
        </p>
      </motion.div>

      {/* Período global */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          backgroundColor: "white",
          borderRadius: 14,
          padding: "16px 20px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          marginBottom: 24,
          display: "flex",
          gap: 14,
          alignItems: "flex-end",
          flexWrap: "wrap",
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: NAVY,
            margin: 0,
            alignSelf: "center",
          }}
        >
          Período:
        </p>
        {[
          ["De", de, setDe],
          ["Até", ate, setAte],
        ].map(([label, val, setter]) => (
          <div key={label as string}>
            <p
              style={{
                fontSize: 12,
                color: "#6b7280",
                margin: "0 0 4px",
                fontWeight: 500,
              }}
            >
              {label as string}
            </p>
            <input
              type="date"
              value={val as string}
              onChange={(e) => (setter as (v: string) => void)(e.target.value)}
              style={inp}
            />
          </div>
        ))}
        {(de || ate) && (
          <motion.button
            onClick={() => {
              setDe("");
              setAte("");
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: "9px 14px",
              border: "1.5px solid #e5e7eb",
              borderRadius: 10,
              background: "white",
              fontSize: 13,
              color: "#6b7280",
              cursor: "pointer",
              fontFamily: "inherit",
              alignSelf: "flex-end",
            }}
          >
            Limpar
          </motion.button>
        )}
      </motion.div>

      {/* Cards de relatórios */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 18,
        }}
      >
        {[
          {
            tipo: "contas-pagar",
            icon: faFileLines as IconDefinition,
            color: ORANGE,
            titulo: "Contas a Pagar",
            desc: "Visualize compras pendentes e vencimentos",
          },
          {
            tipo: "contas-receber",
            icon: faDollarSign as IconDefinition,
            color: GREEN,
            titulo: "Contas a Receber",
            desc: "Acompanhe vendas e recebimentos",
          },
          {
            tipo: "dre",
            icon: faChartBar as IconDefinition,
            color: NAVY,
            titulo: "DRE Simplificada",
            desc: "Receitas, deduções, despesas e lucro operacional por período",
          },
          {
            tipo: "vendas-nfe",
            icon: faArrowTrendUp as IconDefinition,
            color: "#8b5cf6",
            titulo: "Resumo de Vendas (NF-e)",
            desc: "Totais de vendas usando o valor da NF-e — não depende de itens processados",
            destaque: true,
          },
        ].map(({ tipo, icon, color, titulo, desc, destaque }, i) => (
          <motion.div
            key={tipo}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.15 + i * 0.1,
              duration: 0.4,
              type: "spring",
              stiffness: 200,
            }}
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: 24,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              border: destaque
                ? `2px solid ${color}30`
                : "2px solid transparent",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: `${color}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FontAwesomeIcon icon={icon} style={{ fontSize: 22, color }} />
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: NAVY,
                    margin: 0,
                  }}
                >
                  {titulo}
                </h3>
                {destaque && (
                  <span
                    style={{
                      backgroundColor: `${color}20`,
                      color,
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    Novo
                  </span>
                )}
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "#6b7280",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {desc}
              </p>
            </div>
            <motion.button
              onClick={() => gerar(tipo)}
              disabled={loading === tipo}
              whileHover={
                loading !== tipo
                  ? {
                      scale: 1.02,
                      backgroundColor: destaque ? color : `${NAVY}ee`,
                    }
                  : {}
              }
              whileTap={loading !== tipo ? { scale: 0.97 } : {}}
              style={{
                padding: "11px",
                backgroundColor: destaque ? color : NAVY,
                color: "white",
                border: "none",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: loading === tipo ? "not-allowed" : "pointer",
                opacity: loading === tipo ? 0.7 : 1,
                fontFamily: "inherit",
                marginTop: "auto",
              }}
            >
              {loading === tipo ? "Gerando..." : "Gerar Relatório"}
            </motion.button>
          </motion.div>
        ))}
      </div>

      {/* Card: Relatório por Cliente */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.4, type: "spring", stiffness: 200 }}
        style={{
          backgroundColor: "white", borderRadius: 16, padding: 24,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          border: `2px solid ${NAVY}18`, marginTop: 18,
          display: "flex", flexDirection: "column" as const, gap: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: `${NAVY}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FontAwesomeIcon icon={faUser} style={{ fontSize: 22, color: NAVY }} />
          </div>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: NAVY, margin: '0 0 4px' }}>Relatório por Cliente</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
              Busque um cliente pelo nome, defina o período e abra o extrato de compras em PDF.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const, alignItems: 'flex-end' }}>
          {/* Busca de cliente */}
          <div ref={searchRef} style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 5px', fontWeight: 500 }}>Cliente</p>
            <div style={{ position: 'relative' }}>
              <FontAwesomeIcon icon={faMagnifyingGlass} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#9ca3af', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Buscar pelo nome..."
                value={clienteBusca}
                onChange={e => {
                  setClienteBusca(e.target.value)
                  setClienteSelecionado(null)
                  setDropdownAberto(true)
                }}
                onFocus={() => { if (clienteBusca) setDropdownAberto(true) }}
                style={{ width: '100%', padding: '9px 12px 9px 34px', border: `1.5px solid ${clienteSelecionado ? NAVY : '#e5e7eb'}`, borderRadius: 10, fontSize: 13, color: NAVY, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }}
              />
            </div>
            {dropdownAberto && sugestoes.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1.5px solid #e5e7eb', borderRadius: 10, marginTop: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, overflow: 'hidden' }}>
                {sugestoes.map(c => (
                  <div
                    key={c.id}
                    onMouseDown={() => selecionarCliente(c)}
                    style={{ padding: '10px 14px', fontSize: 13, color: NAVY, cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'white')}
                  >
                    {c.nome}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Datas */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 5px', fontWeight: 500 }}>De</p>
              <input type="date" value={relInicio} onChange={e => setRelInicio(e.target.value)}
                style={{ padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 13, color: NAVY, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }} />
            </div>
            <div>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 5px', fontWeight: 500 }}>Até</p>
              <input type="date" value={relFim} onChange={e => setRelFim(e.target.value)}
                style={{ padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 13, color: NAVY, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }} />
            </div>
          </div>

          {/* Botão */}
          <motion.button
            onClick={abrirRelatorioCliente}
            disabled={!clienteSelecionado}
            whileHover={clienteSelecionado ? { scale: 1.02, backgroundColor: `${NAVY}ee` } : {}}
            whileTap={clienteSelecionado ? { scale: 0.97 } : {}}
            style={{ padding: '11px 22px', backgroundColor: NAVY, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: clienteSelecionado ? 'pointer' : 'not-allowed', opacity: clienteSelecionado ? 1 : 0.45, fontFamily: 'inherit', whiteSpace: 'nowrap' as const, alignSelf: 'flex-end' }}
          >
            <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 13, marginRight: 8 }} />
            Ver Relatório
          </motion.button>
        </div>

        {clienteSelecionado && (
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
            Cliente selecionado: <strong style={{ color: NAVY }}>{clienteSelecionado.nome}</strong>
            {relInicio && relFim ? ` · período ${relInicio.split('-').reverse().join('/')} a ${relFim.split('-').reverse().join('/')}` : ' · todos os pedidos'}
          </p>
        )}
      </motion.div>

      {/* Modal resultado */}
      <AnimatePresence>
        {result && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setResult(null)}
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0,0,0,0.5)",
                zIndex: 1000,
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              style={{
                position: "fixed",
                top: 40,
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "white",
                borderRadius: 18,
                padding: 0,
                width: "95%",
                maxWidth: 760,
                maxHeight: "85vh",
                overflowY: "auto",
                zIndex: 1001,
                boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
              }}
            >
              <div
                style={{
                  padding: "20px 26px",
                  borderBottom: "1px solid #f3f4f6",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  position: "sticky",
                  top: 0,
                  backgroundColor: "white",
                  zIndex: 2,
                }}
              >
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: NAVY,
                    margin: 0,
                  }}
                >
                  {
                    {
                      "contas-pagar": "Contas a Pagar",
                      "contas-receber": "Contas a Receber",
                      dre: "DRE Simplificada",
                      "vendas-nfe": "Resumo de Vendas (NF-e)",
                    }[result.tipo]
                  }
                </h2>
                <motion.button
                  onClick={() => setResult(null)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    background: "#f3f4f6",
                    border: "none",
                    borderRadius: 8,
                    padding: 6,
                    cursor: "pointer",
                    color: "#6b7280",
                  }}
                >
                  <FontAwesomeIcon icon={faXmark} style={{ fontSize: 16 }} />
                </motion.button>
              </div>

              <div style={{ padding: "20px 26px" }}>
                <ResultBody result={result} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultBody({ result }: { result: ReportResult }) {
  const NAVY = "#2d3561",
    GREEN = "#5ab952",
    PINK = "#e8255a",
    ORANGE = "#e87320";

  if (result.tipo === "dre") {
    const d = result.data as {
      receita: number;
      despesa: number;
      resultado: number;
      nfes: number;
      compras: number;
    };
    const lucro = d.resultado >= 0;
    return (
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}
      >
        {[
          {
            label: "Receita (NF-e)",
            value: d.receita,
            color: GREEN,
            sub: `${d.nfes} notas`,
          },
          {
            label: "Despesas (Compras)",
            value: d.despesa,
            color: ORANGE,
            sub: `${d.compras} compras`,
          },
          {
            label: "Resultado",
            value: d.resultado,
            color: lucro ? GREEN : PINK,
            sub: lucro ? "Lucro" : "Prejuízo",
            destaque: true,
          },
        ].map(({ label, value, color, sub, destaque }) => (
          <div
            key={label}
            style={{
              backgroundColor: destaque ? `${color}10` : "#f9fafb",
              borderRadius: 14,
              padding: "20px 22px",
              border: destaque
                ? `2px solid ${color}30`
                : "2px solid transparent",
            }}
          >
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 6px" }}>
              {label}
            </p>
            <p
              style={{
                fontSize: 26,
                fontWeight: 800,
                color,
                margin: "0 0 4px",
              }}
            >
              {formatCurrency(value)}
            </p>
            <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>{sub}</p>
          </div>
        ))}
      </div>
    );
  }

  if (result.tipo === "vendas-nfe") {
    const d = result.data as {
      nfes: {
        id: string;
        numero: string | null;
        dataEmissao: string;
        totalValor: number;
        statusFinanceiro: string;
        cliente: { nome: string };
      }[];
      total: number;
      aReceber: number;
      recebido: number;
    };
    return (
      <div>
        <div className="kpi-grid-3">
          {[
            { label: "Total de Vendas", value: d.total, color: NAVY },
            { label: "A Receber", value: d.aReceber, color: ORANGE },
            { label: "Recebido", value: d.recebido, color: GREEN },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                backgroundColor: "#f9fafb",
                borderRadius: 12,
                padding: "16px 18px",
                borderTop: `4px solid ${color}`,
              }}
            >
              <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 4px" }}>
                {label}
              </p>
              <p className="kpi-val" style={{ fontSize: 20, fontWeight: 700, color, margin: 0, wordBreak: 'break-word' }}>
                {formatCurrency(value)}
              </p>
            </div>
          ))}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f9fafb" }}>
              {["Data", "NF", "Cliente", "Status", "Valor"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 12px",
                    textAlign: "left",
                    fontSize: 11,
                    color: "#6b7280",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.nfes.map((n) => (
              <tr key={n.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "11px 12px", fontSize: 13, color: NAVY }}>
                  {formatDate(new Date(n.dataEmissao))}
                </td>
                <td
                  style={{
                    padding: "11px 12px",
                    fontSize: 13,
                    color: "#6b7280",
                  }}
                >
                  {n.numero ?? "-"}
                </td>
                <td
                  style={{
                    padding: "11px 12px",
                    fontSize: 13,
                    fontWeight: 500,
                    color: NAVY,
                  }}
                >
                  {n.cliente.nome}
                </td>
                <td style={{ padding: "11px 12px" }}>
                  <span
                    style={{
                      backgroundColor:
                        n.statusFinanceiro === "RECEBIDO"
                          ? "#f0faf0"
                          : "#fff7ed",
                      color: n.statusFinanceiro === "RECEBIDO" ? GREEN : ORANGE,
                      padding: "3px 10px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {n.statusFinanceiro === "RECEBIDO"
                      ? "Recebido"
                      : "A Receber"}
                  </span>
                </td>
                <td
                  style={{
                    padding: "11px 12px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: NAVY,
                  }}
                >
                  {formatCurrency(n.totalValor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (result.tipo === "contas-pagar") {
    const compras = result.data as {
      id: string;
      data: string;
      vencimento: string;
      totalValor: number;
      status: string;
      fornecedor: { nome: string };
    }[];
    const statusC: Record<
      string,
      { label: string; bg: string; color: string }
    > = {
      A_PAGAR: { label: "A Pagar", bg: "#fff7ed", color: ORANGE },
      PAGO: { label: "Pago", bg: "#f0faf0", color: GREEN },
      VENCIDO: { label: "Vencido", bg: "#fff0f3", color: PINK },
    };
    const total = compras.reduce((s, c) => s + c.totalValor, 0);
    return (
      <div>
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: `${ORANGE}10`,
            borderRadius: 10,
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 14, color: NAVY, fontWeight: 600 }}>
            {compras.length} compras
          </span>
          <span style={{ fontSize: 16, fontWeight: 700, color: ORANGE }}>
            {formatCurrency(total)}
          </span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f9fafb" }}>
              {["Fornecedor", "Data", "Vencimento", "Status", "Valor"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontSize: 11,
                      color: "#6b7280",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {compras.map((c) => {
              const st = statusC[c.status] ?? statusC.A_PAGAR;
              return (
                <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td
                    style={{
                      padding: "11px 12px",
                      fontSize: 13,
                      fontWeight: 500,
                      color: NAVY,
                    }}
                  >
                    {c.fornecedor.nome}
                  </td>
                  <td
                    style={{
                      padding: "11px 12px",
                      fontSize: 13,
                      color: "#6b7280",
                    }}
                  >
                    {formatDate(new Date(c.data))}
                  </td>
                  <td
                    style={{ padding: "11px 12px", fontSize: 13, color: NAVY }}
                  >
                    {formatDate(new Date(c.vencimento))}
                  </td>
                  <td style={{ padding: "11px 12px" }}>
                    <span
                      style={{
                        backgroundColor: st.bg,
                        color: st.color,
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {st.label}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "11px 12px",
                      fontSize: 13,
                      fontWeight: 700,
                      color: NAVY,
                    }}
                  >
                    {formatCurrency(c.totalValor)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  if (result.tipo === "contas-receber") {
    const titulos = result.data as {
      id: string;
      descricao: string;
      valor: number;
      dataVenc: string;
      status: string;
      cliente: { nome: string };
    }[];
    const stConf: Record<string, { label: string; bg: string; color: string }> =
      {
        A_RECEBER: { label: "A Receber", bg: "#fff7ed", color: ORANGE },
        RECEBIDO: { label: "Recebido", bg: "#f0faf0", color: GREEN },
        VENCIDO: { label: "Vencido", bg: "#fff0f3", color: PINK },
      };
    const total = titulos.reduce((s, t) => s + t.valor, 0);
    return (
      <div>
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: `${GREEN}10`,
            borderRadius: 10,
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 14, color: NAVY, fontWeight: 600 }}>
            {titulos.length} títulos
          </span>
          <span style={{ fontSize: 16, fontWeight: 700, color: GREEN }}>
            {formatCurrency(total)}
          </span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f9fafb" }}>
              {["Cliente", "Descrição", "Vencimento", "Status", "Valor"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontSize: 11,
                      color: "#6b7280",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {titulos.map((t) => {
              const st = stConf[t.status] ?? stConf.A_RECEBER;
              return (
                <tr key={t.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td
                    style={{
                      padding: "11px 12px",
                      fontSize: 13,
                      fontWeight: 500,
                      color: NAVY,
                    }}
                  >
                    {t.cliente.nome}
                  </td>
                  <td
                    style={{
                      padding: "11px 12px",
                      fontSize: 13,
                      color: "#6b7280",
                    }}
                  >
                    {t.descricao}
                  </td>
                  <td
                    style={{ padding: "11px 12px", fontSize: 13, color: NAVY }}
                  >
                    {formatDate(new Date(t.dataVenc))}
                  </td>
                  <td style={{ padding: "11px 12px" }}>
                    <span
                      style={{
                        backgroundColor: st.bg,
                        color: st.color,
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {st.label}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "11px 12px",
                      fontSize: 13,
                      fontWeight: 700,
                      color: NAVY,
                    }}
                  >
                    {formatCurrency(t.valor)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return null;
}
