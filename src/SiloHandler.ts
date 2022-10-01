import { Address, BigInt, log } from '@graphprotocol/graph-ts'
import {
    AddDeposit,
    StalkBalanceChanged,
    AddWithdrawal,
    RemoveDeposit,
    RemoveDeposits,
    RemoveWithdrawal,
    RemoveWithdrawals,
    Plant,
    WhitelistToken,
    DewhitelistToken
} from '../generated/Silo-Replanted/Beanstalk'
import { Beanstalk, TransferDepositCall, TransferDepositsCall } from '../generated/Silo-Calls/Beanstalk'
import { ZERO_BI } from './utils/Decimals'
import { loadFarmer } from './utils/Farmer'
import { loadSilo, loadSiloDailySnapshot, loadSiloHourlySnapshot } from './utils/Silo'
import { loadSiloAsset as loadSiloAsset, loadSiloAssetDailySnapshot, loadSiloAssetHourlySnapshot } from './utils/SiloAsset'
import { loadSiloDeposit } from './utils/SiloDeposit'
import { loadSiloWithdraw } from './utils/SiloWithdraw'
import {
    AddDeposit as AddDepositEntity,
    RemoveDeposit as RemoveDepositEntity,
    WhitelistToken as WhitelistTokenEntity,
    DewhitelistToken as DewhitelistTokenEntity,
    SeedChange,
    StalkChange
} from '../generated/schema'
import { loadBeanstalk } from './utils/Beanstalk'
import { BEANSTALK, BEAN_ERC20, UNRIPE_BEAN, UNRIPE_BEAN_3CRV } from './utils/Constants'

export function handleAddDeposit(event: AddDeposit): void {


    let deposit = loadSiloDeposit(event.params.account, event.params.token, event.params.season)
    deposit.tokenAmount = deposit.tokenAmount.plus(event.params.amount)
    deposit.bdv = deposit.bdv.plus(event.params.bdv)
    let depositHashes = deposit.hashes
    depositHashes.push(event.transaction.hash.toHexString())
    deposit.hashes = depositHashes
    deposit.createdAt = deposit.createdAt == ZERO_BI ? event.block.timestamp : deposit.createdAt
    deposit.updatedAt = event.block.timestamp
    deposit.save()

    // Use the current season of beanstalk for updating silo and farmer totals
    let beanstalk = loadBeanstalk(event.address)

    // Update overall silo totals
    addDepositToSilo(event.address, beanstalk.lastSeason, event.params.bdv, event.block.timestamp, event.block.number)
    addDepositToSiloAsset(event.address, event.params.token, beanstalk.lastSeason, event.params.bdv, event.params.amount, event.block.timestamp, event.block.number)

    // Ensure that a Farmer entity is set up for this account.
    loadFarmer(event.params.account)


    // Update farmer silo totals
    addDepositToSilo(event.params.account, beanstalk.lastSeason, event.params.bdv, event.block.timestamp, event.block.number)
    addDepositToSiloAsset(event.params.account, event.params.token, beanstalk.lastSeason, event.params.bdv, event.params.amount, event.block.timestamp, event.block.number)

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

    let removedBDV = remainingTokenAmount == ZERO_BI ? ZERO_BI : event.params.amount.times(remainingBDV).div(remainingTokenAmount)

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

        let removedBDV = remainingTokenAmount == ZERO_BI ? ZERO_BI : event.params.amounts[i].times(remainingBDV).div(remainingTokenAmount)

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

        let id = 'removeDeposit-' + event.transaction.hash.toHexString() + '-' + event.transactionLogIndex.toString() + '-' + i.toString()
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

    addWithdrawToFarmAsset(event.address, event.params.token, event.params.season.toI32(), event.params.amount, event.block.timestamp, event.block.number)
    addWithdrawToFarmAsset(event.params.account, event.params.token, event.params.season.toI32(), event.params.amount, event.block.timestamp, event.block.number)
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
    updateStalkBalances(event.address, beanstalk.lastSeason, event.params.delta, event.params.deltaRoots, event.block.timestamp, event.block.number)
    updateStalkBalances(event.params.account, beanstalk.lastSeason, event.params.delta, event.params.deltaRoots, event.block.timestamp, event.block.number)

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

export function handlePlant(event: Plant): void {
    // This removes the plantable stalk for planted beans.
    // Actual stalk credit for the farmer will be handled under the StalkBalanceChanged event.

    let beanstalk = loadBeanstalk(event.address)
    let silo = loadSilo(event.address)
    let siloHourly = loadSiloHourlySnapshot(event.address, beanstalk.lastSeason, event.block.timestamp)
    let siloDaily = loadSiloDailySnapshot(event.address, event.block.timestamp)

    silo.totalPlantableStalk = silo.totalPlantableStalk.minus(event.params.beans)
    silo.totalDepositedBDV = silo.totalDepositedBDV.minus(event.params.beans)
    silo.save()

    siloHourly.totalPlantableStalk = silo.totalPlantableStalk
    siloHourly.totalDepositedBDV = silo.totalDepositedBDV
    siloHourly.hourlyPlantableStalkDelta = siloHourly.hourlyPlantableStalkDelta.minus(event.params.beans)
    siloHourly.hourlyDepositedBDV = siloHourly.hourlyDepositedBDV.minus(event.params.beans)
    siloHourly.blockNumber = event.block.number
    siloHourly.lastUpdated = event.block.timestamp
    siloHourly.save()

    siloDaily.totalPlantableStalk = silo.totalPlantableStalk
    siloDaily.totalDepositedBDV = silo.totalDepositedBDV
    siloDaily.dailyPlantableStalkDelta = siloDaily.dailyPlantableStalkDelta.minus(event.params.beans)
    siloDaily.dailyDepositedBDV = siloDaily.dailyDepositedBDV.minus(event.params.beans)
    siloDaily.blockNumber = event.block.number
    siloDaily.lastUpdated = event.block.timestamp
    siloDaily.save()

    removeDepositFromSiloAsset(event.address, BEAN_ERC20, beanstalk.lastSeason, event.params.beans, event.params.beans, event.block.timestamp, event.block.number)

}

export function handleTransferDepositCall(call: TransferDepositCall): void {
    let beanstalk = loadBeanstalk(BEANSTALK)
    let updateFarmers = beanstalk.farmersToUpdate
    if (updateFarmers.indexOf(call.from.toHexString()) == -1) updateFarmers.push(call.from.toHexString())
    if (updateFarmers.indexOf(call.inputs.recipient.toHexString()) == -1) updateFarmers.push(call.inputs.recipient.toHexString())
    beanstalk.farmersToUpdate = updateFarmers
    beanstalk.save()
}

export function handleTransferDepositsCall(call: TransferDepositsCall): void {
    let beanstalk = loadBeanstalk(BEANSTALK)
    let updateFarmers = beanstalk.farmersToUpdate
    if (updateFarmers.indexOf(call.from.toHexString()) == -1) updateFarmers.push(call.from.toHexString())
    if (updateFarmers.indexOf(call.inputs.recipient.toHexString()) == -1) updateFarmers.push(call.inputs.recipient.toHexString())
    beanstalk.farmersToUpdate = updateFarmers
    beanstalk.save()
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
    siloHourly.lastUpdated = timestamp
    siloHourly.save()

    siloDaily.season = season
    siloDaily.dailyDepositedBDV = siloDaily.dailyDepositedBDV.plus(bdv)
    siloDaily.totalDepositedBDV = silo.totalDepositedBDV
    siloDaily.blockNumber = blockNumber
    siloDaily.lastUpdated = timestamp
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
    siloHourly.lastUpdated = timestamp
    siloHourly.save()

    siloDaily.season = season
    siloDaily.dailyDepositedBDV = siloDaily.dailyDepositedBDV.minus(bdv)
    siloDaily.totalDepositedBDV = silo.totalDepositedBDV
    siloDaily.blockNumber = blockNumber
    siloDaily.lastUpdated = timestamp
    siloDaily.save()
}

export function addDepositToSiloAsset(account: Address, token: Address, season: i32, bdv: BigInt, tokenAmount: BigInt, timestamp: BigInt, blockNumber: BigInt): void {
    let asset = loadSiloAsset(account, token)
    let assetHourly = loadSiloAssetHourlySnapshot(account, token, season, timestamp)
    let assetDaily = loadSiloAssetDailySnapshot(account, token, timestamp)

    asset.totalDepositedBDV = asset.totalDepositedBDV.plus(bdv)
    asset.totalDepositedAmount = asset.totalDepositedAmount.plus(tokenAmount)
    asset.save()

    assetHourly.hourlyDepositedBDV = assetHourly.hourlyDepositedBDV.plus(bdv)
    assetHourly.totalDepositedBDV = asset.totalDepositedBDV
    assetHourly.hourlyDepositedAmount = assetHourly.hourlyDepositedAmount.plus(tokenAmount)
    assetHourly.totalDepositedAmount = asset.totalDepositedAmount
    assetHourly.blockNumber = blockNumber
    assetHourly.lastUpdated = timestamp
    assetHourly.save()

    assetDaily.season = season
    assetDaily.dailyDepositedBDV = assetDaily.dailyDepositedBDV.plus(bdv)
    assetDaily.totalDepositedBDV = asset.totalDepositedBDV
    assetDaily.dailyDepositedAmount = assetDaily.dailyDepositedAmount.plus(tokenAmount)
    assetDaily.totalDepositedAmount = asset.totalDepositedAmount
    assetDaily.blockNumber = blockNumber
    assetDaily.lastUpdated = timestamp
    assetDaily.save()
}

function removeDepositFromSiloAsset(account: Address, token: Address, season: i32, bdv: BigInt, tokenAmount: BigInt, timestamp: BigInt, blockNumber: BigInt): void {
    let asset = loadSiloAsset(account, token)
    let assetHourly = loadSiloAssetHourlySnapshot(account, token, season, timestamp)
    let assetDaily = loadSiloAssetDailySnapshot(account, token, timestamp)

    asset.totalDepositedBDV = asset.totalDepositedBDV.minus(bdv)
    asset.totalDepositedAmount = asset.totalDepositedAmount.minus(tokenAmount)
    asset.save()

    assetHourly.hourlyDepositedBDV = assetHourly.hourlyDepositedBDV.minus(bdv)
    assetHourly.totalDepositedBDV = asset.totalDepositedBDV
    assetHourly.hourlyDepositedAmount = assetHourly.hourlyDepositedAmount.minus(tokenAmount)
    assetHourly.totalDepositedAmount = asset.totalDepositedAmount
    assetHourly.blockNumber = blockNumber
    assetHourly.lastUpdated = timestamp
    assetHourly.save()

    assetDaily.season = season
    assetDaily.dailyDepositedBDV = assetDaily.dailyDepositedBDV.minus(bdv)
    assetDaily.totalDepositedBDV = asset.totalDepositedBDV
    assetDaily.dailyDepositedAmount = assetDaily.dailyDepositedAmount.minus(tokenAmount)
    assetDaily.totalDepositedAmount = asset.totalDepositedAmount
    assetDaily.blockNumber = blockNumber
    assetDaily.lastUpdated = timestamp
    assetDaily.save()
}

function addWithdrawToFarmAsset(account: Address, token: Address, season: i32, tokenAmount: BigInt, timestamp: BigInt, blockNumber: BigInt): void {
    let assetHourly = loadSiloAssetHourlySnapshot(account, token, season, timestamp)
    let assetDaily = loadSiloAssetDailySnapshot(account, token, timestamp)


    assetHourly.hourlyWithdrawnAmount = assetHourly.hourlyWithdrawnAmount.plus(tokenAmount)
    assetHourly.blockNumber = blockNumber
    assetHourly.lastUpdated = timestamp
    assetHourly.save()

    assetDaily.season = season
    assetDaily.dailyWithdrawnAmount = assetDaily.dailyWithdrawnAmount.plus(tokenAmount)
    assetDaily.blockNumber = blockNumber
    assetDaily.lastUpdated = timestamp
    assetDaily.save()
}

function updateStalkBalances(account: Address, season: i32, stalk: BigInt, roots: BigInt, timestamp: BigInt, blockNumber: BigInt): void {
    let silo = loadSilo(account)
    let siloHourly = loadSiloHourlySnapshot(account, season, timestamp)
    let siloDaily = loadSiloDailySnapshot(account, timestamp)

    silo.totalStalk = silo.totalStalk.plus(stalk)
    silo.totalRoots = silo.totalRoots.plus(roots)
    silo.save()

    siloHourly.totalStalk = silo.totalStalk
    siloHourly.totalRoots = silo.totalRoots
    siloHourly.hourlyStalkDelta = siloHourly.hourlyStalkDelta.plus(stalk)
    siloHourly.hourlyRootsDelta = siloHourly.hourlyRootsDelta.plus(roots)
    siloHourly.blockNumber = blockNumber
    siloHourly.lastUpdated = timestamp
    siloHourly.save()

    siloDaily.season = season
    siloDaily.totalStalk = silo.totalStalk
    siloDaily.totalRoots = silo.totalRoots
    siloDaily.dailyStalkDelta = siloDaily.dailyStalkDelta.plus(stalk)
    siloDaily.dailyRootsDelta = siloDaily.dailyRootsDelta.plus(roots)
    siloDaily.blockNumber = blockNumber
    siloDaily.lastUpdated = timestamp
    siloDaily.save()

    // Add account to active list if needed
    if (account !== BEANSTALK) {
        let beanstalk = loadBeanstalk(BEANSTALK)
        let farmerIndex = beanstalk.activeFarmers.indexOf(account.toHexString())
        if (farmerIndex == -1) {
            let newFarmers = beanstalk.activeFarmers
            newFarmers.push(account.toHexString())
            beanstalk.activeFarmers = newFarmers
            beanstalk.save()

            incrementProtocolFarmers(season, timestamp)

        } else if (silo.totalStalk == ZERO_BI) {
            let newFarmers = beanstalk.activeFarmers
            newFarmers.splice(farmerIndex, 1)
            beanstalk.activeFarmers = newFarmers

            decrementProtocolFarmers(season, timestamp)
        }
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
    siloHourly.lastUpdated = timestamp
    siloHourly.save()

    siloDaily.season = season
    siloDaily.totalSeeds = silo.totalSeeds
    siloDaily.dailySeedsDelta = siloDaily.dailySeedsDelta.plus(seeds)
    siloDaily.blockNumber = blockNumber
    siloDaily.lastUpdated = timestamp
    siloDaily.save()
}

function updateClaimedWithdraw(account: Address, token: Address, season: BigInt): void {
    let withdraw = loadSiloWithdraw(account, token, season.toI32())
    withdraw.claimed = true
    withdraw.save()
}

function incrementProtocolFarmers(season: i32, timestamp: BigInt): void {
    let silo = loadSilo(BEANSTALK)
    let siloHourly = loadSiloHourlySnapshot(BEANSTALK, season, timestamp)
    let siloDaily = loadSiloDailySnapshot(BEANSTALK, timestamp)

    silo.totalFarmers += 1
    siloHourly.totalFarmers += 1
    siloHourly.hourlyFarmers += 1
    siloDaily.totalFarmers += 1
    siloDaily.dailyFarmers += 1
    silo.save()
    siloHourly.save()
    siloDaily.save()

}

function decrementProtocolFarmers(season: i32, timestamp: BigInt): void {
    let silo = loadSilo(BEANSTALK)
    let siloHourly = loadSiloHourlySnapshot(BEANSTALK, season, timestamp)
    let siloDaily = loadSiloDailySnapshot(BEANSTALK, timestamp)

    silo.totalFarmers -= 1
    siloHourly.totalFarmers -= 1
    siloHourly.hourlyFarmers -= 1
    siloDaily.totalFarmers -= 1
    siloDaily.dailyFarmers -= 1
    silo.save()
    siloHourly.save()
    siloDaily.save()

}

export function updateStalkWithCalls(season: i32, timestamp: BigInt, blockNumber: BigInt): void {
    // This should be run at sunrise for the previous season to update any farmers stalk/seed/roots balances from silo transfers.

    let beanstalk = loadBeanstalk(BEANSTALK)
    let beanstalk_call = Beanstalk.bind(BEANSTALK)

    for (let i = 0; i < beanstalk.farmersToUpdate.length; i++) {
        let account = Address.fromString(beanstalk.farmersToUpdate[i])
        let silo = loadSilo(account)
        updateStalkBalances(account, season, beanstalk_call.balanceOfStalk(account).minus(silo.totalStalk), beanstalk_call.balanceOfRoots(account).minus(silo.totalRoots), timestamp, blockNumber)
        updateSeedsBalances(account, season, beanstalk_call.balanceOfSeeds(account).minus(silo.totalSeeds), timestamp, blockNumber)
    }
    beanstalk.farmersToUpdate = []
    beanstalk.save()
}

export function handleWhitelistToken(event: WhitelistToken): void {
    let silo = loadSilo(event.address)
    let currentList = silo.whitelistedTokens
    if (currentList.length == 0) {
        // Push unripe bean and unripe bean:3crv upon the initial whitelisting.
        currentList.push(UNRIPE_BEAN.toHexString())
        currentList.push(UNRIPE_BEAN_3CRV.toHexString())
    }
    currentList.push(event.params.token.toHexString())
    silo.whitelistedTokens = currentList
    silo.save()

    let id = 'whitelistToken-' + event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
    let rawEvent = new WhitelistTokenEntity(id)
    rawEvent.hash = event.transaction.hash.toHexString()
    rawEvent.logIndex = event.logIndex.toI32()
    rawEvent.protocol = event.address.toHexString()
    rawEvent.token = event.params.token.toHexString()
    rawEvent.stalk = event.params.stalk
    rawEvent.seeds = event.params.seeds
    rawEvent.selector = event.params.selector.toHexString()
    rawEvent.blockNumber = event.block.number
    rawEvent.timestamp = event.block.timestamp
    rawEvent.save()

}

export function handleDewhitelistToken(event: DewhitelistToken): void {
    let silo = loadSilo(event.address)
    let currentList = silo.whitelistedTokens
    let index = currentList.indexOf(event.params.token.toHexString())
    currentList.splice(index, 1)
    silo.whitelistedTokens = currentList
    silo.save()

    let id = 'dewhitelistToken-' + event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
    let rawEvent = new DewhitelistTokenEntity(id)
    rawEvent.hash = event.transaction.hash.toHexString()
    rawEvent.logIndex = event.logIndex.toI32()
    rawEvent.protocol = event.address.toHexString()
    rawEvent.token = event.params.token.toHexString()
    rawEvent.blockNumber = event.block.number
    rawEvent.timestamp = event.block.timestamp
    rawEvent.save()

}
