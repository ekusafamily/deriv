# VPS Deployment Notes

## Port Configuration (Updated to avoid conflicts)

| Service | Port | Purpose |
|---------|------|---------|
| **Backend API (Express + Socket.IO)** | **3010** | Main API server, WebSocket connections |
| **Frontend Dev (Vite + React)** | **5178** | Vite dev server with HMR - **RUN IN PRODUCTION FOR DEBUGGING** |

## Production Deployment (with Vite Dev Server for debugging)

**Both ports 3010 and 5178 need to be exposed/reverse proxied.**

In this setup, you run BOTH servers in production:
- Backend: `npm run dev:server` → runs on port 3010 (API + WebSocket)
- Frontend: `npm run dev:client` → runs on port 5178 (Vite dev server with HMR)

---

## ⚠️ NOTE FOR VPS AGENT: Reverse Proxy Configuration

**Reverse proxy BOTH ports:**

### Nginx Configuration (Production with Vite Dev Server)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend - Vite Dev Server (port 5178) with HMR support
    location / {
        proxy_pass http://localhost:5178;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;

        # Required for Vite HMR WebSocket
        proxy_set_header Sec-WebSocket-Extensions $http_sec_websocket_extensions;
        proxy_set_header Sec-WebSocket-Key $http_sec_websocket_key;
        proxy_set_header Sec-WebSocket-Version $http_sec_websocket_version;
    }

    # Backend API - Express (port 3010)
    location /api {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Socket.IO WebSocket - Express (port 3010)
    location /socket.io {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```

### What TO do:
- ✅ Run `npm run dev:server` on port 3010 (backend API + WebSocket)
- ✅ Run `npm run dev:client` on port 5178 (Vite dev server with HMR)
- ✅ Reverse proxy port 5178 for frontend (with WebSocket upgrade for HMR)
- ✅ Reverse proxy port 3010 for `/api` and `/socket.io`

---

## Systemd Services (Run Both in Production)

```ini
# /etc/systemd/system/dbot-api.service
[Unit]
Description=DBOT API Server (port 3010)
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/deriv3rd-partyapp
Environment="PORT=3010"
Environment="DATABASE_URL=file:./prod.db"
Environment="DERIV_APP_ID=1089"
ExecStart=/usr/bin/npm run dev:server
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```ini
# /etc/systemd/system/dbot-frontend.service
[Unit]
Description=DBOT Frontend Dev Server (port 5178)
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/deriv3rd-partyapp
Environment="PORT=5178"
ExecStart=/usr/bin/npm run dev:client
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Quick Deploy Commands

```bash
# On VPS
cd /home/ubuntu/deriv3rd-partyapp
npm ci

# Start both services
sudo systemctl enable --now dbot-api
sudo systemctl enable --now dbot-frontend

# Configure Nginx
sudo nginx -t && sudo systemctl reload nginx

# Check logs
sudo journalctl -u dbot-api -f
sudo journalctl -u dbot-frontend -f
```

## Firewall

```bash
# Open both ports if not using Nginx proxy
sudo ufw allow 3010
sudo ufw allow 5178
```