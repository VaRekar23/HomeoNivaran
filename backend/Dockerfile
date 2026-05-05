FROM python:3.13.7-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Run database migrations then start server
CMD alembic upgrade head && \
    uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8080 \
    --proxy-headers \
    --workers 2