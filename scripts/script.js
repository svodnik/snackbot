// incorporate ical npm module into this app
var ical = require('ical');

module.exports = function(robot) {
  // respond to the word "cal" in the current channel or DM
  robot.hear(/cal/, function(res) {
    // use ical npm module to get calendar data from class calendar
    return ical.fromURL('http://p53-calendars.icloud.com/published/2/2ex0lsKSpKz_G7fuIIgWRjMw9qBcWTRwvcAITf_nt4mWYp5yVBwlrrwbD2l33Op_404hELgNniz2QpyIN4S5b6d-DmBH8MYkE6fCwdMJJw8', {}, function(err, data) {
      // handle error
      if (err) {
        res.send("Encountered an error :( " + err);
        return;
      }
      // create a new snacks array to store selected calendar events
      var snacks = [];
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
      // respond with each item in the sorted snacks array
      for (var k in snacks) {
        res.send(
          // return only the first 10 characters, which make up the date
          snacks[k].start.toString().substr(0,10) + 
          ": " + 
          // return characters 8 to the end of the string, excluding the
          // unneeded text "snacks: " at the start of each entry
          snacks[k].summary.substr(8)
        );
      }  
    });
  });
};