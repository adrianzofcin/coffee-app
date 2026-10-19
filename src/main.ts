import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useThemeStore } from './stores/theme'
import './assets/main.css'

// iOS Safari ignores user-scalable=no, pinch zoom has to be blocked via gesture events.
document.addEventListener('gesturestart', (event) => event.preventDefault(), { passive: false })

const app = createApp(App)

app.use(createPinia())
useThemeStore()
app.use(router)

app.mount('#app')
