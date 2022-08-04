import { Address, BigInt } from "@graphprotocol/graph-ts";
import { SiloDailySnapshot } from "../../generated/schema";
import { Silo, SiloHourlySnapshot } from "../../generated/schema";
import { BEANSTALK } from "./Constants";
import { dayFromTimestamp } from "./Dates";
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
        silo.totalSeeds = ZERO_BI
        silo.totalRoots = ZERO_BI
        silo.totalBeanMints = ZERO_BI
        silo.save()
    }
    return silo
}

export function loadSiloHourlySnapshot(account: Address, season: i32, timestamp: BigInt): SiloHourlySnapshot {
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
        snapshot.totalSeeds = silo.totalSeeds
        snapshot.totalBeanMints = silo.totalBeanMints
        snapshot.cumulativeDepositedUSD = ZERO_BD
        snapshot.hourlyDepositedUSD = ZERO_BD
        snapshot.hourlyDepositedBDV = ZERO_BI
        snapshot.hourlyWithdrawnBDV = ZERO_BI
        snapshot.hourlyClaimableBDV = ZERO_BI
        snapshot.hourlyStalkDelta = ZERO_BI
        snapshot.hourlySeedsDelta = ZERO_BI
        snapshot.hourlyBeanMints = ZERO_BI
        snapshot.blockNumber = ZERO_BI
        snapshot.timestamp = timestamp
        snapshot.save()
    }
    return snapshot
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
        snapshot.totalSeeds = silo.totalSeeds
        snapshot.totalBeanMints = silo.totalBeanMints
        snapshot.cumulativeDepositedUSD = ZERO_BD
        snapshot.dailyDepositedUSD = ZERO_BD
        snapshot.dailyDepositedBDV = ZERO_BI
        snapshot.dailyWithdrawnBDV = ZERO_BI
        snapshot.dailyClaimableBDV = ZERO_BI
        snapshot.dailyStalkDelta = ZERO_BI
        snapshot.dailySeedsDelta = ZERO_BI
        snapshot.dailyBeanMints = ZERO_BI
        snapshot.blockNumber = ZERO_BI
        snapshot.timestamp = timestamp
        snapshot.save()
    }
    return snapshot as SiloDailySnapshot
}
