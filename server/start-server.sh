#!/bin/bash

# Tourist App Server Launcher for Linux/Mac

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}    🚀 TOURIST APP SERVER LAUNCHER${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed!${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js version: ${NODE_VERSION}${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found! Creating from template...${NC}"
    
    cat > .env << EOF
PORT=5002
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/tourist_app
JWT_SECRET=TouristApp2026_SuperSecretKey_!@#$%^7890
JWT_EXPIRES_IN=7d
EMAIL_USER=tourism.dashboard4@gmail.com
EMAIL_PASSWORD=your-app-password
FRONTEND_URL=http://localhost:5173
EOF
    
    echo -e "${GREEN}✅ .env file created successfully!${NC}"
    echo -e "${YELLOW}⚠️  Please update EMAIL_PASSWORD in .env file${NC}"
    echo ""
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install dependencies!${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Dependencies installed successfully!${NC}"
    echo ""
else
    echo -e "${GREEN}✅ Dependencies are already installed${NC}"
    echo ""
fi

# Clear screen
clear

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}    🚀 STARTING TOURIST APP SERVER${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}📁 Working Directory:${NC} $(pwd)"
echo -e "${GREEN}🔧 Port:${NC} 5002"
echo -e "${GREEN}📊 Environment:${NC} development"
echo -e "${GREEN}🔌 WebSocket:${NC} Enabled"
echo -e "${GREEN}📧 Email:${NC} tourism.dashboard4@gmail.com"
echo ""
echo -e "${BLUE}========================================${NC}"
echo ""

# Start the server
npm run dev