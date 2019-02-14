import logging
import tornado.web
from tornado.web import RequestHandler
from tornado import httpclient
from tornado import httputil
from urllib.parse import urlparse # requires python3
from urllib.parse import parse_qs # requires python3

#
# our job is to redirect requests to the ctre diagnostics server
# running on the robot.  This was necessary because the browser
# CORS support disallows XMLXttpRequests to that server since it
# doesn't expose the permissive security settings (Access-Control-Allow-Origin *)
# Note that regular curl does work, ie: this is a browser security feature
# that we bypass here.
#

__all__ = ['getHandlers', 'ApiHandler']
logger = logging.getLogger('ApiHandler')

def getHandlers():
    return [
            (r"/api/(.*)", ApiHandler)
        ]


class ApiHandler(RequestHandler):
    SUPPORTED_METHODS = ["GET"]

    async def get(self, val):
        #  expect self.request.uri is like: 
        #       /api/getdevices&addr=10.49.15.2&port=1250'
        logger.info("handling %s with arg:%s", self.request.uri, val)
        req = urlparse(self.request.uri)
        if req.query != "":
            qs = parse_qs(req.query)
        else:
            qs = None

        # construct the url for the remote request
        # https://github.com/CrossTheRoadElec/Phoenix-diagnostics-client
        # https://media.readthedocs.org/pdf/phoenix-documentation/latest/phoenix-documentation.pdf
        
        if req.path == "/api/getdevices":
            addr = "10.49.15.2"
            port = "1250"
            if qs:
                if "addr" in qs:
                    addr = qs["addr"][0]
                if "port" in qs:
                    port = qs["port"][0]
            url = "http://" + addr + ":" + port + "/?action=getdevices"
        else:
            self.set_status(404)
            self.write("Invalid api request\n" + str(response.error))

        def handleResponse(response):
            if (response.error and not
                isinstance(response.error, tornado.httpclient.HTTPError)):
                self.set_status(500)
                self.write("Internal server error:\n" + str(response.error))
            else:
                self.set_status(response.code, response.reason)
                self._headers = tornado.httputil.HTTPHeaders()
                for header,v in response.headers.get_all():
                    if header not in ("Content-Length", "Transfer-Encoding",
                                        "Content-Encoding", "Connection"):
                        self.add_header(header, v)
                if response.body:
                    self.set_header("Content-Length", len(response.body))
                    self.write(response.body)
            self.finish()

        try:
            logger.info("redirect to %s", url)
            response = await httpclient.AsyncHTTPClient().fetch(url)
            logger.info("fetched data--------------------------------")
            handleResponse(response)

        except Exception as e:
            logger.error("Exception: %s %s" % (e, url))

