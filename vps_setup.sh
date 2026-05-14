#!/bin/bash

# 1. Create directory structure
sudo mkdir -p /var/www/salmanagha.dev/urbanground
sudo chown -R $USER:$USER /var/www/salmanagha.dev

# 2. Create Nginx config
sudo tee /etc/nginx/sites-available/urbanground <<EOF
server {
    listen 80;
    server_name urbanground.salmanagha.dev;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# 3. Enable site and restart Nginx
sudo ln -sf /etc/nginx/sites-available/urbanground /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

# 4. Optional: SSL (Microphone requires HTTPS)
# sudo certbot --nginx -d urbanground.salmanagha.dev --non-interactive --agree-tos -m your-email@example.com

echo "Vortex AI Subdomain aligned at urbanground.salmanagha.dev"
