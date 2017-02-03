
from tornado.ioloop import IOLoop
from tornado.websocket import WebSocketHandler, WebSocketClosedError
from tornado.web import StaticFileHandler
import logging
logger = logging.getLogger("riolog")

__all__ = ['getHandlers', 'RobotlogWebSocket']

def getHandlers():
    return [
        ('/robotlog/ws', RobotlogEchoSocket),
        ('/robotlog/(.*)', StaticFileHandler)
    ]

class RobotlogEchoSocket(WebSocketHandler):
    '''
        A tornado web handler that forwards values between Robotlog (udp)
        and a webpage via a websocket
    '''

    def open(self):
        logger.info("Robotlog websocket opened")
        self.ioloop = IOLoop.current()
        # self.ntserial = NTSerial(self.send_msg_threadsafe)

    def on_message(self, message):
        logger.info("on message:" + message)
        #if self.ntserial is not None:
        #    self.ntserial.process_update(message)

    def send_msg(self, msg):
        try:
            self.write_message(msg, False)
        except WebSocketClosedError:
            logger.warn("websocket closed when sending message")

    def send_msg_threadsafe(self, data):
        self.ioloop.add_callback(self.send_msg, data)

    def on_close(self):
        logger.info("Robotlog websocket closed")
        #if self.ntserial is not None:
        # self.ntserial.close()
