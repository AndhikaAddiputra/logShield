FROM python:3.11-slim

WORKDIR /app

COPY apps/ai-engine/requirements.txt apps/ai-engine/requirements.txt
RUN pip install --no-cache-dir -r apps/ai-engine/requirements.txt

COPY apps/ai-engine apps/ai-engine
COPY data data

EXPOSE 8000

CMD ["uvicorn", "logshield_ai.api:app", "--app-dir", "apps/ai-engine", "--host", "0.0.0.0", "--port", "8000"]
