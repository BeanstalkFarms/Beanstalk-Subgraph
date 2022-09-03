import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Silo, SiloHourlySnapshot, SiloDailySnapshot } from "../../generated/schema";
import { BEANSTALK } from "./Constants";
import { dayFromTimestamp, hourFromTimestamp } from "./Dates";
import { ZERO_BD, ZERO_BI } from "./Decimals";

export function loadSilo(account: Address): Silo {
    let silo = Silo.load(account.toHexString())
    if (silo == null) {
        silo = new Silo(account.toHexString())
        silo.beanstalk = BEANSTALK.toHexString()
        if (account !== BEANSTALK) { silo.farmer = account.toHexString() }
        silo.totalValueLockedUSD = ZERO_BD
        silo.totalDepositedBDV = ZERO_BI
        silo.totalStalk = ZERO_BI
        silo.totalPlantableStalk = ZERO_BI
        silo.totalSeeds = ZERO_BI
        silo.totalRoots = ZERO_BI
        silo.totalBeanMints = ZERO_BI
        silo.totalFarmers = 0
        silo.save()
    }
    return silo as Silo
}

export function loadSiloHourlySnapshot(account: Address, season: i32, timestamp: BigInt): SiloHourlySnapshot {
    let hour = hourFromTimestamp(timestamp)
    let id = account.toHexString() + '-' + season.toString()
    let snapshot = SiloHourlySnapshot.load(id)
    if (snapshot == null) {
        snapshot = new SiloHourlySnapshot(id)
        let silo = loadSilo(account)
        snapshot.season = season
        snapshot.silo = account.toHexString()
        snapshot.totalValueLockedUSD = silo.totalValueLockedUSD
        snapshot.totalDepositedBDV = silo.totalDepositedBDV
        snapshot.totalStalk = silo.totalStalk
        snapshot.totalPlantableStalk = silo.totalPlantableStalk
        snapshot.totalSeeds = silo.totalSeeds
        snapshot.totalRoots = silo.totalRoots
        snapshot.totalBeanMints = silo.totalBeanMints
        snapshot.totalFarmers = silo.totalFarmers
        snapshot.beansPerStalk = ZERO_BI
        snapshot.cumulativeDepositedUSD = ZERO_BD
        snapshot.hourlyDepositedUSD = ZERO_BD
        snapshot.hourlyDepositedBDV = ZERO_BI
        snapshot.hourlyWithdrawnBDV = ZERO_BI
        snapshot.hourlyClaimableBDV = ZERO_BI
        snapshot.hourlyStalkDelta = ZERO_BI
        snapshot.hourlyPlantableStalkDelta = ZERO_BI
        snapshot.hourlySeedsDelta = ZERO_BI
        snapshot.hourlyRootsDelta = ZERO_BI
        snapshot.hourlyBeanMints = ZERO_BI
        snapshot.hourlyFarmers = 0
        snapshot.blockNumber = ZERO_BI
        snapshot.timestamp = BigInt.fromString(hour)
        snapshot.lastUpdated = timestamp
        snapshot.save()
    }
    return snapshot as SiloHourlySnapshot
}

export function loadSiloDailySnapshot(account: Address, timestamp: BigInt): SiloDailySnapshot {
    let day = dayFromTimestamp(timestamp)
    let id = account.toHexString() + '-' + day.toString()
    let snapshot = SiloDailySnapshot.load(id)
    if (snapshot == null) {
        snapshot = new SiloDailySnapshot(id)
        let silo = loadSilo(account)
        snapshot.season = 0
        snapshot.silo = account.toHexString()
        snapshot.totalValueLockedUSD = silo.totalValueLockedUSD
        snapshot.totalDepositedBDV = silo.totalDepositedBDV
        snapshot.totalStalk = silo.totalStalk
        snapshot.totalPlantableStalk = silo.totalPlantableStalk
        snapshot.totalSeeds = silo.totalSeeds
        snapshot.totalRoots = silo.totalRoots
        snapshot.totalBeanMints = silo.totalBeanMints
        snapshot.totalFarmers = silo.totalFarmers
        snapshot.beansPerStalk = ZERO_BI
        snapshot.cumulativeDepositedUSD = ZERO_BD
        snapshot.dailyDepositedUSD = ZERO_BD
        snapshot.dailyDepositedBDV = ZERO_BI
        snapshot.dailyWithdrawnBDV = ZERO_BI
        snapshot.dailyClaimableBDV = ZERO_BI
        snapshot.dailyStalkDelta = ZERO_BI
        snapshot.dailyPlantableStalkDelta = ZERO_BI
        snapshot.dailySeedsDelta = ZERO_BI
        snapshot.dailyRootsDelta = ZERO_BI
        snapshot.dailyBeanMints = ZERO_BI
        snapshot.dailyFarmers = 0
        snapshot.blockNumber = ZERO_BI
        snapshot.timestamp = BigInt.fromString(day)
        snapshot.lastUpdated = timestamp
        snapshot.save()
    }
    return snapshot as SiloDailySnapshot
}
