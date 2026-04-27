#!/bin/bash
# Auto-deploy script for Finance Manager

set -e

FRONTEND_DIR="/tmp/finance-manager-2/frontend"
PUBLIC_DIR="/var/www/html/public"

echo "📦 Building frontend..."
cd "$FRONTEND_DIR"
npm run build

echo "🔄 Deploying to production..."
mkdir -p "$PUBLIC_DIR"
rm -rf "$PUBLIC_DIR/*"
cp -r "$FRONTEND_DIR/dist"/* "$PUBLIC_DIR/"

echo "🔒 Setting permissions..."
chown -R www-data:www-data "$PUBLIC_DIR"
chmod -R 755 "$PUBLIC_DIR"

echo "✅ Deployment complete!"

# Optional: Notify if needed
# echo "🌐 Site should be live at https://finance-manager.clodhost.com"