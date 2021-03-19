
var config = {
    "title": "Radiosonde",
    "start": {
        // "maxZoom": 16,
        "center": [47, 15],
        "zoom": 3,
        "attributionControl": true,
        "zoomControl": false
    },
    "about": {
        "title":  "Radiosonde ascents for the masses!",
        "contents": ["<p>this app: https://github.com/mhaberler/radiosonde</p>",
		     "<p>Skew-T by rittels: https://www.npmjs.com/package/skewt-plus</p>",
		     "<p>Data source: https://github.com/mhaberler/radiosonde-datacollector</p>",
		    ]
    },
    "controls": {
        "zoom": {
            "position": "topleft"
        },
	"TOC": {
            //https://leafletjs.com/reference-1.0.2.html#control-layers-option
            "collapsed": true,
            "uncategorisedLabel": "Layers",
            "position": "topright",
            "toggleAll": true
        },
        // "leafletGeocoder": {
        //     //https://github.com/perliedman/leaflet-control-geocoder
        //     "collapsed": false,
        //     "position": "topleft",
        //     "placeholder": "Search for a location or station id",
        //     "type": "WmoId",
	//     "defaultMarkGeocode": false
        // },
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
                               -29.17, 24.27
			   ],
			   "zoom": 6,
			   "name": "South Africa",
			   "id": "sa4711",
			   "editable": true,
			   "removable": true
                       },
                       {
			   "latlng": [
                               50.2, 11.22
			   ],
			   "zoom": 6,
			   "name": "Central Europe",
			   "id": "ce4711",
			   "editable": true,
			   "removable": true
                       },
                       {
			   "latlng": [
                               63.6, 18.1
			   ],
			   "zoom": 5,
			   "name": "Scandinavia",
			   "id": "sc4711",
			   "editable": true,
			   "removable": true
                       },
                       {
			   "latlng": [
                               41.282, -90.54
			   ],
			   "zoom": 4,
			   "name": "The Colonies",
			   "id": "colonies4711",
			   "editable": true,
			   "removable": true
                       },
                       {
			   "latlng": [
                               -71.76, 120.72
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
    // "activeTool": "coordinates", // "filterWidget", // options are identify/coordinates/queryWidget

    // "tocCategories": [{
    //     "name": "Flight area",
    //     "layers": [
    //         "bbox-fm94",
    //     ]
    // },
    
    "layers": [
        //        radiosonde.mah.priv.at/static/airspace# austria_at.geojson
        // Historic layers

        {
            "id": "bbox-fm94",
	    //	    "label": "station_id",
            "name": "Bounding box",
            "type": "geoJSON",
            "url": "https://radiosonde.mah.priv.at/data/bbox-fm94.geojson",
            // "opacity": 0.6,
	    // "width": 1,
            "visible": false,
	    "style": {
		"stroke": true,
//		"fillColor": "#bee5eb", //"#00FFFF",
//		"fillOpacity": 0.9,
		"radius": 10,
		"weight": 0.5,
		"opacity": 1,
		"color":'MediumBlue', // 'red', //'#727272',
	    },
        },

        {
            "id": "area-fm94",
	    //	    "label": "station_id",
            "name": "Hull",
            "type": "geoJSON",
            "url": "https://radiosonde.mah.priv.at/data/area-fm94.geojson",
            // "opacity": 0.6,
	    // "width": 1,
            "visible": false,
	    "style": {
		"stroke": true,
//		"fillColor": "#bee5eb", //"#00FFFF",
//		"fillOpacity": 0.9,
		"radius": 10,
		"weight": 0.5,
		"opacity": 1,
		"color":'MediumBlue', // 'red', //'#727272',
	    },
        },


	
	//..
    ],
    "basemaps": ['OpenStreetMap', 'Aerial'],
    "bing_key": "Ai97yaqNocJJDGpibB4EnQ-0AoEb0prY4jZ3OASp8rf8jHFET_KsVtgGx2MDku6F",
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
}
