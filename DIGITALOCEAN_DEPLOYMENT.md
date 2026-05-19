# 🌊 Deploying Cognitive OS Backend to DigitalOcean

Since you have the **GitHub Student Developer Pack**, you get a massive amount of free credits for **DigitalOcean**. This makes it the absolute perfect place to host your Python FastAPI backend!

DigitalOcean has a service called **App Platform**. It works exactly like Vercel, but for backend applications. It will automatically read your `Dockerfile`, build your Python image, and deploy it to a live server with SSL built-in.

---

## 🚀 Step-by-Step Deployment Guide

### 1. Connect GitHub to DigitalOcean
1. Go to [DigitalOcean](https://www.digitalocean.com/) and log in using your GitHub Student account (make sure your credits are active in the billing section).
2. Click **"Create"** in the top right corner and select **"Apps"** (App Platform).
3. Under **Choose Source**, select **GitHub**.
4. Give DigitalOcean access to your `Cognitive_OS_1` repository and select it from the dropdown.

### 2. Configure the Backend Service
Since the repository contains both frontend and backend, we need to tell DigitalOcean to only deploy the `backend/` folder.

1. **Source Directory**: Change the source directory from `/` to `/backend`.
2. **Auto Deploy**: Keep this checked so the backend redeploys when you push to GitHub.
3. Click **Next**.

### 3. Edit App Configuration
DigitalOcean will automatically detect the `Dockerfile` inside the `backend/` folder.

1. Click **Edit** next to your webservice.
2. Under **HTTP Request Routing**, make sure the route is set to `/`.
3. Under **HTTP Port**, make sure it is set to **`8000`** (this is what we exposed in our Dockerfile).

### 4. Setup Environment Variables
Scroll down to the **Environment Variables** section and click **Edit**.
Add the exact variables you have in your local backend `.env`:

| KEY | VALUE |
| :--- | :--- |
| `DATABASE_URL` | *(Paste your Neon PostgreSQL URL here)* |
| `SECRET_KEY` | *(Create a strong random password/string here)* |
| `ALLOWED_ORIGINS`| *(Paste your Vercel URL here when you have it. e.g., `https://my-app.vercel.app`)* |
| `OLLAMA_BASE_URL`| *(Leave empty or configure later if hosting Ollama remotely)* |

### 5. Launch It!
1. Click **Next** to go to the Review screen.
2. **Plan**: Select the **Basic** plan. (Because you have student credits, this will essentially be completely free for many months).
3. Click **Create Resources**.

---

## 🔗 Linking Everything Together

1. DigitalOcean will take a few minutes to build your Docker image and deploy it.
2. Once complete, it will give you a **Live URL** (e.g., `https://cognitive-backend-xyz.ondigitalocean.app`).
3. Take that URL and put it into your **Vercel** Environment Variables as `NEXT_PUBLIC_API_ENDPOINT`.

**You are now fully live!** Your Next.js frontend is served at blazing speeds on Vercel, and your Python multi-agent backend is running securely on a DigitalOcean container!
