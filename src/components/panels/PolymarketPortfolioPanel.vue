<script setup lang="ts">
/**
 * PolymarketPortfolioPanel.vue — Polymarket paper trading portfolio panel
 *
 * Displays:
 *  - Balance, Total P&L (color-coded), Win rate, Total trades
 *  - Compact table of recent paper trades (last 5):
 *    market name, side, stake, outcome, P&L
 *
 * API calls (no auth — public read endpoints):
 *  GET VITE_POLYMARKET_API_URL/api/paper-portfolio
 *  GET VITE_POLYMARKET_API_URL/api/paper-trades
 *
 * Auto-refreshes every 60 seconds.
 * If VITE_POLYMARKET_API_URL is not set, shows "Not configured" state without crashing.
 *
 * Sprint 16 — T1001
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'
import axios from 'axios'

interface PortfolioStats {
  balance: number
  totalPnl: number
  winRate: number
  totalTrades: number
}

interface PaperTrade {
  id?: number
  market_question?: string
  recommendation?: string
  entry_price?: number
  amount?: number
  exit_price?: number | null
  pnl?: number | null
  status?: string    // OPEN | WON | LOST | EXPIRED
  created_at?: string
}

const BASE_URL = import.meta.env.VITE_POLYMARKET_API_URL ?? ''
const REFRESH_INTERVAL_MS = 60_000

const portfolio = ref<PortfolioStats | null>(null)
const trades = ref<PaperTrade[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const lastUpdated = ref<Date | null>(null)

const isConfigured = BASE_URL.length > 0

const pnlPositive = computed(() => (portfolio.value?.totalPnl ?? 0) >= 0)

const recentTrades = computed(() => trades.value.slice(0, 5))

async function fetchData(): Promise<void> {
  if (!isConfigured) return

  loading.value = true
  error.value = null
  try {
    const [portfolioRes, tradesRes] = await Promise.all([
      axios.get<PortfolioStats>(`${BASE_URL}/api/paper-portfolio`, { timeout: 8000 }),
      axios.get<PaperTrade[]>(`${BASE_URL}/api/paper-trades`, { timeout: 8000 }),
    ])

    portfolio.value = portfolioRes.data
    trades.value = Array.isArray(tradesRes.data) ? tradesRes.data : []
    lastUpdated.value = new Date()
  } catch (err: unknown) {
    error.value = axios.isAxiosError(err)
      ? `${err.response?.status ?? 'Network'}: ${err.message}`
      : 'Failed to fetch Polymarket portfolio.'
  } finally {
    loading.value = false
  }
}

function formatPnl(val: number | null | undefined): string {
  if (val == null) return '—'
  const sign = val >= 0 ? '+' : ''
  return `${sign}$${val.toFixed(2)}`
}

function formatWinRate(rate: number | null | undefined): string {
  if (rate == null) return '—'
  return `${(rate * 100).toFixed(1)}%`
}

function tradeStatusBadge(status: string | undefined): string {
  switch ((status ?? '').toUpperCase()) {
    case 'WON':
      return 'bg-success'
    case 'LOST':
      return 'bg-danger'
    case 'OPEN':
      return 'bg-warning text-dark'
    default:
      return 'bg-secondary'
  }
}

function tradeSideBadge(rec: string | undefined): string {
  const r = (rec ?? '').toUpperCase()
  if (r.includes('YES')) return 'text-success'
  if (r.includes('NO')) return 'text-danger'
  return 'text-muted'
}

function truncate(str: string | undefined, max = 38): string {
  if (!str) return '—'
  return str.length > max ? str.slice(0, max) + '…' : str
}

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
        <i class="bi bi-graph-up-arrow me-1"></i>Polymarket Portfolio
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
          title="Refresh portfolio"
          aria-label="Refresh portfolio"
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
        Not configured — set <code class="text-warning">VITE_POLYMARKET_API_URL</code>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="text-danger small mb-3">
        {{ error }}
        <button class="btn btn-link btn-sm p-0 ms-1 text-danger" @click="fetchData">
          Retry
        </button>
      </div>

      <!-- Data state -->
      <template v-else-if="portfolio">
        <!-- Stats row -->
        <div class="row g-2 mb-3">
          <div class="col-6">
            <div class="bg-secondary bg-opacity-25 rounded p-2 text-center">
              <div class="fs-5 fw-bold text-light">${{ portfolio.balance.toFixed(2) }}</div>
              <div class="text-muted small">Balance</div>
            </div>
          </div>
          <div class="col-6">
            <div class="bg-secondary bg-opacity-25 rounded p-2 text-center">
              <div
                class="fs-5 fw-bold"
                :class="pnlPositive ? 'text-success' : 'text-danger'"
              >
                {{ formatPnl(portfolio.totalPnl) }}
              </div>
              <div class="text-muted small">Total P&amp;L</div>
            </div>
          </div>
          <div class="col-6">
            <div class="bg-secondary bg-opacity-25 rounded p-2 text-center">
              <div class="fs-5 fw-bold text-light">{{ formatWinRate(portfolio.winRate) }}</div>
              <div class="text-muted small">Win Rate</div>
            </div>
          </div>
          <div class="col-6">
            <div class="bg-secondary bg-opacity-25 rounded p-2 text-center">
              <div class="fs-5 fw-bold text-light">{{ portfolio.totalTrades }}</div>
              <div class="text-muted small">Trades</div>
            </div>
          </div>
        </div>

        <!-- Recent trades table -->
        <div v-if="recentTrades.length > 0">
          <p class="text-muted small mb-1">Recent trades (last 5)</p>
          <div class="table-responsive">
            <table class="table table-dark table-sm table-borderless mb-0" style="font-size: 0.75rem;">
              <thead>
                <tr class="text-muted">
                  <th scope="col">Market</th>
                  <th scope="col">Side</th>
                  <th scope="col">Stake</th>
                  <th scope="col">P&amp;L</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(trade, i) in recentTrades" :key="trade.id ?? i">
                  <td
                    class="text-light"
                    :title="trade.market_question"
                    style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
                  >
                    {{ truncate(trade.market_question) }}
                  </td>
                  <td :class="tradeSideBadge(trade.recommendation)">
                    {{ trade.recommendation ?? '—' }}
                  </td>
                  <td class="text-muted">
                    ${{ (trade.amount ?? 0).toFixed(2) }}
                  </td>
                  <td
                    :class="trade.pnl != null && trade.pnl >= 0 ? 'text-success' : 'text-danger'"
                  >
                    {{ formatPnl(trade.pnl) }}
                  </td>
                  <td>
                    <span
                      class="badge"
                      :class="tradeStatusBadge(trade.status)"
                      style="font-size: 0.65rem;"
                    >
                      {{ trade.status ?? '—' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-else class="text-muted small text-center py-2">
          No paper trades yet.
        </div>
      </template>

      <!-- Loading / empty initial state -->
      <div v-else-if="loading" class="text-muted small text-center py-3">
        <span class="spinner-border spinner-border-sm me-1" role="status"></span>
        Loading portfolio…
      </div>

      <div v-else class="text-muted small text-center py-3">
        No portfolio data.
      </div>

      <!-- Last updated -->
      <div v-if="lastUpdated" class="text-muted mt-2" style="font-size: 0.65rem;">
        Updated {{ lastUpdated.toLocaleTimeString() }}
      </div>
    </div>
  </div>
</template>
