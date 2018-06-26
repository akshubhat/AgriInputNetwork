'use strict';

let aoProductDiv = 'aoProductDiv';

function loadAgriOrgUX(){
    //console.log('agri org clicked');
    let toLoad = 'agriOrganisation.html'
    getPort();
    
    if ((typeof(agriOrgs) === 'undefined') || (agriOrgs === null) || (agriOrgs.length === 0)){
        $.when($.get(toLoad), $.get('/setup/getPort'), deferredMemberLoad()).done(function (page, port, res){
            setupAgriOrg(page[0], port[0]);
        });
    }
    else{
        $.when($.get(toLoad), $.get('/setup/getPort')).done(function (page, port){
            setupAgriOrg(page[0], port[0]);});
    }
}

function setupAgriOrg(page,port){
    $('#body').empty();
    $('#body').append(page);

    msgPort = port.port;

    wsDisplay('org_messages',msgPort);

    let _pendingReview = $('#pendingReview');
    let _aoProductStatus = $('#aoProductStatus');

    let _aoProductDiv = $('#'+aoProductDiv);

    _pendingReview.on('click',function(){
        displayPendingProduct();
    });

    _aoProductStatus.on('click',function(){
        listAOProducts();
    });

    $('#agriOrganisation').empty();
    for (let each in agriOrgs){
        (function(_idx, _arr){
            $('#agriOrganisation').append('<option value="'+_arr[_idx].id+'">' +_arr[_idx].id+'</option>');
        })(each, agriOrgs);
    }

    $('#company')[0].innerText = agriOrgs[0].companyName;
    $('#agriOrganisation').on('change', function() {
        _aoProductDiv.empty(); $('#org_messages').empty(); $('#company')[0].innerText = findMember($('#agriOrganisation').find(':selected').text(),agriOrgs).companyName; 
    });
}

function displayPendingProduct(){
    let option = {};
    option.id = $('#agriOrganisation').find(':selected').text();
    //console.log(option.id);
    option.userId = option.id;
    $.when($.post('/composer/client/getMyProducts',option)).done(function(_result){
        //console.log('_result');
        if((typeof(_result.Products) === 'undefined') || _result.Products === null){
            console.log('error getting Products: ', _result);
        }
        else{
            if (_result.Products.length < 1) {
                $('#aoProductDiv').empty(); $('#aoProductDiv').append(formatMessage('no product available'));
            }
            else{
                //console.log(_result.Products);
                let pendins = _result.Products.filter(function(x){
                    return JSON.parse(x.status).code === productStatus.RequestApproval.code;
                });
                console.log(pendins);
                formatAOproduct($('#aoProductDiv'),pendins);
            }
        }
    })
}

function listAOProducts(){
    let option = {};
    option.id = $('#agriOrganisation').find(':selected').text();
    //console.log(option.id);
    option.userId = option.id;
    $.when($.post('/composer/client/getMyProducts',option)).done(function(_result){
        //console.log('_result');
        if((typeof(_result.Products) === 'undefined') || _result.Products === null){
            console.log('error getting Products: ', _result);
        }
        else{
            if (_result.Products.length < 1) {
                $('#aoProductDiv').empty(); $('#aoProductDiv').append(formatMessage('no product available'));
            }
            else{
                //console.log(_result.Products);
                formatAOproduct($('#aoProductDiv'), _result.Products);
            }
        }
    })

}

function formatAOproduct(_target,_products){   

    _target.empty();
    let _str = '';
    let _date = '';
    for(let each in _products){
        (function(_idx,_arr){
            let _action = '<th><select id=ao_action'+_idx+'><option value="NoAction">Take no Action</option>';

            let r_string;
            r_string = '</th>';

            switch (JSON.parse(_arr[_idx].status).code){

                case productStatus.ProductCreated.code:
                    _date = _arr[_idx].productCreated;
                    
                    break;
                case productStatus.RequestApproval.code:
                    _date = _arr[_idx].requestApproval;
                    _action += '<option value="RejectProduct">Reject Product</option>';
                    _action += '<option value="ApproveProduct">Approve Product</option>';
                    r_string = '<br/>Rating<input id="ao_rating'+_idx+'" type="number"></input>';
                    break;
                case productStatus.ApproveProduct.code:
                    _date = _arr[_idx].approveProduct;
                    break;
                case productStatus.RejectProduct.code:
                    _date = _arr[_idx].rejectProduct;
                default:
                    break;
            }
            let _button = '<th><button id="ao_btn_'+_idx+'">Execute</button></th>';
            _action += '</select>';
            if(_idx>0){
                _str+='<div class="spacer"></div>';
            }
            _str += '<table class="wide"><tr><th>ProductId</th><th>Status</th><th class="centre">Approved</th><th colspan="3" class="right">Manufacturer: '+findMember(_arr[_idx].manufacturer.split('#')[1],manufacturer).companyName+'</th></tr>';
            _str += '<tr><th id ="ao_product'+_idx+'" width="20%">'+_arr[_idx].id+'</th><th width="50%">'+JSON.parse(_arr[_idx].status).text+': '+_date+'</th><th class="centre">'+_arr[_idx].approved+'</th>'+_action+r_string+_button+'</tr></table>';
            _str += '<table class="wide"><tr align="center"><th>Sr. no</th><th>Content Name</th><th>Percentage</th></tr>'
            for(let every in _arr[_idx].content){
                (function(_idx2, _arr2){
                    let _item = JSON.parse(_arr2[_idx2]);
                    _str += '<tr><td align="center" width="20%">'+_item.contentNo+'</td><td width="50%">'+_item.name+'</td><td align="right">'+_item.percentage+'</td><tr>';
                })(every, _arr[_idx].content);
            }
            _str+='</table>';
        })(each,_products);
    }
    _target.append(_str);

    for(let each in _products){
        (function(_idx,_arr){
            $('#ao_btn_'+_idx).on('click',function(){
                let option = {};
                option.action = $('#ao_action'+_idx).find(':selected').text();
                option.productId = $('#ao_product'+_idx).text();
                //console.log(option.productId);
                option.participant = $('#agriOrganisation').val();
                option.manufacturer = _arr[_idx].manufacturer;
                if(option.action === 'Approve Product'){
                    option.rating = parseInt($('#ao_rating'+_idx).val());
                    //console.log(option.rating);
                }
                $('#org_messages').prepend(formatMessage(option.action + 'for' + option.productId + 'Requested'));
                $.when($.post('/composer/client/productAction', option)).done(function (_result){ 
                    $('#org_messages').prepend(formatMessage(_result.result)); 
                });
            });
        })(each,_products)
    }
}