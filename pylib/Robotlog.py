#
# This file contains two classes:
#
#  Robotlog
#   establishes a connection-point for the tcp-based log
#   traffic from the robot.  To deliver this udpstream
#   to a web browser over http, we require a bridge
#   in the form of the RobotlogEchoServer.  
#
#  RobotlogEchoSocket
#   establishes a connection-point for a browser. The connection
#   point takes the form of a websocket over which is transferred
#   the udp stream of messages received through our Robotlog.
#
from tornado.ioloop import IOLoop
from tornado.websocket import WebSocketHandler, WebSocketClosedError
from tornado.web import StaticFileHandler
import socket
import logging
from .Netconsole import Netconsole
import sys
from datetime import datetime

logger = logging.getLogger("Robotlog")

__all__ = ['getHandlers', 'RobotlogWebSocket']

s_echoSockets = []

class RobotlogEchoSocket(WebSocketHandler):
    '''
        A tornado web handler that forwards values between Robotlog (tcp)
        and a webpage via a websocket
    '''

    def open(self):
        logger.info("websocket opened")
        self.ioloop = IOLoop.current()
        s_echoSockets.append(self)

    def on_message(self, msg):
        logger.info("Unexpected message from browser:" + msg) # none expected

    def send_msg(self, msg):
        # logger.info("send message:" + msg)
        try:
            self.write_message(msg, False)
        except WebSocketClosedError:
            logger.warn("websocket closed when sending message")

    def send_msg_threadsafe(self, data):
        self.ioloop.add_callback(self.send_msg, data)

    def on_close(self):
        logger.info("Robotlog websocket closed")
        s_echoSockets.remove(self)

class Robotlog():
    '''
        A context to manage the tcp socket connection and
        trigger websocket activity when messages arrive.
    '''
    def __init__(self):
        logger.info("listening for robot logs")
        self.netconsole = None

    def initConnection(self, ioloop):
        if 0:
            sock = robotlog.getUDPSocket()
            callback = functools.partial(robotlog.handleMsg, sock);
            ioLoop.add_handler(sock.fileno(), callback, ioLoop.READ)
        else:
            self.netconsole = Netconsole(printfn=self.dispatchMsg,
                                         printerrfn=self.dispatchErr);
            self.netconsole.start("10.49.15.2", block=False)

    def dispatchMsg(self, msg):
        if len(s_echoSockets) > 0:
            for s in s_echoSockets:
                s.send_msg_threadsafe(msg)
        else:
            pass # drop a message

    def dispatchErr(self, msg):
        # log format is 'timestamp level namespace msg'
        ts = datetime.now().strftime("%H:%M:%S")
        emsg = "%s ERROR RobotLog %s" % (ts, msg)
        if len(s_echoSockets) > 0:
            for s in s_echoSockets:
                s.send_msg_threadsafe(emsg)
        else:
            sys.stderr.write(emsg)
            

    def getHandlers(self):
        """
            return handlers for the webserver url remapping
        """
        return [
            ('/robotlog/ws', RobotlogEchoSocket),
            ('/robotlog/(.*)', StaticFileHandler)
        ]

    def handleMsg(self, sock, fd, events):
        msg, address = sock.recvfrom(4096)
        # logger.info(msg + (" %d clients" % len(s_echoSockets)))
        for s in s_echoSockets:
            s.send_msg_threadsafe(msg)


