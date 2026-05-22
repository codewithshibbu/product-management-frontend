import { createRouter, createWebHistory } from 'vue-router'
import { isLoggedIn } from '../services/token'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/Login.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../views/Register.vue'),
    meta: { guest: true },
  },
  {
    path: '/',
    component: () => import('../components/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: { name: 'products' } },
      {
        path: 'products',
        name: 'products',
        component: () => import('../views/ProductList.vue'),
        children: [
          {
            path: 'new',
            name: 'product-create',
            component: () => import('../views/ProductForm.vue'),
          },
          {
            path: ':id/edit',
            name: 'product-edit',
            component: () => import('../views/ProductForm.vue'),
          },
        ],
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const loggedIn = isLoggedIn()
  const needsAuth = to.matched.some((r) => r.meta.requiresAuth)

  if (needsAuth && !loggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guest && loggedIn) {
    return { name: 'products' }
  }
})

export default router
