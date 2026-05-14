#!/bin/bash

# 1. Create directory structure
sudo mkdir -p /var/www/salmanagha.dev/urbanground
sudo chown -R $USER:$USER /var/www/salmanagha.dev

# 2. Create a testing HTML file
cat <<EOF > /var/www/salmanagha.dev/urbanground/index.html
<!DOCTYPE html>
<html>
<head>
    <title>Urbanground Test</title>
    <style>
        body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f8fafc; }
        .card { background: white; padding: 2rem; borderRadius: 1rem; boxShadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; }
        h1 { color: #2563eb; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Urbanground Subdomain Aligned!</h1>
        <p>If you can see this, Nginx is working perfectly.</p>
        <p>Next step: Deploy the full AI Voice Assistant.</p>
    </div>
</body>
</html>
EOF

# 3. Create Nginx config (Standard Static first, then Proxy)
sudo tee /etc/nginx/sites-available/urbanground <<EOF
server {
    listen 80;
    server_name urbanground.salmanagha.dev;

    root /var/www/salmanagha.dev/urbanground;
    index index.html;

    location / {
        try_files \$uri \$uri/ @nextjs;
    }

    location @nextjs {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# 4. Enable site and restart Nginx
sudo ln -sf /etc/nginx/sites-available/urbanground /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

echo "Vortex AI Subdomain aligned with Testing HTML at urbanground.salmanagha.dev"
