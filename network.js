"use strict";
var pidusage = require('pidusage')
var cpuUsage = "["
var memUsage = "["
const WebSocket = require("ws");
const bc = require("./blockchain");
var fs = require("fs");
var newBlockFile  = new Array();
 
 
var sockets = [];
var MessageType = {
    QUERY_LATEST: 0,
    QUERY_ALL: 1,
    RESPONSE_BLOCKCHAIN: 2,
    REQUEST_PREVOTE: 3,
    GET_PREVOTE: 4,
    REQUEST_COMMIT: 5,
    GET_COMMIT: 6
};
var consensus = false;  
var initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : [];

var p2p_port = process.env.P2P_PORT || 6001;

var getMessageCount = 0;
var getValidationValue = 0;

var leader = false;
var nodeNum = 0;
var newBlock;
var connectToPeers = (newPeers) => {
    newPeers.forEach((peer) => {
        var ws = new WebSocket(peer);
        ws.on('open', () => initConnection(ws));
        ws.on('error', () => {
            console.log('connection failed')
        });
    });
};
var initP2PServer = () => {
    var server = new WebSocket.Server({port: p2p_port});
    server.on('connection', ws => initConnection(ws));
    console.log('listening websocket p2p port on: ' + p2p_port);

};

var initConnection = (ws) => {
    sockets.push(ws);
    initMessageHandler(ws);
    initErrorHandler(ws);
    write(ws, queryChainLengthMsg());
};
function minusNode() {
    nodeNum--;
}


var initMessageHandler = (ws) => {
    ws.on('message', (data) => {
        var message = JSON.parse(data);
  
         switch (message.type) {
            case MessageType.QUERY_LATEST:
                write(ws, responseLatestMsg());
                break;
            case MessageType.QUERY_ALL:
                write(ws, responseChainMsg());
                break;
            case MessageType.RESPONSE_BLOCKCHAIN:
                handleBlockchainResponse(message);
                break;
             case MessageType.REQUEST_PREVOTE:
                console.log('REQUEST PREVOTE');
             
                if (bc.isValidNewBlock(message.data, bc.getLatestBlock())) {
                    broadcast(sendPreVoteMsg(message.data));
                }
                else {
                    broadcast(sendNotPreVoteMsg(message.data));
                }

                break;

            case MessageType.GET_PREVOTE:

                if(!leader) {
                    nodeNum = sockets.length - 1;
                    consensus = false;
                    console.log('GET REQUESTED PREVOTE');
                    getMessageCount++;
                    getValidationValue += message.count; 
                    console.log(getMessageCount);
                    console.log(nodeNum);
                     if(nodeNum == getMessageCount) {
                        console.log('PREVOTE');
                        console.log(nodeNum * 2/3 );
                        console.log(getValidationValue);

                        if(nodeNum == getValidationValue) {
                            consensus = true;
                        }
                    
                        if(consensus) { 

                            broadcast(RequestCOMMIT(message.data));
                            console.log('Prevote ' + JSON.stringify(bc.getNewBlock()));
                            getMessageCount = 0;
                            getValidationValue = 0;
                         }
                        else { 
                            console.log('Prevote fail ' + JSON.stringify(bc.getNewBlock()));
                            getMessageCount = 0;
                            getValidationValue = 0;
                        }
                    }
                }
                break;
 
                 case MessageType.REQUEST_COMMIT:
                    if(!leader) {
                    console.log('GET REQUEST COMMIT');
                 
                        if (bc.isValidNewBlock(message.data, bc.getLatestBlock())) {

                            broadcast(sendCommitMsg());
                        }
                        else {

                            broadcast(sendNotCommitMsg());
                        }
                    } 
                    break;
    
                case MessageType.GET_COMMIT:
                    if(leader) {
                        nodeNum = sockets.length;
                        consensus = false;
                        console.log('GET');
                        getMessageCount++;
                        getValidationValue += message.data; 
                        console.log(getMessageCount);
                        console.log(nodeNum);
                         if(nodeNum == getMessageCount) {
                            console.log('Consensus ');
                            console.log(nodeNum * 2/3 );
                            console.log(getValidationValue);
    
                            if(nodeNum == getValidationValue) {
                                consensus = true;
                            }
                        
                            if(consensus) {
                                bc.addBlock(bc.getNewBlock());
                                console.log('new Block: ' + bc.getNewBlock())
                                bc.generateIPFSBlock(bc.getNewBlock());
                                broadcast(responseLatestMsg());
                                console.log('block added ' + JSON.stringify(bc.getNewBlock()));
                                getMessageCount = 0;
                                getValidationValue = 0;
                                leader = false;
                            }
                            else {
                                console.log('fail ' + JSON.stringify(bc.getNewBlock()));
                                getMessageCount = 0;
                                getValidationValue = 0;
                            }
                        }
                    }
                     break;
        }
    });
  
 
};

var initErrorHandler = (ws) => {
    var closeConnection = (ws) => {
        console.log('connection failed to peer: ' + ws.url);
        sockets.splice(sockets.indexOf(ws), 1);
    };
    ws.on('close', () => closeConnection(ws));
    ws.on('error', () => closeConnection(ws));
};

var handleBlockchainResponse = (message) => {
    var receivedBlocks = JSON.parse(message.data).sort((b1, b2) => (b1.index - b2.index));
    var latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
    var latestBlockHeld = bc.getLatestBlock();
    if (latestBlockReceived.index > latestBlockHeld.index) {
        console.log('blockchain possibly behind. We got: ' + latestBlockHeld.index + ' Peer got: ' + latestBlockReceived.index);
        if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
            console.log("We can append the received block to our chain");
            bc.addBlock(latestBlockReceived);
            broadcast(responseLatestMsg());
        } else if (receivedBlocks.length === 1) {
            console.log("We have to query the chain from our peer");
            broadcast(queryAllMsg());
        } else {
            console.log("Received blockchain is longer than current blockchain");
            replaceChain(receivedBlocks);
        }
    } else {
        console.log('received blockchain is not longer than current blockchain. Do nothing');
    }
};

function getSockets() { return sockets; }

function selectLeader(result) {
    leader = result;
}
var queryChainLengthMsg = () => ({'type': MessageType.QUERY_LATEST});
var queryAllMsg = () => ({'type': MessageType.QUERY_ALL});
var responseChainMsg = () =>({
    'type': MessageType.RESPONSE_BLOCKCHAIN, 'data': JSON.stringify(blockchain)
});
var responseLatestMsg = () => ({
    'type': MessageType.RESPONSE_BLOCKCHAIN,
    'data': JSON.stringify([bc.getLatestBlock()])
});


var RequestPBFT = (newBlock) => ({ 
    'type': MessageType.REQUEST_PREVOTE,
    'data': newBlock
});
var RequestCOMMIT = (newBlock) => ({ 
    'type': MessageType.REQUEST_COMMIT,
    'data': newBlock
});
var sendPreVoteMsg = (newBlock) => ({
    'type': MessageType.GET_PREVOTE,
    'data' : newBlock,
    'count' : 1
});
var sendNotPreVoteMsg = (newBlock) => ({
    'type': MessageType.GET_PREVOTE,
    'data' : newBlock,
    'count' : 0
});

var sendCommitMsg = () => ({
    'type': MessageType.GET_COMMIT,
    'data' : 1

});
var sendNotCommitMsg = () => ({
    'type': MessageType.GET_COMMIT,
    'data' : 0
});
 
var write = (ws, message) => ws.send(JSON.stringify(message));
var broadcast = (message) => sockets.forEach(
function(socket){
    write(socket, message)
 
});

module.exports = {
    connectToPeers,
    getSockets,
    broadcast,
    responseLatestMsg,
    initP2PServer,
    selectLeader,
    RequestPBFT
 };