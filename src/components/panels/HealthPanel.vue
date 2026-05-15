<script setup lang="ts">
/**
 * HealthPanel.vue — System health status sidebar panel
 *
 * Polls /healthz on all 4 services every 30 seconds using Promise.allSettled.
 * Each check is independent — one failure does not affect other services.
 *
 * Status logic:
 *  - UP:       HTTP 200 within 5 seconds
 *  - DOWN:     non-200 response, network error, or timeout
 *  - checking: initial state or mid-poll
 *
 * Sprint 16 — T1001
 */
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'

type ServiceStatus = 'up' | 'down' | 'checking'

interface ServiceState {
  name: string
  status: ServiceStatus
  lastChecked: Date | null
  responseMs: number | null
}

const SHORTLINK_URL = import.meta.env.VITE_SHORTLINK_API_URL ?? ''
const ANDROIDBOT_URL = import.meta.env.VITE_ANDROID_BOT_API_URL ?? ''
const POLYMARKET_URL = import.meta.env.VITE_POLYMARKET_API_URL ?? ''
const TRADE_URL = import.meta.env.VITE_TRADE_API_URL ?? ''

const REFRESH_INTERVAL_MS = 30_000
const TIMEOUT_MS = 5_000

const services = ref<ServiceState[]>([
  { name: 'Shortlink API', status: 'checking', lastChecked: null, responseMs: null },
  { name: 'Android Bot', status: 'checking', lastChecked: null, responseMs: null },
  { name: 'Polymarket', status: 'checking', lastChecked: null, responseMs: null },
  { name: 'Trade Company', status: 'checking', lastChecked: null, responseMs: null },
])

const baseUrls = [SHORTLINK_URL, ANDROIDBOT_URL, POLYMARKET_URL, TRADE_URL]

async function checkService(index: number): Promise<void> {
  const baseUrl = baseUrls[index]
  const svc = services.value[index]

  if (!baseUrl) {
    svc.status = 'down'
    svc.lastChecked = new Date()
    svc.responseMs = null
    return
  }

  const start = Date.now()
  try {
    const res = await axios.get(`${baseUrl}/healthz`, {
      timeout: TIMEOUT_MS,
      // No auth — /healthz is a public endpoint on all services
    })
    svc.responseMs = Date.now() - start
    svc.status = res.status === 200 ? 'up' : 'down'
  } catch {
    svc.responseMs = null
    svc.status = 'down'
  } finally {
    svc.lastChecked = new Date()
  }
}

async function checkAll(): Promise<void> {
  // Mark all as checking before the round starts so UI shows live state
  services.value.forEach((s) => {
    if (s.status !== 'checking') {
      // Keep last known status visible; don't flash to "checking" on refresh polls
      // (only on initial load do we show "checking")
    }
  })

  await Promise.allSettled(services.value.map((_, i) => checkService(i)))
}

function statusDotClass(status: ServiceStatus): string {
  switch (status) {
    case 'up':
      return 'bg-success'
    case 'down':
      return 'bg-danger'
    default:
      return 'bg-secondary'
  }
}

function statusLabel(status: ServiceStatus): string {
  switch (status) {
    case 'up':
      return 'UP'
    case 'down':
      return 'DOWN'
    default:
      return 'Checking'
  }
}

function statusTextClass(status: ServiceStatus): string {
  switch (status) {
    case 'up':
      return 'text-success'
    case 'down':
      return 'text-danger'
    default:
      return 'text-secondary'
  }
}

function formatTime(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleTimeString()
}

let timer: ReturnType<typeof setInterval>
onMounted(() => {
  checkAll()
  timer = setInterval(checkAll, REFRESH_INTERVAL_MS)
})
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="card bg-dark border-secondary">
    <div
      class="card-header d-flex align-items-center justify-content-between bg-dark border-secondary"
    >
      <span class="fw-semibold text-light small">
        <i class="bi bi-activity me-1"></i>System Health
      </span>
      <button
        class="btn btn-outline-secondary btn-sm py-0 px-1"
        title="Refresh health checks"
        aria-label="Refresh health checks"
        @click="checkAll"
      >
        ↺
      </button>
    </div>

    <div class="card-body p-0">
      <ul class="list-group list-group-flush" role="list">
        <li
          v-for="(svc, i) in services"
          :key="i"
          class="list-group-item bg-dark border-secondary d-flex align-items-center justify-content-between py-2 px-3"
        >
          <!-- Status dot + service name -->
          <div class="d-flex align-items-center gap-2">
            <span
              class="rounded-circle d-inline-block flex-shrink-0"
              :class="statusDotClass(svc.status)"
              style="width: 8px; height: 8px;"
              :aria-label="`${svc.name}: ${statusLabel(svc.status)}`"
            ></span>
            <span class="small text-light">{{ svc.name }}</span>
          </div>

          <!-- Status label + response time -->
          <div class="text-end">
            <span
              class="small fw-semibold"
              :class="statusTextClass(svc.status)"
            >
              <span v-if="svc.status === 'checking'" class="spinner-border spinner-border-sm me-1" role="status"></span>
              <template v-else>{{ statusLabel(svc.status) }}</template>
            </span>
            <div v-if="svc.responseMs !== null" class="text-muted" style="font-size: 0.65rem;">
              {{ svc.responseMs }}ms
            </div>
          </div>
        </li>
      </ul>

      <!-- Last check timestamp (uses whichever was last checked) -->
      <div class="px-3 py-2 text-muted" style="font-size: 0.65rem;">
        <span v-if="services.some((s) => s.lastChecked !== null)">
          Last check:
          {{
            formatTime(
              services
                .map((s) => s.lastChecked)
                .filter((d): d is Date => d !== null)
                .sort((a, b) => b.getTime() - a.getTime())[0] ?? null,
            )
          }}
        </span>
        <span v-else>Checking…</span>
      </div>
    </div>
  </div>
</template>
