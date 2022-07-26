import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Field, FieldDailySnapshot, FieldHourlySnapshot } from "../../generated/schema"
import { dayFromTimestamp, hourFromTimestamp } from "./Dates";
import { ZERO_BD, ZERO_BI } from "./Decimals"

export function loadField(diamondAddress: Address): Field {
    let field = Field.load(diamondAddress.toHexString())
    if (field == null) {
        field = new Field(diamondAddress.toHexString())
        field.beanstalk = diamondAddress.toHexString()
        field.season = 0
        field.weather = 0
        field.totalNumberOfSowers = 0
        field.totalNumberOfSows = 0
        field.totalSownBeans = ZERO_BI
        field.plotIndexes = []
        field.totalPods = ZERO_BI
        field.totalHarvestablePods = ZERO_BI
        field.totalHarvestedPods = ZERO_BI
        field.totalSoil = ZERO_BI
        field.podRate = ZERO_BD
        field.save()
    }
    return field
}

export function loadFieldHourly(diamondAddress: Address, timestamp: BigInt): FieldHourlySnapshot {
    let hour = hourFromTimestamp(timestamp)
    let id = diamondAddress.toHexString() + '-' + hour.toString()
    let hourly = FieldHourlySnapshot.load(id)
    if (hourly == null) {
        let field = loadField(diamondAddress)
        hourly = new FieldHourlySnapshot(id)
        hourly.field = field.id
        hourly.season = field.season
        hourly.weather = field.weather
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
        hourly.blockNumber = ZERO_BI
        hourly.timestamp = timestamp
        hourly.save()
    }
    return hourly
}

export function loadFieldDaily(diamondAddress: Address, timestamp: BigInt): FieldDailySnapshot {
    let hour = dayFromTimestamp(timestamp)
    let id = diamondAddress.toHexString() + '-' + hour.toString()
    let daily = FieldDailySnapshot.load(id)
    if (daily == null) {
        let field = loadField(diamondAddress)
        daily = new FieldDailySnapshot(id)
        daily.field = field.id
        daily.season = field.season
        daily.weather = field.weather
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
        daily.save()
    }
    return daily
}
