# Fusion Chain: A Decentralized Lightweight Blockchain for IoT Security and Privacy
February 2021, Electronics


https://www.mdpi.com/2079-9292/10/4/391


https://www.researchgate.net/publication/349058486_Fusion_Chain_A_Decentralized_Lightweight_Blockchain_for_IoT_Security_and_Privacy


### Start
```
1. HTTP_PORT=3001 P2P_PORT=6001 npm start

2. HTTP_PORT=3002 P2P_PORT=6002 PEERS=ws://localhost:6001 npm start

3. HTTP_PORT=3003 P2P_PORT=6003 PEERS=ws://localhost:6001 npm start

4. curl -H "Content-type:application/json" --data '{"peer" : "ws://localhost:6003"}' http://localhost:3002/addPeer

5. curl -H "Content-type:application/json" --data '{"data" : "Some data to the first block"}' http://localhost:3001/mineBlock
```
