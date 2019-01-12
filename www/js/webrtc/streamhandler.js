/* global app */
/* cribbed from uv4l webrtc demo -----------------------*/

const RTCPeerConnection = window.RTCPeerConnection;
const RTCSessionDescription = window.RTCSessionDescription;
const RTCIceCandidate = window.RTCIceCandidate;

class StreamHandler
{
    constructor(url, onOpen, onError, onClose, onMsg)
    {
        if (!("WebSocket" in window))
        {
            onError("Sorry, this browser does not support Web Sockets. Bye.");
            return;
        }

        this.url = url;
        this.onOpenCB = onOpen;
        this.onErrorCB = onError;
        this.onCloseCB = onClose;
        this.onMsgCB = onMsg;
        this.iceCandidates = [];
        this.hasRemoteDesc = false;
        this.pc = null; // peer connection

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
        /* First we create a peer connection */
        var config = {"iceServers": [{"urls": ["stun:stun.l.google.com:19302"]}]};
        var options = {optional: []};
        this.pc = new RTCPeerConnection(config, options);
        this.iceCandidates = [];
        this.hasRemoteDesc = false;
        this.pc.onicecandidate = this.onIceCandiate.bind(this);
        if ("ontrack" in this.pc) 
        {
            this.pc.ontrack = function (event)
            {
                this.onOpenCB(event.streams[0]);
            }.bind(this);
        } 
        else 
        {  
            // onaddstream() deprecated
            this.pc.onaddstream = function (event)
            {
                this.onOpenCB(event.stream);
            }.bind(this);
        }

        this.pc.onremovestream = function (event)
        {
            app.debug("the stream has been removed: do your stuff now");
        };

        this.pc.ondatachannel = function (event)
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
                vformat: 60, /* 30=640x480, 30 fps */
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
                this.pc.setRemoteDescription(
                    new RTCSessionDescription(JSON.parse(data)),
                    function onRemoteSdpSuccess() 
                    {
                        this.hasRemoteDesc = true;
                        this.addIceCandidates();
                        this.pc.createAnswer(
                            function (sessionDescription) 
                            {
                                this.pc.setLocalDescription(sessionDescription);
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
            if (this.onMessageCB)
            {
                this.onMessageCB(msg.data);
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
        if (this.pc) 
        {
            this.pc.close();
            this.pc = null;
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
                this.pc.addIceCandidate(candidate,
                        function () {
                            app.debug("IceCandidate added: " + JSON.stringify(candidate));
                        },
                        function (error) {
                            app.error("addIceCandidate: " + error);
                        }
                    );
                });
                this.iceCandidates = [];
        }
    }
}

window.StreamHandler = StreamHandler;