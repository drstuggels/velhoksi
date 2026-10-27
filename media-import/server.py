"""Bounded temporary import service. Run behind the same-origin Worker gateway.

No public file paths, shell commands, upstream credentials or extractor options
are accepted. Each operation runs in its own killable process group.
"""
from collections import deque
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import signal
import subprocess
import sys
import threading
import time
from urllib.parse import urlsplit

from network import validate_url

ROOT = Path(os.environ.get('IMPORT_DATA', '/tmp/velhoksi-imports')).resolve()
WORKER = Path(__file__).with_name('worker.py').resolve()
TTL = 30 * 60
DEADLINE = 10 * 60
MAX_DISK = 768 * 1024 * 1024
ID = re.compile(r'^[a-f0-9]{32}$')
TOKEN = re.compile(r'^[a-f0-9]{64}$')


class ApiError(Exception):
    def __init__(self, status, message):
        self.status, self.message = status, message


class Jobs:
    def __init__(self, root=ROOT):
        self.root = root
        root.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        self.jobs = {}
        self.processes = {}
        self.requests = {}
        # A host restart cannot silently resume an extraction. Ready files remain usable
        # when running with a persistent volume; Cloudflare disk can be replaced entirely.
        for path in root.glob('*/state.json'):
            try:
                job = json.loads(path.read_text())
                if time.time() - job['created'] < TTL:
                    if job['state'] in ('resolving', 'matching', 'downloading', 'preparing'):
                        job.update(state='failed', message='Import interrupted by a server restart. Please retry.')
                    self.jobs[job['id']] = job
                else:
                    shutil.rmtree(path.parent)
            except (ValueError, KeyError, OSError):
                shutil.rmtree(path.parent, ignore_errors=True)

    def write(self, job):
        directory = self.root / job['id']
        directory.mkdir(exist_ok=True)
        temp = directory / 'state.tmp'
        temp.write_text(json.dumps(job))
        temp.replace(directory / 'state.json')

    def public(self, job):
        return {k: v for k, v in job.items() if k not in ('token', 'owner', 'file', 'created', 'started')}

    def authorize(self, job_id, token, owner):
        job = self.jobs.get(job_id)
        if not job or not secrets.compare_digest(job['token'], hashlib.sha256(token.encode()).hexdigest()):
            raise ApiError(404, 'Import expired or was interrupted. Paste the link again.')
        if time.time() - job['created'] >= TTL:
            raise ApiError(410, 'This import expired. Paste the link again.')
        return job

    def create(self, data, token, owner):
        job_id = data.get('id', '')
        if not ID.fullmatch(job_id) or not TOKEN.fullmatch(token):
            raise ApiError(400, 'Invalid import identifier.')
        url = validate_url(data.get('url'))
        with self.lock:
            if job_id in self.jobs:
                return self.public(self.authorize(job_id, token, owner))
            now = time.time()
            history = self.requests.setdefault(owner, deque())
            while history and history[0] < now - 3600:
                history.popleft()
            if len(history) >= 12:
                raise ApiError(429, 'Import limit reached. Try again later.')
            if len(self.jobs) >= 6 or sum(p.poll() is None for p in self.processes.values()) >= 2:
                raise ApiError(429, 'The importer is busy. Please try again shortly.')
            if any(j['owner'] == owner and j['state'] in ('resolving', 'matching', 'downloading', 'preparing') for j in self.jobs.values()):
                raise ApiError(429, 'Wait for your current import or cancel it first.')
            history.append(now)
            job = dict(id=job_id, url=url, owner=owner, token=hashlib.sha256(token.encode()).hexdigest(),
                       created=now, state='resolving', message='reading media link', progress=None)
            self.jobs[job_id] = job
            try:
                self.start(job, 'resolve')
            except Exception:
                self.discard(job_id)
                raise
            return self.public(job)

    def start(self, job, action):
        if sum(p.poll() is None for p in self.processes.values()) >= 2:
            raise ApiError(429, 'The importer is busy. Please try again shortly.')
        job.update(state='resolving' if action == 'resolve' else 'downloading',
                   message='reading media link' if action == 'resolve' else 'downloading media', progress=None, started=time.time())
        self.write(job)
        # Credentials stay in the parent. Extraction receives only runtime necessities.
        env = {key: value for key, value in os.environ.items() if key in (
            'PATH', 'LANG', 'LC_ALL', 'SSL_CERT_FILE', 'REQUESTS_CA_BUNDLE', 'NODE_EXTRA_CA_CERTS')}
        env['HOME'] = str(self.root / job['id'])
        process = subprocess.Popen([sys.executable, str(WORKER)], cwd=self.root / job['id'], env=env,
                                   stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                   text=True, start_new_session=True)
        self.processes[job['id']] = process
        process.stdin.write(json.dumps({**self.public(job), 'action': action}))
        process.stdin.close()
        threading.Thread(target=self.collect, args=(job['id'], process), daemon=True).start()

    def collect(self, job_id, process):
        try:
            for line in process.stdout:
                if len(line) > 65536:
                    continue
                event = json.loads(line)
                with self.lock:
                    job = self.jobs.get(job_id)
                    if not job or self.processes.get(job_id) is not process or job['state'] == 'cancelled':
                        break
                    job.update(event)
                    self.write(job)
            process.wait(timeout=5)
        except (ValueError, OSError, subprocess.TimeoutExpired):
            self.kill(process)
        finally:
            process.stdout.close()
            with self.lock:
                if self.processes.get(job_id) is process:
                    self.processes.pop(job_id, None)
                    job = self.jobs.get(job_id)
                    if job and job['state'] not in ('choosing', 'ready', 'failed', 'cancelled'):
                        job.update(state='failed', message='Import interrupted. Please retry.', progress=None)
                        self.write(job)
                    if job and job['state'] == 'failed':
                        for path in (self.root / job_id).glob('*'):
                            if path.is_file() and path.name != 'state.json':
                                path.unlink(missing_ok=True)

    @staticmethod
    def kill(process):
        # Kill the group even if its leader exited: FFmpeg may still be alive.
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass

    def choose(self, job_id, token, owner, data):
        with self.lock:
            job = self.authorize(job_id, token, owner)
            if job['state'] in ('downloading', 'preparing', 'ready') and job.get('selected', {}).get('id') == data.get('candidateId') and job.get('mode') == data.get('mode'):
                return self.public(job)
            if job['state'] != 'choosing':
                raise ApiError(409, 'This import is no longer waiting for a recording.')
            selected = next((c for c in job['candidates'] if c['id'] == data.get('candidateId')), None)
            if not selected or data.get('mode') not in ('audio', 'video'):
                raise ApiError(400, 'Choose a recording and an import format.')
            if job['source'] == 'spotify' and data['mode'] != 'audio':
                raise ApiError(400, 'Spotify matches are imported as audio.')
            if any(j['id'] != job_id and j['owner'] == owner and j['state'] in ('resolving', 'matching', 'downloading', 'preparing') for j in self.jobs.values()):
                raise ApiError(429, 'Wait for your current import or cancel it first.')
            job.update(selected=selected, mode=data['mode'])
            self.start(job, 'download')
            return self.public(job)

    def remove(self, job_id, token, owner):
        with self.lock:
            self.authorize(job_id, token, owner)
            self.discard(job_id)

    def discard(self, job_id):
        process = self.processes.pop(job_id, None)
        if process:
            self.kill(process)
        self.jobs.pop(job_id, None)
        shutil.rmtree(self.root / job_id, ignore_errors=True)

    def cleanup(self):
        with self.lock:
            now = time.time()
            for job_id, job in list(self.jobs.items()):
                if now - job['created'] >= TTL:
                    self.discard(job_id)
                elif job_id in self.processes:
                    disk = sum(p.stat().st_size for p in (self.root / job_id).glob('*') if p.is_file())
                    if now - job.get('started', job['created']) > DEADLINE or disk > MAX_DISK:
                        self.kill(self.processes.pop(job_id))
                        job.update(state='failed', message='Import exceeded the time or size limit. Try a smaller recording.', progress=None)
                        for p in (self.root / job_id).glob('*'):
                            if p.is_file() and p.name != 'state.json':
                                p.unlink(missing_ok=True)
                        self.write(job)
            for owner, history in list(self.requests.items()):
                if not history or history[-1] < now - 3600:
                    del self.requests[owner]


def handler(jobs):
    class Handler(BaseHTTPRequestHandler):
        def setup(self):
            super().setup()
            self.connection.settimeout(30)

        def log_message(self, *args): pass

        def json(self, status, body):
            data = json.dumps(body).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def body(self):
            if self.headers.get_content_type() != 'application/json':
                raise ApiError(415, 'Expected JSON.')
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 4096:
                raise ApiError(413, 'Request is too large.')
            result = json.loads(self.rfile.read(length))
            if not isinstance(result, dict):
                raise ApiError(400, 'Expected an object.')
            return result

        def run(self):
            try:
                if self.path == '/health' and self.command == 'GET':
                    return self.json(200, {'ok': True})
                # Container port is private. Optional shared token supports standalone hosting.
                secret = os.environ.get('IMPORT_GATEWAY_TOKEN', '')
                if secret and not secrets.compare_digest(self.headers.get('X-Gateway-Token', ''), secret):
                    raise ApiError(403, 'Access denied.')
                origin = self.headers.get('Origin')
                if origin and urlsplit(origin).netloc != self.headers.get('Host'):
                    raise ApiError(403, 'Use Wait to import media.')
                owner = self.headers.get('X-Import-Owner', self.client_address[0])
                token = self.headers.get('X-Import-Token', '')
                if not TOKEN.fullmatch(token):
                    raise ApiError(403, 'Invalid import token.')
                if self.path == '/api/imports' and self.command == 'POST':
                    return self.json(202, jobs.create(self.body(), token, owner))
                match = re.fullmatch(r'/api/imports/([a-f0-9]{32})(/download|/file)?', self.path)
                if not match:
                    raise ApiError(404, 'Not found.')
                job_id, operation = match.groups()
                if self.command == 'DELETE' and not operation:
                    jobs.remove(job_id, token, owner)
                    return self.json(200, {'deleted': True})
                if self.command == 'POST' and operation == '/download':
                    return self.json(202, jobs.choose(job_id, token, owner, self.body()))
                if self.command != 'GET':
                    raise ApiError(405, 'Method not allowed.')
                with jobs.lock:
                    job = jobs.authorize(job_id, token, owner)
                    if not operation:
                        return self.json(200, jobs.public(job))
                    if operation != '/file' or job['state'] != 'ready':
                        raise ApiError(409, 'The recording is not ready.')
                    # Open under the lock, then stream outside it. Deletion cannot change the FD.
                    file = (jobs.root / job_id / job['file']).open('rb')
                    mime, size = job['mime'], job['bytes']
                with file:
                    self.send_response(200)
                    self.send_header('Content-Type', mime)
                    self.send_header('Content-Length', str(size))
                    self.send_header('Cache-Control', 'no-store')
                    self.send_header('X-Content-Type-Options', 'nosniff')
                    self.end_headers()
                    shutil.copyfileobj(file, self.wfile, 65536)
            except ApiError as error:
                self.json(error.status, {'error': error.message})
            except (ValueError, TypeError, KeyError):
                self.json(400, {'error': 'Invalid import request.'})
            except (BrokenPipeError, ConnectionResetError):
                pass
            except OSError:
                self.json(503, {'error': 'Temporary import storage is unavailable. Please retry.'})

        do_GET = do_POST = do_DELETE = run
    return Handler


if __name__ == '__main__':
    jobs = Jobs()
    def cleanup():
        while True:
            time.sleep(3)
            jobs.cleanup()
    threading.Thread(target=cleanup, daemon=True).start()
    server = ThreadingHTTPServer((os.environ.get('IMPORT_BIND', '127.0.0.1'), int(os.environ.get('PORT', '8091'))), handler(jobs))
    def shutdown(*_):
        signal.signal(signal.SIGTERM, signal.SIG_IGN)
        signal.signal(signal.SIGINT, signal.SIG_IGN)
        with jobs.lock:
            for process in jobs.processes.values():
                jobs.kill(process)
        sys.exit(0)
    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)
    server.serve_forever()
