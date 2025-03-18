# SecureView

A secure content sharing platform with access code protection.

## Project Structure

```
secureview/
├── frontend/          # Next.js frontend (deploy to Netlify)
└── backend/          # Express backend (deploy to Render)
```

## Deployment Instructions

### Frontend (Netlify)

1. Push your code to GitHub
2. Connect your GitHub repository to Netlify
3. Set the following environment variables in Netlify:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   NEXT_PUBLIC_API_URL=your_render_api_url
   ```
4. Set build command: `cd frontend && npm install && npm run build`
5. Set publish directory: `frontend/.next`

### Backend (Render)

1. Push your code to GitHub
2. Create a new Web Service on Render
3. Connect your GitHub repository
4. Set the following environment variables in Render:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   PORT=3001
   ```
5. Set build command: `cd backend && npm install && npm run build`
6. Set start command: `cd backend && npm start`

## Local Development

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
npm run dev
```

## Security Features

- Access code protection
- Rate limiting
- Secure file uploads
- Row Level Security in Supabase
- Environment variable protection
