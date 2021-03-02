'use strict';
var CryptoJS = require("crypto-js");
var crypto = require('crypto');
const nw = require("./network");
const ipfsAPI = require('ipfs-api');
 var ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'})  

var newBlock;
var fs = require("fs");
const path = require('path')

 

var blockchain;
var checkFirst = "";
var blockFileBuffer;
class Block {
    constructor(index, previousHash, timestamp, data, hash) {
        this.index = index;
        this.previousHash = previousHash.toString();
        this.timestamp = timestamp;
        this.data = data;
        this.hash = hash.toString();
    }
}
class BlockIPFS {
    constructor(index,ipfsHash) {
        this.index = index;
        this.ipfsHash = ipfsHash;
    }
}
var blockArray = new Array();
var getGenesisBlock = () => {
         fs.readFile('./Blockchain/blockfile0.txt','utf8',function(err,data){  
            
         checkFirst = data;
         if(process.env.HTTP_PORT == 3001 && checkFirst == "") {
            
            blockArray.push(new Block(0, "0", 1465154705, "Genesis Block", "816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7"));
            fs.writeFile('./Blockchain/blockfile0.txt', JSON.stringify(blockArray), function (err) {
                if (err) throw err;
             });       
            blockArray.length = 0;
            blockFileBuffer = new Buffer(fs.readFile("./Blockchain/blockfile0.txt"));
            ipfs.files.add(blockFileBuffer, function (err, file) {
                fs.unlink('./Blockchain/blockfile0.txt', function(err){
                    if( err ) throw err;
                 });
                blockArray.push(new BlockIPFS(0,file[0].hash))
                if (err) {
                 }
                 fs.writeFile('./Blockchain/blockfile0.txt', JSON.stringify(blockArray), function (err) {
                   if (err) throw err;
                    
               });
               });
        }
         })
        
    return new Block(0, "0", 1465154705, "Genesis Block", "816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7");
};
 
blockchain = [getGenesisBlock()];
 
function getBlockchain() { return blockchain; }
var getLatestBlock = () => blockchain[blockchain.length - 1];

var generateNextBlock = (blockData) => {
    var previousBlock = getLatestBlock();
    var nextIndex = previousBlock.index + 1;
    var nextTimestamp = new Date().getTime() / 1000;
    var nextHash = calculateHash(nextIndex, previousBlock.hash, nextTimestamp, blockData);
    newBlock = new Block(nextIndex, previousBlock.hash, nextTimestamp, blockData, nextHash);
    return new Block(nextIndex, previousBlock.hash, nextTimestamp, blockData, nextHash);
};
var generateIPFSBlock = (block) => {
    var newBlockArray = new Array();
    var blockIndex = block.index
    newBlockArray.push(block);
 

    blockFileBuffer = new Buffer.from(JSON.stringify(newBlockArray), 'utf8');
     newBlockArray.length = 0;

    ipfs.files.add(blockFileBuffer, function (err, file) {
    
         newBlockArray.push(new BlockIPFS(blockIndex,file[0].hash))//encrypt(file[0].hash, 'public.pem')))
        if (err) {
         }
             fs.writeFile('./Blockchain/blockfile'+block.index +'.txt', JSON.stringify(newBlockArray), function (err) {
            if (err) throw err;
             
            });
       return new BlockIPFS(blockIndex,file[0].hash)//encrypt(file[0].hash, encrypt(file[0].hash, 'public.pem'))); 

       });
   
 }
var getBlockFromIPFS = (ipfsHash) => {

    return 0;
}
var calculateHash = (index, previousHash, timestamp, data) => {
    return CryptoJS.SHA256(index + previousHash + timestamp + data).toString();
};
var calculateHashForBlock = (block) => {
    return calculateHash(block.index, block.previousHash, block.timestamp, block.data);
};
var addBlock = (newBlock) => {
     if (isValidNewBlock(newBlock, getLatestBlock())) {
        
        blockchain.push(newBlock);
    }
};

var isValidNewBlock = (newBlock, previousBlock) => {
 
    if (previousBlock.index + 1 !== newBlock.index) {
         return false;
    } else if (previousBlock.hash !== newBlock.previousHash) {
         return false;
    } else if (calculateHashForBlock(newBlock) !== newBlock.hash) {
       
        return false;
    }
    return true;
};
function getNewBlock() {
     return newBlock;
}
var replaceChain = (newBlocks) => {
    if (isValidChain(newBlocks) && newBlocks.length > blockchain.length) {
         blockchain = newBlocks;
        nw.broadcast(responseLatestMsg());
    } else {
     }
};

var isValidChain = (blockchainToValidate) => {
    if (JSON.stringify(blockchainToValidate[0]) !== JSON.stringify(getGenesisBlock())) {
        return false;
    }
    var tempBlocks = [blockchainToValidate[0]];
    for (var i = 1; i < blockchainToValidate.length; i++) {
        if (isValidNewBlock(blockchainToValidate[i], tempBlocks[i - 1])) {
            tempBlocks.push(blockchainToValidate[i]);
        } else {
            return false;
        }
    }
    return true;
};


function encrypt(toEncrypt, relativeOrAbsolutePathToPublicKey) {
    const absolutePath = path.resolve(relativeOrAbsolutePathToPublicKey)
     const publickey = fs.readFileSync(absolutePath, 'utf8')
     const buffer = Buffer.from(toEncrypt)
    const encrypted = crypto.publicEncrypt(   {
        key: publickey.toString(),
        passphrase: '',
       },
      buffer,
    )
    return encrypted.toString('base64')
  }
  
  function decrypt(toDecrypt, relativeOrAbsolutePathtoPrivateKey) {
    const absolutePath = path.resolve(relativeOrAbsolutePathtoPrivateKey)
    const privatekey = fs.readFileSync(absolutePath, 'utf8')
     const buffer = Buffer.from(toDecrypt, 'base64')
    const decrypted = crypto.privateDecrypt(privatekey, buffer)
    
    return decrypted.toString('utf8')
  }
module.exports = {
    getBlockchain,
    getLatestBlock,
    addBlock,
    calculateHashForBlock,
    replaceChain,
    generateNextBlock,
    getGenesisBlock,
    getNewBlock ,
    isValidNewBlock,
    generateIPFSBlock
};