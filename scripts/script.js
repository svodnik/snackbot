var ical = require('ical'),
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

module.exports = function(robot) {
    robot.hear(/cal/, function(res) {
        return ical.fromURL('http://p53-calendars.icloud.com/published/2/2ex0lsKSpKz_G7fuIIgWRjMw9qBcWTRwvcAITf_nt4mWYp5yVBwlrrwbD2l33Op_404hELgNniz2QpyIN4S5b6d-DmBH8MYkE6fCwdMJJw8', {}, function(err, data) {
            if (err) {
                res.send("Encountered an error :( " + err);
                return;
            }
            var snacks = [];
            for (var k in data){
              if ((data.hasOwnProperty(k)) && (data[k].summary) && (data[k].summary.indexOf('snacks') >= 0)) {
                  snacks.push({
                      summary: data[k].summary,
                      start: data[k].start
                  });
              }
            }
            snacks.sort(function(a,b) {
                return a.start - b.start;
            });
            for (var k in snacks) {
                var ev = snacks[k];
                res.send(ev.start.toString().substr(0,10) + ": " + ev.summary.substr(8));
            }  
        });
    });
};