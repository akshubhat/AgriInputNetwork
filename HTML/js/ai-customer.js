'use strict';

let customerOrderDiv = 'customerOrderDiv';
let finalAmount = 0;

function loadCustomerUX() {

    let toLoad = 'customer.html';

    getPort();

    if ((typeof (customers) === 'undefined') || (customers === null) || (customers.length === 0)) {
        $.when($.get(toLoad), $.get('/setup/getPort'), deferredMemberLoad()).done(function (page, port, res) {
            setupCustomer(page[0], port[0]);
        });
    }
    else {
        $.when($.get(toLoad), $.get('/setup/getPort')).done(function (page, port) {
            setupCustomer(page[0], port[0]);
        });
    }
}

function setupCustomer(page, port) {

    $('#body').empty();
    $('#body').append(page);

    msgPort = port.port;

    wsDisplay('customer_messages', msgPort);

    let _createOrder = $('#newCustomerOrder');
    let _listOrder = $('#customerOrderStatus');
    let _checkTimeline = $('#checkTimeline');
    let _customerOrderDiv = $('#' + customerOrderDiv);

    _createOrder.on('click', function () {
        displayCustomerOrderForm();
    });

    _listOrder.on('click', function () {
        listCustomerOrders();
    });

    _checkTimeline.on('click',function(){
        checkTimeline();
    });

    $('#customer').empty();
    for (let each in customers) {
        (function (_idx, _arr) {
            $('#customer').append('<option value="' + _arr[_idx].id + '">' + _arr[_idx].id + '</option>');
        })(each, customers);
    }

    $('#company')[0].innerText = customers[0].companyName;

    $('#customer').on('change', function () {
        _customerOrderDiv.empty(); $('#customerOrder_messages').empty(); $('#company')[0].innerText = findMember($('#customer').find(':selected').text(), customers).companyName;
    });
}

function displayCustomerOrderForm() {

    let toLoad = 'createCustomerOrder.html';

    let items = [];
    let itemNo = 0;
    let len = -1;
    let newItems = [];
    let option = {};
    let itemTable = [];
    $.when($.get(toLoad)).done(function (page) {
        let _customerOrderDiv = $('#' + customerOrderDiv);
        _customerOrderDiv.empty();
        _customerOrderDiv.append(page);
        $('#retailerField').empty();
        $('#retailerField').append(r_string);
        $('#retailerField').val($('#retailerField option:first').val());
        $('#financeCoOrder').empty();
        for (let each in financeCos) {
            (function (_idx, _arr) {
                $('#financeCoOrder').append('<option value="' + _arr[_idx].id + '">' + _arr[_idx].id + '</option>');
            })(each, financeCos);
        }

        $('#financeCoOrder').val($('#financeCoOrder option:first').val());
        $('#orderNo').append('xyz');
        $('#status').append('Created');
        $('#today').append(new Date().toISOString());
        $('#amount').append('$'+finalAmount+'.00');

        let _str = '';
        let options = {};
        options.retailerId = $('#retailerField').find(':selected').val();
        options.customerId = $('#customer').find(':selected').val();
        options.userID = $('#customer').find(':selected').val();
        //complete
        $.when($.post('/composer/client/getStockroomList',options)).done(function(result){
            console.log('result : ');
            console.log(result);
            for (let i = 0 ; i<result.stockroom[0].stock.length ; i++){
                _str+='<option value="'+ JSON.parse(result.stockroom[0].stock[i]).ProductName+'">'+JSON.parse(result.stockroom[0].stock[i]).ProductName+'</option>'
            }
            
            $('#selectProduct').empty();
            $('#selectProduct').append(_str);
            for(let val=0;val < result.stockroom[0].stock.length ; val++){
                itemTable.push(JSON.parse(result.stockroom[0].stock[val]));
            }
            console.log(itemTable);
            let prd = $('#selectProduct').find(':selected').val();
            
            let inventory = itemTable.find(x => x.ProductName === prd);
            console.log(inventory);
            _str = '';
            for (let i = 0 ; i<inventory.Inventory.length ; i++){
                _str+='<option value="'+ inventory.Inventory[i].Manufacturer+'">'+inventory.Inventory[i].Manufacturer+'</option>'
            }
            $('#selectInventory').empty();
            $('#selectInventory').append(_str);
            let man = $('#selectInventory').find(':selected').val();
            
            $('#mrp').append((inventory.Inventory.find(x => x.Manufacturer === man)).MRP);

            //$('#selectInventory').empty();
            
        });
        //complete
        $('#cancelNewCustomerOrder').on('click', function () {
            finalAmount = 0;
            _customerOrderDiv.empty();
        });
        $('#submitNewCustomerOrder').hide();
        $('#submitNewCustomerOrder').on('click', function () {
            let option = {};
            option.customer = $('#customer').find(':selected').val();
            option.retailer = $('#retailerField').find(':selected').val();
            option.financeCo = $('#financeCoOrder').find(':selected').val();
            option.items = newItems;
            console.log('New Items = ');
            console.log(newItems);
            option.mrp = $('#mrp').val();
            //console.log(option);
            _customerOrderDiv.empty();
            finalAmount = 0;
            $.when($.post('/composer/client/addCustomerOrder', option)).done(function (_res) {
                _customerOrderDiv.empty();
                $('#customerOrder_messages').append(formatMessage(_res.result));
                //console.log(_res);
            })
        });
        //complete
        $('#retailerField').change(function(){
            let options = {};
            finalAmount = 0;
            //console.log("Comes here");
            //$('#itemTable').empty();
            //var table = $('#item');
            for( ; len>-1 ; len--){
                newItems.shift(1);
                //len--;
            }
            $("#availableItemTable").find("tr:gt(1)").remove();
            options.retailerId = $('#retailerField').find(':selected').val();
            options.userID = $('#customer').find(':selected').val();
            option.financeCo = $('#financeCo').find(':selected').val();
            accToggle('stockDetail', 'stock_b', 'stock_h');
            $.when($.post('/composer/client/getStockroomList',options)).done(function(result){
                console.log('result : ');
                console.log(result);
                for (let i = 0 ; i<result.stockroom[0].stock.length ; i++){
                    _str+='<option value="'+ JSON.parse(result.stockroom[0].stock[i]).ProductName+'">'+JSON.parse(result.stockroom[0].stock[i]).ProductName+'</option>'
                }
                
                $('#selectProduct').empty();
                $('#selectProduct').append(_str);
                for(let val=0;val < result.stockroom[0].stock.length ; val++){
                    itemTable.push(JSON.parse(result.stockroom[0].stock[val]));
                }
                console.log(itemTable);
                let prd = $('#selectProduct').find(':selected').val();
                
                let inventory = itemTable.find(x => x.ProductName === prd);
                console.log(inventory);
                _str = '';
                for (let i = 0 ; i<inventory.Inventory.length ; i++){
                    _str+='<option value="'+ inventory.Inventory[i].Manufacturer+'">'+inventory.Inventory[i].Manufacturer+'</option>'
                }
                $('#selectInventory').empty();
                $('#selectInventory').append(_str);
                let man = $('#selectInventory').find(':selected').val();
                
                $('#mrp').append((inventory.Inventory.find(x => x.Manufacturer === man)).MRP);
    
            });
        });
        $('#selectProduct').change(function(){
            $('#selectInventory').empty();
            $('#mrp').empty();
            $("#stockDetail").empty();
            let prd = $('#selectProduct').find(':selected').val();
            let _item = itemTable.find(x => x.ProductName ===  prd);
            //let _item = _item1.Inventory.find(x=>x.Manufacturer === $('#selectInventory').find(':selected').val());
            let _str = '';
            for (let i = 0 ; i<_item.Inventory.length ; i++){
                _str+='<option value="'+ _item.Inventory[i].Manufacturer+'">'+_item.Inventory[i].Manufacturer+'</option>'
            }
            //$('#selectInventory').empty();
            $('#selectInventory').append(_str);
            //let _ptr = $('#selectProduct').find(':selected').val();
            //let man = $('#selectInventory').find(':selected').val();
            let _item1 = _item.Inventory.find(x=>x.Manufacturer === $('#selectInventory').find(':selected').val());
            $('#mrp').append(_item1.MRP);
        });
        $('#selectInventory').change(function(){
            $('#mrp').empty();
            $("#stockDetail").empty();
            //let man = $('#selectInventory').find(':selected').val();
            let _ptr = $('#selectProduct').find(':selected').val();
            let _item1 = itemTable.find(x => x.ProductName ===  _ptr);
            let _item = _item1.Inventory.find(x=>x.Manufacturer === $('#selectInventory').find(':selected').val());
            $('#mrp').append(_item.MRP);
        });

        $('#addProduct').on('click', function ()
        {
            len++;
            accToggle('productDetails', 'stock_b', 'stock_h');
            let _ptr = $('#selectProduct').find(':selected').val();
            // remove the just selected item so that it cannot be added twice.

            // build a new item detail row in the display window
            let _item1 = itemTable.find(x => x.ProductName ===  _ptr);
            let _item = _item1.Inventory.find(x=>x.Manufacturer === $('#selectInventory').find(':selected').val())
            
            $('#selectInventory').find(':selected').remove();
            if($('#selectInventory').length == 0){
                $('#selectProduct').find(':selected').remove();
            }
            //let len = itemTable.length-1;
            _str = '<tr><td>'+_item1.ProductName+'</td><td>'+_item.Manufacturer+'</td><td><input type="number" id="count'+len+'"</td><td id="price'+len+'"></td></tr>';
            $('#availableItemTable').append(_str);
            // set the initial item count to 1
            $('#count'+len).val(1);
            // set the initial price to the price of one item
            $('#price'+len).append('$'+_item.MRP+'.00');
            // add an entry into an array for this newly added item
            let _newItem ={};
            _newItem.extendedPrice = _item.MRP;
            newItems[len] = _newItem;
            newItems[len].Manufacturer = _item.Manufacturer;
            newItems[len].Quantity=1;
            newItems[len].ProductName = _item1.ProductName;
            newItems[len].MRP = _item.MRP;
            finalAmount += _newItem.extendedPrice;
            // update the customerOrder amount with this new item
            $('#amount').empty();
            $('#amount').append('$'+finalAmount+'.00');
            // function to update item detail row and total amount if itemm count is changed
            $('#count'+len).on('change', function (){
                let len = this.id.substring(5);
                let qty = $('#count'+len).val();
                let price = newItems[len].MRP*qty;
                let delta = price - newItems[len].extendedPrice;
                finalAmount += delta;
                $('#amount').empty();
                $('#amount').append('$'+finalAmount+'.00');
                newItems[len].extendedPrice = parseInt(price);
                newItems[len].Quantity=parseInt(qty);
                $('#price'+len).empty(); $('#price'+len).append('$'+price+'.00');
            });
            $('#submitNewCustomerOrder').show();
        });
        //complete
        $('#productDetails').on('click',function(){
            $("#stockDetail").empty();
            let _prdt = itemTable.find(x => x.ProductName ===  $('#selectProduct').find(':selected').val());
            let _prd = _prdt.Inventory.find(x => x.Manufacturer === $('#selectInventory').find(':selected').val());
            let _tgl = '';
            _tgl += formatProductDetails(_prd);
            $("#stockDetail").append(_tgl);
            accToggle('stockDetail', 'stock_b', 'stock_h');
        });
        $('#stock_b').on('click', function () {
            accToggle('stockDetail', 'stock_b', 'stock_h');
        });
    });
}

function formatProductDetails(_prd){

    let _out = '<div class="acc_body off" id="stock_b">';
    _out += '<h3 id="status">Total Quantity : ' + _prd.Quantity + '</h3>';
    _out += '<table class="wide"><tr><th id="action">BatchId</th><th id="by">Date</th><th id="date">Quantity</th></tr>';
    for(let i = 0 ; i< _prd.Batches.length ; i++){
        _out += '<tr><td>'+ _prd.Batches[i].BatchId +'</td><td>'+ _prd.Batches[i].MFGDate +'</td><td>'+_prd.Batches[i].Quantity+'</td></tr>';
    }
    _out += '</table></div>';
    return _out;

}

function listCustomerOrders() {
    let options = {};
    // get the users email address
    options.id = $('#customer').find(':selected').text();

    options.userID = options.id;

    $.when($.post('/composer/client/getMyCustomerOrders', options)).done(function (_results) {
        if ((typeof (_results.orders) === 'undefined') || (_results.orders === null)) {
            console.log('error getting customerOrders: ', _results);
        }
        else {// if they have no orders, then display a message to that effect
            if (_results.orders.length < 1) {
                $('#customerOrderDiv').empty(); $('#customerOrderDiv').append(formatMessage('no product available' + options.id));
            }
            // if they have customerOrders, format and display the customerOrders.
            else {
                console.log(_results.orders);
                formatCustomerOrders($('#customerOrderDiv'), _results.orders);
            }
        }
    });
}

function formatCustomerOrders(_target, _customerOrders) {
    _target.empty();
    let _str = '';
    let _date = '';
    console.log(_customerOrders);
    for (let each in _customerOrders) {
        (function (_idx, _arr) {
            let _action = '<th><select id=c_action' + _idx + '><option value="NoAction">Take no Action</option>';

            let r_string;

            r_string = '</th>';

            switch (JSON.parse(_arr[_idx].status).code) {
                case orderStatus.PayRequest.code:
                    _date = _arr[_idx].paymentRequested;
                    _action += '<option value="AuthorizePayment">Authorize Payment</option>';
                    break;
                case orderStatus.Accepted.code:
                    _date = _arr[_idx].accepted;
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

            let _button = '<th><button id="c_btn_' + _idx + '">Execute</button></th>';
            _action += '</select>';

            if (_idx > 0) {
                 _str += '<div class="spacer"></div>';
            }

            _str += '<table class="wide"><tr><th>OrderId</th><th>Status</th><th class="centre">Total</th><th colspan="3" class="right">Retailer: '+ findMember(_arr[_idx].retailer.split('#')[1], retailers).companyName + '</th></tr>';
            _str += '<tr><th id ="c_order' + _idx + '" width="20%">' + _arr[_idx].id + '</th><th width="50%">' + JSON.parse(_arr[_idx].status).text + ': ' + _date + '</th><th class="right">$' + _arr[_idx].amount + '.00</th>' + _action + r_string + _button + '</tr></table>';
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
        })(each, _customerOrders);
    }
    // append the newly built customerOrder table to the web page
    _target.append(_str);
    //
    // now that the page has been placed into the browser, all of the id tags created in the previous routine can now be referenced.
    // iterate through the page and make all of the different parts of the page active.
    //
    for (let each in _customerOrders) {
        (function (_idx, _arr) {
            $('#c_btn_' + _idx).on('click', function () {
                let options = {};
                options.action = $('#c_action' + _idx).find(':selected').text();
                options.orderId = $('#c_order' + _idx).text();
                options.participant = $('#customer').find(':selected').val();
                if ((options.action === 'Dispute') || (options.action === 'Resolve')) {
                    options.reason = $('#c_reason' + _idx).val();
                }
                $('#customerOrder_messages').prepend(formatMessage('Processing ' + options.action + ' for customerOrder :' + options.orderId));
                $.when($.post('/composer/client/customerOrderAction', options)).done(function (_results) {
                    $('#customerOrder_messages').prepend(formatMessage(_results.result));
                });
            });
        })(each, _customerOrders)
    }
}

function checkTimeline(){

    let toLoad = 'timeline.html';

    $.when($.get(toLoad)).done(function(page){
        let _customerOrderDiv = $('#' + customerOrderDiv);
        _customerOrderDiv.empty();
        _customerOrderDiv.append(page);
        $('#retailerIdField').empty();
        $('#retailerIdField').append(r_string);
        $('#retailerIdField').val($('#retailerField option:first').val());


        $('#go').on('click',function(){
            let option = {};
            option.retailer = $('#retailerIdField').find(':selected').val();
            option.batchId = $('#IdInput').val();
            option.participant = $('#customer').find(':selected').val();
            $('#customerOrder_messages').prepend(formatMessage('Processing check Timeline for batch :' + option.batchId));
            $.when($.post('/composer/client/checkTimeline', option)).done(function (_results) {
                console.log((_results.order));
                if(_results.result === 'fail'){
                    var str = '';
                    str+='<h1>Not found</h1>';
                    $('#verificationDiv').append(str);
                }
                else{
                    var str = '';
                    str += '<table class="wide"><tr><th>Action</th><th>By</th><th>Date</th><th>Comment</th></tr>';
                    
                    str += '<tr><td>Create Product</td><td>'+_results.order.manufacturer+'</td><td>'+JSON.parse(_results.order.items).productCreated+'</td><td></td></tr>';
                    str += '<tr><td>Request Approval</td><td>'+_results.order.manufacturer+'</td><td>'+JSON.parse(_results.order.items).requestApproval+'</td><td></td></tr>';
                    str += '<tr><td>Approved Product</td><td>'+JSON.parse(_results.order.items).agriOrganisation+'</td><td>'+JSON.parse(_results.order.items).approveProduct+'</td><td>'+JSON.parse(_results.order.items).rating+'</td></tr>';
                    str += '<tr><td>Product Manufactured</td><td>'+_results.order.manufacturer+'</td><td>'+JSON.parse(JSON.parse(_results.order.items).batches[_results.j]).mfgDate+'</td><td></td></tr>';
                    str += '<tr><td>Create Order</td><td>'+_results.order.retailer+'</td><td>'+_results.order.created+'</td><td></td></tr>';
                    str += '<tr><td>Accept Order</td><td>'+_results.order.manufacturer+'</td><td>'+ _results.order.created +'</td><td></td></tr>';
                    str += '<tr><td>Request Payment</td><td>'+(((_results.order.paymentRequested) !== '') ? (_results.order.manufacturer +'</td><td>'+ _results.order.paymentRequested +'</td><td></td></tr>') : ('</td><td></td><td>Not yet Requested</td></tr>'));
                    str += '<tr><td>Approve Payment</td><td>'+(((_results.order.approved) !== '') ? (_results.order.retailer +'</td><td>'+ _results.order.approved +'</td><td></td></tr>') : ('</td><td></td><td>Not yet Authorized</td></tr>'));
                    str += '<tr><td>Paid</td><td>'+(((_results.order.paid) !== '') ? (_results.order.financeCo +'</td><td>'+ _results.order.paid +'</td><td></td></tr>') : ('</td><td></td><td>Not yet Paid</td></tr>'));
                    if(typeof(_results.k) === 'undefined'){
                        str += '</table>'
                    }
                    else{
                        str += '<tr><td>Create Order</td><td>'+_results.cOrder.customer+'</td><td>'+_results.cOrder.created+'</td><td></td></tr>';
                        str += '<tr><td>Accept Order</td><td>'+_results.cOrder.retailer+'</td><td>'+_results.cOrder.retailer+'</td><td></td></tr>';
                        str += '<tr><td>Request Payment</td><td>'+(((_results.cOrder.paymentRequested) !== '') ? (_results.cOrder.retailer +'</td><td>'+ _results.cOrder.paymentRequested +'</td><td></td></tr>') : ('</td><td></td><td>Not yet Requested</td></tr>'));
                        str += '<tr><td>Approve Payment</td><td>'+(((_results.cOrder.approved) !== '') ? (_results.cOrder.customer +'</td><td>'+ _results.cOrder.approved +'</td><td></td></tr>') : ('</td><td></td><td>Not yet Authorized</td></tr>'));
                        str += '<tr><td>Paid</td><td>'+(((_results.cOrder.paid) !== '') ? (_results.cOrder.financeCo +'</td><td>'+ _results.cOrder.paid +'</td><td></td></tr>') : ('</td><td></td><td>Not yet Paid</td></tr>'));    
                    }

                    $('#verificationDiv').append(str);
                }
            });
        });
    });
}