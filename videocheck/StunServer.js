#!/usr/bin/env node
const stun = require("stun");
const server = stun.createServer();
const request = stun.createMessage(stun.constants.STUN_BINDING_REQUEST);
server.once(stun.constants.STUN_EVENT_BINDING_RESPONSE, stunMsg => {
    console.ip("your ip:", 
        stunMsg.getAttribute(stun.constants.STUN_ATTR_XOR_MAPPED_ADDRESS)
            .value.address);
    server.close();
});

