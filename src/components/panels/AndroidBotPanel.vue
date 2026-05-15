<script setup lang="ts">
/**
 * AndroidBotPanel.vue — Android bot device status panel
 *
 * Displays:
 *  - Total devices: online / total count
 *  - Per-device row: serial, status badge (active/inactive), last seen
 *
 * API call:
 *  GET /api/devices  — X-API-Key: VITE_ANDROID_BOT_API_KEY
 *
 * Error states:
 *  - 401/403: "Authentication failed — check VITE_ANDROID_BOT_API_KEY"
 *  - Service offline: "Android bot offline" with last-known device count
 *
 * Auto-refreshes every 60 seconds.
 *
 * Sprint 15 — T904 (panel 2 of 2)
 */
import { ref, onMounted, onUnmounted, computed } from "vue";
import axios from "axios";

interface DeviceRecord {
  serial?: string;
  address?: string;
  alias?: string;
  status?: string;
  active?: boolean;
  last_seen?: string;
  environment?: string;
}

const BASE_URL = import.meta.env.VITE_ANDROID_BOT_API_URL ?? "";
const API_KEY = import.meta.env.VITE_ANDROID_BOT_API_KEY ?? "";
const REFRESH_INTERVAL_MS = 60_000;

// State
const devices = ref<DeviceRecord[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const authFailed = ref(false);
const serviceOffline = ref(false);
const lastUpdated = ref<Date | null>(null);
const lastKnownCount = ref<number | null>(null);

// Computed
const onlineCount = computed(() =>
  devices.value.filter((d) => d.active === true || d.status === "active").length,
);

function deviceId(d: DeviceRecord): string {
  return d.serial ?? d.address ?? d.alias ?? "unknown";
}

function isActive(d: DeviceRecord): boolean {
  return d.active === true || d.status === "active";
}

function formatLastSeen(ts?: string): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

// Fetch
async function fetchDevices() {
  if (!BASE_URL) {
    error.value = "VITE_ANDROID_BOT_API_URL is not configured.";
    return;
  }
  loading.value = true;
  error.value = null;
  authFailed.value = false;
  serviceOffline.value = false;
  try {
    const res = await axios.get<DeviceRecord[]>(`${BASE_URL}/api/devices`, {
      headers: API_KEY ? { "X-API-Key": API_KEY } : {},
      timeout: 8000,
    });
    devices.value = Array.isArray(res.data) ? res.data : [];
    lastKnownCount.value = devices.value.length;
    lastUpdated.value = new Date();
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        authFailed.value = true;
        error.value = "Authentication failed — check VITE_ANDROID_BOT_API_KEY";
      } else if (!err.response) {
        serviceOffline.value = true;
        error.value = "Android bot offline";
      } else {
        error.value = `Error ${status}: ${err.message}`;
      }
    } else {
      error.value = "Failed to fetch device list.";
    }
  } finally {
    loading.value = false;
  }
}

// Lifecycle
let timer: ReturnType<typeof setInterval>;
onMounted(() => {
  fetchDevices();
  timer = setInterval(fetchDevices, REFRESH_INTERVAL_MS);
});
onUnmounted(() => clearInterval(timer));
</script>

<template>
  <div class="card bg-dark border-secondary h-100">
    <div class="card-header d-flex align-items-center justify-content-between bg-dark border-secondary">
      <span class="fw-semibold text-light">
        <i class="bi bi-phone me-1"></i>Android Bot
      </span>
      <div class="d-flex align-items-center gap-2">
        <span class="spinner-border spinner-border-sm text-secondary" v-if="loading" role="status"></span>
        <button
          v-else
          class="btn btn-outline-secondary btn-sm py-0 px-1"
          title="Refresh"
          @click="fetchDevices"
        >
          ↺
        </button>
      </div>
    </div>

    <div class="card-body">
      <!-- Auth failure state -->
      <div v-if="authFailed" class="text-warning small">
        Authentication failed — check <code>VITE_ANDROID_BOT_API_KEY</code>
      </div>

      <!-- Service offline state -->
      <div v-else-if="serviceOffline" class="text-muted small">
        Android bot offline
        <span v-if="lastKnownCount !== null" class="text-secondary">
          — last known: {{ lastKnownCount }} device(s)
        </span>
      </div>

      <!-- Other error -->
      <div v-else-if="error" class="text-danger small mb-3">
        {{ error }}
        <button class="btn btn-link btn-sm p-0 ms-1 text-danger" @click="fetchDevices">Retry</button>
      </div>

      <!-- Normal state -->
      <template v-else>
        <!-- Summary -->
        <div class="bg-secondary bg-opacity-25 rounded p-2 text-center mb-3">
          <div class="fs-4 fw-bold text-light">
            {{ onlineCount }} / {{ devices.length }}
          </div>
          <div class="text-muted small">Devices online</div>
        </div>

        <!-- Device list -->
        <div v-if="devices.length > 0">
          <p class="text-muted small mb-1">Registered devices</p>
          <ul class="list-unstyled mb-0">
            <li
              v-for="device in devices"
              :key="deviceId(device)"
              class="d-flex justify-content-between align-items-start small mb-2 border-bottom border-secondary pb-1"
            >
              <div>
                <span class="font-monospace text-light">{{ deviceId(device) }}</span>
                <div class="text-muted" style="font-size: 0.7rem;">
                  Last seen: {{ formatLastSeen(device.last_seen) }}
                </div>
              </div>
              <span
                :class="isActive(device) ? 'badge bg-success' : 'badge bg-secondary'"
              >
                {{ isActive(device) ? "active" : "inactive" }}
              </span>
            </li>
          </ul>
        </div>

        <div v-else-if="!loading" class="text-muted small text-center py-2">
          No devices registered.
        </div>
      </template>

      <!-- Last updated -->
      <div v-if="lastUpdated" class="text-muted mt-2" style="font-size: 0.7rem;">
        Updated {{ lastUpdated.toLocaleTimeString() }}
      </div>
    </div>
  </div>
</template>
