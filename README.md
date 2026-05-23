# Product Management Frontend

## What this is

The **web UI** for the Product Management Platform: sign in, browse and filter products, create/edit items with photos, see who added each product, and use the **Alerts** bell for low-stock warnings. Normal users manage only their own products; the super admin can manage all.

Built with **Vue 3 + Vite**. Data and auth come from the Laravel API in **`../product-management-backend`**.

---

## Setup

```bash
npm install
cp .env.example .env   # adjust VITE_API_URL if your backend URL differs
```

## Development

```bash
npm run dev
```

Opens at `http://localhost:5173`. Guest routes: `/login`, `/register`, `/forgot-password`, `/reset-password`. `/products` needs a token.

## Products

- List with search, category, price range, sort, pagination
- Create/edit with multiple image upload
- Images stored on backend `public` disk (`storage/app/public/products/{id}/`)

## Build

```bash
npm run build
npm run preview
```

## Auth

- Register hits `POST /api/register`, then logs you in the same way as login
- Login hits `POST /api/login`, stores `token` + `user` in localStorage
- Axios sends `Authorization: Bearer …` on every request
- 401 clears the session and sends you back to login
- Logout calls `POST /api/logout` then clears local storage

## Forgot password

1. **Sign in** → **Forgot password?** → `/forgot-password`
2. Enter email → `POST /api/forgot-password`
   - Unknown email → error on page: *No account found with this email address.*
   - Registered → success: *We sent a password reset link to your email.*
3. Click link in email → `/reset-password?token=...&email=...`
4. Set new password → `POST /api/reset-password` → redirect to login

Backend must have `MAIL_*` and `FRONTEND_URL` set (see backend README). Default link host: `http://localhost:5173`.
