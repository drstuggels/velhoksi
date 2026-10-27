FROM node:22.21.0-bookworm-slim AS node
FROM python:3.12.12-slim-bookworm
COPY --from=node /usr/local/bin/node /usr/local/bin/node
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY server.py worker.py network.py ./
RUN useradd --create-home importer
USER importer
ENV IMPORT_BIND=0.0.0.0 PORT=8091 PYTHONUNBUFFERED=1
EXPOSE 8091
CMD ["python", "server.py"]
