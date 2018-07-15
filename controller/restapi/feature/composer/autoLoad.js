'use strict'

const fs = require('fs');
const path = require('path');
const _home = require('os').homedir();
const hlc_idCard = require('composer-common').IdCard;

const AdminConnection = require('composer-admin').AdminConnection;
const BusinessNetworkConnection = require('composer-client').BusinessNetworkConnection;

const svc = require('./ai_Services');
const config = require('../../../env.json');

let itemTable = new Array();
let memberTable = new Array();
let socketAddr;

exports.getPort = function(req, res, next) {
    let _conn = svc.createMessageSocket();
    res.send({'port': _conn.socket});
};

exports.autoLoad = function(req,res,next){

    let newFile = path.join(path.dirname(require.main.filename),'startup','memberList.json');
    let startupFile = JSON.parse(fs.readFileSync(newFile));

    let businessNetworkConnection;
    let factory;
    let participant;

    svc.createMessageSocket();
   
    socketAddr = svc.m_socketAddr;
    
    let adminConnection = new AdminConnection();

    adminConnection.connect(config.composer.adminCard)
    .then(() => {
        businessNetworkConnection = new BusinessNetworkConnection();
        
        return businessNetworkConnection.connect(config.composer.adminCard)
        .then(() => {
            
            factory = businessNetworkConnection.getBusinessNetwork().getFactory();
            for (let each in startupFile.members)
                {(function(_idx, _arr)
                    {
                    return businessNetworkConnection.getParticipantRegistry(config.composer.NS+'.'+_arr[_idx].type)
                    .then(function(participantRegistry){
                        return participantRegistry.get(_arr[_idx].id)
                        .then((_res) => {
                            console.log('['+_idx+'] member with id: '+_arr[_idx].id+' already exists in Registry '+config.composer.NS+'.'+_arr[_idx].type);
                            svc.m_connection.sendUTF('['+_idx+'] member with id: '+_arr[_idx].id+' already exists in Registry '+config.composer.NS+'.'+_arr[_idx].type);
                        })
                        .catch((error) => {
                            participant = factory.newResource(config.composer.NS, _arr[_idx].type, _arr[_idx].id);
                            participant.companyName = _arr[_idx].companyName;
                            participantRegistry.add(participant)
                            .then(() => {
                                console.log('['+_idx+'] '+_arr[_idx].companyName+' successfully added');
                                svc.m_connection.sendUTF('['+_idx+'] '+_arr[_idx].companyName+' successfully added');
                            })
                            .then(() => {
                                console.log('issuing identity for: '+config.composer.NS+'.'+_arr[_idx].type+'#'+_arr[_idx].id);
                                return businessNetworkConnection.issueIdentity(config.composer.NS+'.'+_arr[_idx].type+'#'+_arr[_idx].id, _arr[_idx].id)
                                .then((result) => {
                                    console.log('result.userID: '+result.userID);
                                    let _mem = _arr[_idx];
                                    _mem.secret = result.userSecret;
                                    _mem.userID = result.userID;
                                    memberTable.push(_mem);
                                    let _meta = {};
                                    for (each in config.composer.metaData)
                                    {(function(_idx, _obj) {_meta[_idx] = _obj[_idx]; })(each, config.composer.metaData); }
                                    _meta.businessNetwork = config.composer.network;
                                    _meta.userName = result.userID;
                                    _meta.enrollmentSecret = result.userSecret;
                                    config.connectionProfile.keyValStore = _home+config.connectionProfile.keyValStore;
                                    let tempCard = new hlc_idCard(_meta, config.connectionProfile);
                                    return adminConnection.importCard(result.userID, tempCard)
                                        .then ((_res) => { if (_res) {console.log('card updated');} else {console.log('card imported');} })
                                        .catch((error) => {
                                            console.error('adminConnection.importCard failed. ',error.message);
                                        });
                                })
                                .catch((error) => {
                                    console.error('create id for '+_arr[_idx].id+'failed. ',error.message);
                                });
                            })
                        .catch((error) => {console.log(_arr[_idx].companyName+' add failed',error.message);});
                        });
                    })
                .catch((error) => {console.log('error with getParticipantRegistry', error.message);});
                })(each, startupFile.members);
            }

            for(let each in startupFile.assets){
                (function(_idx,_arr){
                    return businessNetworkConnection.getAssetRegistry(config.composer.NS+'.'+_arr[_idx].type)
                    .then((assetRegistry) => {
                        return assetRegistry.get(_arr[_idx].id)
                        .then((_res) => {
                            console.log('['+_idx+'] asset with id: '+_arr[_idx].id+' already exists in Registry '+config.composer.NS+'.'+_arr[_idx].type);
                            svc.m_connection.sendUTF('['+_idx+'] asset with id: '+_arr[_idx].id+' already exists in Registry '+config.composer.NS+'.'+_arr[_idx].type);
                        })
                        .catch((error) => {
                            return businessNetworkConnection.getAssetRegistry(config.composer.NS+'.'+'Product')
                            .then((assetRegistry) => {
                                return assetRegistry.getAll()
                                .then(function(allProduct){
                                    let asset = factory.newResource(config.composer.NS, _arr[_idx].type, _arr[_idx].id);
                                    var createNew;
                                    var id = _arr[_idx].id;
                                    asset = svc.createProductTemplate(asset);
                                    asset.productId = _arr[_idx].id;
                                    
                                    asset.manufacturer = factory.newRelationship(config.composer.NS, 'Manufacturer', _arr[_idx].manufacturer);
                                    asset.agriOrganisation = factory.newRelationship(config.composer.NS,'AgricultureOrganisation',_arr[_idx].agriOrg);
                                    createNew = factory.newTransaction(config.composer.NS, 'CreateProduct');
                                    createNew.productName = _arr[_idx].productName;
                                    createNew.productType = _arr[_idx].productType;
                                    createNew.mrp = _arr[_idx].mrp;
                                    createNew.bestBefore = '1 Month';
                                    createNew.product = factory.newRelationship(config.composer.NS, 'Product', asset.$identifier);
                                    createNew.manufacturer = factory.newRelationship(config.composer.NS, 'Manufacturer', _arr[_idx].manufacturer);
                                    createNew.agriOrganisation = factory.newRelationship(config.composer.NS,'AgricultureOrganisation',_arr[_idx].agriOrg);
                                    createNew.content = [];
                                    for(var i = 0; i< _arr[_idx].content.length; i++){
                                        createNew.content.push(JSON.stringify(_arr[_idx].content[i]));
                                    }
                                    return assetRegistry.add(asset)
                                    .then(() => {
                                        console.log(svc.m_connection);
                                        svc.loadTransaction(svc.m_connection, createNew, id, businessNetworkConnection);
                                    })
                                    .catch((error) => {
                                        if (error.message.search('MVCC_READ_CONFLICT') !== -1)
                                        {
                                            console.log('AL: '+_arr[_idx].id+' retrying assetRegistry.add for: '+_arr[_idx].id);
                                            svc.addProduct(svc.m_connection, asset, assetRegistry, createNew, businessNetworkConnection);
                                        }
                                        else {console.log('error with assetRegistry.add', error.message);}
                                    });
                                })
                            })
                        });
                    })
                    .catch((error) => {
                        console.log('error with all getParticipantRegistry', error.message);
                    });
                })(each, startupFile.assets);
            }
            for(let each in startupFile.stockrooms){
                (function(_idx,_arr){
                    return businessNetworkConnection.getAssetRegistry(config.composer.NS+'.'+_arr[_idx].type)
                    .then((assetRegistry) => {
                        return assetRegistry.get(_arr[_idx].id)
                        .then((_res) => {
                            console.log('['+_idx+'] asset with id: '+_arr[_idx].id+' already exists in Registry '+config.composer.NS+'.'+_arr[_idx].type);
                            svc.m_connection.sendUTF('['+_idx+'] asset with id: '+_arr[_idx].id+' already exists in Registry '+config.composer.NS+'.'+_arr[_idx].type);
                        })
                        .catch((error) => {
                            let asset = factory.newResource(config.composer.NS, _arr[_idx].type, _arr[_idx].id);
                            asset = svc.createStockroomTemplate(asset);
                            asset.stockroomId = _arr[_idx].id;
                            asset.retailer = factory.newRelationship(config.composer.NS, 'Retailer', _arr[_idx].retailer);
                            return businessNetworkConnection.getAssetRegistry(config.composer.NS+'.'+_arr[_idx].type)
                            .then((assetRegistry) => {
                                return assetRegistry.add(asset)
                                .then(() => {
                                    console.log(svc.m_connection);
                                })
                                .catch((error) => {
                                    if (error.message.search('MVCC_READ_CONFLICT') !== -1)
                                    {
                                        console.log('AL: '+_arr[_idx].id+' retrying assetRegistry.add for: '+_arr[_idx].id);
                                        svc.addStockroom(svc.m_connection, asset, assetRegistry, businessNetworkConnection);
                                    }
                                    else {console.log('error with assetRegistry.add', error.message);}
                                });
                            })
                        })
                    })
                    .catch((error) => {
                        console.log('error with all getParticipantRegistry', error.message);
                    });
                })(each, startupFile.stockrooms);
            }
        })
        .catch((error) => {
            console.log('error with business network Connect', error.message);
        }); 
    })
    .catch((error) => {
        console.log('error with adminConnect', error.message);
    });
    res.send({'port': socketAddr});
}




exports.getMemberSecret = function(req, res, next)
{
    let newFile = path.join(path.dirname(require.main.filename),'startup','memberList.txt');
    let _table = JSON.parse(fs.readFileSync(newFile));
    let bFound = false;
    for (let each in _table.members){
        if (_table.members[each].id === req.body.id) {
            res.send(_table.members[each]); bFound = true;
        }
    }
    if (!bFound) {
        res.send({
            'id': req.body.id, 'secret': 'not found'
        });
    }
};