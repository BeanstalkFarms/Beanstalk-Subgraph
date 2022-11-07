import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Field, FieldDailySnapshot, FieldHourlySnapshot } from "../../generated/schema"
import { BEANSTALK } from "./Constants";
import { dayFromTimestamp, hourFromTimestamp } from "./Dates";
import { ZERO_BD, ZERO_BI } from "./Decimals"

export function loadField(account: Address): Field {
    let field = Field.load(account.toHexString())
    if (field == null) {
        field = new Field(account.toHexString())
        field.beanstalk = BEANSTALK.toHexString()
        if (account !== BEANSTALK) { field.farmer = account.toHexString() }
        field.season = 1
        field.temperature = 1
        field.realRateOfReturn = ZERO_BD
        field.totalNumberOfSowers = 0
        field.totalNumberOfSows = 0
        field.totalSownBeans = ZERO_BI
        field.plotIndexes = []
        field.totalPods = ZERO_BI
        field.totalHarvestablePods = ZERO_BI
        field.totalHarvestedPods = ZERO_BI
        field.totalSoil = ZERO_BI
        field.podIndex = ZERO_BI
        field.podRate = ZERO_BD
        field.save()
    }
    return field
}

export function loadFieldHourly(account: Address, season: i32, timestamp: BigInt): FieldHourlySnapshot {
    // Hourly for Beanstalk is assumed to be by season. To keep other data correctly divided
    // by season, we elect to use the season number for the hour number.
    let id = account.toHexString() + '-' + season.toString()
    let hourly = FieldHourlySnapshot.load(id)
    if (hourly == null) {
        let field = loadField(account)
        hourly = new FieldHourlySnapshot(id)
        hourly.field = field.id
        hourly.season = season
        hourly.temperature = field.temperature
        hourly.realRateOfReturn = ZERO_BD
        hourly.podIndex = field.podIndex
        hourly.numberOfSowers = 0
        hourly.totalNumberOfSowers = field.totalNumberOfSowers
        hourly.numberOfSows = 0
        hourly.totalNumberOfSows = field.totalNumberOfSows
        hourly.sownBeans = ZERO_BI
        hourly.totalSownBeans = field.totalSownBeans
        hourly.newPods = ZERO_BI
        hourly.totalPods = field.totalPods
        hourly.newHarvestablePods = ZERO_BI
        hourly.totalHarvestablePods = field.totalHarvestablePods
        hourly.newHarvestedPods = ZERO_BI
        hourly.totalHarvestedPods = field.totalHarvestedPods
        hourly.newSoil = ZERO_BI
        hourly.totalSoil = ZERO_BI
        hourly.podRate = field.podRate
        hourly.blocksToSoldOutSoil = ZERO_BI
        hourly.soilSoldOut = false
        hourly.blockNumber = ZERO_BI
        hourly.timestamp = timestamp
        hourly.lastUpdated = timestamp
        hourly.save()
    }
    return hourly
}

export function loadFieldDaily(account: Address, timestamp: BigInt): FieldDailySnapshot {
    let hour = dayFromTimestamp(timestamp)
    let id = account.toHexString() + '-' + hour.toString()
    let daily = FieldDailySnapshot.load(id)
    if (daily == null) {
        let field = loadField(account)
        daily = new FieldDailySnapshot(id)
        daily.field = field.id
        daily.season = field.season
        daily.temperature = field.temperature
        daily.realRateOfReturn = ZERO_BD
        daily.podIndex = field.podIndex
        daily.numberOfSowers = 0
        daily.totalNumberOfSowers = field.totalNumberOfSowers
        daily.numberOfSows = 0
        daily.totalNumberOfSows = field.totalNumberOfSows
        daily.sownBeans = ZERO_BI
        daily.totalSownBeans = field.totalSownBeans
        daily.newPods = ZERO_BI
        daily.totalPods = field.totalPods
        daily.newHarvestablePods = ZERO_BI
        daily.totalHarvestablePods = field.totalHarvestablePods
        daily.newHarvestedPods = ZERO_BI
        daily.totalHarvestedPods = field.totalHarvestedPods
        daily.newSoil = ZERO_BI
        daily.totalSoil = ZERO_BI
        daily.podRate = field.podRate
        daily.blockNumber = ZERO_BI
        daily.timestamp = timestamp
        daily.lastUpdated = timestamp
        daily.save()
    }
    return daily
}
