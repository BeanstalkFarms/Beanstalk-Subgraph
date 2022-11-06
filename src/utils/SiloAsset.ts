import { Address, BigInt } from '@graphprotocol/graph-ts';
import { SiloAsset, SiloAssetHourlySnapshot, SiloAssetDailySnapshot } from '../../generated/schema'
import { dayFromTimestamp, hourFromTimestamp } from './Dates';
import { ZERO_BD, ZERO_BI } from './Decimals';

export function loadSiloAsset(account: Address, token: Address): SiloAsset {
    let id = account.toHexString() + '-' + token.toHexString()
    let asset = SiloAsset.load(id)

    if (asset == null) {
        //let tokenEntity = loadToken(token)
        asset = new SiloAsset(id)
        asset.silo = account.toHexString()
        asset.token = token.toHexString()
        asset.totalDepositedBDV = ZERO_BI
        asset.totalDepositedAmount = ZERO_BI
        asset.totalFarmAmount = ZERO_BI
        asset.save()
    }
    return asset as SiloAsset
}

export function loadSiloAssetHourlySnapshot(account: Address, token: Address, season: i32, timestamp: BigInt): SiloAssetHourlySnapshot {
    let hour = hourFromTimestamp(timestamp)
    let id = account.toHexString() + '-' + token.toHexString() + '-' + season.toString()
    let snapshot = SiloAssetHourlySnapshot.load(id)
    if (snapshot == null) {
        let asset = loadSiloAsset(account, token)
        snapshot = new SiloAssetHourlySnapshot(id)
        snapshot.season = season
        snapshot.siloAsset = asset.id
        snapshot.totalDepositedBDV = asset.totalDepositedBDV
        snapshot.totalDepositedAmount = asset.totalDepositedAmount
        snapshot.totalFarmAmount = asset.totalFarmAmount
        snapshot.hourlyDepositedBDV = ZERO_BI
        snapshot.hourlyDepositedAmount = ZERO_BI
        snapshot.hourlyWithdrawnAmount = ZERO_BI
        snapshot.hourlyFarmAmountDelta = ZERO_BI
        snapshot.blockNumber = ZERO_BI
        snapshot.timestamp = BigInt.fromString(hour)
        snapshot.lastUpdated = ZERO_BI
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
        snapshot.totalDepositedBDV = asset.totalDepositedBDV
        snapshot.totalDepositedAmount = asset.totalDepositedAmount
        snapshot.totalFarmAmount = asset.totalFarmAmount
        snapshot.dailyDepositedBDV = ZERO_BI
        snapshot.dailyDepositedAmount = ZERO_BI
        snapshot.dailyWithdrawnAmount = ZERO_BI
        snapshot.dailyFarmAmountDelta = ZERO_BI
        snapshot.blockNumber = ZERO_BI
        snapshot.timestamp = BigInt.fromString(day)
        snapshot.lastUpdated = ZERO_BI
        snapshot.save()
    }
    return snapshot as SiloAssetDailySnapshot
}
