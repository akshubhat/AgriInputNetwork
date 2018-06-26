'use strict';
let fs = require('fs');
let path = require('path');
const BusinessNetworkConnection = require('composer-client').BusinessNetworkConnection;
const BusinessNetworkDefinition = require('composer-common').BusinessNetworkDefinition;

const NS = 'org.acme.agriinputnetwork';

const svc = require('./ai_Services');
//const financeCoID = 'bogrod@gringotts.com';
/**
 * adds an Product to the blockchain
 * @param {express.req} req - the inbound request object from the client
 * req.body.manufacturer - string with manufacturer id
 * req.body.retailer - string with retailer id
 * req.body.items - array with items for Product
 * @param {express.res} res - the outbound response object for communicating back to client
 * @param {express.next} next - an express service to enable post processing prior to responding to the client
 * @returns {Array} an array of assets
 * @function
 */
exports.addProduct = function (req, res, next) {
    let method = 'addProduct';
    console.log(method + ' req.body.manufcturer is: ' + req.body.manufacturer);
    let businessNetworkConnection;
    let factory;
    let ts = Date.now();
    let productId = req.body.manufacturer.replace(/@/, '').replace(/\./, '') + ts;
    if (svc.m_connection === null) { svc.createMessageSocket(); }
    businessNetworkConnection = new BusinessNetworkConnection();
    return businessNetworkConnection.connect(req.body.manufacturer)
        .then(() => {
            factory = businessNetworkConnection.getBusinessNetwork().getFactory();
            let product = factory.newResource(NS, 'Product', productId);
            product = svc.createProductTemplate(product);
            product.productId = productId;
            product.manufacturer = factory.newRelationship(NS, 'Manufacturer', req.body.manufacturer);
            product.agriOrganisation = factory.newRelationship(NS, 'AgricultureOrganisation', req.body.agriOrganisation);


            const createNew = factory.newTransaction(NS, 'CreateProduct');

            createNew.product = factory.newRelationship(NS, 'Product', productId);
            createNew.manufacturer = factory.newRelationship(NS, 'Manufacturer', req.body.manufacturer);
            createNew.agriOrganisation = factory.newRelationship(NS, 'AgricultureOrganisation', req.body.agriOrganisation);
            createNew.productName = req.body.productName;
            createNew.productType = req.body.productType;
            createNew.bestBefore = req.body.bestBefore;
            createNew.mrp = parseInt(req.body.mrp);
            createNew.content = req.body.content;
            console.log(req.body.content);

            return businessNetworkConnection.getAssetRegistry(NS + '.Product')
                .then((assetRegistry) => {
                    return assetRegistry.add(product)
                        .then(() => {
                            return businessNetworkConnection.submitTransaction(createNew)
                                .then(() => {
                                    console.log('Product : ' + productId + ' Aded Successfully');
                                    res.send({ 'result': ' Product ' + productId + ' successfully added' });
                                })
                                .catch((error) => {
                                    if (error.message.search('MVCC_READ_CONFLICT') !== -1) {
                                        console.log(productId + ' retrying assetRegistry.add for: ' + productId);
                                        svc.loadTransaction(createNew, productId, businessNetworkConnection);
                                    }
                                    else {
                                        console.log(productId + ' submitTransaction failed with text: ', error.message);
                                    }
                                });
                        })
                        .catch((error) => {
                            if (error.message.search('MVCC_READ_CONFLICT') !== -1) {
                                console.log(productId + ' retrying assetRegistry.add for: ' + productId);
                                svc.loadTransaction(createNew, productId, businessNetworkConnection);
                            }
                            else {
                                console.log(productId + ' assetRegistry.add failed: ', error.message);
                                res.send({ 'result': 'failed', 'error': ' Product ' + productId + ' getAssetRegistry failed ' + error.message });
                            }
                        });
                })
                .catch((error) => {
                    console.log(productId + ' getAssetRegistry failed: ', error.message);
                    res.send({ 'result': 'failed', 'error': ' Product ' + productId + ' getAssetRegistry failed ' + error.message });
                });
        })
        .catch((error) => {
            console.log(productId + ' business network connection failed: text', error.message);
            res.send({ 'result': 'failed', 'error': ' Product ' + productId + ' add failed on on business network connection ' + error.message });
        });

};


/**
 * get products for retailer with ID =  _id
 * @param {express.req} req - the inbound request object from the client
 *  req.body.id - the id of the retailer making the request
 *  req.body.userID - the user id of the retailer in the identity table making this request
 *  req.body.secret - the pw of this user.
 * @param {express.res} res - the outbound response object for communicating back to client
 * @param {express.next} next - an express service to enable post processing prior to responding to the client
 * @returns {Array} an array of assets
 * @function
 */
exports.getMyProducts = function (req, res, next) {

    let method = 'getMyProducts';
    console.log(method + ' req.body.id is : ' + req.body.id);

    let allProducts = new Array();

    let businessNetworkConnection;
    if (svc.m_connection === null) { svc.createMessageSocket(); }
    let ser;
    let archiveFile = fs.readFileSync(path.join(path.dirname(require.main.filename), 'agricultureinput-network', 'dist', 'agricultureinput-network.bna'));
    businessNetworkConnection = new BusinessNetworkConnection();
    return BusinessNetworkDefinition.fromArchive(archiveFile)
        .then((bnd) => {
            ser = bnd.getSerializer();
            console.log(method + ' req.body.userID is: ' + req.body.userId);
            return businessNetworkConnection.connect(req.body.userId)
                .then(() => {
                    return businessNetworkConnection.query('selectProduct')
                        .then((products) => {
                            //allProducts = new Array();
                            for (let each in products) {
                                (function (_idx, _arr) {
                                    let _jsn = ser.toJSON(_arr[_idx]);
                                    _jsn.id = _arr[_idx].productId;
                                    allProducts.push(_jsn);
                                })(each, products);
                            }
                            //console.log(allProducts);
                            res.send({ 'result': 'success', 'Products': allProducts });
                            //return;
                            console.log('qwerty');
                        })
                        .catch((error) => {
                            console.log('selectProducts failed ', error);
                            res.send({ 'result': 'failed', 'error': 'selectProducts: ' + error.message });
                        });
                    console.log('qwerty');
                })
                .catch((error) => {
                    console.log('businessNetwork connect failed ', error);
                    res.send({ 'result': 'failed', 'error': 'businessNetwork: ' + error.message });
                });
            console.log('qwerty 2');
        })
        .catch((error) => {
            console.log('create bnd from archive failed ', error);
            res.send({ 'result': 'failed', 'error': 'create bnd from archive: ' + error.message });
        });
    console.log("qwerty");
};

exports.productAction = function (req, res, next) {

    let method = 'productAction';
    console.log(method + ' req.body.participant is: ' + req.body.participant);

    if (req.body.action === 'ManufactureProduct' && (typeof (req.body.quantity) === 'undefined' || req.body.quantity.length < 1)) {
        res.send({ 'result': 'failed', 'error': 'no reason provided for dispute' });
    }
    if (svc.m_connection === null) {
        svc.createMessageSocket();
    }

    let businessNetworkConnection;

    let updateProduct;
    businessNetworkConnection = new BusinessNetworkConnection();

    return businessNetworkConnection.connect(req.body.participant)
        .then(() => {
            return businessNetworkConnection.getAssetRegistry(NS + '.Product')
                .then((assetRegistry) => {
                    return assetRegistry.get(req.body.productId)
                        .then((product) => {
                            let factory = businessNetworkConnection.getBusinessNetwork().getFactory();
                            //console.log(product);
                            product.status = req.body.action;
                            //console.log('product : no problem till here');
                            switch (req.body.action) {
                                case 'Request Approval':
                                    updateProduct = factory.newTransaction(NS, 'RequestApproval');
                                    updateProduct.manufacturer = factory.newRelationship(NS, 'Manufacturer', req.body.participant);
                                    updateProduct.agriOrganisation = factory.newRelationship(NS, 'AgricultureOrganisation', product.agriOrganisation.$identifier);
                                    console.log(product.agriOrganisation);
                                    console.log(updateProduct);
                                    break;
                                case 'Approve Product':
                                    updateProduct = factory.newTransaction(NS, 'ApproveProduct');
                                    updateProduct.agriOrganisation = factory.newRelationship(NS, 'AgricultureOrganisation', req.body.participant);
                                    updateProduct.manufacturer = factory.newRelationship(NS, 'Manufacturer', product.manufacturer.$identifier);
                                    updateProduct.approved = true;
                                    updateProduct.rating = req.body.rating;
                                    break;
                                case 'Reject Product':
                                    updateProduct = factory.newTransaction(NS, 'RejectProduct');
                                    updateProduct.agriOrganisation = factory.newRelationship(NS, 'AgricultureOrganisation', req.body.participant);
                                    updateProduct.manufacturer = factory.newRelationship(NS, 'Manufacturer', product.manufacturer.$identifier);
                                    updateProduct.approved = false;
                                    break;
                                case 'Manufacture Product':
                                    updateProduct = factory.newTransaction(NS, 'ManufactureProduct');
                                    updateProduct.manufacturer = factory.newRelationship(NS, 'Manufacturer', req.body.participant);
                                    updateProduct.quantity = parseInt(req.body.quantity);
                                    break;
                                default:
                                    console.log('default entered for action: ' + req.body.action);
                                    res.send({ 'result': 'failed', 'error': ' order ' + req.body.productId + ' unrecognized request: ' + req.body.action });
                                    break;
                            }
                            //console.log('Hey '+updateProduct);
                            updateProduct.product = factory.newRelationship(NS, 'Product', product.$identifier);

                            return businessNetworkConnection.submitTransaction(updateProduct)
                                .then(() => {
                                    console.log('Product ' + product.$identifier + ' Successfully Updated');
                                    res.send({ 'result': ' Product ' + req.body.productId + ' successfully updated to ' + req.body.action });
                                })
                                .catch((error) => {
                                    if (error.message.search('MVCC_READ_CONFLICT') !== -1) {
                                        console.log(' retrying assetRegistry.update for: ' + req.body.productId);
                                        svc.loadTransaction(svc.m_connection, updateProduct, req.body.productId, businessNetworkConnection);
                                    }
                                    else {
                                        console.log(req.body.productId + ' submitTransaction to update status to ' + req.body.action + ' failed with text: ', error.message);
                                    }
                                });
                        })
                        .catch((error) => {
                            console.log('Registry Get Product failed: ' + error.message);
                            res.send({ 'result': 'failed', 'error': 'Registry Get Product failed: ' + error.message });
                        });
                })
                .catch((error) => {
                    console.log('Get Asset Registry failed: ' + error.message);
                    res.send({ 'result': 'failed', 'error': 'Get Asset Registry failed: ' + error.message });
                });
        })
        .catch((error) => {
            console.log('Business Network Connect failed: ' + error.message);
            res.send({ 'result': 'failed', 'error': 'Get Asset Registry failed: ' + error.message });
        });
};


exports.getMyOrders = function (req, res, next) {
    // connect to the network
    let method = 'getMyOrders';
    console.log(method + ' req.body.userID is: ' + req.body.userID);
    let allOrders = new Array();
    let businessNetworkConnection;
    if (svc.m_connection === null) {
        svc.createMessageSocket();
    }
    let ser;
    let archiveFile = fs.readFileSync(path.join(path.dirname(require.main.filename), 'agricultureinput-network', 'dist', 'agricultureinput-network.bna'));
    businessNetworkConnection = new BusinessNetworkConnection();
    return BusinessNetworkDefinition.fromArchive(archiveFile)
        .then((bnd) => {
            ser = bnd.getSerializer();
            //
            // v0.14
            // return businessNetworkConnection.connect(config.composer.connectionProfile, config.composer.network, req.body.userID, req.body.secret)
            //
            // v0.15
            console.log(method + ' req.body.userID is: ' + req.body.userID);
            return businessNetworkConnection.connect(req.body.userID)
                .then(() => {
                    return businessNetworkConnection.query('selectOrder')
                        .then((orders) => {
                            allOrders = new Array();
                            for (let each in orders) {
                                (function (_idx, _arr) {
                                    let _jsn = ser.toJSON(_arr[_idx]);
                                    _jsn.id = _arr[_idx].orderId;
                                    allOrders.push(_jsn);
                                })(each, orders);
                            }
                            res.send({ 'result': 'success', 'orders': allOrders });
                        })
                        .catch((error) => {
                            console.log('selectOrders failed ', error);
                            res.send({ 'result': 'failed', 'error': 'selectOrders: ' + error.message });
                        });
                })
                .catch((error) => {
                    console.log('businessNetwork connect failed ', error);
                    res.send({ 'result': 'failed', 'error': 'businessNetwork: ' + error.message });
                });
        })
        .catch((error) => {
            console.log('create bnd from archive failed ', error);
            res.send({ 'result': 'failed', 'error': 'create bnd from archive: ' + error.message });
        });
};

exports.orderAction = function (req, res, next) {
    let method = 'orderAction';
    console.log(method + ' req.body.participant is: ' + req.body.participant);
    if ((req.body.action === 'Dispute') && (typeof (req.body.reason) !== 'undefined') && (req.body.reason.length > 0)) {/*let reason = req.body.reason;*/ }
    else {
        if ((req.body.action === 'Dispute') && ((typeof (req.body.reason) === 'undefined') || (req.body.reason.length < 1))) { res.send({ 'result': 'failed', 'error': 'no reason provided for dispute' }); }
    }
    if (svc.m_connection === null) { svc.createMessageSocket(); }
    let businessNetworkConnection;
    let updateOrder;
    businessNetworkConnection = new BusinessNetworkConnection();
    //
    // v0.14
    // return businessNetworkConnection.connect(config.composer.connectionProfile, config.composer.network, req.body.participant, req.body.secret)
    //
    // v0.15
    return businessNetworkConnection.connect(req.body.participant)
        .then(() => {
            return businessNetworkConnection.getAssetRegistry(NS + '.Order')
                .then((assetRegistry) => {
                    return assetRegistry.get(req.body.orderId)
                        .then((order) => {
                            let factory = businessNetworkConnection.getBusinessNetwork().getFactory();
                            order.status = req.body.action;
                            switch (req.body.action) {
                                case 'Pay':
                                    console.log('Pay Entered');
                                    updateOrder = factory.newTransaction(NS, 'Pay');
                                    updateOrder.manufacturer = factory.newRelationship(NS, 'Manufacturer', order.manufacturer.$identifier);
                                    updateOrder.financeCo = factory.newRelationship(NS, 'FinanceCo', order.financeCo.$identifier);
                                    break;
                                case 'Dispute':
                                    console.log('Dispute entered');
                                    updateOrder = factory.newTransaction(NS, 'Dispute');
                                    updateOrder.financeCo = factory.newRelationship(NS, 'FinanceCo', order.financeCo.$identifier);
                                    updateOrder.retailer = factory.newRelationship(NS, 'Retailer', order.retailer.$identifier);
                                    updateOrder.manufacturer = factory.newRelationship(NS, 'Manufacturer', order.manufacturer.$identifier);
                                    updateOrder.dispute = req.body.reason;
                                    break;
                                case 'Purchase':
                                    console.log('Purchase entered');
                                    updateOrder = factory.newTransaction(NS, 'PlaceOrder');
                                    updateOrder.retailer = factory.newRelationship(NS, 'Retailer', order.retailer.$identifier);
                                    updateOrder.manufacturer = factory.newRelationship(NS, 'Manufacturer', order.manufacturer.$identifier);
                                    break;
                                case 'Accept Order':
                                    console.log('Accept order ' + order.orderId + ' inbound id: ' + req.body.participant + ' with order.manufacturer as: ' + order.manufacturer.$identifier);
                                    updateOrder = factory.newTransaction(NS, 'AcceptOrder');
                                    updateOrder.manufacturer = factory.newRelationship(NS, 'Manufacturer', order.manufacturer.$identifier);
                                    break;
                                case 'Request Payment':
                                    console.log('Request Payment entered');
                                    updateOrder = factory.newTransaction(NS, 'RequestPayment');
                                    updateOrder.retailer = factory.newRelationship(NS, 'Retailer', order.retailer.$identifier);
                                    updateOrder.manufacturer = factory.newRelationship(NS, 'Manufacturer', order.manufacturer.$identifier);
                                    updateOrder.financeCo = factory.newRelationship(NS, 'FinanceCo', order.financeCo.$identifier);
                                    break;
                                case 'Refund':
                                    console.log('Refund Payment entered');
                                    updateOrder = factory.newTransaction(NS, 'Refund');
                                    updateOrder.manufacturer = factory.newRelationship(NS, 'Manufacturer', order.manufacturer.$identifier);
                                    updateOrder.financeCo = factory.newRelationship(NS, 'FinanceCo', order.financeCo.$identifier);
                                    updateOrder.refund = req.body.reason;
                                    break;
                                case 'Resolve':
                                    console.log('Resolve entered');
                                    updateOrder = factory.newTransaction(NS, 'Resolve');
                                    updateOrder.retailer = factory.newRelationship(NS, 'Retailer', order.retailer.$identifier);
                                    updateOrder.manufacturer = factory.newRelationship(NS, 'Manufacturer', order.manufacturer.$identifier);
                                    updateOrder.financeCo = factory.newRelationship(NS, 'FinanceCo', order.financeCo.$identifier);
                                    updateOrder.resolve = req.body.reason;
                                    break;
                                case 'Update Delivery Status':
                                    console.log('Update Deliver Status');
                                    updateOrder = factory.newTransaction(NS, 'Delivering');
                                    updateOrder.manufacturer = factory.newRelationship(NS, 'Manufacturer', req.body.participant);
                                    updateOrder.status = req.body.delivery;
                                    break;
                                case 'Delivered':
                                    console.log('Delivered entered');
                                    updateOrder = factory.newTransaction(NS, 'Deliver');
                                    updateOrder.manufacturer = factory.newRelationship(NS, 'Manufacturer', req.body.participant)
                                    break;
                                case 'Authorize Payment':
                                    console.log('Authorize Payment entered');
                                    updateOrder = factory.newTransaction(NS, 'AuthorizePayment');
                                    updateOrder.retailer = factory.newRelationship(NS, 'Retailer', order.retailer.$identifier);
                                    updateOrder.financeCo = factory.newRelationship(NS, 'FinanceCo', order.financeCo.$identifier);
                                    break;
                                case 'Cancel':
                                    console.log('Cancel entered');
                                    updateOrder = factory.newTransaction(NS, 'CancelOrder');
                                    updateOrder.retailer = factory.newRelationship(NS, 'Retailer', order.retailer.$identifier);
                                    updateOrder.manufacturer = factory.newRelationship(NS, 'Manufacturer', order.manufacturer.$identifier);
                                    break;
                                default:
                                    console.log('default entered for action: ' + req.body.action);
                                    res.send({ 'result': 'failed', 'error': ' order ' + req.body.orderId + ' unrecognized request: ' + req.body.action });
                                    break;
                            }
                            updateOrder.order = factory.newRelationship(NS, 'Order', order.$identifier);
                            return businessNetworkConnection.submitTransaction(updateOrder)
                                .then(() => {
                                    console.log(' order ' + req.body.orderId + ' successfully updated to ' + req.body.action);
                                    res.send({ 'result': ' order ' + req.body.orderId + ' successfully updated to ' + req.body.action });
                                })
                                .catch((error) => {
                                    if (error.message.search('MVCC_READ_CONFLICT') !== -1) {
                                        console.log(' retrying assetRegistry.update for: ' + req.body.orderId);
                                        svc.loadTransaction(svc.m_connection, updateOrder, req.body.orderId, businessNetworkConnection);
                                    }
                                    else { console.log(req.body.orderId + ' submitTransaction to update status to ' + req.body.action + ' failed with text: ', error.message); }
                                });

                        })
                        .catch((error) => {
                            console.log('Registry Get Order failed: ' + error.message);
                            res.send({ 'result': 'failed', 'error': 'Registry Get Order failed: ' + error.message });
                        });
                })
                .catch((error) => {
                    console.log('Get Asset Registry failed: ' + error.message);
                    res.send({ 'result': 'failed', 'error': 'Get Asset Registry failed: ' + error.message });
                });
        })
        .catch((error) => {
            console.log('Business Network Connect failed: ' + error.message);
            res.send({ 'result': 'failed', 'error': 'Get Asset Registry failed: ' + error.message });
        });
};

exports.getProductList = function (req, res, next) {
    let method = 'getProductList';

    let allProducts = new Array();

    let businessNetworkConnection;
    if (svc.m_connection === null) {
        svc.createMessageSocket();
    }
    let ser;
    let archiveFile = fs.readFileSync(path.join(path.dirname(require.main.filename), 'agricultureinput-network', 'dist', 'agricultureinput-network.bna'));
    businessNetworkConnection = new BusinessNetworkConnection();
    return BusinessNetworkDefinition.fromArchive(archiveFile)
    .then((bnd) => {
        ser = bnd.getSerializer();
        return businessNetworkConnection.connect(req.body.userID)
        .then(() => {
            return businessNetworkConnection.query('selectProduct')
            .then((products) => {
                for (let each in products) {
                    (function (_idx, _arr) {
                        if ((_arr[_idx].manufacturer.$identifier === req.body.manufacturerId) && (_arr[_idx].approved)) {
                            let _jsn = ser.toJSON(_arr[_idx]);
                            _jsn.id = _arr[_idx].orderId;
                            allProducts.push(_jsn);
                        }
                    })(each, products);
                }
                console.log(allProducts);
                res.send({ 'result': 'success', 'products': allProducts });
            })
            .catch((error) => {
                console.log('selectOrders failed ', error);
                res.send({ 'result': 'failed', 'error': 'selectProducts: ' + error.message });
            });
        })
        .catch((error) => {
            console.log('businessNetwork connect failed ', error);
            res.send({ 'result': 'failed', 'error': 'businessNetwork: ' + error.message });
        });
    })
    .catch((error) => {
        console.log('create bnd from archive failed ', error);
        res.send({ 'result': 'failed', 'error': 'create bnd from archive: ' + error.message });
    });
};

exports.addOrder = function (req, res, next) {
    let method = 'addOrder';
    console.log(method + ' req.body.retailer is: ' + req.body.retailer);
    let businessNetworkConnection;
    let factory;
    let ts = Date.now();
    let orderId = req.body.retailer.replace(/@/, '').replace(/\./, '') + ts;
    if (svc.m_connection === null) { svc.createMessageSocket(); }
    businessNetworkConnection = new BusinessNetworkConnection();
    //
    // v0.14
    // return businessNetworkConnection.connect(config.composer.connectionProfile, config.composer.network, req.body.retailer, req.body.secret)
    //
    // v0.15
    return businessNetworkConnection.connect(req.body.retailer)
    .then(() => {
        factory = businessNetworkConnection.getBusinessNetwork().getFactory();
        let order = factory.newResource(NS, 'Order', orderId);
        order = svc.createOrderTemplate(order);
        order.amount = 0;
        order.orderId = orderId;
        order.retailer = factory.newRelationship(NS, 'Retailer', req.body.retailer);
        order.manufacturer = factory.newRelationship(NS, 'Manufacturer', req.body.manufacturer);
        order.financeCo = factory.newRelationship(NS, 'FinanceCo', req.body.financeCo);
        console.log('Items = '+req.body.items);
        for (let each in req.body.items) {
            (function (_idx, _arr) {
                //_arr[_idx].description = _arr[_idx].itemDescription;
                order.items.push(JSON.stringify(_arr[_idx]));
                order.amount += parseInt(_arr[_idx].extendedPrice);
            })(each, req.body.items);
        }
        // create the buy transaction
        const createNew = factory.newTransaction(NS, 'CreateOrder');

        createNew.order = factory.newRelationship(NS, 'Order', order.$identifier);
        createNew.retailer = factory.newRelationship(NS, 'Retailer', req.body.retailer);
        createNew.manufacturer = factory.newRelationship(NS, 'Manufacturer', req.body.manufacturer);
        createNew.financeCo = factory.newRelationship(NS, 'FinanceCo', req.body.financeCo);
        createNew.items = order.items;
        createNew.amount = order.amount;
        // add the order to the asset registry.
        return businessNetworkConnection.getAssetRegistry(NS + '.Order')
        .then((assetRegistry) => {
            return assetRegistry.add(order)
            .then(() => {
                return businessNetworkConnection.submitTransaction(createNew)
                .then(() => {
                    console.log(' order ' + orderId + ' successfully added');
                    res.send({ 'result': ' order ' + orderId + ' successfully added' });
                })
                .catch((error) => {
                    if (error.message.search('MVCC_READ_CONFLICT') !== -1) {
                        console.log(orderId + ' retrying assetRegistry.add for: ' + orderId);
                        svc.loadTransaction(createNew, orderId, businessNetworkConnection);
                    }
                    else { console.log(orderId + ' submitTransaction failed with text: ', error.message); }
                });
            })
            .catch((error) => {
                if (error.message.search('MVCC_READ_CONFLICT') !== -1) {
                    console.log(orderId + ' retrying assetRegistry.add for: ' + orderId);
                    svc.loadTransaction(createNew, orderId, businessNetworkConnection);
                }
                else {
                    console.log(orderId + ' assetRegistry.add failed: ', error.message);
                    res.send({ 'result': 'failed', 'error': ' order ' + orderId + ' getAssetRegistry failed ' + error.message });
                }
            });
        })
        .catch((error) => {
            console.log(orderId + ' getAssetRegistry failed: ', error.message);
            res.send({ 'result': 'failed', 'error': ' order ' + orderId + ' getAssetRegistry failed ' + error.message });
        });
    })
    .catch((error) => {
        console.log(orderId + ' business network connection failed: text', error.message);
        res.send({ 'result': 'failed', 'error': ' order ' + orderId + ' add failed on on business network connection ' + error.message });
    });
};

