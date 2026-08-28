#!/usr/bin/env bash
# Inquisitors Society Platform — Start Script (macOS/Linux)
set -e

echo "============================================"
echo " Inquisitors Society Platform"
echo "============================================"
echo

# Check for .env
if [ ! -f ".env" ]; then
    echo "[!] .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "[!] Please edit .env with your actual values before continuing."
    exit 1
fi

# Start backend
echo "[1/2] Starting backend server..."
cd backend && npm install && npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend
echo "Waiting for backend (5s)..."
sleep 5

# Start frontend
echo "[2/2] Starting Next.js frontend..."
cd frontend && npm install && npm run dev &
FRONTEND_PID=$!
cd ..

echo
echo "Both servers are running:"
echo "  Backend:  http://localhost:5000"
echo "  Frontend: http://localhost:3000"
echo
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
