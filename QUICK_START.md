# Pet Adoption Platform - Quick Start Guide

## Server Status

### Backend Server 
- **Status**: Running
- **URL**: http://localhost:5000
- **API Docs**: http://localhost:5000/api-docs
- **Health Check**: http://localhost:5000/api/health

### Frontend Application 
- **Status**: Starting (may take 30-60 seconds)
- **URL**: http://localhost:3000
- **Note**: Browser will auto-open when ready

## Available Scripts

### 1. start.bat (UPDATED - No Chinese characters)
- Checks Node.js installation
- Installs dependencies if needed
- Starts both backend and frontend
- No encoding issues

### 2. start-frontend.bat (UPDATED)
- Starts only frontend application
- Auto-installs dependencies
- Clean English output

### 3. fix-frontend.bat (UPDATED)
- Fixes Tailwind CSS issues
- Clears cache and reinstalls
- Tests compilation

## Changes Made

 Removed all Chinese characters
 Added UTF-8 encoding (chcp 65001)
 Fixed error handling
 Cleaner output format
 Added proper window titles
 Improved error messages

## Usage

Double-click any .bat file to run, or use from command line:
- `start.bat` - Start everything
- `start-frontend.bat` - Frontend only
- `fix-frontend.bat` - Fix frontend issues

## Current Status

- Backend:  Running on port 5000
- Frontend:  Starting on port 3000
- MongoDB:   Not connected (demo mode)
- Swagger:  Available at /api-docs

Wait 30-60 seconds for frontend to fully start...
