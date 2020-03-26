/* global Module */

/* Magic Mirror
 * Module: MMM-COVID19
 *
 * By Jose Forte
 * MIT Licensed.
 */

Module.register("MMM-COVID19", {
  countriesStats: {},
  countryHistoryStats: [],
  globalStats: { "total_cases": "", "total_deaths": "", "total_recovered": "" }, // beautify things at start
  defaults: {
    header: 'COVID-19',    
    countries: [ "Argentina", "Italy", "Spain", "Germany" ], // default list
    columns: ["confirmed", "deaths", "recovered", "active"], // default columns to display 
    orderCountriesByName: false,
    lastUpdateInfo: false,
    worldStats: false,
    rapidapiKey : "", // X-RapidAPI-Key provided at https://rapidapi.com/astsiatsko/api/coronavirus-monitor
    headerRowClass: "small", // small, medium or big
    infoRowClass: "big", // small, medium or big
    updateInterval: 300000, // update interval in milliseconds
    fadeSpeed: 4000
  },

  getStyles: function() {
    return ["MMM-COVID19.css"]
  },

  getScripts: function() {
    return [
      this.file("lib/highcharts.js"), 
      this.file("lib/date.min.js"),
    ];
  },

  start: function() {
    this.getInfo()
    this.scheduleUpdate()
  },

  scheduleUpdate: function(delay) {
    var nextLoad = this.config.updateInterval
    if (typeof delay !== "undefined" && delay >= 0) {
      nextLoad = delay
    }
    var self = this
    setInterval(function() {
      self.getInfo()
    }, nextLoad)
  },

  getInfo: function () {
    this.sendSocketNotification('GET_GLOBAL_STATS');
  },

  socketNotificationReceived: function(notification, payload) {
    var self = this

    if (notification === "GLOBAL_RESULT") {
      console.log(payload);
      this.globalStats = payload;
      this.updateDom(self.config.fadeSpeed);
    }
  },

  getHeader: function() {
    return this.config.header
  },

  getNumberFromString: function(strnumber) {
    return Number(strnumber.split(',').join(''));
  },

  /* render chart into DOM element */
  /* rawdata = raw data from https://rapidapi.com/ API */
  /* rawdata has two properties:
   * 1. country
   * 2. stat_by_country
   */
  getChart: function(rawdata) {
    var chart = document.createElement("div");
    var plotseries = [{name: '', data:[]}];  /* empty series to get started */
    chart.id = "covid19-sparkline-chart";

    if (rawdata == undefined)
    {
      return(chart.cloneNode(true));
    }

    //chart.style.cssText = "float: right;";
    /* create a new series object given the raw data */
    /* we have to separate the junk in the raw data */
    for (var i=0; i<rawdata.stat_by_country.length; i++)
    {
      t = Date.parse(rawdata.stat_by_country[i].record_date);
      plotseries[0].data.push([t.valueOf(), this.getNumberFromString( rawdata.stat_by_country[i].total_cases ) ]);
    }

    /* render directly to chart div */
    Highcharts.chart(chart, {
      title: {
        text: '',
      },
      chart: {
        type: 'area',
        margin: [2, 0, 2, 0],
        width: 120,
        height: 30,
        style: {
          overflow: 'visible'
        },
        backgroundColor: null,
        borderWidth: 0,
        plotShadow: false,
      },
      plotOptions: {
        series: {
          animation: false,
          lineWidth: 1,
          shadow: false,
          states: {
              hover: {
                  lineWidth: 1
              }
          },
          marker: {
              radius: 1,
              states: {
                  hover: {
                      radius: 2
                  }
              }
          },
          fillOpacity: 0.25
        },
      },
      xAxis: {
        type: 'datetime',
        labels: {
            enabled: false
        },
        title: {
            text: null
        },
        startOnTick: false,
        endOnTick: false,
        tickPositions: []
      },
      yAxis: {
          endOnTick: false,
          startOnTick: false,
          labels: {
              enabled: false
          },
          title: {
              text: null
          },
          tickPositions: [0]
      },
      series: plotseries,
      credits: {
        enabled: false
      },
      tooltip: {
        enabled: false
      },
      legend: {
        enabled: false
      },
      colors: ["#DEECFA", "#F00"]
    });

    return chart.cloneNode(true);
  },

  getSummarizedStats: function() {


  },

  getDom: function() {
    var countriesList = this.config.countries;  // countries the user wants
    var globalStats = this.globalStats;         // the global stats for all countries

    if (this.config.orderCountriesByName && countriesStats) {
      countriesStats.sort(this.compareValues('country_name'))
    }
    
    var wrapper = document.createElement("table")
    wrapper.className = this.config.tableClass || 'covid'

    // header row
    var headerRow = document.createElement("tr"),
        headerconfirmedCell = document.createElement("td"),
        headerCountryNameCell = document.createElement("td"),
        headerrecoveredCell = document.createElement("td"),
        headerdeathsCell = document.createElement("td"),
        headeractiveCell = document.createElement("td"),
        headergraphCell = document.createElement("td")

    headerCountryNameCell.innerHTML = ''

    headerconfirmedCell.className = 'number confirmed ' + this.config.headerRowClass
    headerconfirmedCell.innerHTML = 'Confirmed'
    headerdeathsCell.className = 'number deaths ' + this.config.headerRowClass
    headerdeathsCell.innerHTML = 'Deaths'
    headerrecoveredCell.className = 'number recovered ' + this.config.headerRowClass
    headerrecoveredCell.innerHTML = 'Recovered'
    headeractiveCell.className = 'number active ' + this.config.headerRowClass
    headeractiveCell.innerHTML = 'Active'
    headergraphCell.className = 'number ' + this.config.headerRowClass
    headergraphCell.innerHTML = 'Plot'

    headerRow.appendChild(headerCountryNameCell)

    if (this.config.columns.includes("confirmed")) {
      headerRow.appendChild(headerconfirmedCell)
    }
    if (this.config.columns.includes("deaths")) { 
      headerRow.appendChild(headerdeathsCell)
    }
    if (this.config.columns.includes("recovered")) {
      headerRow.appendChild(headerrecoveredCell)
    }
    if (this.config.columns.includes("active")) {
      headerRow.appendChild(headeractiveCell)
    }
    if (this.config.graphHistory == true) {
      headerRow.appendChild(headergraphCell);
    }

    wrapper.appendChild(headerRow)

    // WorldWide row, activate it via config
    if (this.config.worldStats) {
      let worldRow = document.createElement("tr"),
          worldNameCell = document.createElement("td"),
          confirmedCell = document.createElement("td"),
          deathsCell = document.createElement("td"),
          recoveredCell = document.createElement("td"),
          activeCell = document.createElement("td"),
          graphCell = document.createElement("td"),
          cases = globalStats["total_cases"],
          deaths = globalStats["total_deaths"],
          totalRecovered = globalStats["total_recovered"],
          activeCases = '';

      worldNameCell.innerHTML = 'Worldwide'
      worldNameCell.className = this.config.infoRowClass
      worldRow.className = 'world ' + this.config.infoRowClass
      confirmedCell.className = 'number confirmed ' + this.config.infoRowClass
      confirmedCell.innerHTML = cases
      deathsCell.className = 'number deaths ' + this.config.infoRowClass
      deathsCell.innerHTML = deaths
      recoveredCell.className = 'number recovered ' + this.config.infoRowClass
      recoveredCell.innerHTML = totalRecovered
      activeCell.className = 'number active ' + this.config.infoRowClass
      activeCell.innerHTML = activeCases
      graphCell.className = ''
      graphCell.innerHTML = ''

      worldRow.appendChild(worldNameCell)

      if (this.config.columns.includes("confirmed")) {
        worldRow.appendChild(confirmedCell);
      }
      if (this.config.columns.includes("deaths")) {
        worldRow.appendChild(deathsCell);
      }
      if (this.config.columns.includes("recovered")) {
        worldRow.appendChild(recoveredCell);
      }
      if (this.config.columns.includes("active")) {
        worldRow.appendChild(activeCell);
      }
      if (this.config.graphHistory == true) {
        worldRow.appendChild(graphCell);
      }

      wrapper.appendChild(worldRow)
    }

    // countries row, one per country listed at config => countries
    for (let key in countriesStats) {
      let value = countriesStats[key]
      if (countriesList.indexOf(value["country_name"]) != -1) {
        let countryRow = document.createElement("tr"),
            countryNameCell = document.createElement("td"),
            confirmedCell = document.createElement("td"),
            deathsCell = document.createElement("td"),
            recoveredCell = document.createElement("td"),
            activeCell = document.createElement("td"),
            graphCell = document.createElement("td"),
            countryName = value["country_name"],
            cases = value["cases"],
            deaths = value["deaths"],
            totalRecovered = value["total_recovered"],
            activeCases = value["active_cases"];

        countryNameCell.innerHTML = countryName
        countryNameCell.className = this.config.infoRowClass
        confirmedCell.className = 'number confirmed ' + this.config.infoRowClass
        confirmedCell.innerHTML = cases
        deathsCell.className = 'number deaths ' + this.config.infoRowClass
        deathsCell.innerHTML = deaths
        recoveredCell.className = 'number recovered ' + this.config.infoRowClass
        recoveredCell.innerHTML = totalRecovered
        activeCell.className = 'number active ' + this.config.infoRowClass
        activeCell.innerHTML = activeCases
        graphCell.className = 'sparkline'

        countryRow.appendChild(countryNameCell)

        if (this.config.columns.includes("confirmed")) {
          countryRow.appendChild(confirmedCell)
        }
        if (this.config.columns.includes("deaths")) {
          countryRow.appendChild(deathsCell)
        }
        if (this.config.columns.includes("recovered")) {
          countryRow.appendChild(recoveredCell)
        }
        if (this.config.columns.includes("active")) {
          countryRow.appendChild(activeCell)
        }
        if (this.config.graphHistory == true) {
          /* find the history data with the correct name */
          /* and plot the contents */
          for (i=0; i<countryHistoryStats.length; i++)
          {
            if (countryHistoryStats[i].country == countryName)
            {
              graphCell.appendChild(this.getChart(countryHistoryStats[i]));
              console.log(countryName);
              console.log(countryHistoryStats[i]);
              break;
            }
          }
          countryRow.appendChild(graphCell);
        }        

        wrapper.appendChild(countryRow);
      }
    }
    if (this.config.lastUpdateInfo) {
      let statsDateRow = document.createElement("tr"),
          statsDateCell = document.createElement("td");

      statsDateCell.innerHTML = 'statistic taken at ' + this.countriesStats['statistic_taken_at'] + ' (UTC)'
      statsDateCell.colSpan = "5";
      statsDateCell.className = 'last-update'

      statsDateRow.appendChild(statsDateCell)
      wrapper.appendChild(statsDateRow)
    }

		return wrapper
  },
  
  // sort according to some key and the order could be 'asc' or 'desc'
  compareValues: function(key, order = 'asc') {
    return function innerSort(a, b) {
      if (!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
        // property doesn't exist on either object
        return 0
      }
  
      const varA = (typeof a[key] === 'string')
        ? a[key].toUpperCase() : a[key]
      const varB = (typeof b[key] === 'string')
        ? b[key].toUpperCase() : b[key]
  
      let comparison = 0
      if (varA > varB) {
        comparison = 1
      } else if (varA < varB) {
        comparison = -1
      }
      return (
        (order === 'desc') ? (comparison * -1) : comparison
      );
    }
  },  

})
