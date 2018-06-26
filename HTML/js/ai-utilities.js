'use strict';

function getPort ()
{
  if (msgPort == null){ 
      $.when($.get('/setup/getPort')).done(function (port){
          console.log('port is: '+port.port); msgPort = port.port;
        });
    }
}

function formatMessage(_msg) {
    return '<p class="message">'+_msg+'</p>';
}

function accToggle(_parent, _body, _header)
{
	var parent = "#"+_parent;
    var body="#"+_body;
    var header = _header;
	if ($(body).hasClass("on")){
        $(body).removeClass("on"); $(body).addClass("off");
        $(parent).removeClass("on"); $(parent).addClass("off");
    }
    else{
        accOff(parent);
        $(body).removeClass("off"); $(body).addClass("on");
        $(parent).removeClass("off"); $(parent).addClass("on");
    }
}

function accOff(target)
{
	var thisElement = $(target);
	var childNodes = thisElement.children();
	for(let each in childNodes){
        var node = "#"+childNodes[each].id;
        if (node != '#'){
            if($(node).hasClass("on")){
                $(node).removeClass("on");
            }
            $(node).addClass("off");
        }
    }
}