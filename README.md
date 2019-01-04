# AgriInputNetwork
AgriInput is a blockchain based application for providing the traceability of Agriculture
input products i.e. Fertilizer, Corps etc. It is developed for the use of customers in the agriculture
domain. It is developed for the various organizations at a different level of the supply chain to optimize
response time and minimize fake products in the market with its user friendly web experience. It also
tackle with the problem of data manipulation. It also provides security features to restrict the
viewership of content on blockchain network.

view report for more understanding about build.

## Installation for Ubuntu 16.04 LTS[1]
Set python 2.7 as default python command in ubuntu - https://askubuntu.com/questions/101591/how-do-i-install-the-latest-python-2-7-x-or-3-x-on-ubuntu

run following commands
```bash
sudo apt-get update
sudo apt-get install -y curl
sudo apt install unzip
curl -H 'Accept: application/vnd.github.v3.raw' https://raw.githubusercontent.com/rddill-IBM/ZeroToBlockchain/master/setup_Ubuntu_Part_1.sh | bash
```
Reboot the system
```bash
curl -H 'Accept: application/vnd.github.v3.raw' https://raw.githubusercontent.com/rddill-IBM/ZeroToBlockchain/master/setup_Ubuntu_Part_2.sh | bash
```
Reboot the system

## Deploying the business network
run following commands
Run `all.sh` to built and test your network.
Run the shell script `builtAndDeploy.sh` to deploy the network.

## References
- ZeroToBlockchain from IBM RedBook - https://github.com/rddill-IBM/ZeroToBlockchain
- HyperLedger Composer Documentation - https://hyperledger.github.io/composer/latest/tutorials/developer-tutorial.html
