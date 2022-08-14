import { Address, BigInt, log } from '@graphprotocol/graph-ts'
import { AddDeposit, StalkBalanceChanged, AddWithdrawal, RemoveDeposit, RemoveDeposits, RemoveWithdrawal, RemoveWithdrawals } from '../generated/Silo-Replanted/Beanstalk'
import { ZERO_BI } from './utils/Decimals'
import { loadFarmer } from './utils/Farmer'
import { loadSilo, loadSiloDailySnapshot, loadSiloHourlySnapshot } from './utils/Silo'
import { loadSiloAsset, loadSiloAssetDailySnapshot, loadSiloAssetHourlySnapshot } from './utils/SiloAsset'
import { loadSiloDeposit } from './utils/SiloDeposit'
import { loadSiloWithdraw } from './utils/SiloWithdraw'
import { AddDeposit as AddDepositEntity, RemoveDeposit as RemoveDepositEntity, SeedChange, StalkChange } from '../generated/schema'
import { loadBeanstalk } from './utils/Beanstalk'

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

    let id = 'addDeposit-' + event.transaction.hash.toHexString() + '-' + event.transactionLogIndex.toString()
    let add = new AddDepositEntity(id)
    add.hash = event.transaction.hash.toHexString()
    add.logIndex = event.transactionLogIndex.toI32()
    add.protocol = event.address.toHexString()
    add.account = event.params.account.toHexString()
    add.token = event.params.token.toHexString()
    add.season = event.params.season.toI32()
    add.amount = event.params.amount
    add.bdv = event.params.bdv
    add.blockNumber = event.block.number
    add.timestamp = event.block.timestamp
    add.save()
}

export function handleRemoveDeposit(event: RemoveDeposit): void {

    let beanstalk = loadBeanstalk(event.address) // get current season
    let deposit = loadSiloDeposit(event.params.account, event.params.token, event.params.season)
    let remainingTokenAmount = deposit.tokenAmount.minus(deposit.removedTokenAmount)
    let remainingBDV = deposit.bdv.minus(deposit.removedBDV)

    let removedBDV = remainingTokenAmount == ZERO_BI ? ZERO_BI : (event.params.amount.div(remainingTokenAmount)).times(remainingBDV)

    // Update deposit
    deposit.removedBDV = deposit.removedBDV.plus(removedBDV)
    deposit.removedTokenAmount = deposit.removedTokenAmount.plus(event.params.amount)
    deposit.save()

    // Update protocol totals
    removeDepositFromSilo(event.address, beanstalk.lastSeason, removedBDV, event.block.timestamp, event.block.number)
    removeDepositFromSiloAsset(event.address, event.params.token, beanstalk.lastSeason, removedBDV, event.params.amount, event.block.timestamp, event.block.number)

    // Update farmer totals
    removeDepositFromSilo(event.params.account, beanstalk.lastSeason, removedBDV, event.block.timestamp, event.block.number)
    removeDepositFromSiloAsset(event.params.account, event.params.token, beanstalk.lastSeason, removedBDV, event.params.amount, event.block.timestamp, event.block.number)

    let id = 'removeDeposit-' + event.transaction.hash.toHexString() + '-' + event.transactionLogIndex.toString()
    let removal = new RemoveDepositEntity(id)
    removal.hash = event.transaction.hash.toHexString()
    removal.logIndex = event.transactionLogIndex.toI32()
    removal.protocol = event.address.toHexString()
    removal.account = event.params.account.toHexString()
    removal.token = event.params.token.toHexString()
    removal.season = event.params.season.toI32()
    removal.amount = event.params.amount
    removal.blockNumber = event.block.number
    removal.timestamp = event.block.timestamp
    removal.save()

}

export function handleRemoveDeposits(event: RemoveDeposits): void {
    let beanstalk = loadBeanstalk(event.address) // get current season

    for (let i = 0; i < event.params.seasons.length; i++) {

        let deposit = loadSiloDeposit(event.params.account, event.params.token, event.params.seasons[i])
        let remainingTokenAmount = deposit.tokenAmount.minus(deposit.removedTokenAmount)
        let remainingBDV = deposit.bdv.minus(deposit.removedBDV)

        let removedBDV = remainingTokenAmount == ZERO_BI ? ZERO_BI : (event.params.amounts[i].div(remainingTokenAmount)).times(remainingBDV)

        // Update deposit
        deposit.removedBDV = deposit.removedBDV.plus(removedBDV)
        deposit.removedTokenAmount = deposit.removedTokenAmount.plus(event.params.amounts[i])
        deposit.save()

        // Update protocol totals
        removeDepositFromSilo(event.address, beanstalk.lastSeason, removedBDV, event.block.timestamp, event.block.number)
        removeDepositFromSiloAsset(event.address, event.params.token, beanstalk.lastSeason, removedBDV, event.params.amounts[i], event.block.timestamp, event.block.number)

        // Update farmer totals
        removeDepositFromSilo(event.params.account, beanstalk.lastSeason, removedBDV, event.block.timestamp, event.block.number)
        removeDepositFromSiloAsset(event.params.account, event.params.token, beanstalk.lastSeason, removedBDV, event.params.amounts[i], event.block.timestamp, event.block.number)

        let id = 'removeDeposit-' + event.transaction.hash.toHexString() + '-' + event.transactionLogIndex.toString()
        let removal = new RemoveDepositEntity(id)
        removal.hash = event.transaction.hash.toHexString()
        removal.logIndex = event.transactionLogIndex.toI32()
        removal.protocol = event.address.toHexString()
        removal.account = event.params.account.toHexString()
        removal.token = event.params.token.toHexString()
        removal.season = event.params.seasons[i].toI32()
        removal.amount = event.params.amounts[i]
        removal.blockNumber = event.block.number
        removal.timestamp = event.block.timestamp
        removal.save()
    }
}

export function handleAddWithdrawal(event: AddWithdrawal): void {
    let withdraw = loadSiloWithdraw(event.params.account, event.params.token, event.params.season.toI32())
    withdraw.amount = event.params.amount
    withdraw.hash = event.transaction.hash.toHexString()
    withdraw.createdAt = event.block.timestamp
    withdraw.save()

    addWithdrawToSiloAsset(event.address, event.params.token, event.params.season.toI32(), event.params.amount, event.block.timestamp, event.block.number)
    addWithdrawToSiloAsset(event.params.account, event.params.token, event.params.season.toI32(), event.params.amount, event.block.timestamp, event.block.number)
}

export function handleRemoveWithdrawal(event: RemoveWithdrawal): void {
    updateClaimedWithdraw(event.params.account, event.params.token, event.params.season)
}

export function handleRemoveWithdrawals(event: RemoveWithdrawals): void {

    for (let i = 0; i < event.params.seasons.length; i++) {
        updateClaimedWithdraw(event.params.account, event.params.token, event.params.seasons[i])
    }
}

export function handleStalkBalanceChanged(event: StalkBalanceChanged): void {

    let beanstalk = loadBeanstalk(event.address) // get current season
    updateStalkBalances(event.address, beanstalk.lastSeason, event.params.delta, event.block.timestamp, event.block.number)
    updateStalkBalances(event.params.account, beanstalk.lastSeason, event.params.delta, event.block.timestamp, event.block.number)

    let id = 'stalkChange-' + event.transaction.hash.toHexString() + '-' + event.transactionLogIndex.toString()
    let removal = new StalkChange(id)
    removal.hash = event.transaction.hash.toHexString()
    removal.logIndex = event.transactionLogIndex.toI32()
    removal.protocol = event.address.toHexString()
    removal.account = event.params.account.toHexString()
    removal.delta = event.params.delta
    removal.season = beanstalk.lastSeason
    removal.blockNumber = event.block.number
    removal.timestamp = event.block.timestamp
    removal.save()
}

export function handleSeedsBalanceChanged(event: StalkBalanceChanged): void {

    let beanstalk = loadBeanstalk(event.address) // get current season
    updateSeedsBalances(event.address, beanstalk.lastSeason, event.params.delta, event.block.timestamp, event.block.number)
    updateSeedsBalances(event.params.account, beanstalk.lastSeason, event.params.delta, event.block.timestamp, event.block.number)

    let id = 'seedChange-' + event.transaction.hash.toHexString() + '-' + event.transactionLogIndex.toString()
    let removal = new SeedChange(id)
    removal.hash = event.transaction.hash.toHexString()
    removal.logIndex = event.transactionLogIndex.toI32()
    removal.protocol = event.address.toHexString()
    removal.account = event.params.account.toHexString()
    removal.delta = event.params.delta
    removal.season = beanstalk.lastSeason
    removal.blockNumber = event.block.number
    removal.timestamp = event.block.timestamp
    removal.save()
}

function addDepositToSilo(account: Address, season: i32, bdv: BigInt, timestamp: BigInt, blockNumber: BigInt): void {
    let silo = loadSilo(account)
    let siloHourly = loadSiloHourlySnapshot(account, season, timestamp)
    let siloDaily = loadSiloDailySnapshot(account, timestamp)

    silo.totalDepositedBDV = silo.totalDepositedBDV.plus(bdv)
    silo.save()

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

function removeDepositFromSilo(account: Address, season: i32, bdv: BigInt, timestamp: BigInt, blockNumber: BigInt): void {
    let silo = loadSilo(account)
    let siloHourly = loadSiloHourlySnapshot(account, season, timestamp)
    let siloDaily = loadSiloDailySnapshot(account, timestamp)

    silo.totalDepositedBDV = silo.totalDepositedBDV.minus(bdv)
    silo.save()

    siloHourly.hourlyDepositedBDV = siloHourly.hourlyDepositedBDV.minus(bdv)
    siloHourly.totalDepositedBDV = silo.totalDepositedBDV
    siloHourly.blockNumber = blockNumber
    siloHourly.timestamp = timestamp
    siloHourly.save()

    siloDaily.season = season
    siloDaily.dailyDepositedBDV = siloDaily.dailyDepositedBDV.minus(bdv)
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

    assetHourly.hourlyDepositedBDV = assetHourly.hourlyDepositedBDV.plus(bdv)
    assetHourly.totalDepositedBDV = asset.totalDepositedBDV.plus(bdv)
    assetHourly.hourlyDepositedAmount = assetHourly.hourlyDepositedAmount.plus(tokenAmount)
    assetHourly.totalDepositedAmount = asset.totalDepositedAmount
    assetHourly.blockNumber = blockNumber
    assetHourly.timestamp = timestamp
    assetHourly.save()

    assetDaily.season = season
    assetDaily.dailyDepositedBDV = assetDaily.dailyDepositedBDV.plus(bdv)
    assetDaily.totalDepositedBDV = asset.totalDepositedBDV.plus(bdv)
    assetDaily.dailyDepositedAmount = assetDaily.dailyDepositedAmount.plus(tokenAmount)
    assetDaily.totalDepositedAmount = asset.totalDepositedAmount
    assetDaily.blockNumber = blockNumber
    assetDaily.timestamp = timestamp
    assetDaily.save()
}

function removeDepositFromSiloAsset(account: Address, token: Address, season: i32, bdv: BigInt, tokenAmount: BigInt, timestamp: BigInt, blockNumber: BigInt): void {
    let asset = loadSiloAsset(account, token)
    let assetHourly = loadSiloAssetHourlySnapshot(account, token, season)
    let assetDaily = loadSiloAssetDailySnapshot(account, token, timestamp)

    asset.totalDepositedBDV = asset.totalDepositedBDV.minus(bdv)
    asset.totalDepositedAmount = asset.totalDepositedAmount.minus(tokenAmount)
    asset.save()

    assetHourly.hourlyDepositedBDV = assetHourly.hourlyDepositedBDV.minus(bdv)
    assetHourly.totalDepositedBDV = asset.totalDepositedBDV
    assetHourly.hourlyDepositedAmount = assetHourly.hourlyDepositedAmount.minus(tokenAmount)
    assetHourly.totalDepositedAmount = asset.totalDepositedAmount
    assetHourly.blockNumber = blockNumber
    assetHourly.timestamp = timestamp
    assetHourly.save()

    assetDaily.season = season
    assetDaily.dailyDepositedBDV = assetDaily.dailyDepositedBDV.minus(bdv)
    assetDaily.totalDepositedBDV = asset.totalDepositedBDV
    assetDaily.dailyDepositedAmount = assetDaily.dailyDepositedAmount.minus(tokenAmount)
    assetDaily.totalDepositedAmount = asset.totalDepositedAmount
    assetDaily.blockNumber = blockNumber
    assetDaily.timestamp = timestamp
    assetDaily.save()
}

function addWithdrawToSiloAsset(account: Address, token: Address, season: i32, tokenAmount: BigInt, timestamp: BigInt, blockNumber: BigInt): void {
    let assetHourly = loadSiloAssetHourlySnapshot(account, token, season)
    let assetDaily = loadSiloAssetDailySnapshot(account, token, timestamp)


    assetHourly.hourlyWithdrawnAmount = assetHourly.hourlyWithdrawnAmount.plus(tokenAmount)
    assetHourly.blockNumber = blockNumber
    assetHourly.timestamp = timestamp
    assetHourly.save()

    assetDaily.season = season
    assetDaily.dailyWithdrawnAmount = assetDaily.dailyWithdrawnAmount.plus(tokenAmount)
    assetDaily.blockNumber = blockNumber
    assetDaily.timestamp = timestamp
    assetDaily.save()
}

function updateStalkBalances(account: Address, season: i32, stalk: BigInt, timestamp: BigInt, blockNumber: BigInt): void {
    let silo = loadSilo(account)
    let siloHourly = loadSiloHourlySnapshot(account, season, timestamp)
    let siloDaily = loadSiloDailySnapshot(account, timestamp)


    if (account == Address.fromString('0x19a4fe7d0c76490cca77b45580846cdb38b9a406')) {
        log.debug('\nStalkChanges: Account - {}\nStalkChanges: Starting Stalk - {}\nStalkChanges: Change Amount -  {}\n', [account.toHexString(), silo.totalStalk.toString(), stalk.toString()])
    }


    silo.totalStalk = silo.totalStalk.plus(stalk)
    silo.save()

    siloHourly.totalStalk = silo.totalStalk
    siloHourly.hourlyStalkDelta = siloHourly.hourlyStalkDelta.plus(stalk)
    siloHourly.blockNumber = blockNumber
    siloHourly.timestamp = timestamp
    siloHourly.save()

    siloDaily.season = season
    siloDaily.totalStalk = silo.totalStalk
    siloDaily.dailyStalkDelta = siloDaily.dailyStalkDelta.plus(stalk)
    siloDaily.blockNumber = blockNumber
    siloDaily.timestamp = timestamp
    siloDaily.save()

    if (account == Address.fromString('0x19a4fe7d0c76490cca77b45580846cdb38b9a406')) {
        log.debug('\nStalkChanges: Ending Stalk   - {}\n', [silo.totalStalk.toString()])
    }
}

function updateSeedsBalances(account: Address, season: i32, seeds: BigInt, timestamp: BigInt, blockNumber: BigInt): void {
    let silo = loadSilo(account)
    let siloHourly = loadSiloHourlySnapshot(account, season, timestamp)
    let siloDaily = loadSiloDailySnapshot(account, timestamp)

    silo.totalSeeds = silo.totalSeeds.plus(seeds)
    silo.save()

    siloHourly.totalSeeds = silo.totalSeeds
    siloHourly.hourlySeedsDelta = siloHourly.hourlySeedsDelta.plus(seeds)
    siloHourly.blockNumber = blockNumber
    siloHourly.timestamp = timestamp
    siloHourly.save()

    siloDaily.season = season
    siloDaily.totalSeeds = silo.totalSeeds
    siloDaily.dailySeedsDelta = siloDaily.dailySeedsDelta.plus(seeds)
    siloDaily.blockNumber = blockNumber
    siloDaily.timestamp = timestamp
    siloDaily.save()
}

function updateClaimedWithdraw(account: Address, token: Address, season: BigInt): void {
    let withdraw = loadSiloWithdraw(account, token, season.toI32())
    withdraw.claimed = true
    withdraw.save()
}
