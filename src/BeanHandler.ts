import { BigInt, log } from "@graphprotocol/graph-ts";
import { Transfer } from "../generated/Bean/ERC20";
import { ADDRESS_ZERO, BEANSTALK } from "./utils/Constants";
import { loadField } from "./utils/Field";
import { loadSeason } from "./utils/Season";

export function handleTransfer(event: Transfer): void {

    //if (event.params.to !== ADDRESS_ZERO && event.params.from !== ADDRESS_ZERO) { return }

    let field = loadField(BEANSTALK)
    let season = loadSeason(BEANSTALK, BigInt.fromI32(field.season))

    if (event.params.from == ADDRESS_ZERO) {
        season.deltaBeans = season.deltaBeans.plus(event.params.value)
        season.beans = season.beans.plus(event.params.value)
        log.debug('\nBeanSupply: Beans Minted - {}\n', [event.params.value.toString()])
    } else if (event.params.to == ADDRESS_ZERO) {
        season.deltaBeans = season.deltaBeans.minus(event.params.value)
        season.beans = season.beans.minus(event.params.value)
        log.debug('\nBeanSupply: Beans Burned - {}\n', [event.params.value.toString()])
    }

    season.save()
}
