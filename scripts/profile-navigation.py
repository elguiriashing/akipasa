"""Profile a real Next production build with localhost-only disposable fixtures.

Measures SSR/streaming and script bytes, not browser navigation or frame rate.
Same user ID with different roles verifies request-scoped authorization isolation.
Streamed HTTP 200 responses can contain a later 404 or redirect instruction.
Requires Python 3.9+ and a Next production build; uses ports 3999/3100.
Compare trees built with the SAME data-provider setting (hybrid for release profiling).
"""

import argparse
import base64
import gzip
import json
import os
import re
import subprocess
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
parser.add_argument('--output', type=Path, default=Path(tempfile.gettempdir()) / 'akipasa-navigation-profile.json')
parser.add_argument('--delay-ms', type=int, default=120)
parser.add_argument('--assert-candidate', action='store_true')
args = parser.parse_args()
ROOT = args.root.resolve()
calls = []
assert (ROOT / '.next/BUILD_ID').exists(), 'Build this tree with hybrid configuration first'
assert 0 <= args.delay_ms <= 1000
terms = re.search('currentTermsVersion: "([^"]+)"', (ROOT / 'src/lib/config.ts').read_text()).group(1)

class Handler(BaseHTTPRequestHandler):

    def log_message(self, *args):
        pass

    def handle_api(self):
        calls.append(self.path)
        time.sleep(args.delay_ms / 1000)
        token = self.headers.get('Authorization', '').split(' ')[-1]
        try:
            claims = json.loads(base64.urlsafe_b64decode(token.split('.')[1] + '=='))
        except (ValueError, IndexError):
            claims = {}
        role = claims.get('role_label', 'administrator')
        uid = claims.get('sub', '00000000-0000-4000-8000-000000000001')
        profile = {'id': uid, 'display_name': 'Disposable ' + role, 'app_role': 'administrator' if role == 'owner' else role, 'membership_tier': 'free', 'terms_version': 'old' if role == 'stale' else terms, 'preferred_locale': 'en'}
        status = 200
        data = []
        if self.path.startswith('/auth/v1/user'):
            if role == 'invalid':
                status = 401
                data = {'message': 'Invalid token'}
            else:
                data = {'id': uid, 'aud': 'authenticated', 'role': 'authenticated', 'email': 'test@example.invalid', 'app_metadata': {}, 'user_metadata': {}}
        elif self.path.startswith('/rest/v1/profiles'):
            data = profile if 'object+json' in self.headers.get('Accept', '') else [profile]
        elif '/rpc/has_owner_console' in self.path:
            data = role == 'owner'
        elif '/rest/v1/owner_console_preferences' in self.path:
            data = {'background': 'aurora', 'accent': 'teal', 'motion': True, 'glass': True, 'background_image_path': None}
        elif '/rpc/public_nearby_venue_page' in self.path:
            data = {'rows': [], 'total': 0, 'page': 1}
        elif '/rpc/passport_collection' in self.path:
            data = {'families': [], 'cities': [], 'awards': [], 'history': []}
        elif '/rpc/staff_pending_venue_claim_count' in self.path:
            data = 0
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Range', '0-0/0')
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(json.dumps(data).encode())
    do_GET = handle_api
    do_POST = handle_api
    do_HEAD = handle_api
class FixtureServer(ThreadingHTTPServer):
    # Parallel page reads can exceed the default five-connection listen queue.
    request_queue_size = 128


server = FixtureServer(('127.0.0.1', 3999), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
env = {**os.environ, 'NEXT_PUBLIC_SUPABASE_URL': 'http://127.0.0.1:3999', 'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'disposable-local-key', 'NEXT_PUBLIC_DATA_PROVIDER': 'hybrid', 'SUPABASE_SERVICE_ROLE_KEY': '', 'RESEND_API_KEY': '', 'CLAIM_RESEND_API_KEY': '', 'STRIPE_SECRET_KEY': ''}
log = open(Path(tempfile.gettempdir()) / 'akipasa-profile-server.log', 'w')
proc = subprocess.Popen(['node', 'node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3100'], cwd=ROOT, env=env, stdout=log, stderr=log)

def cookie(role):

    def enc(obj):
        return base64.urlsafe_b64encode(json.dumps(obj).encode()).decode().rstrip('=')
    token = enc({'alg': 'HS256', 'typ': 'JWT'}) + '.' + enc({'sub': '00000000-0000-4000-8000-000000000001', 'aud': 'authenticated', 'role': 'authenticated', 'role_label': role, 'exp': int(time.time()) + 3600}) + '.test'
    session = {'access_token': token, 'refresh_token': 'disposable', 'expires_at': int(time.time()) + 3600, 'expires_in': 3600, 'token_type': 'bearer', 'user': {'id': '00000000-0000-4000-8000-000000000001'}}
    return 'sb-127-auth-token=base64-' + enc(session)
results = []
try:
    for i in range(60):
        if proc.poll() is not None:
            raise RuntimeError('Next exited; inspect ' + str(log.name))
        try:
            with urllib.request.urlopen('http://127.0.0.1:3100/en', timeout=2):
                break
        except (urllib.error.URLError, TimeoutError):
            time.sleep(0.25)
    else:
        raise RuntimeError('Next server did not become ready')
    for role, path in [('anonymous', '/en'), ('administrator', '/en/account'), ('administrator', '/en/admin'), ('administrator', '/es/staff'), ('administrator', '/en/map'), ('anonymous', '/es/passports'), ('administrator', '/en/passports'), ('anonymous', '/en'), ('owner', '/en/account'), ('moderator', '/es/staff'), ('moderator', '/en/admin'), ('consumer', '/en/staff'), ('consumer', '/en/admin'), ('stale', '/en/account'), ('invalid', '/en/account')]:
        calls.clear()
        headers = {} if role == 'anonymous' else {'Cookie': cookie(role)}
        req = urllib.request.Request('http://127.0.0.1:3100' + path, headers=headers)
        start = time.monotonic()
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                first = time.monotonic()
                body = r.read().decode()
                status = r.status
                url = r.url
        except urllib.error.HTTPError as e:
            first = time.monotonic()
            body = e.read().decode()
            status = e.code
            url = e.url
        finished = time.monotonic()
        scripts = set(re.findall('<script[^>]+src="([^"]+)"', body))
        sizes = []
        for src in scripts:
            p = ROOT / '.next' / urllib.parse.unquote(src).replace('/_next/', '')
            if p.exists():
                b = p.read_bytes()
                sizes.append((len(b), len(gzip.compress(b))))
        result = {'role': role, 'path': path, 'status': status, 'final': url.replace('http://127.0.0.1:3100', ''), 'ttfb_ms': round((first - start) * 1000), 'total_ms': round((finished - start) * 1000), 'auth_calls': sum((x.startswith('/auth/') for x in calls)), 'profile_reads': sum((x.startswith('/rest/v1/profiles') for x in calls)), 'backend_calls': len(calls), 'scripts': sorted(scripts), 'access_denied': 'NEXT_HTTP_ERROR_FALLBACK;404' in body, 'redirect_to_auth': '/auth?next=' in body or '/auth?next%3D' in body, 'redirect_to_terms': '/terms/accept?next=' in body, 'js_raw': sum((x[0] for x in sizes)), 'js_gzip': sum((x[1] for x in sizes)), 'loading': 'route-loading' in body}
        results.append(result)
        print(json.dumps({key: value for key, value in result.items() if key != 'scripts'}), flush=True)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({'backend_delay_ms': args.delay_ms, 'source_commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(), 'dirty': bool(subprocess.check_output(['git', 'status', '--porcelain'], cwd=ROOT, text=True).strip()), 'cases': results}, indent=2) + '\n')
    if args.assert_candidate:
        for result in results:
            if result['role'] in ('consumer', 'moderator') and result['path'].endswith('/admin') or (result['role'] == 'consumer' and result['path'].endswith('/staff')):
                assert result['access_denied'], result
                assert result['backend_calls'] <= 4, result
            if result['role'] == 'stale':
                assert result['redirect_to_terms'], result
            if result['role'] == 'invalid':
                assert result['redirect_to_auth'], result
            if result['role'] == 'anonymous':
                assert result['auth_calls'] == result['profile_reads'] == 0, result
        account = next((r for r in results if r['role'] == 'administrator' and r['path'] == '/en/account'))
        assert account['profile_reads'] == 1, account
        assert any((r['loading'] for r in results)), 'No streamed loading boundary observed'
        print('Candidate authorization and request-isolation assertions passed', flush=True)
finally:
    proc.terminate()
    proc.wait(timeout=5)
    server.shutdown()
    server.server_close()
    log.close()
