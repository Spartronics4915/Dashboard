#
# This file contains two classes:
#
#  Robotlog
#   establishes a connection-point for the udp-based log
#   traffic from the robot.  To deliver this udpstream
#   to a web browser over http, we require a bridge
#   in the form of the RobotlogEchoServer.  If broadcast
#   packets fail to arrive, it's possible that the windows
#   firewall is blocking them.  You'll need to either re-install
#   your python interpretter (and answer yes to the netweork-access
#   prompt for both private as well as public networks),  or you
#   can attempt to edit your firewall rules (using the Advanced.. tab
#   of the windows firewall interface).
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

logger = logging.getLogger("Robotlog")

__all__ = ['getHandlers', 'RobotlogWebSocket']

s_echoSockets = []

class RobotlogEchoSocket(WebSocketHandler):
    '''
        A tornado web handler that forwards values between Robotlog (udp)
        and a webpage via a websocket
    '''

    def open(self):
        logger.info("websocket opened")
        self.ioloop = IOLoop.current()
        s_echoSockets.append(self)

    def on_message(self, message):
        logger.info("Unexpected message from browser:" + message)  # none expected

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
        A context to manage the udp socket connection and
        trigger websocket activity when messages arrive.
    '''
    def __init__(self):
        self.udpsock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        port = 6666 # this is the roborio console port
        #self.udpsock.bind(('', port)) # this is the roborio console port
        #addr = ' '  # doesn't work
        #addr = '192.168.1.255'; # fails during bind
        #addr = '192.168.1.113' # abalone (works when connected wifi, but on same host)
        #addr = '255.255.255.255' # fails during bind
        #addr = 'localhost' # succeeds, but fails for broadcast
        #addr = '<broadcast>' # doesn't work
        addr = ''  # means accept packets from all addresses, works for broadcast
        self.udpsock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        self.udpsock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.udpsock.bind((addr, port))
        self.udpsock.setblocking(0)
        logger.info("listening for robot logs")

    def getUDPSocket(self):
        return self.udpsock

    def getHandlers(self):
        return [
            ('/robotlog/ws', RobotlogEchoSocket),
            ('/robotlog/(.*)', StaticFileHandler)
        ]

    def handleMsg(self, sock, fd, events):
        msg, address = sock.recvfrom(4096)
        # logger.info(msg + (" %d clients" % len(s_echoSockets)))
        for s in s_echoSockets:
            s.send_msg_threadsafe(msg)
