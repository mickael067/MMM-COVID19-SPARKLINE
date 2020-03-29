const GithubContent = require('github-content')
const C2J = require('csvtojson')
const moment = require('moment')

const STARTCOL = 4;

class Covid19 {
  constructor(options=null) {
    this.regions = {}
    this.options = options
    this.repo = {
      owner: 'CSSEGISandData',
      repo: 'COVID-19',
      branch: 'master'
    }
  }

  log(...args) {
    if (this.options.debug) {
      console.log("[COVID:CORE]", ...args)
    }
  }

  extractRegionKey_uscore(obj) {
    return obj["Country_Region"].trim() + ":" + obj["Province_State"].trim()
  }

  extractRegionKey_slash(obj) {
    return obj["Country/Region"].trim() + ":" + obj["Province/State"].trim()
  }

  scan(finish=()=>{}) {
    this.log("Scan starts.")
    var lastDay = moment.utc().add(-1, "day").startOf("day")
    var regions = {}

    var sources = [
      'csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv',
      'csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv',
      'csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_recovered_global.csv'
    ]
    var gc = new GithubContent(this.repo)

    gc.files(sources, async (err, files) => {
      this.log("Access to data source.")
      if (err) {
        this.log("Error:", err)
        finish({error:err})
      }
      var confirmed = files.find((f)=>{return f.path == sources[0]})    /* confirmed timeseries */
      var deaths = files.find((f)=>{return f.path == sources[1]})       /* deaths timeseries */
      var recovered = files.find((f)=>{return f.path == sources[2]})    /* recovered timeseries */

      var csvtxt = confirmed.contents.toString()
      var jsonObj = await C2J().fromString(csvtxt)

      // latest daily totals
      for (var r of jsonObj) {
        var key = this.extractRegionKey_slash(r)
        var ps = r["Province/State"].trim()
        var cr = r["Country/Region"].trim()

        regions[key] = {
          key: key,
          name: ((ps && ps.trim() !== cr.trim()) ? `${ps}, ${cr}` : cr),
          provincestate: ps,
          countryregion: cr,
          latitude: Number(r.Lat),
          longitude: Number(r.Long),
          series: {},
        }
      }
      
      const parse = (obj, type) => {
        return new Promise((resolve, reject)=>{
          for (var r of obj) {
            var rkey = this.extractRegionKey_slash(r)
            //console.log(rkey);
            if (!regions.hasOwnProperty(rkey)) {
              /* for whatever reason, Canada has regional reports for confirmed and deaths, but only countrywide reports for recoveries */
              console.log("can't find property", type, rkey);
              console.log("adding...");
              var ps = r["Province/State"].trim()
              var cr = r["Country/Region"].trim()
              regions[rkey] = {
                key: rkey,
                name: ((ps && ps.trim() !== cr.trim()) ? `${ps}, ${cr}` : cr),
                provincestate: ps,
                countryregion: cr,
                latitude: Number(r.Lat),
                longitude: Number(r.Long),
                series: {},
              };
            }
            var headers = Object.keys(r)

            /* get all days available; first column of dates is STARTCOL */
            for (var i=STARTCOL; i<headers.length; i++)
            {
              var dkey = headers[i];
              var dkey_last = headers[i];

              if (i > STARTCOL) {
                dkey_last = headers[i-1];
              }
              
              /* init with new series if it doesn't exist */
              if (regions[rkey].series[dkey] == undefined)
              {
                regions[rkey].series[dkey] = {confirmed:0, d_confirmed:0, deaths:0, d_deaths:0, recovered:0, d_recovered:0};
              }

              regions[rkey].series[dkey][type] = Number(r[dkey]);
              regions[rkey].series[dkey]["d_"+type] = Number(r[dkey]) - Number(r[dkey_last]);
            }
          }
          resolve()
        })
      }

      var step = async()=>{
        var cjo = await C2J().fromString(confirmed.contents.toString())
        this.log("Resolving:", files[0].path)
        await parse(cjo, "confirmed")

        var djo = await C2J().fromString(deaths.contents.toString())
        this.log("Resolving:", files[1].path)
        await parse(djo, "deaths")

        var rjo = await C2J().fromString(recovered.contents.toString())
        this.log("Resolving:", files[2].path)
        await parse(rjo, "recovered")
      }

      await step()

      this.log("Calculating Wordlwide total.")

      /* add a worldwide summary */
      var worldwide = {
        key: "Worldwide:",
        name: "Worldwide",
        provincestate: "",
        countryregion: "",
        latitude: 0,
        longitude: 0,
        series: {},
      };

      var keys = Object.keys(regions);
      for (var i=0; i<keys.length; i++) {
        key = keys[i];
        var dates = Object.keys(regions[key].series);

        for (var d=0; d<dates.length; d++) {
          if (worldwide.series[dates[d]] == undefined) {
            worldwide.series[dates[d]] = regions[key].series[dates[d]];
          }
          else {
            worldwide.series[dates[d]].confirmed += regions[key].series[dates[d]].confirmed;
            worldwide.series[dates[d]].deaths += regions[key].series[dates[d]].deaths;
            worldwide.series[dates[d]].recovered += regions[key].series[dates[d]].recovered;
          }
        }
      }

      /* worldwide dates */
      var dates = Object.keys(worldwide.series);

      /* init first delta as zero */
      worldwide.series[dates[0]].d_confirmed = 0;
      worldwide.series[dates[0]].d_deaths = 0;
      worldwide.series[dates[0]].d_recovered = 0;
      
      /* compute worldwide deltas */
      for (var d=1; d<dates.length; d++) {
        worldwide.series[dates[d]].d_confirmed = worldwide.series[dates[d]].confirmed - worldwide.series[dates[d-1]].confirmed;
        worldwide.series[dates[d]].d_deaths = worldwide.series[dates[d]].deaths - worldwide.series[dates[d-1]].deaths;
        worldwide.series[dates[d]].d_recovered = worldwide.series[dates[d]].recovered - worldwide.series[dates[d-1]].recovered;
      }

      this.log("Scan Completed.")
      finish({
        data: regions,
        reportTime: lastDay.format('x'),
        worldwide: worldwide,
      })
    })
  }
}


module.exports = Covid19
