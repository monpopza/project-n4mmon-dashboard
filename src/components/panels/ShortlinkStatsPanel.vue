<script setup lang="ts">
/**
 * ShortlinkStatsPanel.vue — Shortlink service stats panel
 *
 * Displays:
 *  - Total links created
 *  - Total clicks (sum across all links)
 *  - Top 5 links by click count
 *  - Error badge: count of errors in last 24h (from /api/notifications)
 *
 * API calls:
 *  GET /api/stats        — Authorization: Bearer VITE_SHORTLINK_ADMIN_TOKEN
 *  GET /api/notifications — Authorization: Bearer VITE_SHORTLINK_ADMIN_TOKEN
 *
 * Auto-refreshes every 60 seconds.
 *
 * Sprint 15 — T904 (panel 1 of 2)
 */
import { ref, onMounted, onUnmounted, computed } from "vue";
import axios from "axios";

interface LinkRecord {
  code: string;
  originalUrl: string;
  clicks: number;
  createdAt?: string;
}

interface Notification {
  type?: string;
  createdAt?: string;
  message?: string;
}

const BASE_URL = import.meta.env.VITE_SHORTLINK_API_URL ?? "";
const ADMIN_TOKEN = import.meta.env.VITE_SHORTLINK_ADMIN_TOKEN ?? "";
const REFRESH_INTERVAL_MS = 60_000;

// State
const links = ref<LinkRecord[]>([]);
const errorCount24h = ref(0);
const loading = ref(false);
const error = ref<string | null>(null);
const lastUpdated = ref<Date | null>(null);

// Computed
const totalLinks = computed(() => links.value.length);
const totalClicks = computed(() =>
  links.value.reduce((sum, l) => sum + (l.clicks ?? 0), 0),
);
const top5Links = computed(() =>
  [...links.value].sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0)).slice(0, 5),
);

// Fetch
async function fetchStats() {
  if (!BASE_URL) {
    error.value = "VITE_SHORTLINK_API_URL is not configured.";
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const headers = { Authorization: `Bearer ${ADMIN_TOKEN}` };
    const [statsRes, notifRes] = await Promise.all([
      axios.get<LinkRecord[]>(`${BASE_URL}/api/stats`, { headers, timeout: 8000 }),
      axios.get<Notification[]>(`${BASE_URL}/api/notifications`, { headers, timeout: 8000 }),
    ]);

    links.value = Array.isArray(statsRes.data) ? statsRes.data : [];

    // Count notifications in the last 24 hours with type containing "error"
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    errorCount24h.value = Array.isArray(notifRes.data)
      ? notifRes.data.filter((n) => {
          const ts = n.createdAt ? new Date(n.createdAt).getTime() : 0;
          return ts > cutoff && (n.type ?? "").toLowerCase().includes("error");
        }).length
      : 0;

    lastUpdated.value = new Date();
  } catch (err: unknown) {
    error.value =
      axios.isAxiosError(err)
        ? `${err.response?.status ?? "Network"}: ${err.message}`
        : "Failed to fetch shortlink stats.";
  } finally {
    loading.value = false;
  }
}

// Lifecycle
let timer: ReturnType<typeof setInterval>;
onMounted(() => {
  fetchStats();
  timer = setInterval(fetchStats, REFRESH_INTERVAL_MS);
});
onUnmounted(() => clearInterval(timer));

function truncateUrl(url: string, maxLen = 40): string {
  return url.length > maxLen ? url.slice(0, maxLen) + "…" : url;
}
</script>

<template>
  <div class="card bg-dark border-secondary h-100">
    <div class="card-header d-flex align-items-center justify-content-between bg-dark border-secondary">
      <span class="fw-semibold text-light">
        <i class="bi bi-link-45deg me-1"></i>Shortlink
      </span>
      <div class="d-flex align-items-center gap-2">
        <!-- Error badge -->
        <span
          v-if="errorCount24h > 0"
          class="badge bg-danger"
          :title="`${errorCount24h} error(s) in last 24h`"
        >
          {{ errorCount24h }} err
        </span>
        <span
          v-if="loading"
          class="spinner-border spinner-border-sm text-secondary"
          role="status"
          aria-label="Loading"
        ></span>
        <button
          v-else
          class="btn btn-outline-secondary btn-sm py-0 px-1"
          title="Refresh"
          @click="fetchStats"
        >
          ↺
        </button>
      </div>
    </div>

    <div class="card-body">
      <!-- Error state -->
      <div v-if="error" class="text-danger small mb-3">
        {{ error }}
        <button class="btn btn-link btn-sm p-0 ms-1 text-danger" @click="fetchStats">
          Retry
        </button>
      </div>

      <!-- Stats row -->
      <div class="row g-2 mb-3">
        <div class="col-6">
          <div class="bg-secondary bg-opacity-25 rounded p-2 text-center">
            <div class="fs-4 fw-bold text-light">{{ totalLinks }}</div>
            <div class="text-muted small">Total Links</div>
          </div>
        </div>
        <div class="col-6">
          <div class="bg-secondary bg-opacity-25 rounded p-2 text-center">
            <div class="fs-4 fw-bold text-light">{{ totalClicks.toLocaleString() }}</div>
            <div class="text-muted small">Total Clicks</div>
          </div>
        </div>
      </div>

      <!-- Top 5 links -->
      <div v-if="top5Links.length > 0">
        <p class="text-muted small mb-1">Top 5 by clicks</p>
        <ul class="list-unstyled mb-0">
          <li
            v-for="link in top5Links"
            :key="link.code"
            class="d-flex justify-content-between align-items-center small mb-1"
          >
            <span class="font-monospace text-info">{{ link.code }}</span>
            <span class="text-muted text-truncate mx-2" style="max-width: 160px;">
              {{ truncateUrl(link.originalUrl) }}
            </span>
            <span class="badge bg-primary rounded-pill">{{ link.clicks }}</span>
          </li>
        </ul>
      </div>

      <div v-else-if="!loading && !error" class="text-muted small text-center py-2">
        No links yet.
      </div>

      <!-- Last updated -->
      <div v-if="lastUpdated" class="text-muted mt-2" style="font-size: 0.7rem;">
        Updated {{ lastUpdated.toLocaleTimeString() }}
      </div>
    </div>
  </div>
</template>
