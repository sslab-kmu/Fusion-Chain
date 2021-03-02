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

  var socket;
 
  var wsOne =   initP2PServer('3001');
  wsOne.on('open', () => initConnection(wsOne));
  wsOne.on('error', () => {
      console.log('connection failed')
  });
  var wsTwo =   initP2PServer('3002');
  wsTwo.on('open', () => initConnection(wsTwo));
  wsTwo.on('error', () => {
      console.log('connection failed')
  });
  var wsThree =   initP2PServer('3003');
  wsThree.on('open', () => initConnection(wsThree));
  wsThree.on('error', () => {
      console.log('connection failed')
  });



  beforeEach(function(done) {
    // Setup
    socket = io.connect('http://localhost:3001', {
      'reconnection delay' : 0
      , 'reopen delay' : 0
      , 'force new connection' : true
      , transports: ['websocket']
    });

    socket.on('connect', () => {
      done();
    });

    socket.on('disconnect', () => {
      // console.log('disconnected...');
    });
  });

  afterEach((done) => {
    // Cleanup
    if(socket.connected) {
      socket.disconnect();
    }
    io_server.close();
    done();
  });

  it('should communicate', (done) => {
    // once connected, emit Hello World
    io_server.emit('echo', 'Hello World');

    socket.once('echo', (message) => {
      // Check that the message matches
      expect(message).to.equal('Hello World');
      done();
    });

    io_server.on('connection', (socket) => {
      expect(socket).to.not.be.null;
    });
  });

});