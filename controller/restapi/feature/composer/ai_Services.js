'use strict';
var fs = require('fs');
var path = require('path');
const sleep = require('sleep');

const ws = require('websocket');
const http = require('http');
const express = require('express');
const app = express();
const cfenv = require('cfenv');
const appEnv = cfenv.getAppEnv();
app.set('port', appEnv.port);


var  Demo  = {


createOrderTemplate: function (_inbound)
    {
        _inbound.orderId = '';
        _inbound.amount = 0;
        _inbound.items = [];
        _inbound.status = JSON.stringify(this.orderStatus.Created);
        _inbound.created = new Date().toISOString();
        _inbound.cancelled = '';
        _inbound.accepted = '';
        _inbound.ordered = '';
        _inbound.delivered = '';
        _inbound.delivering = '';
        _inbound.disputeOpened = '';
        _inbound.disputeResolved = '';
        _inbound.orderRefunded = '';
        _inbound.paymentRequested = '';
        _inbound.paid = '';
        _inbound.approved = '';
        _inbound.dispute = '';
        _inbound.resolve = '';
        _inbound.refund = '';
        _inbound.manufacturer = '';
        _inbound.retailer = '';
        _inbound.financeCo = '';
        return(_inbound);
    },

createProductTemplate: function(_inbound)
    {
        _inbound.productId ='';
        _inbound.productName ='';
        _inbound.productType = '';
        _inbound.approved =false;
        _inbound.rating ='';
        _inbound.mrp = 0;
        _inbound.subsidy = 0;
        _inbound.batches = [];
        _inbound.content = [];
        _inbound.status = JSON.stringify(this.productStatus.ProductCreated);
        _inbound.requestApproval = '';
        _inbound.rejectProduct = '';
        _inbound.approveProduct = '';
        _inbound.productCreated = '';
        _inbound.totalQuantity = 0;
        _inbound.bestBefore = '0 Month';
        _inbound.manufacturer = '';
        _inbound.agriOrganisation = '';
        return(_inbound);
    },


loadTransaction: function (_con, _item, _id, businessNetworkConnection)
{
    console.log('CREATING PRODUCT');
    //console.log(_item);
    return businessNetworkConnection.submitTransaction(_item)
    .then(() => {
        console.log('loadTransaction: '+_id+' successfully added'); 
        _con.sendUTF('loadTransaction: '+_id+' successfully added');
    })
    .catch((error) => {
        if (error.message.search('MVCC_READ_CONFLICT') != -1)
            {sleep.sleep(5);
                console.log(_id+" loadTransaction retrying submit transaction for: "+_id);
                this.loadTransaction(_con,_item, _id, businessNetworkConnection);
            }
            else{
                console.log('Error : '+ error);
            }
        });
},

addOrder: function (_con, _order, _registry, _createNew, _bnc)
    {
        return _registry.add(_order)
        .then(() => {
            this.loadTransaction(_con,_createNew, _order.orderId, _bnc);
        })
        .catch((error) => {
        if (error.message.search('MVCC_READ_CONFLICT') != -1)
            {console.log(_order.orderId+" addAsset retrying assetRegistry.add for: "+_order.orderId);
            this.addOrder(_con,_order, _registry, _createNew, _bnc);
            }
            else {console.log('error with assetRegistry.add', error)}
        });
    },

addProduct: function (_con, _product, _registry, _createNew, _bnc)
    {   
        console.log('ADDING');
        return _registry.add(_product)
        .then(() => {
            this.loadTransaction(_con,_createNew, _product.productId, _bnc);
        })
        .catch((error) => {
        if (error.message.search('MVCC_READ_CONFLICT') != -1)
            {
                console.log(_product.productId+" addAsset retrying assetRegistry.add for: "+_product.productId);
                this.addProduct(_con,_product, _registry, _createNew, _bnc);
            }
            else {console.log('error with assetRegistry.add', error)}
        });
    },

productStatus: {
        ProductCreated: {code: 1,text: 'Product Created'},
        RequestApproval: {code: 2,text: 'Product Approval Requested'},
        ApproveProduct: {code: 3,text: 'Product Approved'},
        RejectProduct: {code: 4, text: 'Product Rejected'}
    },
    
orderStatus: {
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
    },


m_connection: null,
m_socketAddr: null,
m_socket: null,
createMessageSocket: function (_port)
{
    var port = (typeof(_port) == 'undefined' || _port == null) ? app.get('port')+1 : _port
    if (this.m_socket == null)
    {
        this.m_socketAddr = port;
        this.m_socket= new ws.server({httpServer: http.createServer().listen(this.m_socketAddr)});
        var _this = this;            
        this.m_socket.on('request', function(request) 
        {
            _this.m_connection = request.accept(null, request.origin);
            _this.m_connection.on('message', function(message)
            {
                console.log(message.utf8Data);
                _this.m_connection.sendUTF('connected');
                _this.m_connection.on('close', function(m_connection) {console.log('m_connection closed'); });
            });
        });
    }
    return {conn: this.m_connection, socket: this.m_socketAddr};
},
/**
* the cs_connection is used to display blockchain information to the web browser over
* a sepaarate port from the user experience socket.
*/

cs_connection: null,
cs_socketAddr: null,
cs_socket: null,
createChainSocket: function ()
{
    var port =  app.get('port')+2;
    if (this.cs_socket == null)
    {
        this.cs_socketAddr = port;
        this.cs_socket= new ws.server({httpServer: http.createServer().listen(this.cs_socketAddr)});
        var _this = this;            
        this.cs_socket.on('request', function(request) 
        {
            _this.cs_connection = request.accept(null, request.origin);
            _this.cs_connection.on('message', function(message)
            {
                console.log(message.utf8Data);
                _this.cs_connection.sendUTF('connected');
                _this.cs_connection.on('close', function(cs_connection) {console.log('cs_connection closed'); });
            });
        });
    }
    return {conn: this.cs_connection, socket: this.cs_socketAddr};
}

}

module.exports = Demo;