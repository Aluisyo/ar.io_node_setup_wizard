# AR.IO Gateway Node Setup Wizard

A simple, user-friendly web interface for setting up AR.IO Gateway Nodes with Docker.

## 🚀 Quick Start

### Option 1: Download and Run
```bash
# Download the project
git clone https://github.com/Aluisyo/ar.io_node_setup_wizard
cd project

# Install dependencies
npm install

# Build the frontend
npm run build

# Start the server
node server/index.js
```

### Option 2: One-Line Docker Run (Coming Soon)
```bash
docker run -p 5001:5001 -v /var/run/docker.sock:/var/run/docker.sock aluisyo/ar.io_node_setup_wizard:latest
```

## 🌐 Access the Wizard

Once running, open your browser to:
- **Local**: `http://localhost:5001`
- **Network**: `http://YOUR_IP:5001` (replace YOUR_IP with your actual IP)

## ✨ Features

- **Zero Configuration**: Works out of the box on any platform
- **Mobile Friendly**: Responsive design that works on phones and tablets  
- **Pre-filled Defaults**: Sensible defaults for all configuration options
- **Real-time Deployment**: Watch your containers deploy with live logs
- **Error Handling**: Clear error messages and recovery options
- **Cross-Platform**: Works on Windows, Mac, Linux, and cloud platforms

## 🛠️ What It Does

1. **Node Configuration**: Set up your AR.IO Gateway Node settings
2. **Services Configuration**: Configure bundler, AO CU, Grafana, and dashboard
3. **Deployment**: Automatically generates Docker Compose files and deploys containers
4. **Monitoring**: Real-time deployment progress and container status

## 📋 Requirements

- **Node.js** 16+ (for running the setup wizard)
- **Docker** and **Docker Compose** (for deploying the AR.IO node)

## 🔒 Security Notes

- Wallet upload requires HTTPS in production environments
- Over HTTP, you can manually enter wallet addresses instead
- All sensitive data is stored locally and never transmitted

## 🐳 What Gets Deployed

The wizard deploys a complete AR.IO Gateway Node stack:
- **AR.IO Core**: The main gateway service
- **Envoy Proxy**: Load balancer and TLS termination  
- **PostgreSQL**: Database for gateway data
- **Redis**: Caching layer
- **Bundler** (optional): For data bundling services
- **AO CU** (optional): Arweave AO Compute Unit
- **Grafana** (optional): Monitoring and metrics
- **Dashboard** (optional): Web-based management interface

## 🆘 Troubleshooting

### App Won't Load
- Check if port 5001 is available
- Try accessing via `http://localhost:5001` instead of IP
- Check browser console for errors

### Deployment Fails
- Ensure Docker is running and accessible
- Check Docker Compose is installed
- Verify sufficient disk space and memory
- Review deployment logs in the wizard

### "Failed to Fetch" Error
- Server may not be running - restart with `node server/index.js`
- Check firewall settings for port 5001
- Ensure you're accessing the correct IP address

---


