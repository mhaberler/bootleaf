(function(){

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
    const L = -6.5e-3;
    const g = 9.80665;

    window.atm={

        /**
         * Computes the temperature at the given pressure assuming dry processes.
         *
         * t0 is the starting temperature at p0 (degree Celsius).
         */
        dryLapse: function(p, tK0, p0) {
          return tK0 * Math.pow(p / p0, Rd / Cpd);
        },

        // Computes the mixing ration of a gas.
        mixingRatio: function(partialPressure, totalPressure, molecularWeightRatio = epsilon) {
          return (molecularWeightRatio * partialPressure) / (totalPressure - partialPressure);
        },

        // Computes the saturation mixing ratio of water vapor.
        saturationMixingRatio:  function(p, tK) {
          return this.mixingRatio(this.saturationVaporPressure(tK), p);
        },

        // Computes the saturation water vapor (partial) pressure
        saturationVaporPressure:  function(tK) {
          const tC = tK - celsiusToK;
          return satPressure0c * Math.exp((17.67 * tC) / (tC + 243.5));
        },

        // Computes the temperature gradient assuming liquid saturation process.
        moistGradientT:  function(p, tK) {
           //  console.log("p",p,"K",tK);
          const rs = this.saturationMixingRatio(p, tK);
          const n = Rd * tK + Lv * rs;
          const d = Cpd + (Math.pow(Lv, 2) * rs * epsilon) / (Rd * Math.pow(tK, 2));
          return (1 / p) * (n / d);
        },

        // Computes water vapor (partial) pressure.
        vaporPressure:  function(p, mixing) {
          return (p * mixing) / (epsilon + mixing);
        },

        // Computes the ambient dewpoint given the vapor (partial) pressure.
        dewpoint:  function(p) {
          const val = Math.log(p / satPressure0c);
          return celsiusToK + (243.5 * val) / (17.67 - val);
        },

        getElevation:  function(p) {
          const t0 = 288.15;
          const p0 = 1013.25;
          return (t0 / L) * (Math.pow(p / p0, (-L * Rd) / g) - 1);
        },

        parcelTrajectory:   function(params, steps, sfcT, sfcP, sfcDewpoint) {
          const parcel = {};
          const dryGhs = [];
          const dryPressures = [];
          const dryTemps = [];
          const dryDewpoints = [];

          const mRatio = this.mixingRatio(this.saturationVaporPressure(sfcDewpoint), sfcP);

          const pToEl = skewtMath.scaleLog(params.level, params.gh);
          const minEl = pToEl(sfcP);
          const maxEl = Math.max(minEl, params.gh[params.gh.length - 1]);
          const stepEl = (maxEl - minEl) / steps;

          for (let elevation = minEl; elevation <= maxEl; elevation += stepEl) {
            const p = pToEl.invert(elevation);
            const t = this.dryLapse(p, sfcT, sfcP);
            const dp = this.dewpoint(this.vaporPressure(p, mRatio));
            dryGhs.push(elevation);
            dryPressures.push(p);
            dryTemps.push(t);
            dryDewpoints.push(dp);
          }

          const cloudBase = skewtMath.firstIntersection(dryGhs, dryTemps, dryGhs, dryDewpoints);
          let thermalTop = skewtMath.firstIntersection(dryGhs, dryTemps, params.gh, params.temp);

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
              t = t + (p - previousP) * this.moistGradientT(p, t);
              previousP = p;
              moistGhs.push(elevation);
              moistPressures.push(p);
              moistTemps.push(t);
            }

            const isohume = skewtMath.zip(dryDewpoints, dryPressures).filter((pt) => pt[1] > pCloudBase);
            isohume.push([cloudBase[1], pCloudBase]);

            let moist = skewtMath.zip(moistTemps, moistPressures);
            const equilibrium = skewtMath.firstIntersection(moistGhs, moistTemps, params.gh, params.temp);

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
          const dry = skewtMath.zip(dryTemps, dryPressures).filter((pt) => pt[1] > pThermalTop);
          dry.push([thermalTop[1], pThermalTop]);

          parcel.dry = dry;
          parcel.pThermalTop = pThermalTop;
          parcel.elevThermalTop = thermalTop[0];

          return parcel;
        }
    }

})()
