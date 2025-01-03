"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DATA_COST_PER_UTXO_BYTE = exports.MAX_TOKENS_PER_OUTPUT = exports.CARDANO_PARAMS = exports.ERROR = exports.CertificateType = void 0;
const CardanoWasm = __importStar(require("@emurgo/cardano-serialization-lib-browser"));
exports.CertificateType = {
    STAKE_REGISTRATION: 0,
    STAKE_DEREGISTRATION: 1,
    STAKE_DELEGATION: 2,
    STAKE_POOL_REGISTRATION: 3,
};
exports.ERROR = {
    UTXO_BALANCE_INSUFFICIENT: {
        code: 'UTXO_BALANCE_INSUFFICIENT',
        message: 'UTxO balance insufficient',
    },
    UTXO_VALUE_TOO_SMALL: {
        code: 'UTXO_VALUE_TOO_SMALL',
        message: 'UTxO value too small',
    },
    UNSUPPORTED_CERTIFICATE_TYPE: {
        code: 'UNSUPPORTED_CERTIFICATE_TYPE',
        message: 'Unsupported certificate type',
    },
    UTXO_NOT_FRAGMENTED_ENOUGH: {
        code: 'UTXO_NOT_FRAGMENTED_ENOUGH',
        message: 'UTxO Not fragmented enough.',
    },
};
exports.CARDANO_PARAMS = {
    PROTOCOL_MAGICS: {
        mainnet: CardanoWasm.NetworkInfo.mainnet().protocol_magic(),
        testnet: CardanoWasm.NetworkInfo.testnet().protocol_magic(),
    },
    NETWORK_IDS: {
        mainnet: CardanoWasm.NetworkInfo.mainnet().network_id(),
        testnet: CardanoWasm.NetworkInfo.testnet().network_id(),
    },
    COINS_PER_UTXO_BYTE: '4310',
    MAX_TX_SIZE: 16384,
    MAX_VALUE_SIZE: 5000,
};
// https://github.com/vacuumlabs/adalite/blob/d8ba3bb1ff439ae8e02abd99163435a989d97961/app/frontend/wallet/shelley/transaction/constants.ts
// policyId is 28 bytes, assetName max 32 bytes, together with quantity makes
// max token size about 70 bytes, max output size is 4000 => 4000 / 70 ~ 50
exports.MAX_TOKENS_PER_OUTPUT = 50;
exports.DATA_COST_PER_UTXO_BYTE = CardanoWasm.DataCost.new_coins_per_byte(CardanoWasm.BigNum.from_str(exports.CARDANO_PARAMS.COINS_PER_UTXO_BYTE));
