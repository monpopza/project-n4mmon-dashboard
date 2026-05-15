<script setup lang="ts">
/**
 * DashboardView.vue — Main dashboard layout
 *
 * Layout:
 *   - NavBar (top)
 *   - 2-column grid:
 *     - Left sidebar (col-3): HealthPanel (Sprint 16 — T1001)
 *     - Right panel area (col-9): Service panels
 *       - Row 1: ShortlinkStatsPanel + AndroidBotPanel (Sprint 15 — T904)
 *       - Row 2: PolymarketPortfolioPanel + TradeSimulationPanel (Sprint 16 — T1001)
 *
 * All panels use defineAsyncComponent + <Suspense> for lazy-loading.
 * Sprint 16 — T1001: all 5 panels wired.
 */
import { defineAsyncComponent } from 'vue'
import NavBar from '@/components/NavBar.vue'

const ShortlinkStatsPanel = defineAsyncComponent(
  () => import('@/components/panels/ShortlinkStatsPanel.vue'),
)
const AndroidBotPanel = defineAsyncComponent(
  () => import('@/components/panels/AndroidBotPanel.vue'),
)
const HealthPanel = defineAsyncComponent(
  () => import('@/components/panels/HealthPanel.vue'),
)
const PolymarketPortfolioPanel = defineAsyncComponent(
  () => import('@/components/panels/PolymarketPortfolioPanel.vue'),
)
const TradeSimulationPanel = defineAsyncComponent(
  () => import('@/components/panels/TradeSimulationPanel.vue'),
)
</script>

<template>
  <div class="min-vh-100 d-flex flex-column bg-dark text-light">
    <NavBar />

    <main class="container-fluid flex-grow-1 py-3 px-3">
      <div class="row g-3">
        <!-- Left sidebar: System health -->
        <aside class="col-12 col-lg-3">
          <Suspense>
            <HealthPanel />
            <template #fallback>
              <div class="card bg-dark border-secondary p-3 text-muted small">
                Loading health status…
              </div>
            </template>
          </Suspense>
        </aside>

        <!-- Right panel area -->
        <section class="col-12 col-lg-9">
          <div class="row g-3">

            <!-- Panel 1: Shortlink Stats (T904 — Sprint 15) -->
            <div class="col-12 col-md-6">
              <Suspense>
                <ShortlinkStatsPanel />
                <template #fallback>
                  <div class="card bg-dark border-secondary p-3 text-muted small">
                    Loading shortlink stats…
                  </div>
                </template>
              </Suspense>
            </div>

            <!-- Panel 2: Android Bot (T904 — Sprint 15) -->
            <div class="col-12 col-md-6">
              <Suspense>
                <AndroidBotPanel />
                <template #fallback>
                  <div class="card bg-dark border-secondary p-3 text-muted small">
                    Loading android bot status…
                  </div>
                </template>
              </Suspense>
            </div>

            <!-- Panel 3: Polymarket Portfolio (T1001 — Sprint 16) -->
            <div class="col-12 col-md-6">
              <Suspense>
                <PolymarketPortfolioPanel />
                <template #fallback>
                  <div class="card bg-dark border-secondary p-3 text-muted small">
                    Loading Polymarket portfolio…
                  </div>
                </template>
              </Suspense>
            </div>

            <!-- Panel 4: Trade Simulation (T1001 — Sprint 16) -->
            <div class="col-12 col-md-6">
              <Suspense>
                <TradeSimulationPanel />
                <template #fallback>
                  <div class="card bg-dark border-secondary p-3 text-muted small">
                    Loading trade simulation…
                  </div>
                </template>
              </Suspense>
            </div>

          </div>
        </section>
      </div>
    </main>
  </div>
</template>
