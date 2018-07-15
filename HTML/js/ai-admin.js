'use strict';

let cred;
let connection;
let msgPort = null;
let _blctr = 0;

function loadAdminUX(){

    let toLoad = 'admin.html';

    $.when($.get(toLoad)).done(function (page){
        $('#body').empty();

        $('#body').append(page);
        //console.log('Admin clicked');
        //updatePage('admin');
        listMemRegistries();
    });
}


function wsDisplay(_target, _port)
{
    let content = $('#'+_target);
    let wsSocket = new WebSocket('ws://localhost:'+_port);
    wsSocket.onopen = function () {wsSocket.send('connected to client');};
    wsSocket.onmessage = function (message) {content.append(formatMessage(message.data));};
    wsSocket.onerror = function (error) {console.log('WebSocket error on wsSocket: ' + error);};
}

// deploy a new network
function networkDeploy()
{
    let options = {};
    options.myArchive = networkFile;
    $.when($.post('/composer/admin/deploy', options)).done(function (_results){
        let _str = '';
        _str +='<h2>network deploy request for '+networkFile+'</h2>';
        _str += '<h4>Network deploy results: '+_results.deploy+'</h4>';
        $('#admin-forms').empty();
        $('#admin-forms').append(_str);
    });
}

// install a new network
function networkInstall()
{
    let options = {};
    options.myArchive = networkFile;
    $.when($.post('/composer/admin/install', options)).done(function (_results)
    { let _str = '';
        _str +='<h2>network install request for '+networkFile+'</h2>';
        _str += '<h4>Network install results: '+_results.install+'</h4>';
        $('#admin-forms').empty();
        $('#admin-forms').append(_str);
    });
}


// start an installed network
function networkStart()
{
    let options = {};
    options.myArchive = networkName;
    $.when($.post('/composer/admin/start', options)).done(function (_results){
        let _str = '';
        _str +='<h2>network start request for '+networkName+'</h2>';
        _str += '<h4>Network start results: '+_results.start+'</h4>';
        $('#admin-forms').empty();
        $('#admin-forms').append(_str);
    });
}

//List the deployed business network
function adminList()
{
    let _url = '/composer/admin/listAsAdmin';
    $.when($.get(_url)).done(function (_connection){
        let _str = '<h3>Current Active Business Networks</h3><ul>';
        for (let each in _connection)
        {
            (function(_idx, _arr){
                _str += '<li>'+_arr[_idx]+'</li>';
            })(each, _connection);
        }
        _str+='</ul>';
        $('#admin-forms').empty();
        $('#admin-forms').append(_str);
    });
}

// ping a network, check for compatibility
function ping()
{
   let options = {};
   options.businessNetwork = businessNetwork;
   $.when($.post('/composer/admin/ping', options)).done(function (_results){
       let _str = '';
       _str +='<h2>network ping request to '+businessNetwork+'</h2>';
       _str += '<h4>Ping request results: '+'</h4><table width="90%"><tr><th>Item</th><th width="65%">Value</th></tr>';
       for (let each in _results.ping){
           (function(_idx, _arr){
               _str+='<tr><td>'+_idx+'</td><td>'+_arr[_idx]+'</td></tr>';
            })(each, _results.ping);
        }
       _str+='</table>';
       $('#admin-forms').empty();
       $('#admin-forms').append(_str);
   });
}


// take down a business network
function networkUndeploy()
{
    let options = {};
    options.businessNetwork = businessNetwork;
    if (confirm('Are you sure you want to undeploy the '+businessNetwork+' business network?') === true)
    {
        $.when($.post('/composer/admin/undeploy', options)).done(function(_results)
        {
            let _str = '';
            _str +='<h2>Network undeploy request for '+businessNetwork+'</h2>';
            _str += '<h4>Network Undeploy request results: '+_results.undeploy+'</h4>';
            $('#admin-forms').empty();
            $('#admin-forms').append(_str);
        });
    } else
    {
        $('#message').empty();
        $('#message').append('undeploy request cancelled');
    }
}


// update an existing network
function networkUpdate()
{
    let options = {};
    options.myArchive = networkFile;
    $.when($.post('/composer/admin/update', options)).done(function (_results)
    { let _str = '';
        _str +='<h2>network update request for '+networkFile+'</h2>';
        _str += '<h4>Network update results: '+_results.update+'</h4>';
        $('#admin-forms').empty();
        $('#admin-forms').append(_str);
    });
}


// get member registries
function listMemRegistries()
{
    $.when($.get('/composer/admin/getRegistries')).done(function (_results)
    {
        $('#registryName').empty();
        let _str = '';
        _str +='<h2>Registry List</h2>';
        _str += '<h4>Network update results: '+_results.result+'</h4>';
        _str += '<ul>';
        for (let each in _results.registries)
        {(function(_idx, _arr){
            _str += '<li>'+_arr[_idx]+'</li>';
            $('#registryName').append('<option value="'+_arr[_idx]+'">' +_arr[_idx]+'</option>');
            $('#registryName2').append('<option value="'+_arr[_idx]+'">' +_arr[_idx]+'</option>');
            $('#registryName3').append('<option value="'+_arr[_idx]+'">' +_arr[_idx]+'</option>');
            $('#registryName4').append('<option value="'+_arr[_idx]+'">' +_arr[_idx]+'</option>');
            $('#registryName5').append('<option value="'+_arr[_idx]+'">' +_arr[_idx]+'</option>');
        })(each, _results.registries);}
        _str += '</ul>';
        $('#admin-forms').empty();
        $('#admin-forms').append(_str);
    })
    .then(()=>{
        $.when($.get('/composer/admin/getAssetRegistries')).done(function (_results){
            for(let each in _results.registries){
                (function(_idx,_arr){
                    $('#assetName').append('<option value="'+_arr[_idx]+'">'+_arr[_idx]+'</option>');
                })(each, _results.registries);}
        })
    });
}


// get member in a registry
function listRegistry()
{
    let options = {};
    options.registry = $('#registryName').find(':selected').text();
    $.when($.post('/composer/admin/getMembers', options)).done(function (_results)
    {
        let _str = '';
        _str +='<h2>Registry List</h2>';
        _str += '<h4>Network update results: '+_results.result+'</h4>';
        _str += '<table width="100%"><tr><th>Company Name</th><th>Id</th></tr>';
        for (let each in _results.members)
        {(function(_idx, _arr){
            _str += '<tr><td>'+_arr[_idx].companyName+'</td><td>'+_arr[_idx].id+'</td></tr>';
        })(each, _results.members);}
        _str += '</ul>';
        $('#admin-forms').empty();
        $('#admin-forms').append(_str);
    });
}

// display member information using the provided id and table
function displayMember(id, _list)
{
    let member = findMember(id, _list);
    $('#companyName').empty();
    $('#companyName').append(member.companyName);
    $('#participant_id').empty();
    $('#participant_id').append(member.id);
}


//find the member identified by _id in the array of JSON objects identified by _list
function findMember(_id, _list)
{
    let _mem = {'id': _id, 'companyName': 'not found'};
    for (let each in _list){(function(_idx, _arr)
    {
        if (_arr[_idx].id === _id)
        {_mem = _arr[_idx]; }
    })(each, _list);}
    return(_mem);
}


// check if member already has a card
function checkCard()
{
    let options = {};
    let member_list;
    options.registry = $('#registryName3').find(':selected').text();
    $('#admin-forms').empty();
    $('#messages').empty();
    $('#messages').append(formatMessage('Getting Member List for '+options.registry+'.'));
    $.when($.post('/composer/admin/getMembers', options),$.get('removeMember.html')).done(function (_results, _page)
    {
        $('#admin-forms').append(_page[0]);
        $('#member_type').append(options.registry);
        //updatePage('removeMember');
        member_list = _results[0].members;
        for (let each in _results[0].members)
        {(function(_idx, _arr){
            $('#member_list').append('<option value="'+_arr[_idx].id+'">' +_arr[_idx].id+'</option>');
        })(each, _results[0].members);
        }
        let first = $('#member_list').find(':first').text();
        displayMember(first, member_list);
        let _cancel = $('#cancel');
        let _submit = $('#submit');
        _cancel.on('click', function (){$('#admin-forms').empty();});
        _submit.on('click', function(){
            options.id = $('#member_list').find(':selected').text();
            $('#messages').append(formatMessage('starting check member id request.'));
            $.when($.post('/composer/admin/checkCard', options)).done(function (_results)
                { let _msg = ((_results.result === 'success') ? _results.card : _results.message);
                $('#messages').append(formatMessage(_msg));});
        });
        $('#member_list').on('change',function()
            { let id = $('#member_list').find(':selected').text();
            displayMember(id, member_list);
        });
    });
}

// issue Identity for a member
function issueIdentity()
{
    let options = {};
    let member_list;
    options.registry = $('#registryName4').find(':selected').text();
    $('#admin-forms').empty();
    $('#messages').empty();
    $('#messages').append(formatMessage('Getting Member List for '+options.registry+'.'));
    $.when($.post('/composer/admin/getMembers', options),$.get('removeMember.html')).done(function (_results, _page)
    {
        $('#admin-forms').append(_page[0]);
        $('#member_type').append(options.registry);
        //updatePage('removeMember');
        member_list = _results[0].members;
        for (let each in _results[0].members)
        {(function(_idx, _arr){
            $('#member_list').append('<option value="'+_arr[_idx].id+'">' +_arr[_idx].id+'</option>');
        })(each, _results[0].members);
        }
        let first = $('#member_list').find(':first').text();
        displayMember(first, member_list);
        let _cancel = $('#cancel');
        let _submit = $('#submit');
        _cancel.on('click', function (){$('#admin-forms').empty();});
        _submit.on('click', function(){
            options.id = $('#member_list').find(':selected').text();
            options.type = $('#member_type').text();
            console.log(options);
            $('#messages').append(formatMessage('starting issue identity request.'));
            $.when($.post('/composer/admin/issueIdentity', options)).done(function (_results)
                { let _msg = ((_results.result === 'success') ? 'user id: '+_results.userID+'<br/>secret: '+_results.secret : _results.message);
                $('#messages').append(formatMessage(_msg));});
        });
        $('#member_list').on('change',function()
            { let id = $('#member_list').find(':selected').text();
            displayMember(id, member_list);
        });
    });
}

// create an access card for a member
function createCard()
{
    let options = {};
    let member_list;
    options.registry = $('#registryName5').find(':selected').text();
    $('#admin-forms').empty();
    $('#messages').empty();
    $('#messages').append(formatMessage('Getting Member List for '+options.registry+'.'));
    $.when($.post('/composer/admin/getMembers', options),$.get('removeMember.html')).done(function (_results, _page)
    {
        $('#admin-forms').append(_page[0]);
        $('#member_type').append(options.registry);
        //updatePage('removeMember');
        member_list = _results[0].members;
        for (let each in _results[0].members)
        {(function(_idx, _arr){
            $('#member_list').append('<option value="'+_arr[_idx].id+'">' +_arr[_idx].id+'</option>');
        })(each, _results[0].members);
        }
        let first = $('#member_list').find(':first').text();
        displayMember(first, member_list);
        let _cancel = $('#cancel');
        let _submit = $('#submit');
        _cancel.on('click', function (){$('#admin-forms').empty();});
        _submit.on('click', function(){
            options.secret = $('#secret').val();
            options.id = $('#member_list').find(':selected').text();
            console.log(options);
            $('#messages').append(formatMessage('starting member card creation request.'));
            $.when($.post('/composer/admin/createCard', options)).done(function (_results)
                { let _msg = ((_results.result === 'success') ? _results.card : _results.message);
                $('#messages').append(formatMessage(_msg));});
        });
        $('#member_list').on('change',function()
            { let id = $('#member_list').find(':selected').text();
            displayMember(id, member_list);
        });
    });
}


// get asset list
function listAssets()
{
    let options = {};
    options.registry = $('#assetName').find(':selected').text();
    options.type='admin';
    let _str = '';
    //console.log(_str + 'sadsfdsf');
    $.when($.post('/composer/admin/getAssets', options)).done(function (_results)
    {

        _str +='<h2>Registry List</h2>';
        _str += '<h4>Network update results: '+_results.result+'</h4>';
        if (_results.result === 'success')
        {
            //console.log(_results);
            if($('#assetName').find(':selected').text() === 'Order'){
                _str += '<table width="100%"><tr><th>Order ID</th><th>Retailer</th></tr>';
                for (let each in _results.orders)
                {(function(_idx, _arr){
                    _str += '<tr><td align="center">'+_arr[_idx].orderId+'</td><td>'+_arr[_idx].retailer+'</td></tr>';
                })(each, _results.orders);}
                _str += '</ul>';
                _str += '<br><br/>';
            }
            else{
                if($('#assetName').find(':selected').text() === 'Product'){
                    _str += '<table width="100%"><tr><th>ProductID</th><th>Product Name</th><th>Manufacturer</th></tr>';
                    for (let each in _results.orders)
                    {(function(_idx, _arr){
                        _str += '<tr><td align="center">'+_arr[_idx].productId+'</td><td>'+_arr[_idx].productName+'</td><td>'+_arr[_idx].manufacturer+'</td></tr>';
                    })(each, _results.orders);}
                    _str += '</ul>';
                }
                else{
                    _str += '<table width="100%"><tr><th>StockroomID</th><th>Retailer Name</th></tr>';
                    for (let each in _results.orders)
                    {(function(_idx, _arr){
                        _str += '<tr><td align="center">'+_arr[_idx].stockroomId+'</td><td>'+_arr[_idx].retailer+'</td></tr>';
                    })(each, _results.orders);}
                    _str += '</ul>';
                }
            }

        }
        else {
            _str += '<br/>'+_results.error;
        }
        $('#admin-forms').empty();
        $('#admin-forms').append(_str);
    });
}

// add a member to a registry
function addMember()
{
    $.when($.get('createMember.html')).done(function (_page)
    {
        $('#admin-forms').empty();
        $('#admin-forms').append(_page);
        //updatePage('createMember');
        let _cancel = $('#cancel');
        let _submit = $('#submit');
        $('#messages').empty();
        $('#messages').append('<br/>Please fill in add member form.');
        _cancel.on('click', function (){$('#admin-forms').empty();});
        _submit.on('click', function(){
            $('#messages').append('<br/>starting add member request.');
            let options = {};
            options.companyName = $('#companyName').val();
            options.id = $('#participant_id').val();
            options.type = $('#member_type').find(':selected').text();
            $.when($.post('/composer/admin/addMember', options)).done(function(_res)
            { $('#messages').append(formatMessage(_res)); });
        });
    });
}


// remove a member from a registry
function removeMember()
{
    let options = {};
    let member_list;
    options.registry = $('#registryName2').find(':selected').text();
    $('#admin-forms').empty();
    $('#messages').empty();
    $('#messages').append(formatMessage('Getting Member List for '+options.registry+'.'));
    $.when($.post('/composer/admin/getMembers', options),$.get('removeMember.html')).done(function (_results, _page)
    {
        $('#admin-forms').append(_page[0]);
        $('#member_type').append(options.registry);
        //updatePage('removeMember');
        member_list = _results[0].members;
        for (let each in _results[0].members)
        {(function(_idx, _arr){
            $('#member_list').append('<option value="'+_arr[_idx].id+'">' +_arr[_idx].id+'</option>');
        })(each, _results[0].members)
        }
        let first = $('#member_list').find(':first').text();
        displayMember(first, member_list);
        let _cancel = $('#cancel');
        let _submit = $('#submit');
        _cancel.on('click', function (){$('#admin-forms').empty();});
        _submit.on('click', function(){
            options.id = $('#member_list').find(':selected').text();
            $('#member_list').find(':selected').remove();
            $('#messages').append(formatMessage('starting delete member request.'));
            $.when($.post('/composer/admin/removeMember', options)).done(function (_results)
                { $('#messages').append(formatMessage(_results));});
        });
        $('#member_list').on('change',function()
            { let id = $('#member_list').find(':selected').text();
            displayMember(id, member_list);
        });
    });

}


// retrieve member secret
function getSecret()
{
    let options = {};
    let member_list;
    options.registry = $('#registryName3').find(':selected').text();
    $('#admin-forms').empty();
    $('#messages').empty();
    $('#messages').append('<br/>Getting Member List for '+options.registry+'.');
    $.when($.post('/composer/admin/getMembers', options),$.get('getMemberSecret.html')).done(function (_results, _page)
    {
        $('#admin-forms').append(_page[0]);
        //updatePage('getMemberSecret');
        $('#member_type').append(options.registry);
        member_list = _results[0].members;
        for (let each in _results[0].members)
        {(function(_idx, _arr){
            $('#member_list').append('<option value="'+_arr[_idx].id+'">' +_arr[_idx].id+'</option>');
        })(each, _results[0].members)
        }
        let first = $('#member_list').find(':first').text();
        displayMember(first, member_list);
        let _cancel = $('#cancel');
        let _submit = $('#submit');
        _cancel.on('click', function (){$('#admin-forms').empty();});
        _submit.on('click', function(){
            options.id = $('#member_list').find(':selected').text();
            $('#messages').append(formatMessage('getting member secret.'));
            $.when($.post('/composer/admin/getSecret', options)).done(function (_results)
                {
                $('#secret').empty(); $('#secret').append(_results.secret);
                $('#userID').empty(); $('#userID').append(_results.userID);
                $('#messages').append(formatMessage(_results));
            });
        });
        $('#member_list').on('change',function()
        { let id = $('#member_list').find(':selected').text();
        displayMember(id, member_list);
        });
    });

}


// get blockchain info
function getChainInfo()
{
    $.when($.get('fabric/getChainInfo')).done(function(_res)
    { let _str = '<h2> Get Chain Info: '+_res.result+'</h2>';
        if (_res.result === 'success')
            {_str += 'Current Hash: '+formatMessage(_res.currentHash);
            _str+= '<ul><li>High: '+_res.blockchain.height.high+'</li><li>Low: '+_res.blockchain.height.low+'</li></ul>';}
        else
            {_str += formatMessage(_res.message);}
        $('#admin-forms').empty();
        $('#admin-forms').append(_str);
    });
}

// get History
function getHistorian()
{
    $.when($.get('fabric/getHistory')).done(function(_res)
    { let _str = '<h2> Get History Records: '+_res.result+'</h2>';
        if (_res.result === 'success')
            {console.log(_res.history);
                _str += 'Current length: '+formatMessage(_res.history.length);
            _str += '<table><tr><th>Transaction ID</th><th>Transaction Type</th><th>TimeStamp</th></tr>';
            _res.history.sort(function(a,b){return (b.transactionTimestamp > a.transactionTimestamp) ? -1 : 1;});
            for (let each in _res.history)
            {(function(_idx, _arr){
                let _row = _arr[_idx];
                _str += '<tr><td>'+_row.transactionId+'</td><td>'+_row.transactionType+'</td><td>'+_row.transactionTimestamp+'</td></tr>';
            })(each, _res.history);
            }
            _str +='</table>';
        }
        else
            {_str += formatMessage(_res.message);}
        $('#admin-forms').empty();
        $('#admin-forms').append(_str);
    });
}

//display blockchain updates
function getChainEvents()
{
    $.when($.get('fabric/getChainEvents')).done(function(_res)
    { let _str = '<h2> Get Chain events requested. Sending to port: '+_res.port+'</h2>';
        let content = $('#blockchainVisual');
        let csSocket = new WebSocket('ws://localhost:'+_res.port);
        csSocket.onopen = function () {csSocket.send('connected to client');};
        csSocket.onmessage = function (message) {
            _blctr ++;
            if (message.data !== 'connected')
            {$(content).append('<td><span class="block">block '+JSON.parse(message.data).header.number+'<br/>Hash: '+JSON.parse(message.data).header.data_hash+'</span></td>');
                if (_blctr > 4) {let leftPos = $(content).scrollLeft(); $(content).animate({scrollLeft: leftPos + 300}, 250);}
            }
        };
        csSocket.onerror = function (error) {console.log('WebSocket error: ' + error);};
        $('#admin-forms').empty();
        $('#admin-forms').append(_str);
    });
}

function preLoad() {
    $('#body').empty();
    let options = {};
    $.when($.post('/setup/autoLoad',options)).done(function (_results) {
        msgPort = _results.port;
        wsDisplay('body',msgPort);
    });
}
