/* global module */

/* Magic Mirror
 * Node Helper: MMM-COVID19
 *
 * By Jose Forte
 * MIT Licensed.
 */

var NodeHelper = require('node_helper');
var Covid19 = require('./COVID-19.js');

var options = {
  debug: true,
};

c19 = new Covid19(options=options);

module.exports = NodeHelper.create({
  start: function () {
    console.log('Starting node helper for: ' + this.name)
  },

  getGlobalStats: function(key) {
    var self = this;

    c19.scan((result)=>{
      self.sendSocketNotification('GLOBAL_RESULT', result);
    });
  },

  //Subclass socketNotificationReceived received.
  socketNotificationReceived: function(notification, payload) {
    if (notification === 'GET_GLOBAL_STATS') {
      this.getGlobalStats(payload['key'])
    }
  }
  
});
