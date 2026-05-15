<script setup lang="ts">
/**
 * TradeSimulationPanel.vue — Trade company simulation summary panel
 *
 * Reads the simulation summary from trade-company web/server.py (T903).
 * Auto-refreshes every 60 seconds.
 *
 * API: GET VITE_TRADE_API_URL/api/simulation-summary (no auth required)
 *
 * Response shape (T903):
 * {
 *   cash_balance: number,
 *   total_equity: number,
 *   pnl: number,
 *   pnl_pct: number,
 *   win_rate: number,
 *   trade_count: number,
 *   open_positions: Record<string, unknown>,
 *   recent_trades: RecentTrade[],
 *   last_updated: string  // ISO8601
 * }
 *
 * If VITE_TRADE_API_URL is not set, shows "Not configured" state without crashing.
 *
 * Sprint 16 — T1001
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'
import axios from 'axios'

interface RecentTrade {
  ticker?: string
  side?: string       // BUY | SELL
  qty?: number
  price?: number
  timestamp?: string
}

interface SimulationSummary {
  cash_balance: number
  total_equity: number
  pnl: number
  pnl_pct: number
  win_rate: number
  trade_count: number
  open_positions: Record<string, unknown>
  recent_trades: RecentTrade[]
  last_updated: string
}

const BASE_URL = import.meta.env.VITE_TRADE_API_URL ?? ''
const REFRESH_INTERVAL_MS = 60_000
const STARTING_BALANCE = 100_000

const summary = ref<SimulationSummary | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const lastUpdated = ref<Date | null>(null)

const isConfigured = BASE_URL.length > 0

const pnlPositive = computed(() => (summary.value?.pnl ?? 0) >= 0)
const openPositionCount = computed(() =>
  summary.value ? Object.keys(summary.value.open_positions).length : 0,
)
const recentTrades = computed(() => (summary.value?.recent_trades ?? []).slice(0, 5))

async function fetchData(): Promise<void> {
  if (!isConfigured) return

  loading.value = true
  error.value = null
  try {
    const res = await axios.get<SimulationSummary>(`${BASE_URL}/api/simulation-summary`, {
      timeout: 8000,
    })
    summary.value = res.data
    lastUpdated.value = new Date()
  } catch (err: unknown) {
    error.value = axios.isAxiosError(err)
      ? `${err.response?.status ?? 'Network'}: ${err.message}`
      : 'Failed to fetch trade simulation data.'
  } finally {
    loading.value = false
  }
}

function formatUsd(val: number | null | undefined): string {
  if (val == null) return '—'
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatPnl(pnl: number | null | undefined, pct: number | null | undefined): string {
  if (pnl == null) return '—'
  const sign = pnl >= 0 ? '+' : ''
  const pctStr = pct != null ? ` (${sign}${pct.toFixed(2)}%)` : ''
  return `${sign}${formatUsd(pnl)}${pctStr}`
}

function formatWinRate(rate: number | null | undefined): string {
  if (rate == null) return '—'
  return `${(rate * 100).toFixed(1)}%`
}

function sideBadgeClass(side: string | undefined): string {
  const s = (side ?? '').toUpperCase()
  if (s === 'BUY') return 'text-success'
  if (s === 'SELL') return 'text-danger'
  return 'text-muted'
}

function formatTimestamp(ts: string | undefined): string {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleTimeString()
  } catch {
    return ts
  }
}

// Derived equity vs starting balance for P&L display when pnl field is 0.0 but equity differs
// (use the server-provided pnl — don't recalculate)
const _ = STARTING_BALANCE // referenced to silence lint; kept as documentation

let timer: ReturnType<typeof setInterval>
onMounted(() => {
  if (isConfigured) {
    fetchData()
    timer = setInterval(fetchData, REFRESH_INTERVAL_MS)
  }
})
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="card bg-dark border-secondary h-100">
    <div
      class="card-header d-flex align-items-center justify-content-between bg-dark border-secondary"
    >
      <span class="fw-semibold text-light">
        <i class="bi bi-cash-coin me-1"></i>Trade Simulation
      </span>
      <div class="d-flex align-items-center gap-2">
        <span
          v-if="loading"
          class="spinner-border spinner-border-sm text-secondary"
          role="status"
          aria-label="Loading"
        ></span>
        <button
          v-else-if="isConfigured"
          class="btn btn-outline-secondary btn-sm py-0 px-1"
          title="Refresh simulation data"
          aria-label="Refresh simulation data"
          @click="fetchData"
        >
          ↺
        </button>
      </div>
    </div>

    <div class="card-body">
      <!-- Not configured state -->
      <div v-if="!isConfigured" class="text-muted small text-center py-3">
        <i class="bi bi-exclamation-circle me-1"></i>
        Not configured — set <code class="text-warning">VITE_TRADE_API_URL</code>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="text-danger small mb-3">
        {{ error }}
        <button class="btn btn-link btn-sm p-0 ms-1 text-danger" @click="fetchData">
          Retry
        </button>
      </div>

      <!-- Data state -->
      <template v-else-if="summary">
        <!-- Stats row -->
        <div class="row g-2 mb-3">
          <div class="col-6">
            <div class="bg-secondary bg-opacity-25 rounded p-2 text-center">
              <div class="fs-6 fw-bold text-light">{{ formatUsd(summary.cash_balance) }}</div>
              <div class="text-muted small">Cash Balance</div>
            </div>
          </div>
          <div class="col-6">
            <div class="bg-secondary bg-opacity-25 rounded p-2 text-center">
              <div class="fs-6 fw-bold text-light">{{ formatUsd(summary.total_equity) }}</div>
              <div class="text-muted small">Total Equity</div>
            </div>
          </div>
          <div class="col-6">
            <div class="bg-secondary bg-opacity-25 rounded p-2 text-center">
              <div
                class="fs-6 fw-bold"
                :class="pnlPositive ? 'text-success' : 'text-danger'"
              >
                {{ formatPnl(summary.pnl, summary.pnl_pct) }}
              </div>
              <div class="text-muted small">P&amp;L</div>
            </div>
          </div>
          <div class="col-6">
            <div class="bg-secondary bg-opacity-25 rounded p-2 text-center">
              <div class="fw-bold text-light">
                <span class="fs-6">{{ formatWinRate(summary.win_rate) }}</span>
                <span class="text-muted small ms-1">({{ summary.trade_count }} trades)</span>
              </div>
              <div class="d-flex justify-content-between">
                <div class="text-muted small">Win Rate</div>
                <div class="text-muted small">{{ openPositionCount }} open</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent trades list -->
        <div v-if="recentTrades.length > 0">
          <p class="text-muted small mb-1">Recent trades (last 5)</p>
          <ul class="list-unstyled mb-0">
            <li
              v-for="(trade, i) in recentTrades"
              :key="i"
              class="d-flex align-items-center justify-content-between small mb-1 border-bottom border-secondary pb-1"
            >
              <span class="font-monospace text-info fw-semibold" style="min-width: 60px;">
                {{ trade.ticker ?? '—' }}
              </span>
              <span :class="sideBadgeClass(trade.side)" class="fw-semibold" style="min-width: 36px;">
                {{ trade.side ?? '—' }}
              </span>
              <span class="text-muted">{{ trade.qty ?? '—' }} @ {{ formatUsd(trade.price) }}</span>
              <span class="text-muted" style="font-size: 0.65rem;">
                {{ formatTimestamp(trade.timestamp) }}
              </span>
            </li>
          </ul>
        </div>

        <div v-else class="text-muted small text-center py-2">
          No trades yet.
        </div>

        <!-- Server last_updated -->
        <div class="text-muted mt-2" style="font-size: 0.65rem;">
          Server: {{ formatTimestamp(summary.last_updated) }}
        </div>
      </template>

      <!-- Loading / empty initial state -->
      <div v-else-if="loading" class="text-muted small text-center py-3">
        <span class="spinner-border spinner-border-sm me-1" role="status"></span>
        Loading simulation data…
      </div>

      <div v-else class="text-muted small text-center py-3">
        No simulation data.
      </div>

      <!-- Panel last updated -->
      <div v-if="lastUpdated" class="text-muted mt-1" style="font-size: 0.65rem;">
        Panel updated {{ lastUpdated.toLocaleTimeString() }}
      </div>
    </div>
  </div>
</template>
