export interface DiffLine {
  type: 'context' | 'add' | 'del' | 'meta' | 'hunk'
  text: string
}

export interface ChangelogEntry {
  id: string
  date: string
  /** UTC wall-clock time `HH:MM` for the change. */
  time: string
  author: string
  kind: 'deploy' | 'config' | 'docs' | 'chore'
  title: string
  sha: string
  repo: string
  diff?: DiffLine[]
}

export type ChangelogVariant = 'swe' | 'senior'

const CONFIG_TIME_BY_VARIANT: Record<ChangelogVariant, string> = {
  swe: '15:50',
  senior: '10:00',
}

export const CONFIG_DIFF: DiffLine[] = [
  { type: 'meta', text: 'diff --git a/config/production.yaml b/config/production.yaml' },
  { type: 'meta', text: '--- a/config/production.yaml' },
  { type: 'meta', text: '+++ b/config/production.yaml' },
  { type: 'hunk', text: '@@ -3,7 +3,7 @@ service:' },
  { type: 'context', text: ' service:' },
  { type: 'context', text: '   name: sharing-service' },
  { type: 'del', text: '-  log_level: INFO' },
  { type: 'add', text: '+  log_level: DEBUG  # TODO: revert' },
  { type: 'context', text: '   request_timeout_ms: 30000' },
  { type: 'hunk', text: '@@ -14,8 +14,8 @@ database:' },
  { type: 'context', text: ' database:' },
  { type: 'context', text: '   host: sharing-db.internal' },
  { type: 'del', text: '-  pool_size: 60' },
  { type: 'del', text: '-  max_overflow: 20' },
  { type: 'add', text: '+  pool_size: 5  # tmp fix; TODO: review' },
  { type: 'add', text: '+  max_overflow: 2' },
  { type: 'context', text: '   statement_timeout_ms: 30000' },
  { type: 'hunk', text: '@@ -27,6 +27,7 @@ cache:' },
  { type: 'context', text: ' cache:' },
  { type: 'context', text: '   backend: cache-manager' },
  { type: 'del', text: '-  ttl_seconds: 300' },
  { type: 'add', text: '+  ttl_seconds: 600' },
  { type: 'add', text: '+  compression: true' },
  { type: 'context', text: '   max_keys: 100000' },
  { type: 'hunk', text: '@@ -41,3 +42,4 @@ features:' },
  { type: 'context', text: ' features:' },
  { type: 'context', text: '   shared_links_v2: true' },
  { type: 'add', text: '+  folder_tree_prefetch: false' },
  { type: 'context', text: '   collaborations_batch: true' },
]

export const README_DIFF: DiffLine[] = [
  { type: 'meta', text: 'diff --git a/README.md b/README.md' },
  { type: 'meta', text: '--- a/README.md' },
  { type: 'meta', text: '+++ b/README.md' },
  { type: 'hunk', text: '@@ -12,3 +12,7 @@ ## Getting started' },
  { type: 'context', text: ' ## Getting started' },
  { type: 'context', text: '' },
  { type: 'add', text: '+### Local development' },
  { type: 'add', text: '+' },
  { type: 'add', text: '+Run `make dev` to start the service against a local Postgres.' },
  { type: 'add', text: '+See `docs/local.md` for details.' },
]

export const URLLIB3_DIFF: DiffLine[] = [
  { type: 'meta', text: 'diff --git a/requirements.txt b/requirements.txt' },
  { type: 'meta', text: '--- a/requirements.txt' },
  { type: 'meta', text: '+++ b/requirements.txt' },
  { type: 'hunk', text: '@@ -8,1 +8,1 @@' },
  { type: 'del', text: '-urllib3==2.2.1' },
  { type: 'add', text: '+urllib3==2.2.2' },
]

export const BFF_CLIENT_DIFF: DiffLine[] = [
  { type: 'meta', text: 'diff --git a/package.json b/package.json' },
  { type: 'meta', text: '--- a/package.json' },
  { type: 'meta', text: '+++ b/package.json' },
  { type: 'hunk', text: '@@ -18,7 +18,7 @@ "dependencies": {' },
  { type: 'context', text: '     "@box/logger": "1.9.0",' },
  { type: 'del', text: '-    "@box/sharing-service-client": "3.4.0",' },
  { type: 'add', text: '+    "@box/sharing-service-client": "3.4.1",' },
  { type: 'context', text: '     "express": "4.19.2",' },
]

export const GATEWAY_ROUTE_DIFF: DiffLine[] = [
  { type: 'meta', text: 'diff --git a/routes/sharing.yaml b/routes/sharing.yaml' },
  { type: 'meta', text: '--- a/routes/sharing.yaml' },
  { type: 'meta', text: '+++ b/routes/sharing.yaml' },
  { type: 'hunk', text: '@@ -5,6 +5,7 @@ routes:' },
  { type: 'context', text: '   - path: /2.0/shared_items' },
  { type: 'context', text: '     upstream: sharing-service' },
  { type: 'add', text: '+    # owner: sharing-team (annotation for on-call routing)' },
  { type: 'context', text: '     timeout_ms: 30000' },
]

const CHANGELOG_BASE: ChangelogEntry[] = [
  {
    id: 'c1',
    date: '2026-07-15',
    time: '15:50',
    author: 'deploy-bot',
    kind: 'config',
    title: 'Tune runtime settings for sharing-service',
    sha: '4f2a1c9',
    repo: 'sharing-service',
    diff: CONFIG_DIFF,
  },
  {
    id: 'r1',
    date: '2026-07-15',
    time: '14:05',
    author: 'deploy-bot',
    kind: 'deploy',
    title: 'Bump @box/sharing-service-client 3.4.0 → 3.4.1',
    sha: 'd51b7ea',
    repo: 'web-app-bff',
    diff: BFF_CLIENT_DIFF,
  },
  {
    id: 'r2',
    date: '2026-07-15',
    time: '11:20',
    author: 'j.kowalski',
    kind: 'deploy',
    title: 'Add owner annotation to sharing-service route',
    sha: '9ac3f10',
    repo: 'api-gateway',
    diff: GATEWAY_ROUTE_DIFF,
  },
  {
    id: 'c2',
    date: '2026-07-14',
    time: '16:40',
    author: 'm.nowak',
    kind: 'docs',
    title: 'Update README.md with local dev setup instructions',
    sha: 'a90f3c2',
    repo: 'sharing-service',
    diff: README_DIFF,
  },
  {
    id: 'c3',
    date: '2026-07-14',
    time: '09:12',
    author: 'dependabot',
    kind: 'chore',
    title: 'Bump urllib3 from 2.2.1 to 2.2.2',
    sha: 'e2c5d41',
    repo: 'sharing-service',
    diff: URLLIB3_DIFF,
  },
]

/** Changelog for a candidate level. Only the config change time differs. */
export function getChangelog(variant: ChangelogVariant): ChangelogEntry[] {
  const configTime = CONFIG_TIME_BY_VARIANT[variant]
  return CHANGELOG_BASE.map((entry) =>
    entry.id === 'c1' ? { ...entry, time: configTime } : entry,
  )
}

export const DOCKERFILE = `# syntax=docker/dockerfile:1
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \\
    PYTHONDONTWRITEBYTECODE=1 \\
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \\
    && apt-get install -y --no-install-recommends build-essential curl \\
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

RUN adduser --disabled-password --gecos "" appuser
USER appuser

EXPOSE 8080

CMD ["gunicorn", "sharing_service.wsgi:app", \\
     "--bind", "0.0.0.0:8080", \\
     "--workers", "4", \\
     "--worker-class", "gthread", \\
     "--threads", "8", \\
     "--timeout", "60"]
`

export const K8S_MANIFEST = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: sharing-service
  namespace: sharing-service-prod
spec:
  replicas: 45
  selector:
    matchLabels:
      app: sharing-service
  template:
    metadata:
      labels:
        app: sharing-service
    spec:
      containers:
        - name: sharing-service
          image: registry.internal/sharing-service:2026.07.15
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "1"
              memory: "1Gi"
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 15
            failureThreshold: 6
`
