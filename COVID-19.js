const GithubContent = require('github-content')
const C2J = require('csvtojson')
const moment = require('moment')

class CovidSeries {
  confirmed = 0;
  deaths = 0;
}

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
    var ci = new Set()
    var pi = []
    var latest = lastDay.format("MM-DD-YYYY") + ".csv"
    var initSeries = () => {
      var ret = {};
      return ret
    }
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

      var csvtxt = confirmed.contents.toString()
      var jsonObj = await C2J().fromString(csvtxt)

      // latest daily totals
      for (var r of jsonObj) {
        var key = this.extractRegionKey_slash(r)
        var ps = r["Province/State"].trim()
        var cr = r["Country/Region"].trim()

        regions[key] = {
          key: key,
          //lastupdate: Number(moment(r["Last_Update"]).format("x")),
          //lastseries: Number(lastDay.format("x")),
          name: ((ps && ps.trim() !== cr.trim()) ? `${ps}, ${cr}` : cr),
          provincestate: ps,
          countryregion: cr,
          latitude: Number(r.Lat),
          longitude: Number(r.Long),
          series: [],
        }
      }
      
      const parse = (obj, type) => {
        return new Promise((resolve, reject)=>{
          for (var r of obj) {
            var rkey = this.extractRegionKey_slash(r)
            if (!regions.hasOwnProperty(rkey)) {
              console.log("can't find property", rkey);
              continue;
            }
            var headers = Object.keys(r)

            /* get all days available; first day is column 4 */
            for (var i=4; i<headers.length; i++)
            {
              var dkey = headers[i];
              /* init with new series if it doesn't exist */
              if (regions[rkey].series[dkey] == undefined)
              {
                regions[rkey].series[dkey] = new CovidSeries();
              }
              regions[rkey].series[dkey][type] = Number(r[dkey]);
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
      }

      await step()

      this.log("Scan Completed.")
      finish({
        data: Object.values(regions),
        reportTime: lastDay.format('x'),
      })
    })
  }
}


module.exports = Covid19
