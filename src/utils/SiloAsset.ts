import { Address, BigInt } from '@graphprotocol/graph-ts';
import { SiloAsset, SiloAssetDailySnapshot, SiloAssetHourlySnapshot } from '../../generated/schema'
import { dayFromTimestamp } from './Dates';
import { ZERO_BD, ZERO_BI } from './Decimals';
import { loadToken } from './Token';

export function loadSiloAsset(account: Address, token: Address): SiloAsset {
    let id = account.toHexString() + '-' + token.toHexString()
    let asset = SiloAsset.load(id)

    if (asset == null) {
        //let tokenEntity = loadToken(token)
        asset = new SiloAsset(id)
        asset.silo = account.toHexString()
        asset.token = token.toHexString()
        asset.totalValueLockedUSD = ZERO_BD
        asset.totalDepositedBDV = ZERO_BI
        asset.totalDepositedAmount = ZERO_BI
        asset.cumulativeDepositedUSD = ZERO_BD
        asset.totalStalk = ZERO_BI
        asset.totalSeeds = ZERO_BI
        asset.save()
    }
    return asset as SiloAsset
}

export function loadSiloAssetHourlySnapshot(account: Address, token: Address, season: i32): SiloAssetHourlySnapshot {
    let id = account.toHexString() + '-' + token.toHexString() + '-' + season.toString()
    let snapshot = SiloAssetHourlySnapshot.load(id)
    if (snapshot == null) {
        let asset = loadSiloAsset(account, token)
        snapshot = new SiloAssetHourlySnapshot(id)
        snapshot.season = season
        snapshot.siloAsset = asset.id
        snapshot.totalValueLockedUSD = asset.totalValueLockedUSD
        snapshot.totalDepositedBDV = asset.totalDepositedBDV
        snapshot.totalDepositedAmount = asset.totalDepositedAmount
        snapshot.totalStalk = asset.totalStalk
        snapshot.totalSeeds = asset.totalSeeds
        snapshot.cumulativeDepositedUSD = asset.cumulativeDepositedUSD
        snapshot.hourlyDepositedUSD = ZERO_BD
        snapshot.hourlyDepositedBDV = ZERO_BI
        snapshot.hourlyDepositedAmount = ZERO_BI
        snapshot.hourlyWithdrawnAmount = ZERO_BI
        snapshot.hourlyStalkDelta = ZERO_BI
        snapshot.hourlySeedsDelta = ZERO_BI
        snapshot.blockNumber = ZERO_BI
        snapshot.timestamp = ZERO_BI
        snapshot.save()
    }
    return snapshot as SiloAssetHourlySnapshot
}

export function loadSiloAssetDailySnapshot(account: Address, token: Address, timestamp: BigInt): SiloAssetDailySnapshot {
    let day = dayFromTimestamp(timestamp)
    let id = account.toHexString() + '-' + token.toHexString() + '-' + day.toString()
    let snapshot = SiloAssetDailySnapshot.load(id)
    if (snapshot == null) {
        let asset = loadSiloAsset(account, token)
        snapshot = new SiloAssetDailySnapshot(id)
        snapshot.season = 0
        snapshot.siloAsset = asset.id
        snapshot.totalValueLockedUSD = asset.totalValueLockedUSD
        snapshot.totalDepositedBDV = asset.totalDepositedBDV
        snapshot.totalDepositedAmount = asset.totalDepositedAmount
        snapshot.totalStalk = asset.totalStalk
        snapshot.totalSeeds = asset.totalSeeds
        snapshot.cumulativeDepositedUSD = asset.cumulativeDepositedUSD
        snapshot.dailyDepositedUSD = ZERO_BD
        snapshot.dailyDepositedBDV = ZERO_BI
        snapshot.dailyDepositedAmount = ZERO_BI
        snapshot.dailyWithdrawnAmount = ZERO_BI
        snapshot.dailyStalkDelta = ZERO_BI
        snapshot.dailySeedsDelta = ZERO_BI
        snapshot.blockNumber = ZERO_BI
        snapshot.timestamp = ZERO_BI
        snapshot.save()
    }
    return snapshot as SiloAssetDailySnapshot
}
