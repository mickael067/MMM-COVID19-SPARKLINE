/* global Module */

/* Magic Mirror
 * Module: MMM-COVID19-SPARKLINE
 *
 * William Skellenger (@skelliam)
 * Heavily influenced/borrowed from: 
 *    [MMM-COVID19](https://github.com/bibaldo/MMM-COVID19) by Jose Forte
 *    [MMM-COVID-19](https://github.com/eouia/MMM-COVID-19) by Seongnoh Sean Yi
 *  
 * MIT Licensed.
 * 
 * 
 */

Module.register("MMM-COVID19-SPARKLINE", {
  countriesStats: {},
  countryHistoryStats: [],
  globalStats: { "total_cases": "", "total_deaths": "", "total_recovered": "" }, // beautify things at start
  defaults: {
    header: 'COVID-19-SPARKLINE',    
    countries: [ "US", "Italy", "Germany", "Canada", "Mexico" ], // default list
    columns: ["confirmed", "deaths", "recovered"], // default columns to display 
    orderCountriesByName: false,
    lastUpdateddInfo: false,
    worldStats: true,
    headerRowClass: "small", // small, medium or big
    infoRowClass: "medium", // small, medium or big
    updateInterval: 10800000, // update interval in milliseconds, default value 3 hours
    fadeSpeed: 1000,
    sparklines: true,
    sparklineWidth: 120,
    sparklineHeight: 30,
    sparklineDays: 0,  // configure as zero to get ALL days
    sparklineDeltavsDaily: false,  //will show Delta vs Daily plot in first position, see https://www.youtube.com/watch?v=54XLXg4fYsc
    sortby: "confirmed",  // the column to sort the output by
    showDelta: false,     // whether or not to show change from last reading, will also show delta plot if sparklines are on
  },

  getStyles: function() {
    return ["MMM-COVID19-SPARKLINE.css"]
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
  /* plotdelta: set true if you wish to plot delta values instead of raw values */
  /* rawdata has two properties:
   * 1. name:  this is the name of the country
   * 2. series:  summary of confirmed/deaths for each day
   */
  getChart: function(rawdata, plottype="dailytotalvstime") {
    var chart = document.createElement("div");
    var startidx = 0;
    var plotseries = [{name: '', data:[]}, {name: '', data:[]}, {name: '', data:[]}];  /* empty series to get started */
    var xaxistype = '';
    var yaxistype = '';
    var xaxismin = 0;
    var yaxismin = 0;
    var xaxismax = null;
    var yaxismax = null;

    chart.id = "covid19-sparkline-chart";

    if (rawdata == undefined)
    {
      return(chart.cloneNode(true));
    }

    dates = Object.keys(rawdata.series);

    /* when plotting delta vs daily we will use all available data */
    if (plottype == 'lastweekdeltavsdailytotal') {
      startidx = 0;
    }
    /* otherwise we will use the user-configured number of days */
    else if (this.config.sparklineDays != 0) {
      startidx = Math.max(dates.length-this.config.sparklineDays, 0);
    }



    /* create a new series object given the raw data */
    /* notice, these are stacked in a way that makes the colors more visible */
    if (plottype == "dailytotalvstime") {
      xaxistype = 'datetime';
      yaxistype = '';
      xaxismin = null;
      yaxismin = 0;
      for (var i=startidx; i<dates.length; i++)
      {
        var d = Date.parse(dates[i]);
        if (this.config.columns.includes("confirmed")) {
          plotseries[0].data.push([d.valueOf(), rawdata.series[dates[i]].confirmed]);
        }
        if (this.config.columns.includes("recovered")) {
          plotseries[1].data.push([d.valueOf(), rawdata.series[dates[i]].recovered]);
        }
        if (this.config.columns.includes("deaths")) {
          plotseries[2].data.push([d.valueOf(), rawdata.series[dates[i]].deaths]);
        }
      }
    }
    else if (plottype == "deltavstime") {
      xaxistype = 'datetime';
      yaxistype = '';
      xaxismin = null;
      yaxismin = 0;
      for (var i=startidx; i<dates.length; i++)
      {
        var d = Date.parse(dates[i]);
        if (this.config.columns.includes("confirmed")) {
          plotseries[0].data.push([d.valueOf(), rawdata.series[dates[i]].d_confirmed]);
        }
        if (this.config.columns.includes("recovered")) {
          plotseries[1].data.push([d.valueOf(), rawdata.series[dates[i]].d_recovered]);
        }
        if (this.config.columns.includes("deaths")) {
          plotseries[2].data.push([d.valueOf(), rawdata.series[dates[i]].d_deaths]);
        }
      }
    }
    /* this type of plot inspired by https://www.youtube.com/watch?v=54XLXg4fYsc */
    /* "How To Tell If We're Beating COVID-19" */
    else if (plottype == "lastweekdeltavsdailytotal") {
      xaxistype = 'logarithmic';
      yaxistype = 'logarithmic';
      xaxismin = 1;
      yaxismin = 1;
      xaxismax = 100000000;
      console.log(rawdata.series);
      for (var i=startidx; i<dates.length; i++)
      {
        var d = Date.parse(dates[i]);
        var d_weekly = 0;
        /* get weekly change in cases */
        for (var j=0; j<7; j++)
        {
          idx = Math.max((i-j), 0);
          d_weekly += rawdata.series[dates[idx]].d_confirmed;
        }
        /* zero or negative values not allowed in log chart */
        plotseries[0].data.push([Math.max(rawdata.series[dates[i]].confirmed, 1), Math.max(d_weekly, 1)]);
      }
      console.log(plotseries[0]);
    }
    else {
      /* nothing to do, wrong specification */
    }

    /* render directly to chart div */
    Highcharts.chart(chart, {
      title: {
        text: '',
      },
      chart: {
        type: 'area',
        margin: [2, 0, 2, 0],
        width: this.config.sparklineWidth,
        height: this.config.sparklineHeight,
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
          lineWidth: 0.85,
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
          fillOpacity: 0.35
        },
      },
      xAxis: {
        type: xaxistype,
        visible: false,
        min: xaxismin,
        max: xaxismax,
      },
      yAxis: {
        type: yaxistype,
        visible: false,
        min: yaxismin,
        max: yaxismax,
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
      /*        gray       green     red  */
      colors: ["#5d93c6", "#00d100", "#FF0000"]
    });

    return chart.cloneNode(true);
  },

  /* given a list of dates, get the value of the last one */
  getLastDateInSeries: function(dates) {
    var maxdatestring = dates[dates.length-1];
    return maxdatestring;
  },

  /* given a list of dates, get the value of the nth from the end */
  /* 0 means last one */
  /* 1 means one from the end, etc. */
  getNthDateFromEnd: function(dates, n) {
    var maxdatestring = dates[dates.length-(n+1)];
    return maxdatestring;
  },

  /* append positive sign for delta change */
  decorateNumber: function(value) {
    var output = "";
    if (value >= 0) {
      output = "+" + String(value);
    }
    else {
      output = String(value);
    }
    return output;
  },

  /* get percentage in parenthesis */
  getPercentageChg: function(value) {
    var output = "";
    value -= 1.0;
    output = Math.round(value * 100);
    //output = this.decorateNumber(output);
    output = "(" + String(output) + "%)"
    return output;
  },

  /* given a country, return a summary of all results involving that country */
  /* provided empty string, will get summary for all countries */
  getSummarizedStats: function(country) {
    var globalStats = this.globalStats;
    var result = {confirmed:0, deaths:0, recovered:0, d_confirmed:0, d_deaths:0, d_recovered:0};

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

        result.d_confirmed += globalStats.data[keys[i]].series[maxdatestring].d_confirmed;
        result.d_deaths += globalStats.data[keys[i]].series[maxdatestring].d_deaths;
        result.d_recovered += globalStats.data[keys[i]].series[maxdatestring].d_recovered
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
        dates = Object.keys(globalStats.data[keys[i]].series);
        for (d=0; d<dates.length; d++)
        {
          thisdaysdata = globalStats.data[keys[i]].series[dates[d]];
          if (summaryrow.series[dates[d]] == undefined) {
            summaryrow.series[dates[d]] = {confirmed:thisdaysdata.confirmed, deaths:thisdaysdata.deaths, recovered:thisdaysdata.recovered, d_confirmed:thisdaysdata.d_confirmed, d_deaths:thisdaysdata.d_deaths, d_recovered:thisdaysdata.d_recovered};
          }
          else {
            summaryrow.series[dates[d]].confirmed += thisdaysdata.confirmed;
            summaryrow.series[dates[d]].deaths += thisdaysdata.deaths;
            summaryrow.series[dates[d]].recovered += thisdaysdata.recovered;

            summaryrow.series[dates[d]].d_confirmed += thisdaysdata.d_confirmed;
            summaryrow.series[dates[d]].d_deaths += thisdaysdata.d_deaths;
            summaryrow.series[dates[d]].d_recovered += thisdaysdata.d_recovered;
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
        headergraphCell = document.createElement("td")
        headerdgraphCell = document.createElement("td")


    headerCountryNameCell.innerHTML = ''

    headerconfirmedCell.className = 'number confirmed ' + this.config.headerRowClass
    headerconfirmedCell.innerHTML = 'Confirmed'
    headerdeathsCell.className = 'number deaths ' + this.config.headerRowClass
    headerdeathsCell.innerHTML = 'Deaths'
    headerrecoveredCell.className = 'number recovered ' + this.config.headerRowClass
    headerrecoveredCell.innerHTML = 'Recovered'
    headergraphCell.className = 'number ' + this.config.headerRowClass
    
    if (this.config.sparklineDeltavsDaily == false) {
      headergraphCell.innerHTML = 'Daily Plot';
    }
    else {
      headergraphCell.innerHTML = 'Delta vs Daily';
    }

    headerdgraphCell.className = 'number ' + this.config.headerRowClass
    headerdgraphCell.innerHTML = 'Delta Plot'

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
    if (this.config.sparklines == true) {
      headerRow.appendChild(headergraphCell);
      if (this.config.showDelta == true) {
        headerRow.appendChild(headerdgraphCell);
      }
    }

    wrapper.appendChild(headerRow)

    // WorldWide row, activate it via config
    if ((this.config.worldStats) && (globalStats.worldwide != undefined)){
      lastdate = this.getNthDateFromEnd(Object.keys(globalStats.worldwide.series), 0);

      let worldRow = document.createElement("tr"),
          worldNameCell = document.createElement("td"),
          confirmedCell = document.createElement("td"),
          deathsCell = document.createElement("td"),
          recoveredCell = document.createElement("td"),
          graphCell = document.createElement("td"),

          d_worldRow = document.createElement("tr"),  // _d is for delta
          d_worldNameCell = document.createElement("td"),
          d_confirmedCell = document.createElement("td"),
          d_deathsCell = document.createElement("td"),
          d_recoveredCell = document.createElement("td"),
          d_graphCell = document.createElement("td"),
          d_padCell = document.createElement("td"),

          confirmed = globalStats.worldwide.series[lastdate].confirmed,
          deaths = globalStats.worldwide.series[lastdate].deaths,
          recovered = globalStats.worldwide.series[lastdate].recovered,

          d_confirmed = globalStats.worldwide.series[lastdate].d_confirmed,
          d_deaths = globalStats.worldwide.series[lastdate].d_deaths,
          d_recovered = globalStats.worldwide.series[lastdate].d_recovered;

      worldNameCell.innerHTML = 'Worldwide'
      worldNameCell.className = this.config.infoRowClass
      worldRow.className = this.config.infoRowClass 

      /* when not showing delta row, the worldRow will have the double line beneath it */
      if (this.config.showDelta == false) {
        worldRow.className += " world "
      }

      d_worldNameCell.innerHTML = ''
      d_worldRow.className = 'world ' + this.config.infoRowClass

      confirmedCell.className = 'number confirmed ' + this.config.infoRowClass
      confirmedCell.innerHTML = confirmed
      d_confirmedCell.className = 'number confirmed micro'
      d_confirmedCell.innerHTML = this.decorateNumber(d_confirmed) + " " + this.getPercentageChg(confirmed/(confirmed-d_confirmed));

      deathsCell.className = 'number deaths ' + this.config.infoRowClass
      deathsCell.innerHTML = deaths
      d_deathsCell.className = 'number deaths micro'
      d_deathsCell.innerHTML = this.decorateNumber(d_deaths) + " " + this.getPercentageChg(deaths/(deaths-d_deaths));

      recoveredCell.className = 'number recovered ' + this.config.infoRowClass
      recoveredCell.innerHTML = recovered
      d_recoveredCell.className = 'number recovered micro'
      d_recoveredCell.innerHTML = this.decorateNumber(d_recovered) + " " + this.getPercentageChg(recovered/(recovered-d_recovered));

      graphCell.className = 'world'
      graphCell.innerHTML = ''
      d_graphCell.className = 'world'
      d_graphCell.innerHTML = ''

      worldRow.appendChild(worldNameCell)
      d_worldRow.appendChild(d_worldNameCell);  /* empty */

      if (this.config.columns.includes("confirmed")) {
        worldRow.appendChild(confirmedCell);
        d_worldRow.appendChild(d_confirmedCell);
      }
      if (this.config.columns.includes("deaths")) {
        worldRow.appendChild(deathsCell);
        d_worldRow.appendChild(d_deathsCell);
      }
      if (this.config.columns.includes("recovered")) {
        worldRow.appendChild(recoveredCell);
        d_worldRow.appendChild(d_recoveredCell);
      }
      if (this.config.sparklines == true) {
        //render daily plot
        if (this.config.sparklineDeltavsDaily == false) {
          graphCell.appendChild(this.getChart(globalStats.worldwide, "dailytotalvstime"));
        }
        else {
          graphCell.appendChild(this.getChart(globalStats.worldwide, "lastweekdeltavsdailytotal"));
        }
        if (this.config.showDelta == true) {
          graphCell.setAttribute("rowspan", "2");
        }
        worldRow.appendChild(graphCell);
        //render daily delta plot
        d_graphCell.appendChild(this.getChart(globalStats.worldwide, "deltavstime"));
        //put the d_graph at the end of the primary row to save space
        if (this.config.showDelta == true) {
          d_graphCell.setAttribute("rowspan", "2");
          worldRow.appendChild(d_graphCell);
        }
      }

      wrapper.appendChild(worldRow)

      if (this.config.showDelta == true) {
        wrapper.appendChild(d_worldRow);
      }


    }

    // countries row, one per country listed at config => countries
    for (var i=0; i<countriesList.length; i++) {
      if (globalStats.data != undefined) {
        let countryName = countriesList[i];
        let stats = this.getSummarizedStats(countryName);   /* calculated statistics */

        let countryRow = document.createElement("tr"),
            countryNameCell = document.createElement("td"),
            confirmedCell = document.createElement("td"),
            deathsCell = document.createElement("td"),
            recoveredCell = document.createElement("td"),
            graphCell = document.createElement("td"),
            d_graphCell = document.createElement("td"),

            d_countryRow = document.createElement("tr"),
            d_countryNameCell = document.createElement("td"),
            d_confirmedCell = document.createElement("td"),
            d_deathsCell = document.createElement("td"),
            d_recoveredCell = document.createElement("td"),
            d_padCell = document.createElement("td"),

            confirmed = stats.confirmed;
            deaths = stats.deaths;
            recovered = stats.recovered;
      
            d_confirmed = stats.d_confirmed;
            d_deaths = stats.d_deaths;
            d_recovered = stats.d_recovered;

        countryNameCell.innerHTML = countryName;
        countryNameCell.className = this.config.infoRowClass;
        d_countryNameCell.innerHTML = "";
        d_countryNameCell.className = 'micro';

        confirmedCell.className = 'number confirmed ' + this.config.infoRowClass;
        confirmedCell.innerHTML = confirmed;
        d_confirmedCell.className = 'number confirmed micro';
        d_confirmedCell.innerHTML = this.decorateNumber(d_confirmed) + " " + this.getPercentageChg(confirmed/(confirmed-d_confirmed));

        deathsCell.className = 'number deaths ' + this.config.infoRowClass;
        deathsCell.innerHTML = deaths;
        d_deathsCell.className = 'number deaths micro';
        d_deathsCell.innerHTML = this.decorateNumber(d_deaths) + " " + this.getPercentageChg(deaths/(deaths-d_deaths));

        recoveredCell.className = 'number recovered ' + this.config.infoRowClass;
        recoveredCell.innerHTML = recovered;
        d_recoveredCell.className = 'number recovered micro';
        d_recoveredCell.innerHTML = this.decorateNumber(d_recovered) + " " + this.getPercentageChg(recovered/(recovered-d_recovered));

        graphCell.className = 'sparkline';
        graphCell.innerHTML = '';
        d_graphCell.className = 'sparkline';
        d_graphCell.innerHTML = '';

        d_padCell.className = "micro";

        countryRow.appendChild(countryNameCell)
        d_countryRow.appendChild(d_countryNameCell)   /* empty */

        if (this.config.columns.includes("confirmed")) {
          countryRow.appendChild(confirmedCell)
          d_countryRow.appendChild(d_confirmedCell)
        }
        if (this.config.columns.includes("deaths")) {
          countryRow.appendChild(deathsCell)
          d_countryRow.appendChild(d_deathsCell)
        }
        if (this.config.columns.includes("recovered")) {
          countryRow.appendChild(recoveredCell)
          d_countryRow.appendChild(d_recoveredCell)
        }
        if (this.config.sparklines == true) {
          /* find the history data with the correct name */
          /* and plot the contents */
          var summaryrow = this.getSummaryRow(countryName);
          //render daily chart
          if (this.config.sparklineDeltavsDaily == false) {
            graphCell.appendChild(this.getChart(summaryrow, "dailytotalvstime"));
          }
          else {
            graphCell.appendChild(this.getChart(summaryrow, "lastweekdeltavsdailytotal"));
          }

          if (this.config.showDelta == true) {
            graphCell.setAttribute("rowspan", "2");
          }
          countryRow.appendChild(graphCell);

          //render daily delta chart
          d_graphCell.appendChild(this.getChart(summaryrow, "deltavstime"));

          if (this.config.showDelta == true) {
            d_graphCell.setAttribute("rowspan", "2");
            countryRow.appendChild(d_graphCell);  //put delta graph at end of normal row for space savings
          }
        }        

        wrapper.appendChild(countryRow);

        if (this.config.showDelta == true) {
          wrapper.appendChild(d_countryRow);
        }

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
