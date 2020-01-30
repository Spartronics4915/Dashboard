# video notes

H264 is a very efficient video solution on raspberry pi due to
its GPU-based implementation.  The hard part is delivering
the resulting video stream to a browser.  We have explored
three technologies for this and currently suggest that the
h264player is the preferred solution.

* h264player uses tcp-based websockets to deliver the
raspivid stream to a browser. No fancy STUN negotiations
take place, but to make the pixels visible in the browser
we employ a javascript h264 decoder.  Once the pixels
are decoded we rely on an opengl canvas.  No use of
the more modern html5 video element here.
* webRTC is the newest and shiniest of streaming techs.
It resolved the biggest issue for broad-deployment of
streaming through a complex routing negotiation system
called ICE, which requires external STUN and/or TURN
services. It does integrate well with browsers using
a native h264 decoder.  But it failed for us in the
context of the FRC Field Management System. Since we have
very little time operating in that environment it is
very difficult to diagnose and resolve the problem.
* rtsp is an older tech for streaming that doesn't
appear to "gel" with browsers.  It does appear to have
the same advantages (over webrtc) that h264player does.
An open source app, VLC,  has support for decoding and 
displaying an rtsp integrating a 3rd party app window
into our driverstation expesrience is  awkward and 
camera switching may prove difficult.

h264player is derived from https://github.com/131/h264-live-player
it includes: 
* https://github.com/mbebenita/Broadway
* https://github.com/matijagaspar/ws-avc-player

webRTCSignaling was derived from and is for use with uv4l.

an opensource webRTC + pi solution is https://github.com/kclyu/rpi-webrt
and would be preferred over the closed-source uv4l.  Should we opt for
this, we'll need to migrate code that plays the same role as both
webRTCSingaling and h264player from our Vision repo here.
