import { createApp } from "vue";
import { onAuthStateChanged } from "firebase/auth";
import App from "./App.vue";
import router from "./router";
import { auth } from "./firebase";

// Bootstrap CSS
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

const app = createApp(App);
app.use(router);

// Defer mount until Firebase Auth state is resolved.
// This prevents the router guard from running before auth is initialised,
// which would cause a redirect-to-login flash on page refresh.
let mounted = false;
onAuthStateChanged(auth, () => {
  if (!mounted) {
    app.mount("#app");
    mounted = true;
  }
});
