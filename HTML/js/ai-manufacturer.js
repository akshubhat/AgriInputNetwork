'use strict';

let productDiv = 'productDiv';

function loadManufacturerUX() {

    let toLoad = 'manufacturer.html';
    // get the port to use for web socket communications with the server
    getPort();
    // if (manufacturers.length === 0) then autoLoad() was not successfully run before this web app starts, so the sie of the manufacturer list is zero
    // assume user has run autoLoad and rebuild member list
    // if autoLoad not yet run, then member list length will still be zero
    //console.log('manufacturer load clicked');
    if ((typeof (manufacturer) === 'undefined') || (manufacturer === null) || (manufacturer.length === 0)) {
        $.when($.get(toLoad), $.get('/setup/getPort'), deferredMemberLoad()).done(function (page, port, res) {
            setupManufacturer(page[0], port[0]);
        });
    }
    else {
        $.when($.get(toLoad), $.get('/setup/getPort')).done(function (page, port) {
            setupManufacturer(page[0], port[0]);
        });
    }
}

function setupManufacturer(page, port) {
    // empty the hetml element that will hold this page
    $('#body').empty();
    $('#body').append(page);
    // update the text on the page using the prompt data for the selected language
    //updatePage('manufacturer');
    msgPort = port.port;
    // connect to the web socket and tell the web socket where to display messages
    wsDisplay('manufacturer_messages', msgPort);
    // enable the buttons to process an onClick event
    //console.log('qwerty');
    let _createProduct = $('#newProduct');
    let _listProduct = $('#productStatus');
    let _listOrder = $('#orderStatus');
    let _productDiv = $('#' + productDiv);
    _createProduct.on('click', function () {
        displayProductForm();
    });
    _listProduct.on('click', function () {
        listProducts();
    });
    _listOrder.on('click', function () {
        listManufacturerOrder();
    })
    $('#manufacturer').empty();
    //console.log(manufacturer);
    // build the buer select HTML element
    for (let each in manufacturer) {
        (function (_idx, _arr) {
            $('#manufacturer').append('<option value="' + _arr[_idx].id + '">' + _arr[_idx].id + '</option>');
        })(each, manufacturer);
    }
    // display the name of the current manufacturer
    $('#company')[0].innerText = manufacturer[0].companyName;
    // create a function to execute when the user selects a different manufacturer
    $('#manufacturer').on('change', function () {
        _productDiv.empty(); $('#manufacturers_messages').empty(); $('#company')[0].innerText = findMember($('#manufacturer').find(':selected').text(), manufacturer).companyName;
    });

}

function displayProductForm() {

    let toLoad = 'createProduct.html'
    let contents = [];
    let contentNo = 0;
    $.when($.get(toLoad)).done(function (page) {
        let _productDiv = $('#' + productDiv);
        _productDiv.empty();
        _productDiv.append(page);
        //console.log(ao_string);
        $('#agriOrg').empty();
        $('#agriOrg').append(ao_string);
        $('#agriOrg').val($('#agriOrg option:first').val());
        $('#productId').append('abc');
        $('#status').append('Created');
        $('#today').append(new Date().toISOString());
        $('#approved').append('False');

        $('#cancelNewProduct').on('click', function () { _productDiv.empty(); });
        $('#submitNewProduct').hide();
        $('#submitNewProduct').on('click', function () {
            let option = {};
            option.agriOrganisation = $('#agriOrg').find(':selected').val();
            option.manufacturer = $('#manufacturer').find(':selected').val();
            option.productName = $('#productName').val();
            option.content = contents;
            option.productType = $('#productType').val();
            option.bestBefore = $('#bestBefore').val();
            option.mrp = $('#mrp').val();
            //console.log(option);
            _productDiv.empty();

            $.when($.post('/composer/client/addProduct', option)).done(function (_res) {
                _productDiv.empty();
                $('#manufacturer_messages').append(formatMessage(_res.result));
                //console.log(_res);
            })
        });

        $('#addContent').on('click', function () {

            let _str = '{"contentNo":"';
            _str += ++contentNo;
            _str += '","name":"' + $('#contentName').val();
            _str += '","percentage":"' + $('#contentPercentage').val() + '"}'
            contents.push(_str);
            //console.log(contents);
            let _html = '';
            _html += '<tr><td>' + contentNo + '</td><td>' + $('#contentName').val() + '</td><td>' + $('#contentPercentage').val() + '</td></tr>';
            $('#contentTable').append(_html);
        });
        $('#submitNewProduct').show();
    })
}

function listProducts() {
    let option = {};
    option.id = $('#manufacturer').find(':selected').text();
    //console.log(option.id);
    option.userId = option.id;
    $.when($.post('/composer/client/getMyProducts', option)).done(function (_result) {
        //console.log('_result');
        if ((typeof (_result.Products) === 'undefined') || _result.Products === null) {
            console.log('error getting Products: ', _result);
        }
        else {
            if (_result.Products.length < 1) {
                $('#productDiv').empty(); $('#productDiv').append(formatMessage('no product available'));
            }
            else {
                //console.log(_result.Products);
                formatproduct($('#productDiv'), _result.Products);
            }
        }
    })

}

function formatproduct(_target, _products) {

    _target.empty();
    let _str = '';
    let _date = '';
    for (let each in _products) {
        (function (_idx, _arr) {
            let _action = '<th><select id=mp_action' + _idx + '><option value="NoAction">Take no Action</option>';

            let r_string;
            r_string = '</th>';

            switch (JSON.parse(_arr[_idx].status).code) {

                case productStatus.ProductCreated.code:
                    _date = _arr[_idx].productCreated;
                    _action += '<option value="RequestApproval">Request Approval</option>';
                    break;
                case productStatus.RequestApproval.code:
                    _date = _arr[_idx].requestApproval;
                    break;
                case productStatus.ApproveProduct.code:
                    _date = _arr[_idx].approveProduct;
                    _action += '<option value="ManufactureProduct">Manufacture Product</option>';
                    r_string = '<br/>Quantity<input id="m_quantity' + _idx + '" type="number"></input></th>';
                    break;
                case productStatus.RejectProduct.code:
                    _date = _arr[_idx].rejectProduct;
                default:
                    break;
            }
            let _button = '<th><button id="m_btn_' + _idx + '">Execute</button></th>';
            _action += '</select>';
            if (_idx > 0) {
                _str += '<div class="spacer"></div>';
            }
            _str += '<div class="acc_header off" id="product' + _idx + '_h" target="product' + _idx + '_b">';
            _str += '<table class="wide"><tr><th>ProductId</th><th>Status</th><th class="centre">Approved</th><th colspan="3" class="right">Org: ' + findMember(_arr[_idx].agriOrganisation.split('#')[1], agriOrgs).companyName + '</th></tr>';
            _str += '<tr><th id ="m_product' + _idx + '" class="showFocus" width="20%">' + _arr[_idx].id + '</th><th width="50%">' + JSON.parse(_arr[_idx].status).text + ': ' + _date + '</th><th class="centre">' + _arr[_idx].approved + '</th>' + _action + r_string + _button + '</tr></table>';
            _str += '<table class="wide"><tr align="center"><th>Sr. no</th><th>Content Name</th><th>Percentage</th></tr>';

            for (let every in _arr[_idx].content) {
                (function (_idx2, _arr2) {
                    let _item = JSON.parse(_arr2[_idx2]);
                    _str += '<tr><td align="center" width="20%">' + _item.contentNo + '</td><td width="50%">' + _item.name + '</td><td align="right">' + _item.percentage + '</td><tr>';
                })(every, _arr[_idx].content);
            }
            _str += '</table></div>';
            if (_arr[_idx].approved) {
                
                _str += formatDetail(_idx, _arr[_idx]);
                //console.log(_str);
            }
        })(each, _products);
    }
    _target.append(_str);

    for (let each in _products) {
        (function (_idx, _arr) {
            $('#m_product' + _idx).on('click', function () {
                console.log("comes here");
                accToggle('productDiv', 'product' + _idx + '_b', 'product' + _idx + '_   h');
            });
            $('#product' + _idx + '_b').on('click', function () {
                console.log("comesor or here");
                accToggle('productDiv', 'product' + _idx + '_b', 'product' + _idx + '_h');
            });
            $('#m_btn_' + _idx).on('click', function () {
                let option = {};
                option.action = $('#mp_action' + _idx).find(':selected').text();
                option.productId = $('#m_product' + _idx).text();
                //console.log(option.productId);
                option.participant = $('#manufacturer').val();
                //option.agriOrg = _arr[_idx].agriOrganisation;

                if (option.action === 'Manufacture Product') {
                    option.quantity = parseInt($('#m_quantity' + _idx).val());
                }
                $('#manufacturer_messages').prepend(formatMessage(option.action + 'for' + option.productId + 'Requested'));
                $.when($.post('/composer/client/productAction', option)).done(function (_result) {
                    $('#manufacturer_messages').prepend(formatMessage(_result.result));
                });
            });
        })(each, _products)
    }
}

function formatDetail(_cur, _product) {
    //console.log('['+_cur+'] is ',_product);

    console.log('It should work');
    let _out = '<div class="acc_body off" id="product' + _cur + '_b">';
    _out += '<h3 id="status">Current quantity : ' + _product.totalQuantity + '</h3>';
    _out += '<table class="wide"><tr><th id="batchid">Batch ID</th><th id="by">By</th><th id="date">Date</th><th id="quantity">Quantity</th></tr>';
    for (let every in _product.batches) {
        (function (_idx2, _arr2) {
            let _item = JSON.parse(_arr2[_idx2]);
            _out += '<tr><td align="center">' + _item.batchId + '</td><td>' + _product.manufacturer + '</td><td>' + _item.mfgDate + '</td><td>' + _item.quantity + '</td><tr>';
        })(every, _product.batches);
    }
    _out += '</table></div>'

    return _out;
}

function listManufacturerOrder() {
    let options = {};
    // get the users email address
    options.id = $('#manufacturer').find(':selected').text();

    options.userID = options.id;

    $.when($.post('/composer/client/getMyOrders', options)).done(function (_results) {
        if ((typeof (_results.orders) === 'undefined') || (_results.orders === null)) {
            console.log('error getting orders: ', _results);
        }
        else {// if they have no orders, then display a message to that effect
            if (_results.orders.length < 1) {
                $('#productDiv').empty(); $('#productDiv').append(formatMessage('no product available' + options.id));
            }
            // if they have orders, format and display the orders.
            else {
                formatManufacturerOrders($('#productDiv'), _results.orders);
            }
        }
    });
}

function formatManufacturerOrders(_target, _orders) {
    _target.empty();
    let _str = '';
    let _date = '';

    for (let each in _orders) {
        (function (_idx, _arr) {
            let _action = '<th><select id=mo_action' + _idx + '><option value="NoAction">Take no Action</option>';

            let r_string;

            r_string = '</th>';

            switch (JSON.parse(_arr[_idx].status).code) {
                case orderStatus.Bought.code:
                    _date = _arr[_idx].ordered;
                    _action += '<option value="AcceptOrder">Accept Order</option>';
                    break;
                case orderStatus.PayRequest.code:
                    _date = _arr[_idx].paymentRequested;
                    break;
                case orderStatus.Delivered.code:
                    _date = _arr[_idx].delivered;
                    _action += '<option value="PayRequest">Request Payment</option>';
                    break;
                case orderStatus.Dispute.code:
                    _date = _arr[_idx].disputeOpened + '<br/>' + _arr[_idx].dispute;
                    _action += '<option value="Resolve">Resolve</option>';
                    _action += '<option value="Refund">Refund</option>';
                    r_string = '<br/>Reason for Resolution or refund : <input id="mo_reason' + _idx + '" type="text"></input></th>';
                    break;
                case orderStatus.Resolve.code:
                    _date = _arr[_idx].disputeResolved + '<br/>' + _arr[_idx].resolve;
                    _action += '<option value="PayRequest">Request Payment</option>';
                    break;
                case orderStatus.Delivering.code:
                    _date = _arr[_idx].delivering;
                    _action += '<option value="Delivering">Update Delivery Status</option>';
                    _action += '<option value="Delivered">Delivered</option>';
                    r_string = '<br/>Delivery Status : <input id="mo_reason' + _idx + '" type="text"></input></th>';
                    break;
                case orderStatus.Ordered.code:
                    _date = _arr[_idx].ordered;
                    _action += '<option value="Delivering">Update Delivery Status</option>';
                    r_string = '<br/>Delivery Status : <input id="mo_reason' + _idx + '" type="text"></input></th>';
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

            let _button = '<th><button id="mo_btn_' + _idx + '">Execute</button></th>';
            _action += '</select>';

            if (_idx > 0) {
                _str += '<div class="spacer"></div>';
            }
            //console.log(_date);
            _str += '<table class="wide"><tr><th>OrderId</th><th>Status</th><th class="centre">Total</th><th colspan="3" class="right">Retailer: ' + _arr[_idx].retailer.companyName + '</th></tr>';
            _str += '<tr><th id ="mo_order' + _idx + '" width="20%">' + _arr[_idx].id + '</th><th width="50%">' + JSON.parse(_arr[_idx].status).text + ': ' + _date + '</th><th class="right">$' + _arr[_idx].amount + '.00</th>' + _action + r_string + _button + '</tr></table>';
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
    // append the newly built order table to the web page
    _target.append(_str);
    //
    // now that the page has been placed into the browser, all of the id tags created in the previous routine can now be referenced.
    // iterate through the page and make all of the different parts of the page active.
    //
    for (let each in _orders) {
        (function (_idx, _arr) {
            $('#mo_btn_' + _idx).on('click', function () {
                let options = {};
                options.action = $('#mo_action' + _idx).find(':selected').text();
                options.orderId = $('#mo_order' + _idx).text();
                options.participant = $('#manufacturer').val();
                if ((options.action === 'Dispute') || (options.action === 'Resolve')) {
                    options.reason = $('#mo_reason' + _idx).val();
                }
                if ((options.action === 'Update Delivery Status')) {
                    options.delivery = $('#mo_reason' + _idx).val();
                }
                $('#retailer_messages').prepend(formatMessage('Processing' + options.action + 'for order :' + options.orderId));
                $.when($.post('/composer/client/orderAction', options)).done(function (_results) {
                    $('#retailer_messages').prepend(formatMessage(_results.result));
                });
            });
        })(each, _orders)
    }
}
