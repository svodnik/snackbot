// incorporate ical and moment npm modules into this app
var ical = require('ical');
var moment = require('moment-timezone');
var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat',];


module.exports = function(robot) {
  // create a new snacks array to store selected calendar events
  var snacks = [{
    summary: 'today',
    start: new Date()
  }];
  // create a function to return data from a single calendar entry
  function returnEvent(res, k) {
    console.log(moment(snacks[k].start.substr(0,10)).format('MM-DD'));
    res.send(
      // return only the first 10 characters, which make up the date
     '*' + snacks[k].start.toString().substr(0,10) + '*' + ' ' +
      // '*' + 
      // days[snacks[k].start.getDay()] +
      // ' ' +
      // months[snacks[k].start.getMonth()] + 
      // ' ' +
      // snacks[k].start.getDate() + 
      // "*: " + 
      // return characters 8 to the end of the string, excluding the
      // unneeded text "snacks: " at the start of each entry
      snacks[k].summary.substr(8)
    );
  }
  // use ical npm module to get calendar data from class calendar
  ical.fromURL('http://p53-calendars.icloud.com/published/2/2ex0lsKSpKz_G7fuIIgWRjMw9qBcWTRwvcAITf_nt4mWYp5yVBwlrrwbD2l33Op_404hELgNniz2QpyIN4S5b6d-DmBH8MYkE6fCwdMJJw8', {}, function(err, data) {
    // handle error
    if (err) {
      res.send("Encountered an error :( " + err);
      return;
    }

    // loop through returned calendar objects
    for (var k in data){
      // identify calendar objects that are actual data,
      // and for which the summary property has a value,
      // and for which the summary property contains the text 'snacks',
      // which is unique to calendar items containing snack signup info
      if (
        (data.hasOwnProperty(k)) && 
        (data[k].summary) && 
        (data[k].summary.indexOf('snacks') >= 0)
      ) {
        // add new object to the snacks array, with summary
        // and start (date) properties
        snacks.push({
          summary: data[k].summary,
          start: data[k].start
        });
      }
    }
    // sort the snacks array by start date
    snacks.sort(function(a,b) {
      return a.start - b.start;
    });
    console.log(snacks);
    for (var el in snacks) {
      snacks[el].start = moment.tz(snacks[el].start, "America/Los_Angeles").format();
     // snacks[el].start = new Date(snacks[el].start);
    }
    console.log(snacks);
    snacks.reverse();
  });

  // respond to the word "cal" in the current channel or DM
  robot.hear(/cal/, function(res) {
    // respond with each item in the sorted snacks array
    for (var k in snacks) {
      // if the summary value of the current element is 'today', skip it
      if (snacks[k].summary !== 'today') {
        returnEvent(res, k);
      }
    }  
  });

  // respond to the word "next" in the current channel or DM
  robot.hear(/next/, function(res) {
    // get the array index for the element representing today
    var today = snacks.map(function(el) {
      return el.summary;
    }).indexOf('today');
    // if today is not the last element in the array
    if (snacks.length > (today + 1)) {
      returnEvent(res, today + 1);
    // otherwise there is no signup after today, so let user know that
    } else {
      res.send("No signups for upcoming classes. Want to step up? https://codesnacks.youcanbook.me/");
    }  
  });
};