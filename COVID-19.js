const GithubContent = require('github-content')
const C2J = require('csvtojson')
const moment = require('moment')


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
    var days = [6,5,4,3,2,1,0].map((d)=>{
      return moment(lastDay).subtract(d, "day").format("M/D/YY")
    })
    var initSeries = () => {
      var ret = {}
      for (var i of days) {
        ret[i] = {
          confirmed:0,
          deaths:0,
          recovered:0
        }
      }
      return ret
    }
    var sources = [
      'csse_covid_19_data/csse_covid_19_daily_reports/' + latest,
      'csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv',
      'csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv',
    ]
    var gc = new GithubContent(this.repo)

    gc.files(sources, async (err, files) => {
      this.log("Access to data source.")
      if (err) {
        this.log("Error:", err)
        finish({error:err})
      }
      var lastUpdates = files.find((f)=>{return f.path == sources[0]})  /* latest daily */
      var confirmed = files.find((f)=>{return f.path == sources[1]})    /* confirmed timeseries */
      var deaths = files.find((f)=>{return f.path == sources[2]})       /* deaths timeseries */
      var recovered = files.find((f)=>{return f.path == sources[3]})    /* recovered timeseries */

      var csvtxt = lastUpdates.contents.toString()
      var jsonObj = await C2J().fromString(csvtxt)

      // latest daily totals
      for (var r of jsonObj) {
        var key = this.extractRegionKey_uscore(r)
        var ps = r["Province_State"].trim()
        var cr = r["Country_Region"].trim()

        regions[key] = {
          key: key,
          lastupdate: Number(moment(r["Last_Update"]).format("x")),
          lastseries: Number(lastDay.format("x")),
          name: ((ps && ps.trim() !== cr.trim()) ? `${ps}, ${cr}` : cr),
          provincestate: ps,
          countryregion: cr,
          latitude: Number(r.Latitude),
          longitude: Number(r.Longitude),
          series:initSeries(days),
        }
      }
      
      const parse = (obj, type) => {
        return new Promise((resolve, reject)=>{
          for (var r of obj) {
            var rkey = this.extractRegionKey_slash(r)
            if (!regions.hasOwnProperty(rkey)) continue
            var headers = Object.keys(r)
            for (var i = 0; i < days.length; i++) {
              var dkey = days[i]
              regions[rkey].series[dkey][type] = Number(r[dkey])
            }
          }
          resolve()
        })
      }

      var step = async()=>{
        var cjo = await C2J().fromString(confirmed.contents.toString())
        this.log("Resolving:", files[1].path)
        await parse(cjo, "confirmed")

        var djo = await C2J().fromString(deaths.contents.toString())
        this.log("Resolving:", files[2].path)
        await parse(djo, "deaths")

        var rjo = await C2J().fromString(recovered.contents.toString())
        this.log("Resolving:", files[3].path)
        await parse(rjo, "recovered")
      }

      await step()

      this.log("Scan Completed.")
      finish({
        data: Object.values(regions),
        reportTime: lastDay.format('x'),
        seriesKey: days,
      })
    })
  }
}


module.exports = Covid19
