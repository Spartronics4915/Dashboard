# From http://kyle.graehl.org/coding/2012/12/07/tornado-udpstream.html
#
# example usage:
#    import socket
#    udpsock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
#    udpsock.setblocking(False)
#    udpsock.connect( ('tracker.openbittorrent.com', 80) )
#    s = UDPStream(udpsock)
#    s.send( 'some data' )
#    data = yield gen.Task( s.read_chunk )
#
#  comments:
#  thanks for this. i had to modify it a bit to get the functionality
#  amunrei is talking about (don't set _read_callback to None after reading
#  a chunk, and DO reset the timeout), and also in my case (UPnP discovery)
#  i had to use socket.sendto instead of connect to initiate the connection, 
#  but this got me started nicely!

class UDPStream(object):
    def __init__(self, socket, in_ioloop=None):
        self.socket = socket
        self._state = None
        self._read_callback = None
        self.ioloop = in_ioloop or IOLoop.instance()

    def _add_io_state(self, state):
        if self._state is None:
            self._state = tornado.ioloop.IOLoop.ERROR | state
            self.ioloop.add_handler(
                self.socket.fileno(), self._handle_events, self._state)
        elif not self._state & state:
            self._state = self._state | state
            self.ioloop.update_handler(self.socket.fileno(), self._state)

    def send(self,msg):
        return self.socket.send(msg)

    def recv(self,sz):
        return self.socket.recv(sz)

    def close(self):
        self.ioloop.remove_handler(self.socket.fileno())
        self.socket.close()
        self.socket = None

    def read_chunk(self, callback=None, timeout=4):
        self._read_callback = callback
        self._read_timeout = self.ioloop.add_timeout( time.time() + timeout,
            self.check_read_callback )
        self._add_io_state(self.ioloop.READ)

    def check_read_callback(self):
        if self._read_callback:
            # XXX close socket?
            self._read_callback(None, error='timeout');

    def _handle_read(self):
        if self._read_timeout:
            self.ioloop.remove_timeout(self._read_timeout)
        if self._read_callback:
            try:
                data = self.socket.recv(4096)
            except:
                # conn refused??
                data = None
            self._read_callback(data);
            self._read_callback = None

    def _handle_events(self, fd, events):
        if events & self.ioloop.READ:
            self._handle_read()
        if events & self.ioloop.ERROR:
            logging.error('%s event error' % self)
