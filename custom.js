var datapath = 'https://radiosonde.mah.priv.at/data-dev/';
var summary_url = datapath + 'summary.geojson';
var isTouchDevice = _isTouchDevice();
var summary = null;
var markers = null;
var saveMemory = isTouchDevice;
var stations = {}; // features indexed by station_id
var markerList = [];
let zeroK = 273.15;
let drawAscents = 1;
var bookmarkLife = 2000;
var maxHrs = 48;
var agelimit;
var agelimitDefault = -24;

var geojsonMarkerOptions = {
    radius: 10,
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8,
    className: "context-menu-marker"
};

var viridisStops = ['#440154', '#482777', '#3F4A8A', '#31678E', '#26838F', '#1F9D8A', '#6CCE5A', '#B6DE2B', '#FEE825'];
var chroma_scale = chroma.scale(viridisStops);


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

function plotSkewT(geojson) {
    var data = [];
    var pscale = 1.;
    if (geojson.properties.source == 'BUFR')
        pscale = 0.01;

    for (var i in geojson.features) {
        var p = geojson.features[i].properties;
        var press = p['pressure'];
        var sample = {
            "press": round3(press * pscale),
            "hght": round3(p['gpheight']),
            "temp": round3(p['temp'] - zeroK),
            "dwpt": round3(p['dewpoint'] - zeroK),
        };

        if ((typeof p.wind_u === "undefined") || (typeof p.wind_u === "undefined")) {
            // if (!p.wind_u || !p.wind_u)
            data.push(sample);
            continue;
        }
        sample["wdir"] = round3(uv2dir(p['wind_u'], p['wind_v']));
        sample["wspd"] = round3(uv2speed(p['wind_u'], p['wind_v']));
        data.push(sample);
    }
    skewt.plot(data);
    $("#sidebar").show("slow");
}

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

// toJSON: 2021-02-09T15:54:08.639Z
function timeString(unxiTimestamp) {
    var ts = new Date(unxiTimestamp * 1000).toJSON();
    return ts.substring(0, 10) + ' ' + ts.substring(11, 16) + 'Z';
}

function plotStation(feature, index) {

    var ascent = feature.properties.ascents[index];
    var text = feature.properties.name;
    $('#sidebarTitle').html(text);

    // Create anchor element.
    var a = document.createElement('a');
    // Create the text node for anchor element.
    var link = document.createTextNode("station " + ascent.station_id);
    // Append the text node to anchor element.
    a.appendChild(link);
    // Set the title.
    a.title = "station " + ascent.station_id;

    // Set the href property.
    a.href = "https://radiosonde.mah.priv.at/dev/?station=" + ascent.station_id;
    $('#sidebarSubTitle').html(a);

    var syntime = ascent.syn_timestamp;
    $('#box1').html(timeString(syntime));
    //    $('#box2').html("id: " + ascent.station_id);
    if (ascent.source === "BUFR") {

        $('#box2').html("source: DWD");
    }
    else {
        $('#box2').html("source: MADIS");
    }
    //    $('#sidebarBottom').html(timeString(syntime));

    if (!ascent.hasOwnProperty('data')) {
        var p = datapath + ascent.path;
        loadAscent(p, ascent, plotSkewT);
    }
    else {
        plotSkewT(ascent.data);
    }
}

function clicked(l) {
    plotStation(l.target.feature, 0);
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

function now() {
    return Math.floor(Date.now() / 1000);
}

function gotSummary(data) {
    // console.log("gotSummary", data);
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
            let ascent = feature.properties.ascents[0];
            var ts = ascent.syn_timestamp;

            var age_hrs = (now() - ts) / 3600;
            var age_index = Math.round(Math.min(age_hrs, maxHrs - 1));
            age_index = Math.max(age_index, 0);
            var rounded_age = Math.round(age_hrs * 10) / 10;

            geojsonMarkerOptions.fillColor = chroma_scale(1 - age_index / maxHrs);
            var marker = L.circleMarker(latlng, geojsonMarkerOptions);
            markerList.push(marker);
            var content = "<b>" + feature.properties.name + "</b>" + "<br>  " + rounded_age + " hours old";
            if (isTouchDevice) {
                marker.on('click', clicked);
            }
            else {
                marker.bindTooltip(content, {
                        className: ascent.source + 'CSSClass'
                    }).openTooltip()
                    .on('click', clicked);
                //                        .on('mouseover', mouseover);
            }
            return marker;
        }
    }); // .addTo(bootleaf.map);
    updateMarkers(agelimit);

    var station = getURLParameter("station");
    if (station) {
        f = stations[station];
        if (!f) {
            $.growl.error({
                message: "no such station: " + station
            });
        }
        else {
            plotStation(f, 0);
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

function beforeMapLoads() {
    console.log("Before map loads function");

    agelimit = localStorage.getItem('agelimit');

    if (!agelimit) {
        agelimit = agelimitDefault;
        localStorage.setItem('agelimit', agelimit);
    }
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


// not used right now
// might come in use with track layers
var pbfLayer;
var clearHighlight = function() {
    if (highlight) {
        pbfLayer.resetFeatureStyle(highlight);
    }
    highlight = null;
};

function afterMapLoads() {

    console.log("After map loads function");

    pbfLayer = bootleaf.layers[0];
    if (pbfLayer) {
        pbfLayer.on('click', function(e) { // The .on method attaches an event handler
                L.popup()
                    .setContent(e.layer.properties.name || e.layer.properties.type ||
                        e.layer.properties.kind)
                    // 					.setContent(JSON.stringify(e.layer))
                    .setLatLng(e.latlng)
                    .openOn(bootleaf.map)
                    .on('remove', clearHighlight);

                highlight = e.layer.properties.id;
                if (highlight) {
                    pbfLayer.setFeatureStyle(highlight, {
                        weight: 2,
                        color: 'red',
                        opacity: 1,
                        fillColor: 'red',
                        fill: true,
                        radius: 6,
                        fillOpacity: 1
                    });
                    L.DomEvent.stop(e);
                }
            })
            .addTo(bootleaf.map);
    }
    bootleaf.map.on('bookmark:show', function(e) {
        fadeoutManager(closeBookmark, bookmarkLife, e);
    });
    createAgeSlider(markers);

    createContextMenus();

}

function updateMarkers(agelimit) {
    markerList.forEach(function(marker, index) {
        var ts = marker.feature.properties.ascents[0].syn_timestamp;
        var age_hrs = (now() - ts) / 3600;
        if (age_hrs > -agelimit) {
            bootleaf.map.removeLayer(marker);
        }
        else {
            bootleaf.map.addLayer(marker);
        }
    });
    localStorage.setItem('agelimit', agelimit);
}

function createAgeSlider(markers) {

    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },
        onAdd: function() {
            // create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'mahinfo mahlegend');

            // Use a child input.
            var input = L.DomUtil.create('input');
            input.type = "text";
            input.id = "cutoff";

            // Insert the input as child of container.
            container.appendChild(input);

            var bs = jQuery(input).bootstrapSlider({
                min: -maxHrs,
                max: -3,
                value: agelimit,
                tooltip_position: 'top',
                tooltip: 'always',
                formatter: function(value) {
                    return 'newer than: ' + -value + ' hours';
                }
            }).on('change', function() {
                updateMarkers(parseFloat($(this).val()));
            });
            L.DomEvent.disableClickPropagation(container);

            return container;
        }
    });
    bootleaf.map.addControl(new SequenceControl());
};

function createContextMenus() {

    $(function() {
        $.contextMenu({
            selector: '.context-menu-marker',
            callback: function(key, options) {
                var m = "XX marker clicked: " + key;
                console.log(m);
            },
            items: {
                "history": {
                    name: "History",
                    icon: "edit"
                },
                "details": {
                    name: "Details",
                    icon: "cut"
                },
                // copy: {
                //     name: "Copy",
                //     icon: "copy"
                // },
                // "paste": {
                //     name: "Paste",
                //     icon: "paste"
                // },
                // "delete": {
                //     name: "Delete",
                //     icon: "delete"
                // },
                // "sep1": "---------",
                "quit": {
                    name: "Quit",
                    icon: function() {
                        return 'context-menu-icon context-menu-icon-quit';
                    }
                }
            }
        });

        // $('.context-menu-marker').on('click', function(e) {
        //     console.log('YY marker clicked', this);
        // })
    });

    $(function() {
        $.contextMenu({
            selector: '.leaflet-container .context-menu-map', // '.context-menu-map',
            callback: function(key, options) {
                var m = "XX map clicked: " + key;
                console.log(m)
            },
            items: {
                "edit": {
                    name: "Map Edit",
                    icon: "edit"
                },
                "cut": {
                    name: "Cut",
                    icon: "cut"
                },
                copy: {
                    name: "Copy",
                    icon: "copy"
                },
                "paste": {
                    name: "Paste",
                    icon: "paste"
                },
                "delete": {
                    name: "Delete",
                    icon: "delete"
                },
                "sep1": "---------",
                "quit": {
                    name: "Quit",
                    icon: function() {
                        return 'context-menu-icon context-menu-icon-quit';
                    }
                }
            }
        });

        // $('.context-menu-map').on('click', function(e) {
        $('.leaflet-container').on('click', function(e) {
            console.log('YY map clicked', this);
        });
    });

    // //Right click on the map activated
    // bootleaf.map.on('contextmenu', function(e) {
    //     ctxmenu(e); // alert(e.latlng);
    // });
}
