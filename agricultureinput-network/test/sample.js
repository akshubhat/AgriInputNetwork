'use strict';

const AdminConnection = require('composer-admin').AdminConnection;
const BusinessNetworkConnection = require('composer-client').BusinessNetworkConnection;
const BusinessNetworkDefinition = require('composer-common').BusinessNetworkDefinition;

const hlc_idCard = require('composer-common').IdCard;
const path = require('path');
const _home = require('os').homedir();

require('chai').should();
const network = 'agricultureinput-network';
const _timeout = 90000;
//const bfs_fs = BrowserFS.BFSRequire('fs');
const NS = 'org.acme.agriinputnetwork';

const orderId = '12345';
const productId = '002'
const manufacturerId = 'zydus';
const govFinanceId = 'financecorp@gmail.com'
const agriOrganisationId = 'ao@gmail.com'
const retailerId = 'harrypotter@gmial.com'
const financeCoId = 'finance@gmail.com'
const dispute = 'ordered products received but defective';
const resolve = 'defective products will be refunded';

let financeCo;
let govFinBody;
let agriOrg;
let orderAmount = 0;
let orderStatus = {
    Created: {code: 1, text: 'Order Created'},
    Cancelled: {code: 2, text: 'Order Cancelled'},
    Accepted: {code: 3, text: 'Order Placed'},
    PayRequest: {code: 4, text: 'Payment Requested'},
    Authorize: {code: 5, text: 'Payment Approved'},
    Paid: {code: 6, text: 'Payment Processed'}
};

let productStatus = {
    ProductCreated: {code: 1,text: 'Product Created'},
    RequestApproval: {code: 2,text: 'Product Approval Requested'},
    ApproveProduct: {code: 3,text: 'Product Approved'},
    RejectProduct: {code: 4, text: 'Product Rejected'}
};



/**
 * create an empty order
 * @param {createOrderTemplate} _inbound - Order created with factory.newResource(NS, 'Order', orderNo)
 * @returns {Order} - updated order item with all required fields except for relationships (buyer, seller)
 * @utility
 */
function createOrderTemplate (_inbound)
{
    _inbound.orderId = '';
    _inbound.status = JSON.stringify(orderStatus.Created);
    _inbound.dispute = '';
    _inbound.resolve = '';
    _inbound.refund = '';
    _inbound.amount = 0;
    _inbound.created = new Date().toISOString();
    _inbound.cancelled = '';
    _inbound.accepted ='';
    _inbound.ordered = '';
    _inbound.delivered = '';
    _inbound.delivering = '';
    _inbound.disputeOpened = '';
    _inbound.disputeResolved = '';
    _inbound.paymentRequested = '';
    _inbound.approved = '';
    _inbound.paid = '';
    _inbound.items = [];

    return(_inbound);
}

function createProductTemplate (_inbound)
    {
        _inbound.productId ='';
        _inbound.productName ='';
        _inbound.productType = '';
        _inbound.approved =false;
        _inbound.rating ='';
        _inbound.mrp = 0;
        _inbound.batches = [];
        _inbound.content = [];
        _inbound.status = '';
        _inbound.requestApproval = '';
        _inbound.rejectProduct = '';
        _inbound.approveProduct = '';
        _inbound.productCreated = '';
        _inbound.totalQuantity = 0;
        _inbound.bestBefore = '0 Month';
        _inbound.manufacturer = '';
        _inbound.agriOrganisation = '';

        return(_inbound);
    }



/**
 * update an empty order with 4 items. update the amount field based on the sum of the line items
 * @param {addItems} _inbound - Order created with factory.newResource(NS, 'Order', orderNo)
 * @returns {Order} - updated order item with all required fields except for relationships (buyer, seller)
 * @utility
 */
function addItems (_inbound)
{
    _inbound.items.push('{"itemNo": 1, "itemDescription": "Macbook Pro 16Gb, 1Tb", "quantity": 2, "unitPrice": 1285, "extendedPrice": 3470}');
    _inbound.items.push('{"itemNo": 2, "itemDescription": "Macbook Pro 8Gb, .5Tb", "quantity": 3, "unitPrice": 985, "extendedPrice": 2955}');
    _inbound.items.push('{"itemNo": 3, "itemDescription": "Lenovo Thinkpad W520 16Gb, .25Tb", "quantity": 1, "unitPrice": 500, "extendedPrice": 500}');
    _inbound.items.push('{"itemNo": 4, "itemDescription": "Lenovo Thinkpad W520 32Gb, 1Tb", "quantity": 4, "unitPrice": 1565, "extendedPrice": 6260}');
    _inbound.amount = JSON.parse(_inbound.items[0]).extendedPrice;
    _inbound.amount += JSON.parse(_inbound.items[1]).extendedPrice;
    _inbound.amount += JSON.parse(_inbound.items[2]).extendedPrice;
    _inbound.amount += JSON.parse(_inbound.items[3]).extendedPrice;
    orderAmount= _inbound.amount;
    return (_inbound);
}


describe('Agriculture Trading', function () {

    this.timeout(_timeout);
    let businessNetworkConnection;
    before(function () {
        businessNetworkConnection = new BusinessNetworkConnection();
        return businessNetworkConnection.connect('admin@agricultureinput-network');
    });

    describe("#CreateProduct", () => {
        it('Should be able to create a product', () => {
            const factory = businessNetworkConnection.getBusinessNetwork().getFactory();

            const retailer = factory.newResource(NS,'Retailer',retailerId);
            retailer.companyName = 'Gryffindor, Inc';

            const manufacturer = factory.newResource(NS,'Manufacturer',manufacturerId);
            manufacturer.companyName = 'Hogwards, Inc';

            govFinBody = factory.newResource(NS,'GovernmentFinanceBody',govFinanceId);
            govFinBody.companyName = 'Gringots, Inc';

            agriOrg = factory.newResource(NS,'AgricultureOrganisation',agriOrganisationId);
            agriOrg.companyName = 'Assembly, Inc';

            financeCo = factory.newResource(NS,'FinanceCo',financeCoId);
            financeCo.companyName = 'Self Financer';

            let product = factory.newResource(NS,'Product',productId);
            product = createProductTemplate(product);
            product.productId = productId;
            product.manufacturer = factory.newRelationship(NS,'Manufacturer',manufacturerId);
            product.agriOrganisation = factory.newRelationship(NS,'AgricultureOrganisation',agriOrganisationId);

            const createNew = factory.newTransaction(NS,'CreateProduct');
            createNew.product = factory.newRelationship(NS,'Product',product.$identifier);
            createNew.manufacturer = factory.newRelationship(NS,'Manufacturer',manufacturer.$identifier);
            createNew.agriOrganisation = factory.newRelationship(NS,'AgricultureOrganisation',agriOrganisationId);
            createNew.productName = 'qwe';
            createNew.content = [];
            createNew.content.push('{"contentNo":"1","name":"Nitrogen","percentage":"50"}');
            createNew.productType = 'fert';
            createNew.bestBefore = '2 min';
            createNew.mrp = 250;
            var mrp = 250;

            return businessNetworkConnection.getAssetRegistry(NS+'.Product')
            .then((assetRegistry) => {

                return assetRegistry.add(product)
                .then(() => {
                    return businessNetworkConnection.getParticipantRegistry(NS+'.Manufacturer');
                })
                .then((participantRegistry) => {
                    return participantRegistry.addAll([retailer,manufacturer,govFinBody,financeCo,agriOrg]);
                })
                .then(() => {
                    return businessNetworkConnection.submitTransaction(createNew);
                })
                .then(() => {
                    return businessNetworkConnection.getAssetRegistry(NS+'.Product');
                })
                .then((assetRegistry) => {
                    return assetRegistry.get(productId);
                })
                .then ((newOrder) => {
                    newOrder.mrp.should.equal(mrp);
                })
            })
        })
    });

    describe('#CreateOrder', () => {
        it('Should able to Create Order' , () => {
            const factory = businessNetworkConnection.getBusinessNetwork().getFactory();

            const retailer = factory.newResource(NS,'Retailer',retailerId);
            retailer.companyName = 'Gryffindor, Inc';

            const manufacturer = factory.newResource(NS,'Manufacturer',manufacturerId);
            manufacturer.companyName = 'Hogwards, Inc';

            govFinBody = factory.newResource(NS,'GovernmentFinanceBody',govFinanceId);
            govFinBody.companyName = 'Gringots, Inc';

            agriOrg = factory.newResource(NS,'AgricultureOrganisation',agriOrganisationId);
            agriOrg.companyName = 'Assembly, Inc';

            financeCo = factory.newResource(NS,'FinanceCo',financeCoId);
            financeCo.companyName = 'Self Financer';

            let order = factory.newResource(NS,'Order',orderId);
            order = createOrderTemplate(order);
            order = addItems(order);
            order.orderId = orderId;

            const createNew = factory.newTransaction(NS,'CreateOrder');

            order.retailer = factory.newRelationship(NS,'Retailer',retailer.$identifier);
            order.manufacturer = factory.newRelationship(NS,'Manufacturer',manufacturer.$identifier);
            order.financeCo = factory.newRelationship(NS,'FinanceCo',financeCo.$identifier);

            createNew.order = factory.newRelationship(NS, 'Order', order.$identifier);
            createNew.retailer = factory.newRelationship(NS,'Retailer',retailer.$identifier);
            createNew.manufacturer = factory.newRelationship(NS,'Manufacturer',manufacturer.$identifier);
            createNew.financeCo = factory.newRelationship(NS,'FinanceCo',financeCo.$identifier);

            createNew.amount = order.amount;

            JSON.parse(order.status).text.should.equal(orderStatus.Created.text);
            order.amount.should.equal(orderAmount);
            createNew.amount.should.equal(orderAmount);
            createNew.order.$identifier.should.equal(orderId);

            return businessNetworkConnection.getAssetRegistry(NS+'.Order')
            .then((assetRegistry) => {

                return assetRegistry.add(order)
                .then(() => {
                    return businessNetworkConnection.getParticipantRegistry(NS+'.Retailer');
                })
                .then((participantRegistry) => {
                    return participantRegistry.addAll([retailer,manufacturer,govFinBody,financeCo,agriOrg]);
                })
                .then(() => {
                    return businessNetworkConnection.submitTransaction(createNew);
                })
                .then(() => {
                    return businessNetworkConnection.getAssetRegistry(NS+'.Order');
                })
                .then((assetRegistry) => {
                    return assetRegistry.get(orderId);
                })
                .then ((newOrder) => {
                    newOrder.retailer.$identifier.should.equal(retailerId);
                })
            })

        });
    });

    describe('#PlaceOrder', () => {

        it('should be able to issue a buy request', () => {
            const factory = businessNetworkConnection.getBusinessNetwork().getFactory();

            // create the buy transaction
            const buyNow = factory.newTransaction(NS, 'PlaceOrder');

            return businessNetworkConnection.getAssetRegistry(NS + '.Order')
                .then((assetRegistry) => {
                    // re-get the commodity
                    return assetRegistry.get(orderId);
                })
                .then((newOrder) => {
                    newOrder.retailer.$identifier.should.equal(retailerId);
                    newOrder.$identifier.should.equal(orderId);
                    buyNow.order = factory.newRelationship(NS, 'Order', newOrder.$identifier);
                    buyNow.retailer = newOrder.retailer;
                    buyNow.manufacturer = newOrder.manufacturer;
                    // submit the transaction
                    return businessNetworkConnection.submitTransaction(buyNow)
                        .then(() => {
                            return businessNetworkConnection.getAssetRegistry(NS + '.Order');
                        })
                        .then((assetRegistry) => {

                            return assetRegistry.get(orderId);
                        })
                        .then((newOrder) => {
                            // the owner of the commodity should be buyer
                            newOrder.retailer.$identifier.should.equal(retailerId);
                            JSON.parse(newOrder.status).text.should.equal(orderStatus.Bought.text);
                        });

                });
        });
    });

    describe('#AcceptOrder', () => {

        it('Should be able to Accept order', () => {
            const factory = businessNetworkConnection.getBusinessNetwork().getFactory();

            const orderAccept = factory.newTransaction(NS,'AcceptOrder');

            return businessNetworkConnection.getAssetRegistry(NS+'.Order')
            .then((assetRegistry) => {
                return assetRegistry.get(orderId);
            })
            .then((newOrder) => {
                newOrder.retailer.$identifier.should.equal(retailerId);
                newOrder.$identifier.should.equal(orderId);

                orderAccept.order = factory.newRelationship(NS,'Order',newOrder.$identifier);
                orderAccept.manufacturer = factory.newRelationship(NS,'Manufacturer',manufacturerId);

                return businessNetworkConnection.submitTransaction(orderAccept)
                .then(() => {
                    return businessNetworkConnection.getAssetRegistry(NS+'.Order');
                })
                .then((assetRegistry) => {
                    return assetRegistry.get(orderId);
                })
                .then((orderAccept) => {
                    JSON.parse(orderAccept.status).text.should.equal(orderStatus.Ordered.text);
                })
            })
        });
    });

    describe('#Delivering', () => {
        it('Should be able to Change Delivery Status', () => {

            const factory = businessNetworkConnection.getBusinessNetwork().getFactory();

            const deliveringOrder = factory.newTransaction(NS,'Delivering');

            return businessNetworkConnection.getAssetRegistry(NS+'.Order')
            .then((assetRegistry) => {
                return assetRegistry.get(orderId);
            })
            .then((orderNew) => {
                orderNew.retailer.$identifier.should.equal(retailerId);
                orderNew.$identifier.should.equal(orderId);

                deliveringOrder.deliveryStatus = '';
                deliveringOrder.order = factory.newRelationship(NS,'Order',orderNew.$identifier);
                deliveringOrder.manufacturer = factory.newRelationship(NS,'Manufacturer',manufacturerId);

                return businessNetworkConnection.submitTransaction(deliveringOrder)
                .then(() => {
                    return businessNetworkConnection.getAssetRegistry(NS+'.Order');
                })
                .then((assetRegistry) => {
                    return assetRegistry.get(orderId);
                })
                .then((orderAccept) => {
                    JSON.parse(orderAccept.status).text.should.equal(orderStatus.Delivering.text);
                })
            })
        });
    });

    describe('#Deliver', () => {
        it('Should be able to deliver product' , () => {

            const factory = businessNetworkConnection.getBusinessNetwork().getFactory();

            const deliverOrder = factory.newTransaction(NS,'Deliver');

            return businessNetworkConnection.getAssetRegistry(NS+'.Order')
            .then((assetRegistry) => {
                return assetRegistry.get(orderId);
            })
            .then((newOrder) => {

                newOrder.retailer.$identifier.should.equal(retailerId);
                newOrder.$identifier.should.equal(orderId);

                deliverOrder.order = factory.newRelationship(NS,'Order',newOrder.$identifier);
                deliverOrder.manufacturer = factory.newRelationship(NS,'Manufacturer',manufacturerId);

                return businessNetworkConnection.submitTransaction(deliverOrder)
                .then(() => {
                    return businessNetworkConnection.getAssetRegistry(NS+'.Order');
                })
                .then((assetRegistry) => {
                    return assetRegistry.get(orderId);
                })
                .then((newOrder) => {
                    JSON.parse(newOrder.status).text.should.equal(orderStatus.Delivered.text);
                })
            })
        });
    });

    describe('#Dispute', () => {
        it('should be able to raise a dispute' , () => {
            const factory = businessNetworkConnection.getBusinessNetwork().getFactory();

            const disputeOrder = factory.newTransaction(NS,'Dispute');

            return businessNetworkConnection.getAssetRegistry(NS+'.Order')
            .then((assetRegistry) => {
                return assetRegistry.get(orderId);
            })
            .then((newOrder) => {

                newOrder.retailer.$identifier.should.equal(retailerId);
                newOrder.$identifier.should.equal(orderId);

                disputeOrder.dispute = 'Because of bad packaging';
                disputeOrder.order = factory.newRelationship(NS,'Order',newOrder.$identifier);
                disputeOrder.manufacturer = factory.newRelationship(NS,'Manufacturer',manufacturerId);
                disputeOrder.retailer = factory.newRelationship(NS,'Retailer',retailerId);
                disputeOrder.financeCo = factory.newRelationship(NS,'FinanceCo',financeCoId);

                return businessNetworkConnection.submitTransaction(disputeOrder)
                .then(() => {
                    return businessNetworkConnection.getAssetRegistry(NS+'.Order');
                })
                .then((assetRegistry) => {
                    return assetRegistry.get(orderId);
                })
                .then((newOrder) => {
                    JSON.parse(newOrder.status).text.should.equal(orderStatus.Dispute.text);
                })
            })
        });
    });

    describe('#Resolve', () => {
        it('should be able to resolve a dispute' , () => {
            const factory = businessNetworkConnection.getBusinessNetwork().getFactory();

            const resolveOrder = factory.newTransaction(NS,'Resolve');

            return businessNetworkConnection.getAssetRegistry(NS+'.Order')
            .then((assetRegistry) => {
                return assetRegistry.get(orderId);
            })
            .then((newOrder) => {

                newOrder.retailer.$identifier.should.equal(retailerId);
                newOrder.$identifier.should.equal(orderId);

                resolveOrder.resolve = 'Items re-transfored';
                resolveOrder.order = factory.newRelationship(NS,'Order',newOrder.$identifier);
                resolveOrder.manufacturer = factory.newRelationship(NS,'Manufacturer',manufacturerId);
                resolveOrder.retailer = factory.newRelationship(NS,'Retailer',retailerId);
                resolveOrder.financeCo = factory.newRelationship(NS,'FinanceCo',financeCoId);

                return businessNetworkConnection.submitTransaction(resolveOrder)
                .then(() => {
                    return businessNetworkConnection.getAssetRegistry(NS+'.Order');
                })
                .then((assetRegistry) => {
                    return assetRegistry.get(orderId);
                })
                .then((newOrder) => {
                    JSON.parse(newOrder.status).text.should.equal(orderStatus.Resolve.text);
                })
            })
        });
    });

    describe('#RequestPayment', () => {
        it('should be able to Request for payment' , () => {
            const factory = businessNetworkConnection.getBusinessNetwork().getFactory();

            const requestPayment = factory.newTransaction(NS,'RequestPayment');

            return businessNetworkConnection.getAssetRegistry(NS+'.Order')
            .then((assetRegistry) => {
                return assetRegistry.get(orderId);
            })
            .then((newOrder) => {

                newOrder.retailer.$identifier.should.equal(retailerId);
                newOrder.$identifier.should.equal(orderId);

                requestPayment.order = factory.newRelationship(NS,'Order',newOrder.$identifier);
                requestPayment.manufacturer = factory.newRelationship(NS,'Manufacturer',manufacturerId);
                requestPayment.retailer = factory.newRelationship(NS,'Retailer',retailerId);
                requestPayment.financeCo = factory.newRelationship(NS,'FinanceCo',financeCoId);

                return businessNetworkConnection.submitTransaction(requestPayment)
                .then(() => {
                    return businessNetworkConnection.getAssetRegistry(NS+'.Order');
                })
                .then((assetRegistry) => {
                    return assetRegistry.get(orderId);
                })
                .then((newOrder) => {
                    JSON.parse(newOrder.status).text.should.equal(orderStatus.PayRequest.text);
                })
            })
        });
    });

    describe('#AuthorizePayment', () => {
        it('should be able to Aothorise for payment' , () => {
            const factory = businessNetworkConnection.getBusinessNetwork().getFactory();

            const authorizePayment = factory.newTransaction(NS,'AuthorizePayment');

            return businessNetworkConnection.getAssetRegistry(NS+'.Order')
            .then((assetRegistry) => {
                return assetRegistry.get(orderId);
            })
            .then((newOrder) => {

                newOrder.retailer.$identifier.should.equal(retailerId);
                newOrder.$identifier.should.equal(orderId);

                authorizePayment.order = factory.newRelationship(NS,'Order',newOrder.$identifier);
                authorizePayment.retailer = factory.newRelationship(NS,'Retailer',retailerId);
                authorizePayment.financeCo = factory.newRelationship(NS,'FinanceCo',financeCoId);

                return businessNetworkConnection.submitTransaction(authorizePayment)
                .then(() => {
                    return businessNetworkConnection.getAssetRegistry(NS+'.Order');
                })
                .then((assetRegistry) => {
                    return assetRegistry.get(orderId);
                })
                .then((newOrder) => {
                    JSON.parse(newOrder.status).text.should.equal(orderStatus.Authorize.text);
                })
            })
        });
    });

    describe('#Pay', () => {
        it('should be able to Pay' , () => {
            const factory = businessNetworkConnection.getBusinessNetwork().getFactory();

            const pay = factory.newTransaction(NS,'Pay');

            return businessNetworkConnection.getAssetRegistry(NS+'.Order')
            .then((assetRegistry) => {
                return assetRegistry.get(orderId);
            })
            .then((newOrder) => {

                newOrder.retailer.$identifier.should.equal(retailerId);
                newOrder.$identifier.should.equal(orderId);

                pay.order = factory.newRelationship(NS,'Order',newOrder.$identifier);
                pay.manufacturer = factory.newRelationship(NS,'Manufacturer',manufacturerId);
                pay.financeCo = factory.newRelationship(NS,'FinanceCo',financeCoId);

                return businessNetworkConnection.submitTransaction(pay)
                .then(() => {
                    return businessNetworkConnection.getAssetRegistry(NS+'.Order');
                })
                .then((assetRegistry) => {
                    return assetRegistry.get(orderId);
                })
                .then((newOrder) => {
                    JSON.parse(newOrder.status).text.should.equal(orderStatus.Paid.text);
                })
            })
        });
    });

});
