'use strict';
/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var productStatus = {
    ProductCreated: {code: 1,text: 'Product Created'},
    RequestApproval: {code: 2,text: 'Product Approval Requested'},
    ApproveProduct: {code: 3,text: 'Product Approved'},
    RejectProduct: {code: 4, text: 'Product Rejected'}
};

var orderStatus = {
    Created: {code: 1, text: 'Order Created'},
    Bought: {code: 2, text: 'Order Purchased'},
    Cancelled: {code: 3, text: 'Order Cancelled'},
    Ordered: {code: 4, text: 'Order Placed'},
    Delivered: {code: 6, text: 'Order Delivered'},
    Delivering: {code: 15, text: 'Order being Delivered'},
    Dispute: {code: 8, text: 'Order Disputed'},
    Resolve: {code: 9, text: 'Order Dispute Resolved'},
    PayRequest: {code: 10, text: 'Payment Requested'},
    Authorize: {code: 11, text: 'Payment Approved'},
    Paid: {code: 14, text: 'Payment Processed'},
    Refund: {code: 12, text: 'Order Refund Requested'},
    Refunded: {code: 13, text: 'Order Refunded'}
};

/**
 * @param {org.acme.agriinputnetwork.CreateProduct} creation
 * @transaction
 */
function CreateProduct(creation){
    creation.product.manufacturer = creation.manufacturer;
    creation.product.productName = creation.productName;
    creation.product.content = creation.content;
    creation.product.productType = creation.productType;
    creation.product.bestBefore = creation.bestBefore;
    creation.product.agriOrganisation = creation.agriOrganisation;
    creation.product.mrp = creation.mrp;
    creation.product.status = JSON.stringify(productStatus.ProductCreated);
    creation.product.productCreated = new Date().toISOString();
    //console.log(creation.product);
    return getAssetRegistry('org.acme.agriinputnetwork.Product')
    .then(function (assetRegistry) {
        return assetRegistry.update(creation.product);
    });
}

/**
 * @param {org.acme.agriinputnetwork.RequestApproval} creation
 * @transaction
 */
function RequestApproval(creation){

    creation.product.agriOrganisation = creation.agriOrganisation;
    creation.product.requestApproval = new Date().toISOString();
    creation.product.status = JSON.stringify(productStatus.RequestApproval);
    return getAssetRegistry('org.acme.agriinputnetwork.Product')
    .then(function (assetRegistry) {
        return assetRegistry.update(creation.product);
    });
}

/**
 * @param {org.acme.agriinputnetwork.ApproveProduct} creation
 * @transaction
 */
function ApproveProduct(creation){

    if((JSON.parse(creation.product.status).text === productStatus.RequestApproval.text)){
        creation.product.approved = creation.approved;
        creation.product.rating = creation.rating;
        creation.product.approveProduct = new Date().toISOString();
        creation.product.status = JSON.stringify(productStatus.ApproveProduct);
        return getAssetRegistry('org.acme.agriinputnetwork.Product')
        .then(function (assetRegistry) {
            return assetRegistry.update(creation.product);
        });
    }
}


/**
 * @param {org.acme.agriinputnetwork.RejectProduct} creation
 * @transaction
 */
function RejectProduct(creation){
    creation.product.approved = false;
    creation.product.rejectProduct = new Date().toISOString();
    creation.product.status = JSON.stringify(productStatus.RejectProduct);
    return getAssetRegistry('org.acme.agriinputnetwork.Product')
    .then(function (assetRegistry) {
        return assetRegistry.update(creation.product);
    });
}

/**
 * @param {org.acme.agriinputnetwork.ManufactureProduct} creation
 * @transaction
 */
function ManufactureProduct(creation){
    if(creation.product.approved){
        var _batch = creation.product.batches;
        //_batch[_batch.length] = '{"batchId":"'+new Date().toString+'", "Quantity":'+creation.quantity+', "mfgDate":"'+new Date().toISOString+'", "mfgDate":"'+new Date().toISOString+'"}';
        var _id = creation.product.productId.toString();
        _id += new Date().valueOf().toString();
        var _mfgDate = new Date().toString();
        _batch.push('{"batchId":"'+_id+'","quantity":'+creation.quantity+',"mfgDate":"'+_mfgDate+'"}');
        creation.product.batches = _batch;
        creation.product.totalQuantity = creation.product.totalQuantity + creation.quantity;
        return getAssetRegistry('org.acme.agriinputnetwork.Product')
        .then(function (assetRegistry) {
            return assetRegistry.update(creation.product);
        });
    }
}


/**
* @param {org.acme.agriinputnetwork.CreateOrder} purchase
* @transaction
*/
function CreateOrder(purchase) {
    purchase.order.retailer = purchase.retailer;
    purchase.order.amount = purchase.amount;
    purchase.order.created = new Date().toISOString();
    //var _items = ['{"productId":"006","quantity":150},{"productId":"007","quantity":350}'];
    purchase.order.items = purchase.items;
    purchase.order.financeCo = purchase.financeCo;
    purchase.order.manufacturer = purchase.manufacturer;
    purchase.order.status = JSON.stringify(orderStatus.Created);
    return getAssetRegistry('org.acme.agriinputnetwork.Order')
    .then(function (assetRegistry) {
        return assetRegistry.update(purchase.order);
    });
}

/**
* @param {org.acme.agriinputnetwork.CancelOrder} purchase
* @transaction
*/
function CancelOrder(purchase){
    if((purchase.order.status = JSON.stringify(orderStatus.Created) || (purchase.order.status = JSON.stringify(orderStatus.Bought)))){
        purchase.order.retailer = purchase.retailer;
        purchase.order.manufacturer = purchase.manufacturer;
        purchase.order.status = JSON.stringify(orderStatus.Cancelled);
        purchase.order.cancelled = new Date().toISOString();
        return getAssetRegistry('org.acme.agriinputnetwork.Order')
        .then(function (assetRegistry){
            assetRegistry.update(purchase.order);
        });
    }
}

/**
 * @param {org.acme.agriinputnetwork.PlaceOrder} purchase
 * @transaction
 */
function PlaceOrder(purchase){

    if (purchase.order.status === JSON.stringify(orderStatus.Created)){
        purchase.order.manufacturer = purchase.manufacturer;
        purchase.order.retailer = purchase.retailer;
        purchase.order.ordered = new Date().toISOString();
        purchase.order.status = JSON.stringify(orderStatus.Bought);
        console.log('Reaches Here');
        return getAssetRegistry('org.acme.agriinputnetwork.Order')
        .then(function (assetRegistry){
            return assetRegistry.update(purchase.order);
        });
    }
}

/**
 * @param {org.acme.agriinputnetwork.AcceptOrder} purchase
 * @transaction
 */
function AcceptOrder(purchase){
    if(purchase.order.status === JSON.stringify(orderStatus.Bought)){
        purchase.order.status = JSON.stringify(orderStatus.Ordered);
        purchase.order.manufacturer = purchase.manufacturer;
        purchase.order.accepted = new Date().toISOString();
        var i=0;
        var quantity = 0;
        var productList;
        return getAssetRegistry('org.acme.agriinputnetwork.Product')
        .then(function (assetRegistry){
            return assetRegistry.getAll()
            .then(function(allProduct){
                console.log(allProduct.find(function(x){
                    return x.$identifier ==='006';
                }));
                while(i !== (purchase.order.items).length ){
                    var id = JSON.parse(purchase.order.items[i]).productId;
                    var newProduct = allProduct.find(function(x){
                        return x.$identifier === id;
                    });
                    console.log(newProduct.totalQuantity);
                    //newProduct.totalQuantity =  20;
                    quantity = JSON.parse(purchase.order.items[i]).quantity;
                    console.log(quantity);
                    if(newProduct.totalQuantity > quantity){
                        while(quantity !== 0){
                            if(JSON.parse(newProduct.batches[0]).quantity <= quantity){
                                console.log('Reaches here');
                                quantity -= JSON.parse(newProduct.batches[0]).quantity;
                                newProduct.totalQuantity -= JSON.parse(newProduct.batches[0]).quantity;
                                console.log(quantity);
                                newProduct.batches.shift();
                            }
                            else{
                                var jsn = JSON.parse(newProduct.batches[0]);
                                jsn.quantity -= quantity;
                                newProduct.batches[0] = JSON.stringify(jsn);
                                newProduct.totalQuantity -= quantity;
                                console.log(quantity);
                                quantity = 0;
                            }
                        }
                        i+=1;
                    }
                }
                return getAssetRegistry('org.acme.agriinputnetwork.Product')
                .then(function(assetRegistry){
                    return assetRegistry.updateAll(allProduct);
                });
            });
        })
        .then(function(){
            console.log('asd');
            return getAssetRegistry('org.acme.agriinputnetwork.Order');
        })
        .then(function(assetRegistry){
            console.log('asdfghjkl');
            return assetRegistry.update(purchase.order);
        });
    }
}

/**
 * @param {org.acme.agriinputnetwork.Delivering} purchase
 * @transaction
 */
function Delivering(purchase){

    if(purchase.order.status === JSON.stringify(orderStatus.Ordered)){
        purchase.order.delivering = new Date().toISOString();
        var _str = orderStatus.Delivering;
        _str.text += '' + purchase.status;
        //purchase.order.deliveryStatus = purchase.deliveryStatus;
        purchase.order.status = JSON.stringify(_str);
        return getAssetRegistry('org.acme.agriinputnetwork.Order')
        .then(function (assetRegistry){
            return assetRegistry.update(purchase.order);
        });
    }
}


/**
 * @param {org.acme.agriinputnetwork.Deliver} purchase
 * @transaction
 */
function Deliver(purchase){

    if(JSON.parse(purchase.order.status).code === orderStatus.Delivering.code){
        purchase.order.delivered = new Date().toISOString();
        purchase.order.status = JSON.stringify(orderStatus.Delivered);
        return getAssetRegistry('org.acme.agriinputnetwork.Order')
        .then(function (assetRegistry){
            return assetRegistry.update(purchase.order);
        });
    }
}

/**
 * @param {org.acme.agriinputnetwork.Dispute} Purchase
 * @transaction
 */
function Dispute(purchase){
    if(purchase.order.status === JSON.stringify(orderStatus.Delivered) || purchase.order.status === JSON.stringify(orderStatus.PayRequest)){
        purchase.order.status = JSON.stringify(orderStatus.Dispute);
        purchase.order.disputeOpened = new Date().toISOString();
        purchase.order.dispute = purchase.dispute;
        purchase.order.retailer = purchase.retailer;
        purchase.order.financeCo = purchase.financeCo;
        return getAssetRegistry('org.acme.agriinputnetwork.Order')
        .then(function (assetRegistry){
            return assetRegistry.update(purchase.order);
        });
    }
}

/**
 * @param {org.acme.agriinputnetwork.Resolve} purchase
 * @transaction
 */
function Resolve(purchase){
    if(purchase.order.status === JSON.stringify(orderStatus.Dispute)){
        purchase.order.status = JSON.stringify(orderStatus.Resolve);
        purchase.order.disputeResolved = new Date().toISOString();
        return getAssetRegistry('org.acme.agriinputnetwork.Order')
        .then(function (assetRegistry){
            return assetRegistry.update(purchase.order);
        });
    }
}

/**
 * @param {org.acme.agriinputnetwork.RequestPayment} purchase
 * @transaction
 */
function RequestPayment(purchase){
    if ((JSON.parse(purchase.order.status).text === orderStatus.Delivered.text) || (JSON.parse(purchase.order.status).text === orderStatus.Resolve.text)){
        purchase.order.status = JSON.stringify(orderStatus.PayRequest);
        purchase.order.financeCo = purchase.financeCo;
        purchase.order.retailer = purchase.retailer;
        purchase.order.paymentRequested = new Date().toISOString();
        return getAssetRegistry('org.acme.agriinputnetwork.Order')
        .then(function (assetRegistry){
            return assetRegistry.update(purchase.order);
        });
    }
}

/**
 * @param {org.acme.agriinputnetwork.AuthorizePayment} purchase
 * @transaction
 */
function AuthorizePayment(purchase){
    if(JSON.parse(purchase.order.status).text === orderStatus.PayRequest.text || JSON.parse(purchase.order.status).text === orderStatus.Delivered.text || (JSON.parse(purchase.order.status).text === orderStatus.Resolve.text )){
        purchase.order.status = JSON.stringify(orderStatus.Authorize);
        purchase.order.approved = new Date().toISOString();
        return getAssetRegistry('org.acme.agriinputnetwork.Order')
        .then(function (assetRegistry){
            return assetRegistry.update(purchase.order);
        });
    }
}

/**
 * @param {org.acme.agriinputnetwork.Pay} purchase
 * @transaction
 */
function Pay(purchase){
    if(JSON.parse(purchase.order.status).text === orderStatus.Authorize.text){
        purchase.order.status = JSON.stringify(orderStatus.Paid);
        purchase.order.paid = new Date().toISOString();
        return getAssetRegistry('org.acme.agriinputnetwork.Order')
        .then(function (assetRegistry){
            return assetRegistry.update(purchase.order);
        });
    }
}

/**
 * @param {org.acme.agriinputnetwork.Refund} purchase
 * @transaction
 */
function Refund(purchase){
    if(JSON.parse(purchase.order.status).text === orderStatus.Dispute.text){
        purchase.order.status = JSON.stringify(orderStatus.Refund);
        purchase.order.refund = purchase.refund;
        purchase.order.orderRefunded = new Date().toISOString();
        return getAssetRegistry('org.acme.agriinputnetwork.Order')
        .then(function (assetRegistry){
            return assetRegistry.update(purchase.order);
        });
    }
}