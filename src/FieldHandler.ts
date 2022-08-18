import { Address, BigDecimal, BigInt, log } from '@graphprotocol/graph-ts'
import { FundFundraiser, Harvest, PlotTransfer, Sow, SupplyDecrease, SupplyIncrease, SupplyNeutral, WeatherChange } from '../generated/Field/Beanstalk'
import { MetapoolOracle, Reward, Soil } from '../generated/Field-Replanted/Beanstalk'
import { CurvePrice } from '../generated/Field-Replanted/CurvePrice'
import { Harvest as HarvestEntity, Reward as RewardEntity, MetapoolOracle as MetapoolOracleEntity } from '../generated/schema'
import { BEANSTALK, BEANSTALK_FARMS, CURVE_PRICE } from './utils/Constants'
import { ONE_BD, toDecimal, ZERO_BD, ZERO_BI } from './utils/Decimals'
import { loadFarmer } from './utils/Farmer'
import { loadField, loadFieldDaily, loadFieldHourly } from './utils/Field'
import { loadPlot } from './utils/Plot'
import { savePodTransfer } from './utils/PodTransfer'
import { loadSeason } from './utils/Season'
import { loadBeanstalk } from './utils/Beanstalk'

export function handleWeatherChange(event: WeatherChange): void {
    let field = loadField(event.address)
    let fieldHourly = loadFieldHourly(event.address, event.params.season.toI32(), event.block.timestamp)
    let fieldDaily = loadFieldDaily(event.address, event.block.timestamp)

    field.weather += event.params.change
    fieldHourly.weather += event.params.change
    fieldDaily.weather += event.params.change

    // Real Rate of Return

    let season = loadSeason(event.address, event.params.season)
    let curvePrice = CurvePrice.bind(CURVE_PRICE)
    let currentPrice = season.price == ZERO_BD ? toDecimal(curvePrice.getCurve().price, 6) : season.price

    field.realRateOfReturn = (ONE_BD.plus(BigDecimal.fromString((field.weather / 100).toString()))).div(currentPrice)
    fieldHourly.realRateOfReturn = field.realRateOfReturn
    fieldHourly.realRateOfReturn = field.realRateOfReturn

    field.save()
    fieldHourly.save()
    fieldDaily.save()
}

export function handleSow(event: Sow): void {
    let beanstalk = loadBeanstalk(event.address)

    let sownBeans = event.params.beans

    if (event.params.account == BEANSTALK_FARMS) {
        let startingField = loadField(event.address)
        sownBeans = startingField.totalSoil
    }

    // Update Beanstalk Totals
    updateFieldTotals(event.address, beanstalk.lastSeason, ZERO_BI, sownBeans, event.params.pods, ZERO_BI, ZERO_BI, ZERO_BI, event.block.timestamp, event.block.number)

    // Update Farmer Totals
    updateFieldTotals(event.params.account, beanstalk.lastSeason, ZERO_BI, sownBeans, event.params.pods, ZERO_BI, ZERO_BI, ZERO_BI, event.block.timestamp, event.block.number)

    
    let field = loadField(event.address)
    let fieldHourly = loadFieldHourly(event.address, field.season, event.block.timestamp)
    let fieldDaily = loadFieldDaily(event.address, event.block.timestamp)
    let farmer = loadFarmer(event.params.account)
    let plot = loadPlot(event.address, event.params.index)

    let newIndexes = field.plotIndexes
    newIndexes.push(plot.index)
    field.plotIndexes = newIndexes

    plot.farmer = event.params.account.toHexString()
    plot.source = 'sow'
    plot.season = field.season
    plot.creationHash = event.transaction.hash.toHexString()
    plot.createdAt = event.block.timestamp
    plot.updatedAt = event.block.timestamp
    plot.beans = event.params.beans
    plot.pods = event.params.pods
    plot.sownPods = event.params.pods
    plot.weather = field.weather
    plot.save()

    let newSowers = 0
    if (!farmer.sown) {
        farmer.sown = true
        newSowers = 1
        farmer.save()
    }

    field.save()
    fieldHourly.save()
    fieldDaily.save()

    // Update sower counts
    field.totalNumberOfSows += 1
    field.totalNumberOfSowers += newSowers
    field.save()
    
    fieldHourly.totalNumberOfSowers = field.totalNumberOfSowers
    fieldHourly.totalNumberOfSows = field.totalNumberOfSows
    fieldHourly.numberOfSows += 1
    fieldHourly.numberOfSowers += newSowers
    fieldHourly.save()

    fieldDaily.totalNumberOfSowers = field.totalNumberOfSowers
    fieldDaily.totalNumberOfSows = field.totalNumberOfSows
    fieldDaily.numberOfSows += 1
    fieldDaily.numberOfSowers += newSowers
    fieldDaily.save()
}

export function handleHarvest(event: Harvest): void {

    let beanstalk = loadBeanstalk(event.address)
    let season = loadSeason(event.address, BigInt.fromI32(beanstalk.lastSeason))
    
    // Harvest function is only called with a list of plots

    // Update plots and field totals

    let remainingIndex = ZERO_BI

    for (let i = 0; i < event.params.plots.length; i++) {

        // Plot should exist
        let plot = loadPlot(event.address, event.params.plots[i])

        let harvestablePods = season.harvestableIndex.minus(plot.index)

        if (harvestablePods >= plot.pods) {
            // Plot fully harvests
            updateFieldTotals(event.address, beanstalk.lastSeason,ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, plot.pods, event.block.timestamp, event.block.number)
            updateFieldTotals(event.params.account, beanstalk.lastSeason,ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, plot.pods, event.block.timestamp, event.block.number)

            plot.harvestedPods = plot.pods
            plot.fullyHarvested = true
            plot.save()
        } else {
            // Plot partially harvests

            updateFieldTotals(event.address, beanstalk.lastSeason,ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, harvestablePods, event.block.timestamp, event.block.number)
            updateFieldTotals(event.params.account, beanstalk.lastSeason,ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, harvestablePods, event.block.timestamp, event.block.number)

            remainingIndex = plot.index.plus(harvestablePods)
            let remainingPods = plot.pods.minus(harvestablePods)

            let remainingPlot = loadPlot(event.address, remainingIndex)
            remainingPlot.farmer = plot.farmer
            remainingPlot.source = 'harvest'
            remainingPlot.season = beanstalk.lastSeason
            remainingPlot.creationHash = event.transaction.hash.toHexString()
            remainingPlot.createdAt = event.block.timestamp
            remainingPlot.updatedAt = event.block.timestamp
            remainingPlot.index = remainingIndex
            remainingPlot.beans = ZERO_BI
            remainingPlot.pods = remainingPods
            remainingPlot.weather = plot.weather
            remainingPlot.save()

            plot.harvestedPods = harvestablePods
            plot.pods = harvestablePods
            plot.fullyHarvested = true
            plot.save()
        }
    }
    
    // Remove the harvested plot IDs from the field list
    let field = loadField(event.address)
    let newIndexes = field.plotIndexes
    for (let i = 0; i < event.params.plots.length; i++) {
        let plotIndex = newIndexes.indexOf(event.params.plots[i])
        newIndexes.splice(plotIndex,1)
        newIndexes.sort()
    }
    if (remainingIndex !== ZERO_BI) {newIndexes.push(remainingIndex)}
    field.plotIndexes = newIndexes
    field.save()
    
    // Save the low level details for the event.
    let harvest = new HarvestEntity('harvest-' + event.transaction.hash.toHexString() + '-' + event.transactionLogIndex.toString())
    harvest.hash = event.transaction.hash.toHexString()
    harvest.logIndex = event.transactionLogIndex.toI32()
    harvest.protocol = event.address.toHexString()
    harvest.farmer = event.params.account.toHexString()
    harvest.plots = event.params.plots
    harvest.beans = event.params.beans
    harvest.blockNumber = event.block.number
    harvest.timestamp = event.block.timestamp
    harvest.save()
}

export function handlePlotTransfer(event: PlotTransfer): void {
    let beanstalk = loadBeanstalk(BEANSTALK)
    let season = loadSeason(event.address, BigInt.fromI32(beanstalk.lastSeason))

    // Ensure both farmer entites exist
    let fromFarmer = loadFarmer(event.params.from)
    let toFarmer = loadFarmer(event.params.to)

    // Update farmer field data
    updateFieldTotals(event.params.from, beanstalk.lastSeason, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI.minus(event.params.pods), ZERO_BI, ZERO_BI, event.block.timestamp, event.block.number)
    updateFieldTotals(event.params.to, beanstalk.lastSeason, ZERO_BI, ZERO_BI, ZERO_BI, event.params.pods, ZERO_BI, ZERO_BI, event.block.timestamp, event.block.number)

    let field = loadField(BEANSTALK)
    let sortedPlots = field.plotIndexes.sort()

    let sourceIndex = ZERO_BI

    for (let i = 0; i < sortedPlots.length; i++) {
        // Handle only single comparison for first value of array
        if (i == 0) {
            if (sortedPlots[i] == event.params.id) {
                sourceIndex = sortedPlots[i]
                break
            } else {continue}
        }
        // Transferred plot matches existing. Start value of zero.
        if (sortedPlots[i] == event.params.id) {
            sourceIndex = sortedPlots[i]
            break
        }
        // Transferred plot is in the middle of existing plot. Non-zero start value.
        if (sortedPlots[i-1] < event.params.id && event.params.id < sortedPlots[i]) {
            sourceIndex = sortedPlots[i-1]
        }
    }

    let sourcePlot = loadPlot(event.address, sourceIndex)
    let sourceEndIndex = sourceIndex.plus(sourcePlot.pods)
    let transferEndIndex = event.params.id.plus(event.params.pods)

    log.debug("\nPodTransfer: ===================\n", [])
    log.debug("\nPodTransfer: Transfer Season - {}\n", [field.season.toString()])
    log.debug("\nPodTransfer: Transfer Index - {}\n", [event.params.id.toString()])
    log.debug("\nPodTransfer: Transfer Pods - {}\n", [event.params.pods.toString()])
    log.debug("\nPodTransfer: Transfer Ending Index - {}\n", [event.params.id.plus(event.params.pods).toString()])
    log.debug("\nPodTransfer: Source Index - {}\n", [sourceIndex.toString()])
    log.debug("\nPodTransfer: Source Ending Index - {}\n", [sourceIndex.plus(sourcePlot.pods).toString()])
    log.debug("\nPodTransfer: Starting Source Pods - {}\n", [sourcePlot.pods.toString()])

    // Actually transfer the plots
    if (sourcePlot.pods == event.params.pods) {
        // Sending full plot
        sourcePlot.farmer = event.params.to.toHexString()
        sourcePlot.updatedAt = event.block.timestamp
        sourcePlot.save()
        log.debug("\nPodTransfer: Sending full plot\n", [])
    } else if (sourceIndex == event.params.id) {
        // We are only needing to split this plot once to send
        // Start value of zero
        let remainderIndex = sourceIndex.plus(event.params.pods)
        let remainderPlot = loadPlot(event.address, remainderIndex)
        sortedPlots.push(remainderIndex)

        sourcePlot.farmer = event.params.to.toHexString()
        sourcePlot.updatedAt = event.block.timestamp
        sourcePlot.pods = event.params.pods
        sourcePlot.save()

        remainderPlot.farmer = event.params.from.toHexString()
        remainderPlot.source = 'transfer'
        remainderPlot.season = field.season
        remainderPlot.creationHash = event.transaction.hash.toHexString()
        remainderPlot.createdAt = event.block.timestamp
        remainderPlot.updatedAt = event.block.timestamp
        remainderPlot.index = remainderIndex
        remainderPlot.pods = sourceEndIndex.minus(transferEndIndex)
        remainderPlot.weather = sourcePlot.weather
        remainderPlot.save()
        
        log.debug("\nPodTransfer: sourceIndex == transferIndex\n", [])
        log.debug("\nPodTransfer: Remainder Index - {}\n", [remainderIndex.toString()])
        log.debug("\nPodTransfer: Source Pods - {}\n", [sourcePlot.pods.toString()])
        log.debug("\nPodTransfer: Remainder Pods - {}\n", [remainderPlot.pods.toString()])
    } else if (sourceEndIndex == transferEndIndex) {
        // We are only needing to split this plot once to send
        // Non-zero start value. Sending to end of plot
        let toPlot = loadPlot(event.address, event.params.id)
        sortedPlots.push(event.params.id)

        sourcePlot.updatedAt = event.block.timestamp
        sourcePlot.pods = sourcePlot.pods.minus(event.params.pods)
        sourcePlot.save()

        toPlot.farmer = event.params.to.toHexString()
        toPlot.source = 'transfer'
        toPlot.season = field.season
        toPlot.creationHash = event.transaction.hash.toHexString()
        toPlot.createdAt = event.block.timestamp
        toPlot.updatedAt = event.block.timestamp
        toPlot.index = event.params.id
        toPlot.pods = event.params.pods
        toPlot.weather = sourcePlot.weather
        toPlot.save()

        log.debug("\nPodTransfer: sourceEndIndex == transferEndIndex\n", [])
        log.debug("\nPodTransfer: Updated Source Pods - {}\n", [sourcePlot.pods.toString()])

    } else {
        // We have to split this plot twice to send
        let remainderIndex = event.params.id.plus(event.params.pods)
        let toPlot = loadPlot(event.address, event.params.id)
        let remainderPlot = loadPlot(event.address, remainderIndex)

        sortedPlots.push(event.params.id)
        sortedPlots.push(remainderIndex)

        sourcePlot.updatedAt = event.block.timestamp
        sourcePlot.pods = event.params.id.minus(sourcePlot.index)
        sourcePlot.save()

        toPlot.farmer = event.params.to.toHexString()
        toPlot.source = 'transfer'
        toPlot.season = field.season
        toPlot.creationHash = event.transaction.hash.toHexString()
        toPlot.createdAt = event.block.timestamp
        toPlot.updatedAt = event.block.timestamp
        toPlot.index = event.params.id
        toPlot.pods = event.params.pods
        toPlot.weather = sourcePlot.weather
        toPlot.save()

        remainderPlot.farmer = event.params.from.toHexString()
        remainderPlot.source = 'transfer'
        remainderPlot.season = field.season
        remainderPlot.creationHash = event.transaction.hash.toHexString()
        remainderPlot.createdAt = event.block.timestamp
        remainderPlot.updatedAt = event.block.timestamp
        remainderPlot.index = remainderIndex
        remainderPlot.pods = sourceEndIndex.minus(transferEndIndex)
        remainderPlot.weather = sourcePlot.weather
        remainderPlot.save()
        
        log.debug("\nPodTransfer: split source twice\n", [])
        log.debug("\nPodTransfer: Updated Source Pods - {}\n", [sourcePlot.pods.toString()])
        log.debug("\nPodTransfer: Transferred Pods - {}\n", [toPlot.pods.toString()])
        log.debug("\nPodTransfer: Remainder Pods - {}\n", [remainderPlot.pods.toString()])
        
    }
    sortedPlots.sort()
    field.plotIndexes = sortedPlots
    field.save()

    // Update any harvestable pod amounts
    updateHarvestablePlots(season.harvestableIndex, event.block.timestamp, event.block.number)
    
    // Save the raw event data
    savePodTransfer(event)
}

export function handleSupplyIncrease(event: SupplyIncrease): void {
    
    updateFieldTotals(event.address, event.params.season.toI32(), event.params.newSoil, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, event.block.timestamp, event.block.number)

}

export function handleSupplyDecrease(event: SupplyDecrease): void {
    
    updateFieldTotals(event.address, event.params.season.toI32(), event.params.newSoil, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, event.block.timestamp, event.block.number)

}

export function handleSupplyNeutral(event: SupplyNeutral): void {
    
    updateFieldTotals(event.address, event.params.season.toI32(), event.params.newSoil, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, event.block.timestamp, event.block.number)
    
}

export function handleReward(event: Reward): void {
    let id = 'reward-' + event.transaction.hash.toHexString() + '-' + event.transactionLogIndex.toString()
    let reward = new RewardEntity(id)
    reward.hash = event.transaction.hash.toHexString()
    reward.logIndex = event.transactionLogIndex.toI32()
    reward.protocol = event.address.toHexString()
    reward.season = event.params.season.toI32()
    reward.toField = event.params.toField
    reward.toSilo = event.params.toSilo
    reward.toFertilizer = event.params.toFertilizer
    reward.blockNumber = event.block.number
    reward.timestamp = event.block.timestamp
    reward.save()

    let season = loadSeason(event.address, event.params.season)
    season.rewardBeans = reward.toField.plus(reward.toSilo).plus(reward.toFertilizer)
    season.save()

}

export function handleMetapoolOracle(event: MetapoolOracle): void {
    let id = 'metapoolOracle-' + event.transaction.hash.toHexString() + '-' + event.transactionLogIndex.toString()
    let oracle = new MetapoolOracleEntity(id)
    oracle.hash = event.transaction.hash.toHexString()
    oracle.logIndex = event.transactionLogIndex.toI32()
    oracle.protocol = event.address.toHexString()
    oracle.season = event.params.season.toI32()
    oracle.deltaB = event.params.deltaB
    oracle.balanceA = event.params.balances[0]
    oracle.balanceB = event.params.balances[1]
    oracle.blockNumber = event.block.number
    oracle.timestamp = event.block.timestamp
    oracle.save()

    let curvePrice = CurvePrice.bind(CURVE_PRICE)
    let season = loadSeason(event.address, event.params.season)
    season.price = toDecimal(curvePrice.getCurve().price, 6)
    season.deltaB = event.params.deltaB
    season.save()
}

export function handleSoil(event: Soil): void {
    // Replant sets the soil to the amount every season instead of adding new soil
    // to an existing amount.

    let field = loadField(event.address)
    let fieldHourly = loadFieldHourly(event.address, event.params.season.toI32(), event.block.timestamp)
    let fieldDaily = loadFieldDaily(event.address, event.block.timestamp)

    field.season = event.params.season.toI32()
    field.totalSoil = event.params.soil
    field.save()

    fieldHourly.totalSoil = field.totalSoil
    fieldHourly.newSoil = fieldHourly.newSoil.plus(event.params.soil)
    fieldHourly.blockNumber = event.block.number
    fieldHourly.timestamp = event.block.timestamp
    fieldHourly.save()

    fieldDaily.totalSoil = field.totalSoil
    fieldDaily.newSoil = fieldDaily.newSoil.plus(event.params.soil)
    fieldDaily.blockNumber = event.block.number
    fieldDaily.timestamp = event.block.timestamp
    fieldDaily.save()
}

export function handleFundFundraiser(event: FundFundraiser): void {
    // Account for the fact thta fundraiser sow using no soil.
    let beanstalk = loadBeanstalk(event.address)
    updateFieldTotals(event.address, beanstalk.lastSeason, ZERO_BI, ZERO_BI.minus(event.params.amount) , ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, event.block.timestamp, event.block.number)

}

function updateFieldTotals(
    account: Address, 
    season: i32, 
    soil: BigInt, 
    sownBeans: BigInt,
    sownPods: BigInt,
    transferredPods: BigInt,
    harvestablePods: BigInt,
    harvestedPods: BigInt,
    timestamp: BigInt,
    blockNumber: BigInt
       ):void {
    let field = loadField(account)
    let fieldHourly = loadFieldHourly(account, season, timestamp)
    let fieldDaily = loadFieldDaily(account, timestamp)

    field.season = season
    field.totalSoil = field.totalSoil.plus(soil).minus(sownBeans)
    field.totalSownBeans = field.totalSownBeans.plus(sownBeans)
    field.totalPods = field.totalPods.plus(sownPods).minus(harvestablePods).plus(transferredPods)
    field.totalHarvestablePods = field.totalHarvestablePods.plus(harvestablePods)
    field.totalHarvestedPods = field.totalHarvestedPods.plus(harvestedPods)
    field.podIndex = field.podIndex.plus(sownPods)
    field.save()

    fieldHourly.totalSoil = field.totalSoil
    fieldHourly.totalSownBeans = field.totalSownBeans
    fieldHourly.totalPods = field.totalPods
    fieldHourly.totalHarvestablePods = field.totalHarvestablePods
    fieldHourly.totalHarvestedPods = field.totalHarvestedPods
    fieldHourly.podIndex = field.podIndex
    fieldHourly.newSoil = fieldHourly.newSoil.plus(soil)
    fieldHourly.sownBeans = fieldHourly.sownBeans.plus(sownBeans)
    fieldHourly.newPods = fieldHourly.newPods.plus(sownPods).minus(harvestablePods).plus(transferredPods)
    fieldHourly.newHarvestablePods = fieldHourly.newHarvestablePods.plus(harvestablePods)
    fieldHourly.newHarvestedPods = fieldHourly.newHarvestedPods.plus(harvestedPods)
    fieldHourly.blockNumber = blockNumber
    fieldHourly.timestamp = timestamp
    fieldHourly.save()

    fieldDaily.totalSoil = field.totalSoil
    fieldDaily.totalSownBeans = field.totalSownBeans
    fieldDaily.totalPods = field.totalPods
    fieldDaily.totalHarvestablePods = field.totalHarvestablePods
    fieldDaily.totalHarvestedPods = field.totalHarvestedPods
    fieldDaily.podIndex = field.podIndex
    fieldDaily.newSoil = fieldDaily.newSoil.plus(soil)
    fieldDaily.sownBeans = fieldDaily.sownBeans.plus(sownBeans)
    fieldDaily.newPods = fieldDaily.newPods.plus(sownPods).minus(harvestablePods).plus(transferredPods)
    fieldDaily.newHarvestablePods = fieldDaily.newHarvestablePods.plus(harvestablePods)
    fieldDaily.newHarvestedPods = fieldDaily.newHarvestedPods.plus(harvestedPods)
    fieldDaily.blockNumber = blockNumber
    fieldDaily.timestamp = timestamp
    fieldDaily.save()
}

export function updateHarvestablePlots(harvestableIndex: BigInt, timestamp: BigInt, blockNumber: BigInt): void {
    let field = loadField(BEANSTALK)
    let sortedIndexes = field.plotIndexes.sort()

    for (let i = 0; i < sortedIndexes.length; i++) {
        if (sortedIndexes[i] > harvestableIndex) {break}
        let plot = loadPlot(BEANSTALK, sortedIndexes[i])

        // Plot is fully harvestable, but hasn't been harvested yet
        if ( plot.harvestablePods == plot.pods ) { continue }

        let harvestablePods = harvestableIndex.minus(plot.index)
        let oldHarvestablePods = plot.harvestablePods
        plot.harvestablePods = harvestablePods >= plot.pods ? plot.pods : harvestablePods
        plot.save()

        let newHarvestablePods = oldHarvestablePods == ZERO_BI ? plot.harvestablePods : plot.harvestablePods.minus(oldHarvestablePods)

        updateFieldTotals(BEANSTALK, field.season, ZERO_BI, ZERO_BI, ZERO_BI ,ZERO_BI, newHarvestablePods, ZERO_BI, timestamp, blockNumber)
        updateFieldTotals(Address.fromString(plot.farmer), field.season, ZERO_BI, ZERO_BI, ZERO_BI ,ZERO_BI, newHarvestablePods, ZERO_BI, timestamp, blockNumber)
    }
}
