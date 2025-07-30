#!/bin/bash

# Azure App Service startup script
echo "Starting Demo11 Application..."

# Install dependencies
pip install -r requirements.txt

# Start the application with Gunicorn
exec gunicorn --bind 0.0.0.0:$PORT --workers 4 --timeout 60 app:app