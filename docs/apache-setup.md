# Apache Setup Guide

This guide covers setting up Apache for the Finance Manager application with SSL.

## Prerequisites

- Apache web server with `mod_ssl` and `mod_rewrite` modules
- SSL certificate and key (self-signed, Let's Encrypt, or commercial)

## Installation

### 1. Copy Apache Configuration

```bash
sudo cp apache/finance-manager.clodhost.com-ssl.conf /etc/apache2/sites-available/
sudo a2ensite finance-manager.clodhost.com-ssl.conf
sudo a2dissite 000-default.conf
sudo a2enmod rewrite ssl
sudo apachectl configtest
sudo systemctl restart apache2
```

### 2. Configure SSL Certificate

Replace the certificate paths with your actual certificate:

```apache
SSLCertificateFile /path/to/your/certificate.crt
SSLCertificateKeyFile /path/to/your/private.key
```

### 3. Set Up Project Directory

```bash
# Clone the repository
git clone https://github.com/Komediruzecki/finance-manager.git
cd finance-manager

# Build the frontend
npm install
npm run build

# Copy static assets
cp -r frontend/dist/* frontend/public/
cp -r frontend/public /var/www/finance-manager.clodhost.com/
```

### 4. Set Permissions

```bash
sudo chown -R www-data:www-data /var/www/finance-manager.clodhost.com
sudo chmod -R 755 /var/www/finance-manager.clodhost.com
```

## Configuration

The Apache configuration handles:

- **Static file serving**: CSS, JS, PNG, SVG, etc.
- **SPA routing**: All non-API requests redirect to `index.html`
- **API proxy**: `/api/*` requests forwarded to Node.js backend
- **Receipt downloads**: `/api/receipts/*` properly handled

## Configuration Paths

| Path | Description |
|------|-------------|
| `/` | Main application (index.html) |
| `/frontend/` | Frontend static files |
| `/api/` | Backend API (port 3847) |
| `/css/` | CSS files |
| `/dist/assets/` | Built JavaScript and styles |

## Troubleshooting

### CSS Not Loading

If you see "text/html instead of text/css" errors:

```bash
# Check Apache error log
sudo tail -f /var/log/apache2/finance-manager.clodhost.com-error.log

# Ensure rewrite module is enabled
sudo a2enmod rewrite
sudo systemctl restart apache2
```

### Port Already in Use

If port 3847 is already used by another process:

```bash
# Check what's using the port
sudo lsof -i :3847

# Kill the process or change the PORT environment variable
export PORT=8080
```

### SSL Certificate Issues

For Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-apache
sudo certbot --apache -d finance-manager.clodhost.com
```

For self-signed certificates (development):

```bash
sudo mkdir -p /etc/ssl/certs/finance-manager.clodhost.com
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/finance-manager.clodhost.com.key \
  -out /etc/ssl/certs/finance-manager.clodhost.com.crt \
  -subj "/CN=finance-manager.clodhost.com"
```