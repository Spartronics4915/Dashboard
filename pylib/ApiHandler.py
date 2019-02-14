import logging
import tornado.web
from tornado.web import RequestHandler
from tornado import httpclient
from tornado import httputil

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
        logger.info("Handle %s request to %s with arg:%s",
            self.request.method, self.request.uri, val)

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

        body = self.request.body
        if not body:
            body = None

        # url = "http://www.google.com" (works)
        url = "http://192.168.1.136:5080/index.html"
        try:
            response = await httpclient.AsyncHTTPClient().fetch(url)
            logger.info("fetched data--------------------------------")
            handleResponse(response)

        except Exception as e:
            logger.error("Exception: %s %s" % (e, url))

