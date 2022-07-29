import { Harvest, PlotTransfer, Sow, SupplyIncrease, WeatherChange } from '../generated/Field/Beanstalk'
import { Plot } from '../generated/schema'
import { BEAN_DECIMALS } from './utils/Constants'
import { ONE_BI, toDecimal, ZERO_BI } from './utils/Decimals'
import { loadFarmer } from './utils/Farmer'
import { loadField, loadFieldDaily, loadFieldHourly } from './utils/Field'
import { loadPlot } from './utils/Plot'
import { savePodTransfer } from './utils/PodTransfer'
import { loadSeason } from './utils/Season'

export function handleWeatherChange(event: WeatherChange): void {
    let field = loadField(event.address)
    let fieldHourly = loadFieldHourly(event.address, field.season, event.block.timestamp)
    let fieldDaily = loadFieldDaily(event.address, event.block.timestamp)

    field.weather += event.params.change
    fieldHourly.weather += event.params.change
    fieldDaily.weather += event.params.change

    field.save()
    fieldHourly.save()
    fieldDaily.save()
}

export function handleSow(event: Sow): void {
    let field = loadField(event.address)
    let fieldHourly = loadFieldHourly(event.address, field.season, event.block.timestamp)
    let fieldDaily = loadFieldDaily(event.address, event.block.timestamp)
    let farmer = loadFarmer(event.params.account)
    let farmerField = loadField(event.params.account)
    let farmerFieldHourly = loadFieldHourly(event.params.account, field.season, event.block.timestamp)
    let farmerFieldDaily = loadFieldDaily(event.params.account, event.block.timestamp)
    let plot = loadPlot(event.address, event.params.index)

    plot.farmer = event.params.account.toHexString()
    plot.season = field.season
    plot.creationHash = event.transaction.hash.toHexString()
    plot.createdAt = event.block.timestamp
    plot.updatedAt = event.block.timestamp
    plot.index = event.params.index
    plot.beans = event.params.beans
    plot.pods = event.params.pods
    plot.weather = field.weather
    plot.save()

    let newSowers = 0
    if (!farmer.sown) {
        farmer.sown = true
        newSowers = 1
        farmer.save()
    }

    if (farmerField.beanstalk !== event.address.toHexString()) { farmerField.beanstalk = event.address.toHexString() }
    farmerField.totalPods = farmerField.totalPods.plus(event.params.pods)
    farmerField.totalNumberOfSows += 1
    farmerField.totalSownBeans = farmerField.totalSownBeans.plus(event.params.beans)
    farmerField.save()

    farmerFieldHourly.newPods = farmerFieldHourly.newPods.plus(event.params.pods)
    farmerFieldHourly.totalPods = farmerField.totalPods
    farmerFieldHourly.numberOfSows += 1
    farmerFieldHourly.totalNumberOfSows = farmerField.totalNumberOfSows
    farmerFieldHourly.save()

    farmerFieldDaily.newPods = farmerFieldDaily.newPods.plus(event.params.pods)
    farmerFieldDaily.totalPods = farmerField.totalPods
    farmerFieldDaily.numberOfSows += 1
    farmerFieldDaily.totalNumberOfSows = farmerField.totalNumberOfSows
    farmerFieldDaily.save()

    field.plotIndexes.push(event.params.index)
    field.podIndex = field.podIndex.plus(event.params.pods)
    field.totalPods = field.totalPods.plus(event.params.pods)
    field.totalNumberOfSows += 1
    field.totalNumberOfSowers += newSowers
    field.totalSownBeans = field.totalSownBeans.plus(event.params.beans)
    field.save()

    fieldHourly.podIndex = fieldHourly.podIndex.plus(event.params.pods)
    fieldHourly.newPods = fieldHourly.newPods.plus(event.params.pods)
    fieldHourly.totalPods = field.totalPods
    fieldHourly.numberOfSows += 1
    fieldHourly.numberOfSowers += newSowers
    fieldHourly.totalNumberOfSowers = field.totalNumberOfSowers
    fieldHourly.totalNumberOfSows = field.totalNumberOfSows
    fieldHourly.save()

    fieldDaily.podIndex = fieldDaily.podIndex.plus(event.params.pods)
    fieldDaily.newPods = fieldDaily.newPods.plus(event.params.pods)
    fieldDaily.totalPods = field.totalPods
    fieldDaily.numberOfSows += 1
    fieldDaily.numberOfSowers += newSowers
    fieldDaily.totalNumberOfSowers = field.totalNumberOfSowers
    fieldDaily.totalNumberOfSows = field.totalNumberOfSows
    fieldDaily.save()
}

export function handleHarvest(event: Harvest): void {
    let field = loadField(event.address)
    let fieldHourly = loadFieldHourly(event.address, field.season, event.block.timestamp)
    let fieldDaily = loadFieldDaily(event.address, event.block.timestamp)

    // Update field totals
    field.totalHarvestablePods = field.totalHarvestablePods.minus(event.params.beans)
    field.totalHarvestedPods = field.totalHarvestedPods.plus(event.params.beans)
    field.save()
    fieldHourly.newHarvestablePods = fieldHourly.newHarvestablePods.minus(event.params.beans)
    fieldHourly.totalHarvestablePods = field.totalHarvestablePods
    fieldHourly.newHarvestedPods = fieldHourly.newHarvestedPods.plus(event.params.beans)
    fieldHourly.totalHarvestedPods = field.totalHarvestedPods
    fieldHourly.save()
    fieldDaily.newHarvestablePods = fieldDaily.newHarvestablePods.minus(event.params.beans)
    fieldDaily.totalHarvestablePods = field.totalHarvestablePods
    fieldDaily.newHarvestedPods = fieldDaily.newHarvestedPods.plus(event.params.beans)
    fieldDaily.totalHarvestedPods = field.totalHarvestedPods
    fieldDaily.save()

    // Update plots as harvested
    for (let i = 0; i < event.params.plots.length; i++) {
        let plot = Plot.load(event.params.plots[i].toString())

        if (plot !== null) {
            plot.harvestedPods = plot.harvestablePods
            if (plot.harvestedPods = plot.pods) { plot.fullyHarvested = true }
            plot.save()
        }
    }
}

export function handlePlotTransfer(event: PlotTransfer): void {
    let field = loadField(event.address)

    let fromFarmer = loadFarmer(event.params.from)
    let fromFarmerField = loadField(event.params.from)
    let fromFarmerFieldHourly = loadFieldHourly(event.params.from, field.season, event.block.timestamp)
    let fromFarmerFieldDaily = loadFieldDaily(event.params.from, event.block.timestamp)

    let toFarmer = loadFarmer(event.params.to)
    let toFarmerField = loadField(event.params.to)
    let toFarmerFieldHourly = loadFieldHourly(event.params.to, field.season, event.block.timestamp)
    let toFarmerFieldDaily = loadFieldDaily(event.params.to, event.block.timestamp)

    // Update overall pod totals
    fromFarmerField.totalPods = fromFarmerField.totalPods.minus(event.params.pods)
    fromFarmerFieldHourly.totalPods = fromFarmerFieldHourly.totalPods.minus(event.params.pods)
    fromFarmerFieldDaily.totalPods = fromFarmerFieldDaily.totalPods.minus(event.params.pods)

    toFarmerField.totalPods = toFarmerField.totalPods.plus(event.params.pods)
    toFarmerFieldHourly.totalPods = toFarmerFieldHourly.totalPods.plus(event.params.pods)
    toFarmerFieldDaily.totalPods = toFarmerFieldDaily.totalPods.plus(event.params.pods)

    // Update plot entities
    let priorPlot = ZERO_BI
    let sourceIndex = ZERO_BI
    let transferIndex = event.params.id
    let newPlotIndexes = field.plotIndexes

    // Find source plot ID in the current plot list
    for (let i = 0; i < field.plotIndexes.length; i++) {
        if (priorPlot <= event.params.id && event.params.id < field.plotIndexes[i]) {
            sourceIndex = priorPlot == ZERO_BI ? field.plotIndexes[i] : priorPlot
            break
        } else { priorPlot = field.plotIndexes[i] }
    }

    let sourcePlot = loadPlot(event.address, sourceIndex)
    let sourceEndIndex = sourceIndex.plus(sourcePlot.pods)
    let transferEndIndex = transferIndex.plus(event.params.pods)

    if (sourceIndex == transferIndex && sourceEndIndex == transferEndIndex) {
        // Sending full plot
        sourcePlot.farmer = event.params.to.toHexString()
        sourcePlot.updatedAt = event.block.timestamp
        sourcePlot.save()
    } else if (sourceIndex == transferIndex) {
        let remainderIndex = transferIndex.plus(event.params.pods)
        let remainderPlot = loadPlot(event.address, remainderIndex)

        sourcePlot.farmer = event.params.to.toHexString()
        sourcePlot.updatedAt = event.block.timestamp
        sourcePlot.pods = event.params.pods
        sourcePlot.save()

        remainderPlot.farmer = event.params.from.toHexString()
        remainderPlot.season = field.season
        remainderPlot.creationHash = event.transaction.hash.toHexString()
        remainderPlot.createdAt = event.block.timestamp
        remainderPlot.updatedAt = event.block.timestamp
        remainderPlot.index = remainderIndex
        remainderPlot.pods = sourceEndIndex.minus(transferEndIndex)
        remainderPlot.weather = sourcePlot.weather
        remainderPlot.save()

    } else if (sourceEndIndex == transferEndIndex) {
        // We are only needing to split this plot once to send
        let toPlot = loadPlot(event.address, transferIndex)
        newPlotIndexes.push(transferIndex)

        sourcePlot.updatedAt = event.block.timestamp
        sourcePlot.pods = sourcePlot.pods.minus(event.params.pods)
        sourcePlot.save()

        toPlot.farmer = event.params.to.toHexString()
        toPlot.season = field.season
        toPlot.creationHash = event.transaction.hash.toHexString()
        toPlot.createdAt = event.block.timestamp
        toPlot.updatedAt = event.block.timestamp
        toPlot.index = transferIndex
        toPlot.pods = event.params.pods
        toPlot.weather = sourcePlot.weather
        toPlot.save()
    } else {
        // We have to split this plot twice to send
        let remainderIndex = transferIndex.plus(event.params.pods)
        let toPlot = loadPlot(event.address, transferIndex)
        let remainderPlot = loadPlot(event.address, remainderIndex)

        newPlotIndexes.push(transferIndex)
        newPlotIndexes.push(remainderIndex)

        sourcePlot.updatedAt = event.block.timestamp
        sourcePlot.pods = transferIndex.minus(sourcePlot.index)
        sourcePlot.save()

        toPlot.farmer = event.params.to.toHexString()
        toPlot.season = field.season
        toPlot.creationHash = event.transaction.hash.toHexString()
        toPlot.createdAt = event.block.timestamp
        toPlot.updatedAt = event.block.timestamp
        toPlot.index = transferIndex
        toPlot.pods = event.params.pods
        toPlot.weather = sourcePlot.weather
        toPlot.save()

        remainderPlot.farmer = event.params.from.toHexString()
        remainderPlot.season = field.season
        remainderPlot.creationHash = event.transaction.hash.toHexString()
        remainderPlot.createdAt = event.block.timestamp
        remainderPlot.updatedAt = event.block.timestamp
        remainderPlot.index = remainderIndex
        remainderPlot.pods = sourceEndIndex.minus(transferEndIndex)
        remainderPlot.weather = sourcePlot.weather
        remainderPlot.save()
    }
    newPlotIndexes.sort()
    field.plotIndexes = newPlotIndexes
    field.save()

    // Save the raw event data
    savePodTransfer(event)
}

export function handleSupplyIncrease(event: SupplyIncrease): void {
    let field = loadField(event.address)
    let fieldHourly = loadFieldHourly(event.address, field.season, event.block.timestamp)
    let fieldDaily = loadFieldDaily(event.address, event.block.timestamp)
    //let silo = loadSilo(event.params.season)


    field.totalHarvestablePods = field.totalHarvestablePods.plus(event.params.newHarvestable)
    field.totalPods = field.totalPods.minus(event.params.newHarvestable)
    field.totalSoil = field.totalSoil.plus(event.params.newSoil)
    field.save()

    fieldHourly.newHarvestablePods = fieldHourly.newHarvestablePods.plus(event.params.newHarvestable)
    fieldHourly.totalHarvestablePods = field.totalHarvestablePods
    fieldHourly.newPods = fieldHourly.newPods.minus(event.params.newHarvestable)
    fieldHourly.totalPods = field.totalPods
    fieldHourly.newSoil = fieldHourly.newSoil.plus(event.params.newSoil)
    fieldHourly.totalSoil = field.totalSoil
    fieldHourly.save()

    fieldDaily.newHarvestablePods = fieldDaily.newHarvestablePods.plus(event.params.newHarvestable)
    fieldDaily.totalHarvestablePods = field.totalHarvestablePods
    fieldDaily.newPods = fieldDaily.newPods.minus(event.params.newHarvestable)
    fieldDaily.totalPods = field.totalPods
    fieldDaily.newSoil = fieldDaily.newSoil.plus(event.params.newSoil)
    fieldDaily.totalSoil = field.totalSoil
    fieldDaily.save()

    //silo.newBeans = toDecimal(event.params.newSilo, BEAN_DECIMALS)
    //silo.save()

    let season = loadSeason(event.address, event.params.season)
    season.deltaBeans = event.params.newHarvestable.plus(event.params.newSilo)
    season.beans = season.beans.plus(season.deltaBeans)
    season.save()

}