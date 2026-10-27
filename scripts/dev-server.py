#!/usr/bin/env python3
"""A static server for this checkout that tells the browser not to cache.

python3 -m http.server lets the browser keep old copies of the scripts, so an
edit can need a hard reload. This one sends Cache-Control: no-store on every
file. scripts/dev.sh starts it; run it alone with --port and --host.
"""
import argparse
import http.server
import os
import socketserver


class NoStore(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, format, *args):
        print('%s %s' % (self.address_string(), format % args), flush=True)


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--port', type=int, default=8180)
    ap.add_argument('--host', default='127.0.0.1')
    ap.add_argument('--root', default=os.path.join(os.path.dirname(__file__), '..'))
    a = ap.parse_args()
    os.chdir(a.root)
    # .js files must go out as JavaScript for the module import of cubing.js.
    NoStore.extensions_map.update({'.js': 'text/javascript', '.mjs': 'text/javascript'})
    with Server((a.host, a.port), NoStore) as httpd:
        print('Serving %s at http://%s:%d/' % (os.getcwd(), a.host, a.port), flush=True)
        httpd.serve_forever()


if __name__ == '__main__':
    main()
