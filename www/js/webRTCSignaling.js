/* global app */
/* cribbed from uv4l webrtc demo -----------------------*/
/* we don't antipicate requiring internet-based signaling services,
 * but the uv4l/webrtc framework appears to require some of this setup. 
 */

const RTCPeerConnection = window.RTCPeerConnection;
const RTCSessionDescription = window.RTCSessionDescription;
const RTCIceCandidate = window.RTCIceCandidate;

class WebRTCSignaling
{
    constructor(url, onOpen, onError, onClose, onMsg)
    {
        if (!("WebSocket" in window))
        {
            onError("Sorry, this browser does not support Web Sockets. Bye.");
            return;
        }

        let fields = url.split(":");
        if(fields.length != 3)
        {
            app.error("unexpected url: " + url);
            this.ip = "localhost";
        }
        else
            this.ip = fields[1];

        this.url = url;
        this.onOpenCB = onOpen;
        this.onErrorCB = onError;
        this.onCloseCB = onClose;
        this.onMsgCB = onMsg;
        this.iceCandidates = [];
        this.hasRemoteDesc = false;
        this.peerCnx = null; // peer connection

        this.ws = new WebSocket(this.url);
        this.ws.onopen = this.onOpen.bind(this);
        this.ws.onclose = this.onClose.bind(this);
        this.ws.onmessage = this.onMsg.bind(this);
    }

    hangup() 
    {
        if (this.ws) 
        {
            var request = {
                what: "hangup"
            };
            app.debug("send message " + JSON.stringify(request));
            this.ws.send(JSON.stringify(request));
        }
    }

    onOpen()
    {
        /* First we create a peer connection 
         *  - try to avoid internet cnx, 
         *  - try to minimize startup time
         */
        // var config = {"iceServers": [{"urls": ["stun:stun.l.google.com:19302"]}]}; // works
        // var config = {"iceServers": {}}; -- this doesn't work
        // var config = {"iceServers": [{"urls": ["stun:localhost:9999"]}]};
        // var config = {"iceServers": [{"urls": ["stun:192.168.1.51:3478"]}]}; // worked in lan-only, not wlan(?)
        var config = {"iceServers": [{"urls": [
                "stun:stun.l.google.com:19302",
                `stun:${this.ip}:3478`
            ]}]}; // works
        var options = {optional: []};
        this.iceCandidates = [];
        this.hasRemoteDesc = false;
        this.peerCnx = new RTCPeerConnection(config, options);
        this.peerCnx.onicecandidate = this.onIceCandidate.bind(this);
        if ("ontrack" in this.peerCnx) 
        {
            app.debug("webRTCSignaling: ontrack");
            this.peerCnx.ontrack = function (event)
            {
                this.onOpenCB(event.streams[0]);
            }.bind(this);
        } 
        else 
        {  
            // onaddstream() deprecated
            this.peerCnx.onaddstream = function (event)
            {
                this.onOpenCB(event.stream);
            }.bind(this);
        }

        this.peerCnx.onremovestream = function (event)
        {
            app.debug("the stream has been removed: do your stuff now");
        };

        this.peerCnx.ondatachannel = function (event)
        {
            app.debug("a data channel is available: do your stuff with it");
            // For an example, see https://www.linux-projects.org/uv4l/tutorials/webrtc-data-channels/
        };

        /* kindly signal the remote peer that we would like to initiate a call */
        var request =
        {
            what: "call",
            options: 
            {
                // If forced, the hardware codec depends on the arch.
                // (e.g. it's H264 on the Raspberry Pi)
                // Make sure the browser supports the codec too.
                force_hw_vcodec: true,
                vformat: 30,
                // from janus section of 
                //   https://www.linux-projects.org/documentation/uv4l-server/
                // 10: 320×240-30fps, Bandwidth of .3 mbps latency of 95
                // 20: 352×288-30fps, 
                // 30: 640×480-30fps, Bandwidth of .9 mbps latency of 110 ms
                // 40: 960×720-30fps, 
                // 50: 1024×768-30fps, 
                // 60: 1280×720-30fps,  Bandwidth of 3, latenchy of 140ms 
                // 63: 1280×720-60fps, Bandwidth of 6-7 mbps  latency of ~202 ms
                // 65: 1280×768-15fps, 
                // 70: 1280×768-30fps, 
                // 80: 1280×960-30fps, 
                // 90: 1600×768-30fps, 
                // 95: 1640×1232-15fps, 
                // 97: 1640×1232-30fps, 
                // 100: 1920×1080-15fps, 
                // 105: 1920×1080-30fps
                trickle_ice: true
            }
        };
        app.debug("send message " + JSON.stringify(request));
        this.ws.send(JSON.stringify(request));
    }/* end onOpen */

    onMsg(evt) 
    {
        var msg = JSON.parse(evt.data);
        var what = msg.what;
        var data = msg.data;
        app.debug("received message " + JSON.stringify(msg));
        switch (what) 
        {
        case "offer":
            {
                let mediaConstraints = {
                    optional: [],
                    mandatory: {
                        OfferToReceiveAudio: false,
                        OfferToReceiveVideo: true
                    }
                };
                this.peerCnx.setRemoteDescription(
                    new RTCSessionDescription(JSON.parse(data)),
                    function onRemoteSdpSuccess() 
                    {
                        this.hasRemoteDesc = true;
                        this.addIceCandidates();
                        this.peerCnx.createAnswer(
                            function (sessionDescription) 
                            {
                                this.peerCnx.setLocalDescription(sessionDescription);
                                var request = {
                                    what: "answer",
                                    data: JSON.stringify(sessionDescription)
                                };
                                this.ws.send(JSON.stringify(request));
                            }.bind(this), 
                            function (error) 
                            {
                                this.onErrorCB("failed to create answer: " + error);
                            }.bind(this), mediaConstraints);
                    }.bind(this),
                    function onRemoteSdpError(event) 
                    {
                        this.onErrorCB("failed to set the remote description: " + event);
                        this.ws.close();
                    }.bind(this)
                );
            }
            break;

        case "answer":
            break;

        case "message":
            if (this.onMsgCB)
            {
                this.onMsgCB(msg.data);
            }
            break;

        case "iceCandidate": // received when trickle ice is used (see the "call" request)
            {
                if (!msg.data) 
                {
                    app.debug("Ice Gathering Complete");
                    break;
                }
                let elt = JSON.parse(msg.data);
                let candidate = new RTCIceCandidate({
                                    sdpMLineIndex: elt.sdpMLineIndex, 
                                    candidate: elt.candidate});
                this.iceCandidates.push(candidate);
                this.addIceCandidates(); // it internally checks if the remote description has been set
            }
            break;

        case "iceCandidates": // received when trickle ice is NOT used (see the "call" request)
            {
                let candidates = JSON.parse(msg.data);
                for (var i = 0; candidates && i < candidates.length; i++) 
                {
                    var elt = candidates[i];
                    let candidate = new RTCIceCandidate({sdpMLineIndex: elt.sdpMLineIndex, candidate: elt.candidate});
                    this.iceCandidates.push(candidate);
                }
                this.addIceCandidates();
            }
            break;
        }/* end switch*/
    }/* end onMsg */

    onClose(event) 
    {
        app.debug("socket closed with code: " + event.code);
        if (this.peerCnx) 
        {
            this.peerCnx.close();
            this.peerCnx = null;
            this.ws = null;
        }
        if (this.onCloseCB) 
            this.onCloseCB();
    }

    onIceCandidate(event) 
    {
        if (event.candidate)
        {
            var candidate = 
            {
                sdpMLineIndex: event.candidate.sdpMLineIndex,
                sdpMid: event.candidate.sdpMid,
                candidate: event.candidate.candidate
            };
            var request = 
            {
                what: "addIceCandidate",
                data: JSON.stringify(candidate)
            };
            this.ws.send(JSON.stringify(request));
        } 
        else 
        {
            app.debug("end of candidates.");
        }
    }

    addIceCandidates()
    {
        if (this.hasRemoteDesc) 
        {
            this.iceCandidates.forEach(function (candidate) 
            {
                this.peerCnx.addIceCandidate(candidate,
                        function () {
                            app.debug("IceCandidate added: " + JSON.stringify(candidate));
                        },
                        function (error) {
                            app.error("addIceCandidate: " + error);
                        }
                    );
            }.bind(this));
            this.iceCandidates = [];
        }
    }
}

window.WebRTCSignaling = WebRTCSignaling;
