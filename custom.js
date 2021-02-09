var datapath = 'https://radiosonde.mah.priv.at/data-dev/';
var summary_url = datapath + 'summary.geojson';

var geojsonMarkerOptions = {
    radius: 10,
    //    radius: 5000,
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

let drawAscents = 1;

function drawpath(feature) {
    var path_source = feature.properties.path_source;
    var lineCoordinate = [];

    for (var i in feature.features) {
        var pointJson = feature.features[i];
        var coord = pointJson.geometry.coordinates;
        lineCoordinate.push([coord[1], coord[0]]);
    }
    L.polyline(lineCoordinate, path_colors[path_source]).addTo(bootleaf.map);
}

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
    }
}

var skewt = new SkewT('#sidebarContents');


function loadAscent(url, ascent, completion) {
    $.getJSON(url,
        (function(a) {
            return function(geojson) {
                a.data = geojson;
                completion(geojson);
                drawpath(geojson);
            };
        }(ascent))
    );
}

function plotStation(feature) {
    $('#sidebarTitle').html(feature.properties.name);

    console.log("plotStation feature=", feature);
    var latest = feature.properties.ascents[0];
    if (!latest.hasOwnProperty('data')) {
        var p = datapath + latest.path;
        loadAscent(p, latest, plotSkewT);
    }
    else {
        plotSkewT(latest.data);
    }
}

function clicked(l) {
    plotStation(l.target.feature);
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

var summary = null;
var markers = null;
var saveMemory = isTouchDevice;
var stations = {}; // features indexed by station_id

function gotSummary(data) {
    console.log("gotSummary", data);
    summary = data;
    markers = L.geoJson(data, {
            filter: function(f) {
                if (!f.properties.ascents.length) // no ascents available
                    return false;
                if (saveMemory) {
                    // delete attrs
                    delete f.origin_member;
                    delete f.origin_archive;
                }
                stations[f.properties.ascents[0].station_id] = f;
                return true;
            },
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

                //var marker = L.circle(latlng, geojsonMarkerOptions);
                var marker = L.circleMarker(latlng, geojsonMarkerOptions);

                // marker._orgRadius = marker.getRadius();
                // marker.setRadius(calcRadius(marker._orgRadius, bootleaf.map.getZoom()))


                //marker.ascents = a;
                var content = "<b>" + feature.properties.name + "</b>" + "<br>  " + rounded_age + " hours old";

                //console.log("isTouchDevice", isTouchDevice);



                if (isTouchDevice) {
                    marker.on('click', clicked);
                }
                else {
                    marker.bindTooltip(content, {
                            className: primary.source + 'CSSClass'
                        }).openTooltip()
                        .on('click', clicked);
                    //                        .on('mouseover', mouseover);
                }

                return marker;
            }

        }

    ).addTo(bootleaf.map);
    var station = getURLParameter("station");
    if (station) {
        f = stations[station];
        if (!f) {
            $.growl.error({
                message: "no such station: " + station
            });
        }
        else {
            plotStation(f);
        }
    }
}

function failedSummary(jqXHR, textStatus, err) {
    console.log("failedSummary", textStatus, err);
}


function addStations() {
    $.getJSON(summary_url)
        .done(function(data) {
            gotSummary(data);
        })
        .fail(function(jqXHR, textStatus, err) {
            failedSummary(jqXHR, textStatus, err);
        });

}
//XXX

function beforeMapLoads() {
    console.log("Before map loads function");

    // Continue to load the map
    loadMap();
    addStations();
}

var createDelayManager = function() {
  var timer = 0;
  return function(callback, ms, e) {
     clearTimeout(timer);
     timer = setTimeout(callback, ms, e);
  };
}
var fadeoutManager = createDelayManager();

function closeBookmark(e) {
    $(".leaflet-popup-close-button")[0].click();
}
var bookmarkLife = 2000;

function afterMapLoads() {
    // This function is run after the map has loaded. It gives access to bootleaf.map, bootleaf.TOCcontrol, etc

    console.log("After map loads function");

    bootleaf.map.on('bookmark:show', function(e) {
        fadeoutManager(closeBookmark, bookmarkLife, e);
    });
    // bootleaf.map.on('zoomend' , function (e) {
    //     var geo = bootleaf.map.getCenter();
    //     var n = countVisibleMarkers(bootleaf.map);
    //
    //     console.log(bootleaf.map.getZoom(), n);
    //     // if (L.getZoom()>14)
    //     // {
    //     //     marker.setLatLng(geo);
    //     //     marker.addTo(L);
    //     // }else {
    //     //     marker.remove();
    //     // }
    // });



    // bootleaf.map.on('zoomend', function() {
    //     markers.eachLayer(function(layer) {
    //         if (layer instanceof L.CircleMarker) {
    //             console.log('#####')
    //             console.log(layer.getRadius())
    //             layer.setRadius(calcRadius(layer._orgRadius, bootleaf.map.getZoom()))
    //             console.log(layer.getRadius())
    //         }
    //     });
    // });
}


// Scale circle markers by using the zoom value
// you need to know what the min value is,
// calculated at runtime or prior
var minValue = 1;

function calcRadius(val, zoom) {
    return 1.00083 * Math.pow(val / minValue, 0.5716) * (zoom / 2);
}



// this._layer.eachLayer(function(layer) {
//         if(layer instanceof L.Marker)
//             if( that._map.getBounds().contains(layer.getLatLng()) )
//                 if(++n < that.options.maxItems)
//                     that._list.appendChild( that._createItem(layer) );
//     });
//
// function countVisibleMarkers(map) {
//     var bounds = map.getBounds();
//     var count = 0;
//
//     map.eachLayer(function(layer) {
// //        console.log("layer=", typeof layer);
//         if (layer instanceof L.circleMarker) {
//             if (bounds.contains(layer.getLatLng())) count++;
//         }
//     });
//     return count;
// }
