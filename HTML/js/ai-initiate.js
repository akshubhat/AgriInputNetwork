'use strict';

let connectionProfileName = 't-test-profile';
let networkFile = 'agricultureinput-network.bna';
let businessNetwork = 'agricultureinput-network';

let retailers, manufacturer, agriOrgs, financeCos;
let m_string, ao_string, fc_string;//sstr,pstr,shstr

let productStatus = {
    ProductCreated: {code: 1,text: 'Product Created'},
    RequestApproval: {code: 2,text: 'Product Approval Requested'},
    ApproveProduct: {code: 3,text: 'Product Approved'},
    RejectProduct: {code: 4, text: 'Product Rejected'}
};

let orderStatus = {
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

function initPage ()
{
    
    // singleUX loads the members already present in the network
    memberLoad();
    // goChainEvents creates a web socket connection with the server and initiates blockchain event monitoring
    getChainEvents();
}
