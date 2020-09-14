# IPFS-blockchain

논문용 블록체인 프로토타입

### 실행 순서
```
1.  HTTP_PORT=3001 P2P_PORT=6001 npm start

2.  HTTP_PORT=3002 P2P_PORT=6002 PEERS=ws://localhost:6001 npm start

3.  HTTP_PORT=3003 P2P_PORT=6003 PEERS=ws://localhost:6001 npm start

4. curl -H "Content-type:application/json" --data '{"peer" : "ws://localhost:6003"}' http://localhost:3002/addPeer

5. curl -H "Content-type:application/json" --data '{"data" : "Some data to the first block"}' http://localhost:3001/mineBlock

6. curl -H "Content-type:application/json" --data '{"index" : 0}' http://localhost:3001/blocks

7.  

8.  
```
