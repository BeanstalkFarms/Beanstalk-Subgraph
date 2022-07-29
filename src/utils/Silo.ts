import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Silo, SiloHourlySnapshot } from "../../generated/schema";
import { ZERO_BD, ZERO_BI } from "./Decimals";

export function loadSilo(diamondAddress: Address): Silo {
    let silo = Silo.load(diamondAddress.toHexString())
    if (silo == null) {
        silo = new Silo(diamondAddress.toHexString())
        silo.beanstalk = diamondAddress.toHexString()
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
