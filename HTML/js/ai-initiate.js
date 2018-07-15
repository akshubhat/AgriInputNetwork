'use strict';

let connectionProfileName = 't-test-profile';
let networkFile = 'agricultureinput-network.bna';
let businessNetwork = 'agricultureinput-network';

let retailers, manufacturer, agriOrgs, financeCos, customers;
let m_string, ao_string,r_string, fc_string, c_string;//sstr,pstr,shstr

let productStatus = {
    ProductCreated: {code: 1,text: 'Product Created'},
    RequestApproval: {code: 2,text: 'Product Approval Requested'},
    ApproveProduct: {code: 3,text: 'Product Approved'},
    RejectProduct: {code: 4, text: 'Product Rejected'}
};

let orderStatus = {
    Created: {code: 1, text: 'Order Created'},
    Cancelled: {code: 2, text: 'Order Cancelled'},
    Accepted: {code: 3, text: 'Order Placed'},
    PayRequest: {code: 4, text: 'Payment Requested'},
    Authorize: {code: 5, text: 'Payment Approved'},
    Paid: {code: 6, text: 'Payment Processed'}
};

function initPage ()
{

    // singleUX loads the members already present in the network
    memberLoad();
    // goChainEvents creates a web socket connection with the server and initiates blockchain event monitoring
    getChainEvents();
}
