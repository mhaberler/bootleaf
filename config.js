var config = {
    "title": "Radiosonde", // tab  name
    "start": {
        // "maxZoom": 16,
        "center": [47, 15],
        "zoom": 3,
        "attributionControl": true,
        "zoomControl": false
    },
    "about": {
        "title": "Radiosonde ascents for the masses!",
        "contents": "<p>see https://github.com/mhaberler/radiosonde</p>"
    },
    "controls": {
        "zoom": {
            "position": "topleft"
        },
        "leafletGeocoder": {
            //https://github.com/perliedman/leaflet-control-geocoder
            "collapsed": false,
            "position": "topleft",
            "placeholder": "Search for a location",
            "type": "OpenStreetMap",
        },
        "TOC": {
            //https://leafletjs.com/reference-1.0.2.html#control-layers-option
            "collapsed": true,
            "uncategorisedLabel": "Layers",
            "position": "topright",
            "toggleAll": true
        },
        "bookmarks": {
            "position": "bottomright",
            "places": [{
                    "latlng": [
                        46.56, 13.0
                    ],
                    "zoom": 7,
                    "name": "Alps",
                    "id": "alps4711",
                    "editable": true,
                    "removable": true
                },
                {
                    "latlng": [
                        47.5, 13.6
                    ],
                    "zoom": 8,
                    "name": "Austria",
                    "id": "austria4711",
                    "editable": true,
                    "removable": true
                },
                {
                    "latlng": [
                        -29.17,24.27
                    ],
                    "zoom": 6,
                    "name": "South Africa",
                    "id": "sa4711",
                    "editable": true,
                    "removable": true
                },
                 {
                    "latlng": [
                        50.2,11.22
                    ],
                    "zoom": 6,
                    "name": "Central Europe",
                    "id": "ce4711",
                    "editable": true,
                    "removable": true
                },
                {
                   "latlng": [
                       63.6,18.1
                   ],
                   "zoom": 5,
                   "name": "Scandinavia",
                   "id": "sc4711",
                   "editable": true,
                   "removable": true
               },
                {
                   "latlng": [
                       41.282,-90.54
                   ],
                   "zoom": 4,
                   "name": "The Colonies",
                   "id": "colonies4711",
                   "editable": true,
                   "removable": true
               },
               {
                  "latlng": [
                      -71.76,120.72
                  ],
                  "zoom": 3,
                  "name": "Antarctica",
                  "id": "aa4711",
                  "editable": true,
                  "removable": true
              },
              {
                 "latlng": [
                     11.826, 129.63
                 ],
                 "zoom": 6,
                 "name": "Philippines",
                 "id": "pp4711",
                 "editable": true,
                 "removable": true
             }


            ]
        }
    },

    // "activeTool": "filterWidget", // options are identify/coordinates/queryWidget
    "basemaps": ['OpenStreetMap', 'Aerial'],
    "bing_key": "Ai97yaqNocJJDGpibB4EnQ-0AoEb0prY4jZ3OASp8rf8jHFET_KsVtgGx2MDku6F",

    "tocCategories": [{
            "name": "Airspaces",
            "layers": [
                "airspace-at",
                "airspace-it",

            ]
        },
        // {
        // 	"name": "Actual Event Post Data",
        // 	"layers" : [
        // 		"events_bushfire", "events_drought", "events_earthquake", "events_flood", "events_general", "events_severeThunderstorm", "events_severeWeather",
        // 		"events_tornado", "events_tropicalCyclone"
        // 	]
        // }
    ],
    "layers": [
        //        radiosonde.mah.priv.at/static/airspace# austria_at.geojson
        // Historic layers

        {
            "id": "airspace-at",
            "name": "AT Airspace",
            "type": "geoJSON",
            "url": "https://radiosonde.mah.priv.at/static/airspace/austria_at.geojson"
        },
        {
            "id": "airspace-it",
            "name": "IT Airspace",
            "type": "geoJSON",
            "url": "https://radiosonde.mah.priv.at/static/airspace/italy_it.geojson"
        },

    ],
    // "TOC": {
    //     //https://leafletjs.com/reference-1.0.2.html#control-layers-option
    //     "collapsed": true,
    //     "uncategorisedLabel": "Layers",
    //     "position": "topright",
    //     "toggleAll": true
    // },
    "projections": [{
        4269: '+proj=longlat +ellps=GRS80 +datum=NAD83 +no_defs '
    }],
    "highlightStyle": {
        "weight": 2,
        "opacity": 1,
        "color": 'white',
        "dashArray": '3',
        "fillOpacity": 0.5,
        "fillColor": '#E31A1C',
        "stroke": true
    },
    "layers": [
        // {
        // "id": "paths",
        // "name": "Paths",
        // "type": "geoJSON",
        // "cluster": true,
        // "showCoverageOnHover": false,
        // "minZoom": 12,
        // "url": "./data/theatres.geojson",
        // "icon": {
        //     "iconUrl": "./img/theater.png",
        //     "iconSize": [24,28]
        // },
        // "style": {
        // "stroke": true,
        // "fillColor": "#00FFFF",
        // "fillOpacity": 0.5,
        // "radius": 10,
        // "weight": 0.5,
        // "opacity": 1,
        // "color": '#727272',
        // },
        //   "visible": false,
        //   // "label": {
        //   // 	"name": "NAME",
        //   // 	"minZoom": 14
        //   // }
        // }
    ]
}
