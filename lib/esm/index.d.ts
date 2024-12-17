import { CoinSelectionParams, Options, PrecomposedTransaction } from './types/types';
export declare const coinSelection: (params: CoinSelectionParams, options?: Options) => PrecomposedTransaction;
export * as types from './types/types';
export * as trezorUtils from './utils/trezor';
export { chargerwalletUtils, dAppUtils } from './utils/chargerwallet';
export { CoinSelectionError } from './utils/errors';
