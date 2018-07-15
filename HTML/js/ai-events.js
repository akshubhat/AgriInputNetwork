

'use strict';

/**
 * load all of the members in the network for use in the different user experiences. This is a synchronous routine and is executed autormatically on web app start. 
 * However, if this is a newly created network, then there are no members to retrieve and this will create four empty arrays
 */
function memberLoad ()
{
    let options = {};
    options.registry = 'Manufacturer';
    let options2 = {};
    options2.registry = 'Retailer';
    let options3 = {};
    options3.registry = 'AgricultureOrganisation';
    let options4 = {};
    options4.registry = 'FinanceCo';
    let options5 = {};
    options5.registry = 'Customer';
    $.when($.post('/composer/admin/getMembers', options), $.post('/composer/admin/getMembers', options2),
        $.post('/composer/admin/getMembers', options3), $.post('/composer/admin/getMembers', options4). $.post('/composer/admin/getMembers', options5)).done(function (_manufacturer, _retailers, _agriOrgs, _financeCos, _customers)
        {
            retailers = _retailers[0].members;
            manufacturer = _manufacturer[0].members;
            m_string = _getMembers(manufacturer);
            agriOrgs = _agriOrgs[0].members;
            ao_string = _getMembers(agriOrgs);
            financeCos = _financeCos[0].members;
            fc_string = _getMembers(financeCos);
            customers = _customers[0].members;
            c_string = _getMembers(customers);
            retailers = _retailers[0].members;
            r_string = _getMembers(retailers);
        });
}

/**
 * load all of the members in the network for use in the different user experiences. This routine is designed for use if the network has been newly deployed and the web app was
 * started before the autoLoad function was run on the newly deployed network (which, by default, is empty).
 * @returns {Promise} - promise upon completino of loadding member objects.
 */
function deferredMemberLoad()
{
    let d_prompts = $.Deferred();
    let options = {};
    options.registry = 'Manufacturer';
    let options2 = {};
    options2.registry = 'Retailer';
    let options3 = {};
    options3.registry = 'AgricultureOrganisation';
    let options4 = {};
    options4.registry = 'FinanceCo';
    let options5 = {};
    options5.registry = 'Customer';
    $.when($.post('/composer/admin/getMembers', options), $.post('/composer/admin/getMembers', options2),
        $.post('/composer/admin/getMembers', options3), $.post('/composer/admin/getMembers', options4), $.post('/composer/admin/getMembers', options5)).done(function (_manufacturer, _retailers, _agriOrgs, _financeCos, _customers){
            retailers = _retailers[0].members;
            manufacturer = _manufacturer[0].members;
            m_string = _getMembers(manufacturer);
            agriOrgs = _agriOrgs[0].members;
            ao_string = _getMembers(agriOrgs);
            financeCos = _financeCos[0].members;
            fc_string = _getMembers(financeCos);
            customers = _customers[0].members;
            c_string = _getMembers(customers);
            retailers = _retailers[0].members;
            r_string = _getMembers(retailers);
            d_prompts.resolve();
        }).fail(d_prompts.reject);
    return d_prompts.promise();
}
/**
 * return an option list for use in an HTML <select> element from the provided member array.
 * @param {Array} _members - array of members
 * @returns {String} - html select content
 */
function _getMembers(_members)
{
    let _str = '';
    for (let each in _members)
    {(function(_idx, _arr){if (_arr[_idx].id !== 'noop@dummy')
        {_str +='<option value="'+_arr[_idx].id+'">' +_arr[_idx].companyName+'</option>';}})(each, _members);}
    _str += '</select>';
    return _str;
}