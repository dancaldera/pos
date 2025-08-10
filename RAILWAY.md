# Railway Deployment Configuration

This document describes how to deploy this monorepo to Railway.

## Service Configuration

### Backend Service
- **Root Directory**: `apps/backend`
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Watch Paths**: `apps/backend/**`
- **Environment Variables**:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `AWS_ACCESS_KEY_ID` (for S3 storage)
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION`
  - `AWS_BUCKET_NAME`

### Frontend Service  
- **Root Directory**: `apps/frontend`
- **Build Command**: `npm run build`
- **Start Command**: `npm run preview`
- **Watch Paths**: `apps/frontend/**`
- **Environment Variables**:
  - `VITE_API_URL` (URL of your backend service)

## Deployment Steps

1. **Create Railway Project**: Create a new project on Railway
2. **Add Services**: Add two services - one for backend and one for frontend
3. **Configure Backend**:
   - Set root directory to `apps/backend`
   - Set build command to `npm run build`
   - Set start command to `npm run start` 
   - Configure environment variables
   - Set watch paths to `apps/backend/**`
4. **Configure Frontend**:
   - Set root directory to `apps/frontend`
   - Set build command to `npm run build`
   - Set start command to `npm run preview`
   - Set `VITE_API_URL` to your backend service URL
   - Set watch paths to `apps/frontend/**`
5. **Database**: Add PostgreSQL plugin to your backend service
6. **Deploy**: Push to your connected Git repository

## Watch Paths Configuration

Configure watch paths in Railway dashboard to prevent unnecessary rebuilds:
- Backend service should only rebuild on changes in `apps/backend/**`
- Frontend service should only rebuild on changes in `apps/frontend/**`

## Notes

- The monorepo uses pnpm workspaces but Railway will run npm commands in the individual service directories
- Make sure to configure the DATABASE_URL environment variable for the backend
- The frontend needs the backend URL configured via VITE_API_URL
- Both services will run independently and scale separately