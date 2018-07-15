'use strict';

let orderDiv = 'orderDiv';
let totalAmount = 0;

function loadRetailerUX() {

    let toLoad = 'retailer.html';

    getPort();

    if ((typeof (retailers) === 'undefined') || (retailers === null) || (retailers.length === 0)) {
        $.when($.get(toLoad), $.get('/setup/getPort'), deferredMemberLoad()).done(function (page, port, res) {
            setupRetailer(page[0], port[0]);
        });
    }
    else {
        $.when($.get(toLoad), $.get('/setup/getPort')).done(function (page, port) {
            setupRetailer(page[0], port[0]);
        });
    }
}

function setupRetailer(page, port) {

    $('#body').empty();
    $('#body').append(page);

    msgPort = port.port;

    wsDisplay('retailer_messages', msgPort);

    let _createOrder = $('#newOrder');
    let _listOrder = $('#orderStatus');
    let _stockrooms = $('#stockroomStatus');
    let _customerOrderDetails = $('#customerOrderDetails');
    let _orderDiv = $('#' + orderDiv);

    _createOrder.on('click', function () {
        displayOrderForm();
    });

    _listOrder.on('click', function () {
        listOrders();
    });

    _stockrooms.on('click',function(){
        listStockroom();
    });

    _customerOrderDetails.on('click',function(){
        customerOrderDetails();
    });

    $('#retailer').empty();
    for (let each in retailers) {
        (function (_idx, _arr) {
            $('#retailer').append('<option value="' + _arr[_idx].id + '">' + _arr[_idx].id + '</option>');
        })(each, retailers);
    }

    $('#company')[0].innerText = retailers[0].companyName;

    $('#retailer').on('change', function () {
        _orderDiv.empty(); $('#retailer_messages').empty(); $('#company')[0].innerText = findMember($('#retailer').find(':selected').text(), retailers).companyName;
    });
}

function displayOrderForm() {

    let toLoad = 'createOrder.html';

    let items = [];
    let itemNo = 0;
    let len = -1;
    let newItems = [];
    let option = {};
    let itemTable = {};
    $.when($.get(toLoad)).done(function (page) {
        let _orderDiv = $('#' + orderDiv);
        _orderDiv.empty();
        _orderDiv.append(page);
        $('#manufacturer').empty();
        $('#manufacturer').append(m_string);
        $('#manufacturer').val($('#manufacturer option:first').val());
        $('#financeCo').empty();
        for (let each in financeCos) {
            (function (_idx, _arr) {
                $('#financeCo').append('<option value="' + _arr[_idx].id + '">' + _arr[_idx].id + '</option>');
            })(each, financeCos);
        }

        $('#financeCo').val($('#financeCo option:first').val());
        $('#orderNo').append('xyz');
        $('#status').append('Created');
        $('#today').append(new Date().toISOString());
        $('#amount').append('$'+totalAmount+'.00');

        let _str = '';
        let options = {};
        options.manufacturerId = $('#manufacturer option:first').val();
        options.userID = $('#retailer').find(':selected').val();
        $.when($.post('/composer/client/getProductList',options)).done(function(result){
            for (let i = 0 ; i<result.products.length ; i++){
                _str+='<option value="'+result.products[i].productId+'">'+result.products[i].productName+'</option>'
            }
            $('#items').empty();
            $('#items').append(_str);
            $('#price').append(result.products[0].mrp);
            itemTable = result.products;
        });
        $('#cancelNewOrder').on('click', function () {
            totalAmount = 0;
            _orderDiv.empty();
        });
        $('#submitNewOrder').hide();
        $('#submitNewOrder').on('click', function () {
            let option = {};
            option.retailer = $('#retailer').find(':selected').val();
            option.manufacturer = $('#manufacturer').find(':selected').val();
            option.financeCo = $('#financeCo').find(':selected').val();
            option.items = newItems;
            console.log('New Items = '+newItems);
            option.mrp = $('#mrp').val();
            _orderDiv.empty();
            totalAmount = 0;
            $.when($.post('/composer/client/addOrder', option)).done(function (_res) {
                _orderDiv.empty();
                $('#retailer_messages').prepend(formatMessage(_res.result));
            })
        });
        $('#manufacturer').change(function(){
            let options = {};
            totalAmount = 0;
            var table = $('#item');
            for( ; len>-1 ; len--){
                newItems.shift(1);
            }
            $("#itemTable").find("tr:gt(0)").remove();
            options.manufacturerId = $('#manufacturer').find(':selected').val();
            options.userID = $('#retailer').find(':selected').val();
            option.financeCo = $('#financeCo').find(':selected').val();
            accToggle('productDetail', 'product_b', 'product_h');
            $.when($.post('/composer/client/getProductList',options)).done(function(result){
                itemTable = result.products;
                _str='';
                for (let i = 0 ; i<result.products.length ; i++){
                    _str+='<option value="'+result.products[i].productId+'">'+result.products[i].productName+'</option>'
                }
                $('#items').empty();
                $('#items').append(_str);
                $('#price').empty();
                $('#price').append(result.products[0].mrp);
            });
        });
        $('#items').change(function(){
            $('#price').empty();
            $('#price').append(itemTable.find(x => x.productId ===  $('#items').find(':selected').val()).mrp);
        });

        $('#addItem').on('click', function ()
        {
            len++;
            accToggle('productDetail', 'product_b', 'product_h');
            let _ptr = $('#items').find(':selected').val();
            let _item = itemTable.find(x => x.productId ===  _ptr);
            $('#items').find(':selected').remove();

            _str = '<tr><td>'+_item.productId+'</td><td>'+_item.productName+'</td><td><input type="number" id="count'+len+'"</td><td id="price'+len+'"></td></tr>';
            $('#itemTable').append(_str);

            $('#count'+len).val(1);

            $('#price'+len).append('$'+_item.mrp+'.00');

            let _newItem = _item;
            _newItem.extendedPrice = _item.mrp;
            newItems[len] = _newItem;
            newItems[len].quantity=1;
            totalAmount += _newItem.extendedPrice;

            $('#amount').empty();
            $('#amount').append('$'+totalAmount+'.00');

            $('#count'+len).on('change', function (){
                let len = this.id.substring(5);
                let qty = $('#count'+len).val();
                let price = newItems[len].mrp*qty;
                let delta = price - newItems[len].extendedPrice;
                totalAmount += delta;
                $('#amount').empty();
                $('#amount').append('$'+totalAmount+'.00');
                newItems[len].extendedPrice = price;
                newItems[len].quantity=qty;
                $('#price'+len).empty(); $('#price'+len).append('$'+price+'.00');
            });
            $('#submitNewOrder').show();
        });

        $('#itemDetail').on('click',function(){
            $("#productDetail").empty();
            let _prd = itemTable.find(x => x.productId ===  $('#items').find(':selected').val());
            let _tgl = '';
            _tgl += formatProductDetail(_prd);
            $("#productDetail").append(_tgl);
            accToggle('productDetail', 'product_b', 'product_h');
        });

        $('#product_b').on('click', function () {
            accToggle('productDetail', 'product_b', 'product_h');
        });

    });
}

function formatProductDetail(_prd){

    let _out = '<div class="acc_body off" id="product_b">';
    _out += '<h3 id="status">Product Name : ' + _prd.productName + '</h3>';
    _out += '<table class="wide"><tr><th id="action">Action</th><th id="by">By</th><th id="date">Date</th><th id="comments">Comments</th></tr>';
    _out += '<tr><td>Create Product</td><td>'+_prd.manufacturer+'</td><td>'+_prd.productCreated+'</td><td></td></tr>';
    _out += '<tr><td>Request Approval</td><td>'+_prd.manufacturer+'</td><td>'+_prd.requestApproval+'</td><td></td></tr>';
    _out += '<tr><td>Approve Product</td><td>'+_prd.agriOrganisation+'</td><td>'+_prd.approveProduct+'</td><td>Rating : '+ _prd.rating +'</tr>';
    _out += '</table>';

    _out += '<table class="wide"><tr><th id="contentNo">Sr. No</th><th id="Content">Content</th><th id="percentage">percantage</th></tr>';
    for (let every in _prd.content) {
        (function (_idx2, _arr2) {
            let _item = JSON.parse(_arr2[_idx2]);
            _out += '<tr><td align="center">' + _item.contentNo + '</td><td>' + _item.name + '</td><td>' + _item.percentage + '</td><tr>';
        })(every, _prd.content);
    }
    _out += '</table></div>';
    return _out;
}

function listOrders() {
    let options = {};
    options.id = $('#retailer').find(':selected').text();

    options.userID = options.id;

    $.when($.post('/composer/client/getMyOrders', options)).done(function (_results) {
        if ((typeof (_results.orders) === 'undefined') || (_results.orders === null)) {
            console.log('error getting orders: ', _results);
        }
        else {
            if (_results.orders.length < 1) {
                $('#orderDiv').empty(); $('#orderDiv').append(formatMessage('no product available' + options.id));
            }
            else {
                formatOrders($('#orderDiv'), _results.orders);
            }
        }
    });
}

function formatOrders(_target, _orders) {
    _target.empty();
    let _str = '';
    let _date = '';

    for (let each in _orders) {
        (function (_idx, _arr) {
            let _action = '<th><select id=r_action' + _idx + '><option value="NoAction">Take no Action</option>';

            let r_string;

            r_string = '</th>';

            switch (JSON.parse(_arr[_idx].status).code) {
                case orderStatus.PayRequest.code:
                    _date = _arr[_idx].paymentRequested;
                    _action += '<option value="AuthorizePayment">Authorize Payment</option>';
                    break;
                case orderStatus.Accepted.code:
                    _date = _arr[_idx].disputeResolved + '<br/>' + _arr[_idx].resolve;
                    _action += '<option value="AuthorisePayment">Authorise Payment</option>';
                    break;
                case orderStatus.Created.code:
                    _date = _arr[_idx].created;
                    _action += '<option value="Cancel">Cancel</option>'
                    break;
                case orderStatus.Authorize.code:
                    _date = _arr[_idx].approved;
                    break;
                case orderStatus.Cancelled.code:
                    _date = _arr[_idx].cancelled;
                    break;
                case orderStatus.Paid.code:
                    _date = _arr[_idx].paid;
                    break;
                default:
                    break;
            }

            let _button = '<th><button id="r_btn_' + _idx + '">Execute</button></th>';
            _action += '</select>';

            if (_idx > 0) {
                 _str += '<div class="spacer"></div>';
            }

            _str += '<table class="wide"><tr><th>OrderId</th><th>Status</th><th class="centre">Total</th><th colspan="3" class="right">Manufacturer: '+ findMember(_arr[_idx].manufacturer.split('#')[1], manufacturer).companyName + '</th></tr>';
            _str += '<tr><th id ="r_order' + _idx + '" width="20%">' + _arr[_idx].id + '</th><th width="50%">' + JSON.parse(_arr[_idx].status).text + ': ' + _date + '</th><th class="right">$' + _arr[_idx].amount + '.00</th>' + _action + r_string + _button + '</tr></table>';
            _str += '<table class="wide"><tr align="center"><th>Item Id</th><th>Item Name</th><th>Quantity</th><th>Price</th></tr>'
            for (let every in _arr[_idx].items) {
                (function (_idx2, _arr2) {
                    let _item = JSON.parse(_arr2[_idx2]);
                    _str += '<tr><td align="center" width="20%">' + _item.productId + '</td><td width="50%">' + _item.productName + '</td><td align="center">' + _item.quantity + '</td><td align="right">$' + _item.extendedPrice + '.00</td><tr>';
                })(every, _arr[_idx].items);
            }
            _str += '</table>';
        })(each, _orders);
    }

    _target.append(_str);
    for (let each in _orders) {
        (function (_idx, _arr) {
            $('#r_btn_' + _idx).on('click', function () {
                let options = {};
                options.action = $('#r_action' + _idx).find(':selected').text();
                options.orderId = $('#r_order' + _idx).text();
                options.participant = $('#retailer').val();
                if ((options.action === 'Dispute') || (options.action === 'Resolve')) {
                    options.reason = $('#r_reason' + _idx).val();
                }
                $('#retailer_messages').prepend(formatMessage('Processing ' + options.action + ' for order :' + options.orderId));
                $.when($.post('/composer/client/orderAction', options)).done(function (_results) {
                    $('#retailer_messages').prepend(formatMessage(_results.result));
                });
            });
        })(each, _orders)
    }
}

function listStockroom(){
    let options = {};
    options.id = $('#retailer').find(':selected').text();

    options.userID = options.id;

    $.when($.post('/composer/client/getMyStockrooms', options)).done(function (_results) {
        if ((typeof (_results.stockrooms) === 'undefined') || (_results.stockrooms === null)) {
            console.log('error getting stockrooms: ', _results);
        }
        else {
            console.log(_results.stockrooms);
            if (_results.stockrooms.length < 1) {
                $('#orderDiv').empty(); $('#orderDiv').append(formatMessage('no product available' + options.id));
            }
            else {
                formatRetailerStockrooms($('#orderDiv'), (_results.stockrooms));
            }
        }
    });
}

function formatRetailerStockrooms(_target,_stock){
    _target.empty();
    let _str = '';
    let _date = '';
    for (let each in _stock) {
        (function (_idx, _arr) {
           
            if (_idx > 0) { _str += '<div class="spacer"></div>'; }
            _str += '<div class="acc_header off" id="f_stockroom' + _idx + '_h" target="f_stockroom' + _idx + '_b"><table class="wide"><tr><th>Product Name</th><th class="right">Total Quantity</th></tr>';
            _str += '<tr><th id ="f_stockroom' + _idx + '" class="showFocus" width="20%">' + JSON.parse(_arr[_idx]).ProductName + '</th><th class="right">' + JSON.parse(_arr[_idx]).Quantity + '</th></tr></table></div>';
            
            _str += formatStockroomDetail(_idx, (_arr[_idx]));
        })(each, _stock);
    }
    _target.append(_str);
    for (let each in _stock) {
        (function (_idx, _arr) {
            $('#f_stockroom' + _idx).on('click', function () {
                accToggle('orderDiv', 'f_stockroom' + _idx + '_b', 'f_stockroom' + _idx + '_h');
            });
            $('#f_stockroom' + _idx + '_b').on('click', function () {
                accToggle('orderDiv', 'f_stockroom' + _idx + '_b', 'f_stockroom' + _idx + '_h');
            });
        })(each, _stock);
    }
}

function formatStockroomDetail(_cur,_stockroom){
    let _out = '<div class="acc_body off" id="f_stockroom' + _cur + '_b">';
    let _stockrooms = (JSON.parse(_stockroom));

    for(var j=0;j<_stockrooms.Inventory.length;j++){
        _out += '<h3>Manufacturer : \t' + _stockrooms.Inventory[j].Manufacturer + '\t\t Quantity: '+ _stockrooms.Inventory[j].Quantity +'</h3>';
        _out += '<table class="wide"><tr><th>BatchID</th><th>MFG Date</th><th>quantity</th></tr>';
        for(var i=0 ; i<_stockrooms.Inventory[j].Batches.length ; i++){
            _out += '<tr><td>'+ _stockrooms.Inventory[j].Batches[i].BatchId +'</td><td>' + _stockrooms.Inventory[j].Batches[i].MFGDate + '</td><td>' + _stockrooms.Inventory[j].Batches[i].Quantity + '</td></tr>';
        }
        _out += '</table>'
    }
    _out += '</div>'
    return _out;
}

function customerOrderDetails(){
    let options = {};

    options.id = $('#retailer').find(':selected').text();

    options.userID = options.id;

    $.when($.post('/composer/client/getMyCustomerOrders', options)).done(function (_results) {
        if ((typeof (_results.orders) === 'undefined') || (_results.orders === null)) {
            console.log('error getting orders: ', _results);
        }
        else {
            if (_results.orders.length < 1) {
                $('#orderDiv').empty(); $('#orderDiv').append(formatMessage('no product available' + options.id));
            }
            else {
                formatCustomerOrder($('#orderDiv'), _results.orders);
            }
        }
    });

}

function formatCustomerOrder(_target, _orders) {
    _target.empty();
    let _str = '';
    let _date = '';

    for (let each in _orders) {
        (function (_idx, _arr) {
            let _action = '<th><select id=rc_action' + _idx + '><option value="NoAction">Take no Action</option>';

            let r_string;

            r_string = '</th>';

            switch (JSON.parse(_arr[_idx].status).code) {
                case orderStatus.PayRequest.code:
                    _date = _arr[_idx].paymentRequested;
                    break;
                case orderStatus.Accepted.code:
                    _date = _arr[_idx].accepted;
                    _action += '<option value="PayRequest">Request Payment</option>';
                    break;
                case orderStatus.Created.code:
                    _date = _arr[_idx].created;
                    _action += '<option value="AcceptOrder">Accept Order</option>';
                    break;
                case orderStatus.Authorize.code:
                    _date = _arr[_idx].approved;
                    break;
                case orderStatus.Cancelled.code:
                    _date = _arr[_idx].cancelled;
                    break;
                case orderStatus.Paid.code:
                    _date = _arr[_idx].paid;
                    break;
                default:
                    break;
            }
            let _button = '<th><button id="rc_btn_' + _idx + '">Execute</button></th>';
            _action += '</select>';

            if (_idx > 0) {
                 _str += '<div class="spacer"></div>';
            }

            _str += '<table class="wide"><tr><th>OrderId</th><th>Status</th><th class="centre">Total</th><th colspan="3" class="right">Customer : '+ findMember(_arr[_idx].customer.split('#')[1], customers).companyName + '</th></tr>';
            _str += '<tr><th id ="rc_order' + _idx + '" width="20%">' + _arr[_idx].id + '</th><th width="50%">' + JSON.parse(_arr[_idx].status).text + ': ' + _date + '</th><th class="right">$' + _arr[_idx].amount + '.00</th>' + _action + r_string + _button + '</tr></table>';
            _str += '<table class="wide"><tr align="center"><th>Product Name</th><th>Manufacturer Name</th><th>Quantity</th><th>Price</th></tr>'
            console.log(_arr[_idx].items);
            let itms = (_arr[_idx].items);
            for (let every in itms) {
                (function (_idx2, _arr2) {
                    let _item = JSON.parse(_arr2[_idx2]);
                    _str += '<tr><td align="center" width="20%">' + _item.ProductName + '</td><td width="50%">' + _item.Manufacturer + '</td><td align="center">' + _item.Quantity + '</td><td align="right">$' + (_item.Quantity*_item.MRP) + '.00</td><tr>';
                })(every, itms);
            }
            _str += '</table>';
        })(each, _orders);
    }

    _target.append(_str);
    for (let each in _orders) {
        (function (_idx, _arr) {
            $('#rc_btn_' + _idx).on('click', function () {
                let options = {};
                options.action = $('#rc_action' + _idx).find(':selected').text();
                options.retailer = $('#retailer').val();
                options.orderId = $('#rc_order' + _idx).text();
                options.participant = $('#retailer').val();
                if ((options.action === 'Dispute') || (options.action === 'Resolve')) {
                    options.reason = $('#rc_reason' + _idx).val();
                }
                $('#retailer_messages').prepend(formatMessage('Processing ' + options.action + ' for order :' + options.orderId));
                $.when($.post('/composer/client/customerOrderAction', options)).done(function (_results) {
                    $('#retailer_messages').prepend(formatMessage(_results.result));
                });
            });
        })(each, _orders)
    }
}