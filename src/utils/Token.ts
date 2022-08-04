import { Address } from "@graphprotocol/graph-ts";
import { ERC20 } from "../../generated/Bean/ERC20";
import { Token } from "../../generated/schema";
import { ZERO_BD, ZERO_BI } from "./Decimals";

export function loadToken(token: Address): Token {
    let tokenEntity = Token.load(token.toHexString())
    if (tokenEntity == null) {
        let tokenERC20 = ERC20.bind(token)
        tokenEntity = new Token(token.toHexString())

        // Assign replant token info manually since deposits are emitted prior to token deployment
        if (tokenEntity.id == '0x1BEA0050E63e05FBb5D8BA2f10cf5800B6224449') {
            // Unripe Bean
            tokenEntity.name = 'Unripe Bean'
            tokenEntity.symbol = 'urBEAN'
            tokenEntity.decimals = 6
        } else if (tokenEntity.id == '0x1BEA3CcD22F4EBd3d37d731BA31Eeca95713716D') {
            // Unripe Bean:3CRV
            tokenEntity.name = 'Unripe BEAN3CRV'
            tokenEntity.symbol = 'urBEAN3CRV'
            tokenEntity.decimals = 6
        } else {
            tokenEntity.name = tokenERC20.name()
            tokenEntity.symbol = tokenERC20.symbol()
            tokenEntity.decimals = tokenERC20.decimals()
        }

        tokenEntity.lastPriceUSD = ZERO_BD
        tokenEntity.lastPriceBlockNumber = ZERO_BI
        tokenEntity.save()
    }
    return tokenEntity as Token
}
