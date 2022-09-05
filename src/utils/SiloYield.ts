import { SiloYield } from "../../generated/schema";
import { ZERO_BD } from "./Decimals";

export function loadSiloYield(season: i32): SiloYield {
    let siloYield = SiloYield.load(season.toString())
    if (siloYield == null) {
        siloYield = new SiloYield(season.toString())
        siloYield.season = season
        siloYield.trailingSiloMints = ZERO_BD
        siloYield.beta = ZERO_BD
        siloYield.u = 0
        siloYield.beansPerSeasonEMA = ZERO_BD
        siloYield.beanAPY = ZERO_BD
        siloYield.lpAPY = ZERO_BD
        siloYield.save()
    }
    return siloYield as SiloYield
}
