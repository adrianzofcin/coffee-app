import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
    interface RouteMeta {
        guest?: boolean
        layout?: 'app' | 'blank'
        title?: string
    }
}

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        { path: '/', redirect: '/brew' },
        {
            path: '/login',
            name: 'login',
            component: () => import('@/pages/LoginPage.vue'),
            meta: { guest: true, layout: 'blank', title: 'Sign in' },
        },
        {
            path: '/coffees',
            name: 'coffees',
            component: () => import('@/pages/CoffeesPage.vue'),
            meta: { layout: 'app', title: 'Coffees' },
        },
        {
            path: '/recipes',
            name: 'recipes',
            component: () => import('@/pages/RecipesPage.vue'),
            meta: { layout: 'app', title: 'Recipes' },
        },
        {
            path: '/brew',
            name: 'brew',
            component: () => import('@/pages/BrewPage.vue'),
            meta: { layout: 'app', title: 'Brew' },
        },
        {
            path: '/stats',
            name: 'stats',
            component: () => import('@/pages/StatsPage.vue'),
            meta: { layout: 'app', title: 'Stats' },
        },
        {
            path: '/settings',
            name: 'settings',
            component: () => import('@/pages/SettingsPage.vue'),
            meta: { layout: 'app', title: 'Settings' },
        },
        { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
})

router.beforeEach(async (to) => {
    const auth = useAuthStore()
    await auth.init()

    if (!to.meta.guest && !auth.isAuthenticated) {
        return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} }
    }

    if (to.meta.guest && auth.isAuthenticated) {
        return { path: '/' }
    }
})

router.afterEach((to) => {
    document.title = to.meta.title ? `${to.meta.title} · Coffee` : 'Coffee'
})

export default router
