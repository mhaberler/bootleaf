(function () {
    'use strict';

    // Linear interpolation
    // The values (y1 and y2) can be arrays
    function linearInterpolate(x1, y1, x2, y2, x) {
        if (x1 == x2) {
            return y1;
        }
        const w = (x - x1) / (x2 - x1);

        if (Array.isArray(y1)) {
            return y1.map((y1, i) => y1 * (1 - w) + y2[i] * w);
        }
        return y1 * (1 - w) + y2 * w;
    }

    // Sampling at at targetXs with linear interpolation
    // xs and ys must have the same length.
    function sampleAt(xs, ys, targetXs) {
        const descOrder = xs[0] > xs[1];
        return targetXs.map((tx) => {
            let index = xs.findIndex((x) => (descOrder ? x <= tx : x >= tx));
            if (index == -1) {
                index = xs.length - 1;
            } else if (index == 0) {
                index = 1;
            }
            return linearInterpolate(xs[index - 1], ys[index - 1], xs[index], ys[index], tx);
        });
    }

    // x?s must be sorted in ascending order.
    // x?s and y?s must have the same length.
    // return [x, y] or null when no intersection found.
    function firstIntersection(x1s, y1s, x2s, y2s) {
        // Find all the points in the intersection of the 2 x ranges
        const min = Math.max(x1s[0], x2s[0]);
        const max = Math.min(x1s[x1s.length - 1], x2s[x2s.length - 1]);
        const xs = Array.from(new Set([...x1s, ...x2s]))
            .filter((x) => x >= min && x <= max)
            .sort((a, b) => (Number(a) > Number(b) ? 1 : -1));
        // Interpolate the lines for all the points of that intersection
        const iy1s = sampleAt(x1s, y1s, xs);
        const iy2s = sampleAt(x2s, y2s, xs);
        // Check if each segment intersect
        for (let index = 0; index < xs.length - 1; index++) {
            const y11 = iy1s[index];
            const y21 = iy2s[index];
            const x1 = xs[index];
            if (y11 == y21) {
                return [x1, y11];
            }
            const y12 = iy1s[index + 1];
            const y22 = iy2s[index + 1];
            if (Math.sign(y21 - y11) != Math.sign(y22 - y12)) {
                const x2 = xs[index + 1];
                const width = x2 - x1;
                const slope1 = (y12 - y11) / width;
                const slope2 = (y22 - y21) / width;
                const dx = (y21 - y11) / (slope1 - slope2);
                const dy = dx * slope1;
                return [x1 + dx, y11 + dy];
            }
        }
        return null;
    }

    function zip(a, b) {
        return a.map((v, i) => [v, b[i]]);
    }

    function scaleLog(from, to) {
        from = from.map(Math.log);
        const scale = (v) => sampleAt(from, to, [Math.log(v)])[0];
        scale.invert = (v) => Math.exp(sampleAt(to, from, [v])[0]);
        return scale;
    }

    // Gas constant for dry air at the surface of the Earth
    const Rd = 287;
    // Specific heat at constant pressure for dry air
    const Cpd = 1005;
    // Molecular weight ratio
    const epsilon = 18.01528 / 28.9644;
    // Heat of vaporization of water
    const Lv = 2501000;
    // Ratio of the specific gas constant of dry air to the specific gas constant for water vapour
    const satPressure0c = 6.112;
    // C + celsiusToK -> K
    const celsiusToK = 273.15;

    /**
     * Computes the temperature at the given pressure assuming dry processes.
     *
     * t0 is the starting temperature at p0 (degree Celsius).
     */
    function dryLapse(p, tK0, p0) {
      return tK0 * Math.pow(p / p0, Rd / Cpd);
    }

    // Computes the mixing ration of a gas.
    function mixingRatio(partialPressure, totalPressure, molecularWeightRatio = epsilon) {
      return (molecularWeightRatio * partialPressure) / (totalPressure - partialPressure);
    }

    // Computes the saturation mixing ratio of water vapor.
    function saturationMixingRatio(p, tK) {
      return mixingRatio(saturationVaporPressure(tK), p);
    }

    // Computes the saturation water vapor (partial) pressure
    function saturationVaporPressure(tK) {
      const tC = tK - celsiusToK;
      return satPressure0c * Math.exp((17.67 * tC) / (tC + 243.5));
    }

    // Computes the temperature gradient assuming liquid saturation process.
    function moistGradientT(p, tK) {
      const rs = saturationMixingRatio(p, tK);
      const n = Rd * tK + Lv * rs;
      const d = Cpd + (Math.pow(Lv, 2) * rs * epsilon) / (Rd * Math.pow(tK, 2));
      return (1 / p) * (n / d);
    }

    // Computes water vapor (partial) pressure.
    function vaporPressure(p, mixing) {
      return (p * mixing) / (epsilon + mixing);
    }

    // Computes the ambient dewpoint given the vapor (partial) pressure.
    function dewpoint(p) {
      const val = Math.log(p / satPressure0c);
      return celsiusToK + (243.5 * val) / (17.67 - val);
    }

    function parcelTrajectory(params, steps, sfcT, sfcP, sfcDewpoint) {

      const parcel = {};
      const dryGhs = [];
      const dryPressures = [];
      const dryTemps = [];
      const dryDewpoints = [];

      const mRatio = mixingRatio(saturationVaporPressure(sfcDewpoint), sfcP);

      const pToEl = scaleLog(params.level, params.gh);
      const minEl = pToEl(sfcP);
      const maxEl = Math.max(minEl, params.gh[params.gh.length - 1]);
      const stepEl = (maxEl - minEl) / steps;

      for (let elevation = minEl; elevation <= maxEl; elevation += stepEl) {
        const p = pToEl.invert(elevation);
        const t = dryLapse(p, sfcT, sfcP);
        const dp = dewpoint(vaporPressure(p, mRatio));
        dryGhs.push(elevation);
        dryPressures.push(p);
        dryTemps.push(t);
        dryDewpoints.push(dp);
      }

      const cloudBase = firstIntersection(dryGhs, dryTemps, dryGhs, dryDewpoints);
      let thermalTop = firstIntersection(dryGhs, dryTemps, params.gh, params.temp);

      if (!thermalTop) {
        return null;
      }

      if (cloudBase[0] < thermalTop[0]) {

        thermalTop = cloudBase;

        const pCloudBase = pToEl.invert(cloudBase[0]);
        const moistGhs = [];
        const moistPressures = [];
        const moistTemps = [];
        let t = cloudBase[1];
        let previousP = pCloudBase;
        for (let elevation = cloudBase[0]; elevation < maxEl + stepEl; elevation += stepEl) {
          const p = pToEl.invert(elevation);
          t = t + (p - previousP) * moistGradientT(p, t);
          previousP = p;
          moistGhs.push(elevation);
          moistPressures.push(p);
          moistTemps.push(t);
        }

        const isohume = zip(dryDewpoints, dryPressures).filter((pt) => pt[1] > pCloudBase);
        isohume.push([cloudBase[1], pCloudBase]);

        let moist = zip(moistTemps, moistPressures);
        const equilibrium = firstIntersection(moistGhs, moistTemps, params.gh, params.temp);

        parcel.pCloudTop = params.level[params.level.length - 1];

        if (equilibrium) {
          const pCloudTop = pToEl.invert(equilibrium[0]);
          moist = moist.filter((pt) => pt[1] >= pCloudTop);
          moist.push([equilibrium[1], pCloudTop]);
          parcel.pCloudTop = pCloudTop;
        }

        parcel.moist = moist;
        parcel.isohume = isohume;

      }


      const pThermalTop = pToEl.invert(thermalTop[0]);
      const dry = zip(dryTemps, dryPressures).filter((pt) => pt[1] > pThermalTop);
      dry.push([thermalTop[1], pThermalTop]);

      parcel.dry = dry;
      parcel.pThermalTop = pThermalTop;
      parcel.elevThermalTop = thermalTop[0];

      return parcel;
    }

    ////Original code from:

    /**
     * SkewT v1.1.0
     * 2016 David Félix - dfelix@live.com.pt
     *
     * Dependency:
     * d3.v3.min.js from https://d3js.org/
     *
     */

    window.SkewT = function(div) {

        var _this=this;
        //properties used in calculations
        var wrapper = d3.select(div);
        var width = parseInt(wrapper.style('width'), 10);
        var margin = {top: 10, right: 25, bottom: 10, left: 25}; //container margins
        var deg2rad = (Math.PI/180);
        var gradient = 55;
        var adjustGradient=false;
        var tan;
        var basep = 1000;
        var topp = 100;
        var pIncrement=-50;
        var midtemp=0, temprange=50;
        var xOffset=0;
        var moving = false;
        //console.log(steph);

        var selectedSkewt;

        var plines = [1000,900,800,700,600,500,400,300,200,100];
        var pticks = [], tickInterval=25;
        for (let i=plines[0]+tickInterval; i>plines[plines.length-1]; i-=tickInterval) pticks.push(i);
        var barbsize = 15;   /////
        // functions for Scales and axes. Note the inverted domain for the y-scale: bigger is up!
        d3.scaleLinear().range([0,300]).domain([0,150]);
        d3.scaleLinear();
        var bisectTemp = d3.bisector(function(d) { return d.press; }).left; // bisector function for tooltips
        var w, h, x, y, xAxis, yAxis, yAxis2;
        var dataReversed = [];
        var dataAr = [];
        //aux
        var unit = "kt"; // or kmh

        var isTouchDevice =  ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) ||  (navigator.msMaxTouchPoints > 0);

        //console.log(isTouchDevice);


        //containers
        var svg = wrapper.append("svg").attr("id", "svg");	 //main svg
        var controls = wrapper.append("div").attr("class","controls");
        var rangeContainer = wrapper.append("div").attr("class","range-container");
        var container = svg.append("g").attr("id", "container"); //container
        var skewtbg = container.append("g").attr("id", "skewtbg").attr("class", "skewtbg");//background
        var skewtgroup = container.append("g").attr("class", "skewt"); // put skewt lines in this group  (class skewt not used)
        var barbgroup  = container.append("g").attr("class", "windbarb"); // put barbs in this group
        var tooltipgroup = container.append("g").attr("class", "tooltips");      //class tooltps not used
        var tooltipRect = container.append("rect").attr("id",  "tooltipRect").attr("class", "overlay");

        //local functions
        function setVariables() {
            width = parseInt(wrapper.style('width'), 10) -10; // tofix: using -10 to prevent x overflow
            w = width - margin.left - margin.right;
            h = width - margin.top - margin.bottom;
            tan = Math.tan((gradient || 55) *deg2rad);
            x = d3.scaleLinear().range([0-w/2, w+w/2]).domain([midtemp-temprange*2 , midtemp+temprange*2]);
            y = d3.scaleLog().range([0, h]).domain([topp, basep]);
            xAxis = d3.axisBottom(x).tickSize(0,0).ticks(20);//.orient("bottom");
            yAxis = d3.axisLeft(y).tickSize(0,0).tickValues(plines).tickFormat(d3.format(".0d"));//.orient("left");
            yAxis2 = d3.axisRight(y).tickSize(5,0).tickValues(pticks);//.orient("right");
        }

        function convert(msvalue, unit)
        {
            switch(unit) {
                case "kt":
                    return msvalue*1.943844492;
                case "kmh":
                    return msvalue*3.6;
                default:
                    return msvalue;
            }
        }

        //assigns d3 events
        d3.select(window).on('resize', resize);

        function resize() {
            skewtbg.selectAll("*").remove();
            setVariables();
            svg.attr("width", w + margin.right + margin.left).attr("height", h + margin.top + margin.bottom);
            container.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            drawBackground();
            dataAr.forEach(d=> {
                plot(d.data,{add:true, select:false});
            } );//redraw each plot
            if(selectedSkewt) selectSkewt(selectedSkewt.data);
            shiftXAxis();
            tooltipRect.attr("width", w).attr("height", h);
        }

        let lines={};
        let clipper;
        let xAxisValues;
        //let tempLine,  tempdewLine;  now in object


        var drawBackground = function() {

            // Add clipping path
            clipper=skewtbg.append("clipPath")
            .attr("id", "clipper")
            .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", w)
            .attr("height", h);

            // Skewed temperature lines
            lines.temp = skewtbg.selectAll("templine")
            .data(d3.scaleLinear().domain([midtemp-temprange*2,midtemp+temprange]).ticks(15))
            .enter().append("line")
            .attr("x1", d => x(d)-0.5 + (y(basep)-y(topp))/tan)
            .attr("x2", d => x(d)-0.5)
            .attr("y1", 0)
            .attr("y2", h)
            .attr("class",  d=> d == 0 ?  `tempzero ${buttons["Temp"].hi?"highlight-line":""}`: `templine ${buttons["Temp"].hi?"highlight-line":""}`)
            .attr("clip-path", "url(#clipper)");
            //.attr("transform", "translate(0," + h + ") skewX(-30)");

            // Logarithmic pressure lines
            lines.pressure = skewtbg.selectAll("pressureline")
            .data(plines)
            .enter().append("line")
            .attr("x1", - w)
            .attr("x2", 2*w)
            .attr("y1", y )
            .attr("y2", y)
            .attr("clip-path", "url(#clipper)")
            .attr("class", `pressure ${buttons["Pressure"].hi?"highlight-line":""}`);

            // create array to plot dry adiabats

            //console.log(pIncrement);
            var pp = moving?
                    [basep, basep-(basep-topp)*0.25,basep-(basep-topp)*0.5,basep-(basep-topp)*0.75, topp]
                    : d3.range(basep,topp-50 ,pIncrement);

            var dryad = d3.scaleLinear().domain([midtemp-temprange*3,midtemp+temprange*3]).ticks(30);

            var all = [];

            for (var i=0; i<dryad.length; i++) {
                var z = [];
                for (var j=0; j<pp.length; j++) { z.push(dryad[i]); }
                all.push(z);
            }

            var drylineFx = d3.line()
                .curve(d3.curveLinear)
                .x(function(d,i) {
                    return x(
                            dryLapse(pp[i],273.15 + d,basep) -273.15
                        ) + (y(basep)-y(pp[i]))/tan;})
                .y(function(d,i) { return y(pp[i])} );

            // Draw dry adiabats
            lines.dryadiabat = skewtbg.selectAll("dryadiabatline")
            .data(all)
            .enter().append("path")
            .attr("class", `dryadiabat  ${buttons["Dry Adiabat"].hi?"highlight-line":""}` )
            .attr("clip-path", "url(#clipper)")
            .attr("d", drylineFx);

            // moist adiabat fx
            var temp;
            var moistlineFx = d3.line()
                .curve(d3.curveLinear)
                .x(function(d,i) {
                    temp= i==0? 273.15 + d : ((temp + moistGradientT(pp[i], temp) * (moving?(topp-basep)/4:pIncrement)) );
                    return x(temp - 273.15) + (y(basep)-y(pp[i]))/tan;
                })
                .y(function(d,i) { return y(pp[i])} );


            // Draw moist adiabats
            lines.moistadiabat = skewtbg.selectAll("moistadiabatline")
            .data(all)
            .enter().append("path")
            .attr("class", `moistadiabat ${buttons["Moist Adiabat"].hi?"highlight-line":""}`)
            .attr("clip-path", "url(#clipper)")
            .attr("d", moistlineFx);

            // isohume fx
            var mixingRatio$1;
            var isohumeFx = d3.line()
                .curve(d3.curveLinear)
                .x(function(d,i) {
                    //console.log(d);
                    if (i==0) mixingRatio$1 = mixingRatio(saturationVaporPressure(d + 273.15), pp[i]);
                    temp = dewpoint(vaporPressure(pp[i], mixingRatio$1));
                    return x(temp - 273.15) + (y(basep)-y(pp[i]))/tan;
                })
                .y(function(d,i) { return y(pp[i])} );

            // Draw isohumes
            lines.isohume = skewtbg.selectAll("isohumeline")
            .data(all)
            .enter().append("path")
            .attr("class", `isohume ${buttons["Isohume"].hi?"highlight-line":""}` )
            .attr("clip-path", "url(#clipper)")
            .attr("d", isohumeFx);

            // Line along right edge of plot
            skewtbg.append("line")
            .attr("x1", w-0.5)
            .attr("x2", w-0.5)
            .attr("y1", 0)
            .attr("y2", h)
            .attr("class", "gridline");

            // Add axes
            xAxisValues=skewtbg.append("g").attr("class", "x axis").attr("transform", "translate(0," + (h-0.5) + ")").call(xAxis).attr("clip-path", "url(#clipper)")  ;
            skewtbg.append("g").attr("class", "y axis").attr("transform", "translate(-0.5,0)").call(yAxis);
            skewtbg.append("g").attr("class", "y axis ticks").attr("transform", "translate(-0.5,0)").call(yAxis2);
        };

        var makeBarbTemplates = function(){
            var speeds = d3.range(5,205,5);
            var barbdef = container.append('defs');
            speeds.forEach(function(d) {
                var thisbarb = barbdef.append('g').attr('id', 'barb'+d);
                var flags = Math.floor(d/50);
                var pennants = Math.floor((d - flags*50)/10);
                var halfpennants = Math.floor((d - flags*50 - pennants*10)/5);
                var px = barbsize/2;
                // Draw wind barb stems
                thisbarb.append("line").attr("x1", 0).attr("x2", 0).attr("y1", -barbsize/2).attr("y2", barbsize/2);
                // Draw wind barb flags and pennants for each stem
                for (var i=0; i<flags; i++) {
                    thisbarb.append("polyline")
                        .attr("points", "0,"+px+" -6,"+(px)+" 0,"+(px-2))
                        .attr("class", "flag");
                    px -= 5;
                }
                // Draw pennants on each barb
                for (i=0; i<pennants; i++) {
                    thisbarb.append("line")
                        .attr("x1", 0)
                        .attr("x2", -6)
                        .attr("y1", px)
                        .attr("y2", px+2);
                    px -= 3;
                }
                // Draw half-pennants on each barb
                for (i=0; i<halfpennants; i++) {
                    thisbarb.append("line")
                        .attr("x1", 0)
                        .attr("x2", -3)
                        .attr("y1", px)
                        .attr("y2", px+1);
                    px -= 3;
                }
            });
        };


        var shiftXAxis= function(){

            clipper.attr("x", -xOffset);
            xAxisValues.attr("transform", `translate(${xOffset}, ${h-0.5} )`);
            for (let p in lines) {
                lines[p].attr("transform",`translate(${xOffset},0)`);
            }        dataAr.forEach(d=>{
                for (let p in d.lines){
                    d.lines[p].attr("transform",`translate(${xOffset},0)`);
                }
            });
        };



        var drawToolTips = function() {

            // Draw tooltips
            var tmpcfocus = tooltipgroup.append("g").attr("class", "focus tmpc").style("display", "none");
            tmpcfocus.append("circle").attr("r", 4);
            tmpcfocus.append("text").attr("x", 9).attr("dy", ".35em");

            var dwpcfocus = tooltipgroup.append("g").attr("class", "focus dwpc").style("display", "none");
            dwpcfocus.append("circle").attr("r", 4);
            dwpcfocus.append("text").attr("x", -9).attr("text-anchor", "end").attr("dy", ".35em");

            var hghtfocus = tooltipgroup.append("g").attr("class", "focus").style("display", "none");
            var hght1 = hghtfocus.append("text").attr("x", 0).attr("text-anchor", "start").attr("dy", ".35em");
            var hght2 = hghtfocus.append("text").attr("x", 0).attr("text-anchor", "start").attr("dy", "-0.65em").style("fill","blue");

            var wspdfocus = tooltipgroup.append("g").attr("class", "focus windspeed").style("display", "none");
            var wspd1 = wspdfocus.append("text").attr("x", "0.8em").attr("text-anchor", "start").attr("dy", ".35em");
            var wspd2 = wspdfocus.append("text").attr("x", "0.8em").attr("text-anchor", "start").attr("dy", "-0.65em").style("fill","red") ;
            var wspd3 = wspdfocus.append("text").attr("class","skewt-wind-arrow").html("&#8681;") ;
            //console.log(wspdfocus)


            let startX=null;

            function start(e){
                [tmpcfocus, dwpcfocus, hghtfocus, wspdfocus].forEach(e=>e.style("display", null));
                move.call(tooltipRect.node());
                startX=d3.mouse(this)[0]-xOffset;

            }

            function end(e){
                startX=null;
            }

            _this.hide = function(){
                [tmpcfocus, dwpcfocus, hghtfocus, wspdfocus].forEach(e=>e.style("display", "none"));
            };


            _this.move2P = function(y0){

                var i = bisectTemp(dataReversed, y0, 1, dataReversed.length-1);
                var d0 = dataReversed[i - 1];
                var d1 = dataReversed[i];
                var d = y0 - d0.press > d1.press - y0 ? d1 : d0;

                tmpcfocus.attr("transform", "translate(" +  (xOffset + x(d.temp) + (y(basep)-y(d.press))/tan)+ "," + y(d.press) + ")");
                dwpcfocus.attr("transform", "translate(" +  (xOffset + x(d.dwpt) + (y(basep)-y(d.press))/tan)+ "," + y(d.press) + ")");

                hghtfocus.attr("transform", "translate(0," + y(d.press) + ")");
                hght1.html("- "+Math.round(d.hght)); 	//hgt or hghtagl ???
                hght2.html("&nbsp;&nbsp;&nbsp;"+Math.round(d.dwpt)+"&#176;C");

                wspdfocus.attr("transform", "translate(" + (w-60)  + "," + y(d.press) + ")");
                wspd1.html(Math.round(convert(d.wspd, unit)*10)/10 + " " + unit);
                wspd2.html(Math.round(d.temp)+"&#176;C");
                wspd3.style("transform",`rotate(${d.wdir}deg)`);

            };

            function move(e){
                var newX=d3.mouse(this)[0];
                if (startX!==null){
                    xOffset=-(startX-newX);
                    shiftXAxis();
                }
                var y0 = y.invert(d3.mouse(this)[1]); // get y value of mouse pointer in pressure space
                _this.move2P(y0);
            }

            tooltipRect
                .attr("width", w)
                .attr("height", h);

                //.on("mouseover", start)
                //.on("mouseout",  end)
                //.on("mousemove", move)
            if (!isTouchDevice) {
                tooltipRect.call(d3.drag().on("start", start).on("drag",move).on("end", end));
            } else {
                tooltipRect
                //tooltipRect.node().addEventListener('touchstart',start, true)
                //tooltipRect.node().addEventListener('touchmove',move, true)
                //tooltipRect.node().addEventListener('touchend',end, true)
                .on('touchstart', start)
                .on('touchmove',move)
                .on('touchend',end);
            }
        };


        //var parctrajLine;
        var drawParcelTraj = function(dataObj){

            if(dataObj.lines.parctrajLine) dataObj.lines.parctrajLine.remove();

                let {data,parctemp}=dataObj;

                let parcelTraj = parcelTrajectory(
                    { level:data.map(e=>e.press), gh: data.map(e=>e.hght),  temp:  data.map(e=>e.temp+273.15) },
                    moving? 5:40,
                    parctemp + 273.15 ,
                    data[0].press,
                    data[0].dwpt+273.15
                );

                var parclinedata = parcelTraj?     //may be null
                    [[].concat(parcelTraj.dry||[],parcelTraj.moist||[]).map(e=>{return {parct:e[0]-273.15, press:e[1]}})]
                    :[];

                var parctrajFx = d3.line()
                .curve(d3.curveLinear)
                .x(function(d,i) { return x(d.parct) + (y(basep)-y(d.press))/tan; })
                .y(function(d,i) { return y(d.press); });

                dataObj.lines.parctrajLine = skewtgroup
                    .selectAll("parctrajlines")
                    .data(parclinedata).enter().append("path")
                    .attr("class", `parcel highlight-line`)// ${dataAr.indexOf(dataObj)==selectedSkewt?"highlight-line":""}`)
                    .attr("clip-path", "url(#clipper)")
                    .attr("d", parctrajFx)
                    .attr("transform",`translate(${xOffset},0)`);
        };




        var selectSkewt = function(data){  //use the data,  then can be found from the outside by using data obj ref
            dataAr.forEach(d=>{
                let found=d.data==data;
                for (let p in d.lines) d.lines[p].classed("highlight-line",found);
                if (found){
                    dataReversed=[].concat(d.data).reverse();
                }
            });
            _this.hide();

        };



        //if in options:  add,  add new plot,  if select,  set selected ix and highlight.  if select false,  must hightlight separtely.
        var plot = function(s, {add,select}={} ){

            if(s.length==0) return;

            let ix=0;

            if (!add){
                dataAr.forEach(d=>{  //clear all plots
                    for (let p in d.lines) d.lines[p].remove();
                });
                dataAr=[];
            }

            let dataObj = dataAr.find(d=>d.data==s);

            let data;
            if (!dataObj) {
                let parctemp=s[0].temp;
                data=s;//.filter(d=> d.temp > -1000 && d.dwpt > -1000);      //do not filter here,  do not change obj ref
                ix = dataAr.push({data, parctemp, lines:{}})  -1;
                dataObj = dataAr[ix];
            } else {
                ix = dataAr.indexOf(dataObj);
                data=dataObj.data;
                for (let p in dataObj.lines) dataObj.lines[p].remove();
            }


            //reset parctemp range
            ranges.parctemp.input.node().value = ranges.parctemp.value = dataObj.parctemp = Math.round(dataObj.parctemp*10)/10 ;
            ranges.parctemp.valueDiv.html(`${dataObj.parctemp} ${unit4range("parctemp")}`);

            //skew-t stuff
            let filteredData=data.filter(d=> d.temp > -1000 && d.dwpt > -1000);
            var skewtlines=[filteredData];
            if (data.length>50 && moving){
                let prev=-1;
                skewtlines=[filteredData.filter((e,i,a)=>{
                    let n=Math.floor(i*50/(a.length-1));
                    if (n>prev){
                        prev=n;
                        return true;
                    }
                })];
            }

            var templineFx = d3.line().curve(d3.curveLinear).x(function(d,i) { return x(d.temp) + (y(basep)-y(d.press))/tan; }).y(function(d,i) { return y(d.press); });
            dataObj.lines.tempLine = skewtgroup
                .selectAll("templines")
                .data(skewtlines).enter().append("path")
                .attr("class", "temp")//(d,i)=> `temp ${i<10?"skline":"mean"}` )
                .attr("clip-path", "url(#clipper)")
                .attr("d", templineFx);

            if (data[0].dwpt){
                var tempdewlineFx = d3.line().curve(d3.curveLinear).x(function(d,i) { return x(d.dwpt) + (y(basep)-y(d.press))/tan; }).y(function(d,i) { return y(d.press); });
                dataObj.lines.tempdewLine = skewtgroup
                    .selectAll("tempdewlines")
                    .data(skewtlines).enter().append("path")
                    .attr("class", "dwpt")//(d,i)=>`dwpt ${i<10?"skline":"mean"}` )
                    .attr("clip-path", "url(#clipper)")
                    .attr("d", tempdewlineFx);


                drawParcelTraj(dataObj);
            }

            var barbs = skewtlines[0].filter(function(d) {
    	    return true;
                //  if (d.hght>lastH+steph) lastH=d.hght;
             //    return (d.hght==lastH && d.wdir >= 0 && d.wspd >= 0 && d.press >= topp);
            });

            dataObj.lines.barbs = barbgroup.append("svg").attr("class","barblines");//.attr("transform","translate(30,80)");

            dataObj.lines.barbs.selectAll("barbs")
                .data(barbs).enter().append("use")
                .attr("href", function (d) { return "#barb"+Math.round(convert(d.wspd, "kt")/5)*5; }) // 0,5,10,15,... always in kt
                .attr("transform", function(d) { return "translate("+(w + 15 * ix) +","+y(d.press)+") rotate("+ (d.wdir+180)+")"; });

            if (select || dataAr.length==1){
                selectedSkewt=dataObj;
                selectSkewt(dataObj.data);
            }
            shiftXAxis();

            return dataAr.length;
        };

        //controls
        var buttons = {"Dry Adiabat":{},"Moist Adiabat":{},"Isohume":{},"Temp":{},"Pressure":{}};
        for (let p in buttons){
            let b= buttons[p];
            b.hi=false;
            b.el=controls.append("div").attr("class","buttons").text(p).on("click", ()=>{
                b.hi=!b.hi;
                b.el.node().classList[b.hi?"add":"remove"]("clicked");
                let line=p.replace(" ","").toLowerCase();
                lines[line]._groups[0].forEach(p=>p.classList[b.hi?"add":"remove"]("highlight-line"));
            });
        }
        let ranges= {
            gradient:{min:0, max:85, step:5,  value: 90-gradient},
            topp:{ min:100, max:900, step: 50, value:100},
        //    midtemp:{value:0, step:2, min:-50, max:50},
            parctemp:{value: 10, step:2, min:-50, max: 50}
        };
        const unit4range = p => p=="gradient"?"deg":p=="topp"?"hPa":"&#176;C";
        for (let p in ranges){

            let r=ranges[p];
            r.valueDiv = rangeContainer.append("div").attr("class","skewt-range-val").html(p=="gradient"?"Gradient:":p=="topp"?"Top P:":p=="parctemp"?"Parcel T:":"Mid Temp");
            r.valueDiv = rangeContainer.append("div").attr("class","skewt-range-val").html(`${p!="gradient"?r.value : 90-r.value} ${unit4range(p)}`);
            r.input = rangeContainer.append("input").attr("type","range").attr("min",r.min).attr("max",r.max).attr("step",r.step).attr("value",r.value).attr("class","skewt-ranges")
            .on("input",(a,b,c)=>{

                _this.hide();
                r.value=+c[0].value;

                if(p=="gradient") {
                    gradient = r.value = 90-r.value;            }
                if(p=="topp"){
                    let pph=y(basep)-y(topp);
                    topp= r.value;
                    let ph=y(basep)-y(topp);
                    pIncrement=topp>500?-25:-50;
                    if(adjustGradient){
                        ranges.gradient.value = gradient = Math.atan(Math.tan(gradient*deg2rad) * pph/ph)/deg2rad;
                        ranges.gradient.input.node().value = 90-gradient;
                        ranges.gradient.valueDiv.html(`${Math.round(gradient)} ${unit4range("gradient")}`);
                    } else {
                        temprange*= ph/pph;
                        setVariables();
                    }
                }
                if(p=="midtemp"){
                    midtemp = r.value = -r.value;
                }
                r.valueDiv.html(`${r.value} ${unit4range(p)}`);

                clearTimeout(moving);
                moving=setTimeout(()=>{
                    moving=false;
                    resize();
                },1000);

                if(p=="parctemp"){
                    selectedSkewt.parctemp = r.value;
                    drawParcelTraj(selectedSkewt);
                } else {
                    resize();
                }
            });

            if (p=="topp") rangeContainer.append("input").attr("type","checkbox").on("click",(a,b,e)=>{
                adjustGradient= e[0].checked;
            });
            rangeContainer.append("div").attr("class","flex-break");
        }


        var remove = function(s){
            let dataObj=dataAr.find(d=>d.data==s);
            if (dataObj){
                for (let p in dataObj.lines){
                    dataObj.lines[p].remove();
                }
            }
            dataAr.splice(dataAr.indexOf(dataObj),1);
        };

        var clear = function(s){   //remove everything

            dataAr.forEach(d=>{
                for (let p in d.lines) d.lines[p].remove;
            });
            skewtgroup.selectAll("path").remove(); //clear previous paths from skew
            skewtgroup.selectAll("g").remove();
            barbgroup.selectAll("use").remove(); //clear previous paths  from barbs
            dataAr=[];
            //if(tooltipRect)tooltipRect.remove();    tooltip rect is permanent
        };

        var clearBg = function(){
            skewtbg.selectAll("*").remove();
        };

        //addings functions as public methods
        this.drawBackground = drawBackground;
        this.plot = plot;
        this.clear = clear;
        this.clearBg= clearBg;
        this.selectSkewt=selectSkewt;
        this.remove=remove;
        //this.move2P and this.hide,  declared

        //init
        setVariables();
        resize();
        drawToolTips();  //only once
        makeBarbTemplates();  //only once
    };

}());
