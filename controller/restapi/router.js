'use strict';

let express = require('express');
let router  = express.Router();
let format = require('date-format');
let hlcAdmin = require('./feature/composer/hlcAdmin');
let hlcClient = require('./feature/composer/hlcClient');
let hlcFabric = require('./feature/composer/queryBlockChain');
let setup = require('./feature/composer/autoLoad');

router.get('/fabric/getChainInfo', hlcFabric.getChainInfo);
router.get('/fabric/getChainEvents', hlcFabric.getChainEvents);
router.get('/fabric/getHistory', hlcAdmin.getHistory);

router.post('/setup/autoLoad*',setup.autoLoad);
router.get('/setup/getPort*',setup.getPort);

module.exports = router;
let count = 0;
/**
 * This is a request tracking function which logs to the terminal window each request coming in to the web serve and
 * increments a counter to allow the requests to be sequenced.
 */
router.use(function(req, res, next) {
    count++;
    console.log('['+count+'] at: '+format.asString('hh:mm:ss.SSS', new Date())+' Url is: ' + req.url);
    next(); // make sure we go to the next routes and don't stop here
});


router.get('/composer/admin/getCreds*', hlcAdmin.getCreds);
//router.get('/composer/admin/getAllProfiles*', hlcAdmin.getAllProfiles);
router.get('/composer/admin/listAsAdmin*', hlcAdmin.listAsAdmin);
router.get('/composer/admin/getRegistries*', hlcAdmin.getRegistries);
router.get('/composer/admin/getAssetRegistries*', hlcAdmin.getAssetRegistries);

// router.post('/composer/admin/createProfile*', hlcAdmin.createProfile);
// router.post('/composer/admin/deleteProfile*', hlcAdmin.deleteProfile);
router.post('/composer/admin/deploy*', hlcAdmin.deploy);
router.post('/composer/admin/install*', hlcAdmin.networkInstall);
router.post('/composer/admin/start*', hlcAdmin.networkStart);
// router.post('/composer/admin/disconnect*', hlcAdmin.disconnect);
// router.post('/composer/admin/getProfile*', hlcAdmin.getProfile);
router.post('/composer/admin/ping*', hlcAdmin.ping);
router.post('/composer/admin/undeploy*', hlcAdmin.undeploy);
router.post('/composer/admin/update*', hlcAdmin.update);
router.post('/composer/admin/getMembers*', hlcAdmin.getMembers);
router.post('/composer/admin/getAssets*', hlcAdmin.getAssets);
router.post('/composer/admin/addMember*', hlcAdmin.addMember);
router.post('/composer/admin/removeMember*', hlcAdmin.removeMember);
router.post('/composer/admin/getSecret*', setup.getMemberSecret);
router.post('/composer/admin/checkCard*', hlcAdmin.checkCard);
router.post('/composer/admin/createCard*', hlcAdmin.createCard);
router.post('/composer/admin/issueIdentity*', hlcAdmin.issueIdentity);


//router.post('/composer/client/addOrder*', hlcClient.addOrder);
router.post('/composer/client/addProduct*', hlcClient.addProduct);
router.post('/composer/client/addOrder*', hlcClient.addOrder);
router.post('/composer/client/addCustomerOrder*', hlcClient.addCustomerOrder);
// router.post('/composer/client/addCustomerorder*', hlcClient.addCustomerorder);
router.post('/composer/client/productAction*', hlcClient.productAction);
router.post('/composer/client/getMyProducts*',hlcClient.getMyProducts);
router.post('/composer/client/getMyOrders*',hlcClient.getMyOrders);
router.post('/composer/client/getMyCustomerOrders*',hlcClient.getMyCustomerOrders);
router.post('/composer/client/getMyStockrooms*',hlcClient.getMyStockrooms);
router.post('/composer/client/orderAction*',hlcClient.orderAction);
router.post('/composer/client/customerOrderAction*',hlcClient.customerOrderAction);
router.post('/composer/client/getProductList*',hlcClient.getProductList);
router.post('/composer/client/getStockroomList*',hlcClient.getStockroomList);
router.post('/composer/client/checkTimeline*',hlcClient.checkTimeline);