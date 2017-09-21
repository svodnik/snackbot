var jsDAVlib = require('./jsDAVlib/src/jsDAVlib.js');
require('./jsDAVlib/src/jsDAVXMLParser.js');
require('./jsDAVlib/src/jsDAVResource.js');
require('./jsDAVlib/src/jsDAVConnection.js');
require('./jsDAVlib/src/jsDAVCommunications.js');

var myDAVServer = jsDAVlib.getConnection({
    url: 'webcal://p53-calendars.icloud.com/published/2/hu3E_dBzPi6QTRUEdjwaGVAc0X3Vvg-6uVUcUt9Mu07VJ3zuo5ZSy1-yuB640BpuQaSMMwvxfZw5zyvS42ytRcxG3lLgxXlMByMste1wPsQ',
    user: '',
    password: ''
  });
  
  myDAVServer.onready = function() {
    // Yeah! a correct DAV connection is DONE
  
    myDAVServer.getResource(null, function(resource, error) {
      console.log('Root Resource: ' + JSON.stringify(resource.get()));
  
      var data = resource.get();
  
      // Recover first child element
      if (data.meta.type.type === 'dir') {
        myDAVServer.getResource(data.data[0].href, function(res, error) {
          // Resource recovered . . .
          if (data.meta.type.type === 'file' && data.meta.mime === 'text/x-vcard; charset=utf-8') {
            // data.data contents is a VCARD file !
          }
        });
      }
    });
  }