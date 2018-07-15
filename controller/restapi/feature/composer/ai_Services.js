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
        _inbound.paymentRequested = '';
        _inbound.paid = '';
        _inbound.approved = '';
        _inbound.manufacturer = '';
        _inbound.retailer = '';
        _inbound.financeCo = '';
        return(_inbound);
    },

    createCustomerOrderTemplate: function (_inbound)
    {
        _inbound.customerOrderId = '';
        _inbound.amount = 0;
        _inbound.items = [];
        _inbound.status = JSON.stringify(this.orderStatus.Created);
        _inbound.created = new Date().toISOString();
        _inbound.cancelled = '';
        _inbound.accepted = '';
        _inbound.paymentRequested = '';
        _inbound.paid = '';
        _inbound.approved = '';
        _inbound.customer = '';
        _inbound.retailer = '';
        _inbound.financeCo = '';
        return(_inbound);
    },

createStockroomTemplate: function (_inbound)
    {
        _inbound.stockroomId = '';
        _inbound.stock = [];
        _inbound.retailer = '';
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
        _inbound.batches = [];
        _inbound.archive = [];
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
    // console.log('CREATING PRODUCT');
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
        //console.log('ADDING');
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

addStockroom: function (_con, _stockroom, _registry, _bnc)
    {
        return _registry.add(_stockroom)
        .then(() => {
            _con.sendUTF('Stockroom : '+_stockroom.stockroomId+' successfully added');
        })
        .catch((error) => {
        if (error.message.search('MVCC_READ_CONFLICT') != -1)
            {
                console.log(_stockroom.stockroomId+" addAsset retrying assetRegistry.add for: "+_stockroom.stockroomId);
                this.addStockroom(_con,_stockroom, _registry, _bnc);
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
    Cancelled: {code: 2, text: 'Order Cancelled'},
    Accepted: {code: 3, text: 'Order Placed'},
    PayRequest: {code: 4, text: 'Payment Requested'},
    Authorize: {code: 5, text: 'Payment Approved'},
    Paid: {code: 6, text: 'Payment Processed'}
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
        _this.m_socket.on('request', function(request)
        {
            _this.m_connection = request.accept(null, request.origin);
            // console.log("Its' port : "+port + "\nm_socket:"+_this.m_socket+" \nm_socketAddr: "+_this.m_socketAddr + " \nm_connection: "+_this.m_connection + ' \nrequest.origine: ' + request.origin);
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
