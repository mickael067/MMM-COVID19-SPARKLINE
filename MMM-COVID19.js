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
      //console.log(payload);
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
  /* rawdata has two properties:
   * 1. name:  this is the name of the country
   * 2. series:  summary of confirmed/deaths for each day
   */
  getChart: function(rawdata) {
    var chart = document.createElement("div");
    var plotseries = [{name: '', data:[]}, {name: '', data:[]}, {name: '', data:[]}];  /* empty series to get started */
    chart.id = "covid19-sparkline-chart";

    if (rawdata == undefined)
    {
      return(chart.cloneNode(true));
    }

    dates = Object.keys(rawdata.series);


    /* create a new series object given the raw data */
    for (var i=0; i<dates.length; i++)
    {
      var d = Date.parse(dates[i]);
      plotseries[0].data.push([d.valueOf(), rawdata.series[dates[i]].confirmed]);
      plotseries[1].data.push([d.valueOf(), rawdata.series[dates[i]].recovered]);
      plotseries[2].data.push([d.valueOf(), rawdata.series[dates[i]].deaths]);
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
        backgroundColor: 'transparent',
        borderWidth: 0,
        plotShadow: false,
      },
      plotOptions: {
        series: {
          animation: false,
          lineWidth: 0.25,
          shadow: false,
          states: {
              hover: {
                  lineWidth: 0,
              }
          },
          marker: {
              radius: 0,
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
        visible: false,
      },
      yAxis: {
          visible: false,
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
      colors: ["#DEECFA", "#0F0", "#F00"]
    });

    return chart.cloneNode(true);
  },

  /* given a list of dates, get the value of the last one */
  getLastDateInSeries: function(dates) {
    maxdatestring = dates[dates.length-1];
    return maxdatestring;
  },

  /* given a country, return a summary of all results involving that country */
  /* provided empty string, will get summary for all countries */
  getSummarizedStats: function(country) {
    var globalStats = this.globalStats;
    var result = {confirmed:0, deaths:0, recovered:0};

    if (globalStats.data == undefined) {
      return;
    }
    else {
      var keys = Object.keys(globalStats.data);
    }

    country += ":";  /* append colon because that's how Johns Hopkins U did it */

    for (var i=0; i<keys.length; i++)
    {
      if (keys[i].includes(country)) {
        //figure out the most recent date in the list
        maxdatestring = this.getLastDateInSeries(Object.keys(globalStats.data[keys[i]].series));
        result.confirmed += globalStats.data[keys[i]].series[maxdatestring].confirmed;
        result.deaths += globalStats.data[keys[i]].series[maxdatestring].deaths;
        result.recovered += globalStats.data[keys[i]].series[maxdatestring].recovered;
      }
    }

    return (result);
  },

  /* get a value row from the reusults data.  This is a helper, it will insert colon if necessary */
  getValueRow: function(country) {
    var globalStats = this.globalStats;

    country += ":";  /* append colon because that's how Johns Hopkins U did it */
    row = globalStats.data[country];
    return row;
  },

  /* will get a summary of ALL data for the given country -- this is done by adding up the results for each day in the table */
  getSummaryRow: function(country) {
    var globalStats = this.globalStats;
    var keys = Object.keys(globalStats.data);
    var summaryrow = {};

    summaryrow.name = country;
    summaryrow.series = {};

    for (var i=0; i<keys.length; i++)
    {
      if (keys[i].includes(country)) {
        //console.log("getSummaryRow:", keys[i]);
        dates = Object.keys(globalStats.data[keys[i]].series);
        for (d=0; d<dates.length; d++)
        {
          thisdaysdata = globalStats.data[keys[i]].series[dates[d]];
          if (summaryrow.series[dates[d]] == undefined) {
            summaryrow.series[dates[d]] = {confirmed:thisdaysdata.confirmed, deaths:thisdaysdata.deaths, recovered:thisdaysdata.recovered};
          }
          else {
            summaryrow.series[dates[d]].confirmed += thisdaysdata.confirmed;
            summaryrow.series[dates[d]].deaths += thisdaysdata.deaths;
            summaryrow.series[dates[d]].recovered += thisdaysdata.recovered;
          }
        }
      }
    }
    return summaryrow;
  },

  getDom: function() {
    var countriesList = this.config.countries;  // countries the user wants
    var globalStats = this.globalStats;         // the global stats for all countries

    var wrapper = document.createElement("table")
    wrapper.className = this.config.tableClass || 'covid';


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
    if ((this.config.worldStats) && (globalStats.worldwide != undefined)){
      lastdate = this.getLastDateInSeries(Object.keys(globalStats.worldwide.series));

      let worldRow = document.createElement("tr"),
          worldNameCell = document.createElement("td"),
          confirmedCell = document.createElement("td"),
          
          deathsCell = document.createElement("td"),
          recoveredCell = document.createElement("td"),
          activeCell = document.createElement("td"),
          graphCell = document.createElement("td"),

          cases = globalStats.worldwide.series[lastdate].confirmed,
          deaths = globalStats.worldwide.series[lastdate].deaths,
          recovered = globalStats.worldwide.series[lastdate].recovered,
          activeCases = cases - deaths - recovered;

      //console.log(globalStats);

      worldNameCell.innerHTML = 'Worldwide'
      worldNameCell.className = this.config.infoRowClass
      worldRow.className = 'world ' + this.config.infoRowClass

      confirmedCell.className = 'number confirmed ' + this.config.infoRowClass
      confirmedCell.innerHTML = cases

      deathsCell.className = 'number deaths ' + this.config.infoRowClass
      deathsCell.innerHTML = deaths

      recoveredCell.className = 'number recovered ' + this.config.infoRowClass
      recoveredCell.innerHTML = recovered

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
        graphCell.appendChild(this.getChart(globalStats.worldwide));
        worldRow.appendChild(graphCell);
      }

      wrapper.appendChild(worldRow)
    }

    // countries row, one per country listed at config => countries
    for (var i=0; i<countriesList.length; i++) {
      if (globalStats.data != undefined) {
        let countryName = countriesList[i];
        let stats = this.getSummarizedStats(countryName);   /* calculated statistics */
        ////console.log(stats);

        let countryRow = document.createElement("tr"),
            countryNameCell = document.createElement("td"),
            confirmedCell = document.createElement("td"),
            deathsCell = document.createElement("td"),
            recoveredCell = document.createElement("td"),
            activeCell = document.createElement("td"),
            graphCell = document.createElement("td"),

            cases = stats.confirmed;
            deaths = stats.deaths;
            recovered = stats.recovered;
            active = cases-deaths-recovered;;

        countryNameCell.innerHTML = countryName;
        countryNameCell.className = this.config.infoRowClass;
        confirmedCell.className = 'number confirmed ' + this.config.infoRowClass;
        confirmedCell.innerHTML = cases;
        deathsCell.className = 'number deaths ' + this.config.infoRowClass;
        deathsCell.innerHTML = deaths;
        recoveredCell.className = 'number recovered ' + this.config.infoRowClass;
        recoveredCell.innerHTML = recovered;
        activeCell.className = 'number active ' + this.config.infoRowClass;
        activeCell.innerHTML = active;
        graphCell.className = 'sparkline';

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
          var summaryrow = this.getSummaryRow(countryName);
          //console.log(summaryrow);
          graphCell.appendChild(this.getChart(summaryrow));
          countryRow.appendChild(graphCell);
        }        

        wrapper.appendChild(countryRow);
      }
    }
    if (this.config.lastUpdateInfo) {
      let statsDateRow = document.createElement("tr"),
          statsDateCell = document.createElement("td");

      //statsDateCell.innerHTML = 'statistic taken at ' + this.countriesStats['statistic_taken_at'] + ' (UTC)'
      statsDateCell.colSpan = "5";
      statsDateCell.className = 'last-update'

      statsDateRow.appendChild(statsDateCell)
      wrapper.appendChild(statsDateRow)
    }

		return wrapper;
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
