#
# This file contains two classes:
#
#  WebAPI
#   is the post handler for the webapi/{family} of uri
#
#  WebAPISubscriber
#   establishes a connection-point for a browser. The connection
#   point takes the form of a websocket over which is transferred
#   the stream of messages received through our posts.
#
import tornado.web
from tornado.ioloop import IOLoop
from tornado.websocket import WebSocketHandler, WebSocketClosedError
from tornado.web import StaticFileHandler
import socket
import logging
import sys
from datetime import datetime

s_subscriberSockets = []
s_logger = logging.getLogger("WebAPI")

class WebAPIPost(tornado.web.RequestHandler):
    """
    WebAPI for Spartronics4915.  Of potential use when testing components
    without access to networktables.  For example, a lidar test program
    can deliver scans periodically via standard http post.

    http://www.tornadoweb.org/en/stable/httputil.html#tornado.httputil.HTTPServerRequest
    https://www.tornadoweb.org/en/stable/web.html (for RequestHandler)

    Data is relayed to subscribers. Currently filtering by family is expected
    to occur on the subscriber-side.
    """
    def get(self, *args):
        self.write('<html><body>This is a post-only URL</body></html>')

    def post(self, *args):
        # assume that our webapi uri's look like:  webapi/{family}, where
        # family is a namespace that determines the contents of the post
        family = self.request.uri.split("/")[-1]
        str = "%s/%s" % (family, self.request.body.decode("utf-8"))
        if len(s_subscriberSockets) > 0:
            for s in s_subscriberSockets:
                s.send_msg_threadsafe(str)
        else:
            s_logger.info("no one listening for webapi, " +  str)

class WebAPISubscriber(WebSocketHandler):
    """
        A tornado web handler that forwards values from connected provider
        to a webpage via a websocket.
    """
    def open(self):
        s_logger.info("subscriber websocket opened")
        self.ioloop = IOLoop.current()
        s_subscriberSockets.append(self)

    def on_message(self, msg):
        s_logger.info("Unexpected message received from subscriber:" + msg)

    def send_msg_threadsafe(self, data):
        self.ioloop.add_callback(self.send_msg, data)

    def send_msg(self, msg):
        # (invoked form send_msg_threadsafe)
        try:
            self.write_message(msg, False)
        except WebSocketClosedError:
            s_logger.warn("WebAPI websocket closed when sending message")

    def on_close(self):
        s_logger.info("websocket closed")
        s_subscriberSockets.remove(self)

class WebAPIPublisher(WebSocketHandler):
    """
        A tornado websocket handler that forwards values from connected 
        publisher to a webpage via a websocket.
    """
    def open(self):
        s_logger.info("publisher websocket opened")
        self.ioloop = IOLoop.current()

    def on_message(self, msg):
        if len(s_subscriberSockets) > 0:
            for s in s_subscriberSockets:
                s.send_msg_threadsafe(msg)
        else:
            s_logger.info("no one subscribed to webapi, " +  msg[:20] + "...")

    def send_msg(self, msg):
        s_logger.warning("Unexpected message for publisher " + msg)
        try:
            self.write_message(msg, False)
        except WebSocketClosedError:
            s_logger.warn("WebAPI websocket closed when sending message")

    def send_msg_threadsafe(self, data):
        self.ioloop.add_callback(self.send_msg, data)

    def on_close(self):
        s_logger.info("websocket closed")

def getHandlers():
    """
    return handlers for the webserver url remapping
    """
    return [
        ('/webapi/_subscribe_', WebAPISubscriber),
        ('/webapi/_publish_', WebAPIPublisher),
        ('/webapi/(.*)', WebAPIPost),
    ]
