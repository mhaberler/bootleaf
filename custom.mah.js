import SkewT from "./skewt/skewt.js";



var datapath = 'https://radiosonde.mah.priv.at/data-dev/';
var summary = datapath + 'summary.geojson';

var geojsonMarkerOptions = {
    radius: 8,
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
};

let maxHrs = 72;
let marker_chroma = {
    "BUFR": chroma.scale(['yellow', '008ae5']),
    "netCDF": chroma.scale(['yellow', 'red', 'black'])

    // "BUFR": chroma.scale(['DarkSlateBlue', 'Cyan']),
    // "netCDF": chroma.scale(['DarkGreen', 'GreenYellow'])
};

path_colors = {
    "simulated": {
        color: 'DarkOrange'
    },
    "origin": {
        color: 'MediumBlue'
    }
}

function drawpath(geojson, l) {
    var path_source = geojson.properties.path_source;
    var lineCoordinate = [];

    for (var i in geojson.features) {
        var pointJson = geojson.features[i];
        var coord = pointJson.geometry.coordinates;
        lineCoordinate.push([coord[1], coord[0]]);
    }
    L.polyline(lineCoordinate, path_colors[path_source]).addTo(bootleaf.map);
}
let drawAscents = 1;

function mouseover(l) {
    var ascents = l.target.feature.properties.ascents;

    for (var i in ascents) {
        var a = ascents[i];
        if (i >= drawAscents) {
            break;
        }
        if (!a.hasOwnProperty('data')) {
            var p = datapath + a.path;
            l.index = i;
            $.getJSON(p,
                (function(site) {
                    return function(geojson) {
                        site.target.feature.properties.ascents[site.index].data = geojson;
                        drawpath(geojson, site);
                    };
                }(l))
            );
        }
        else {
         	console.log("data for ",i,"already loaded:", a.data);
        }
    }
}

var skewt = new SkewT('#sidebarContents');

function clicked(l) {

    $('#sidebarTitle').html(l.target.feature.properties.name);

    try {
        skewt.plot(single);
        $("#sidebar").show("slow");
        $.growl.notice({
			title: l.target.feature.properties.name,
            message: "plot complete"
        });
    }
    catch (err) {
        console.log(err);
        alert(err);
    }
}

function findBUFR(value, index, array) {
    return (value.source === "BUFR");
}

function findnetCDF(value, index, array) {
    return (value.source === "netCDF");
}

function beforeMapLoads() {
    console.log("Before map loads function");
    // Continue to load the map
    loadMap();

    $.getJSON(summary, function(data) {
        L.geoJson(data, {

            pointToLayer: function(feature, latlng) {
                let now = Math.floor(Date.now() / 1000);
                let ascents = feature.properties.ascents;

                // prefer BUFR over netCDF
                // ascents are sorted descending by syn_timestamp
                // both netCDF either/or BUFR-derived ascents with same syn_timestamp
                // may be present.
                // BUFR-derived ascents are better quality data so prefer them.
                // we keep the netCDF-derived ascents of same timestamp around
                // to check how good the trajectory simulation is
                var newest_bufr = ascents.find(findBUFR);
                var newest_netcdf = ascents.find(findnetCDF);
                if (!newest_bufr && !newest_netcdf)
                    return;

                if (newest_bufr && newest_netcdf &&
                    (newest_bufr.syn_timestamp) ==
                    (newest_netcdf.syn_timestamp)) {
                    a = [newest_bufr, newest_netcdf];
                }
                else {
                    if (newest_bufr)
                        a = [newest_bufr];
                    else
                        a = [newest_netcdf];
                }
                var primary = a[0];
                var ts = primary.syn_timestamp;

                var age_hrs = (now - ts) / 3600;
                var age_index = Math.round(Math.min(age_hrs, maxHrs - 1));
                age_index = Math.max(age_index, 0);
                var rounded_age = Math.round(age_hrs * 10) / 10;

                // geojsonMarkerOptions.fillColor = marker_shades[primary.source].get(age_index).getHex();
                geojsonMarkerOptions.fillColor = marker_chroma[primary.source](age_index / maxHrs);

                var marker = L.circleMarker(latlng, geojsonMarkerOptions);
                //marker.ascents = a;
                var content = "<b>" + feature.properties.name + "</b>" + "<br>  " + rounded_age + " hours old";

                // console.log(primary.source + 'CSSClass');
                marker.bindTooltip(content, {
                        className: primary.source + 'CSSClass'
                    }).openTooltip()
                    .on('click', clicked)
                    .on('mouseover', mouseover);

                return marker;
            }
        }).addTo(bootleaf.map);
    });
}


function afterMapLoads() {
    // This function is run after the map has loaded. It gives access to bootleaf.map, bootleaf.TOCcontrol, etc

    console.log("After map loads function");
}


let single = [{
    "press": 1000.0,
    "hght": 130.0,
    "temp": 18.5,
    "dwpt": 8.8,
    "wdir": 252.0,
    "wspd": 1.5433333333200001
}, {
    "press": 975.0,
    "hght": 346.0,
    "temp": 16.3,
    "dwpt": 8.2,
    "wdir": 254.0,
    "wspd": 0.51444444444
}, {
    "press": 950.0,
    "hght": 567.0,
    "temp": 14.5,
    "dwpt": 7.6,
    "wdir": 110.0,
    "wspd": 0.51444444444
}, {
    "press": 925.0,
    "hght": 791.0,
    "temp": 12.6,
    "dwpt": 6.8,
    "wdir": 108.0,
    "wspd": 1.02888888888
}, {
    "press": 900.0,
    "hght": 1020.0,
    "temp": 10.7,
    "dwpt": 5.8,
    "wdir": 118.0,
    "wspd": 1.5433333333200001
}, {
    "press": 850.0,
    "hght": 1494.0,
    "temp": 7.5,
    "dwpt": 2.8,
    "wdir": 155.0,
    "wspd": 2.05777777776
}, {
    "press": 800.0,
    "hght": 1991.0,
    "temp": 4.1,
    "dwpt": -0.6,
    "wdir": 183.0,
    "wspd": 2.05777777776
}, {
    "press": 750.0,
    "hght": 2513.0,
    "temp": 0.6,
    "dwpt": -4.5,
    "wdir": 194.0,
    "wspd": 1.5433333333200001
}, {
    "press": 700.0,
    "hght": 3063.0,
    "temp": -2.3,
    "dwpt": -12.0,
    "wdir": 187.0,
    "wspd": 1.02888888888
}, {
    "press": 650.0,
    "hght": 3649.0,
    "temp": -4.9,
    "dwpt": -20.5,
    "wdir": 223.0,
    "wspd": 1.5433333333200001
}, {
    "press": 600.0,
    "hght": 4273.0,
    "temp": -8.4,
    "dwpt": -28.9,
    "wdir": 242.0,
    "wspd": 3.0866666666400002
}, {
    "press": 550.0,
    "hght": 4942.0,
    "temp": -13.5,
    "dwpt": -26.0,
    "wdir": 245.0,
    "wspd": 3.6011111110800003
}, {
    "press": 500.0,
    "hght": 5659.0,
    "temp": -18.6,
    "dwpt": -18.6,
    "wdir": 236.0,
    "wspd": 9.2599999999200016
}, {
    "press": 450.0,
    "hght": 6440.0,
    "temp": -22.1,
    "dwpt": -22.1,
    "wdir": 246.0,
    "wspd": 18.0055555554
}, {
    "press": 400.0,
    "hght": 7296.0,
    "temp": -28.1,
    "dwpt": -28.1,
    "wdir": 240.0,
    "wspd": 24.178888888680003
}, {
    "press": 350.0,
    "hght": 8239.0,
    "temp": -35.5,
    "dwpt": -36.6,
    "wdir": 239.0,
    "wspd": 26.23666666644
}, {
    "press": 300.0,
    "hght": 9293.0,
    "temp": -44.0,
    "dwpt": -44.8,
    "wdir": 239.0,
    "wspd": 29.837777777520003
}, {
    "press": 250.0,
    "hght": 10491.0,
    "temp": -53.1,
    "dwpt": -54.8,
    "wdir": 237.0,
    "wspd": 33.438888888600005
}, {
    "press": 200.0,
    "hght": 11904.0,
    "temp": -59.3,
    "dwpt": -65.6,
    "wdir": 240.0,
    "wspd": 31.89555555528
}, {
    "press": 150.0,
    "hght": 13706.0,
    "temp": -58.6,
    "dwpt": -75.8,
    "wdir": 250.0,
    "wspd": 24.178888888680003
}, {
    "press": 100.0,
    "hght": 16245.0,
    "temp": -59.5,
    "dwpt": -82.5,
    "wdir": 260.0,
    "wspd": 18.519999999840003
}, {
    "press": 70.0,
    "hght": 18476.0,
    "temp": -58.8,
    "dwpt": -83.1,
    "wdir": 256.0,
    "wspd": 11.83222222212
}, {
    "press": 50.0,
    "hght": 20595.0,
    "temp": -57.3,
    "dwpt": -83.7,
    "wdir": 259.0,
    "wspd": 8.23111111104
}, {
    "press": 30.0,
    "hght": 23845.0,
    "temp": -53.9,
    "dwpt": -85.4,
    "wdir": 173.0,
    "wspd": 2.5722222222
}, {
    "press": 20.0,
    "hght": 26472.0,
    "temp": -49.8,
    "dwpt": -86.3,
    "wdir": 214.0,
    "wspd": 3.6011111110800003
}, {
    "press": 10.0,
    "hght": 31073.0,
    "temp": -42.5,
    "dwpt": -88.8,
    "wdir": 267.0,
    "wspd": 4.11555555552
}];
