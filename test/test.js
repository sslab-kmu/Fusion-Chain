var express = require("express");
var appOne = express();
var appTwo = express();
var appThree = express();
const WebSocket = require("ws");

var io = require('socket.io-client');
var initP2PServer = (port) => {
  var server = new WebSocket.Server({port});
  server.on('connection', ws => initConnection(ws));
  console.log('listening websocket p2p port on: ' + port);

};
describe('basic socket.io example', function() {

   
});