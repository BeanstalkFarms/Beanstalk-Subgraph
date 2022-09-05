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

    // Initialize sequence
    let C = toDecimal(silo.totalSeeds)              // Init: Total Seeds
    let K = toDecimal(silo.totalStalk, 10)          // Init: Total Stalk
    let b = seeds.div(BigDecimal.fromString('2'))   // Init: User BDV
    let k = BigDecimal.fromString('1')              // Init: User Stalk
    let b_start = b

    // Placeholders for above values during each iteration
    let C_i = ZERO_BD
    let K_i = ZERO_BD
    let b_i = ZERO_BD
    let k_i = ZERO_BD

    // Stalk and Seeds per Deposited Bean.
    let STALK_PER_SEED = BigDecimal.fromString('0.0001'); // 1/10,000 Stalk per Seed
    let STALK_PER_BEAN = BigDecimal.fromString('0.0002'); // 2 Seeds per Bean * 1/10,000 Stalk per Seed

    for (let i = 0; i < 8760; i++) {
        // Each Season, Farmer's ownership = `current Stalk / total Stalk`
        let ownership = k.div(K)
        let newBeans  = n.times(ownership)
        
        // Total Seeds: each seignorage Bean => 2 Seeds
        C_i = C.plus(n.times(BigDecimal.fromString('2')))
        // Total Stalk: each seignorage Bean => 1 Stalk, each outstanding Bean => 1/10_000 Stalk
        K_i = K.plus(n/* .times(1) */).plus(STALK_PER_SEED.times(C))
        // User Beans: each seignorage Bean => 1 BDV
        b_i = b.plus(newBeans)
        // User Stalk: each seignorage Bean => 1 Stalk, each outstanding Bean => d = 1/5_000 Stalk per Bean
        k_i = k.plus(newBeans).plus(STALK_PER_BEAN.times(b))

        C = C_i
        K = K_i
        b = b_i
        k = k_i
    }

    // Examples:
    // -------------------------------
    // b_start = 1
    // b       = 1
    // b.minus(b_start) = 0   = 0% APY
    //
    // b_start = 1
    // b       = 1.1
    // b.minus(b_start) = 0.1 = 10% APY
    let siloAPY = b.minus(b_start)

    return siloAPY
}
