import { BigDecimal, BigInt, log } from "@graphprotocol/graph-ts";
import { BEANSTALK } from "./utils/Constants";
import { pow, toDecimal, ZERO_BD } from "./utils/Decimals";
import { loadSeason } from "./utils/Season";
import { loadSilo } from "./utils/Silo";
import { loadSiloYield } from "./utils/SiloYield";

export function updateBeanEMA(t: i32): void {
    let siloYield = loadSiloYield(t)

    // Calculate the current u value
    siloYield.u = t - 6074 < 720 ? t - 6074 : 720

    // Calculate the current beta value
    siloYield.beta = BigDecimal.fromString('2').div(BigDecimal.fromString((siloYield.u + 1).toString()))

    // Perform the EMA Calculation
    let currentEMA = ZERO_BD
    let priorEMA = ZERO_BD

    if (t - 6075 <= 720) {
        for (let i = 6075; i <= t; i++) {
            let season = loadSeason(BEANSTALK, BigInt.fromI32(i))
            currentEMA = ((toDecimal(season.rewardBeans).minus(priorEMA)).times(siloYield.beta)).plus(priorEMA)
            priorEMA = currentEMA
        }
    } else {
        // Beta has become stable
        let season = loadSeason(BEANSTALK, BigInt.fromI32(t))
        let priorYield = loadSiloYield(t - 1)
        currentEMA = ((toDecimal(season.rewardBeans).minus(priorYield.beansPerSeasonEMA)).times(siloYield.beta)).plus(priorYield.beansPerSeasonEMA)
    }

    siloYield.beansPerSeasonEMA = currentEMA
    siloYield.save()

    siloYield.beanAPY = calculateAPY(currentEMA, BigDecimal.fromString('2'))
    siloYield.lpAPY = calculateAPY(currentEMA, BigDecimal.fromString('4'))
    siloYield.save()
}


function calculateAPY(n: BigDecimal, seeds: BigDecimal): BigDecimal {
    // This iterates through 8760 times to calculate the silo APY

    let silo = loadSilo(BEANSTALK)

    let C = toDecimal(silo.totalSeeds)
    let K = toDecimal(silo.totalStalk, 10)
    let b = seeds.div(BigDecimal.fromString('2'))
    let k = BigDecimal.fromString('1')

    let b_start = b

    let C_1 = ZERO_BD
    let K_1 = ZERO_BD
    let b_1 = ZERO_BD
    let k_1 = ZERO_BD

    for (let i = 0; i < 8760; i++) {
        C_1 = C.plus((BigDecimal.fromString('2').times(n)))
        b_1 = b.plus((n.times((k.div(K)))))
        k_1 = k.plus((n.times((k.div(K))))).plus(BigDecimal.fromString('0.0002').times(b))
        K_1 = K.plus(n).plus(BigDecimal.fromString('0.0001').times(C))

        C = C_1
        K = K_1
        b = b_1
        k = k_1
    }

    let siloAPY = (b.minus(b_start)).div(BigDecimal.fromString('100'))
    return siloAPY
}
