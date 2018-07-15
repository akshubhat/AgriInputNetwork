'use strict';
let fs = require('fs');
let path = require('path');
const BusinessNetworkConnection = require('composer-client').BusinessNetworkConnection;
const BusinessNetworkDefinition = require('composer-common').BusinessNetworkDefinition;
const NS = 'org.acme.agriinputnetwork';
const svc = require('./ai_Services');

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

                            for (let each in products) {
                                (function (_idx, _arr) {
                                    let _jsn = ser.toJSON(_arr[_idx]);
                                    _jsn.id = _arr[_idx].productId;
                                    allProducts.push(_jsn);
                                })(each, products);
                            }
                            res.send({ 'result': 'success', 'Products': allProducts });
                        })
                        .catch((error) => {
                            console.log('selectProducts failed ', error);
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

                            product.status = req.body.action;

                            switch (req.body.action) {
                                case 'Request Approval':
                                    updateProduct = factory.newTransaction(NS, 'RequestApproval');
                                    updateProduct.manufacturer = factory.newRelationship(NS, 'Manufacturer', req.body.participant);
                                    updateProduct.agriOrganisation = factory.newRelationship(NS, 'AgricultureOrganisation', product.agriOrganisation.$identifier);
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

exports.getMyStockrooms = function (req, res, next) {
    let method = 'getMyStockrooms';
    console.log(method + ' req.body.userID is: ' + req.body.userID);
    let allStockrooms = new Array();
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

            console.log(method + ' req.body.userID is: ' + req.body.userID);
            return businessNetworkConnection.connect(req.body.userID)
                .then(() => {
                    return businessNetworkConnection.query('selectStockroom')
                        .then((stockrooms) => {
                            allStockrooms = new Array();
                            for (let each in stockrooms) {
                                (function (_idx, _arr) {
                                    let _jsn = ser.toJSON(_arr[_idx]);
                                    _jsn.id = _arr[_idx].stockroomId;
                                    allStockrooms.push(_jsn);
                                })(each, stockrooms);
                            }
                            res.send({ 'result': 'success', 'stockrooms': allStockrooms[0].stock });
                        })
                        .catch((error) => {
                            console.log('selectStockrooms failed ', error);
                            res.send({ 'result': 'failed', 'error': 'selectStockrooms: ' + error.message });
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
                                case 'Accept Order':
                                    console.log('Accept order ' + order.orderId + ' inbound id: ' + req.body.participant + ' with order.manufacturer as: ' + order.manufacturer.$identifier);
                                    updateOrder = factory.newTransaction(NS, 'AcceptOrder');
                                    updateOrder.retailer = factory.newRelationship(NS,'Retailer',order.retailer.$identifier);
                                    updateOrder.manufacturer = factory.newRelationship(NS, 'Manufacturer', order.manufacturer.$identifier);
                                    break;
                                case 'Request Payment':
                                    console.log('Request Payment entered');
                                    updateOrder = factory.newTransaction(NS, 'RequestPayment');
                                    updateOrder.retailer = factory.newRelationship(NS, 'Retailer', order.retailer.$identifier);
                                    updateOrder.manufacturer = factory.newRelationship(NS, 'Manufacturer', order.manufacturer.$identifier);
                                    updateOrder.financeCo = factory.newRelationship(NS, 'FinanceCo', order.financeCo.$identifier);
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

exports.getStockroomList = function (req, res, next) {
    let method = 'getStockroomList';

    let allStock = new Array();

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
            return businessNetworkConnection.query('selectStockroomByRetailer',{ retailer: 'resource:org.acme.agriinputnetwork.Retailer#'+req.body.retailerId})
            .then((stockrooms) => {
                for (let each in stockrooms) {
                    (function (_idx, _arr) {
                        
                        let _jsn = ser.toJSON(_arr[_idx]);
                        _jsn.id = _arr[_idx].stockroomId;
                        allStock.push(_jsn);
                        
                    })(each, stockrooms);
                }
                res.send({ 'result': 'success', 'stockroom': allStock });
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

    return businessNetworkConnection.connect(req.body.retailer)
    .then(() => {
        factory = businessNetworkConnection.getBusinessNetwork().getFactory();
        let order = factory.newResource(NS, 'Order', orderId);
        console.log(order);
        order = svc.createOrderTemplate(order);
        console.log(order);
        order.amount = 0;
        order.orderId = orderId;
        order.retailer = factory.newRelationship(NS, 'Retailer', req.body.retailer);
        order.manufacturer = factory.newRelationship(NS, 'Manufacturer', req.body.manufacturer);
        order.financeCo = factory.newRelationship(NS, 'FinanceCo', req.body.financeCo);
        // console.log('Items = ');
        // console.log(req.body.items);
        for (let each in req.body.items) {
            (function (_idx, _arr) {
                order.items.push(JSON.stringify(_arr[_idx]));
                order.amount += parseInt(_arr[_idx].extendedPrice);
            })(each, req.body.items);
        }
        const createNew = factory.newTransaction(NS, 'CreateOrder');

        createNew.order = factory.newRelationship(NS, 'Order', order.$identifier);
        createNew.retailer = factory.newRelationship(NS, 'Retailer', req.body.retailer);
        createNew.manufacturer = factory.newRelationship(NS, 'Manufacturer', req.body.manufacturer);
        createNew.financeCo = factory.newRelationship(NS, 'FinanceCo', req.body.financeCo);
        createNew.items = order.items;
        createNew.amount = order.amount;
        
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

exports.addCustomerOrder = function(req,res,next){
    let method = 'addCustomerOrder';
    console.log(method + ' req.body.customer is: ' + req.body.customer);
    let businessNetworkConnection;
    let factory;
    let ts = Date.now();

    let customerOrderId = req.body.customer.replace(/@/, '').replace(/\./, '') + ts;
    if (svc.m_connection === null) { svc.createMessageSocket(); }
    businessNetworkConnection = new BusinessNetworkConnection();
    return businessNetworkConnection.connect(req.body.customer)
    .then(() => {
        factory = businessNetworkConnection.getBusinessNetwork().getFactory();
        let order = factory.newResource(NS, 'Customerorder', customerOrderId);


        order = svc.createCustomerOrderTemplate(order);

        order.amount = 0;
        order.customerOrderId = customerOrderId;
        order.retailer = factory.newRelationship(NS, 'Retailer', req.body.retailer);
        order.customer = factory.newRelationship(NS, 'Customer', req.body.customer);
        order.financeCo = factory.newRelationship(NS, 'FinanceCo', req.body.financeCo);
        for (let each in req.body.items) {
            (function (_idx, _arr) {
                order.items.push(JSON.stringify(_arr[_idx]));
                order.amount += parseInt(_arr[_idx].extendedPrice);
            })(each, req.body.items);
        }

        const createNew = factory.newTransaction(NS, 'CreateCustomerorder');

        createNew.order = factory.newRelationship(NS, 'Customerorder', order.$identifier);
        createNew.retailer = factory.newRelationship(NS, 'Retailer', req.body.retailer);
        createNew.customer = factory.newRelationship(NS, 'Customer', req.body.customer);
        createNew.financeCo = factory.newRelationship(NS, 'FinanceCo', req.body.financeCo);
        createNew.items = order.items;
        createNew.amount = order.amount;

        return businessNetworkConnection.getAssetRegistry(NS + '.Customerorder')
        .then((assetRegistry) => {
            return assetRegistry.add(order)
            .then(() => {
                return businessNetworkConnection.submitTransaction(createNew)
                .then(() => {
                    console.log(' order ' + customerOrderId + ' successfully added');
                    res.send({ 'result': ' order ' + customerOrderId + ' successfully added' });
                })
                .catch((error) => {
                    if (error.message.search('MVCC_READ_CONFLICT') !== -1) {
                        console.log(customerOrderId + ' retrying assetRegistry.add for: ' + customerOrderId);
                        svc.loadTransaction(createNew, customerOrderId, businessNetworkConnection);
                    }
                    else { console.log(customerOrderId + ' submitTransaction failed with text: ', error.message); }
                });
            })
            .catch((error) => {
                if (error.message.search('MVCC_READ_CONFLICT') !== -1) {
                    console.log(customerOrderId + ' retrying assetRegistry.add for: ' + customerOrderId);
                    svc.loadTransaction(createNew, customerOrderId, businessNetworkConnection);
                }
                else {
                    console.log(customerOrderId + ' assetRegistry.add failed: ', error.message);
                    res.send({ 'result': 'failed', 'error': ' order ' + customerOrderId + ' getAssetRegistry failed ' + error.message });
                }
            });
        })
        .catch((error) => {
            console.log(customerOrderId + ' getAssetRegistry failed: ', error.message);
            res.send({ 'result': 'failed', 'error': ' order ' + customerOrderId + ' getAssetRegistry failed ' + error.message });
        });
    })
    .catch((error) => {
        console.log(customerOrderId + ' business network connection failed: text', error.message);
        res.send({ 'result': 'failed', 'error': ' order ' + customerOrderId + ' add failed on on business network connection ' + error.message });
    });
};

exports.getMyCustomerOrders = function (req, res, next) {

    let method = 'getMyCustomerOrders';
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
            console.log(method + ' req.body.userID is: ' + req.body.userID);
            return businessNetworkConnection.connect(req.body.userID)
                .then(() => {
                    return businessNetworkConnection.query('selectCustomerOrder')
                        .then((orders) => {
                            allOrders = new Array();
                            // console.log(orders);
                            for (let each in orders) {
                                (function (_idx, _arr) {
                                    let _jsn = ser.toJSON(_arr[_idx]);
                                    _jsn.id = _arr[_idx].customerOrderId;
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

exports.customerOrderAction = function (req, res, next) {
    let method = 'customerOrderAction';
    console.log(method + ' req.body.participant is: ' + req.body.participant);
    if ((req.body.action === 'Dispute') && (typeof (req.body.reason) !== 'undefined') && (req.body.reason.length > 0)) {/*let reason = req.body.reason;*/ }
    else {
        if ((req.body.action === 'Dispute') && ((typeof (req.body.reason) === 'undefined') || (req.body.reason.length < 1))) { res.send({ 'result': 'failed', 'error': 'no reason provided for dispute' }); }
    }
    if (svc.m_connection === null) { svc.createMessageSocket(); }
    let businessNetworkConnection;
    let updateOrder;
    businessNetworkConnection = new BusinessNetworkConnection();
    
    return businessNetworkConnection.connect(req.body.participant)
        .then(() => {
            return businessNetworkConnection.getAssetRegistry(NS + '.Customerorder')
                .then((assetRegistry) => {
                    return assetRegistry.get(req.body.orderId)
                        .then((order) => {
                            let factory = businessNetworkConnection.getBusinessNetwork().getFactory();
                            order.status = req.body.action;
                            switch (req.body.action) {
                                case 'Pay':
                                    console.log('Pay Entered');
                                    updateOrder = factory.newTransaction(NS, 'PayRetailer');
                                    updateOrder.retailer = factory.newRelationship(NS, 'Retailer', order.retailer.$identifier);
                                    updateOrder.financeCo = factory.newRelationship(NS, 'FinanceCo', order.financeCo.$identifier);
                                    break;
                                case 'Accept Order':
                                    console.log('Accept order ' + order.orderId + ' inbound id: ' + req.body.participant + ' with order.retailer as: ' + order.retailer.$identifier);
                                    updateOrder = factory.newTransaction(NS, 'AcceptCustomerorder');
                                    updateOrder.retailer = factory.newRelationship(NS,'Retailer',order.retailer.$identifier);
                                    break;
                                case 'Request Payment':
                                    console.log('Request Payment entered');
                                    updateOrder = factory.newTransaction(NS, 'RequestCustomerPayment');
                                    updateOrder.retailer = factory.newRelationship(NS, 'Retailer', order.retailer.$identifier);
                                    //updateOrder.customer = factory.newRelationship(NS, 'Customer', order.customer.$identifier);
                                    updateOrder.financeCo = factory.newRelationship(NS, 'FinanceCo', order.financeCo.$identifier);
                                    break;
                                case 'Authorize Payment':
                                    console.log('Authorize Payment entered');
                                    updateOrder = factory.newTransaction(NS, 'AuthorizeRetailerPayment');
                                    updateOrder.customer = factory.newRelationship(NS, 'Customer', order.customer.$identifier);
                                    updateOrder.financeCo = factory.newRelationship(NS, 'FinanceCo', order.financeCo.$identifier);
                                    break;
                                case 'Cancel':
                                    console.log('Cancel entered');
                                    updateOrder = factory.newTransaction(NS, 'CancelCustomerorder');
                                    updateOrder.retailer = factory.newRelationship(NS, 'Retailer', order.retailer.$identifier);
                                    updateOrder.customer = factory.newRelationship(NS, 'Customer', order.customer.$identifier);
                                    break;
                                default:
                                    console.log('default entered for action: ' + req.body.action);
                                    res.send({ 'result': 'failed', 'error': ' order ' + req.body.orderId + ' unrecognized request: ' + req.body.action });
                                    break;
                            }
                            updateOrder.order = factory.newRelationship(NS, 'Customerorder', order.$identifier);
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

exports.checkTimeline = function(req,res,next){

    let method = 'checkTimeline';
    console.log(method + ' req.body.participant is: ' + req.body.participant);
    
    if (svc.m_connection === null) { svc.createMessageSocket(); }
    let businessNetworkConnection;
    let updateOrder;
    businessNetworkConnection = new BusinessNetworkConnection();
    let archiveFile = fs.readFileSync(path.join(path.dirname(require.main.filename), 'agricultureinput-network', 'dist', 'agricultureinput-network.bna'));
    return BusinessNetworkDefinition.fromArchive(archiveFile)
    .then((bnd) => {
        var ser = bnd.getSerializer();
        return businessNetworkConnection.connect(req.body.participant)
        .then(()=>{
            return businessNetworkConnection.getAssetRegistry(NS+'.Customerorder')
            .then((assetRegistry)=>{
                return businessNetworkConnection.query('selectOrderbyRetailer',{retailer:'resource:org.acme.agriinputnetwork.Retailer#'+req.body.retailer})
                .then((customerOrders)=>{
                    var jsnArr = [];
                    var json = {};
                    
                    for(var i=0;i<customerOrders.length;i++){
                        for(var j=0; customerOrders[i].items.length ; j++){
                            console.log(customerOrders[i].items[j]);
                            json = JSON.parse(customerOrders[i].items[j]);
                            console.log(json);
                            jsnArr = json.batches.filter(x => JSON.parse(x).batchId === req.body.batchId);
                            if(jsnArr.length > 0){
                                
                                break;
                            }
                        }
                        if(jsnArr.length > 0){
                            break;
                        }
                    }
                    if(jsnArr.length < 1){
                        res.send({ 'result': 'fail'});  
                    }else{
                        return businessNetworkConnection.query('selectCustomerOrderbyRetailer',{retailer:'resource:org.acme.agriinputnetwork.Retailer#'+req.body.retailer})
                        .then((cOrder)=>{
                            var Batches;
                            var temp;
                            for(var l=0;l<cOrder.length;l++){
                                for(var k=0; k<cOrder[l].items.length ; k++){
                                    temp = JSON.parse(cOrder[l].items[k]);
                                    Batches = temp.Batches.find(x => x.BatchId === req.body.batchId);
                                    if(typeof(Batches)!== 'undefined'){
                                        break;
                                    }
                                }
                                if(typeof(Batches)!== 'undefined'){
                                    break;
                                }
                            }
                            if(typeof(Batches)!== 'undefined'){
                                res.send({ 'result': 'success', 'order':ser.toJSON(customerOrders[i]) , 'j':j, 'cOrder':ser.toJSON(cOrder[l]), 'k':k});  
                            }
                            else{
                                res.send({ 'result': 'success', 'order':ser.toJSON(customerOrders[i]) , 'j':j});  
                            }
                        })
                        
                    }
                    // if(jsnArr.length>0){
                    //     var orderId = json[0].batches.find(x => x.batchId === req.body.batchId).OrderId;
                    //     var productName = json[0].ProductName;
                    //     var manufacturerId = jsnArr.Manufacturer;
                    //     return businessNetworkConnection.getAssetRegistry(NS+'.Order')
                    //     .then((assetRegistry)=>{
                    //         return assetRegistry.get(orderId)
                    //         .then((order)=>{
                    //             var productId = order.items.find(x=>x.productName === productName).productId;
                    //             return businessNetworkConnection.getAssetRegistry(NS+'.Product')
                    //             .then((assetRegistry)=>{
                    //                 return assetRegistry.get(productId)
                    //                 .then((prd)=>{
                    //                     res.send({ 'result': 'success', 'orders': ser.toJSON(order), 'product':ser.toJSON(prd), 'customerOrder':ser.toJSON(jsnArr) });  
                    //                 })
                    //                 .catch((error)=>{
                    //                     console.log('Error getting perticular product : '+error);
                    //                 });
                    //             })
                    //             .catch((error)=>{
                    //                 console.log('error getting product : '+error);
                    //             });
                    //         })
                    //         .catch((error)=>{
                    //             console.log('Error while getting specific order by order id : '+error);
                    //         });
                    //     })
                    //     .catch((error)=>{
                    //         console.log('error while getting Orders : '+error);
                    //     });
                    // }
                    // else{
                    //     businessNetworkConnection.query('selectStockroomByRetailer',{retailer:'resource:org.acme.agriinputnetwork.Retailer#'+req.body.retailer})
                    //     .then((stockrooms)=>{
                    //         var asd = [];
                    //         for(var i=0;i<stockrooms[0].stock.length;i++){
                    //             var json = JSON.parse(stockrooms[0].stock[i]);
                    //             for(var j=0;j<json.Inventory.length;j++){
                    //                 asd = json.Inventory[j].Batches.filter(x=>x.BatchId === req.body.batchId);
                    //                 if(asd.length>0){
                    //                     break;
                    //                 }
                    //             }
                    //             if(asd.length>0){
                    //                 break;
                    //             }
                    //         }
                    //         if(asd.length>0){
                    //             orderId = asd[0].OrderId;
                    //             return businessNetworkConnection.getAssetRegistry(NS+'.Order')
                    //             .then((assetRegistry)=>{
                    //                 return assetRegistry.get(orderId)
                    //                 .then((order)=>{
                    //                     var productId = order.items.find(x=>x.productName === productName).productId;
                    //                     return businessNetworkConnection.getAssetRegistry(NS+'.Product')
                    //                     .then((assetRegistry)=>{
                    //                         return assetRegistry.get(productId)
                    //                         .then((prd)=>{
                    //                             res.send({ 'result': 'success', 'orders': ser.toJSON(order), 'product':ser.toJSON(prd)});  
                    //                         })
                    //                         .catch((error)=>{
                    //                             console.log('Error getting perticular product : '+error);
                    //                         });
                    //                     })
                    //                     .catch((error)=>{
                    //                         console.log('error getting product : '+error);
                    //                     });
                    //                 })
                    //                 .catch((error)=>{
                    //                     console.log('Error while getting specific order by order id : '+error);
                    //                 });
                    //             })
                    //             .catch((error)=>{
                    //                 console.log('error while getting Orders : '+error);
                    //             });
                    //         }
                    //         else{
                    //             res.send({ 'result': 'fail'});
                    //         }
                    //     })
                    //     .catch((error)=>{
                    //         console.log('Error getting stockroom');
                    //     })
                    // }
                })
            })
            .catch((error)=>{
                console.log('Error while getting customer orders : '+error);
            })
        })
        .catch((error)=>{
            console.log('error while connecting network : '+error);
        });
    })
    .catch((error)=>{
        console.log('error while connecting network : '+error);
    });
};