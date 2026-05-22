# Product Management Frontend

Vue 3 + Vite. Talks to the Laravel API in `product-management-backend`.

## Setup

```bash
npm install
cp .env.example .env   # adjust VITE_API_URL if your backend URL differs
```

## Development

```bash
npm run dev
```

Opens at `http://localhost:5173`. `/login` and `/register` for guests. `/products` needs a token.

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
