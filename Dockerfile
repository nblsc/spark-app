FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get upgrade -y && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --upgrade pip==25.3 wheel==0.46.2

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY frontend/ ./frontend/

RUN mkdir -p /app/data

ENV FLASK_ENV=production
ENV FLASK_APP=app.py
ENV DATABASE_URL=sqlite:////app/data/dating_app.db

EXPOSE 5000

WORKDIR /app/backend

CMD ["python", "app.py"]