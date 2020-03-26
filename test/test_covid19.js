var assert = require('assert');
var Covid19 = require('../COVID-19');

options = {};
options.debug = true;


describe('Array', function() {
  describe('#indexOf()', function() {
    it('should return -1 when the value is not present', function() {
      assert.equal([1, 2, 3].indexOf(4), -1);
    });
  });
});


describe('Covid', function() {
  let testCovid19 = new Covid19(options=options);

  describe('#instanceof', function() {
      it('should create an instance of covid19 object', function() {
        assert.equal(testCovid19.constructor.name, "Covid19");
      });
    });

    describe('#extractRegionKey_slash()', function() {
      var testvar = new Object();
      testvar["Country/Region"] = "aaa";
      testvar["Province/State"] = "bbb"
      it('should return appropriate key', function() {
        out = testCovid19.extractRegionKey_slash(testvar);
        assert.equal(out, "aaa:bbb");
      });

    });

    describe('#extractRegionKey_uscore()', function() {
      var testvar = new Object();
      testvar["Country_Region"] = "aaa";
      testvar["Province_State"] = "bbb"
      it('should return appropriate key', function() {
        out = testCovid19.extractRegionKey_uscore(testvar);
        assert.equal(out, "aaa:bbb");
      });

    });


    describe('#scan()', function() {
      it('should perform a scan', async function() {
        var result;
        testCovid19.scan((result)=>{
          console.log("here");
          console.log(result.data[0].key);
          console.log(result.data[0].series["1/22/20"]);
          //console.log(result);
        });
      });

    });
  });