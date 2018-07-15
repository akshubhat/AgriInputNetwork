'use strict';

let financeCOorderDiv = 'financeCOorderDiv';
let orders = [];
const financeCoID = 'bogrod@gringotts.com';

function loadFinanceCoUX() {
    let toLoad = 'financeCo.html';
    getPort();
    if ((typeof (retailers) === 'undefined') || (retailers === null) || (retailers.length === 0)) {
        $.when($.get(toLoad), $.get('/setup/getPort'), deferredMemberLoad()).done(function (page, port, res) {
            setupFinanceCo(page[0], port[0]);
        });
    }
    else {
        $.when($.get(toLoad), $.get('/setup/getPort')).done(function (page, port) {
            setupFinanceCo(page[0], port[0]);
        });
    }
}

function setupFinanceCo(page, port) {
    $('#body').empty();
    $('#body').append(page);
    //updatePage('financeCo');
    //console.log('port is: ' + port.port);
    msgPort = port.port;
    wsDisplay('finance_messages', msgPort);
    let _clear = $('#financeCOclear');
    let _list = $('#financeCOorderStatus');
    let _orderDiv = $('#' + financeCOorderDiv);
    _clear.on('click', function () {
        _orderDiv.empty();
    });
    _list.on('click', function () {
        listFinanceOrders();
    });

    $('#financeCoField').empty();
    for (let each in financeCos) {
        (function (_idx, _arr) {
            $('#financeCoField').append('<option value="' + _arr[_idx].id + '">' + _arr[_idx].id + '</option>');
        })(each, financeCos);
    }

    $('#company')[0].innerText = financeCos[0].companyName;

    $('#financeCoField').on('change', function () {
        _orderDiv.empty(); $('#finance_messages').empty(); $('#company')[0].innerText = findMember($('#financeCoField').find(':selected').text(), financeCos).companyName;
    });
}

function listFinanceOrders() {
    let options = {};
    options.id = $('#financeCoField').find(':selected').val();
    options.userID = options.id;
    $.when($.post('/composer/client/getMyOrders', options)).done(function (_results) {
        //console.log(_results.result);
        //console.log(_results.orders);
        if (_results.orders.length < 1) {
            $('#' + financeCOorderDiv).empty(); $('#' + financeCOorderDiv).append(formatMessage('No orders for the financeCo: ' + options.id));
        }
        else {
            orders = _results.orders;
            //console.log(orders);
            formatFinanceOrders($('#' + financeCOorderDiv), orders);
        }
    });
}


function formatFinanceOrders(_target, _orders) {
    _target.empty();
    let _str = '';
    let _date = '';
    for (let each in _orders) {
        (function (_idx, _arr) {
            let _action = '<th><select id=f_action' + _idx + '><option value="NoAction">No Action</option>';
            //
            // each f_order can have different states and the action that a financier can take is directly dependent on the state of the f_order.
            // this switch/case table displays selected f_order information based on its current status and displays selected actions, which
            // are limited by the sate of the f_order.
            //
            // Throughout this code, you will see many different objects referemced by 'textPrompts.orderProcess.(something)'
            // These are the text strings which will be displayed in the browser and are retrieved from the prompts.json file
            // associated with the language selected by the web user.
            //
            switch (JSON.parse(_arr[_idx].status).code) {
                case orderStatus.PayRequest.code:
                    _date = _arr[_idx].paymentRequested;
                    break;
                case orderStatus.Created.code:
                    _date = _arr[_idx].created;
                    break;
                case orderStatus.Cancelled.code:
                    _date = _arr[_idx].cancelled;
                    break;
                case orderStatus.Authorize.code:
                    _date = _arr[_idx].approved;
                    _action += '<option value="Pay">Pay</option>';
                    break;
                case orderStatus.Accepted.code:
                    _date = _arr[_idx].accepted;
                    break;
                case orderStatus.Paid.code:
                    _date = _arr[_idx].paid;
                    break;
                default:
                    break;
            }
            let _button = '<th><button id="f_btn_' + _idx + '">Execute</button></th>'
            _action += '</select>';
            if (_idx > 0) { _str += '<div class="spacer"></div>'; }
            _str += '<div class="acc_header off" id="f_order' + _idx + '_h" target="f_order' + _idx + '_b"><table class="wide"><tr><th>Order #</th><th>Status</th><th class="right">Total</th><th colspan="3" class="right">retailer: ' + findMember(_arr[_idx].retailer.split('#')[1], retailers).companyName + '</th></tr>';
            _str += '<tr><th id ="f_order' + _idx + '" class="showFocus" width="20%">' + _arr[_idx].id + '</th><th width="50%">' + JSON.parse(_arr[_idx].status).text + ': ' + _date + '</th><th class="right">$' + _arr[_idx].amount + '.00</th>' + _action + '</th>' + _button + '</tr></table></div>';
            _str += formatFinanceDetail(_idx, _arr[_idx]);
        })(each, _orders);
    }

    _target.append(_str);
    for (let each in _orders) {
        (function (_idx, _arr) {
            $('#f_order' + _idx).on('click', function () {
                accToggle('financeCOorderDiv', 'f_order' + _idx + '_b', 'f_order' + _idx + '_h');
            });
            $('#f_order' + _idx + '_b').on('click', function () {
                accToggle('financeCOorderDiv', 'f_order' + _idx + '_b', 'f_order' + _idx + '_h');
            });
            $('#f_btn_' + _idx).on('click', function () {
                let options = {};
                options.action = $('#f_action' + _idx).find(':selected').text();
                options.orderId = $('#f_order' + _idx).text();
                options.participant = $('#financeCoField').find(':selected').text();
                //console.log(options);
                $('#finance_messages').prepend(formatMessage('Processing ' + options.action + ' request for f_order number: ' + options.orderId));
                $.when($.post('/composer/client/orderAction', options)).done(function (_results) {
                    //console.log(_results);
                    $('#finance_messages').prepend(formatMessage(_results.result));
                });
            });
        })(each, _orders);
    }
}

function formatFinanceDetail(_cur, _order) {
    //console.log('[' + _cur + '] is ', _order);
    let _out = '<div class="acc_body off" id="f_order' + _cur + '_b">';
    _out += '<h3>Order Status : \t' + JSON.parse(_order.status).text + '</h3>';
    _out += '<table class="wide"><tr><th>Status</th><th>By</th><th>Date</th><th>Comments</th></tr>';
    _out += '<tr><td>Created</td><td>' + _order.retailer + '</td><td>' + _order.created + '</td><td></td></tr>';
    _out += (_order.cancelled === '') ? '<tr><td>Cancelled?</td><td></td><td>Not yet Cancelled</td><td></td></tr>' : '<tr><td>Cancelled</td><td>' + _order.retailer + '</td><td>' + _order.cancelled + '</td><td></td></tr>';
    _out += (_order.accepted === '') ? '<tr><td>Order Accepted</td><td></td><td>Order Pending</td><td></td></tr>' : '<tr><td>Order Accepted</td><td>' + _order.manufacturer + '</td><td>' + _order.accepted + '</td><td></td></tr>';
    _out += (_order.paymentRequested === '') ? '<tr><td>Payment Requested</td><td></td><td>Not yet requested</td><td></td></tr>' : '<tr><td>Payment Requested</td><td>'+_order.retailer+'</td><td>' + _order.paymentRequested + '</td><td></td></tr>';
    _out += (_order.approved === '') ? '<tr><td>Payment Approved</td><td></td><td>(No Approval from retailer)</td><td></td></tr>' : '<tr><td>Payment Approved</td><td>' + _order.retailer + '</td><td>' + _order.approved + '</td><td></td></tr>';
    _out += (_order.paid === '') ? '<tr><td>Paid</td><td></td><td>(UnPaid)</td><td></td></tr></table></div>' : '<tr><td>Paid</td><td>' + _order.financeCo + '</td><td>' + _order.paid + '</td><td></td></tr></table></div>';
    return _out;
}
