/* global module */

/* Magic Mirror
 * Node Helper: MMM-COVID19
 *
 * By Jose Forte
 * MIT Licensed.
 */

var NodeHelper = require('node_helper')
var request = require('request')

var byCountryUrl = 'https://coronavirus-monitor.p.rapidapi.com/coronavirus/cases_by_country.php'
var worldStatsUrl = 'https://coronavirus-monitor.p.rapidapi.com/coronavirus/worldstat.php'
var byCountryHistoryUrl = 'https://coronavirus-monitor.p.rapidapi.com/coronavirus/cases_by_particular_country.php'


module.exports = NodeHelper.create({
  start: function () {
    console.log('Starting node helper for: ' + this.name)
  },

  getGlobalStats: function(key) {
    var self = this
    var options = {
      method: 'GET',
      url: worldStatsUrl,
      headers: {
        'x-rapidapi-host': 'coronavirus-monitor.p.rapidapi.com',
        'x-rapidapi-key': key
      }
    }
    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var result = JSON.parse(body)
        self.sendSocketNotification('GLOBAL_RESULT', result)
      }
    })
  },

  getStatsByCountry: function(key) {
    var self = this
    var options = {
      method: 'GET',
      url: byCountryUrl,
      headers: {
        'x-rapidapi-host': 'coronavirus-monitor.p.rapidapi.com',
        'x-rapidapi-key': key
      }
    }
    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var result = JSON.parse(body)
        self.sendSocketNotification('BYCOUNTRY_RESULT', result)
      }
    })
  },

  getHistoryByCountry: function(key, country) {
    var self = this
    var options = {
      method: 'GET',
      url: byCountryHistoryUrl,
      headers: {
        'x-rapidapi-host': 'coronavirus-monitor.p.rapidapi.com',
        'x-rapidapi-key': key
      },
      qs: {
        'country': country
      }
    }
    request(options, function (error, response, body) {
      console.log("Here going to make request");
      if (!error && response.statusCode == 200) {
        var result = JSON.parse(body)
        self.sendSocketNotification('BYCOUNTRY_HISTORY_RESULT', result)
      }
    })
  },

  //Subclass socketNotificationReceived received.
  socketNotificationReceived: function(notification, payload) {
    if (notification === 'GET_BY_COUNTRY_STATS') {
      this.getStatsByCountry(payload['key'])
    }
    else if (notification === 'GET_GLOBAL_STATS') {
      this.getGlobalStats(payload['key'])
    }
    else if (notification === 'GET_BY_COUNTRY_HISTORY_STATS') {
      this.getHistoryByCountry(payload['key'], payload['country'])
    }
  }
  
});
