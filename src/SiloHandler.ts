import { Address, BigInt } from '@graphprotocol/graph-ts'
import { AddDeposit } from '../generated/Silo-Replanted/Beanstalk'
import { ZERO_BI } from './utils/Decimals'
import { loadFarmer } from './utils/Farmer'
import { loadSilo, loadSiloDailySnapshot, loadSiloHourlySnapshot } from './utils/Silo'
import { loadSiloAsset, loadSiloAssetDailySnapshot, loadSiloAssetHourlySnapshot } from './utils/SiloAsset'
import { loadSiloDeposit } from './utils/SiloDeposit'

export function handleAddDeposit(event: AddDeposit): void {


    let deposit = loadSiloDeposit(event.params.account, event.params.token, event.params.season)
    deposit.tokenAmount = event.params.amount
    deposit.bdv = event.params.bdv
    deposit.hashes.push(event.transaction.hash.toHexString())
    deposit.createdAt = deposit.createdAt == ZERO_BI ? event.block.timestamp : deposit.createdAt
    deposit.updatedAt = event.block.timestamp
    deposit.save()

    let season = event.params.season.toI32()

    // Update overall silo totals
    addDepositToSilo(event.address, season, event.params.bdv, event.block.timestamp, event.block.number)
    addDepositToSiloAsset(event.address, event.params.token, season, event.params.bdv, event.params.amount, event.block.timestamp, event.block.number)

    // Ensure that a Farmer entity is set up for this account.
    loadFarmer(event.params.account)

    // Update farmer silo totals
    addDepositToSilo(event.params.account, season, event.params.bdv, event.block.timestamp, event.block.number)
    addDepositToSiloAsset(event.params.account, event.params.token, season, event.params.bdv, event.params.amount, event.block.timestamp, event.block.number)

}

function addDepositToSilo(account: Address, season: i32, bdv: BigInt, timestamp: BigInt, blockNumber: BigInt): void {
    let silo = loadSilo(account)
    let siloHourly = loadSiloHourlySnapshot(account, season, timestamp)
    let siloDaily = loadSiloDailySnapshot(account, timestamp)

    silo.totalDepositedBDV = silo.totalDepositedBDV.plus(bdv)
    silo.save()

    siloHourly.season = season
    siloHourly.hourlyDepositedBDV = siloHourly.hourlyDepositedBDV.plus(bdv)
    siloHourly.totalDepositedBDV = silo.totalDepositedBDV
    siloHourly.blockNumber = blockNumber
    siloHourly.timestamp = timestamp
    siloHourly.save()

    siloDaily.season = season
    siloDaily.dailyDepositedBDV = siloDaily.dailyDepositedBDV.plus(bdv)
    siloDaily.totalDepositedBDV = silo.totalDepositedBDV
    siloDaily.blockNumber = blockNumber
    siloDaily.timestamp = timestamp
    siloDaily.save()
}

function addDepositToSiloAsset(account: Address, token: Address, season: i32, bdv: BigInt, tokenAmount: BigInt, timestamp: BigInt, blockNumber: BigInt): void {
    let asset = loadSiloAsset(account, token)
    let assetHourly = loadSiloAssetHourlySnapshot(account, token, season)
    let assetDaily = loadSiloAssetDailySnapshot(account, token, timestamp)

    asset.totalDepositedBDV = asset.totalDepositedBDV.plus(bdv)
    asset.totalDepositedAmount = asset.totalDepositedAmount.plus(tokenAmount)
    asset.save()

    assetHourly.season = season
    assetHourly.hourlyDepositedBDV = assetHourly.hourlyDepositedBDV.plus(bdv)
    assetHourly.totalDepositedBDV = asset.totalDepositedBDV.plus(bdv)
    assetHourly.hourlyDepositedAmount = assetHourly.hourlyDepositedAmount.plus(tokenAmount)
    assetHourly.totalDepositedAmount = asset.totalDepositedAmount.plus(tokenAmount)
    assetHourly.save()

    assetDaily.season = season
    assetDaily.dailyDepositedBDV = assetDaily.dailyDepositedBDV.plus(bdv)
    assetDaily.totalDepositedBDV = asset.totalDepositedBDV.plus(bdv)
    assetDaily.dailyDepositedAmount = assetDaily.dailyDepositedAmount.plus(tokenAmount)
    assetDaily.totalDepositedAmount = asset.totalDepositedAmount.plus(tokenAmount)
    assetDaily.save()
}
