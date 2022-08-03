import { BigDecimal } from "@graphprotocol/graph-ts";
import { DiamondCut } from "../generated/Diamond/Beanstalk";
import { Beanstalk, Fertilizer } from "../generated/schema";
import { ZERO_BI } from "./utils/Decimals";
import { FERTILIZER, INITIAL_HUMIDITY } from "./utils/Constants";

export function handleDiamondCut(event: DiamondCut): void {
    let beanstalk = Beanstalk.load(event.address.toHexString())
    if (beanstalk == null) {
        beanstalk = new Beanstalk(event.address.toHexString())
        beanstalk.name = 'Beanstalk'
        beanstalk.slug = 'beanstalk'
        beanstalk.schemaVersion = '2.0.0'
        beanstalk.subgraphVersion = '2.0.0'
        beanstalk.methodologyVersion = '2.0.0'
        beanstalk.network = 'MAINNET'
        beanstalk.lastUpgrade = ZERO_BI
        beanstalk.save()
    }

    beanstalk.lastUpgrade = event.block.timestamp
    beanstalk.save()

    let fertilizer = Fertilizer.load(FERTILIZER.toHexString())
    // Check if the diamond cut reduces Humidity to 250%
    if (fertilizer != null && fertilizer.humidity.equals(INITIAL_HUMIDITY)) {
        fertilizer.humidity = BigDecimal.fromString('250')
        fertilizer.save()
    }
}
