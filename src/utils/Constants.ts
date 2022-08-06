import { Address, BigDecimal } from "@graphprotocol/graph-ts"

// Standard Addresses
export const ADDRESS_ZERO = Address.fromString('0x0000000000000000000000000000000000000000')

// Token Addresses
export const BEAN_ERC20 = Address.fromString('0xDC59ac4FeFa32293A95889Dc396682858d52e5Db')

// Protocol Addresses
export const BEANSTALK = Address.fromString('0xC1E088fC1323b20BCBee9bd1B9fC9546db5624C5')
export const CURVE_PRICE = Address.fromString('0xA57289161FF18D67A68841922264B317170b0b81')
export const FERTILIZER = Address.fromString('0x402c84De2Ce49aF88f5e2eF3710ff89bFED36cB6')

// LP Addresses

// Other Constants
export const BEAN_DECIMALS = 6

export const INITIAL_HUMIDITY = BigDecimal.fromString('500')
export const MIN_HUMIDITY = BigDecimal.fromString('500')
export const DELTA_HUMIDITY = BigDecimal.fromString('0.5')