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
};

var path_colors = {
    "simulated": {
        color: 'DarkOrange'
    },
    "origin": {
        color: 'MediumBlue'
    }
}

function drawpath(geojson) {
    var path_source = geojson.properties.path_source;
    var lineCoordinate = [];

    for (var i in geojson.features) {
        var pointJson = geojson.features[i];
        var coord = pointJson.geometry.coordinates;
        lineCoordinate.push([coord[1], coord[0]]);
    }
    L.polyline(lineCoordinate, path_colors[path_source]).addTo(bootleaf.map);
}

function uv2speed(u, v) {
    return Math.sqrt(u * u + v * v);
}

function deg(x) {
    return (180 / Math.PI) * x
}

function uv2dir(u, v) {
    var d = deg(Math.PI / 2 - Math.atan2(-v, -u));
    while (d < 0)
        d = (d + 360) % 360;
    return d;
}

function round3(value) {
    return Math.round(value * 1000) / 1000
}

let zeroK = 273.15;

function plotSkewT(geojson) {
    var data = [];
    var pscale = 1.;
    if (geojson.properties.source == 'BUFR')
        pscale = 0.01;

    for (var i in geojson.features) {
        var p = geojson.features[i].properties;
        var press = p['pressure'];
        if (!p.wind_u || !p.wind_u)
            continue;
        data.push({
            "press": round3(press * pscale),
            "hght": round3(p['gpheight']),
            "temp": round3(p['temp'] - zeroK),
            "dwpt": round3(p['dewpoint'] - zeroK),
            "wdir": round3(uv2dir(p['wind_u'], p['wind_v'])),
            "wspd": round3(uv2speed(p['wind_u'], p['wind_v']))
        });
    }
    skewt.plot(data);
    $("#sidebar").show("slow");
}

function loadAscent(l, p, index, completion) {
    $.getJSON(p,
        (function(site) {
            return function(geojson) {
                site.target.feature.properties.ascents[site.index].data = geojson;
                completion(geojson);
            };
        }(l))
    );
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
            loadAscent(l, p, i, drawpath);
        }
        // else {
        //     console.log("data for ", i, "already loaded:", a.data);
        // }
    }
}

var skewt = new SkewT('#sidebarContents');

console.log(skewt);

function clicked(l) {

    $('#sidebarTitle').html(l.target.feature.properties.name);

    var latest = l.target.feature.properties.ascents[0];
    if (!latest.hasOwnProperty('data')) {
        console.log("data for ", latest, "not yet loaded");

    }
    else {
        plotSkewT(latest.data);
    }

}

function findBUFR(value, index, array) {
    return (value.source === "BUFR");
}

function findnetCDF(value, index, array) {
    return (value.source === "netCDF");
}

function _isTouchDevice() {
    return (('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (navigator.msMaxTouchPoints > 0));
}

var isTouchDevice = _isTouchDevice();

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

                var a;
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

                console.log("isTouchDevice", isTouchDevice);

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
