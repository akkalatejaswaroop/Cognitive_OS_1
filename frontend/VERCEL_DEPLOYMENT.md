# 🚀 Deploying Cognitive OS Frontend on Vercel

This guide provides step-by-step instructions to deploy the premium **Cognitive OS** Next.js frontend to **Vercel** with seamless integration to your FastAPI backend.

---

## 🛠️ Step 1: Prepare Your Environment Variables

Vercel will build your Next.js application for production. The frontend needs to know where your backend server is located.

In your Vercel Project Settings, add the following environment variable:

| Key | Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://your-deployed-backend.com` | The base URL of your deployed FastAPI backend. |

> [!NOTE]
> If left unset, the frontend will default to `http://localhost:8000` for local development.

---

## 📦 Step 2: Configure Vercel Project

Since the Next.js application is located in the `frontend/` subdirectory of your repository, configure Vercel with these project settings during import:

1. **Framework Preset**: `Next.js`
2. **Root Directory**: `frontend` (Make sure to override this!)
3. **Build Command**: `next build` (Default)
4. **Output Directory**: `.next` (Default)
5. **Install Command**: `npm install` (Default)

---

## 🔒 Step 3: Configure Backend CORS for Your Vercel Domain

Because Cognitive OS uses secure **HttpOnly Session Cookies** to manage user authentication, the browser blocks access if the backend CORS settings do not match the frontend domain.

We have upgraded the backend to dynamically allow your Vercel production domains. In your backend server's `.env` configuration, add:

```env
ALLOWED_ORIGINS=https://your-cognitive-os-frontend.vercel.app
```

> [!IMPORTANT]
> - Ensure you do **NOT** have a trailing slash on the origin (e.g. use `https://your-app.vercel.app`, not `https://your-app.vercel.app/`).
> - For multiple domains (like staging and production), you can supply a comma-separated list:
>   `ALLOWED_ORIGINS=https://app.vercel.app,https://custom-domain.com`

---

## ⚡ Deployment Health Checks

Once deployed, you can verify your integration by testing these items:

1. **Sign Up**: Go to your deployed Vercel page, click "Request Access", and register a new user. The system will write the record to your secure **Neon PostgreSQL** database.
2. **Access Terminal**: Enter the registered credentials. On successful login, the FastAPI backend will respond with `HttpOnly` cookie tokens, and the browser will securely store them.
3. **Dashboard Protection**: Verify that you are redirected automatically to `/dashboard`. If you attempt to access `/dashboard` without being logged in, the Next.js middleware will intercept the request and redirect you back to the Access Terminal.
