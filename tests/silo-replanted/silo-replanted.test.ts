import { afterEach, assert, clearStore, describe, test } from "matchstick-as/assembly/index";
import { handleAddDeposit } from "../../src/SiloHandler";
import { BEAN_ERC20 } from "../../src/utils/Constants";
import { createAddDepositEvent, handleAddDeposits } from "./utils";

describe("Mocked Events", () => {
    afterEach(() => {
        clearStore()
    })

    describe("Bean", () => {
        test("AddDeposit - Overall Silo", () => {

            let account = '0x1234567890abcdef1234567890abcdef12345678'.toLowerCase()

            let newAddDepositEvent = createAddDepositEvent(
                account,
                BEAN_ERC20.toHexString().toLowerCase(),
                6075,
                1000,
                6,
                1000
            )

            handleAddDeposit(newAddDepositEvent)

            assert.fieldEquals("Silo", account, "totalDepositedBDV", "1000000000")
        })
    })



})
