
//import * as atm from './atmosphere.js';

/**
 * SkewT v1.1.0
 * 2016 David Félix - dfelix@live.com.pt
 *
 * Dependency:
 * d3.v3.min.js from https://d3js.org/
 *
 */
var SkewT = function(div) {

    //properties used in calculations
    var wrapper = d3.select(div);
    var width = parseInt(wrapper.style('width'), 10);
    var height = width + 20; //tofix
    var margin = {top: 10, right: 30, bottom: 10, left: 20}; //container margins
    var deg2rad = (Math.PI/180);
    var gradient = 55;
    var adjustGradient=false;
    var tan;
    var basep = 1000;
    var topp = 100;
    var parctemp;
    var steph = atm.getElevation(topp)/20;
    var moving = false;
    console.log(steph);

    var plines = [1000,900,800,700,600,500,400,300,200,100];
    var pticks = [], tickInterval=25;
    for (let i=plines[0]+tickInterval; i>plines[plines.length-1]; i-=tickInterval)pticks.push(i);
    console.log(pticks);
    var barbsize = 15;   /////
    // functions for Scales and axes. Note the inverted domain for the y-scale: bigger is up!
    var r = d3.scaleLinear().range([0,300]).domain([0,150]);
    var y2 = d3.scaleLinear();
    var bisectTemp = d3.bisector(function(d) { return d.press; }).left; // bisector function for tooltips
    var w, h, x, y, xAxis, yAxis, yAxis2;
    var data = [];
    //aux
    var unit = "kt"; // or kmh

    //containers
    var svg = wrapper.append("svg").attr("id", "svg");	 //main svg
    var controls = wrapper.append("div").attr("class","controls");
    var rangeContainer = wrapper.append("div").attr("class","range-container");
    var container = svg.append("g").attr("id", "container"); //container
    var skewtbg = container.append("g").attr("id", "skewtbg").attr("class", "skewtbg");//background
    var skewtgroup = container.append("g").attr("class", "skewt"); // put skewt lines in this group
    var barbgroup  = container.append("g").attr("class", "windbarb"); // put barbs in this group

    //local functions
    function setVariables() {
        width = parseInt(wrapper.style('width'), 10) -10; // tofix: using -10 to prevent x overflow
        height = width; //to fix
        w = width - margin.left - margin.right;
        h = width - margin.top - margin.bottom;
        tan = Math.tan((gradient || 55) *deg2rad);
        x = d3.scaleLinear().range([0, w]).domain([-45,50]);
        y = d3.scaleLog().range([0, h]).domain([topp, basep]);
        xAxis = d3.axisBottom(x).tickSize(0,0).ticks(10);//.orient("bottom");
        yAxis = d3.axisLeft(y).tickSize(0,0).tickValues(plines).tickFormat(d3.format(".0d"));//.orient("left");
        yAxis2 = d3.axisRight(y).tickSize(5,0).tickValues(pticks);//.orient("right");
    }

    function convert(msvalue, unit)
    {
        switch(unit) {
            case "kt":
                //return msvalue*1.943844492;
                return msvalue;   //wind is provided as kt by michael's program
            break;
            case "kmh":
                return msvalue*3.6;
            break;
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
        makeBarbTemplates();
        plot(data);
    }


    let lines={};

    var drawBackground = function() {

        // Add clipping path
        skewtbg.append("clipPath")
        .attr("id", "clipper")
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", w)
        .attr("height", h);

        // Skewed temperature lines
        lines.temp = skewtbg.selectAll("templine")
        .data(d3.range(-100,45,10))
        .enter().append("line")
        .attr("x1", d => x(d)-0.5 + (y(basep)-y(topp))/tan)
        .attr("x2", d => x(d)-0.5)
        .attr("y1", 0)
        .attr("y2", h)
        .attr("class", d => d == 0 ?  "tempzero": "templine")
        .attr("clip-path", "url(#clipper)");
        //.attr("transform", "translate(0," + h + ") skewX(-30)");

        // Logarithmic pressure lines
        lines.pressure = skewtbg.selectAll("pressureline")
        .data(plines)
        .enter().append("line")
        .attr("x1", 0)
        .attr("x2", w)
        .attr("y1", y )
        .attr("y2", y)
        .attr("class", "pressure");

        // create array to plot dry adiabats
        var pIncrement=-50;
        var pp = d3.range(basep,topp-50,pIncrement * (moving?4:1));
        var dryad = d3.range(-100,200,10 * (moving?2:1));

        var all = [];

        for (var i=0; i<dryad.length; i++) {
            var z = [];
            for (var j=0; j<pp.length; j++) { z.push(dryad[i]); }
            all.push(z);
        }

        var drylineFx = d3.line()
            .curve(d3.curveLinear)
            .x(function(d,i) {
                //console.log(atm.dryLapse(pp[i],273.15 + d,basep));
                return x(
                    //( 273.15 + d ) / Math.pow( (1000/pp[i]), 0.286) -273.15) +
                        atm.dryLapse(pp[i],273.15 + d,basep) -273.15
                    ) + (y(basep)-y(pp[i]))/tan;})
            .y(function(d,i) { return y(pp[i])} );

        // Draw dry adiabats
        lines.dryadiabat = skewtbg.selectAll("dryadiabatline")
        .data(all)
        .enter().append("path")
        .attr("class", "dryadiabat")
        .attr("clip-path", "url(#clipper)")
        .attr("d", drylineFx);

        // moist adiabat fx
        var temp;
        var moistlineFx = d3.line()
            .curve(d3.curveLinear)
            .x(function(d,i) {
                temp= i==0? 273.15 + d : (temp + atm.moistGradientT(pp[i], temp) * pIncrement)
                return x(temp - 273.15) + (y(basep)-y(pp[i]))/tan;
            })
            .y(function(d,i) { return y(pp[i])} );


        // Draw moist adiabats
        lines.moistadiabat = skewtbg.selectAll("moistadiabatline")
        .data(all)
        .enter().append("path")
        .attr("class", "moistadiabat")
        .attr("clip-path", "url(#clipper)")
        .attr("d", moistlineFx);

        // isohume fx
        var mixingRatio;
        var isohumeFx = d3.line()
            .curve(d3.curveLinear)
            .x(function(d,i) {
                //console.log(d);
                if (i==0) mixingRatio = atm.mixingRatio(atm.saturationVaporPressure(d + 273.15), pp[i]);
                temp = atm.dewpoint(atm.vaporPressure(pp[i], mixingRatio));
                return x(temp - 273.15) + (y(basep)-y(pp[i]))/tan;
            })
            .y(function(d,i) { return y(pp[i])} );

        // Draw isohumes
        lines.isohume = skewtbg.selectAll("isohumeline")
        .data(all)
        .enter().append("path")
        .attr("class", "isohume")
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
        skewtbg.append("g").attr("class", "x axis").attr("transform", "translate(0," + (h-0.5) + ")").call(xAxis);
        skewtbg.append("g").attr("class", "y axis").attr("transform", "translate(-0.5,0)").call(yAxis);
        skewtbg.append("g").attr("class", "y axis ticks").attr("transform", "translate(-0.5,0)").call(yAxis2);
    }

    var makeBarbTemplates = function(){
        var speeds = d3.range(5,205,5);
        var barbdef = container.append('defs')
        speeds.forEach(function(d) {
            var thisbarb = barbdef.append('g').attr('id', 'barb'+d);
            var flags = Math.floor(d/50);
            var pennants = Math.floor((d - flags*50)/10);
            var halfpennants = Math.floor((d - flags*50 - pennants*10)/5);
            var px = barbsize;
            // Draw wind barb stems
            thisbarb.append("line").attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", barbsize);
            // Draw wind barb flags and pennants for each stem
            for (var i=0; i<flags; i++) {
                thisbarb.append("polyline")
                    .attr("points", "0,"+px+" -10,"+(px)+" 0,"+(px-4))
                    .attr("class", "flag");
                px -= 7;
            }
            // Draw pennants on each barb
            for (i=0; i<pennants; i++) {
                thisbarb.append("line")
                    .attr("x1", 0)
                    .attr("x2", -10)
                    .attr("y1", px)
                    .attr("y2", px+4)
                px -= 3;
            }
            // Draw half-pennants on each barb
            for (i=0; i<halfpennants; i++) {
                thisbarb.append("line")
                    .attr("x1", 0)
                    .attr("x2", -5)
                    .attr("y1", px)
                    .attr("y2", px+2)
                px -= 3;
            }
        });
    }

    var drawToolTips = function(skewtlines) {

        var lines = skewtlines.reverse();
        //console.log(lines);
        // Draw tooltips
        var tmpcfocus = skewtgroup.append("g").attr("class", "focus tmpc").style("display", "none");
        tmpcfocus.append("circle").attr("r", 4);
        tmpcfocus.append("text").attr("x", 9).attr("dy", ".35em");

        var dwpcfocus = skewtgroup.append("g").attr("class", "focus dwpc").style("display", "none");
        dwpcfocus.append("circle").attr("r", 4);
        dwpcfocus.append("text").attr("x", -9).attr("text-anchor", "end").attr("dy", ".35em");

        var hghtfocus = skewtgroup.append("g").attr("class", "focus").style("display", "none");
        var hght1 = hghtfocus.append("text").attr("x", 0).attr("text-anchor", "start").attr("dy", ".35em");
        var hght2 = hghtfocus.append("text").attr("x", 0).attr("text-anchor", "start").attr("dy", "-0.65em").style("fill","blue");

        var wspdfocus = skewtgroup.append("g").attr("class", "focus windspeed").style("display", "none");
        var wspd1 = wspdfocus.append("text").attr("x", "0.8em").attr("text-anchor", "start").attr("dy", ".35em");
        var wspd2 = wspdfocus.append("text").attr("x", "0.8em").attr("text-anchor", "start").attr("dy", "-0.65em").style("fill","red") ;
        var wspd3 = wspdfocus.append("text").attr("class","skewt-wind-arrow").html("&#8679;") ;
        //console.log(wspdfocus)

        container.append("rect")
            .attr("class", "overlay")
            .attr("width", w)
            .attr("height", h)
            .on("mouseover", function() { tmpcfocus.style("display", null); dwpcfocus.style("display", null); hghtfocus.style("display", null); wspdfocus.style("display", null);})
            .on("mouseout", function() { tmpcfocus.style("display", "none"); dwpcfocus.style("display", "none"); hghtfocus.style("display", "none"); wspdfocus.style("display", "none");})
            .on("mousemove", function () {
                var y0 = y.invert(d3.mouse(this)[1]); // get y value of mouse pointer in pressure space
                var i = bisectTemp(lines, y0, 1, lines.length-1);
                var d0 = lines[i - 1];
                var d1 = lines[i];
                var d = y0 - d0.press > d1.press - y0 ? d1 : d0;

                console.log(d);

                tmpcfocus.attr("transform", "translate(" + (x(d.temp) + (y(basep)-y(d.press))/tan)+ "," + y(d.press) + ")");
                dwpcfocus.attr("transform", "translate(" + (x(d.dwpt) + (y(basep)-y(d.press))/tan)+ "," + y(d.press) + ")");

                hghtfocus.attr("transform", "translate(0," + y(d.press) + ")");
                hght1.html("- "+Math.round(d.hght)); 	//hgt or hghtagl ???
                hght2.html("&nbsp;&nbsp;&nbsp;"+Math.round(d.dwpt)+"&#176;C");

                wspdfocus.attr("transform", "translate(" + (w-60)  + "," + y(d.press) + ")");
                wspd1.html(Math.round(convert(d.wspd, unit)*10)/10 + " " + unit);
                wspd2.html(Math.round(d.temp)+"&#176;C");
                wspd3.style("transform",`rotate(${d.wdir}deg)`).style("background-color","green");

            });
    }


    var parctrajLines;
    var drawParcelTraj = function(){

        //console.log("drawParcelTraj");
        if(parctrajLines)parctrajLines.remove();
            let parcelTraj = atm.parcelTrajectory(
                { level:data.map(e=>e.press), gh: data.map(e=>e.hght),  temp:  data.map(e=>e.temp+273.15) },
                moving? 5:40,
                parctemp + 273.15 ,
                data[0].press,
                data[0].dwpt+273.15
            )
            var parclinedata = parcelTraj?     //may be null
                [[].concat(parcelTraj.dry||[],parcelTraj.moist||[]).map(e=>{return {parct:e[0]-273.15, press:e[1]}})]
                :[];
            //console.log(parclinedata);
            var parctrajFx = d3.line().curve(d3.curveLinear).x(function(d,i) { return x(d.parct) + (y(basep)-y(d.press))/tan; }).y(function(d,i) { return y(d.press); });

            parctrajLines = skewtgroup
                .selectAll("parctrajlines")
                .data(parclinedata).enter().append("path")
                .attr("class", "parcel")
                .attr("clip-path", "url(#clipper)")
                .attr("d", parctrajFx);

            //console.log("PARCEL",parcelTraj);
            //console.log(parctrajLines);
    }

    var plot = function(s){
        skewtgroup.selectAll("path").remove(); //clear previous paths from skew
        barbgroup.selectAll("use").remove(); //clear previous paths from barbs

        if(s.length==0) return;
        else {
            //test if s is new data set
            if(!data || data.length==0 || JSON.stringify(data[0]) !== JSON.stringify(s[0])){
                data=s;
                parctemp=data[0].temp;
            }
        }

        ranges.parctemp.input.node().value = ranges.parctemp.value = parctemp;
        ranges.parctemp.valueDiv.html(`${parctemp} ${unit4range("parctemp")}`);

        //skew-t stuff
        var skewtline = data.filter(function(d) { return (d.temp > -1000 && d.dwpt > -1000); });
        if (skewtline.length>30 && moving){
            let prev=-1;
            skewtline=data.filter((e,i,a)=>{
                let n=Math.floor(i*30/(a.length-1));
                if (n>prev){
                    prev=n;
                    return true;
                }
            })
        }
        var skewtlines = [skewtline];

        //console.log(skewtlines);

        var templineFx = d3.line().curve(d3.curveLinear).x(function(d,i) { return x(d.temp) + (y(basep)-y(d.press))/tan; }).y(function(d,i) { return y(d.press); });
        tempLines = skewtgroup
            .selectAll("templines")
            .data(skewtlines).enter().append("path")
            .attr("class", function(d,i) { return (i<10) ? "temp skline" : "temp mean" })
            .attr("clip-path", "url(#clipper)")
            .attr("d", templineFx);

        if (data[0].dwpt){
            var tempdewlineFx = d3.line().curve(d3.curveLinear).x(function(d,i) { return x(d.dwpt) + (y(basep)-y(d.press))/tan; }).y(function(d,i) { return y(d.press); });
            var tempdewLines = skewtgroup
                .selectAll("tempdewlines")
                .data(skewtlines).enter().append("path")
                .attr("class", function(d,i) { return (i<10) ? "dwpt skline" : "dwpt mean" })
                .attr("clip-path", "url(#clipper)")
                .attr("d", tempdewlineFx);

            drawParcelTraj();
        }

        //barbs stuff
        var stepH = 500;
        var lastH=-500;

        var barbs = skewtline.filter(function(d) {  if (d.hght>lastH+steph) lastH=d.hght; return (d.hght==lastH && d.wdir >= 0 && d.wspd >= 0 && d.press >= topp); });

        ///mah
        /*
            var barbs = skewtline.filter(function(d) {
            if (d.hght > lastH) {
                var result =  (d.hght > lastH && d.wdir >= 0 && d.wspd >= 0 && d.press >= topp);
                lastH = lastH + stepH;
                // if (result)
                //     console.log( d.press, d.hght, lastH );
                return result;
            }})*/
        ///
        var allbarbs = barbgroup.selectAll("barbs")
            .data(barbs).enter().append("use")
            .attr("xlink:href", function (d) { return "#barb"+Math.round(convert(d.wspd, "kt")/5)*5; }) // 0,5,10,15,... always in kt
            .attr("transform", function(d,i) { return "translate("+(w + 15) +","+y(d.press)+") rotate("+(d.wdir+180)+")"; });

        //mouse over
        drawToolTips(skewtlines[0]);
    }

    //controls
    let buttons = [{name:"Dry Adiabat"},{name:"Moist Adiabat"},{name:"Isohume"},{name:"Temp"},{name:"Pressure"}];
    buttons.forEach(b=>{
        b.hi=false;
        b.el=controls.append("div").attr("class","buttons").text(b.name).on("click", ()=>{
            b.hi=!b.hi;
            b.el.node().classList[b.hi?"add":"remove"]("clicked");
            let line=b.name.replace(" ","").toLowerCase();
            lines[line]._groups[0].forEach(p=>p.classList[b.hi?"add":"remove"]("highlight-line"));
        })
    })

    let ranges= {gradient:{min:0, max:85, step:5,  value:gradient},topp:{ min:100, max:900, step: 50, value:100}, parctemp:{val: 10, step:2, min:-50, max: 50}};
    const unit4range = p => p=="gradient"?"deg":p=="topp"?"hPa":"&#176;C";
    for (let p in ranges){
        let r=ranges[p];
        r.valueDiv = rangeContainer.append("div").attr("class","skewt-range-val").html(p=="gradient"?"Gradient:":p=="topp"?"Top P:":"Parcel T:");
        r.valueDiv = rangeContainer.append("div").attr("class","skewt-range-val").html(`${r.value} ${unit4range(p)}`);
        r.input = rangeContainer.append("input").attr("type","range").attr("min",r.min).attr("max",r.max).attr("step",r.step).attr("value",r.value).attr("class","skewt-ranges")
        .on("input",(a,b,c)=>{
            r.value=+c[0].value;

            if(p=="gradient") {
                gradient = r.value = 90-r.value;;
            }
            if(p=="topp"){
                let pph=y(basep)-y(topp);
                topp= r.value;
                let ph=y(basep)-y(topp);
                if(adjustGradient){
                    ranges.gradient.value = gradient = Math.atan(Math.tan(gradient*deg2rad) * pph/ph)/deg2rad;
                    ranges.gradient.input.node().value = 90-gradient;
                    ranges.gradient.valueDiv.html(`${Math.round(gradient)} ${unit4range("gradient")}`);
                }
                steph = atm.getElevation(topp)/20;
            }
            if(p=="parctemp"){
                parctemp = r.value;
                drawParcelTraj();
            } else {
                moving=true;
                resize();
            }

             r.valueDiv.html(`${r.value} ${unit4range(p)}`);

        }).on("change",()=>{
            //console.log("CHANGE");
            if (p!="parctemp"){
                moving=false;
                resize();
            } else {
                drawParcelTraj();
            }
        })

        if (p=="topp") rangeContainer.append("input").attr("type","checkbox").on("click",(a,b,e)=>{
            adjustGradient= e[0].checked;
        })
        rangeContainer.append("div").attr("class","flex-break");
    }


    var clear = function(s){
        skewtgroup.selectAll("path").remove(); //clear previous paths from skew
        barbgroup.selectAll("use").remove(); //clear previous paths  from barbs
        //must clear tooltips!
        container.append("rect")
            .attr("class", "overlay")
            .attr("width", w)
            .attr("height", h)
            .on("mouseover", function(){ return false;})
            .on("mouseout", function() { return false;})
            .on("mousemove",function() { return false;});
    }

    var clearBg = function(){
        skewtbg.selectAll("*").remove();
    }

    var setParams = function(p){
        ({ topp=topp, basep=basep, steph=steph, gradient=gradient} = p);
    }

    //addings functions as public methods
    this.drawBackground = drawBackground;
    this.plot = plot;
    this.clear = clear;
    this.clearBg= clearBg;

    //init
    setVariables();
    resize();
};

window.SkewT=SkewT;
//export default SkewT;
