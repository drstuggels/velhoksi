import hashlib
import json
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from network import public_ip, validate_url, install_guard
from server import Jobs, ApiError, TTL
from worker import spotify_id, check_info


class NetworkTests(unittest.TestCase):
    def test_reject_private_protocols_credentials_and_ports(self):
        for url in ['file:///etc/passwd', 'ftp://example.org/a', 'http://localhost/a',
                    'http://127.0.0.1/a', 'http://169.254.169.254/latest', 'http://10.0.0.1/a',
                    'https://example.org:8080/a', 'https://user:pass@example.org/a', 'https://example.org/a\n']:
            with self.subTest(url=url), self.assertRaises(ValueError): validate_url(url)
        self.assertEqual(validate_url('https://example.org/a?signature=keep#t=20'), 'https://example.org/a?signature=keep')

    def test_ipv6_and_transition_addresses(self):
        for ip in ['::1', 'fe80::1', 'fc00::1', '::ffff:127.0.0.1', '2002:7f00:1::', '224.0.0.1', '0.0.0.0']:
            self.assertFalse(public_ip(ip), ip)
        self.assertTrue(public_ip('1.1.1.1'))

    def test_dns_is_checked_on_connect_not_only_on_initial_url(self):
        answer = [(socket.AF_INET, socket.SOCK_STREAM, 6, '', ('127.0.0.1', 443))]
        with patch('socket.getaddrinfo', return_value=answer), patch.object(socket.socket, 'connect'), patch.object(socket.socket, 'connect_ex'):
            install_guard()
            with self.assertRaises(OSError): socket.getaddrinfo('redirected.example.org', 443)
            with socket.socket() as sock, self.assertRaises(OSError): sock.connect(('rebinding.example.org', 443))

    def test_single_spotify_track_only(self):
        self.assertEqual(spotify_id('https://open.spotify.com/intl-fi/track/2BhU0Hl5OatWiCW93pE2b8?si=a'), '2BhU0Hl5OatWiCW93pE2b8')
        with self.assertRaises(ValueError): spotify_id('https://open.spotify.com/playlist/abc')
        self.assertIsNone(spotify_id('https://open.spotify.com.evil.example/track/abc'))

    def test_reject_live_collections_long_and_native_external_downloaders(self):
        for info in [{'_type': 'playlist'}, {'is_live': True}, {'duration': 3601}, {'has_drm': True},
                     {'protocol': 'rtmp'}, {'requested_formats': [{'protocol': 'm3u8'}]}]:
            with self.subTest(info=info), self.assertRaises(ValueError): check_info(info)
        check_info({'duration': 342, 'protocol': 'm3u8_native'})


class JobsTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.jobs = Jobs(Path(self.tmp.name))
        self.id, self.token = 'a' * 32, 'b' * 64
        self.job = dict(id=self.id, token=hashlib.sha256(self.token.encode()).hexdigest(), owner='ip',
                        created=time.time(), state='choosing', source='spotify', url='https://open.spotify.com/track/2BhU0Hl5OatWiCW93pE2b8',
                        candidates=[dict(id='candidate', url='https://youtube.com/watch?v=abc')])
        self.jobs.jobs[self.id] = self.job
        self.jobs.write(self.job)

    def tearDown(self): self.tmp.cleanup()

    def test_token_is_required_but_mobile_ip_can_change(self):
        with self.assertRaises(ApiError): self.jobs.authorize(self.id, 'c' * 64, 'ip')
        self.assertIs(self.jobs.authorize(self.id, self.token, 'new-ip'), self.job)
        self.assertNotIn('token', self.jobs.public(self.job))
        self.assertNotIn('owner', self.jobs.public(self.job))

    def test_client_cannot_inject_download_url_or_video_for_spotify(self):
        for data in [{'candidateId': 'arbitrary-url', 'mode': 'audio'}, {'candidateId': 'candidate', 'mode': 'video'}]:
            with self.assertRaises(ApiError): self.jobs.choose(self.id, self.token, 'ip', data)

    def test_cancel_kills_and_removes_files(self):
        media = Path(self.tmp.name) / self.id / 'media.m4a'
        media.write_bytes(b'private media')
        self.jobs.remove(self.id, self.token, 'ip')
        self.assertFalse(media.exists())
        with self.assertRaises(ApiError): self.jobs.authorize(self.id, self.token, 'ip')

    def test_expiration_and_restart_are_explicit(self):
        self.job['state'] = 'downloading'
        self.jobs.write(self.job)
        restored = Jobs(Path(self.tmp.name))
        self.assertEqual(restored.jobs[self.id]['state'], 'failed')
        self.job['created'] -= TTL + 1
        self.jobs.cleanup()
        self.assertNotIn(self.id, self.jobs.jobs)
        self.assertFalse((Path(self.tmp.name) / self.id).exists())

    def test_completed_download_selection_is_idempotent(self):
        self.job.update(state='ready', selected={'id': 'candidate'}, mode='audio')
        result = self.jobs.choose(self.id, self.token, 'ip', {'candidateId': 'candidate', 'mode': 'audio'})
        self.assertEqual(result['state'], 'ready')
