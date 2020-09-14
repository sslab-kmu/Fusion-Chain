'use strict';
var express = require("express");
var bodyParser = require('body-parser');
var newBlock;
var http_port = process.env.HTTP_PORT || 3001;
var p2p_port = process.env.P2P_PORT || 6001;
var initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : [];
const nw = require("./network");
const bc = require("./blockchain");
var fs = require("fs");
  
var initHttpServer = () => {
    
    var app = express();
    app.use(bodyParser.json());
    app.post('/blocks', (req, res) =>  {
            
        fs.readFile('./Blockchain/blockfile' +req.body.index +'.txt','utf8',function(err,data){ 
            console.log("READ: " + data);
            console.log(JSON.parse(data)[0].ipfsHash);
            ipfs.files.cat(JSON.parse(data)[0].ipfsHash, function (err, file) {
                if(err) throw err;
                console.log(file.toString('utf8'));
                res.send(file.toString('utf8'));
            });
        });
    });
    app.post('/mineBlock', (req, res) => {
        newBlock = bc.generateNextBlock(req.body.data);
        
        nw.selectLeader(true);
        console.log('Leader : ' + p2p_port);
        nw.broadcast(nw.RequestPBFT(newBlock));
        console.log('Send Validate');
        res.send();
    });
    app.get('/peers', (req, res) => {
         res.send(nw.getSockets().map(s => s._socket.remoteAddress + ':' + s._socket.remotePort));
    });
    app.post('/addPeer', (req, res) => {
        nw.connectToPeers([req.body.peer]);
        res.send();
    });
    app.listen(http_port, () => console.log('Listening http on port: ' + http_port));
};
nw.connectToPeers(initialPeers);
initHttpServer();
nw.initP2PServer();