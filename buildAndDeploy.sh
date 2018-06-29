#!/bin/bash
currPath=$(pwd)
#cd $1
#npm install
#cd ..
NETWORK_NAME=$1

echo '#####################################################################################'
echo '                                   Creating Archive'
echo '#####################################################################################'
cd ./$1
#npm install
composer archive create --sourceType dir --sourceName . -a ./dist/$NETWORK_NAME.bna
echo $currPath
#
cd $HOME/fabric-tools
echo '#####################################################################################'
echo '                                   Starting Fabric'
echo '#####################################################################################'
./startFabric.sh
echo '====================================================================================='
echo '                                   creating new PeerAdmin card'
echo '====================================================================================='
./createPeerAdminCard.sh
composer card list --name PeerAdmin@hlfv1
echo '====================================================================================='
echo '                                   Startup Complete'
echo '====================================================================================='
echo ' '
#
#
#
echo '#####################################################################################'
echo '                                   Deploying Network'
echo '#####################################################################################'
#
#
cd $currPath/$1/dist
echo '====================================================================================='
echo '                               installing PeerAdmin card'
echo '====================================================================================='
composer runtime install --card PeerAdmin@hlfv1 --businessNetworkName $NETWORK_NAME
#
#
echo '====================================================================================='
echo '                                   starting network'
echo '====================================================================================='
composer network start -c PeerAdmin@hlfv1 -A admin -S adminpw -a $NETWORK_NAME.bna --file networkadmin.card
#
#
echo '====================================================================================='
echo '                               importing networkadmin card'
echo '====================================================================================='
if composer card list -n admin@$NETWORK_NAME > /dev/null; then
    composer card delete -n admin@$NETWORK_NAME
fi
composer card import --file networkadmin.card
echo '====================================================================================='
echo "                               pinging admin@$NETWORK_NAME"
echo '====================================================================================='
#showStep "pinging admin@$NETWORK_NAME card"
composer network ping --card admin@$NETWORK_NAME
#
#
#
# echo '#####################################################################################'
# echo '                                 starting REST server'
# echo '#####################################################################################'
# echo ' '
# echo ' '
# echo ' '
# echo '====================================================================================='
# echo -e '                               testing rest server \n when this completes, \n  go to your favorite browser \n and enter ec2-18-207-206-152.compute-1.amazonaws.com:3000/explorer '
# echo '====================================================================================='
# echo ' '
# echo '====================================================================================='
# echo '                               starting rest server v0.15'
# echo '====================================================================================='
# composer-rest-server -c "admin@$NETWORK_NAME"
