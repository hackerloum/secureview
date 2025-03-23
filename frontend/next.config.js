[build]
  command = "npm run build"
  publish = ".next"

[[redirects]]
  from = "/_next/static/*"
  to = "/_next/static/:splat"
  status = 200
  force = true
  headers = {
    X-Custom-Header = "static",
    Content-Type = "application/javascript"
  }

[[redirects]]
  from = "/_next/static/css/*"
  to = "/_next/static/css/:splat"
  status = 200
  force = true
  headers = {
    Content-Type = "text/css"
  }

[[redirects]]
  from = "/_next/static/media/*"
  to = "/_next/static/media/:splat"
  status = 200
  force = true
  headers = {
    Content-Type = "font/woff2"
  }

[[redirects]]
  from = "/_next/*"
  to = "/_next/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/*"
  to = "/.netlify/functions/server"
  status = 200
  force = true

[build.environment]
  NEXT_PUBLIC_SUPABASE_URL = "https://jefvnmetxmksadywqfyy.supabase.co"
  NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplZnZubWV0eG1rc2FkeXdxZnl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyMzk1NTUsImV4cCI6MjA1NzgxNTU1NX0.aLQxFfiNffWbn7thDH12mOTy22wpl-nFb0JKwmW7puM"

[[headers]]
  for = "/_next/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
    Content-Type = "application/javascript"

[[headers]]
  for = "/_next/static/css/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
    Content-Type = "text/css"

[[headers]]
  for = "/_next/static/media/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
    Content-Type = "font/woff2"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self' https: wss:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob:; font-src 'self' data: https:; connect-src 'self' https: wss:; frame-ancestors 'none';"

[[plugins]]
  package = "@netlify/plugin-nextjs" 
