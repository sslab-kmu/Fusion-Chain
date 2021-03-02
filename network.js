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
         });
    });
};
var initP2PServer = () => {
    var server = new WebSocket.Server({port: p2p_port});
    server.on('connection', ws => initConnection(ws));
 
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
                     getMessageCount++;
                    getValidationValue += message.count; 
  
                     if(nodeNum == getMessageCount) {
           

                        if(nodeNum == getValidationValue) {
                            consensus = true;
                        }
                    
                        if(consensus) { 

                            broadcast(RequestCOMMIT(message.data));
                             getMessageCount = 0;
                            getValidationValue = 0;
                         }
                        else { 
                             getMessageCount = 0;
                            getValidationValue = 0;
                        }
                    }
                }
                break;
 
                 case MessageType.REQUEST_COMMIT:
                    if(!leader) {
                  
                        if (bc.isValidNewBlock(message.data, bc.getLatestBlock())) {

                            broadcast(sendCommitMsg());
 
                        }
                        else {

                            broadcast(sendNotCommitMsg());
                         }
                    } 
                    break;
    
                case MessageType.GET_COMMIT:
                    if(!leader) {
                        nodeNum = sockets.length;
                        consensus = false;
                         getMessageCount++;
                        getValidationValue += message.data; 
           
                         if(nodeNum == getMessageCount) {
                   
    
                            if(nodeNum == getValidationValue) {
                                consensus = true;
                            }
                        
                            if(consensus) {
                                bc.addBlock(bc.getNewBlock());
                                 bc.generateIPFSBlock(bc.getNewBlock());
                                broadcast(responseLatestMsg());
                                 getMessageCount = 0;
                                getValidationValue = 0;
                                leader = false;
                            }
                            else {
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
         if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
             bc.addBlock(latestBlockReceived);
            broadcast(responseLatestMsg());
        } else if (receivedBlocks.length === 1) {
             broadcast(queryAllMsg());
        } else {
             replaceChain(receivedBlocks);
        }
    } else {
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