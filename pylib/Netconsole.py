import socket
import struct
import sys
import threading
import time

def _outputFn(msg):
    sys.stdout.write(msg) # XXX: msg.encode(sys.stdout.encoding, 
                          #     errors='replace').decode(sys.stdout.encoding)

def _outputErr(msg):
    sys.stderr.write(msg) 

class Netconsole:
    '''
        Implements the 2018+ netconsole protocol
		Created by the fine folks behind robotpy.
		Modified for wiring into Spartronics4915's Dashboard.
    '''
    
    TAG_ERROR = 11
    TAG_INFO = 12
    
    def __init__(self, printfn=_outputFn, printerrfn=_outputErr):
        self.frames = {
            self.TAG_ERROR: self._onError,
            self.TAG_INFO: self._onInfo
        }
        
        self.cond = threading.Condition()
        self.sock = None
        self.sockrfp = None
        self.sockwfp = None
        
        self.sockaddr = None
        self.running = False
        
        self.printfn = printfn
        self.printerrfn = printerrfn
    
    def start(self, address, port=1741, connect_event=None, block=True):
        with self.cond:
            if self.running:
                raise ValueError("Cannot start without stopping first")
            
            self.sockaddr = (address, port)
            self.connect_event = connect_event
            
            self.running = True
            
        self._rt = threading.Thread(target=self._readThread,
                                    name='nc-read-thread',
                                    daemon=True)
        self._rt.start()
        
        if block:
            self._keepAlive()
        else:
            self._kt = threading.Thread(target=self._keepAlive,
                                        name='nc-keepalive-thread',
                                        daemon=True)
            self._kt.start()
    
    @property
    def connected(self):
        return self.sockrfp is not None
    
    def stop(self):
        with self.cond:
            self.running = False
            self.cond.notifyAll()
            self.sock.close()
    
    def _connectionDropped(self):
        self.printerrfn(".. connection dropped")
        self.sock.close()
        
        with self.cond:
            self.sockrfp = None
            self.cond.notifyAll()

    def _keepAliveReady(self):
        if not self.running:
            return -1
        elif not self.connected:
            return -2

    def _keepAlive(self):
        while self.running:
            with self.cond:
                ret = self.cond.wait_for(self._keepAliveReady, timeout=2.0)
                
            if ret == -1:
                return
            elif ret == -2:
                self._reconnect()
            else:
                try:
                    self.sockwfp.write(b'\x00\x00')
                    self.sockwfp.flush()
                except IOError:
                    self._connectionDropped()

    def _readThreadReady(self):
        if not self.running:
            return -1
        return self.sockrfp
    
    def _readThread(self):
        while True:
            with self.cond:
                sockrfp = self.cond.wait_for(self._readThreadReady)
                if sockrfp == -1:
                    return
            
            try:
                data = sockrfp.read(self._headerSz)
            except IOError:
                data = ''
            
            if len(data) != self._headerSz:
                self._connectionDropped()
                continue
                
            blen, tag = self._header.unpack(data)
            blen -= 1
            
            try:
                buf = sockrfp.read(blen)
            except IOError:
                buf = ''
                
            if len(buf) != blen:
                self._connectionDropped()
                continue
            
            # process the frame
            fn = self.frames.get(tag)
            if fn:
                fn(buf)
            else:
                self.printerrfn("Unknown tag %s; Ignoring..." % tag)
    
    def _reconnect(self):
        # returns once the socket is connected or an exit is requested

        while self.running:
            
            try:
                sock = socket.create_connection(self.sockaddr, timeout=3.0)
                self.printerrfn("Connected to %s:%s..." % self.sockaddr)

            except IOError:
                self.printerrfn("Connecting to %s:%s..." % self.sockaddr)
                # don't busywait, just in case
                time.sleep(1.0)
                continue
            else:
                self.printerrfn("OK\n")
                
            sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            sock.settimeout(None)
            
            sockrfp = sock.makefile('rb')
            sockwfp = sock.makefile('wb')
            
            if self.connect_event:
                self.connect_event.set()
            
            with self.cond:
                self.sock = sock
                self.sockrfp = sockrfp
                self.sockwfp = sockwfp
                self.cond.notifyAll()
            
            break
    
    #
    # Message 
    #
        
    _header = struct.Struct('>Hb')
    _headerSz = _header.size
    
    _errorFrame = struct.Struct('>fHHiB')
    _errorFrameSz = _errorFrame.size
    
    _infoFrame = struct.Struct('>fH')
    _infoFrameSz = _infoFrame.size
    
    _slen = struct.Struct('>H')
    _slenSz = _slen.size
    
    def _onError(self, b):
        ts, _seq, _numOcc, errorCode, flags = self._errorFrame.unpack_from(b, 0)
        details, nidx = self._getStr(b, self._errorFrameSz)
        location, nidx = self._getStr(b, nidx)
        callStack, _ = self._getStr(b, nidx)
        
        self.printfn('[%0.2f] %d %s %s %s' % (ts, errorCode, details, 
				location, callStack))
    
    def _getStr(self, b, idx):
        sidx = idx + self._slenSz
        blen, = self._slen.unpack_from(b, idx)
        nextidx = sidx + blen
        return b[sidx:nextidx].decode('utf-8', errors='replace'), nextidx
    
    def _onInfo(self, b):
        ts, _seq = self._infoFrame.unpack_from(b, 0)
        msg = b[self._infoFrameSz:].decode('utf-8', errors='replace')
        self.printfn('[%0.2f] %s' % (ts, msg))

