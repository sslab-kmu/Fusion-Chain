'use strict';
var CryptoJS = require("crypto-js");
var crypto = require('crypto');
const nw = require("./network");
const ipfsAPI = require('ipfs-api');
//const ipfs = ipfsAPI('ipfs.infura.io', '5001', {protocol: 'https'})
var ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'}) // leaving out the arguments will default to these values

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
    //파일에 추가
        fs.readFile('./Blockchain/blockfile0.txt','utf8',function(err,data){  
            
        console.log("READ: " + data);
        checkFirst = data;
        console.log('check' + checkFirst);
        if(process.env.HTTP_PORT == 3001 && checkFirst == "") {
            
            blockArray.push(new Block(0, "0", 1465154705, "Genesis Block", "816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7"));
            fs.writeFile('./Blockchain/blockfile0.txt', JSON.stringify(blockArray), function (err) {
                if (err) throw err;
                console.log('Saved!');
            });       
            blockArray.length = 0;
            blockFileBuffer = new Buffer(fs.readFile("./Blockchain/blockfile0.txt"));
            ipfs.files.add(blockFileBuffer, function (err, file) {
                fs.unlink('./Blockchain/blockfile0.txt', function(err){
                    if( err ) throw err;
                    console.log('file deleted');
                });
                blockArray.push(new BlockIPFS(0,file[0].hash))
                if (err) {
                console.log(err);
                }
                console.log(file)
                fs.writeFile('./Blockchain/blockfile0.txt', JSON.stringify(blockArray), function (err) {
                   if (err) throw err;
                   console.log('Saved!');
                   
               });
               });
        }
         })
        
    return new Block(0, "0", 1465154705, "Genesis Block", "816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7");
};
 
blockchain = [getGenesisBlock()];

/*switch() {
    case:
        blockchain = [getGenesisBlock()];
        break;
    case:
        blockchain = [getGenesisBlock()];
        break;
}*/
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
    console.log(block)
    console.log(block.index)

    blockFileBuffer = new Buffer(JSON.stringify(newBlockArray));
    console.log(blockFileBuffer);
    newBlockArray.length = 0;

    ipfs.files.add(blockFileBuffer, function (err, file) {
    
        console.log(file)
        newBlockArray.push(new BlockIPFS(blockIndex,encrypt(file[0].hash, 'public.pem')))
        if (err) {
        console.log(err);
        }
        console.log(file)
            fs.writeFile('./Blockchain/blockfile'+block.index +'.txt', JSON.stringify(newBlockArray), function (err) {
            if (err) throw err;
            console.log('Saved!');
            
            });
       return new BlockIPFS(blockIndex,encrypt(file[0].hash, encrypt(file[0].hash, 'public.pem'))); 

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
    //console.log('Add '+ JSON.stringify(newBlock));
    if (isValidNewBlock(newBlock, getLatestBlock())) {
        
        blockchain.push(newBlock);
    }
};

var isValidNewBlock = (newBlock, previousBlock) => {
    console.log('NEW BLOCK: ' + JSON.stringify(newBlock));
    console.log('PREVIOUS BLOCK: ' + JSON.stringify(previousBlock));
    if (previousBlock.index + 1 !== newBlock.index) {
        console.log('invalid index');
        return false;
    } else if (previousBlock.hash !== newBlock.previousHash) {
        console.log('invalid previoushash');
        return false;
    } else if (calculateHashForBlock(newBlock) !== newBlock.hash) {
        console.log(typeof (newBlock.hash) + ' ' + typeof calculateHashForBlock(newBlock));
        console.log('invalid hash: ' + calculateHashForBlock(newBlock) + ' ' + newBlock.hash);
        return false;
    }
    return true;
};
function getNewBlock() {
    //console.log('new '+ JSON.stringify(newBlock));
    return newBlock;
}
var replaceChain = (newBlocks) => {
    if (isValidChain(newBlocks) && newBlocks.length > blockchain.length) {
        console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
        blockchain = newBlocks;
        nw.broadcast(responseLatestMsg());
    } else {
        console.log('Received blockchain invalid');
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
    console.log(absolutePath);
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