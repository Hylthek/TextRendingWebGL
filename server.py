from http.server import HTTPServer, SimpleHTTPRequestHandler
import mimetypes

class GLSLHTTPRequestHandler(SimpleHTTPRequestHandler):
    def guess_type(self, path):
        # Add .glsl MIME type mapping
        mimetypes.add_type('text/plain', '.glsl')
        return super().guess_type(path)

# Start the server
PORT = 1313
httpd = HTTPServer(('localhost', PORT), GLSLHTTPRequestHandler)
print(f"Serving on port {PORT}")
httpd.serve_forever()