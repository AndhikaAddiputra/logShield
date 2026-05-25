FROM python:3.11-slim

WORKDIR /app

COPY apps/ai-engine/requirements.txt apps/ai-engine/requirements.txt
COPY apps/ai-engine/requirements-ttm.txt apps/ai-engine/requirements-ttm.txt
RUN apt-get update \
    && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir -r apps/ai-engine/requirements.txt \
    && pip install --no-cache-dir -r apps/ai-engine/requirements-ttm.txt

COPY apps/ai-engine apps/ai-engine
COPY data data

EXPOSE 8000

CMD ["uvicorn", "logshield_ai.api:app", "--app-dir", "apps/ai-engine", "--host", "0.0.0.0", "--port", "8000"]
