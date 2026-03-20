FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/data

ENV FLASK_ENV=production
ENV FLASK_APP=app.py
ENV DATABASE_URL=sqlite:////app/data/dating_app.db

EXPOSE 5000

CMD ["python", "app.py"]