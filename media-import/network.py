"""Public HTTP(S) only, including redirects and extractor-discovered URLs.

Installed inside disposable extraction processes, never in the HTTP server.
Resolve once and connect to that validated IP to prevent DNS rebinding.
Native/curl networking is deliberately not used by our adapters.
"""
import ipaddress
import socket
from urllib.parse import urlsplit, urlunsplit


def public_ip(address):
    ip = ipaddress.ip_address(address.split('%')[0])
    return ip.is_global and not ip.is_multicast and not ip.is_unspecified and not (
        isinstance(ip, ipaddress.IPv6Address) and (ip.ipv4_mapped or ip.sixtofour or ip.teredo)
    )


def validate_url(value):
    if not isinstance(value, str) or len(value) > 2048 or any(ord(c) < 33 for c in value):
        raise ValueError('Enter a complete public media URL.')
    url = urlsplit(value)
    if url.scheme not in ('http', 'https') or not url.hostname or url.username or url.password:
        raise ValueError('Use a public http or https media link without login details.')
    if url.port not in (None, 80, 443) or '%' in url.hostname:
        raise ValueError('This address is not supported.')
    host = url.hostname.lower().rstrip('.')
    if '.' not in host or host.endswith(('.localhost', '.local', '.internal', '.test')):
        raise ValueError('Local and private network links cannot be imported.')
    try:
        ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        if not public_ip(host):
            raise ValueError('Local and private network links cannot be imported.')
    # Fragments are never sent to the upstream. Keep query parameters: some direct links are signed.
    return urlunsplit((url.scheme, url.netloc, url.path, url.query, ''))


def install_guard():
    original_resolve = socket.getaddrinfo
    original_connect = socket.socket.connect
    original_connect_ex = socket.socket.connect_ex

    def resolve(host, port, *args, **kwargs):
        if int(port) not in (80, 443):
            raise OSError('Only public HTTP(S) connections are allowed')
        addresses = original_resolve(host, port, *args, **kwargs)
        if not addresses or any(not public_ip(item[4][0]) for item in addresses):
            raise OSError('Private network destination blocked')
        return addresses

    def address_for(sock, address):
        if sock.family not in (socket.AF_INET, socket.AF_INET6):
            raise OSError('Only public internet connections are allowed')
        addresses = resolve(address[0], address[1], sock.family, sock.type)
        return addresses[0][4]

    def connect(sock, address):
        return original_connect(sock, address_for(sock, address))

    def connect_ex(sock, address):
        return original_connect_ex(sock, address_for(sock, address))

    socket.getaddrinfo = resolve
    socket.socket.connect = connect
    socket.socket.connect_ex = connect_ex
