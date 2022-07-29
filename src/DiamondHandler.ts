import { DiamondCut } from "../generated/Diamond/Beanstalk";
import { Beanstalk } from "../generated/schema";
import { ZERO_BI } from "./utils/Decimals";

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
}
