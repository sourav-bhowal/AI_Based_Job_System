FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1 \
	PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
	gcc \
	libpq-dev \
	libnss3 \
	libnspr4 \
	libatk1.0-0 \
	libatk-bridge2.0-0 \
	libcups2 \
	libdrm2 \
	libxkbcommon0 \
	libxcomposite1 \
	libxdamage1 \
	libxfixes3 \
	libxrandr2 \
	libgbm1 \
	libasound2 \
	libpango-1.0-0 \
	libcairo2 \
	fonts-liberation \
	libx11-xcb1 \
	wget \
	&& rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt

RUN python -m pip install --upgrade pip && \
	python -m pip install --no-cache-dir -r requirements.txt && \
	python -m playwright install --with-deps chromium

COPY backend/ .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
