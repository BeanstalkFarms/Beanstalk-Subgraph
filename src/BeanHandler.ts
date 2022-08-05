import { BigInt, log } from "@graphprotocol/graph-ts";
import { Transfer as LegacyTransfer } from "../generated/Bean/ERC20";
import { Transfer } from "../generated/Bean-Replanted/ERC20";
import { ADDRESS_ZERO, BEANSTALK } from "./utils/Constants";
import { loadField } from "./utils/Field";
import { loadSeason } from "./utils/Season";
import { ZERO_BI } from "./utils/Decimals";

export function handleLegacyTransfer(event: LegacyTransfer): void {

    if (event.block.number > BigInt.fromI32(14603000)) { return }

    //if (event.params.to !== ADDRESS_ZERO && event.params.from !== ADDRESS_ZERO) { return }

    let field = loadField(BEANSTALK)
    let season = loadSeason(BEANSTALK, BigInt.fromI32(field.season))

    if (event.block.number > BigInt.fromI32(14602789)) {
        season.deltaBeans = ZERO_BI
        season.beans = ZERO_BI
        season.save()
        return
    }

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
