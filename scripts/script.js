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
  robot.respond(/cal/i, function(res) {
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
  robot.respond(/next/i, function(res) {
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
  robot.respond(/about/i, function(res) {
    res.send('Slack access to the class snack schedule!\n' +
      '*@snackbot signup MM/DD* signs you up to bring snacks\n' +
      '*@snackbot cal* returns a chronological list of all snack signups\n' +
      '*@snackbot next* returns info on the next scheduled snack night\n' +
      '*@snackbot about* returns overview and list of commands'
    );
  });

  // respond to the message "signup" in the current channel or DM
  robot.respond(/signup(.*)/i, function(res) {
    let request = (res.match[1]).trim();
    let currentDate = new Date();
    let year;
    let month;
    let day;

    // if the request contains a date, substring it into 2-digit month and
    // 2-digit day
    if (request && (request.match(/\d{1,2}\W\d{1,2}/))) {
      // assume the user wants to sign up for a date this year
      month = request.substr(0, request.search(/\W/));
      if (month.length === 1) {
        month = '0' + month;
      }
      day = request.substr(request.search(/\W/) + 1);
      if (day.length === 1) {
        day = '0' + day;
      }
    }

    // if the current month is greater than the provided month value,
    // then assume the provided date should be next year
    if ((currentDate.getMonth() + 1) > month) {
      year = (currentDate.getFullYear() + 1).toString(); 
    // otherwise, assume the current year
    } else {
      year = currentDate.getFullYear().toString();
    }

    let startDate = new Date (year, (month - 1), day);
    let dateString = year.toString() + month + day;
    let start = dateString + 'T180000\r\n';
    let end = dateString + 'T183000\r\n';

    // if "signup" is immediately followed by 1 or 2 numbers, a separator, 
    // and 1 or 2 numbers, then do the signup
    if (request && (request.match(/^\d{1,2}\W\d{1,2}/))) {
      let data = 'BEGIN:VCALENDAR\r\n' + 
        'BEGIN:VEVENT\r\n' +
        'UID:' + dateString + '.' + res.envelope.user.id + '-@svodnik.github.io\r\n' +
        'DTSTART;TZID=America/Los_Angeles:' + start +
        'DTEND;TZID=America/Los_Angeles:' + end +
// Swap out for res.envelope when deploying
        // 'SUMMARY:snacks: ' + res.envelope.user.profile.first_name + '\r\n' +
        // 'DESCRIPTION:##' + res.envelope.user.profile.display_name + '##\r\n' +
        // for local testing, as envelope info is limited in CLI
        'SUMMARY:snacks: Sasha\r\n' +
        'DESCRIPTION:##sasha##\r\n' +
        'END:VEVENT\r\n' +
        'END:VCALENDAR';
        
      // process.env.CALENDAR_URL: iCloud calendar URL
      robot.http(process.env.CALENDAR_URL)
      .header('Content-Type', 'text/calendar; charset=utf-8')
      // process.env.CALENDAR_ACCOUNT: iCloud username
      // process.env.CALENDAR_PW: iCloud application password
      .auth(process.env.CALENDAR_ACCOUNT, process.env.CALENDAR_PW)
      // process.env.CALENDAR_PATH: iCloud CalDAV path for calendar,
      // consisting of USER_ID/calendar/CALENDAR_ID
      // http://www.ict4g.net/adolfo/notes/2015/07/04/determing-url-of-caldav.html
      .path(process.env.CALENDAR_PATH)
      .post(data)(function(err, response, body) {
        if (err) {
          res.send('I couldn\'t sign you up right now. Try again in a bit.');
        } else if (response) {
          if (body.toString().match('HTTP/1.1 200 OK')) {
            res.send('You\'re signed up for snacks on ' + new Date(startDate).toLocaleDateString() + '!');
          } else {
            res.send(body)
          }
        }
      });

      // if data provided after 'signup' keyword doesn't include or doesn't match
      // date format
    } else {
      res.send('To sign up for a snack night, use the following syntax:\n' +
        '`@snackbot signup MM/DD`\n' +
        'where `MM` is a month value and `DD` is a day value\n' +
        'like `@snackbot signup 11/30`\n' +
        'Or use `@snackbot about` for additional commands.'
      )
    }
  });
/*
  robot.respond(/cancel(.*)/i, function(res) {
    let request = (res.match[1]).trim();
    let currentDate = new Date();
    let year;
    let month;
    let day;
    if (request && request.match(/\d{1,2}\W\d{1,2}/)) {
      month = request.substr(0, request.search(/\W/));
      if (month.length === 1) {
        month = '0' + month;
      }
      day = request.substr(request.search(/\W/) + 1);
      if (day.length === 1) {
        day = '0' + day;
      }
    }

    // if the current month is greater than the provided month value,
    // then assume the provided date should be next year
    if ((currentDate.getMonth() + 1) > month) {
      year = (currentDate.getFullYear() + 1).toString(); 
    // otherwise, assume the current year
    } else {
      year = currentDate.getFullYear().toString();
    }

    let startDate = new Date (year, (month - 1), day);
    let dateString = year.toString() + month + day;
    let start = dateString + 'T180000\r\n';
    let end = dateString + 'T183000\r\n';

    let data = 'BEGIN:VCALENDAR\r\n' + 
      'BEGIN:VEVENT\r\n' +
      'UID:' + dateString + '.' + res.envelope.user.id + '-@svodnik.github.io\r\n' +
      'DTSTART;TZID=America/Los_Angeles:' + start +
      'DTEND;TZID=America/Los_Angeles:' + end +
      'END:VEVENT\r\n' +
      'END:VCALENDAR';

    console.log(data);

    // process.env.CALENDAR_URL: iCloud calendar URL
    robot.http(process.env.CALENDAR_URL)
    .header('Content-Type', 'text/calendar; charset=utf-8')
    // process.env.CALENDAR_ACCOUNT: iCloud username
    // process.env.CALENDAR_PW: iCloud application password
    .auth(process.env.CALENDAR_ACCOUNT, process.env.CALENDAR_PW)
    // process.env.CALENDAR_PATH: iCloud CalDAV path for calendar,
    // consisting of USER_ID/calendar/CALENDAR_ID
    // http://www.ict4g.net/adolfo/notes/2015/07/04/determing-url-of-caldav.html
    .path(process.env.CALENDAR_PATH)
    // .delete(data)(function(err, response, body) {
    //   if (err) {
    //     res.send('I couldn\'t cancel your signup right now. Try again in a bit.');
    //   } else if (response) {
    //     if (body.toString().match('HTTP/1.1 200 OK')) {
    //       res.send('Your signup has been successfully canceled.');
    //     } else {
    //       res.send(response)
    //     }
    //   }
    // });
  });
*/
// then create a separate response for deleting an existing signup, which will
//   need to match the username with the username in the memo of the event to
//   cancel

// then create reminder functionality
};