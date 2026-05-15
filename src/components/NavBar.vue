<script setup lang="ts">
import { computed } from "vue";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase";
import { useRouter } from "vue-router";

const user = computed(() => auth.currentUser);
const router = useRouter();

async function handleSignOut() {
  await signOut(auth);
  router.push("/login");
}
</script>

<template>
  <nav class="navbar navbar-dark bg-dark border-bottom border-secondary px-3 py-2">
    <span class="navbar-brand fw-bold mb-0 h1 fs-5">n4mmon Dashboard</span>

    <div v-if="user" class="d-flex align-items-center gap-3">
      <img
        v-if="user.photoURL"
        :src="user.photoURL"
        :alt="user.displayName || 'User'"
        class="rounded-circle"
        width="32"
        height="32"
        referrerpolicy="no-referrer"
      />
      <span class="text-light small d-none d-md-inline">{{ user.displayName || user.email }}</span>
      <button class="btn btn-outline-secondary btn-sm" @click="handleSignOut">
        Sign out
      </button>
    </div>
  </nav>
</template>
