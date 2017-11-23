// Snackbot
//  Slack access to the class snack schedule!
//
//  *@snackbot cal* returns a chronological list of all snack signups
//  *@snackbot next* returns info on the next scheduled snack night
//  *@snackbot about* returns overview and list of commands

"use strict";

// incorporate ical and moment npm modules into this app
var ical = require('ical');
var moment = require('moment-timezone'); 
var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var url = 'http://p53-calendars.icloud.com/published/2/2ex0lsKSpKz_G7fuIIgWRjMw9qBcWTRwvcAITf_nt4mWYp5yVBwlrrwbD2l33Op_404hELgNniz2QpyIN4S5b6d-DmBH8MYkE6fCwdMJJw8';

module.exports = function(robot) {
  // create a new snacks array to store selected calendar events
  var snacks = [{
    summary: 'today',
    start: new Date()
  }];
  // create a function to return data from a single calendar entry
  function returnEvent(res, k) {
    return(
      // begin bold formatting in Slack
      '*' + 
      // format with moment
      // http://momentjs.com/docs/#/parsing/string-format/
      // without substring, moment gets the time zone wrong and the date
      // shifts forward one day
      moment(snacks[k].start.substr(0,10)).format('ddd MMM DD') +       
      // end bold formatting in slack
      '*' + 
      ' ' +
      // return characters 8 to the end of the string, excluding the
      // unneeded text "snacks: " at the start of each entry
      snacks[k].summary.substr(8) +
      '\n'
    );
  }

  function addSignup(date,fname,handle) {
    let identifier = Math.random() * 10000;
    let dateString = date.getUTCFullYear().toString() + (date.getUTCMonth() + 1).toString() + date.getUTCDate().toString();
    let data = 'BEGIN:VCALENDAR\r\n' +
      'BEGIN:VEVENT\r\n' +
      'UID:' + dateString + 'T' + date.getUTCHours().toString() + date.getUTCMinutes().toString() + date.getUTCSeconds().toString() + 'Z' + identifier + '-@svodnik.github.io\r\n' +
      'DTEND:' + dateString + 'T023000Z\r\n' +
      'SUMMARY:snacks: ' + fname + '\r\n' +
      'DTSTART:' + dateString + 'T020000Z\r\n' +
      'DESCRIPTION:##' + handle + '##\r\n' +
      'END:VEVENT\r\n' +
      'END:VCALENDAR';
      
    robot.http('p53-calendars.icloud.com')
      .header('Content-Type', 'text/calendar; charset=utf-8')
      .path('/published/2/2ex0lsKSpKz_G7fuIIgWRjMw9qBcWTRwvcAITf_nt4mWYp5yVBwlrrwbD2l33Op_404hELgNniz2QpyIN4S5b6d-DmBH8MYkE6fCwdMJJw8')
      .post(data)(function(err, response, body) {
        if (err) {
          res.send('Err: ');
        }
        if (response) {
          res.send('Response: ');
        }
        if (body) {
          res.send('Body: ');
        }
      });
      // getting an error
      // next step: specify dependencies:
      // https://stackoverflow.com/questions/15274035/add-post-support-to-hubot#28716542
  }

  // use ical npm module to get calendar data from class calendar
  ical.fromURL(url, {}, function(err, data) {
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
    for (var el in snacks) {
      snacks[el].start = moment.tz(snacks[el].start, "America/Los_Angeles").format();
    }
  });

  // respond to the message "cal" in the current channel or DM
  robot.respond(/cal/, function(res) {
    // respond with each item in the sorted snacks array
    var message = '';
    for (var k in snacks) {
      // if the summary value of the current element is 'today', skip it
      if (snacks[k].summary !== 'today') {
        message += returnEvent(res, k);
      }
    } 
    res.send('Snack schedule:\n' + message); 
  });

  // respond to the message "next" in the current channel or DM
  robot.respond(/next/, function(res) {
    var message = '';
    // get the array index for the element representing today
    var today = snacks.map(function(el) {
      return el.summary;
    }).indexOf('today');
    // if today is not the last element in the array
    if (snacks.length > (today + 1)) {
      message += returnEvent(res, today + 1);
      res.send('Next snack night:\n' + message);
    // otherwise there is no signup after today, so let user know that
    } else {
      res.send('No signups for upcoming classes. Want to step up? https://codesnacks.youcanbook.me/');
    }  
  });

  // respond to the message "about" in the current channel or DM
  robot.respond(/about/, function(res) {
    res.send('Slack access to the class snack schedule!\n' +
      '*@snackbot cal* returns a chronological list of all snack signups\n' +
      '*@snackbot next* returns info on the next scheduled snack night\n' +
      '*@snackbot about* returns overview and list of commands' +
      res.envelope.user.id + '\n' +
      res.envelope.user.name + '\n' +
      res.envelope.user.room + '\n'
    );
  });

  // respond to the message "signup" in the current channel or DM
  robot.respond(/signup/, function(res) {
// capture additional input besides the word "signup"
// if "signup" is followed by "help" or by nothing, respond with info on how to
//   construct a query -- specifically on how to format the date
// also look for a valid date, supporting a few different formats:
//   January 13
//   Jan 13
//   Jan. 13
//   1/13
//   maybe also 13/1, though this introduces ambiguity
// then create a separate respond for deleting an existing signup, which will
//   need to match the username with the username in the memo of the event to
//   cancel
    let date = new Date();
    let fname = 'Sasha';
    let handle = 'sasha';
    let identifier = Math.random() * 10000;
    let dateString = date.getUTCFullYear().toString() + (date.getUTCMonth() + 1).toString() + date.getUTCDate().toString();
    let data = 'BEGIN:VCALENDAR\r\n' +
      'BEGIN:VEVENT\r\n' +
      'UID:' + dateString + 'T' + date.getUTCHours().toString() + date.getUTCMinutes().toString() + date.getUTCSeconds().toString() + 'Z' + identifier + '-@svodnik.github.io\r\n' +
      'DTEND:' + dateString + 'T023000Z\r\n' +
      'SUMMARY:snacks: ' + fname + '\r\n' +
      'DTSTART:' + dateString + 'T020000Z\r\n' +
      'DESCRIPTION:##' + res.envelope.user.name + '##\r\n' +
      'END:VEVENT\r\n' +
      'END:VCALENDAR';
      
// TODO: move url, login, pw, and path to process.env (on Heroku)
      robot.http('https://p53-caldav.icloud.com')
      .header('Content-Type', 'text/calendar; charset=utf-8')
      .auth('quietquake@mac.com', 'qvgd-hfsw-jaui-nprp')
      .path('/173389758/calendars/B08F871B-5E59-43F3-A7C0-C6272D7C7C22/')
      .post(data)(function(err, response, body) {
        if (err) {
          res.send('I couldn\'t sign you up right now. Try again in a bit.');
        } else if (response) {
          if (body.toString().match('HTTP/1.1 200 OK')) {
            res.send('You\'re all signed up!');
          }
//          res.send('Response: ' + response);
        }
        // if (body) {
        //   res.send('Body: ' + body);
        // }
      });
      // next step: set up authentication with an app-specific password
      // get password from apple
      // look at hubot http documentation to figure out where to put it (it's documented)
      // make sure you can log in
      // then save auth info on Heroku

  });

};